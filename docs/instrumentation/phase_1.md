# Phase 1 — Docker Infrastructure Setup

## Scope

Add all observability containers. Zero app code changes.

## Architecture

```
Backend App
  ├── Metrics → OTLP/HTTP → OTel Collector → Prometheus (remote_write)
  └── Traces  → OTLP/HTTP → OTel Collector → (debug exporter for now)

Docker stdout (all containers, structured JSON)
  └── Promtail → Loki

Grafana
  ├── Datasource: Prometheus (metrics)
  └── Datasource: Loki (logs)
```

## New Files

| File | Purpose |
|------|---------|
| `docker-compose.observability.yml` | 5 services: otel-collector, prometheus, loki, promtail, grafana |
| `observability/otel-collector/otel-collector.yml` | OTLP receiver → prometheus remote_write exporter |
| `observability/prometheus/prometheus.yml` | Scrape config (self + collector) |
| `observability/loki/loki-config.yml` | Local storage config |
| `observability/promtail/promtail-config.yml` | Docker log discovery, JSON pipeline stage |
| `observability/grafana/provisioning/datasources/datasources.yml` | Auto-provision Prometheus + Loki |
| `observability/grafana/provisioning/dashboards/dashboard.yml` | Dashboard file provider |
| `observability/grafana/grafana.ini` | Minimal server config |

## Modified Files

| File | Change |
|------|--------|
| `docker-compose.yml` | Add `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` env vars to backend; add logging label; connect to `observability` network |

## Verification

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

- All 5 observability services start and stay healthy
- Grafana accessible at `localhost:3001`
- Prometheus datasource connected (empty data)
- Loki datasource connected (empty data)
- OTel Collector logs show "Everything is ready"
