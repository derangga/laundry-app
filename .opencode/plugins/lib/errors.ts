import { Schema } from 'effect'

export class RtkBlockError extends Schema.TaggedError<RtkBlockError>()('RtkBlockError', {
  command: Schema.String,
  message: Schema.String,
}) {}

export class AgentFirstBlockError extends Schema.TaggedError<AgentFirstBlockError>()(
  'AgentFirstBlockError',
  {
    path: Schema.String,
    side: Schema.Union(Schema.Literal('backend'), Schema.Literal('frontend')),
    message: Schema.String,
  }
) {}

export class FeedbackStateReadError extends Schema.TaggedError<FeedbackStateReadError>()(
  'FeedbackStateReadError',
  { path: Schema.String, message: Schema.String }
) {}

export class FeedbackStateWriteError extends Schema.TaggedError<FeedbackStateWriteError>()(
  'FeedbackStateWriteError',
  { path: Schema.String, message: Schema.String }
) {}

export class ShowToastError extends Schema.TaggedError<ShowToastError>()('ShowToastError', {
  message: Schema.String,
}) {}
