"""Celery application factory."""
from __future__ import annotations

from celery import Celery

from app.config.settings import get_settings


def create_celery_app() -> Celery:
    settings = get_settings()
    app = Celery(
        "geolint",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=["app.workers.tasks"],
    )
    app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        # Retry / ack settings
        task_acks_late=True,           # Ack only after task completes
        task_reject_on_worker_lost=True,
        worker_prefetch_multiplier=1,  # Process one task at a time per worker
        # Result backend TTL
        result_expires=3600,
    )
    return app


celery_app = create_celery_app()
