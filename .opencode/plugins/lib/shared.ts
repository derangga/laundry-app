import { Layer } from 'effect'
import { RtkService } from './rtk'
import { AgentFirstService } from './agent-first'
import { FeedbackStateService } from './dirty-bit'
import { RepoRootLive } from './repo-root'

export const makeHooksLive = (repoRoot: string) =>
  Layer.mergeAll(RtkService.Default, AgentFirstService.Default, FeedbackStateService.Default).pipe(
    Layer.provide(RepoRootLive(repoRoot))
  )
