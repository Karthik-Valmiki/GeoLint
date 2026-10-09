## &#x09;	GEO SPATIAL FILE BACKEND PROJECT



Supported files:

KML - Keyhole Markup Language

Point

LineString

Polygon

Coordinates

Feature names/descriptions





Important features:

Feature ID/index

Geometry

Geometry type

CRS

Properties/attributes





Shapefile is a dataset consisting of multiple related files.

survey.shp   ← geometry

survey.shx   ← geometry index

survey.dbf   ← attribute data

survey.prj   ← coordinate reference system





survey.zip    # Basegroup - Survey with all 4 extensions must and should

│

├── survey.shp

├── survey.shx

├── survey.dbf

└── survey.prj



1 shapefile must and should contain -- .shp -- Geometry, .shx-- Geometry Index, .dbf-- Attribute Table, .prj -- CRS





### Workload:

| Input | Upload limit | Why |

|---|---:|---|

| `.kml` | \*\*5 MB\*\* | XML/text-based and directly parsed |

| `.zip` | \*\*20 MB compressed\*\* | ZIP is a container for Shapefile datasets |



ZIP upload

│

├── Maximum compressed size: 20 MB

│

├── Inspect archive contents

│

├── Maximum total extracted size: 100 MB

│

└── Allowed file extensions ONLY:

&#x20;     .shp

&#x20;     .shx

&#x20;     .dbf

&#x20;     .prj



### IO and CPU bound:



&#x20;             GEOSPATIAL API

&#x20;                   │

&#x20;         ┌─────────┴─────────┐

&#x20;         │                   │

&#x20;      I/O work           CPU work

&#x20;         │                   │

&#x20;    Upload file         Parse geometry

&#x20;    Read files          Transform CRS

&#x20;    Extract ZIP         Calculate area

&#x20;    DB writes           Calculate length

&#x20;         │                   │

&#x20;         └─────────┬─────────┘

&#x20;                   ↓

&#x20;            MIXED WORKLOAD

&#x20;                   ↓

&#x20;       CPU-dominant processing







### WORKFLOW:



&#x20;                   USER UPLOAD

&#x20;                        │

&#x20;                        ▼

&#x20;               ┌─────────────────┐

&#x20;               │ File Validation │

&#x20;               └────────┬────────┘

&#x20;                        │

&#x20;             ┌──────────┴──────────┐

&#x20;             │                     │

&#x20;          .KML                    .ZIP

&#x20;             │                     │

&#x20;             │                     ▼

&#x20;             │             Inspect ZIP contents

&#x20;             │                     │

&#x20;             │             Find Shapefile datasets

&#x20;             │                     │

&#x20;             │          ┌──────────┴──────────┐

&#x20;             │          │                     │

&#x20;             │     Valid Shapefile       Invalid /

&#x20;             │       candidate            incomplete

&#x20;             │          │                     │

&#x20;             │          │                  Reject

&#x20;             │          │

&#x20;             └──────────┤

&#x20;                        ▼

&#x20;                 Parse Geospatial Data

&#x20;                        │

&#x20;                        ▼

&#x20;                 Extract Features

&#x20;                        │

&#x20;             ┌──────────┼──────────┐

&#x20;             │          │          │

&#x20;           Point    LineString   Polygon

&#x20;             │          │          │

&#x20;          No calc     Length       Area

&#x20;                        │

&#x20;                        ▼

&#x20;                   CRS Validation

&#x20;                        │

&#x20;             ┌──────────┴──────────┐

&#x20;             │                     │

&#x20;        Supported CRS         Missing/Unsupported

&#x20;             │                     │

&#x20;             ▼                   Reject

&#x20;      CRS normalization

&#x20;             │

&#x20;             ▼

&#x20;      Transform to suitable

&#x20;       projected CRS

&#x20;             │

&#x20;             ▼

&#x20;        Measurements

&#x20;             │

&#x20;             ▼

&#x20;      Store processing result

&#x20;             │

&#x20;             ▼

&#x20;         API Retrieval







Redis as message broker -- ✅ Simple, fast, lightweight, sufficient

Redis was selected as the Celery message broker because the application requires a lightweight task queue for asynchronous file-processing jobs. Redis provides sufficient performance and reliability for the expected workload while keeping the architecture simpler than alternatives such as RabbitMQ or Kafka.





Reason behind going with celery

Your workload is a task-processing workflow, not an event-streaming system. Celery is specifically designed around executing background tasks with workers, retries, task states, and queue management.



retries are 3, for only valid files, when we are processing them, not on the completely reject ones

Temporary PostgreSQL connection failure

Redis/worker infrastructure issue

Temporary file-storage failure

Other transient errors









## core workflow:

&#x20;                   ┌──────────────────────┐

&#x20;                   │        CLIENT        │

&#x20;                   └──────────┬───────────┘

&#x20;                              │

&#x20;                              │ POST /api/files/

&#x20;                              │ KML / ZIP

&#x20;                              ▼

&#x20;                   ┌──────────────────────┐

&#x20;                   │       FASTAPI        │

&#x20;                   │      API Layer       │

&#x20;                   ├──────────────────────┤

&#x20;                   │ • Validate extension │

&#x20;                   │ • Validate size      │

&#x20;                   │ • Create file record │

&#x20;                   │ • Store uploaded file│

&#x20;                   └──────────┬───────────┘

&#x20;                              │

&#x20;                   ┌──────────┴───────────┐

