import { Effect } from 'effect'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const REPO_ROOT = process.cwd()

export interface DomainStatus {
  reviewer_status: string
  reviewer_notes: string
  tests_status: string
  tests_notes: string
}

export interface FeedbackState {
  version: number
  dirty_domains: { backend: boolean; frontend: boolean }
  domain_status: {
    backend: DomainStatus
    frontend: DomainStatus
  }
}

const makeResetFeedbackState = (): FeedbackState => ({
  version: 1,
  dirty_domains: { backend: false, frontend: false },
  domain_status: {
    backend: {
      reviewer_status: 'PENDING',
      reviewer_notes: '',
      tests_status: 'PENDING',
      tests_notes: '',
    },
    frontend: {
      reviewer_status: 'PENDING',
      reviewer_notes: '',
      tests_status: 'PENDING',
      tests_notes: '',
    },
  },
})

export class FeedbackStateService extends Effect.Service<FeedbackStateService>()(
  'FeedbackStateService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const stateFile = join(REPO_ROOT, '.data', 'feedback-loop.json')

      const toRepoRelative = (filePath: string): string => {
        if (filePath.startsWith(REPO_ROOT + '/')) {
          return filePath.slice(REPO_ROOT.length + 1)
        }
        if (filePath.startsWith('/')) return filePath
        return filePath
      }

      const readEffect = Effect.acquireRelease(
        Effect.sync(() => {
          if (!existsSync(stateFile)) return null
          try {
            const content = readFileSync(stateFile, 'utf-8')
            return JSON.parse(content) as FeedbackState
          } catch {
            return null
          }
        }),
        () => Effect.void
      )

      const readFeedbackState = (): Effect.Effect<FeedbackState | null> => Effect.scoped(readEffect)

      const writeEffect = (state: FeedbackState): Effect.Effect<void> =>
        Effect.sync(() => {
          try {
            mkdirSync(join(REPO_ROOT, '.data'), { recursive: true })
            writeFileSync(stateFile, JSON.stringify(state, null, 2))
          } catch {
            // fail silently
          }
        })

      const writeFeedbackState = (state: FeedbackState): Effect.Effect<void> => writeEffect(state)

      const setDirtyBit = (domains: readonly string[]): Effect.Effect<void> =>
        Effect.gen(function* () {
          const current = yield* readFeedbackState()
          const state: FeedbackState = current ?? makeResetFeedbackState()
          const next: FeedbackState = {
            version: state.version,
            dirty_domains: { ...state.dirty_domains },
            domain_status: {
              backend: { ...state.domain_status.backend },
              frontend: { ...state.domain_status.frontend },
            },
          }
          for (const domain of domains) {
            if (domain === 'backend' || domain === 'frontend') {
              next.dirty_domains[domain] = true
              next.domain_status[domain].reviewer_status = 'PENDING'
              next.domain_status[domain].tests_status = 'PENDING'
            }
          }
          yield* writeFeedbackState(next)
        })

      return { toRepoRelative, readFeedbackState, writeFeedbackState, setDirtyBit }
    }),
  }
) {}

export const FeedbackStateServiceLive = FeedbackStateService.Default
