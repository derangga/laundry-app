---
name: observability-backend
description: Instrument backend Effect code with OpenTelemetry traces, metrics, and structured logs via @effect/opentelemetry and @laundry-app/observability. Use when adding repository methods, custom counters or histograms, HTTP middleware metrics, debugging the OTel/Prometheus/Loki/Grafana stack, or wiring new Grafana dashboard panels.
---

# Observability (Backend)

## When to use

Trigger this skill when working in the `backend/` or `packages/observability/` workspace and the task involves:

- Adding a new repository method or service that needs to be visible in dashboards.
- Defining a custom metric (counter, histogram, gauge).
- Touching HTTP middleware that records request metrics.
- Debugging "no metrics in Grafana", "no logs in Loki", or out-of-order sample errors.
- Adding a panel to the provisioned Grafana dashboards.

For end-user operator tasks (starting the stack, dashboard URLs, troubleshooting), point readers at `docs/OBSERVABILITY.md`. For deep API/internals, see [REFERENCE.md](REFERENCE.md).

## Architecture (one-liner)

Backend emits **OTLP/HTTP** (traces + metrics) to the OTel Collector → Prometheus (remote write). Backend writes **JSON logs to stdout** → Promtail (Docker SD) → Loki. Grafana queries both. Telemetry is gated by `OTEL_ENABLED` (defaults `false` → `Layer.empty`, zero overhead).

## Patterns

### Repository instrumentation

Every repository method MUST be wrapped with `withSpanCount` so it surfaces on the Business Metrics dashboard:

```typescript
import { withSpanCount } from '@laundry-app/observability'

return {
  findById: (id) => withSpanCount('CustomerRepository.findById', findById(id)),
  insert: (input) => withSpanCount('CustomerRepository.insert', insert(input)),
} as const
```

`withSpanCount` is `Effect.ensuring`-based — increments on success **and** failure, so it tracks total volume. Defined at `packages/observability/src/Metrics.ts`.

Spans created via `Effect.withSpan` or `Model.makeRepository({ spanPrefix })` are auto-exported as OTel traces and emit `effect_span_count_total{span_name="..."}` for free.

### Adding a counter

1. Define in `packages/observability/src/Metrics.ts`:
   ```typescript
   export const FailedLoginCounter = Metric.counter('failed_login_total')
   ```
2. Re-export from `packages/observability/src/index.ts`.
3. Increment with a tag at the use site:

   ```typescript
   import { Metric } from 'effect'
   import { FailedLoginCounter } from '@laundry-app/observability'

   yield * Metric.update(FailedLoginCounter.pipe(Metric.tagged('reason', 'bad_password')), 1)
   ```

### Adding a histogram

Co-locate with the use site (see `backend/src/middleware/RequestLoggingMiddleware.ts` for `http_server_request_duration_seconds` as the canonical example):

```typescript
import { Metric, MetricBoundaries } from 'effect'

const MyDuration = Metric.histogram(
  'my_operation_duration_seconds',
  MetricBoundaries.fromIterable([0.01, 0.05, 0.1, 0.5, 1, 5])
)

yield * Metric.update(MyDuration.pipe(Metric.tagged('operation', 'fetch')), durationSeconds)
```

### Logging

Use Effect's `Logger.json` (already wired in `main.ts`). Anything written to stdout is auto-shipped to Loki by Promtail — no exporter setup. Use `Effect.logInfo` / `Effect.logError` / `Effect.logWarning`. Correlation IDs added by middleware become queryable via `{service="backend"} |= "correlation-id-here"`.

Logs work even when `OTEL_ENABLED=false`.

## Enabling locally

```bash
OTEL_ENABLED=true bun run dev
docker compose -f docker-compose.observability.yml up -d
```

Grafana: `http://localhost:3001` (admin/admin). Metrics appear within ~30s (5s batch + 15s scrape).

## Verifying a new metric end-to-end

1. Backend emitting? `docker logs laundry_backend 2>&1 | grep -i otel`
2. Collector receiving? `docker logs laundry_otel_collector 2>&1 | grep NumberDataPoints`
3. Prometheus has it? `curl -s 'http://localhost:9090/api/v1/query?query=<metric_name>' | jq .`
4. Add a panel to the relevant JSON in `observability/grafana/provisioning/dashboards/` and `docker restart laundry_grafana`.

## Troubleshooting quick map

| Symptom                            | First command                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| No metrics in Grafana              | `docker logs laundry_otel_collector 2>&1 \| tail -20` (look for `NumberDataPoints`)                                         |
| Out-of-order samples in Prometheus | Check `prometheus.yml` has `out_of_order_time_window: 30m`; restart collector to reset timestamps                           |
| "Datasource not found"             | Verify UIDs in `observability/grafana/provisioning/datasources/datasources.yml` match dashboard JSON (`prometheus`, `loki`) |
| No logs in Loki                    | `docker inspect laundry_backend \| grep -A2 logging` (needs `logging=true` label)                                           |

## Reuse existing utilities — never reinvent

- `withSpanCount` — `packages/observability/src/Metrics.ts`
- `makeTelemetryLayer`, `TelemetryConfig` — `packages/observability/src/`
- `http_server_request_duration_seconds` histogram — `backend/src/middleware/RequestLoggingMiddleware.ts`

For OTLP layer construction, the `@effect/opentelemetry` API surface, OTel Collector pipeline YAML, Promtail label strategy, and design rationale, see [REFERENCE.md](REFERENCE.md).
