# Observability Guide

Operator guide for the Laundry App observability stack — how to start it, what's in the dashboards, and how to troubleshoot.

> **Writing instrumentation code?** Use the `observability-backend` skill (under `.agents/skills/observability-backend/`). It covers patterns for adding metrics, instrumenting repositories, and a deep API/internals reference.

## Overview

### Architecture

```
┌─────────┐   JSON stdout    ┌──────────┐              ┌──────┐
│ Backend │ ───────────────► │ Promtail │ ───push────► │ Loki │
│ (Bun)   │                  └──────────┘              └──┬───┘
│         │   OTLP/HTTP      ┌────────────────┐           │
│         │ ───────────────► │ OTel Collector │           │
└─────────┘   :4318          └───────┬────────┘           │
                                     │                    │
                          remote     │                    │
                          write      ▼                    │
                             ┌────────────┐               │
                             │ Prometheus │               │
                             └─────┬──────┘               │
                                   │                      │
                                   ▼                      ▼
                             ┌───────────────────────────────┐
                             │           Grafana             │
                             │     http://localhost:3001     │
                             └───────────────────────────────┘
```

### Data Flows

| Signal      | Path                                             | Protocol                     |
| ----------- | ------------------------------------------------ | ---------------------------- |
| **Metrics** | Backend → OTel Collector → Prometheus            | OTLP/HTTP → Remote Write     |
| **Traces**  | Backend → OTel Collector → debug (stdout)        | OTLP/HTTP                    |
| **Logs**    | Backend (JSON stdout) → Docker → Promtail → Loki | Docker log driver → Push API |

Traces are currently exported to the collector's debug exporter only (stdout). Metrics and logs are fully persisted.

## Quick Start

### 1. Start the Stack

```bash
# Start everything (app + observability)
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

### 2. Access Grafana

Open [http://localhost:3001](http://localhost:3001) and log in:

- **Username:** `admin`
- **Password:** `admin`

Three dashboards are pre-provisioned under the **Laundry App** folder.

### 3. Generate Traffic

Hit some API endpoints to produce metrics and logs:

```bash
curl http://localhost:3000/health

curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"password"}'
```

Metrics should appear in Grafana within ~30 seconds (5s batch + 15s scrape).

## Stack Components

| Service            | Image                                         | Port                                                | Purpose                                                    |
| ------------------ | --------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| **OTel Collector** | `otel/opentelemetry-collector-contrib:0.96.0` | `4317` (gRPC), `4318` (HTTP), `8888` (self-metrics) | Receives OTLP from backend, forwards metrics to Prometheus |
| **Prometheus**     | `prom/prometheus:v2.51.0`                     | `9090`                                              | Stores metrics (15-day retention)                          |
| **Loki**           | `grafana/loki:2.9.6`                          | `3100`                                              | Stores logs (7-day max age)                                |
| **Promtail**       | `grafana/promtail:2.9.6`                      | —                                                   | Discovers Docker containers, ships logs to Loki            |
| **Grafana**        | `grafana/grafana:10.4.1`                      | `3001`                                              | Dashboards and visualization                               |

All services share an isolated `observability` bridge network with persistent volumes (`prometheus_data`, `loki_data`, `grafana_data`) and per-container memory limits (256M–512M).

## Dashboards

All dashboards are provisioned automatically from JSON files in `observability/grafana/provisioning/dashboards/`.

### HTTP Overview (`laundry-http-overview`)

Monitors HTTP request performance. Default time range: last 1 hour.

| Panel                   | What It Shows                                 |
| ----------------------- | --------------------------------------------- |
| Request Rate (req/s)    | Requests per second broken down by route      |
| Error Rate (5xx)        | 5xx error rate by route                       |
| Latency P50 / P95 / P99 | Response time percentiles by route            |
| Top Slow Routes (P95)   | Table of the 10 slowest routes by P95 latency |

**Useful queries:**

```promql
# Request rate for a specific route
sum(rate(http_server_request_duration_seconds_count{http_route="/api/orders"}[5m]))

# P95 latency across all routes
histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket[5m])) by (le))
```

### Business Metrics (`laundry-business-metrics`)

Tracks repository-level operations as proxies for business activity. Default time range: last 24 hours.

| Panel                                   | What It Shows                             |
| --------------------------------------- | ----------------------------------------- |
| Orders Created per Hour                 | Hourly order creation count               |
| Orders Completed per Hour               | Hourly order update count                 |
| Repository Operations Rate              | Operations/sec for each repository method |
| Customer / Service / Payment Operations | 24-hour totals (stat panels)              |

**Useful queries:**

```promql
# Total orders created today
sum(increase(effect_span_count_total{span_name=~"OrderRepository.*insert.*"}[24h]))

