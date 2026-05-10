---
name: orchestrate
description: 16-phase deterministic workflow. Auto-invoke for any non-trivial coding task that will result in file changes. Triage classifies the task (TRIVIAL/SMALL/MEDIUM/LARGE) and skips phases for trivial fixes. Do NOT invoke for read-only questions, code explanations, search-only tasks, or pure conversations.
version: 1.0.0
---

# 16-Phase Orchestration Protocol

This skill governs how work moves from request to completion. The orchestrator (main thread) executes phases in order; sub-agents are spawned for delegated work.

See `docs/adrs/ADR_AI_ORCHESTRATION.md` for design rationale.

## When to invoke

**YES** — any prompt that will result in code changes:

- New features, bug fixes, refactors, schema changes, migrations.
- Multi-file or multi-domain changes.
- Anything touching `backend/src/**`, `frontend/src/**`, or `packages/shared/**`.

**NO** — do not invoke for:

- Read-only questions ("how does X work?", "explain this function").
- Documentation-only edits.
- Search and exploration tasks.
- Conversations about design that have not yet committed to a change.

When in doubt, run Phase 1 + Phase 2 (Triage) only — the cost is small and the classifier may correctly identify the task as not requiring orchestration.

## Phase table

| #   | Phase                 | Purpose                                                                                                    |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Setup                 | Read manifest, identify branch, load context                                                               |
| 2   | Triage                | Classify task type and size; pick phase set                                                                |
| 3   | Discovery             | Find relevant files, patterns, conventions; **run `gitnexus_impact` for any symbol about to be modified**  |
| 4   | Skill Discovery       | Invoke the right gateway; load Tier-1 skills it returns                                                    |
| 5   | Complexity            | Estimate scope, identify risks and unknowns                                                                |
| 6   | Brainstorming         | Generate 2–3 approach options; pick best with `AskUserQuestion` if material                                |
| 7   | Architecture          | Design component structure, data flow, interfaces                                                          |
| 8   | Implementation        | Spawn the domain developer agent; write the code                                                           |
| 9   | Design Verification   | Confirm the implementation matches the architecture from Phase 7                                           |
| 10  | Domain Compliance     | Verify CLAUDE.md rules: no `SELECT *`, snake_case, error class placement, Effect patterns                  |
| 11  | Code Quality          | Maintainability review; for MEDIUM+ run `/simplify` on the diff                                            |
| 12  | Test Planning         | Identify what to test, edge cases, integration points                                                      |
| 13  | Testing               | Write and run tests via the developer agent                                                                |
| 14  | Coverage Verification | Confirm critical paths are covered                                                                         |
| 15  | Test Quality          | Validate assertions are meaningful; no false positives                                                     |
| 16  | Completion            | **Run `gitnexus_detect_changes`**; verify reviewer PASS for all dirty domains; record final manifest entry |

## Skip rules (adapted from the Praetorian article §4.3)

Phase 2 classifies the task and selects the phase subset. Apply strictly.

| Class       | Criteria                                       | Phases run          |
| ----------- | ---------------------------------------------- | ------------------- |
| **TRIVIAL** | Single-line fix, typo, config tweak            | 1, 8, 16 only       |
| **SMALL**   | <100 lines, single domain, well-understood     | Skip 5, 6, 7, 9, 11 |
| **MEDIUM**  | Multi-file, single or dual domain, some design | Skip 5 only         |
| **LARGE**   | New subsystem, cross-domain, architectural     | Run all 16          |

## Manifest discipline

State lives at `.data/manifest.yaml`. Schema in `.data/SCHEMA.md`.

- **The orchestrator MUST NOT edit `.data/manifest.yaml` directly.** All mutations go through the `manifest-writer` agent. Spawn it at every phase transition with a JSON patch describing the change.
- **Fresh manifest per top-level prompt.** Phase 1 starts by spawning `manifest-writer` with an initialization patch (overwriting any prior state) unless the user has explicitly requested resumption (out of scope for v1; treat all prompts as fresh).
- After Phase N completes, spawn `manifest-writer` with at minimum `{"current_phase": N+1, "completed_phases_add": [N]}` plus any findings/decisions/dirty_files generated in Phase N.

