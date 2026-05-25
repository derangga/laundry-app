/**
 * Health Check Domain Models — re-export shim.
 *
 * `HealthResponse` / `DatabaseHealthResponse` are pure response schemas that now
 * live alongside the Health API group in `@laundry-app/api-contract`. Re-exported
 * here so `@domain/Health` consumers (HealthHandlers) keep resolving them.
 */
export { HealthResponse, DatabaseHealthResponse } from '@laundry-app/api-contract'
