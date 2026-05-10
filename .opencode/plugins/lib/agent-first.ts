import { Effect, Option } from 'effect'
import { BACKEND_SRC_RE, FRONTEND_SRC_RE } from './patterns'
import { AgentFirstBlockError } from './errors'

const REPO_ROOT = process.cwd()

export class AgentFirstService extends Effect.Service<AgentFirstService>()('AgentFirstService', {
  accessors: true,
  effect: Effect.gen(function* () {
    const toRepoRelative = (filePath: string): string => {
      if (filePath.startsWith(REPO_ROOT + '/')) {
        return filePath.slice(REPO_ROOT.length + 1)
      }
      if (filePath.startsWith('/')) return filePath
      return filePath
    }

    const getSideFromPath = (rel: string): Option.Option<'backend' | 'frontend'> => {
      if (BACKEND_SRC_RE.test(rel)) return Option.some('backend')
      if (FRONTEND_SRC_RE.test(rel)) return Option.some('frontend')
      return Option.none()
    }

    const checkPath = (filePath: string): Effect.Effect<void, AgentFirstBlockError> => {
      const rel = toRepoRelative(filePath)
      const sideOpt = getSideFromPath(rel)
      return Option.match(sideOpt, {
        onNone: () => Effect.void,
        onSome: (side) =>
          Effect.fail(
            new AgentFirstBlockError({
              path: rel,
              side,
              message: buildBlockMessage(rel, side),
            })
          ),
      })
    }

    return { toRepoRelative, getSideFromPath, checkPath }
  }),
}) {}

function buildBlockMessage(rel: string, side: 'backend' | 'frontend'): string {
  const developer = side === 'backend' ? 'backend-developer' : 'frontend-developer'
  const reviewer = side === 'backend' ? 'effect-reviewer' : 'frontend-reviewer'
  return `BLOCKED: main thread cannot Edit/Write to ${side}/src/**.\n\n  File: ${rel}\n  Fix: spawn the '${developer}' sub-agent via the Task tool. The sub-agent\n       follows the gateway-${side} skill and will be reviewed by ${reviewer}.\nThis rule comes from .claude/hooks/agent-first-enforcement.sh (per ADR_AI_ORCHESTRATION).`
}

export const AgentFirstServiceLive = AgentFirstService.Default
