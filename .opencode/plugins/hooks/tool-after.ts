import { Effect } from 'effect'
import { EDIT_WRITE_TOOLS } from '../lib/patterns'
import { FeedbackStateService } from '../lib/dirty-bit'

interface ToolAfterInput {
  tool: string
  sessionID: string
  callID: string
  args: Record<string, unknown>
}

export const handleToolAfter = async (input: ToolAfterInput): Promise<void> => {
  const program = Effect.gen(function* () {
    const fb = yield* FeedbackStateService

    if (!(EDIT_WRITE_TOOLS as readonly string[]).includes(input.tool)) return

    const filePath = input.args?.filePath
    if (!filePath || typeof filePath !== 'string') return

    const rel = fb.toRepoRelative(filePath)
    const domains: string[] = []

    if (rel.startsWith('backend/src/')) {
      domains.push('backend')
    } else if (rel.startsWith('frontend/src/')) {
      domains.push('frontend')
    } else if (rel.startsWith('packages/shared/')) {
      domains.push('backend', 'frontend')
    } else {
      return
    }

    yield* fb.setDirtyBit(domains)
  }).pipe(Effect.provide(FeedbackStateService.Default))

  await Effect.runPromise(program)
}
