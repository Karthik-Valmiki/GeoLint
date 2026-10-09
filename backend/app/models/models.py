"""SQLAlchemy ORM models — mirrors the init.sql schema exactly."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from geoalchemy2 import Geometry
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class File(Base):
    """Tracks the uploaded raw archive or file stream."""

    __tablename__ = "files"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    datasets: Mapped[list["Dataset"]] = relationship(
        "Dataset", back_populates="file", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("file_type IN ('KML', 'ZIP')", name="files_type_check"),
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')",
            name="files_status_check",
        ),
        CheckConstraint("file_size_bytes > 0", name="files_size_check"),
        Index("idx_files_status", "status"),
    )


class Dataset(Base):
    """Represents individual spatial layers."""

    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    file_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("files.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    crs_code: Mapped[str] = mapped_column(String(50), nullable=False, default="EPSG:4326")
    crs_wkt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feature_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bbox: Mapped[Optional[object]] = mapped_column(
        Geometry("POLYGON", srid=4326), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PROCESSING")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    file: Mapped["File"] = relationship("File", back_populates="datasets")
    features: Mapped[list["Feature"]] = relationship(
        "Feature", back_populates="dataset", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')",
            name="datasets_status_check",
        ),
        CheckConstraint("feature_count >= 0", name="datasets_feature_count_check"),
        Index("idx_datasets_file_id", "file_id"),
        Index("idx_datasets_bbox", "bbox", postgresql_using="gist"),
    )


class Feature(Base):
    """Denormalized geometry + calculated planar measurements."""

    __tablename__ = "features"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dataset_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False
    )
    feature_index: Mapped[int] = mapped_column(Integer, nullable=False)
    geometry_type: Mapped[str] = mapped_column(String(30), nullable=False)
    geometry: Mapped[object] = mapped_column(
        Geometry("GEOMETRY", srid=4326), nullable=False
    )
    properties: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)

    # Inlined measurements to avoid 1:1 join overhead
    measurement_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    measurement_value: Mapped[Optional[float]] = mapped_column(nullable=True)
    measurement_unit: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    projected_crs: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="features")

    __table_args__ = (
        CheckConstraint(
            "geometry_type IN ('Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon')",
            name="features_geometry_type_check",
        ),
        CheckConstraint(
            "measurement_type IS NULL OR measurement_type IN ('AREA', 'LENGTH')",
            name="features_measurement_type_check",
        ),
        CheckConstraint(
            "measurement_unit IS NULL OR measurement_unit IN ('m', 'm2')",
            name="features_measurement_unit_check",
        ),
        CheckConstraint(
            "measurement_value IS NULL OR measurement_value >= 0",
            name="features_measurement_value_check",
        ),
        CheckConstraint("feature_index >= 0", name="features_index_check"),
        UniqueConstraint("dataset_id", "feature_index", name="features_unique_index"),
        Index("idx_features_dataset_id", "dataset_id"),
        Index("idx_features_geometry", "geometry", postgresql_using="gist"),
        Index("idx_features_dataset_geom_type", "dataset_id", "geometry_type"),
        Index(
            "idx_features_properties", "properties", postgresql_using="gin"
        ),
    )
