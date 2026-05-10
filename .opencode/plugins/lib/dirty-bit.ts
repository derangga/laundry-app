import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const REPO_ROOT = process.cwd()
const STATE_DIR = join(REPO_ROOT, '.data')
const STATE_FILE = join(STATE_DIR, 'feedback-loop.json')

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

export function readFeedbackState(): FeedbackState | null {
  try {
    if (!existsSync(STATE_FILE)) return null
    const content = readFileSync(STATE_FILE, 'utf-8')
    return JSON.parse(content) as FeedbackState
  } catch {
    return null
  }
}

export function writeFeedbackState(state: FeedbackState): void {
  try {
    mkdirSync(STATE_DIR, { recursive: true })
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  } catch {
    // fail silently
  }
}

export function resetFeedbackState(): FeedbackState {
  return {
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
  }
}

export function setDirtyBit(domains: string[]): void {
  let state = readFeedbackState()
  if (!state) {
    state = resetFeedbackState()
  }
  for (const domain of domains) {
    if (domain === 'backend' || domain === 'frontend') {
      state.dirty_domains[domain] = true
      state.domain_status[domain].reviewer_status = 'PENDING'
      state.domain_status[domain].tests_status = 'PENDING'
    }
  }
  writeFeedbackState(state)
}
