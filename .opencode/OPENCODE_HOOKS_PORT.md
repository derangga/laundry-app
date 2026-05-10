# OpenCode Hooks Port — Limitations & Notes

This document describes the port of Claude Code orchestration hooks to OpenCode's plugin system, including gaps that cannot be bridged due to missing OpenCode events.

## Hooks Status

| Claude Code Hook                                       | OpenCode Equivalent     | Status                                       |
| ------------------------------------------------------ | ----------------------- | -------------------------------------------- |
| `PreToolUse:Bash` → `require-rtk.sh`                   | `tool.execute.before`   | ✅ Full parity                               |
| `PreToolUse:Edit/Write` → `agent-first-enforcement.sh` | `tool.execute.before`   | ✅ Full parity                               |
| `PostToolUse:Edit/Write` → `post-edit-dirty-bit.sh`    | `tool.execute.after`    | ✅ Full parity                               |
| `PreToolUse:mcp__serena__*` → auto-approve             | N/A                     | ❌ Cannot detect MCP tool names in hook      |
| `SessionStart` → `serena-hooks activate`               | `session.created` event | ✅ Partial (no serena integration)           |
| `SubagentStop` → `developer-tests-pass.sh`             | N/A                     | ❌ No sub-agent lifecycle events in OpenCode |
| `Stop` → `feedback-loop-stop.sh`                       | N/A                     | ❌ No session-end/stop event in OpenCode     |

## What Works

### tool.execute.before — require-rtk hook

All Bash commands must be prefixed with `rtk`. Shell builtins and variable assignments are exempted. This is functionally identical to the Claude Code version.

```typescript
if (tool === 'Bash' && args?.command) {
  if (!RTK_PREFIX_RE.test(command) && !isShellBuiltin(command) && !isVariableAssignment(command)) {
    output.abort = "BLOCKED: Command must be prefixed with 'rtk'..."
  }
}
```

### tool.execute.before — agent-first-enforcement hook

Main thread Edit/Write to `backend/src/**` or `frontend/src/**` is blocked. Sub-agents (spawned via Task tool) bypass this check. Identical behavior to Claude Code version.

```typescript
if (EDIT_WRITE_TOOLS.includes(tool) && args?.filePath) {
  const rel = toRepoRelative(filePath)
  if (BACKEND_SRC_RE.test(rel) || FRONTEND_SRC_RE.test(rel)) {
    output.abort = 'BLOCKED: main thread cannot Edit/Write...'
  }
}
```

### tool.execute.after — post-edit-dirty-bit hook

After Edit/Write to routed paths, sets dirty bits in `.data/feedback-loop.json`:

- `backend/src/**` → `dirty_domains.backend = true`
- `frontend/src/**` → `dirty_domains.frontend = true`
- `packages/shared/**` → marks both dirty (consumed by both sides)

```typescript
if (EDIT_WRITE_TOOLS.includes(tool)) {
  const rel = toRepoRelative(filePath)
  if (BACKEND_SRC_RE.test(rel)) domains.push('backend')
  else if (FRONTEND_SRC_RE.test(rel)) domains.push('frontend')
  else if (SHARED_RE.test(rel)) domains.push('backend', 'frontend')
  setDirtyBit(domains)
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

## Files

```
.opencode/
  plugins/
    orchestration-hooks.ts    # Main plugin implementing available hooks
  OPENCODE_HOOKS_PORT.md      # This documentation
  package.json                # (empty, no external deps needed currently)
```

## OpenCode Plugin Resources

- [Plugin Documentation](https://opencode.ai/docs/plugins)
- [SDK Reference](https://opencode.ai/docs/sdk)
- [Config Schema](https://opencode.ai/config.json)
- [Plugin Package](https://www.npmjs.com/package/@opencode-ai/plugin)
