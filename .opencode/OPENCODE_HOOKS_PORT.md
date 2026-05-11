# OpenCode Hooks Port — Limitations & Notes

This document describes the port of Claude Code orchestration hooks to OpenCode's plugin system, including gaps that cannot be bridged due to missing OpenCode events.

## Hooks Status

| Claude Code Hook                                       | OpenCode Equivalent     | Status                                       |
| ------------------------------------------------------ | ----------------------- | -------------------------------------------- |
| `PreToolUse:Bash` → `require-rtk.sh`                   | `tool.execute.before`   | ✅ Full parity                               |
| `PreToolUse:Edit/Write` → `agent-first-enforcement.sh` | `tool.execute.before`   | ⚠️ Warn-only (no caller identity in hook)    |
| `PostToolUse:Edit/Write` → `post-edit-dirty-bit.sh`    | `tool.execute.after`    | ✅ Full parity                               |
| `PreToolUse:mcp__serena__*` → auto-approve             | N/A                     | ❌ Cannot detect MCP tool names in hook      |
| `PreToolUse:*` → serena-hooks remind                   | N/A                     | ❌ No generic catch-all matcher              |
| `SessionStart` → `serena-hooks activate`               | `session.created` event | ✅ Partial (no serena integration)           |
| `SubagentStop` → `developer-tests-pass.sh`             | N/A                     | ❌ No sub-agent lifecycle events in OpenCode |
| `Stop` → `feedback-loop-stop.sh`                       | N/A                     | ❌ No session-end/stop event in OpenCode     |

## What Works

### tool.execute.before — require-rtk hook

All Bash commands must be prefixed with `rtk`. Shell builtins and variable assignments are exempted. This is functionally identical to the Claude Code version.

```typescript
if (tool === 'bash' && typeof args?.command === 'string') {
  if (
    !RTK_PREFIX_RE.test(args.command) &&
    !isShellBuiltin(args.command) &&
    !isVariableAssignment(args.command)
  ) {
    throw new Error("BLOCKED: Command must be prefixed with 'rtk'...")
  }
}
```

> Note: OpenCode's built-in tool IDs are lowercase (`bash`, `edit`, `write`) — not the PascalCase Claude Code uses. Blocking is via `throw new Error(...)`, not `output.abort` (that field does not exist in `@opencode-ai/plugin`'s `Hooks` interface).

### tool.execute.before — agent-first-enforcement hook (warn-only)

Edit/Write to `backend/src/**` or `frontend/src/**` logs a warning. **The edit is NOT blocked**: OpenCode's `tool.execute.before` input has no caller identity (`{ tool, sessionID, callID }` only), so we cannot distinguish main-thread from sub-agent calls. Hard-blocking would deadlock the orchestration loop because sub-agents would be blocked too. Until OpenCode adds a caller-identity field, this rule degrades to a warning.

```typescript
if ((EDIT_WRITE_TOOLS as readonly string[]).includes(tool) && typeof args?.filePath === 'string') {
  const rel = toRepoRelative(args.filePath)
  if (BACKEND_SRC_RE.test(rel) || FRONTEND_SRC_RE.test(rel)) {
    yield * Effect.logWarning('BLOCKED: main thread cannot Edit/Write...')
  }
}
```

### tool.execute.after — post-edit-dirty-bit hook

After Edit/Write to routed paths, sets dirty bits in `.data/feedback-loop.json`:

- `backend/src/**` → `dirty_domains.backend = true`
- `frontend/src/**` → `dirty_domains.frontend = true`
- `packages/shared/**` → marks both dirty (consumed by both sides)

```typescript
if ((EDIT_WRITE_TOOLS as readonly string[]).includes(tool)) {
  const rel = yield * FeedbackStateService.toRepoRelative(filePath)
  if (BACKEND_SRC_RE.test(rel)) domains.push('backend')
  else if (FRONTEND_SRC_RE.test(rel)) domains.push('frontend')
  else if (SHARED_RE.test(rel)) domains.push('backend', 'frontend')
  yield * FeedbackStateService.setDirtyBit(domains)
}
```

### session.created — activation notice

When a session is created, a toast notification is shown confirming hooks are loaded. The serena-specific activation (`serena-hooks activate --client=claude-code`) is not applicable in OpenCode context.

## What Doesn't Work

