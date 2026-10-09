-- ============================================================
-- GEO SPATIAL FILE BACKEND PROJECT
-- Production PostgreSQL + PostGIS Schema
-- ============================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Drop tables if re-initialising
DROP TABLE IF EXISTS features CASCADE;
DROP TABLE IF EXISTS datasets CASCADE;
DROP TABLE IF EXISTS files CASCADE;

-- ------------------------------------------------------------
-- Files Table
-- Tracks the uploaded raw archive or file stream
-- ------------------------------------------------------------
CREATE TABLE files (
    id              BIGSERIAL PRIMARY KEY,
    filename        VARCHAR(255) NOT NULL,
    file_type       VARCHAR(10) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT files_type_check
        CHECK (file_type IN ('KML', 'ZIP')),

    CONSTRAINT files_status_check
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),

    CONSTRAINT files_size_check
        CHECK (file_size_bytes > 0)
);

CREATE INDEX idx_files_status ON files(status);


-- ------------------------------------------------------------
-- Datasets Table
-- Represents individual spatial layers (e.g. roads.shp inside zip,
-- or the top-level document inside a KML).
-- ------------------------------------------------------------
CREATE TABLE datasets (
    id              BIGSERIAL PRIMARY KEY,
    file_id         BIGINT NOT NULL,
    name            VARCHAR(255) NOT NULL,
    crs_code        VARCHAR(50) NOT NULL DEFAULT 'EPSG:4326',
    crs_wkt         TEXT,
    feature_count   INTEGER NOT NULL DEFAULT 0,
    bbox            GEOMETRY(Polygon, 4326),
    status          VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT datasets_file_fk
        FOREIGN KEY (file_id)
        REFERENCES files(id)
        ON DELETE CASCADE,

    CONSTRAINT datasets_status_check
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),

    CONSTRAINT datasets_feature_count_check
        CHECK (feature_count >= 0)
);

CREATE INDEX idx_datasets_file_id ON datasets(file_id);
CREATE INDEX idx_datasets_bbox ON datasets USING GIST(bbox);


-- ------------------------------------------------------------
-- Features Table
-- Denormalized geometry + calculated planar measurements.
-- ------------------------------------------------------------
CREATE TABLE features (
    id                  BIGSERIAL PRIMARY KEY,
    dataset_id          BIGINT NOT NULL,
    feature_index       INTEGER NOT NULL,
    geometry_type       VARCHAR(30) NOT NULL,
    geometry            GEOMETRY(Geometry, 4326) NOT NULL,
    properties          JSONB DEFAULT '{}'::jsonb,
    
    -- Inlined measurements to avoid 1:1 join overhead
    measurement_type    VARCHAR(20),       -- 'AREA', 'LENGTH', or NULL
    measurement_value   DOUBLE PRECISION,  -- in meters or square meters
    measurement_unit    VARCHAR(10),       -- 'm', 'm2', or NULL
    projected_crs       VARCHAR(50),       -- Projected CRS used for metric calculation

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT features_dataset_fk
        FOREIGN KEY (dataset_id)
        REFERENCES datasets(id)
        ON DELETE CASCADE,

    CONSTRAINT features_geometry_type_check
        CHECK (
            geometry_type IN (
                'Point',
                'MultiPoint',
                'LineString',
                'MultiLineString',
                'Polygon',
                'MultiPolygon'
            )
        ),

    CONSTRAINT features_measurement_type_check
        CHECK (
            measurement_type IS NULL OR 
            measurement_type IN ('AREA', 'LENGTH')
        ),

    CONSTRAINT features_measurement_unit_check
        CHECK (
            measurement_unit IS NULL OR 
            measurement_unit IN ('m', 'm2')
        ),

    CONSTRAINT features_measurement_value_check
        CHECK (
            measurement_value IS NULL OR 
            measurement_value >= 0
        ),

    CONSTRAINT features_index_check
        CHECK (feature_index >= 0),

    CONSTRAINT features_unique_index
        UNIQUE (dataset_id, feature_index)
);

-- Performance and spatial indexes
CREATE INDEX idx_features_dataset_id ON features(dataset_id);
CREATE INDEX idx_features_geometry ON features USING GIST(geometry);
CREATE INDEX idx_features_dataset_geom_type ON features(dataset_id, geometry_type);
CREATE INDEX idx_features_properties ON features USING GIN(properties);