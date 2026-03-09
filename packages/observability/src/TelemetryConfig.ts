import { Config } from 'effect'

export const TelemetryConfig = Config.all({
  otlpEndpoint: Config.string('OTEL_EXPORTER_OTLP_ENDPOINT').pipe(
    Config.withDefault('http://localhost:4318')
  ),
  serviceName: Config.string('OTEL_SERVICE_NAME').pipe(Config.withDefault('laundry-app')),
  serviceVersion: Config.string('OTEL_SERVICE_VERSION').pipe(Config.withDefault('1.0.0')),
  enabled: Config.boolean('OTEL_ENABLED').pipe(Config.withDefault(false)),
})
