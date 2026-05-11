import { Cause, Effect, Exit, type Layer, type ManagedRuntime, Option } from 'effect'
import type { Hooks } from '@opencode-ai/plugin'
import { BASH_TOOL, EDIT_WRITE_TOOLS } from '../lib/patterns'
import { RtkService } from '../lib/rtk'
import { AgentFirstService } from '../lib/agent-first'
import { RtkBlockError } from '../lib/errors'
import type { makeHooksLive } from '../lib/shared'

type ToolBeforeFn = NonNullable<Hooks['tool.execute.before']>
type ToolBeforeInput = Parameters<ToolBeforeFn>[0]
type ToolBeforeOutput = Parameters<ToolBeforeFn>[1]

export type HooksRuntime = ManagedRuntime.ManagedRuntime<
  Layer.Layer.Success<ReturnType<typeof makeHooksLive>>,
  never
>

export const handleToolBefore = async (
  runtime: HooksRuntime,
  input: ToolBeforeInput,
  output: ToolBeforeOutput
): Promise<void> => {
  const { tool } = input
  const args = output.args as Record<string, unknown> | undefined

  const program = Effect.gen(function* () {
    if (tool === BASH_TOOL && typeof args?.command === 'string') {
      yield* RtkService.validateCommand(args.command)
      return
    }

    if (
      (EDIT_WRITE_TOOLS as readonly string[]).includes(tool) &&
      typeof args?.filePath === 'string'
    ) {
      yield* AgentFirstService.checkPath(args.filePath)
    }
  })

  const exit = await runtime.runPromiseExit(program)
  if (Exit.isFailure(exit)) {
    const failure = Cause.failureOption(exit.cause)
    if (Option.isSome(failure) && failure.value instanceof RtkBlockError) {
      throw new Error(failure.value.message)
    }
    console.error('tool.execute.before unexpected failure:', Cause.pretty(exit.cause))
  }
}
