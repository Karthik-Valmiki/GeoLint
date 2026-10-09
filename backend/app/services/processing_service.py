"""Processing service — implements the full file processing pipeline.

Pipeline stages per file:
  1. Mark file as PROCESSING
  2. Read the uploaded bytes from storage
  3. Parse features (KML or Shapefile-ZIP)
  4. For each feature:
     a. Validate & parse the source CRS
     b. Determine target projected CRS (UTM or existing projected)
     c. Transform geometry → EPSG:4326 for storage
     d. Transform geometry → projected CRS for measurement
     e. Calculate measurement (area / length / null)
  5. Persist dataset + features atomically
  6. Mark file as COMPLETED (or FAILED on error)
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

from pyproj import CRS
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config.settings import get_settings
from app.parsers.kml_parser import KMLParseError, parse_kml
from app.parsers.shapefile_parser import ShapefileParseError, parse_shapefile_from_zip
from app.services.crs_service import CRSValidationError, get_projected_crs, transform_geometry
from app.services.file_service import StorageError, read_upload
from app.services.measurement_service import calculate_measurement
from app.services.validation_service import ValidationError

logger = logging.getLogger(__name__)

# These errors indicate bad input — do NOT retry
PERMANENT_ERRORS = (
    ValidationError,
    KMLParseError,
    ShapefileParseError,
    CRSValidationError,
)


class PermanentProcessingError(Exception):
    """Wraps permanent errors so the Celery task knows not to retry."""


class TransientProcessingError(Exception):
    """Wraps transient errors — the Celery task will retry."""


# ---------------------------------------------------------------------------
# Synchronous DB session (used by Celery workers, which run outside asyncio)
# ---------------------------------------------------------------------------

def _get_sync_session() -> sessionmaker:
    """Build and return a synchronous SQLAlchemy sessionmaker."""
    settings = get_settings()
    engine = create_engine(
        settings.database_url_sync,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    return sessionmaker(bind=engine)


_SessionLocal: Optional[sessionmaker] = None


def _session() -> Session:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = _get_sync_session()
    return _SessionLocal()


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _set_file_status(
    session: Session,
    file_id: int,
    status: str,
    error_message: Optional[str] = None,
) -> None:
    """Update files.status (and optionally error_message) in place."""
    params: dict = {"status": status, "file_id": file_id}
    if error_message is not None:
        params["error_message"] = error_message
        session.execute(
            text(
                "UPDATE files SET status = :status, error_message = :error_message, "
                "updated_at = NOW() WHERE id = :file_id"
            ),
            params,
        )
    else:
        session.execute(
            text("UPDATE files SET status = :status, updated_at = NOW() WHERE id = :file_id"),
            params,
        )
    session.commit()


def _get_file_record(session: Session, file_id: int) -> dict:
    """Fetch the minimal file metadata needed for processing."""
    row = session.execute(
        text("SELECT id, filename, file_type FROM files WHERE id = :fid"),
        {"fid": file_id},
    ).fetchone()
    if row is None:
        raise RuntimeError(f"File record not found for file_id={file_id}")
    return {"id": row[0], "filename": row[1], "file_type": row[2]}


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def process_file(file_id: int) -> None:
    """Main processing entry point called by the Celery task.

    Raises:
        PermanentProcessingError — for deterministic failures (bad input).
        TransientProcessingError — for infrastructure / connection failures (retryable).
    """
    db = _session()
    try:
        _set_file_status(db, file_id, "PROCESSING")

        file_rec = _get_file_record(db, file_id)
        filename = file_rec["filename"]
        file_type = file_rec["file_type"]

        # Stage 1: Read raw bytes from storage
        try:
            data = read_upload(file_id, filename)
        except StorageError as exc:
            raise TransientProcessingError(str(exc)) from exc

        # Stage 2: Parse features
        try:
            if file_type == "KML":
                raw_features = parse_kml(data)
                dataset_name = Path(filename).stem
                source_crs_str = "EPSG:4326"
                crs_wkt = None
            elif file_type == "ZIP":
                raw_features = parse_shapefile_from_zip(data)
                dataset_name = Path(filename).stem
                source_crs_str = raw_features[0]["crs_code"] if raw_features else "EPSG:4326"
                crs_wkt = raw_features[0].get("crs_wkt") if raw_features else None
            else:
                raise PermanentProcessingError(f"Unknown file_type: {file_type}")
        except PERMANENT_ERRORS as exc:
            raise PermanentProcessingError(str(exc)) from exc

        if not raw_features:
            logger.warning("No features found in file_id=%d (%s); persisting empty dataset.", file_id, filename)

        # Stage 3: CRS transform + measurement for every feature
        processed: list[dict[str, Any]] = []
        for feat in raw_features:
            feat_crs_str = feat.get("crs_code", source_crs_str)
            try:
                src_crs = CRS.from_user_input(feat_crs_str)
            except Exception as exc:
                raise PermanentProcessingError(
                    f"Invalid CRS '{feat_crs_str}' in feature {feat.get('feature_index', '?')}: {exc}"
                )

            native_geometry = feat["geometry"]  # In the feature's native CRS
            geom_type = feat["geometry_type"]

            # Determine target projected CRS for measurement.
            # For geographic CRS (lat/lon), pick UTM from centroid.
            # For already-projected CRS, use it directly if metric.
            projected_crs_str = get_projected_crs(src_crs, native_geometry)

            try:
                if src_crs.is_geographic:
                    # native_geometry is already in WGS-84 (EPSG:4326) for KML, or
                    # another geographic CRS for shapefiles. Transform to projected for maths.
                    proj_geometry = transform_geometry(native_geometry, feat_crs_str, projected_crs_str)
                    # For storage in PostGIS (SRID 4326) we need geographic WGS-84 coords.
                    if feat_crs_str.upper() == "EPSG:4326":
                        geometry_4326 = native_geometry
                    else:
                        geometry_4326 = transform_geometry(native_geometry, feat_crs_str, "EPSG:4326")
                else:
                    # native_geometry is in a projected CRS (e.g. UTM from a shapefile).
                    # We need two transforms:
                    #   a) → EPSG:4326  for storing in PostGIS
                    #   b) → projected_crs_str  for metric measurement
                    geometry_4326 = transform_geometry(native_geometry, feat_crs_str, "EPSG:4326")
                    proj_geometry = transform_geometry(native_geometry, feat_crs_str, projected_crs_str)
            except CRSValidationError as exc:
                raise PermanentProcessingError(str(exc)) from exc

            # Stage 4: Calculate measurement on projected (metric) geometry
            measurement = calculate_measurement(proj_geometry, geom_type)

            processed.append({
                "feature_index": feat["feature_index"],
                "geometry_type": geom_type,
                "geometry_wkt": geometry_4326.wkt,       # WKT in EPSG:4326 for PostGIS
                "properties": feat.get("properties", {}),
                "measurement_type": measurement.measurement_type,
                "measurement_value": measurement.measurement_value,
                "measurement_unit": measurement.measurement_unit,
                "projected_crs": projected_crs_str,
            })

        # Stage 5: Persist everything atomically
        _persist_results(
            db=db,
            file_id=file_id,
            dataset_name=dataset_name,
            source_crs_str=source_crs_str,
            crs_wkt=crs_wkt,
            processed=processed,
        )

    except (PermanentProcessingError, TransientProcessingError):
        raise
    except Exception as exc:
        raise TransientProcessingError(f"Unexpected error during processing: {exc}") from exc
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def _persist_results(
    *,
    db: Session,
    file_id: int,
    dataset_name: str,
    source_crs_str: str,
    crs_wkt: Optional[str],
    processed: list[dict],
) -> None:
    """Persist processed results atomically inside a nested transaction.

    Idempotent: deletes any partial data from a prior failed attempt before
    inserting fresh records.
    """
    try:
        with db.begin_nested():
            # Idempotency: delete any stale data from previous attempt
            db.execute(
                text(
                    "DELETE FROM features WHERE dataset_id IN "
                    "(SELECT id FROM datasets WHERE file_id = :fid)"
                ),
                {"fid": file_id},
            )
            db.execute(
                text("DELETE FROM datasets WHERE file_id = :fid"),
                {"fid": file_id},
            )

            # Insert the dataset record
            dataset_result = db.execute(
                text(
                    "INSERT INTO datasets (file_id, name, crs_code, crs_wkt, feature_count, status) "
                    "VALUES (:file_id, :name, :crs_code, :crs_wkt, :feature_count, 'PROCESSING') "
                    "RETURNING id"
                ),
                {
                    "file_id": file_id,
                    "name": dataset_name,
                    "crs_code": source_crs_str,
                    "crs_wkt": crs_wkt,
                    "feature_count": len(processed),
                },
            )
            dataset_id = dataset_result.fetchone()[0]

            # Bulk-insert all features in one round-trip
            if processed:
                db.execute(
                    text(
                        "INSERT INTO features "
                        "(dataset_id, feature_index, geometry_type, geometry, properties, "
                        "measurement_type, measurement_value, measurement_unit, projected_crs) "
                        "VALUES (:dataset_id, :feature_index, :geometry_type, "
                        "ST_GeomFromText(:geom_wkt, 4326), :properties, "
                        ":measurement_type, :measurement_value, :measurement_unit, :projected_crs)"
                    ),
                    [
                        {
                            "dataset_id": dataset_id,
                            "feature_index": feat["feature_index"],
                            "geometry_type": feat["geometry_type"],
                            "geom_wkt": feat["geometry_wkt"],
                            "properties": json.dumps(feat["properties"]),
                            "measurement_type": feat["measurement_type"],
                            "measurement_value": feat["measurement_value"],
                            "measurement_unit": feat["measurement_unit"],
                            "projected_crs": feat["projected_crs"],
                        }
                        for feat in processed
                    ],
                )

            # Compute bbox via PostGIS and mark dataset COMPLETED in one query
            db.execute(
                text(
                    "UPDATE datasets SET status = 'COMPLETED', "
                    "bbox = (SELECT ST_Envelope(ST_Collect(geometry)) FROM features WHERE dataset_id = :did), "
                    "updated_at = NOW() WHERE id = :did"
                ),
                {"did": dataset_id},
            )

            # Mark the parent file as COMPLETED
            db.execute(
                text("UPDATE files SET status = 'COMPLETED', updated_at = NOW() WHERE id = :fid"),
                {"fid": file_id},
            )

        db.commit()
        logger.info(
            "Persisted %d features for file_id=%d dataset_id=%d",
            len(processed), file_id, dataset_id,
        )

    except Exception as exc:
        db.rollback()
        raise TransientProcessingError(
            f"Database persistence failed for file_id={file_id}: {exc}"
        ) from exc
