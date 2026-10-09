"""KML parser.

Parses a KML byte-string into a list of ExtractedFeature dicts.

KML files always use geographic CRS EPSG:4326 (WGS 84) — longitude, latitude.
The parser extracts:
  - feature_index
  - geometry (Shapely BaseGeometry)
  - geometry_type
  - properties (name, description, extended data)
  - crs_code (always EPSG:4326 for KML)
"""
from __future__ import annotations

import logging
from typing import Any

from lxml import etree
from shapely.geometry import (
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
)
from shapely.geometry.base import BaseGeometry

logger = logging.getLogger(__name__)

# KML namespaces
_KML_NS = {
    "kml": "http://www.opengis.net/kml/2.2",
    "kml21": "http://earth.google.com/kml/2.1",
}

KML_CRS = "EPSG:4326"

SUPPORTED_TYPES = {
    "Point", "MultiPoint",
    "LineString", "MultiLineString",
    "Polygon", "MultiPolygon",
}


class KMLParseError(Exception):
    """Permanent KML parse failure — do NOT retry."""


def _parse_coords(coord_text: str) -> list[tuple]:
    """Parse a KML coordinates string into a list of (lon, lat) tuples."""
    coords = []
    for token in coord_text.strip().split():
        parts = token.split(",")
        if len(parts) < 2:
            continue
        try:
            lon, lat = float(parts[0]), float(parts[1])
            coords.append((lon, lat))
        except ValueError:
            continue
    return coords


def _parse_placemark(placemark: etree._Element, ns: str) -> dict[str, Any] | None:
    """Extract a single Placemark into a feature dict, or None if unsupported."""
    name_el = placemark.find(f"{ns}name")
    name = name_el.text.strip() if name_el is not None and name_el.text else ""

    desc_el = placemark.find(f"{ns}description")
    description = desc_el.text.strip() if desc_el is not None and desc_el.text else ""

    # Extended data
    props: dict[str, Any] = {}
    if name:
        props["name"] = name
    if description:
        props["description"] = description

    ext_data = placemark.find(f"{ns}ExtendedData")
    if ext_data is not None:
        for data_el in ext_data.findall(f"{ns}Data"):
            key = data_el.get("name", "")
            val_el = data_el.find(f"{ns}value")
            val = val_el.text if val_el is not None else None
            if key:
                props[key] = val

    # Geometry
    geometry = _parse_geometry(placemark, ns)
    if geometry is None:
        return None

    geom_type = type(geometry).__name__
    if geom_type not in SUPPORTED_TYPES:
        logger.warning("Skipping unsupported KML geometry type: %s", geom_type)
        return None

    return {
        "geometry": geometry,
        "geometry_type": geom_type,
        "properties": props,
        "crs_code": KML_CRS,
    }


def _parse_geometry(placemark: etree._Element, ns: str) -> BaseGeometry | None:
    """Attempt to extract a Shapely geometry from the Placemark."""
    # Point
    point_el = placemark.find(f"{ns}Point/{ns}coordinates")
    if point_el is not None and point_el.text:
        coords = _parse_coords(point_el.text)
        if coords:
            return Point(coords[0])

    # LineString
    ls_el = placemark.find(f"{ns}LineString/{ns}coordinates")
    if ls_el is not None and ls_el.text:
        coords = _parse_coords(ls_el.text)
        if len(coords) >= 2:
            return LineString(coords)

    # Polygon (outer ring only for now; inner rings treated as exterior)
    poly_el = placemark.find(f"{ns}Polygon")
    if poly_el is not None:
        outer = poly_el.find(f"{ns}outerBoundaryIs/{ns}LinearRing/{ns}coordinates")
        if outer is not None and outer.text:
            outer_coords = _parse_coords(outer.text)
            inner_coords_list = []
            for inner in poly_el.findall(f"{ns}innerBoundaryIs/{ns}LinearRing/{ns}coordinates"):
                if inner.text:
                    inner_coords_list.append(_parse_coords(inner.text))
            if len(outer_coords) >= 3:
                return Polygon(outer_coords, inner_coords_list)

    # MultiGeometry — recurse
    multi_el = placemark.find(f"{ns}MultiGeometry")
    if multi_el is not None:
        sub_geoms = []
        for child in multi_el:
            # Create a fake Placemark wrapper
            fake = etree.Element("Placemark")
            fake.append(child)
            geom = _parse_geometry(fake, ns)
            if geom is not None:
                sub_geoms.append(geom)
        if sub_geoms:
            # Homogenise if possible
            types = {type(g).__name__ for g in sub_geoms}
            if types == {"Point"}:
                return MultiPoint([g for g in sub_geoms])
            if types == {"LineString"}:
                return MultiLineString([g for g in sub_geoms])
            if types == {"Polygon"}:
                return MultiPolygon([g for g in sub_geoms])
            # Heterogeneous — skip
            logger.warning("Skipping heterogeneous MultiGeometry: %s", types)
            return None

    return None


def parse_kml(data: bytes) -> list[dict[str, Any]]:
    """Parse KML bytes into a list of feature dicts.

    Returns:
        List of dicts with keys: feature_index, geometry, geometry_type,
        properties, crs_code.

    Raises:
        KMLParseError for corrupted or unparseable KML.
    """
    try:
        root = etree.fromstring(data)
    except etree.XMLSyntaxError as exc:
        raise KMLParseError(f"Malformed KML XML: {exc}") from exc

    # Determine namespace
    tag = root.tag
    if "}" in tag:
        ns_uri = tag.split("}")[0].lstrip("{")
        ns = "{" + ns_uri + "}"
    else:
        ns = ""

    placemarks = root.findall(f".//{ns}Placemark")
    if not placemarks:
        logger.warning("KML contains no Placemark elements.")

    features = []
    for idx, pm in enumerate(placemarks):
        try:
            feat = _parse_placemark(pm, ns)
            if feat is not None:
                feat["feature_index"] = len(features)
                features.append(feat)
        except Exception:
            logger.exception("Failed to parse KML Placemark at index %d; skipping.", idx)

    return features
