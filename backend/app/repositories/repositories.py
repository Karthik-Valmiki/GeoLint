"""Database repository — async CRUD operations for File, Dataset, Feature."""
from __future__ import annotations

import logging
from typing import Optional, Sequence

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Dataset, Feature, File

logger = logging.getLogger(__name__)


class FileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        filename: str,
        file_type: str,
        file_size_bytes: int,
        status: str = "PENDING",
    ) -> File:
        record = File(
            filename=filename,
            file_type=file_type,
            file_size_bytes=file_size_bytes,
            status=status,
        )
        self._session.add(record)
        await self._session.flush()
        await self._session.refresh(record)
        return record

    async def get_by_id(self, file_id: int) -> Optional[File]:
        result = await self._session.execute(
            select(File)
            .options(selectinload(File.datasets))
            .where(File.id == file_id)
        )
        return result.scalar_one_or_none()

    async def set_status(
        self,
        file_id: int,
        status: str,
        error_message: Optional[str] = None,
    ) -> None:
        values: dict = {"status": status}
        if error_message is not None:
            values["error_message"] = error_message
        await self._session.execute(
            update(File).where(File.id == file_id).values(**values)
        )
        await self._session.flush()


class DatasetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        file_id: int,
        name: str,
        crs_code: str = "EPSG:4326",
        crs_wkt: Optional[str] = None,
        status: str = "PROCESSING",
    ) -> Dataset:
        record = Dataset(
            file_id=file_id,
            name=name,
            crs_code=crs_code,
            crs_wkt=crs_wkt,
            status=status,
        )
        self._session.add(record)
        await self._session.flush()
        await self._session.refresh(record)
        return record

    async def get_by_id(self, dataset_id: int) -> Optional[Dataset]:
        result = await self._session.execute(
            select(Dataset).where(Dataset.id == dataset_id)
        )
        return result.scalar_one_or_none()

    async def get_by_file_id(self, file_id: int) -> Sequence[Dataset]:
        result = await self._session.execute(
            select(Dataset)
            .options(selectinload(Dataset.features))
            .where(Dataset.file_id == file_id)
        )
        return result.scalars().all()

    async def update_completed(
        self,
        dataset_id: int,
        *,
        feature_count: int,
        bbox_wkt: Optional[str],
        crs_wkt: Optional[str] = None,
    ) -> None:
        from geoalchemy2.functions import ST_GeomFromText

        values: dict = {
            "status": "COMPLETED",
            "feature_count": feature_count,
        }
        if crs_wkt:
            values["crs_wkt"] = crs_wkt
        if bbox_wkt:
            # store bbox as PostGIS geometry
            values["bbox"] = ST_GeomFromText(bbox_wkt, 4326)

        await self._session.execute(
            update(Dataset).where(Dataset.id == dataset_id).values(**values)
        )
        await self._session.flush()

    async def set_status(
        self,
        dataset_id: int,
        status: str,
        error_message: Optional[str] = None,
    ) -> None:
        values: dict = {"status": status}
        if error_message is not None:
            values["error_message"] = error_message
        await self._session.execute(
            update(Dataset).where(Dataset.id == dataset_id).values(**values)
        )
        await self._session.flush()


class FeatureRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def bulk_insert(self, records: list[dict]) -> None:
        """Insert many Feature records efficiently."""
        if not records:
            return
        await self._session.execute(Feature.__table__.insert(), records)
        await self._session.flush()

    async def get_by_dataset_id(self, dataset_id: int) -> Sequence[Feature]:
        result = await self._session.execute(
            select(Feature)
            .where(Feature.dataset_id == dataset_id)
            .order_by(Feature.feature_index)
        )
        return result.scalars().all()

    async def delete_by_dataset_id(self, dataset_id: int) -> None:
        """Remove previously inserted features — supports idempotent retry."""
        from sqlalchemy import delete

        await self._session.execute(
            delete(Feature).where(Feature.dataset_id == dataset_id)
        )
        await self._session.flush()
