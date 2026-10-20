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
    except etree.XMLSyntaxError:
        try:
            recovery_parser = etree.XMLParser(recover=True, huge_tree=True)
            root = etree.fromstring(data, parser=recovery_parser)
            if root is None:
                raise KMLParseError("Malformed KML XML: empty or unrecoverable XML root.")
        except Exception as exc:
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


# ---------------------------------------------------------------------------
# Python stdlib ElementTree parser (baseline for quantifying C-backed speedup)
# ---------------------------------------------------------------------------

def _parse_coords_stdlib(coord_text: str) -> list[tuple]:
    coords = []
    for token in coord_text.strip().split():
        parts = token.split(",")
        if len(parts) < 2:
            continue
        try:
            coords.append((float(parts[0]), float(parts[1])))
        except ValueError:
            continue
    return coords


def _parse_geometry_stdlib(placemark: Any, ns: str) -> BaseGeometry | None:
    point_el = placemark.find(f"{ns}Point/{ns}coordinates")
    if point_el is not None and point_el.text:
        coords = _parse_coords_stdlib(point_el.text)
        if coords:
            return Point(coords[0])

    ls_el = placemark.find(f"{ns}LineString/{ns}coordinates")
    if ls_el is not None and ls_el.text:
        coords = _parse_coords_stdlib(ls_el.text)
        if len(coords) >= 2:
            return LineString(coords)

    poly_el = placemark.find(f"{ns}Polygon")
    if poly_el is not None:
        outer = poly_el.find(f"{ns}outerBoundaryIs/{ns}LinearRing/{ns}coordinates")
        if outer is not None and outer.text:
            outer_coords = _parse_coords_stdlib(outer.text)
            inner_coords_list = []
            for inner in poly_el.findall(f"{ns}innerBoundaryIs/{ns}LinearRing/{ns}coordinates"):
                if inner.text:
                    inner_coords_list.append(_parse_coords_stdlib(inner.text))
            if len(outer_coords) >= 3:
                return Polygon(outer_coords, inner_coords_list)

    return None


def parse_kml_stdlib(data: bytes) -> list[dict[str, Any]]:
    """Parse KML bytes using Python's standard library xml.etree.ElementTree."""
    import xml.etree.ElementTree as std_etree
    try:
        root = std_etree.fromstring(data)
    except std_etree.ParseError as exc:
        raise KMLParseError(f"Malformed KML XML (stdlib): {exc}") from exc

    tag = root.tag
    ns = ("{" + tag.split("}")[0].lstrip("{") + "}") if "}" in tag else ""
    placemarks = root.findall(f".//{ns}Placemark")

    features = []
    for pm in placemarks:
        geom = _parse_geometry_stdlib(pm, ns)
        if geom is None:
            continue
        geom_type = type(geom).__name__
        if geom_type not in SUPPORTED_TYPES:
            continue
        name_el = pm.find(f"{ns}name")
        name = name_el.text.strip() if name_el is not None and name_el.text else ""
        props = {"name": name} if name else {}
        features.append({
            "feature_index": len(features),
            "geometry": geom,
            "geometry_type": geom_type,
            "properties": props,
            "crs_code": KML_CRS,
        })
    return features


def benchmark_kml_parsing(data: bytes, runs: int = 5) -> dict[str, Any]:
    """Benchmark C-backed lxml vs stdlib ElementTree on identical KML bytes."""
    import statistics
    import time

    # Warmup
    parse_kml(data)
    parse_kml_stdlib(data)

    lxml_times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        f_lxml = parse_kml(data)
        lxml_times.append((time.perf_counter() - t0) * 1000)

    stdlib_times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        f_stdlib = parse_kml_stdlib(data)
        stdlib_times.append((time.perf_counter() - t0) * 1000)

    lxml_mean = statistics.mean(lxml_times)
    stdlib_mean = statistics.mean(stdlib_times)
    speedup = (stdlib_mean / lxml_mean) if lxml_mean > 0 else 1.0
    reduction_pct = ((stdlib_mean - lxml_mean) / stdlib_mean * 100) if stdlib_mean > 0 else 0.0

    return {
        "file_size_kb": len(data) / 1024,
        "features_lxml": len(f_lxml),
        "features_stdlib": len(f_stdlib),
        "lxml_mean_ms": round(lxml_mean, 2),
        "lxml_p95_ms": round(statistics.quantiles(lxml_times, n=20)[-1] if len(lxml_times) >= 20 else max(lxml_times), 2),
        "stdlib_mean_ms": round(stdlib_mean, 2),
        "stdlib_p95_ms": round(statistics.quantiles(stdlib_times, n=20)[-1] if len(stdlib_times) >= 20 else max(stdlib_times), 2),
        "speedup_ratio": round(speedup, 2),
        "reduction_percent": round(reduction_pct, 1),
    }


if __name__ == "__main__":
    import sys
    from pathlib import Path

    file_path = sys.argv[1] if len(sys.argv) > 1 else "sample_data/test_features.kml"
    p = Path(file_path)
    if not p.exists():
        print(f"File not found: {file_path}")
        sys.exit(1)

    print(f"\n=======================================================")
    print(f"  GeoLint KML Preprocessing Benchmark (C-Backed vs Stdlib)")
    print(f"  Target File: {p.name} ({p.stat().st_size / 1024:.2f} KB)")
    print(f"=======================================================")

    results = benchmark_kml_parsing(p.read_bytes(), runs=10)
    print(f"  Features Parsed:      lxml={results['features_lxml']} | stdlib={results['features_stdlib']}")
    print(f"  Python stdlib time:   {results['stdlib_mean_ms']} ms (P95: {results['stdlib_p95_ms']} ms)")
    print(f"  C-backed lxml time:   {results['lxml_mean_ms']} ms (P95: {results['lxml_p95_ms']} ms)")
    print(f"  Speedup:              {results['speedup_ratio']}x faster")
    print(f"  Preprocessing Reduced:{results['reduction_percent']}%")
    print(f"=======================================================\n")