# All repository operations rate
sum(rate(effect_span_count_total[5m])) by (span_name)
```

### Logs Overview (`laundry-logs-overview`)

Displays application logs from Loki. Default time range: last 1 hour.

| Panel                     | What It Shows                           |
| ------------------------- | --------------------------------------- |
| Log Volume by Level       | Stacked bar chart of log rates by level |
| Error Log Stream          | Live stream of error-level logs         |
| Request Log Stream        | All request logs (parsed from JSON)     |
| Error / Warn / Total Rate | 5-minute rate stat panels               |

**Useful queries:**

```logql
# Find logs for a specific correlation ID
{service="backend"} |= "abc-123-correlation-id"

# Errors in the last hour
{service="backend", level="error"}

# Slow requests (> 1 second)
{service="backend"} | json | durationMs > 1000
```

## Configuration

### Environment Variables

| Variable                      | Default                 | Description                                                                    |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `OTEL_ENABLED`                | `false`                 | Enable/disable telemetry. When `false`, `Layer.empty` is used (zero overhead). |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTel Collector OTLP/HTTP endpoint                                              |
| `OTEL_SERVICE_NAME`           | `laundry-app`           | Service name in metrics and traces                                             |
| `OTEL_SERVICE_VERSION`        | `1.0.0`                 | Service version label                                                          |

In development, set `OTEL_ENABLED=true` in `backend/.env` and run the observability stack locally. In Docker, the `docker-compose.yml` sets all four variables.

### Config File Locations

| File                                                             | Purpose                                       |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `observability/otel-collector/otel-collector.yml`                | Collector receivers, processors, exporters    |
| `observability/prometheus/prometheus.yml`                        | Prometheus scrape config and storage settings |
| `observability/loki/loki-config.yml`                             | Loki storage and schema config                |
| `observability/promtail/promtail-config.yml`                     | Promtail Docker SD and log parsing            |
| `observability/grafana/grafana.ini`                              | Grafana server settings                       |
| `observability/grafana/provisioning/datasources/datasources.yml` | Prometheus and Loki datasource definitions    |
| `observability/grafana/provisioning/dashboards/*.json`           | Dashboard JSON models                         |

## Custom Metrics

### `http_server_request_duration_seconds` (Histogram)

Defined in `backend/src/middleware/RequestLoggingMiddleware.ts`. Records the duration of every HTTP request (excluding `/health` and `/health/db`).

**Labels:**

- `http_route` — URL path with UUIDs and numeric segments normalized to `/:id`
- `http_method` — HTTP method (GET, POST, etc.)
- `http_status_code` — Response status code as a string

**Bucket boundaries (seconds):** 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10

### `effect_span_count_total` (Counter)

Defined in `packages/observability/src/Metrics.ts`. Counts repository method executions, emitted by the `withSpanCount` wrapper.

**Labels:**

- `span_name` — The repository method name (e.g., `OrderRepository.insert`)

> Adding a new metric? See the `observability-backend` skill for the canonical pattern (counter / histogram / repository wrapping) and end-to-end verification steps.

## Troubleshooting

### No Metrics in Grafana

1. **Check OTEL_ENABLED:** Ensure the backend has `OTEL_ENABLED=true`.
2. **Check the collector is receiving data:**
   ```bash
   docker logs laundry_otel_collector 2>&1 | tail -20
   ```
   Look for `"NumberDataPoints"` in the debug output.
3. **Check Prometheus is receiving remote writes:**
   ```bash
   curl -s http://localhost:9090/api/v1/query?query=up | jq .
   ```
4. **Check Grafana datasource:** Connections → Data sources → Prometheus → "Save & test".

### Out-of-Order Samples Error in Prometheus

Prometheus is configured with `out_of_order_time_window: 30m` in `prometheus.yml` to handle OTLP cumulative metric timestamp skew. If you still see these errors, increase the window or restart the collector to reset metric timestamps.

### Datasource UID Mismatch

Dashboard JSON files reference datasources by UID (`prometheus` and `loki`). If you see "datasource not found" errors in Grafana, verify that `observability/grafana/provisioning/datasources/datasources.yml` has matching UIDs:

```yaml
- name: Prometheus
  uid: prometheus
- name: Loki
  uid: loki
```

### No Logs in Loki

1. **Check the backend container has the logging label:**
   ```bash
   docker inspect laundry_backend | grep -A2 logging
   ```
   The container needs the Docker label `logging=true`.
2. **Check Promtail is running:**
   ```bash
   docker logs laundry_promtail 2>&1 | tail -10
   ```
3. **Check Loki is reachable:**
   ```bash
   curl -s http://localhost:3100/ready
   ```

### Checking Each Pipeline Step

```bash
# 1. Is the backend emitting metrics?
docker logs laundry_backend 2>&1 | grep -i otel

# 2. Is the collector receiving and forwarding?
docker logs laundry_otel_collector 2>&1 | grep -i "NumberDataPoints\|error"

# 3. Does Prometheus have the metric?
curl -s 'http://localhost:9090/api/v1/query?query=http_server_request_duration_seconds_count' | jq '.data.result | length'

# 4. Does Loki have logs?
curl -s 'http://localhost:3100/loki/api/v1/query?query={service="backend"}&limit=5' | jq '.data.result | length'
```
