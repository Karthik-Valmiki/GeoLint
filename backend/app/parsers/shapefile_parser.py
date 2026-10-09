"""Shapefile parser.

Reads a Shapefile dataset from a temp directory using Fiona and extracts
features as dicts compatible with the processing pipeline.
"""
from __future__ import annotations

import logging
import os
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any

import fiona
from pyproj import CRS
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry

logger = logging.getLogger(__name__)

SUPPORTED_TYPES = {
    "Point", "MultiPoint",
    "LineString", "MultiLineString",
    "Polygon", "MultiPolygon",
}


class ShapefileParseError(Exception):
    """Permanent Shapefile parse failure — do NOT retry."""


def _get_crs_from_fiona(layer_crs: dict | None) -> tuple[str, str | None]:
    """Return (crs_code, crs_wkt) from a Fiona CRS dict."""
    if not layer_crs:
        raise ShapefileParseError("Shapefile has no CRS information (.prj missing or empty).")
    try:
        crs_obj = CRS.from_user_input(layer_crs)
        wkt = crs_obj.to_wkt()
        try:
            auth = crs_obj.to_authority()
            if auth:
                return f"{auth[0]}:{auth[1]}", wkt
        except Exception:
            pass
        return crs_obj.to_string(), wkt
    except Exception as exc:
        raise ShapefileParseError(f"Could not parse Shapefile CRS: {exc}") from exc


def parse_shapefile_from_zip(zip_bytes: bytes) -> list[dict[str, Any]]:
    """Extract and parse Shapefile features from a ZIP archive bytes.

    Returns a list of feature dicts with: feature_index, geometry,
    geometry_type, properties, crs_code, crs_wkt.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
                zf.extractall(tmpdir)
        except zipfile.BadZipFile as exc:
            raise ShapefileParseError(f"Cannot extract ZIP: {exc}") from exc

        # Find the .shp file(s)
        shp_files = list(Path(tmpdir).rglob("*.shp"))
        if not shp_files:
            raise ShapefileParseError("No .shp file found in ZIP archive.")
        if len(shp_files) > 1:
            logger.info("Multiple .shp files found; using first: %s", shp_files[0])

        shp_path = str(shp_files[0])
        return _parse_shp_file(shp_path)


def _parse_shp_file(shp_path: str) -> list[dict[str, Any]]:
    """Open and parse a single .shp file with Fiona."""
    try:
        with fiona.open(shp_path, "r") as layer:
            crs_code, crs_wkt = _get_crs_from_fiona(layer.crs)

            features = []
            for raw_feat in layer:
                try:
                    geom_mapping = raw_feat.get("geometry")
                    if geom_mapping is None:
                        logger.debug("Skipping feature with null geometry.")
                        continue

                    geom: BaseGeometry = shape(geom_mapping)
                    geom_type = type(geom).__name__

                    if geom_type not in SUPPORTED_TYPES:
                        logger.warning("Skipping unsupported geometry type: %s", geom_type)
                        continue

                    props = dict(raw_feat.get("properties") or {})

                    features.append({
                        "feature_index": len(features),
                        "geometry": geom,
                        "geometry_type": geom_type,
                        "properties": props,
                        "crs_code": crs_code,
                        "crs_wkt": crs_wkt,
                    })
                except Exception:
                    logger.exception("Skipping malformed feature.")
                    continue

    except fiona.errors.DriverError as exc:
        raise ShapefileParseError(f"Fiona failed to open Shapefile: {exc}") from exc
    except Exception as exc:
        raise ShapefileParseError(f"Shapefile parse error: {exc}") from exc

    return features
