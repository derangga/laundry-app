import { Cause, Effect, Exit } from 'effect'
import type { Hooks } from '@opencode-ai/plugin'
import { BACKEND_SRC_RE, EDIT_WRITE_TOOLS, FRONTEND_SRC_RE, SHARED_RE } from '../lib/patterns'
import { FeedbackStateService } from '../lib/dirty-bit'
import type { HooksRuntime } from './tool-before'

type ToolAfterFn = NonNullable<Hooks['tool.execute.after']>
type ToolAfterInput = Parameters<ToolAfterFn>[0]

export const handleToolAfter = async (
  runtime: HooksRuntime,
  input: ToolAfterInput
): Promise<void> => {
  if (!(EDIT_WRITE_TOOLS as readonly string[]).includes(input.tool)) return

  const args = input.args as Record<string, unknown> | undefined
  const filePath = args?.filePath
  if (typeof filePath !== 'string') return

  const program = Effect.gen(function* () {
    const rel = yield* FeedbackStateService.toRepoRelative(filePath)
    const domains: string[] = []

    if (BACKEND_SRC_RE.test(rel)) {
      domains.push('backend')
    } else if (FRONTEND_SRC_RE.test(rel)) {
      domains.push('frontend')
    } else if (SHARED_RE.test(rel)) {
      domains.push('backend', 'frontend')
    } else {
      return
    }

    yield* FeedbackStateService.setDirtyBit(domains)
  })

  const exit = await runtime.runPromiseExit(program)
  if (Exit.isFailure(exit)) {
    console.error('tool.execute.after unexpected failure:', Cause.pretty(exit.cause))
  }
}
