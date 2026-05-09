# Observability Reference

Deep technical reference for the backend observability stack. Read SKILL.md first; come here when you need API details, package internals, or to understand _why_ a piece of the pipeline is shaped the way it is.

## Full Architecture

```
┌─────────────────────┐
│   Backend (Bun)     │
│                     │
│  Logger.json ──────────────────────────────────────────┐
│                     │                                  │ Docker stdout
│  OtlpTracer.layer ──┼──┐                               │
│  OtlpMetrics.layer ─┼──┤ OTLP/HTTP (port 4318)         │
└─────────────────────┘  │                               │
                         ▼                               ▼
              ┌───────────────────┐           ┌───────────────────┐
              │  OTel Collector   │           │     Promtail      │
              │  :4317 gRPC       │           │  Docker SD        │
              │  :4318 HTTP       │           │  JSON parsing     │
              │  :8888 metrics    │           └─────────┬─────────┘
              └────────┬──────────┘                     │
                       │                                │
          ┌────────────┴────────────┐                   │
          │ prometheusremotewrite   │                   │ Loki push API
          ▼                         ▼                   ▼
┌──────────────────┐    ┌─────┐         ┌───────────────────┐
│   Prometheus     │    │debug│         │       Loki        │
│   :9090          │    │stdout         │       :3100       │
│   15d retention  │    └─────┘         │   filesystem      │
└────────┬─────────┘                    └─────────┬─────────┘
         │                                        │
         └──────────────┬─────────────────────────┘
                        ▼
              ┌───────────────────┐
              │     Grafana       │
              │     :3001         │
              └───────────────────┘
```

**Data flows:**

1. **Traces** — Backend → OTel Collector (OTLP/HTTP) → debug exporter (stdout). To persist, add Tempo/Jaeger.
2. **Metrics** — Backend → OTel Collector → Prometheus (remote write).
3. **Logs** — Backend stdout (JSON) → Docker log driver → Promtail → Loki.

## `@effect/opentelemetry` API

Effect-native OpenTelemetry. No need to touch `@opentelemetry/*` SDK packages directly.

### `OtlpTracer.layer`

```typescript
import { OtlpTracer } from '@effect/opentelemetry'

OtlpTracer.layer({
  url: 'http://localhost:4318/v1/traces',
  resource: { serviceName: 'laundry-app', serviceVersion: '1.0.0' },
})
```

Requires `OtlpSerialization` + `HttpClient`. All `Effect.withSpan` and `Model.makeRepository({ spanPrefix })` spans are auto-exported.

### `OtlpMetrics.layer`

```typescript
import { OtlpMetrics } from '@effect/opentelemetry'

OtlpMetrics.layer({
  url: 'http://localhost:4318/v1/metrics',
  resource: { serviceName: 'laundry-app', serviceVersion: '1.0.0' },
})
```

Requires `OtlpSerialization` + `HttpClient`. Effect counters/histograms exported automatically. Span counts surface as `effect_span_count_total{span_name="..."}`.

### `OtlpSerialization`

```typescript
OtlpSerialization.layerJson // Simpler, good for dev
OtlpSerialization.layerProtobuf // More efficient, for production
```

### Dependency graph

```
OtlpTracer.layer ──┐
                   ├── requires ── OtlpSerialization.layerJson (or layerProtobuf)
OtlpMetrics.layer ─┘              └── requires ── HttpClient (e.g., FetchHttpClient.layer)
```

## `@laundry-app/observability` Package Internals

### Structure

```
packages/observability/
├── package.json
└── src/
    ├── index.ts              # Re-exports
    ├── Telemetry.ts          # makeTelemetryLayer
    ├── TelemetryConfig.ts    # Env config schema
    └── Metrics.ts            # withSpanCount + custom counters
```

### Dependencies

```json
{
  "effect": "^3.19.16",
  "@effect/opentelemetry": "^0.61.0",
  "@effect/platform": "^0.72.2"
}
```

No direct `@opentelemetry/*` deps — `@effect/opentelemetry` handles everything.

### `TelemetryConfig`

```typescript
import { Config } from 'effect'

export const TelemetryConfig = Config.all({
  otlpEndpoint: Config.string('OTEL_EXPORTER_OTLP_ENDPOINT').pipe(
    Config.withDefault('http://localhost:4318')
  ),
  serviceName: Config.string('OTEL_SERVICE_NAME').pipe(Config.withDefault('laundry-app')),
  serviceVersion: Config.string('OTEL_SERVICE_VERSION').pipe(Config.withDefault('1.0.0')),
  enabled: Config.boolean('OTEL_ENABLED').pipe(Config.withDefault(false)),
})
```

### `makeTelemetryLayer`

