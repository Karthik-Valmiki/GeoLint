"""Pydantic response/request schemas for GeoLint API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ────────────────────────────────────────────────────────────────────────────
# File schemas
# ────────────────────────────────────────────────────────────────────────────

class FileUploadResponse(BaseModel):
    """Returned immediately after a successful file upload (HTTP 202)."""
    id: int
    filename: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class DatasetSummary(BaseModel):
    """Compact dataset info embedded in the file status response."""
    id: int
    name: str
    crs_code: str
    feature_count: int
    status: str

    model_config = ConfigDict(from_attributes=True)


class FileStatusResponse(BaseModel):
    """Full file status including dataset summaries."""
    id: int
    filename: str
    file_type: str
    file_size_bytes: int
    status: str
    error_message: Optional[str] = None
    datasets: list[DatasetSummary] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ────────────────────────────────────────────────────────────────────────────
# Measurement schemas
# ────────────────────────────────────────────────────────────────────────────

class FeatureMeasurement(BaseModel):
    """Single feature measurement returned by the measurements endpoint."""
    id: int
    feature_index: int
    geometry_type: str
    measurement_type: Optional[str] = None
    measurement_value: Optional[float] = None
    measurement_unit: Optional[str] = None
    projected_crs: Optional[str] = None
    properties: Optional[dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class DatasetMeasurements(BaseModel):
    """All features in a single dataset."""
    dataset_id: int
    dataset_name: str
    crs_code: str
    feature_count: int
    features: list[FeatureMeasurement]


class MeasurementsResponse(BaseModel):
    """Response for GET /api/files/{id}/measurements/."""
    file_id: int
    status: str
    datasets: list[DatasetMeasurements] = []
    message: Optional[str] = None


# ────────────────────────────────────────────────────────────────────────────
# Error schemas
# ────────────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str
