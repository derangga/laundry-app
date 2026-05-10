import { Effect } from 'effect'
import { BASH_TOOL, EDIT_WRITE_TOOLS } from '../lib/patterns'
import { RtkService } from '../lib/rtk'
import { AgentFirstService } from '../lib/agent-first'
import { RtkBlockError, AgentFirstBlockError } from '../lib/errors'

interface ToolBeforeInput {
  tool: string
  sessionID: string
  callID: string
}

interface ToolBeforeOutput {
  args: Record<string, unknown>
}

export const handleToolBefore = async (
  input: ToolBeforeInput,
  output: ToolBeforeOutput
): Promise<void> => {
  const program = Effect.gen(function* () {
    const rtk = yield* RtkService
    const agentFirst = yield* AgentFirstService

    const { tool } = input
    const args = output.args

    if (tool === BASH_TOOL && args?.command) {
      const command = String(args.command)
      yield* rtk.validateCommand(command)
      return
    }

    if ((EDIT_WRITE_TOOLS as readonly string[]).includes(tool) && args?.filePath) {
      const rel = agentFirst.toRepoRelative(String(args.filePath))
      yield* agentFirst.checkPath(rel)
    }
  }).pipe(Effect.provide(RtkService.Default), Effect.provide(AgentFirstService.Default))

  try {
    await Effect.runPromise(program)
  } catch (e) {
    if (e instanceof RtkBlockError || e instanceof AgentFirstBlockError) {
      throw new Error(e.message)
    }
    throw e
  }
}
