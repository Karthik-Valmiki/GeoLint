"""Measurement engine.

Implements the documented measurement rules:
  - Point / MultiPoint        → NULL (no measurement)
  - LineString / MultiLineString → LENGTH in metres
  - Polygon / MultiPolygon    → AREA in square metres

Measurements are always calculated on geometries that have already been
transformed to a metric projected CRS by the CRS service.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from shapely.geometry.base import BaseGeometry

logger = logging.getLogger(__name__)


@dataclass
class MeasurementResult:
    measurement_type: Optional[str]
    measurement_value: Optional[float]
    measurement_unit: Optional[str]


_POINT_TYPES = {"Point", "MultiPoint"}
_LINE_TYPES = {"LineString", "MultiLineString"}
_POLYGON_TYPES = {"Polygon", "MultiPolygon"}


def calculate_measurement(
    geometry: BaseGeometry, geometry_type: str
) -> MeasurementResult:
    """Calculate the measurement for a geometry that is already in a projected CRS.

    The geometry MUST be in a metric projected CRS before calling this function.
    Returns a MeasurementResult; never raises — unsupported types yield NULLs.
    """
    try:
        if geometry_type in _POINT_TYPES:
            return MeasurementResult(None, None, None)

        if geometry_type in _LINE_TYPES:
            length = geometry.length
            return MeasurementResult("LENGTH", round(length, 6), "m")

        if geometry_type in _POLYGON_TYPES:
            area = geometry.area
            return MeasurementResult("AREA", round(area, 6), "m2")

    except Exception:
        logger.exception("Measurement calculation failed for geometry_type=%s", geometry_type)

    # Unsupported or error — return NULLs gracefully
    return MeasurementResult(None, None, None)