```typescript
export const makeTelemetryLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { otlpEndpoint, serviceName, serviceVersion, enabled } = yield* TelemetryConfig
    if (!enabled) return Layer.empty

    const resource = { serviceName, serviceVersion }
    const tracerLayer = OtlpTracer.layer({ url: `${otlpEndpoint}/v1/traces`, resource })
    const metricsLayer = OtlpMetrics.layer({ url: `${otlpEndpoint}/v1/metrics`, resource })

    return Layer.mergeAll(tracerLayer, metricsLayer).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(FetchHttpClient.layer)
    )
  })
)
```

`Layer.unwrapEffect` reads config at construction time. The `enabled` flag short-circuits to `Layer.empty` so no telemetry resources allocate when disabled.

### Integration in `main.ts`

```typescript
import { makeTelemetryLayer } from '@laundry-app/observability'

BunRuntime.runMain(
  program.pipe(Effect.provide(makeLoggerLayer), Effect.provide(makeTelemetryLayer))
)
```

Logger and telemetry are independent: logs go to stdout (Promtail picks them up regardless), telemetry goes to OTLP only when enabled.

## OTel Collector Pipeline

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

- **Batch processor** — 5s timeout, 1024 batch size; reduces export overhead.
- **Traces** — debug-only stdout. Add Tempo/Jaeger exporter to persist.
- **Metrics** — Prometheus remote write API with `resource_to_telemetry_conversion: true` (flattens OTel resource attributes into Prometheus labels).

## Promtail Pipeline

Discovers Docker containers labelled `logging=true` via Docker SD.

| Label       | Source                                    | Cardinality    |
| ----------- | ----------------------------------------- | -------------- |
| `container` | `__meta_docker_container_name`            | Low            |
| `service`   | `com_docker_compose_service` Docker label | Low            |
| `level`     | Parsed from JSON log `level` field        | Low (5 values) |

**Stages:** `json` (parse, extract `level`/`message`/`correlationId`) → `labels` (promote `level` to stream label) → `output` (set `message` as the log line).

## Custom Metrics in Use

### `http_server_request_duration_seconds` (Histogram)

Defined in `backend/src/middleware/RequestLoggingMiddleware.ts`. Records every HTTP request except `/health` and `/health/db`.

- Labels: `http_route` (UUIDs/numerics normalized to `/:id`), `http_method`, `http_status_code`.
- Buckets (s): 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10.

### `effect_span_count_total` (Counter)

Defined in `packages/observability/src/Metrics.ts` via `withSpanCount`. Counts repository method invocations.

- Label: `span_name` (e.g., `OrderRepository.insert`).

## Key Design Decisions

1. **`@effect/opentelemetry` over raw OTel SDK** — All `Effect.withSpan` and `Model.makeRepository` spans are auto-exported. No manual instrumentation for existing Effect code.
2. **OTLP/HTTP over gRPC** — Simpler, no protobuf compilation. `layerJson` for simplicity; switch to `layerProtobuf` for production efficiency.
3. **`FetchHttpClient` for OTLP transport** — Bun's native fetch; no extra HTTP dependency.
4. **`OTEL_ENABLED=false` by default** — Zero overhead in dev. `Layer.unwrapEffect` + `Layer.empty` allocates no telemetry resources when disabled.
5. **Promtail + Loki over OTel log exporter** — Decouples log collection from the app. Backend just writes JSON to stdout. Logs work even with OTel disabled.
6. **Prometheus remote write over scraping** — Collector pushes; no metrics endpoint exposed on the backend.
7. **Docker SD for Promtail** — Containers labelled `logging=true` are auto-discovered. No manual log paths.
8. **Separate `@laundry-app/observability` package** — Telemetry isolated from business logic; reusable across the monorepo.
9. **Pre-provisioned Grafana dashboards** — Version-controlled JSON loaded on startup; no manual setup post-`docker compose up`.

## Config File Locations

```
observability/
├── otel-collector/otel-collector.yml
├── prometheus/prometheus.yml
├── loki/loki-config.yml
├── promtail/promtail-config.yml
└── grafana/
    ├── grafana.ini
    └── provisioning/
        ├── datasources/datasources.yml
        └── dashboards/{dashboard.yml,*.json}
```

## Environment Variables

| Variable                      | Default                 | Description                       |
| ----------------------------- | ----------------------- | --------------------------------- |
| `OTEL_ENABLED`                | `false`                 | Enable/disable telemetry          |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTel Collector OTLP/HTTP endpoint |
| `OTEL_SERVICE_NAME`           | `laundry-app`           | Service name in traces/metrics    |
| `OTEL_SERVICE_VERSION`        | `1.0.0`                 | Service version                   |
