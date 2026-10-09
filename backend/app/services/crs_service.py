"""CRS (Coordinate Reference System) service.

Responsibilities:
  - Parse / validate CRS from string or WKT.
  - Select an appropriate equal-area / equal-length projected CRS
    for metric calculations given a source geographic CRS.
  - Transform Shapely geometries between CRS.

Rule: never calculate area or length from geographic (lat/lon) coordinates —
always transform to a metric projected CRS first.
"""
from __future__ import annotations

import logging
from typing import Optional

from pyproj import CRS, Transformer
from pyproj.exceptions import CRSError
from shapely.geometry.base import BaseGeometry

logger = logging.getLogger(__name__)


class CRSValidationError(Exception):
    """Raised for unsupported or missing CRS — permanent error, do NOT retry."""


# UTM zone boundary constants
_ARCTIC_CRS = "EPSG:32661"    # UPS North  (lat > 84)
_ANTARCTIC_CRS = "EPSG:32761" # UPS South  (lat < -80)


def _utm_epsg_from_lon_lat(lon: float, lat: float) -> str:
    """Return the EPSG string for the UTM zone covering the given WGS-84 coordinate."""
    if lat > 84:
        return _ARCTIC_CRS
    if lat < -80:
        return _ANTARCTIC_CRS
    zone_number = int((lon + 180) / 6) + 1
    return f"EPSG:{32600 + zone_number}" if lat >= 0 else f"EPSG:{32700 + zone_number}"


def parse_crs(crs_string: str) -> CRS:
    """Parse a CRS from an EPSG code, PROJ string, or WKT.

    Raises CRSValidationError if the string cannot be parsed.
    """
    try:
        return CRS.from_user_input(crs_string)
    except CRSError as exc:
        raise CRSValidationError(f"Invalid or unsupported CRS '{crs_string}': {exc}") from exc


def get_projected_crs(source_crs: CRS, geometry: Optional[BaseGeometry] = None) -> str:
    """Determine the most appropriate projected CRS for metric calculation.

    Strategy:
      1. If source_crs is already projected with metre units → use it directly.
      2. If geographic (lat/lon), select the UTM zone based on the geometry centroid.
      3. Fall back to Web Mercator (EPSG:3857) if nothing else works.
    """
    if source_crs.is_projected:
        try:
            units = source_crs.axis_info[0].unit_name.lower()
            if "metre" in units or "meter" in units:
                auth = source_crs.to_authority()
                if auth:
                    return f"{auth[0]}:{auth[1]}"
        except Exception:
            pass
        # Non-metric projected — fall through to UTM selection below

    # Geographic CRS (or non-metric projected) — pick UTM from centroid
    if geometry is not None:
        try:
            centroid = geometry.centroid
            return _utm_epsg_from_lon_lat(centroid.x, centroid.y)
        except Exception:
            pass

    return "EPSG:3857"  # Last resort


def transform_geometry(
    geometry: BaseGeometry, source_crs_str: str, target_crs_str: str
) -> BaseGeometry:
    """Transform a Shapely geometry from source_crs to target_crs.

    Uses pyproj Transformer with always_xy=True to ensure consistent
    (longitude, latitude) / (easting, northing) axis order regardless of
    the CRS authority convention.

    Raises CRSValidationError on any transformation failure.
    """
    try:
        import numpy as np
        import shapely

        source_crs = CRS.from_user_input(source_crs_str)
        target_crs = CRS.from_user_input(target_crs_str)
        transformer = Transformer.from_crs(source_crs, target_crs, always_xy=True)

        def _transform_coords(coords: "np.ndarray") -> "np.ndarray":
            # coords shape: (N, 2) — columns are [x/lon, y/lat]
            xx, yy = transformer.transform(coords[:, 0], coords[:, 1])
            return np.column_stack([xx, yy])

        return shapely.transform(geometry, _transform_coords)
    except Exception as exc:
        raise CRSValidationError(
            f"Failed to transform geometry from {source_crs_str} to {target_crs_str}: {exc}"
        ) from exc
