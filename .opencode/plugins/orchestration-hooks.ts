import { handleToolBefore } from './hooks/tool-before'
import { handleToolAfter } from './hooks/tool-after'
import { handleSessionEvent } from './hooks/session-event'

interface ToolBeforeInput {
  tool: string
  sessionID: string
  callID: string
}

interface ToolBeforeOutput {
  args: Record<string, unknown>
}

interface ToolAfterInput {
  tool: string
  sessionID: string
  callID: string
  args: Record<string, unknown>
}

interface ToolAfterOutput {
  title: string
  output: string
  metadata: unknown
}

interface SessionEventInput {
  event: { type: string }
}

interface PluginInput {
  client: {
    tui: {
      showToast(args: {
        body: { message: string; variant: string; duration: number }
      }): Promise<boolean>
    }
  }
  project: unknown
  directory: string
  worktree: string
  experimental_workspace: unknown
  serverUrl: URL
  $: unknown
}

export const OrchestrationHooks = async (_input: PluginInput) => {
  return {
    'tool.execute.before': async (input: ToolBeforeInput, output: ToolBeforeOutput) => {
      handleToolBefore(input, output)
    },

    'tool.execute.after': async (input: ToolAfterInput, _output: ToolAfterOutput) => {
      handleToolAfter(input)
    },

    event: async (input: SessionEventInput) => {
      handleSessionEvent(input)
    },
  }
}

export default OrchestrationHooks
