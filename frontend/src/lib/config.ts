import { FetchHttpClient } from '@effect/platform'
import { Config, ConfigProvider, Layer } from 'effect'

// Server-side (SSR) base URL for API requests.
// In local dev: http://localhost:3000. In Docker: http://backend:3000.
// Browser requests use relative URLs (proxied by Vite dev server or nginx).
export const ApiBaseUrl = Config.string('API_INTERNAL_URL').pipe(
  Config.withDefault(''),
)

// Merge process.env (runtime/SSR vars) with import.meta.env (Vite build-time vars)
const envVars: Record<string, string> = {
  ...(typeof process !== 'undefined'
    ? (process.env as Record<string, string>)
    : {}),
  ...(import.meta.env as Record<string, string>),
}

export const EnvConfigProvider = Layer.setConfigProvider(
  ConfigProvider.fromJson(envVars),
)

export const ConfigLive = EnvConfigProvider

// Configure FetchHttpClient with credentials: 'include' for cookie-based auth
export const FetchLive = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, { credentials: 'include' }),
  ),
)
