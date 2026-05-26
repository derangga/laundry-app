/**
 * HTTP Error Schemas — re-export shim.
 *
 * The error definitions now live in the backend-agnostic `@laundry-app/api-contract`
 * package so the frontend can derive a typed client from `AppApi` without pulling
 * backend runtime deps. All existing `@domain/http/HttpErrors` imports keep working.
 */
export * from '@laundry-app/api-contract'
