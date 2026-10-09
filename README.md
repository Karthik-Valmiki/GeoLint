# GeoLint — Geospatial File Measurement API

GeoLint is a full-stack web application designed to validate and process geospatial files (KML, Shapefile ZIP) asynchronously. It extracts features, calculates spatial measurements (Area for Polygons, Length for Lines), and provides a modern React frontend to view the data.

---

## 1. Setup Instructions

### 🌟 Quick Start (Docker) — *Recommended*

The absolute easiest way to run the entire stack (Frontend, Backend API, Celery Workers, PostGIS Database, Redis) is using Docker Compose. 

1. Install **Docker Desktop**.
2. From the root of the project (where `docker-compose.yml` is located), open your terminal and run:
   ```bash
   docker-compose up --build
   ```
3. **Access the Application**:
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173) 
   - **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

*(Note: The database schema is applied automatically via `init.sql` on the very first start).*

---

### 💻 Manual Installation (Without Docker)

For evaluators who do not have Docker installed, you can run the services manually. GeoLint requires **PostgreSQL with the PostGIS extension** and **Redis**. To avoid complex local installations, we recommend using free cloud providers.

#### Step 1: Database & Cache Setup (Cloud)
- **PostgreSQL + PostGIS**: Create a free project on [Supabase.com](https://supabase.com). It comes with PostGIS pre-installed. Run the contents of `init.sql` in their SQL Editor.
- **Redis**: Create a free Redis database on [Upstash.com](https://upstash.com).

#### Step 2: Backend Setup
1. Open a terminal and navigate to the `backend/` directory.
2. Create and activate a Python virtual environment (Python 3.11+):
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment file and update the URLs with your Cloud Database credentials:
   ```bash
   cp .env.example .env
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
6. Start the Celery worker (in a **new separate terminal** inside `backend/`, with `venv` activated):
   ```bash
   # Windows (requires gevent):
   pip install gevent
   celery -A app.workers.celery_app.celery_app worker --loglevel=info -P gevent
   
   # Mac/Linux:
   celery -A app.workers.celery_app.celery_app worker --loglevel=info
   ```

#### Step 3: Frontend Setup
1. Open a **new separate terminal** and navigate to the `frontend/` directory.
2. Ensure you have Node.js installed (v20+).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser to `http://localhost:5173`.

---

## 2. Architecture Overview

GeoLint uses a decoupled, event-driven architecture that separates concerns for scalability and fault tolerance:

- **Frontend**: A React application built with Vite and Tailwind CSS. It provides a sleek, dynamic user interface for uploading files and visualizing processed data in real-time.
- **Backend API**: A high-performance Python FastAPI server. It acts as the gateway, handling HTTP requests, file uploads, data validation, and database queries. 
- **Database Layer**: PostgreSQL augmented with **PostGIS** for robust spatial data storage and native geographic querying capabilities.
- **Message Broker**: **Redis** serves as the message broker, seamlessly transmitting tasks from the API layer to the background workers.
- **Background Workers**: **Celery** workers run as distinct processes independent of the API server to handle all heavy lifting.

---

## 3. The Use of Background Workers

Processing geospatial vector files—especially large, complex Shapefile archives—is highly CPU-intensive and can take several seconds to minutes. 

If the FastAPI server attempted to parse a 20MB Shapefile synchronously in the request-response cycle, the HTTP connection would hang, creating a terrible user experience and potentially timing out.

**By utilizing Celery workers, we achieve the following:**
1. **Asynchronous Processing**: The API immediately returns a `202 Accepted` response with a tracking `file_id` while the worker processes the file in the background.
2. **Scalability**: As the application grows, we can horizontally scale the system by spinning up more Celery worker nodes without touching the API servers.
3. **Resilience**: If a file processing task crashes due to corrupted geometry, it only kills the background task. The main API remains completely healthy and responsive for all other users.
4. **Offloaded Computation**: Heavy libraries like `geopandas`, `fiona`, and `shapely` block the event loop. Moving them to Celery ensures FastAPI's asynchronous event loop stays extremely fast.

---

## 4. Entire Application Workflow

The application operates in a completely end-to-end flow:

1. **Upload**: The user drag-and-drops a `.kml` or `.zip` Shapefile into the React frontend (`/upload`).
2. **Ingestion**: The frontend issues a `POST /api/files/` request. The backend stages the file to local storage, saves a `PENDING` record in PostGIS, and dispatches a Celery task.
3. **Polling**: The frontend transitions to the Status page (`/status?id=...`) and polls `GET /api/files/{id}/` every 2 seconds, displaying a progress indicator.
4. **Processing**: In the background, the Celery worker unzips/parses the file using `geopandas`, projects geometries to a local CRS for accurate planar measurements (using EPSG codes derived from UTM zones), calculates areas for Polygons and lengths for Lines, and saves the data back to PostGIS, marking the status as `COMPLETED`.
5. **Visualization**: The frontend automatically redirects to the Results page (`/results?id=...`), fetches the telemetry data via `GET /api/files/{id}/measurements/`, and presents the user with detailed stats, responsive unit converters (Metric/Imperial), and geometry filters.