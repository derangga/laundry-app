# Phase 3 — Structured Log Collection (Promtail → Loki)

## Scope

Finalize Promtail config to parse the backend's existing JSON logs and ship them to Loki. Zero backend code changes.

## Modified Files

| File | Change |
|------|--------|
| `observability/promtail/promtail-config.yml` | Finalize JSON pipeline stages to extract `level`, `message`, `correlationId` |
| `docker-compose.yml` | Add `logging: "true"` label to backend container (if not done in phase 1) |

## Label Strategy

### Stream Labels (indexed, low-cardinality)

- `service` — service name (e.g., "backend")
- `container` — container name
- `level` — log level (info, error, warn, debug)

### Log Body Fields (not labeled)

- `correlationId`
- `method`
- `path`
- `status`
- `durationMs`

## Verification LogQL Queries

```logql
# Error logs from backend
{service="backend", level="error"}

# Logs containing specific path
{service="backend"} |= "/api/orders"

# Filter by correlationId
{service="backend"} | json | correlationId = "some-id"

# Error rate over time
sum by (service) (rate({level="error"}[5m]))
```
