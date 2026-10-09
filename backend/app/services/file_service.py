"""File storage service.

Manages persistence of uploaded binary files to the local filesystem
storage directory shared between the API and Celery workers via a volume.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Transient storage errors — eligible for retry."""


def _storage_dir() -> Path:
    settings = get_settings()
    path = Path(settings.storage_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_upload(file_id: int, filename: str, data: bytes) -> Path:
    """Persist uploaded bytes to storage and return the absolute path."""
    try:
        storage = _storage_dir()
        # Use file_id as a prefix to avoid collisions with same-named uploads
        safe_name = f"{file_id}_{filename}"
        dest = storage / safe_name
        dest.write_bytes(data)
        logger.info("Saved upload file_id=%d to %s (%d bytes)", file_id, dest, len(data))
        return dest
    except OSError as exc:
        raise StorageError(f"Failed to save uploaded file: {exc}") from exc


def get_upload_path(file_id: int, filename: str) -> Path:
    """Reconstruct the storage path for a given file_id + filename."""
    storage = _storage_dir()
    return storage / f"{file_id}_{filename}"


def read_upload(file_id: int, filename: str) -> bytes:
    """Read a previously saved upload and return its bytes."""
    path = get_upload_path(file_id, filename)
    if not path.exists():
        raise StorageError(f"Stored file not found: {path}")
    try:
        return path.read_bytes()
    except OSError as exc:
        raise StorageError(f"Failed to read stored file: {exc}") from exc
