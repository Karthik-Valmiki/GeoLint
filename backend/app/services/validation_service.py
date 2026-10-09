"""File and ZIP validation logic.

All validation is done here so that permanent input errors are identified
before any processing is attempted and, importantly, before the Celery task
is enqueued so we can return a useful HTTP error rather than silently fail.
"""
from __future__ import annotations

import io
import logging
import zipfile
from pathlib import Path

from app.config.settings import get_settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".kml", ".zip"}
SHAPEFILE_REQUIRED = {".shp", ".shx", ".dbf", ".prj"}
# Only these extensions may appear inside a ZIP
SHAPEFILE_ALLOWED_IN_ZIP = SHAPEFILE_REQUIRED


class ValidationError(Exception):
    """Raised for permanent validation failures — do NOT retry."""


def validate_extension(filename: str) -> str:
    """Return normalized file_type ('KML' or 'ZIP') or raise ValidationError."""
    suffix = Path(filename).suffix.lower()
    if suffix == ".kml":
        return "KML"
    if suffix == ".zip":
        return "ZIP"
    raise ValidationError(
        f"Unsupported file type '{suffix}'. Only .kml and .zip files are accepted."
    )


def validate_file_size(file_type: str, size_bytes: int) -> None:
    """Raise ValidationError if the file exceeds the documented size limit."""
    settings = get_settings()
    if file_type == "KML" and size_bytes > settings.kml_max_size_bytes:
        limit_mb = settings.kml_max_size_bytes / (1024 * 1024)
        raise ValidationError(
            f"KML file too large ({size_bytes} bytes). Maximum is {limit_mb:.0f} MB."
        )
    if file_type == "ZIP" and size_bytes > settings.zip_max_size_bytes:
        limit_mb = settings.zip_max_size_bytes / (1024 * 1024)
        raise ValidationError(
            f"ZIP file too large ({size_bytes} bytes). Maximum is {limit_mb:.0f} MB."
        )


def validate_zip_contents(data: bytes) -> None:
    """Inspect archive before extraction.

    Checks:
    1. Is it a valid ZIP?
    2. Does it contain only allowed extensions?
    3. Does it contain all required Shapefile components?
    4. Would the extracted content exceed the size limit?

    Raises ValidationError for all permanent failures.
    """
    settings = get_settings()

    # 1. Is it a valid ZIP?
    if not zipfile.is_zipfile(io.BytesIO(data)):
        raise ValidationError("The uploaded file is not a valid ZIP archive.")

    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            entries = zf.infolist()

            if not entries:
                raise ValidationError("The ZIP archive is empty.")

            total_extracted = 0
            found_extensions: set[str] = set()
            basenames: set[str] = set()

            for entry in entries:
                # Skip directory entries
                if entry.filename.endswith("/"):
                    continue

                name = Path(entry.filename)
                suffix = name.suffix.lower()
                stem = name.stem.lower()

                # 2. Only allowed extensions may appear inside the ZIP
                if suffix not in SHAPEFILE_ALLOWED_IN_ZIP:
                    raise ValidationError(
                        f"Unsupported file '{entry.filename}' inside ZIP. "
                        f"Only {sorted(SHAPEFILE_ALLOWED_IN_ZIP)} files are allowed."
                    )

                found_extensions.add(suffix)
                basenames.add(stem)

                # 4. Guard against zip-bomb / excessive extraction size
                total_extracted += entry.file_size
                if total_extracted > settings.zip_max_extracted_bytes:
                    limit_mb = settings.zip_max_extracted_bytes / (1024 * 1024)
                    raise ValidationError(
                        f"ZIP extracted content would exceed {limit_mb:.0f} MB limit."
                    )

            # 3. Verify all required Shapefile components are present
            missing = SHAPEFILE_REQUIRED - found_extensions
            if missing:
                raise ValidationError(
                    f"Missing required Shapefile components: {sorted(missing)}. "
                    "A valid Shapefile requires .shp, .shx, .dbf, and .prj files."
                )

    except zipfile.BadZipFile as exc:
        raise ValidationError(f"Corrupt or invalid ZIP archive: {exc}") from exc
