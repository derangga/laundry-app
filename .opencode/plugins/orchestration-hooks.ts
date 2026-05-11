import { ManagedRuntime } from 'effect'
import type { Plugin } from '@opencode-ai/plugin'
import { makeHooksLive } from './lib/shared'
import { handleToolBefore } from './hooks/tool-before'
import { handleToolAfter } from './hooks/tool-after'
import { handleSessionEvent } from './hooks/session-event'

export const OrchestrationHooks: Plugin = async ({ client, directory }) => {
  const runtime = ManagedRuntime.make(makeHooksLive(directory))

  return {
    'tool.execute.before': (input, output) => handleToolBefore(runtime, input, output),
    'tool.execute.after': (input) => handleToolAfter(runtime, input),
    event: (input) => handleSessionEvent(runtime, client, input),
  }
}

export default OrchestrationHooks
