import { Effect, Layer } from 'effect'
import { OtlpTracer, OtlpMetrics, OtlpSerialization } from '@effect/opentelemetry'
import { FetchHttpClient } from '@effect/platform'
import { TelemetryConfig } from './TelemetryConfig.js'

export const makeTelemetryLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { otlpEndpoint, serviceName, serviceVersion, enabled } = yield* TelemetryConfig

    if (!enabled) {
      return Layer.empty
    }

    const resource = { serviceName, serviceVersion }

    const tracerLayer = OtlpTracer.layer({
      url: `${otlpEndpoint}/v1/traces`,
      resource,
    })

    const metricsLayer = OtlpMetrics.layer({
      url: `${otlpEndpoint}/v1/metrics`,
      resource,
    })

    return Layer.mergeAll(tracerLayer, metricsLayer).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(FetchHttpClient.layer)
    )
  })
)
