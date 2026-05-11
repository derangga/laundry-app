import { Context, Layer } from 'effect'

export class RepoRoot extends Context.Tag('RepoRoot')<RepoRoot, string>() {}

export const RepoRootLive = (root: string): Layer.Layer<RepoRoot> => Layer.succeed(RepoRoot, root)
