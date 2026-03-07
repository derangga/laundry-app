# Phase 4 — Grafana Dashboards

## Scope

Provision pre-built dashboards for HTTP traffic, business metrics, and log analysis.

## New Files

| File | Purpose |
|------|---------|
| `observability/grafana/provisioning/dashboards/http-overview.json` | Request rate, latency percentiles, error rate, top slow routes |
| `observability/grafana/provisioning/dashboards/business-metrics.json` | Orders created/completed per hour, orders by status |
| `observability/grafana/provisioning/dashboards/logs-overview.json` | Log volume by level, error log stream, request log stream |

## Dashboard Details

### HTTP Overview

- **Request Rate** — `sum(rate(http_server_request_duration_seconds_count[5m]))` by route
- **Latency P50/P95/P99** — `histogram_quantile` on `http_server_request_duration_seconds`
- **Error Rate** — `sum(rate(http_server_request_duration_seconds_count{http_status_code=~"5.."}[5m]))`
- **Top Slow Routes** — table of routes sorted by P95 latency

### Business Metrics

- **Orders Created/Hour** — counter rate from order creation spans
- **Orders by Status** — gauge from order status distribution
- **Active Customers** — unique customer count from recent orders

### Logs Overview

- **Log Volume by Level** — `sum by (level) (rate({service="backend"}[5m]))`
- **Error Log Stream** — `{service="backend", level="error"}`
- **Request Log Stream** — `{service="backend"} | json | method != ""`

## Verification

Dashboards appear automatically in Grafana under "Laundry App" folder with live data.