### PreToolUse:mcp**serena**\* → auto-approve

Claude Code's hook matcher `mcp__serena__*` intercepts all Serena MCP tool calls and auto-approves them. In OpenCode's `tool.execute.before`, the `input.tool` property is the tool category name (e.g., `"Bash"`, `"Read"`, `"Edit"`), not the full MCP-qualified tool name. There is no way to inspect the underlying MCP server or tool name from within the hook.

**Impact:** MCP tool calls to Serena still require manual permission approval in OpenCode.

**Workaround:** None available with current OpenCode plugin API.

### SubagentStop → developer-tests-pass.sh

Claude Code fires `SubagentStop` when any sub-agent completes. The `developer-tests-pass.sh` hook runs typecheck + tests for each dirty domain and blocks the sub-agent's exit if they fail.

OpenCode has **no sub-agent lifecycle events**. The available session events are:

- `session.created` — fires on session creation
- `session.updated` — fires on session updates
- `session.idle` — fires when session becomes idle
- `session.compacted` — fires after compaction
- `session.error` — fires on session errors
- `session.deleted` — fires when session is deleted

None of these specifically indicate that a sub-agent (Task tool sub-session) has completed. `session.idle` is too broad — it fires on any idle state, not just sub-agent completion.

**Impact:** The deterministic test-enforcement loop (developer-tests-pass.sh) cannot be implemented in OpenCode.

**Workaround:** Consider running typecheck/tests manually after sub-agent completion, or wait for OpenCode to add sub-agent lifecycle events.

### Stop → feedback-loop-stop.sh

Claude Code's `Stop` hook fires when the user ends the session. The `feedback-loop-stop.sh` hook blocks session end until every dirty domain has both `reviewer_status = PASS` AND `tests_status = PASS`.

OpenCode has **no session-end or session-stop event**. The closest is `session.idle`, but it fires on idle (e.g., after the AI finishes thinking), not when the user explicitly ends or stops the session.

**Impact:** Cannot enforce the feedback loop gate at session end. Dirty domains may be left unreviewed.

**Workaround:** Consider implementing a manual review gate before ending sessions, or wait for OpenCode to add a session-end event.

## Out of Scope (Cannot Be Bridged)

These Claude Code hooks have no OpenCode equivalent and are not implemented:

- `PreToolUse:mcp__serena__*` auto-approve — OpenCode's `tool.execute.before` input does not carry the MCP server / tool name.
- `PreToolUse:*` (generic catch-all, used for `serena-hooks remind`) — no equivalent generic matcher.
- `SubagentStop` (used for `developer-tests-pass.sh`) — OpenCode has no sub-agent lifecycle events.
- `Stop` (used for `feedback-loop-stop.sh` and serena cleanup) — OpenCode has no session-end event.
- Sub-agent bypass in `agent-first-enforcement` — OpenCode's hook input has no caller identity, so we cannot tell main thread from sub-agent. The rule degrades to a warning (see above).

The Claude Code variants of these (`.claude/hooks/*.sh`, `.claude/project-settings.json`) remain authoritative when running under Claude Code.

## Files

```
.opencode/
  plugins/
    orchestration-hooks.ts    # Plugin entry — builds ManagedRuntime, registers hooks
    hooks/
      tool-before.ts          # RTK + agent-first (warn-only)
      tool-after.ts           # dirty-bit
      session-event.ts        # session.created toast
    lib/
      rtk.ts                  # RtkService (bash command validation)
      agent-first.ts          # AgentFirstService (warn-only path check)
      dirty-bit.ts            # FeedbackStateService (.data/feedback-loop.json)
      repo-root.ts            # RepoRoot tag (injected from PluginInput.directory)
      errors.ts               # Schema.TaggedError types
      patterns.ts             # path regexes + tool name constants
      shared.ts               # makeHooksLive(repoRoot) layer factory
  OPENCODE_HOOKS_PORT.md      # This documentation
  package.json                # Plugin workspace package (effect + @opencode-ai/plugin)
```

## OpenCode Plugin Resources

- [Plugin Documentation](https://opencode.ai/docs/plugins)
- [SDK Reference](https://opencode.ai/docs/sdk)
- [Config Schema](https://opencode.ai/config.json)
- [Plugin Package](https://www.npmjs.com/package/@opencode-ai/plugin)