&#x20;                   │                      │

&#x20;                   ▼                      ▼

&#x20;         ┌─────────────────┐    ┌─────────────────┐

&#x20;         │  File Storage   │    │  PostgreSQL +   │

&#x20;         │                 │    │     PostGIS     │

&#x20;         │ KML / ZIP files │    │                 │

&#x20;         └─────────────────┘    │ files           │

&#x20;                                │ datasets        │

&#x20;                                │ features        │

&#x20;                                └────────┬────────┘

&#x20;                                         │

&#x20;                                         │ file\_id

&#x20;                                         ▼

&#x20;                             ┌──────────────────────┐

&#x20;                             │        REDIS         │

&#x20;                             │    Message Broker    │

&#x20;                             │      / Task Queue    │

&#x20;                             └──────────┬───────────┘

&#x20;                                        │

&#x20;                                        │ process\_file(file\_id)

&#x20;                                        ▼

&#x20;                   ┌─────────────────────────────────────┐

&#x20;                   │          CELERY WORKER POOL          │

&#x20;                   │                                     │

&#x20;                   │  Worker 1   Worker 2   Worker 3     │

&#x20;                   └──────────────────┬──────────────────┘

&#x20;                                      │

&#x20;                                      ▼

&#x20;                          ┌─────────────────────┐

&#x20;                          │   File Retrieval    │

&#x20;                          │                     │

&#x20;                          │ Get file using ID   │

&#x20;                          └──────────┬──────────┘

&#x20;                                     │

&#x20;                                     ▼

&#x20;                          ┌─────────────────────┐

&#x20;                          │   File Processing    │

&#x20;                          └──────────┬──────────┘

&#x20;                                     │

&#x20;                    ┌────────────────┴────────────────┐

&#x20;                    │                                 │

&#x20;                    ▼                                 ▼

&#x20;             ┌─────────────┐                   ┌─────────────┐

&#x20;             │     KML     │                   │     ZIP     │

&#x20;             │    Parser   │                   │  Validator  │

&#x20;             └──────┬──────┘                   └──────┬──────┘

&#x20;                    │                                 │

&#x20;                    │                         Inspect archive

&#x20;                    │                                 │

&#x20;                    │                         Validate required:

&#x20;                    │                         .shp .shx .dbf .prj

&#x20;                    │                                 │

&#x20;                    │                                 ▼

&#x20;                    │                         Extract Shapefile

&#x20;                    │                                 │

&#x20;                    └────────────────┬────────────────┘

&#x20;                                     ▼

&#x20;                          ┌─────────────────────┐

&#x20;                          │ Feature Extraction  │

&#x20;                          │                     │

&#x20;                          │ • Feature ID/index  │

&#x20;                          │ • Geometry          │

&#x20;                          │ • Geometry type     │

&#x20;                          │ • Properties        │

&#x20;                          │ • CRS               │

&#x20;                          └──────────┬──────────┘

&#x20;                                     │

&#x20;                                     ▼

&#x20;                          ┌─────────────────────┐

&#x20;                          │    CRS Handling     │

&#x20;                          │                     │

&#x20;                          │ Validate CRS        │

&#x20;                          │ Normalize CRS        │

&#x20;                          │ Select projected CRS│

&#x20;                          └──────────┬──────────┘

&#x20;                                     │

&#x20;                                     ▼

&#x20;                          ┌─────────────────────┐

&#x20;                          │ Geometry Transform  │

&#x20;                          │                     │

&#x20;                          │ Geographic CRS      │

&#x20;                          │        ↓            │

&#x20;                          │ Projected CRS       │

&#x20;                          └──────────┬──────────┘

&#x20;                                     │

&#x20;                                     ▼

&#x20;                          ┌─────────────────────┐

&#x20;                          │ Measurement Engine  │

&#x20;                          ├─────────────────────┤

&#x20;                          │ Point               │

&#x20;                          │ → No measurement    │

&#x20;                          │                     │

&#x20;                          │ LineString          │

&#x20;                          │ → Length            │

&#x20;                          │                     │

&#x20;                          │ Polygon             │

&#x20;                          │ → Area              │

&#x20;                          └──────────┬──────────┘

&#x20;                                     │

&#x20;                                     ▼

&#x20;                          ┌─────────────────────┐

&#x20;                          │   Result Persistence │

&#x20;                          └──────────┬──────────┘

&#x20;                                     │

&#x20;                                     ▼

&#x20;                      ┌──────────────────────────────┐

&#x20;                      │       PostgreSQL + PostGIS   │

&#x20;                      ├──────────────────────────────┤

&#x20;                      │ files                        │

&#x20;                      │  └── status                  │

&#x20;                      │                              │

&#x20;                      │ datasets                     │

&#x20;                      │  └── CRS / bbox / count      │

&#x20;                      │                              │

&#x20;                      │ features                     │

&#x20;                      │  ├── geometry                │

&#x20;                      │  ├── properties              │

&#x20;                      │  ├── measurement              │

&#x20;                      │  └── projected\_crs            │

&#x20;                      └──────────────┬───────────────┘

&#x20;                                     │

&#x20;                                     ▼

&#x20;                             ┌───────────────┐

&#x20;                             │     CLIENT    │

&#x20;                             ├───────────────┤

&#x20;                             │ GET /files/id │

&#x20;                             │ GET /measurements

&#x20;                             └───────────────┘

















































































