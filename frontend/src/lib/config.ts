import { FetchHttpClient } from '@effect/platform'
import { Config, ConfigProvider, Layer } from 'effect'

// Private — raw env var reads
const _apiInternalUrl = Config.string('API_INTERNAL_URL').pipe(
  Config.withDefault(''),
)
const _viteApiBaseUrl = Config.string('VITE_API_BASE_URL').pipe(
  Config.withDefault(''),
)

// Public — single config, auto-resolves server vs client
export const ApiBaseUrl = Config.map(
  Config.all([_apiInternalUrl, _viteApiBaseUrl]),
  ([internal, client]) => (internal !== '' ? internal : client),
)

// Merge import.meta.env (VITE_* build-time vars) with process.env (runtime vars like API_INTERNAL_URL)
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
