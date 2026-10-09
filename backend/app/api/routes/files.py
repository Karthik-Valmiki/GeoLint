"""File upload and status API routes."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.repositories import DatasetRepository, FeatureRepository, FileRepository
from app.schemas.schemas import (
    DatasetMeasurements,
    DatasetSummary,
    FeatureMeasurement,
    FileStatusResponse,
    FileUploadResponse,
    MeasurementsResponse,
)
from app.services.file_service import StorageError, get_upload_path, save_upload
from app.services.validation_service import (
    ValidationError,
    validate_extension,
    validate_file_size,
    validate_zip_contents,
)
from app.workers.tasks import process_file_task

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["files"])


@router.post(
    "/",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=FileUploadResponse,
    summary="Upload a KML or ZIP (Shapefile) for asynchronous processing",
)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> FileUploadResponse:
    """
    Accept a `.kml` or `.zip` file, persist it, and enqueue a Celery task.

    Returns HTTP 202 immediately; poll `GET /api/files/{id}/` for status.
    """
    filename = file.filename or "upload"

    # 1. Validate extension before reading the entire body
    try:
        file_type = validate_extension(filename)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc)
        ) from exc

    # 2. Read the complete file bytes into memory
    data = await file.read()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # 3. Validate size (bytes are in memory, exact count is known)
    try:
        validate_file_size(file_type, len(data))
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)
        ) from exc

    # 4. For ZIP: inspect archive contents before we touch the DB
    if file_type == "ZIP":
        try:
            validate_zip_contents(data)
        except ValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
            ) from exc

    # 5. Create DB record — size is known and valid at this point
    file_repo = FileRepository(db)
    async with db.begin():
        file_record = await file_repo.create(
            filename=filename,
            file_type=file_type,
            file_size_bytes=len(data),
            status="PENDING",
        )

    # 6. Persist bytes to storage; clean up the DB record on failure
    try:
        save_upload(file_record.id, filename, data)
    except StorageError as exc:
        # Best-effort cleanup of the orphaned DB record
        try:
            async with db.begin():
                await db.delete(file_record)
        except Exception:
            logger.warning(
                "Could not delete orphaned file record id=%d after storage failure",
                file_record.id,
            )
        logger.error("Storage failure for file_id=%d: %s", file_record.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File storage failed. Please try again.",
        ) from exc

    # 7. Enqueue Celery task — fire-and-forget
    process_file_task.delay(file_record.id)
    logger.info(
        "Enqueued process_file task for file_id=%d filename=%s", file_record.id, filename
    )

    return FileUploadResponse(
        id=file_record.id,
        filename=file_record.filename,
        status=file_record.status,
    )


@router.get(
    "/{file_id}/",
    response_model=FileStatusResponse,
    summary="Get file processing status",
)
async def get_file_status(
    file_id: int,
    db: AsyncSession = Depends(get_db),
) -> FileStatusResponse:
    """Return processing status and dataset summaries for the given file."""
    file_repo = FileRepository(db)
    file_record = await file_repo.get_by_id(file_id)
    if file_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {file_id} not found.",
        )

    dataset_summaries = [
        DatasetSummary(
            id=ds.id,
            name=ds.name,
            crs_code=ds.crs_code,
            feature_count=ds.feature_count,
            status=ds.status,
        )
        for ds in file_record.datasets
    ]

    return FileStatusResponse(
        id=file_record.id,
        filename=file_record.filename,
        file_type=file_record.file_type,
        file_size_bytes=file_record.file_size_bytes,
        status=file_record.status,
        error_message=file_record.error_message,
        datasets=dataset_summaries,
        created_at=file_record.created_at,
        updated_at=file_record.updated_at,
    )


@router.get(
    "/{file_id}/measurements/",
    response_model=MeasurementsResponse,
    summary="Get feature measurements for a processed file",
)
async def get_measurements(
    file_id: int,
    db: AsyncSession = Depends(get_db),
) -> MeasurementsResponse:
    """
    Return all feature measurements for a completed file.

    If processing is still running or pending, returns a status message.
    If processing failed, returns the error message.
    """
    file_repo = FileRepository(db)
    file_record = await file_repo.get_by_id(file_id)
    if file_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {file_id} not found.",
        )

    if file_record.status in ("PENDING", "PROCESSING"):
        return MeasurementsResponse(
            file_id=file_id,
            status=file_record.status,
            datasets=[],
            message="Processing is not yet complete. Please poll GET /api/files/{id}/ for status.",
        )

    if file_record.status == "FAILED":
        return MeasurementsResponse(
            file_id=file_id,
            status="FAILED",
            datasets=[],
            message=file_record.error_message or "Processing failed.",
        )

    # COMPLETED — load datasets and their features
    dataset_repo = DatasetRepository(db)
    feature_repo = FeatureRepository(db)

    datasets = await dataset_repo.get_by_file_id(file_id)

    dataset_results = []
    for ds in datasets:
        features = await feature_repo.get_by_dataset_id(ds.id)
        feature_measurements = [
            FeatureMeasurement(
                id=f.id,
                feature_index=f.feature_index,
                geometry_type=f.geometry_type,
                measurement_type=f.measurement_type,
                measurement_value=f.measurement_value,
                measurement_unit=f.measurement_unit,
                projected_crs=f.projected_crs,
                properties=f.properties,
            )
            for f in features
        ]
        dataset_results.append(
            DatasetMeasurements(
                dataset_id=ds.id,
                dataset_name=ds.name,
                crs_code=ds.crs_code,
                feature_count=ds.feature_count,
                features=feature_measurements,
            )
        )

    return MeasurementsResponse(
        file_id=file_id,
        status="COMPLETED",
        datasets=dataset_results,
    )
