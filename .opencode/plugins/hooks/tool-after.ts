import { EDIT_WRITE_TOOLS, SHARED_RE } from '../lib/patterns'
import { toRepoRelative } from '../lib/agent-first'
import { setDirtyBit } from '../lib/dirty-bit'

interface ToolAfterInput {
  tool: string
  sessionID: string
  callID: string
  args: Record<string, unknown>
}

export function handleToolAfter(input: ToolAfterInput): void {
  if (!(EDIT_WRITE_TOOLS as readonly string[]).includes(input.tool)) return

  const filePath = input.args?.filePath
  if (!filePath || typeof filePath !== 'string') return

  const rel = toRepoRelative(filePath)
  const domains: string[] = []

  if (rel.startsWith('backend/src/')) {
    domains.push('backend')
  } else if (rel.startsWith('frontend/src/')) {
    domains.push('frontend')
  } else if (SHARED_RE.test(rel)) {
    domains.push('backend', 'frontend')
  } else {
    return
  }

  setDirtyBit(domains)
}
