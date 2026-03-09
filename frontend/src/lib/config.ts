import { Config, ConfigProvider, Layer } from 'effect'

export const ApiBaseUrl = Config.string('VITE_API_BASE_URL').pipe(
  Config.withDefault('http://localhost:3000'),
)

export const EnvConfigProvider = Layer.setConfigProvider(
  ConfigProvider.fromJson(import.meta.env as Record<string, string>),
)

export const ConfigLive = EnvConfigProvider
