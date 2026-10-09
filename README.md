# GeoLint: Geospatial File Measurement API

GeoLint is a full-stack, distributed platform designed for asynchronous validation, processing, and measurement of geospatial vector files (KML and Shapefile). 

This project implements a decoupled architecture to reliably manage highly CPU-intensive geoprocessing tasks, ensuring the API layer remains highly available and responsive under heavy workload conditions.

---

## 1. Architectural Decisions and Domain Specifications

### 1.1 Supported Formats and Constraints
- **KML (.kml)**: 5 MB limit. Text/XML-based, allowing for direct parsing.
- **Shapefile (.zip)**: 20 MB compressed limit (100 MB extracted limit). ZIP acts as a container since a valid Shapefile dataset explicitly requires a minimum of four related files: `.shp` (Geometry), `.shx` (Geometry Index), `.dbf` (Attribute Data), and `.prj` (Coordinate Reference System).

### 1.2 Separation of Workloads (I/O vs CPU)
Geospatial processing presents a mixed workload profile:
1. **I/O-Bound**: File uploads, ZIP extraction, reading disk artifacts, and database writes.
2. **CPU-Bound**: Geometry parsing, CRS projection transformations, and computing areas and lengths.

To prevent blocking the asynchronous HTTP event loop, all operations following the initial file staging are offloaded to background worker processes.

### 1.3 Message Broker Selection (Redis)
Redis was selected as the message broker for Celery. The application requires a robust, lightweight task queue for asynchronous file-processing jobs. Redis provides sufficient performance and reliability for this specific workload while keeping the infrastructure footprint significantly simpler than streaming alternatives such as RabbitMQ or Kafka.

### 1.4 Background Processing (Celery)
The workload is fundamentally a task-processing workflow rather than an event-streaming system. Celery is utilized because it is specifically designed around executing background tasks, managing worker pools, handling task state transitions, and executing retry policies.
- **Retry Policy**: Tasks are configured for a maximum of 3 retries in the event of transient infrastructure failures (e.g., temporary PostgreSQL connection drops, Redis timeouts, or ephemeral storage failures). Structural file rejections are not retried.

---

## 2. Core Architecture and Data Flow

Below is the end-to-end architectural workflow from client upload to persistent storage.

```text
                    ┌──────────────────────┐
                    │        CLIENT        │
                    └──────────┬───────────┘
                               │
                               │ POST /api/files/
                               │ KML / ZIP
                               ▼
                    ┌──────────────────────┐
                    │       FASTAPI        │
                    │      API Layer       │
                    ├──────────────────────┤
                    │ • Validate extension │
                    │ • Validate size      │
                    │ • Create file record │
                    │ • Store uploaded file│
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │                      │
                    ▼                      ▼
          ┌─────────────────┐    ┌─────────────────┐
          │  File Storage   │    │  PostgreSQL +   │
          │                 │    │     PostGIS     │
          │ KML / ZIP files │    │                 │
          └─────────────────┘    │ files           │
                                 │ datasets        │
                                 │ features        │
                                 └────────┬────────┘
                                          │
                                          │ file_id
                                          ▼
                              ┌──────────────────────┐
                              │        REDIS         │
                              │    Message Broker    │
                              │      / Task Queue    │
                              └──────────┬───────────┘
                                         │
                                         │ process_file(file_id)
                                         ▼
                    ┌─────────────────────────────────────┐
                    │          CELERY WORKER POOL         │
                    │                                     │
                    │  Worker 1   Worker 2   Worker 3     │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                           ┌─────────────────────┐
                           │   File Retrieval    │
                           │                     │
                           │ Get file using ID   │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │   File Processing   │
                           └──────────┬──────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     │                                 │
                     ▼                                 ▼
              ┌─────────────┐                   ┌─────────────┐
              │     KML     │                   │     ZIP     │
              │    Parser   │                   │  Validator  │
              └──────┬──────┘                   └──────┬──────┘
                     │                                 │
                     │                         Inspect archive
                     │                                 │
                     │                         Validate required:
                     │                         .shp .shx .dbf .prj
                     │                                 │
                     │                                 ▼
                     │                         Extract Shapefile
                     │                                 │
                     └────────────────┬────────────────┘
                                      ▼
                           ┌─────────────────────┐
                           │ Feature Extraction  │
                           │                     │
                           │ • Feature ID/index  │
                           │ • Geometry          │
                           │ • Geometry type     │
                           │ • Properties        │
                           │ • CRS               │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │    CRS Handling     │
                           │                     │
                           │ Validate CRS        │
                           │ Normalize CRS       │
                           │ Select projected CRS│
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │ Geometry Transform  │
                           │                     │
                           │ Geographic CRS      │
                           │        ↓            │
                           │ Projected CRS       │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │ Measurement Engine  │
                           ├─────────────────────┤
                           │ Point               │
                           │ → No measurement    │
                           │                     │
                           │ LineString          │
                           │ → Length            │
                           │                     │
                           │ Polygon             │
                           │ → Area              │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │  Result Persistence │
                           └──────────┬──────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │       PostgreSQL + PostGIS   │
                       ├──────────────────────────────┤
                       │ files                        │
                       │  └── status                  │
                       │                              │
                       │ datasets                     │
                       │  └── CRS / bbox / count      │
                       │                              │
                       │ features                     │
                       │  ├── geometry                │
                       │  ├── properties              │
                       │  ├── measurement             │
                       │  └── projected_crs           │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │     CLIENT    │
                              ├───────────────┤
                              │ GET /files/id │
                              │ GET /measurements
                              └───────────────┘
```

---

## 3. Deployment and Setup

### 3.1 Containerized Deployment (Recommended)

The platform is fully containerized. Docker Compose orchestrates the API, background workers, Postgres/PostGIS database, Redis broker, and the Vite-compiled React frontend.

1. Ensure **Docker** and **Docker Compose** are installed.
2. From the project root directory, execute:
   ```bash
   docker-compose up --build
   ```
3. **Access Vectors**:
   - **Frontend Application**: http://localhost:5173
   - **Backend API Documentation**: http://localhost:8000/docs

*The required database schemas and spatial extensions are automatically provisioned upon initialization via `init.sql`.*

### 3.2 Manual Deployment (Standalone)

For environments without containerization, services must be provisioned independently.

**Dependencies:**
- PostgreSQL (with PostGIS extension)
- Redis

**Backend Initialization:**
```bash
cd backend/
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
```
*Modify `.env` to point to the standalone PostGIS and Redis instances.*

**Execution:**
```bash
# Terminal 1 (API Server)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2 (Celery Worker)
# Note: Windows environments require the gevent execution pool
celery -A app.workers.celery_app.celery_app worker --loglevel=info -P gevent
```

**Frontend Initialization:**
```bash
cd frontend/
npm install
npm run dev
```

---

## 4. API Endpoints

- `POST /api/files/`: Ingests geospatial files and immediately returns a tracking ID.
- `GET /api/files/{id}/`: Polls the processing status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
- `GET /api/files/{id}/measurements/`: Retrieves the extracted geometries, spatial telemetry, and measurements upon successful processing.
- `GET /health`: Validates the health of the API, Database, and Broker.