## Domain routing (Phase 4 + Phase 8)

Decide the domain from the task's nature, not the file path:

- **Backend domain** — task primarily modifies `backend/src/**`, or modifies `packages/shared/**` for a backend feature. Invoke `gateway-backend` skill. In Phase 8, spawn `backend-developer` agent.
- **Frontend domain** — task primarily modifies `frontend/src/**`, or modifies `packages/shared/**` for a frontend feature. Invoke `gateway-frontend` skill. In Phase 8, spawn `frontend-developer` agent.
- **Cross-domain** — both gateways apply. Invoke them in sequence; spawn each developer agent in Phase 8 in dependency order (usually backend first when there is an API contract). Note: edits to `packages/shared/**` automatically dirty BOTH domains, so both reviewers and both test suites will run regardless of which agent did the edit.

Pass the developer agent only the context it needs:

- The architecture decisions from Phase 7.
- The exact list of files in scope.
- The invariants from the gateway.

Do NOT pass the full manifest or session history.

## Reviewer protocol

After Phase 8 implementation, for each dirty domain:

| Domain     | Reviewer agent      | Verdict written to                       |
| ---------- | ------------------- | ---------------------------------------- |
| `backend`  | `effect-reviewer`   | `domain_status.backend.reviewer_status`  |
| `frontend` | `frontend-reviewer` | `domain_status.frontend.reviewer_status` |

1. Spawn the matching reviewer agent. Reviewer reads the diff, checks against invariants, returns `VERDICT: PASS | FAIL | SKIP`.
2. Reviewer self-writes its verdict (and `reviewer_notes`) to `.data/feedback-loop.json`.
3. On `VERDICT: FAIL`: collect issues, return to Phase 8 with the issue list as additional context, re-spawn the matching `*-developer` for fixes. Re-spawn the reviewer afterward. **Maximum 3 retries per domain.** On the 3rd consecutive FAIL, escalate to the user via `AskUserQuestion`.
4. On `VERDICT: PASS`: proceed to Phase 9 (or skip per the SMALL rule).

For cross-domain tasks: spawn reviewers serially (backend first if there's an API contract). Each reviewer writes only its own domain's status; they do not interact.

The Stop hook (`feedback-loop-stop.sh`) is the safety net — it refuses to end the session if any dirty domain is not `PASS`. Treat the reviewer protocol as the primary gate; the hook only catches lapses.

## Exit protocol (Phase 16)

Before declaring the task complete, the orchestrator MUST verify:

1. `gitnexus_detect_changes()` confirms the modified scope matches the task.
2. `.data/feedback-loop.json` shows `reviewer_status: PASS` for every domain whose dirty bit is `true`.
3. `manifest-writer` has been spawned with the final patch (`current_phase: 16`, `completed_phases_add: [<previous>]`, any final findings).

If any check fails, do NOT end the turn. The Stop hook will block exit anyway, but the orchestrator should detect and remediate proactively rather than relying on the hook.

## Anti-patterns

- **Orchestrator writing source code.** Forbidden by `agent-first-enforcement.sh`. Always delegate via the developer agent.
- **Orchestrator writing the manifest.** Always go through `manifest-writer`.
- **Skipping phases not authorized by the skip rules.** If you find yourself skipping Phase 10 on a MEDIUM task because "it looked clean," you are recreating the drift this skill exists to prevent.
- **Marking complete without reviewer PASS.** The hook will block you, but more importantly it is a process violation.
- **Spawning developer and reviewer in parallel.** They must run sequentially: developer writes, then exits, then reviewer reads the resulting diff in fresh context.
- **Reading or relaying the developer agent's full output.** Take only the structured exit summary; ignore prose.

## Notes

- Pre-commit hooks handle formatting; never run formatters manually.
- If a phase produces no actionable output, record `findings_add: ["<phase> N/A: <one-line reason>"]` and move on.
- When a phase requires user input (Brainstorming, Architecture, Triage clarification), use `AskUserQuestion`. Never ask via plain text.
- For MEDIUM and LARGE tasks, run `/simplify` during Phase 11. Fix any issues raised before Phase 12.
