"""Celery task definitions for GeoLint file processing."""
from __future__ import annotations

import logging

from celery import Task
from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import text

from app.services.processing_service import (
    PermanentProcessingError,
    TransientProcessingError,
    _get_sync_session,
    process_file as _process_file,
)
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _fail_file(file_id: int, message: str) -> None:
    """Best-effort synchronous write of FAILED status to the database.

    Uses a fresh session so this can be called regardless of the state of
    the session used during processing.
    """
    try:
        SessionFactory = _get_sync_session()
        db = SessionFactory()
        try:
            db.execute(
                text(
                    "UPDATE files SET status = 'FAILED', error_message = :msg, "
                    "updated_at = NOW() WHERE id = :fid"
                ),
                {"msg": message[:2000], "fid": file_id},
            )
            db.execute(
                text(
                    "UPDATE datasets SET status = 'FAILED', error_message = :msg, "
                    "updated_at = NOW() WHERE file_id = :fid AND status != 'COMPLETED'"
                ),
                {"msg": message[:2000], "fid": file_id},
            )
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    except Exception:
        logger.exception("Failed to write FAILED status for file_id=%d", file_id)


@celery_app.task(
    bind=True,
    name="geolint.process_file",
    max_retries=2,
    autoretry_for=(TransientProcessingError,),
    retry_backoff=30,
    retry_backoff_max=120,
    acks_late=True,
)
def process_file_task(self: Task, file_id: int) -> dict:
    """Celery task: parse and measure a geospatial file by its DB id.

    Retry behaviour:
      - TransientProcessingError  → automatically retried up to max_retries=2
      - PermanentProcessingError  → not retried; FAILED status written immediately
      - Unexpected exceptions     → treated as transient and retried

    Returns a status dict for the Celery result backend.
    """
    logger.info(
        "Starting process_file task: file_id=%d attempt=%d/%d",
        file_id,
        self.request.retries + 1,
        self.max_retries + 1,
    )

    try:
        _process_file(file_id)
        logger.info("process_file task completed successfully: file_id=%d", file_id)
        return {"status": "COMPLETED", "file_id": file_id}

    except PermanentProcessingError as exc:
        error_msg = str(exc)
        logger.error("Permanent processing failure for file_id=%d: %s", file_id, error_msg)
        _fail_file(file_id, error_msg)
        return {"status": "FAILED", "file_id": file_id, "error": error_msg}

    except TransientProcessingError as exc:
        # autoretry_for handles the actual retry; on final attempt write FAILED.
        if self.request.retries >= self.max_retries:
            error_msg = f"Processing failed after {self.max_retries + 1} attempts: {exc}"
            logger.error("Max retries exceeded for file_id=%d: %s", file_id, error_msg)
            _fail_file(file_id, error_msg)
            return {"status": "FAILED", "file_id": file_id, "error": error_msg}
        logger.warning(
            "Transient processing error for file_id=%d (attempt %d): %s",
            file_id, self.request.retries + 1, exc,
        )
        raise  # Let Celery autoretry_for handle the actual retry

    except Exception as exc:
        # Unexpected errors — treat as transient so the task is retried
        error_msg = f"Unexpected worker error: {exc}"
        logger.exception("Unexpected error in process_file_task for file_id=%d", file_id)
        try:
            raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))
        except MaxRetriesExceededError:
            _fail_file(file_id, error_msg)
            return {"status": "FAILED", "file_id": file_id, "error": error_msg}
