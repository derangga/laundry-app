import { Effect, Metric } from 'effect'

export const SpanCount = Metric.counter('effect_span_count_total')

export const withSpanCount = <A, E, R>(
  spanName: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  Effect.ensuring(
    effect,
    Metric.update(SpanCount.pipe(Metric.tagged('span_name', spanName)), 1)
  )
