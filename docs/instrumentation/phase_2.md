# Phase 2 — `@laundry-app/observability` Package + Backend Integration

## Scope

Create a reusable observability package and wire it into the backend.

## Step 1: Create `packages/observability`

New package at `packages/observability/` following the `@laundry-app/shared` pattern.

### Structure

```
packages/observability/
├── package.json          # @laundry-app/observability
├── tsconfig.json
└── src/
    ├── index.ts          # Re-exports all public API
    ├── TelemetryConfig.ts # Config schema: otlpEndpoint, serviceName, serviceVersion, enabled
    └── Telemetry.ts       # makeTelemetryLayer composing OtlpTracer.layer + OtlpMetrics.layer
```

### `TelemetryConfig.ts`

Effect `Config.all` schema with:
- `otlpEndpoint` — `Config.string('OTEL_EXPORTER_OTLP_ENDPOINT')` with default `http://localhost:4318`
- `serviceName` — `Config.string('OTEL_SERVICE_NAME')` with default `laundry-app`
- `serviceVersion` — `Config.string('OTEL_SERVICE_VERSION')` with default `1.0.0`
- `enabled` — `Config.boolean('OTEL_ENABLED')` with default `false`

### `Telemetry.ts`

`makeTelemetryLayer` uses `Layer.unwrapEffect`:
- If `enabled=false`, returns `Layer.empty`
- If `enabled=true`, composes:
  - `OtlpTracer.layer({ url, resource: { serviceName, serviceVersion } })`
  - `OtlpMetrics.layer({ url, resource: { serviceName, serviceVersion } })`

## Step 2: Wire into Monorepo

| File | Change |
|------|--------|
| `package.json` (root) | Add `"packages/observability"` to `workspaces` array |
| `backend/package.json` | Add `"@laundry-app/observability": "workspace:*"` to dependencies |

## Step 3: Integrate in Backend

| File | Change |
|------|--------|
| `backend/src/main.ts` | Import `makeTelemetryLayer` and add `Effect.provide(makeTelemetryLayer)` alongside `makeLoggerLayer` |

### What This Gives Automatically (Zero Changes to Existing Code)

- All 6 repository `spanPrefix` spans exported as OTLP traces
- Effect's built-in HTTP spans from `@effect/platform`

## Verification

1. Deploy with `OTEL_ENABLED=true`
2. OTel Collector receives trace and metric batches
3. Prometheus shows metrics
4. Run API calls → verify spans in Collector debug logs
