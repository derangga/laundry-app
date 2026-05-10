import { BASH_TOOL, EDIT_WRITE_TOOLS } from '../lib/patterns'
import {
  isRtkPrefixed,
  isShellBuiltin,
  isVariableAssignment,
  buildRtkBlockMessage,
} from '../lib/rtk'
import { toRepoRelative, buildAgentFirstBlockMessage } from '../lib/agent-first'

interface ToolBeforeInput {
  tool: string
  sessionID: string
  callID: string
}

interface ToolBeforeOutput {
  args: Record<string, unknown>
}

export function handleToolBefore(input: ToolBeforeInput, output: ToolBeforeOutput): void {
  const { tool } = input
  const args = output.args

  if (tool === BASH_TOOL && args?.command) {
    const command = String(args.command)
    if (isRtkPrefixed(command) || isShellBuiltin(command) || isVariableAssignment(command)) {
      return
    }
    throw new Error(buildRtkBlockMessage(command))
  }

  if ((EDIT_WRITE_TOOLS as readonly string[]).includes(tool) && args?.filePath) {
    const rel = toRepoRelative(String(args.filePath))
    if (rel.startsWith('backend/src/')) {
      throw new Error(buildAgentFirstBlockMessage(rel, 'backend'))
    }
    if (rel.startsWith('frontend/src/')) {
      throw new Error(buildAgentFirstBlockMessage(rel, 'frontend'))
    }
  }
}
