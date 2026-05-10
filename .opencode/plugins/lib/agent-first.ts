import { BACKEND_SRC_RE, FRONTEND_SRC_RE } from './patterns'

const REPO_ROOT = process.cwd()

export function toRepoRelative(filePath: string): string {
  if (filePath.startsWith(REPO_ROOT + '/')) {
    return filePath.slice(REPO_ROOT.length + 1)
  }
  if (filePath.startsWith('/')) return filePath
  return filePath
}

export function buildAgentFirstBlockMessage(rel: string, side: 'backend' | 'frontend'): string {
  const developer = side === 'backend' ? 'backend-developer' : 'frontend-developer'
  const reviewer = side === 'backend' ? 'effect-reviewer' : 'frontend-reviewer'
  return `BLOCKED: main thread cannot Edit/Write to ${side}/src/**.\n\n  File: ${rel}\n  Fix: spawn the '${developer}' sub-agent via the Task tool. The sub-agent\n       follows the gateway-${side} skill and will be reviewed by ${reviewer}.\n\nThis rule comes from .claude/hooks/agent-first-enforcement.sh (per ADR_AI_ORCHESTRATION).`
}

export function getSideFromPath(rel: string): 'backend' | 'frontend' | null {
  if (BACKEND_SRC_RE.test(rel)) return 'backend'
  if (FRONTEND_SRC_RE.test(rel)) return 'frontend'
  return null
}
