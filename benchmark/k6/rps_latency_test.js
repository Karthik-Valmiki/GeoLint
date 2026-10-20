/**
 * GeoLint k6 Load Test — RPS & P95 Latency
 *
 * Tests TWO endpoints:
 *   Scenario A: POST /api/files/   (upload throughput)
 *   Scenario B: GET  /api/files/{id}/  (status polling — the hot path)
 *
 * Scenario B is the resume metric. Run this against the live Docker stack.
 *
 * Usage (Docker):
 *   docker run --rm --network geolint_default \
 *     -v $(pwd)/benchmark/k6:/scripts \
 *     -v $(pwd)/benchmark/fixtures:/fixtures \
 *     grafana/k6 run /scripts/rps_latency_test.js
 *
 * Or via docker-compose:
 *   docker compose -f docker-compose.benchmark.yml up --abort-on-container-exit
 *
 * Thresholds intentionally left OPEN (no hard fail) so you always get the
 * full report — just observe what the numbers actually are.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ---------------------------------------------------------------------------
// Target — matches the Docker Compose service name
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Custom metrics (appear in the summary output)
// ---------------------------------------------------------------------------
const pollLatency    = new Trend("poll_latency_ms", true);   // GET /files/{id}/
const uploadLatency  = new Trend("upload_latency_ms", true); // POST /files/
const pollErrors     = new Rate("poll_error_rate");
const uploadErrors   = new Rate("upload_error_rate");
const pollRequests   = new Counter("poll_requests_total");

// ---------------------------------------------------------------------------
// Load profile
// ---------------------------------------------------------------------------
export const options = {
  scenarios: {
    // ── Scenario A: upload endpoint (moderate load) ─────────────────────
    upload_load: {
      executor: "constant-arrival-rate",
      rate: 5,                    // 5 uploads/sec
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 10,
      maxVUs: 20,
      exec: "uploadScenario",
    },

    // ── Scenario B: status poll (high concurrency — the resume metric) ──
    poll_load: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      stages: [
        { target: 50,  duration: "20s" },  // ramp up to 50 RPS
        { target: 150, duration: "30s" },  // ramp up to 150 RPS
        { target: 300, duration: "60s" },  // sustain at 300 RPS
        { target: 0,   duration: "10s" },  // ramp down
      ],
      preAllocatedVUs: 50,
      maxVUs: 400,
      exec: "pollScenario",
    },
  },

  // Thresholds — observe, don't hard-fail; real numbers go in your resume
  thresholds: {
    "poll_latency_ms":   ["p(50)<50", "p(95)<100", "p(99)<200"],
    "upload_latency_ms": ["p(95)<2000"],
    "poll_error_rate":   ["rate<0.01"],
  },
};

// ---------------------------------------------------------------------------
// Setup: upload a batch of COMPLETED files so poll scenario has real IDs
// ---------------------------------------------------------------------------
export function setup() {
  console.log("=== SETUP: uploading seed files ===");

  // Inline a tiny valid KML so setup works without mounting fixtures
  const minimalKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Seed</name>
    <Placemark>
      <name>Seed_Point</name>
      <Point><coordinates>77.5946,12.9716,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Seed_Line</name>
      <LineString>
        <coordinates>77.5946,12.9716,0 77.6946,13.0716,0 77.7946,13.1716,0</coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Seed_Polygon</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              77.5,12.9,0 77.6,12.9,0 77.6,13.0,0 77.5,13.0,0 77.5,12.9,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

  const fileIds = [];
  const SEED_COUNT = 20; // upload 20 files to give the poll scenario variety

  for (let i = 0; i < SEED_COUNT; i++) {
    const formData = {
      file: http.file(minimalKML, `seed_${i}.kml`, "application/vnd.google-earth.kml+xml"),
    };
    const res = http.post(`${BASE_URL}/api/files/`, formData);

    if (res.status === 202) {
      const body = JSON.parse(res.body);
      fileIds.push(body.id);
    } else {
      console.warn(`  Seed upload ${i} failed: HTTP ${res.status} — ${res.body}`);
    }
  }

  console.log(`  Uploaded ${fileIds.length} seed files: IDs [${fileIds.join(", ")}]`);

  // Wait a moment for Celery workers to process them
  // (so poll requests hit COMPLETED records, exercising the full response path)
  console.log("  Waiting 5s for Celery workers to process seed files...");
  const waitUntil = Date.now() + 5000;
  while (Date.now() < waitUntil) {
    // busy-wait (setup() is synchronous)
  }

  return { fileIds };
}

// ---------------------------------------------------------------------------
// Scenario A: upload
// ---------------------------------------------------------------------------
export function uploadScenario() {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>LoadTest</name>
    <Placemark>
      <name>P1</name>
      <Point><coordinates>77.5946,12.9716,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>`;

  const t0 = Date.now();
  const res = http.post(
    `${BASE_URL}/api/files/`,
    { file: http.file(kml, "load_test.kml", "application/vnd.google-earth.kml+xml") },
    { tags: { scenario: "upload" } }
  );

  const elapsed = Date.now() - t0;
  uploadLatency.add(elapsed);
  uploadErrors.add(res.status !== 202);

  check(res, {
    "upload: HTTP 202":    (r) => r.status === 202,
    "upload: has id field": (r) => {
      try { return JSON.parse(r.body).id !== undefined; } catch { return false; }
    },
  });
}

// ---------------------------------------------------------------------------
// Scenario B: status poll  ← THIS IS THE RESUME METRIC
// ---------------------------------------------------------------------------
export function pollScenario(data) {
  const fileIds = data.fileIds;
  if (!fileIds || fileIds.length === 0) {
    console.warn("No seed file IDs — poll scenario has nothing to poll");
    return;
  }

  // Pick a random seed file to poll (spread load across multiple records)
  const fileId = fileIds[Math.floor(Math.random() * fileIds.length)];

  const t0 = Date.now();
  const res = http.get(
    `${BASE_URL}/api/files/${fileId}/`,
    { tags: { scenario: "poll" } }
  );
  const elapsed = Date.now() - t0;

  pollLatency.add(elapsed);
  pollErrors.add(res.status !== 200);
  pollRequests.add(1);

  check(res, {
    "poll: HTTP 200":          (r) => r.status === 200,
    "poll: has status field":  (r) => {
      try { return JSON.parse(r.body).status !== undefined; } catch { return false; }
    },
  });

  // No sleep — we want maximum throughput; rate is controlled by arrival-rate executor
}

// ---------------------------------------------------------------------------
// Teardown: print a clean summary of the resume-relevant numbers
// ---------------------------------------------------------------------------
export function teardown(data) {
  console.log("\n========================================");
  console.log("  RESUME-RELEVANT NUMBERS — read below");
  console.log("========================================");
  console.log("  Check the k6 summary output for:");
  console.log("  • poll_latency_ms — p(50), p(95), p(99)");
  console.log("  • poll_requests_total / test duration = actual RPS achieved");
  console.log("  • poll_error_rate   — must be < 1% to claim the metric");
  console.log("========================================\n");
}
