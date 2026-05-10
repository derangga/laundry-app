import { Layer } from 'effect'
import { RtkServiceLive } from './rtk'
import { AgentFirstServiceLive } from './agent-first'
import { FeedbackStateServiceLive } from './dirty-bit'

export const HooksLive = Layer.mergeAll(
  RtkServiceLive,
  AgentFirstServiceLive,
  FeedbackStateServiceLive
)
