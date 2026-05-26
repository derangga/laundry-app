/**
 * AppApi — re-export shim.
 *
 * The full HTTP API contract (all `HttpApiGroup`s + `AppApi`) now lives in
 * `@laundry-app/api-contract` so the frontend can derive a typed client from it
 * without pulling backend runtime deps. `@api/AppApi` consumers (Router, handlers)
 * keep resolving `AppApi` unchanged.
 */
export { AppApi } from '@laundry-app/api-contract'
