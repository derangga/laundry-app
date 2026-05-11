import { Effect, Option } from 'effect'
import { BACKEND_SRC_RE, FRONTEND_SRC_RE } from './patterns'
import { RepoRoot } from './repo-root'
// AgentFirstBlockError is intentionally not used here: OpenCode's tool.execute.before
// has no caller identity (sessionID/callID only), so hard-blocking would deadlock
// subagent edits. We log a warning instead — see OPENCODE_HOOKS_PORT.md.

export class AgentFirstService extends Effect.Service<AgentFirstService>()('AgentFirstService', {
  accessors: true,
  effect: Effect.gen(function* () {
    const repoRoot = yield* RepoRoot

    const toRepoRelative = (filePath: string): string => {
      if (filePath.startsWith(repoRoot + '/')) {
        return filePath.slice(repoRoot.length + 1)
      }
      return filePath
    }

    const getSideFromPath = (rel: string): Option.Option<'backend' | 'frontend'> => {
      if (BACKEND_SRC_RE.test(rel)) return Option.some('backend')
      if (FRONTEND_SRC_RE.test(rel)) return Option.some('frontend')
      return Option.none()
    }

    const checkPath = Effect.fn('AgentFirstService.checkPath')(function* (filePath: string) {
      const rel = toRepoRelative(filePath)
      const sideOpt = getSideFromPath(rel)
      yield* Option.match(sideOpt, {
        onNone: () => Effect.void,
        onSome: (side) => Effect.logWarning(buildWarnMessage(rel, side)),
      })
    })

    return { toRepoRelative, getSideFromPath, checkPath }
  }),
}) {}

function buildWarnMessage(rel: string, side: 'backend' | 'frontend'): string {
  const developer = side === 'backend' ? 'backend-developer' : 'frontend-developer'
  const reviewer = side === 'backend' ? 'effect-reviewer' : 'frontend-reviewer'
  return `BLOCKED: main thread cannot Edit/Write to ${side}/src/**.\n\n  File: ${rel}\n  Fix: spawn the '${developer}' sub-agent via the Task tool. The sub-agent\n       follows the gateway-${side} skill and will be reviewed by ${reviewer}.\nNote: OpenCode cannot distinguish main thread vs sub-agent — this is a warning only.`
}
