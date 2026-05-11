import type { Plugin } from '@opencode-ai/plugin'
import { handleToolBefore } from './hooks/tool-before'
import { handleToolAfter } from './hooks/tool-after'
import { handleSessionEvent } from './hooks/session-event'

export const OrchestrationHooks: Plugin = async ({ project, client, $, directory, worktree }) => {
  return {
    'tool.execute.before': async (input, output) => {
      await handleToolBefore(input, output)
    },

    'tool.execute.after': async (input, _output) => {
      await handleToolAfter(input)
    },

    event: async (input) => {
      await handleSessionEvent(input, client)
    },
  }
}

export default OrchestrationHooks
