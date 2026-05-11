import { Effect } from 'effect'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { RepoRoot } from './repo-root'
import { FeedbackStateReadError, FeedbackStateWriteError } from './errors'

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
      const repoRoot = yield* RepoRoot
      const stateFile = join(repoRoot, '.data', 'feedback-loop.json')
      const stateDir = join(repoRoot, '.data')

      const toRepoRelative = (filePath: string): string => {
        if (filePath.startsWith(repoRoot + '/')) {
          return filePath.slice(repoRoot.length + 1)
        }
        return filePath
      }

      const readFeedbackState = Effect.try({
        try: (): FeedbackState | null => {
          if (!existsSync(stateFile)) return null
          const content = readFileSync(stateFile, 'utf-8')
          return JSON.parse(content) as FeedbackState
        },
        catch: (cause) => new FeedbackStateReadError({ path: stateFile, message: String(cause) }),
      })

      const writeFeedbackState = (state: FeedbackState) =>
        Effect.try({
          try: () => {
            mkdirSync(stateDir, { recursive: true })
            writeFileSync(stateFile, JSON.stringify(state, null, 2))
          },
          catch: (cause) =>
            new FeedbackStateWriteError({ path: stateFile, message: String(cause) }),
        })

      const setDirtyBit = Effect.fn('FeedbackStateService.setDirtyBit')(function* (
        domains: readonly string[]
      ) {
        // PostToolUse must fail-open: tolerate missing/corrupt state and write failures.
        const current = yield* readFeedbackState.pipe(
          Effect.catchTag('FeedbackStateReadError', (err) =>
            Effect.logWarning(`feedback-state read failed: ${err.message}`).pipe(
              Effect.as(null as FeedbackState | null)
            )
          )
        )
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
        yield* writeFeedbackState(next).pipe(
          Effect.catchTag('FeedbackStateWriteError', (err) =>
            Effect.logWarning(`feedback-state write failed: ${err.message}`)
          )
        )
      })

      return { toRepoRelative, readFeedbackState, writeFeedbackState, setDirtyBit }
    }),
  }
) {}
