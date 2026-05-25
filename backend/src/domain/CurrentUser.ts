/**
 * CurrentUser — re-export shim.
 *
 * The `CurrentUser` Tag + `CurrentUserData` now live in `@laundry-app/api-contract`
 * so the contract's middleware Tags share a single Tag identity across packages.
 * `CurrentUser.get` now fails with the contract's `Unauthorized` (semantically
 * "no current user" = 401) instead of `UserNotFoundError`.
 */
export { CurrentUser, type CurrentUserData } from '@laundry-app/api-contract'
