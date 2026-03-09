import { FetchHttpClient } from '@effect/platform'
import { Config, ConfigProvider, Layer } from 'effect'

export const ApiBaseUrl = Config.string('VITE_API_BASE_URL')

export const EnvConfigProvider = Layer.setConfigProvider(
  ConfigProvider.fromJson(import.meta.env as Record<string, string>),
)

export const ConfigLive = EnvConfigProvider

// Configure FetchHttpClient with credentials: 'include' for cookie-based auth
export const FetchLive = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, { credentials: 'include' }),
  ),
)
