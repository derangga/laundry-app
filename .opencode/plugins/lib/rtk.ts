import { Effect } from 'effect'
import { RtkBlockError } from './errors'

const RTK_PREFIX_RE = /^rtk\s/

const SHELL_BUILTINS = [
  'cd',
  'export',
  'source',
  '.',
  'set',
  'unset',
  'true',
  'false',
  'test',
  '[',
  'eval',
  'exec',
  'trap',
  'return',
  'exit',
  'shift',
  'wait',
  'read',
  'declare',
  'local',
  'readonly',
  'typeset',
  'let',
  'pushd',
  'popd',
  'dirs',
  'shopt',
  'ulimit',
  'umask',
  'hash',
  'type',
  'builtin',
  'command',
  'enable',
  'help',
  'times',
  'alias',
  'unalias',
  'bind',
  'complete',
  'compgen',
  'compopt',
  'fc',
  'history',
  'jobs',
  'bg',
  'fg',
  'disown',
  'kill',
  'suspend',
  'coproc',
  'select',
  'if',
  'then',
  'else',
  'elif',
  'fi',
  'case',
  'for',
  'do',
  'while',
  'until',
  'break',
  'continue',
  'function',
  'mkdir',
  'chmod',
  'cp',
  'mv',
  'rm',
  'touch',
  'cat',
  'wc',
  'tee',
  'printf',
  'echo',
] as const

export class RtkService extends Effect.Service<RtkService>()('RtkService', {
  accessors: true,
  effect: Effect.gen(function* () {
    const isRtkPrefixed = (command: string): boolean => RTK_PREFIX_RE.test(command)

    const isShellBuiltin = (command: string): boolean => {
      const trimmed = command.trimStart()
      const firstWord = trimmed.split(/\s+/)[0]
      return SHELL_BUILTINS.includes(firstWord as (typeof SHELL_BUILTINS)[number])
    }

    const isVariableAssignment = (command: string): boolean =>
      /^[A-Za-z_][A-Za-z0-9_]*=/.test(command)

    const validateCommand = Effect.fn('RtkService.validateCommand')(function* (command: string) {
      if (isRtkPrefixed(command)) return
      if (isShellBuiltin(command)) return
      if (isVariableAssignment(command)) return
      return yield* new RtkBlockError({ command, message: buildBlockMessage(command) })
    })

    return { isRtkPrefixed, isShellBuiltin, isVariableAssignment, validateCommand }
  }),
}) {}

function buildBlockMessage(command: string): string {
  return `BLOCKED: Command must be prefixed with 'rtk'.\n\n  Your command: ${command}\n  Fix: rtk ${command}\n\nrtk compresses output for 60-90% token savings. It passes through unchanged if no filter exists.\nEven in chains: rtk git add && rtk git commit`
}
