# Instrumentation Context

Technical reference for the observability and instrumentation layer. Covers `@effect/opentelemetry` integration, Docker infrastructure, logging pipeline, and Grafana dashboards.

## External Resources

- **[@effect/opentelemetry](https://github.com/Effect-TS/effect/tree/main/packages/opentelemetry)** — Effect OpenTelemetry integration
- **[OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)** — OTel Collector documentation
- **[Grafana Loki](https://grafana.com/docs/loki/latest/)** — Log aggregation system
- **[Promtail](https://grafana.com/docs/loki/latest/send-data/promtail/)** — Log shipping agent for Loki

## Architecture Overview

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
│   :9090          │    │(stdout)       │       :3100       │
│   15d retention  │    └─────┘         │   filesystem      │
└────────┬─────────┘                    └─────────┬─────────┘
         │                                        │
         └──────────────┬─────────────────────────┘
                        ▼
              ┌───────────────────┐
              │     Grafana       │
              │     :3001         │
              │  3 dashboards     │
              └───────────────────┘
```

**Data flows:**

1. **Traces**: Backend → OTel Collector (OTLP/HTTP) → debug exporter (stdout)
2. **Metrics**: Backend → OTel Collector (OTLP/HTTP) → Prometheus (remote write)
3. **Logs**: Backend (JSON stdout) → Docker log driver → Promtail → Loki

## `@effect/opentelemetry` API Reference

The `@effect/opentelemetry` package provides Effect-native OpenTelemetry integration. Key modules:

### `OtlpTracer.layer`

Creates a tracing layer that sends spans via OTLP:

```typescript
import { OtlpTracer } from '@effect/opentelemetry'

OtlpTracer.layer({
  url: 'http://localhost:4318/v1/traces',
  resource: { serviceName: 'laundry-app', serviceVersion: '1.0.0' },
})
```

**Requires**: `OtlpSerialization` layer, `HttpClient` layer.

Effect spans (from `Effect.withSpan`, `Model.makeRepository` `spanPrefix`, etc.) are automatically exported as OpenTelemetry spans.

### `OtlpMetrics.layer`

Creates a metrics layer that sends metrics via OTLP:

```typescript
import { OtlpMetrics } from '@effect/opentelemetry'

OtlpMetrics.layer({
  url: 'http://localhost:4318/v1/metrics',
  resource: { serviceName: 'laundry-app', serviceVersion: '1.0.0' },
})
```

**Requires**: `OtlpSerialization` layer, `HttpClient` layer.

Effect metrics (counters from spans, etc.) are automatically exported. Repository operations using `Model.makeRepository` with `spanPrefix` generate `effect_span_count_total` metrics with the span name as a label.

### `OtlpSerialization`

Serialization layer for OTLP payloads. Two variants:

```typescript
import { OtlpSerialization } from '@effect/opentelemetry'

OtlpSerialization.layerJson      // JSON serialization (simpler, good for dev)
OtlpSerialization.layerProtobuf  // Protobuf serialization (more efficient, for production)
```

### Dependency Graph

```
OtlpTracer.layer ──┐
                   ├── requires ── OtlpSerialization.layerJson (or layerProtobuf)
OtlpMetrics.layer ─┘              └── requires ── HttpClient (e.g., FetchHttpClient.layer)
```

## `@laundry-app/observability` Package

### Package Structure

```
packages/observability/
├── package.json              # @laundry-app/observability
└── src/
    ├── index.ts              # Re-exports TelemetryConfig, makeTelemetryLayer
    ├── Telemetry.ts          # Layer construction
    └── TelemetryConfig.ts    # Environment config schema
```

### Dependencies

```json
{
  "dependencies": {
    "effect": "^3.19.16",
    "@effect/opentelemetry": "^0.61.0",
    "@effect/platform": "^0.72.2"
  }
}
```

No direct dependency on `@opentelemetry/*` SDK packages — `@effect/opentelemetry` handles everything.

### `TelemetryConfig`

Environment-driven configuration using `Config.all`:

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

Constructs the combined tracer + metrics layer. Returns `Layer.empty` when disabled:

```typescript
import { Effect, Layer } from 'effect'
import { OtlpTracer, OtlpMetrics, OtlpSerialization } from '@effect/opentelemetry'
import { FetchHttpClient } from '@effect/platform'
import { TelemetryConfig } from './TelemetryConfig.js'

export const makeTelemetryLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { otlpEndpoint, serviceName, serviceVersion, enabled } = yield* TelemetryConfig

    if (!enabled) {
      return Layer.empty
    }

    const resource = { serviceName, serviceVersion }

    const tracerLayer = OtlpTracer.layer({
      url: `${otlpEndpoint}/v1/traces`,
      resource,
    })

    const metricsLayer = OtlpMetrics.layer({
      url: `${otlpEndpoint}/v1/metrics`,
      resource,
    })

    return Layer.mergeAll(tracerLayer, metricsLayer).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(FetchHttpClient.layer)
    )
  })
)
```

**Key design**: `Layer.unwrapEffect` allows reading config at layer construction time. The `enabled` flag short-circuits to `Layer.empty`, so the backend runs with zero telemetry overhead when disabled.

### Integration in `main.ts`

```typescript
import { makeTelemetryLayer } from '@laundry-app/observability'

BunRuntime.runMain(
  program.pipe(
    Effect.provide(makeLoggerLayer),
    Effect.provide(makeTelemetryLayer)
  )
)
```

The telemetry layer is provided at the top level alongside the logger layer. Both are independent — logging goes to stdout (picked up by Promtail), telemetry goes to the OTel Collector via OTLP/HTTP.

## Docker Infrastructure

### Starting the Stack

```bash
# Start observability stack only
docker compose -f docker-compose.observability.yml up -d

# Start with main app stack (overlay pattern)
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

### Services and Ports

| Service         | Image                                        | Port(s)          | Purpose                                |
| --------------- | -------------------------------------------- | ---------------- | -------------------------------------- |
| otel-collector  | `otel/opentelemetry-collector-contrib:0.96.0` | 4317, 4318, 8888 | Receives OTLP, exports to Prometheus   |
| prometheus      | `prom/prometheus:v2.51.0`                     | 9090             | Metrics storage & querying             |
| loki            | `grafana/loki:2.9.6`                          | 3100             | Log aggregation                        |
| promtail        | `grafana/promtail:2.9.6`                      | —                | Ships Docker logs to Loki              |
| grafana         | `grafana/grafana:10.4.1`                      | 3001 → 3000      | Dashboards (admin/admin)               |

### Config File Locations

```
observability/
├── otel-collector/
│   └── otel-collector.yml        # Collector receivers, processors, exporters, pipelines
├── prometheus/
│   └── prometheus.yml            # Scrape configs (self + otel-collector)
├── loki/
│   └── loki-config.yml           # Single-node Loki with filesystem storage
├── promtail/
│   └── promtail-config.yml       # Docker SD, JSON parsing, label extraction
└── grafana/
    ├── grafana.ini                # Server config (port, auth, analytics)
    └── provisioning/
        ├── datasources/
        │   └── datasources.yml   # Prometheus (default) + Loki
        └── dashboards/
            ├── dashboard.yml     # Dashboard provider config
            ├── http-overview.json
            ├── business-metrics.json
            └── logs-overview.json
```

### Network and Volumes

- All services share an isolated `observability` bridge network
- Persistent volumes: `prometheus_data`, `loki_data`, `grafana_data`
- Resource limits set per container (256M–512M memory)

## Logging Pipeline

### How It Works

1. Backend uses `Logger.json` (Effect's built-in JSON logger) → writes structured JSON to stdout
2. Docker captures stdout as container logs
3. Promtail discovers containers with `logging=true` Docker label via Docker service discovery
4. Promtail parses JSON logs, extracts fields, and pushes to Loki
5. Grafana queries Loki via LogQL

### Promtail Label Strategy

Labels extracted from Docker containers:

| Label       | Source                                               | Cardinality |
| ----------- | ---------------------------------------------------- | ----------- |
| `container` | `__meta_docker_container_name`                       | Low         |
| `service`   | `com_docker_compose_service` Docker label            | Low         |
| `level`     | Parsed from JSON log `level` field                   | Low (5 values) |

**Pipeline stages**:
1. `json` — parse JSON, extract `level`, `message`, `correlationId`
2. `labels` — promote `level` to a Loki stream label
3. `output` — set `message` field as the log line content

### LogQL Examples

```logql
# All error logs from backend
{service="backend", level="Error"}

# Logs containing a specific correlation ID
{service="backend"} |= "correlation-id-here"

# Error rate over 5 minutes
rate({service="backend", level="Error"}[5m])

# Log volume by level
sum by (level) (rate({service="backend"}[5m]))
```

## Grafana Dashboards

Three pre-provisioned dashboards in the "Laundry App" folder:

### 1. HTTP Overview

Monitors HTTP request performance using `http_server_request_duration_seconds` histogram:

| Panel                  | Query (PromQL)                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Request Rate           | `sum by (http_route) (rate(http_server_request_duration_seconds_count[5m]))`                         |
| Error Rate (5xx)       | `sum by (http_route) (rate(http_server_request_duration_seconds_count{http_status_code=~"5.."}[5m]))` |
| P50 Latency            | `histogram_quantile(0.5, sum by (le, http_route) (rate(http_server_request_duration_seconds_bucket[5m])))` |
| P95 Latency            | `histogram_quantile(0.95, ...)`                                                                     |
| P99 Latency            | `histogram_quantile(0.99, ...)`                                                                     |
| Top 10 Slowest Routes  | Table of routes sorted by P95 latency                                                               |

### 2. Business Metrics

Tracks domain operations via `effect_span_count_total` metric (generated by `Model.makeRepository` `spanPrefix`):

| Panel                        | Filter                                                    |
| ---------------------------- | --------------------------------------------------------- |
| Orders Created/hr            | `span_name="OrderRepository.create"`                      |
| Orders Completed/hr          | `span_name="OrderRepository.update"`                      |
| Repository Operation Rates   | All `span_name` values containing `Repository`            |
| Customer Operations (24h)    | `span_name=~"CustomerRepository.*"`                       |
| Service Operations (24h)     | `span_name=~"ServiceRepository.*"`                        |
| Payment Operations (24h)     | `span_name=~"PaymentRepository.*"`                        |

### 3. Logs Overview

Aggregates logs from Loki with `service="backend"`:

| Panel              | Query (LogQL)                                              |
| ------------------ | ---------------------------------------------------------- |
| Log Volume by Level | `sum by (level) (rate({service="backend"}[5m]))`          |
| Error Log Stream    | `{service="backend", level="Error"}`                      |
| Request Log Stream  | `{service="backend"} \| json \| method != ""`             |
| Error Rate (5m)     | `rate({service="backend", level="Error"}[5m])`            |
| Warning Rate (5m)   | `rate({service="backend", level="Warning"}[5m])`          |
| Total Log Rate (5m) | `rate({service="backend"}[5m])`                           |

## Configuration Reference

| Environment Variable            | Default                  | Description                           |
| ------------------------------- | ------------------------ | ------------------------------------- |
| `OTEL_ENABLED`                  | `false`                  | Enable/disable telemetry              |
| `OTEL_EXPORTER_OTLP_ENDPOINT`  | `http://localhost:4318`  | OTel Collector OTLP/HTTP endpoint     |
| `OTEL_SERVICE_NAME`             | `laundry-app`            | Service name in traces/metrics        |
| `OTEL_SERVICE_VERSION`          | `1.0.0`                  | Service version in traces/metrics     |

To enable telemetry in development:

```bash
OTEL_ENABLED=true bun run dev
```

## OTel Collector Pipelines

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]        # Logs traces to collector stdout
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]  # Pushes to Prometheus
```

- **Batch processor**: 5s timeout, 1024 batch size — reduces export overhead
- **Traces**: Currently debug-only (stdout). To persist traces, add a Tempo or Jaeger exporter
- **Metrics**: Pushed to Prometheus via remote write API with `resource_to_telemetry_conversion: true` (flattens OTel resource attributes into Prometheus labels)

## Key Design Decisions

1. **`@effect/opentelemetry` over raw OTel SDK** — Native Effect integration means all `Effect.withSpan` and `Model.makeRepository` spans are automatically exported. No manual instrumentation needed for existing Effect code.

2. **OTLP/HTTP over gRPC** — Simpler setup, no protobuf compilation needed. `OtlpSerialization.layerJson` used for simplicity; switch to `layerProtobuf` for production efficiency.

3. **`FetchHttpClient` for OTLP transport** — Uses the platform-native fetch API (Bun's built-in). No additional HTTP client dependency needed.

4. **`OTEL_ENABLED=false` by default** — Zero overhead in development unless explicitly opted in. `Layer.unwrapEffect` with conditional `Layer.empty` means no telemetry resources are allocated when disabled.

5. **Promtail + Loki over OTel log exporter** — Decouples log collection from the application. Backend simply writes JSON to stdout (standard `Logger.json`). Promtail handles collection, parsing, and shipping. This means logs work even if OTel is disabled.

6. **Prometheus remote write over scraping** — OTel Collector pushes metrics to Prometheus rather than Prometheus scraping the app. Avoids exposing a metrics endpoint on the backend and works naturally with the OTLP pipeline.

7. **Docker service discovery for Promtail** — Containers with `logging=true` label are auto-discovered. No manual log path configuration needed when adding new services.

8. **Separate `@laundry-app/observability` package** — Keeps telemetry concerns isolated from backend business logic. Could be reused by other services in the monorepo.

9. **Pre-provisioned Grafana dashboards** — Dashboards are version-controlled JSON files, automatically loaded on startup. No manual dashboard setup needed after `docker compose up`.
