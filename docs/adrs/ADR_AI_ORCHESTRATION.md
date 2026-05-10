# AI Orchestration Architecture Decision Record

**Status**: Proposed
**Date**: 2026-05-10
**Authors**: Development Team
**Version**: 1.0

## Document Information

This ADR documents the architectural decisions for the AI development workflow used in this repository. The goal is **deterministic process consistency** when LLM agents (Claude Code and other tools) modify the codebase. It captures the rationale, alternatives considered, and consequences of each decision so future contributors and collaborator tools can extend the system without re-litigating settled choices.

The design is informed by:

- [Praetorian Development Platform](https://www.praetorian.com/blog/deterministic-ai-orchestration-a-platform-architecture-for-autonomous-development/) article (the enterprise-scale reference for this whole approach).

We deliberately under-scope relative to Praetorian: this is a solo-with-collaborator project, not a 39-agent platform. Praetorian's primitives (gateways, hooks, manifests, fresh-context reviewers) are adopted; its scale (16 phases run literally, 8-layer hook stack, escalation advisor, heterogeneous LLM routing) is not.

---

## 1. Executive Summary

### Problem

LLM agents drift on process even when they don't drift on code. CLAUDE.md rules ("use Serena", "run `gitnexus_impact`", "spawn `effect-reviewer`") are voluntary instructions the model can rationalize past, especially under context pressure. Across sessions, this produces inconsistent output: the same task done differently depending on which rules the model happened to weight.

This project is also developed jointly with a collaborator who uses a different LLM tool that reads skills from `.agents/`. Any orchestration that lives only in `.claude/` produces a fork — same codebase, different process.

### Goal

Make the development process **deterministic across LLMs and across sessions** by:

1. Encoding the workflow as shared skills (read by both tools)
2. Encoding enforcement as Claude-Code hooks (Claude's veneer, replaced by the collaborator's equivalent on their side)
3. Encoding workflow state as tool-agnostic files in `.data/`

We call this "deterministic drift": identical inputs (skills + state contract) drive different LLMs to convergent — not bit-identical — outputs. That convergence is the realistic ceiling for cross-tool consistency.

### Architecture at a Glance

```
.agents/skills/                # Shared (both tools read this)
  orchestrate/                 # 16-phase workflow protocol
  gateway-backend/             # Backend skill list + invariants
  gateway-frontend/            # Frontend skill list + invariants
  effect-best-practices/       # (existing)
  tanstack-*/                  # (existing)
  ...

.claude/                       # Claude Code-specific (mechanism, not knowledge)
  agents/
    backend-developer.md       # Thin wrapper → gateway-backend
    frontend-developer.md      # Thin wrapper → gateway-frontend
    effect-reviewer.md         # (existing) Backend reviewer
    frontend-reviewer.md       # New
    manifest-writer.md         # One-shot writer for .data/manifest.yaml
  hooks/
    require-rtk.sh             # (existing)
    agent-first-enforcement.sh # PreToolUse on Edit/Write
    post-edit-dirty-bit.sh     # PostToolUse on Edit/Write
    feedback-loop-stop.sh      # Stop hook gating session exit
  skills/                      # Symlinks to .agents/skills/
  settings.local.json

.data/                         # Tool-agnostic, gitignored
  manifest.yaml                # Persistent narrative state
  feedback-loop.json           # Ephemeral enforcement state
  SCHEMA.md                    # Committed contract for both files
```

### Key Architectural Choices

1. **Shared knowledge, tool-specific veneer.** Skills (knowledge, rules) in `.agents/`. Hooks and agents (Claude Code mechanisms) in `.claude/`. State in `.data/`.
2. **16-phase orchestration as a skill, not a platform.** Auto-invoked on every prompt; Triage classifies and skips phases for trivial work.
3. **Two domain gateways: backend + frontend.** Shared package edits are routed by the initiating side; no separate `shared` lane.
4. **Four agents: 2 developers + 2 reviewers.** Reviewers run in fresh context to prevent self-rationalization.
5. **Two enforcement hooks.** `agent-first-enforcement` (PreToolUse) blocks main-thread edits to source. `feedback-loop-stop` (Stop) blocks session exit until reviewers report PASS.
6. **Backend-first vertical slice rollout.** Build the entire loop on backend before extending to frontend.

---

## 2. Architectural Decisions

### Decision 1: Adopt the 16-Phase Orchestration as a Skill

#### Context

LLM workflows oscillate between two failure modes: (a) free-form prompts produce inconsistent process, (b) heavyweight agent platforms (Praetorian-scale) impose enterprise overhead unjustified by the project's size. We need a structured workflow that is consistent without being ceremonial.

#### Decision

Adopt the 16-phase protocol from the Praetorian article as a skill at `.agents/skills/orchestrate/SKILL.md`. The skill is **auto-invoked** on every prompt (its `description` makes it broadly applicable). Phase 2 (Triage) classifies the task and skips phases accordingly.

Phase set adopted from Praetorian §4.3 with two repo-specific sub-step additions:

- **Phase 3 (Discovery)** must run `gitnexus_impact` for any symbol the task targets (already mandated by CLAUDE.md).
- **Phase 16 (Completion)** must run `gitnexus_detect_changes` before declaring done (already mandated by CLAUDE.md).

These are not new phases — they are concrete actions inside existing phases, made explicit so the orchestrator does not omit them.

Skip rules — adapted from Praetorian §4.3, with one addition: a `TRIVIAL` class for typo-level fixes that runs only Phases 1/8/16. This avoids burning the full ceremony on single-line changes.

| Class   | Phases run          |
| ------- | ------------------- |
| TRIVIAL | 1, 8, 16            |
| SMALL   | skip 5, 6, 7, 9, 11 |
| MEDIUM  | skip 5 only         |
| LARGE   | all 16              |

#### Rationale

- **Auto-invoke vs slash-command-only.** Asymmetric risk: a false-positive (orchestrate fires on a typo fix) costs Triage + 3 phases; a false-negative (orchestrate doesn't fire on a feature) costs the full process drift this ADR exists to fix. Auto-invoke removes reliance on the user remembering a slash command — the same memory failure the workflow itself addresses.
- **Praetorian skip rules over re-litigation.** The skip-phase classification in Praetorian §4.3 is considered design backed by an actual production deployment. Re-deriving the breakdown from scratch would reinvent the same answers and waste the prior art.
- **Sub-step explicitness.** GitNexus rules in CLAUDE.md are mandatory but easy for the model to defer. Anchoring them inside specific phases makes them part of the process, not a checklist appended at the end.

#### Alternatives Considered

- **Slash-command-triggered (`/feature`).** Rejected: requires user memory; misses the failure mode this ADR fixes.
- **Hybrid auto-invoke + UserPromptSubmit regex hook.** Rejected: more moving parts (regex maintenance, override semantics) for marginal gain over plain auto-invoke. The skill description already acts as a soft regex.
- **Run all 16 phases regardless.** Rejected: TRIVIAL fixes would become unbearable. Triage must remain the escape valve.

#### Consequences

- The `orchestrate` skill becomes the entry point for all non-trivial work. Its quality directly bounds output quality.
- **Fresh manifest per top-level prompt.** Each prompt starts a new `.data/manifest.yaml` unless the user explicitly resumes via a `/resume` command (out of scope for v1). This prevents stale-manifest contamination between unrelated tasks.
- Orchestrator reads but does not write the manifest — see Decision 5.

---

### Decision 2: Two Domain Gateways — Backend and Frontend

#### Context

The project has three code domains: `backend/src/`, `frontend/src/`, and `packages/shared/`. Routing logic decides which Tier-1 skills load and which agent receives the work.

#### Decision

Create two gateway skills:

- `.agents/skills/gateway-backend/SKILL.md`
- `.agents/skills/gateway-frontend/SKILL.md`

Edits to `packages/shared/` are routed to whichever gateway initiated the change (a backend feature adding a new DTO uses `gateway-backend`; a frontend-only type uses `gateway-frontend`). No separate `shared` lane.

Gateway content stays minimal (~40-60 lines): when-to-use trigger, required skills list, repo invariants (e.g., "no `SELECT *`", "snake_case columns"), and required follow-up (which reviewer to spawn).

#### Rationale

- **Two domains have genuinely different skill stacks.** Backend: `effect-best-practices`, `observability-backend`. Frontend: `tanstack-router-best-practices`, `tanstack-query-best-practices`, `tanstack-start-best-practices`, `shadcn-ui`, `tailwind-design-system`. Routing maps cleanly.
- **`packages/shared/` doesn't earn a third lane.** It is small (7 schema files) and almost always changes _because_ a backend or frontend feature needs it. A standalone `shared-developer` would have nothing to do most of the time and would add a coordination hop.
- **Existing `effect-reviewer` already covers `packages/shared/`** for the cross-cutting concerns that matter (Schema design, branded IDs).

#### Alternatives Considered

- **Three gateways (backend + frontend + shared).** Rejected: third lane has no real workload at current repo size; adds coordination cost.
- **One gateway, role-based agents only.** Rejected: defeats the purpose — the consistency win comes precisely from loading the right Tier-1 skills per domain.

#### Consequences

- Adding a new domain (e.g., a CLI package, a worker process) means adding a new gateway. Acceptable scaling cost.
- Gateways are the **portable contract** consumed by both Claude Code and the collaborator's tool. Their format must remain tool-neutral.

---

### Decision 3: Agent Roster — Four Thin Agents

#### Context

The 16-phase template needs workers to delegate to. Praetorian's full 5-role × 2-domain pattern (10 agents) is overkill for a solo-plus-collaborator project; we collapse it to 1 developer + 1 reviewer per domain.

#### Decision

Four agents, all under `.claude/agents/`:

| Agent                | Role                                                    | Status   |
| -------------------- | ------------------------------------------------------- | -------- |
| `backend-developer`  | Implements backend changes; follows `gateway-backend`   | New      |
| `frontend-developer` | Implements frontend changes; follows `gateway-frontend` | New      |
| `effect-reviewer`    | Fresh-context review of backend changes                 | Existing |
| `frontend-reviewer`  | Fresh-context review of frontend changes                | New      |

Plus one infrastructure agent:

| Agent             | Role                                      | Status |
| ----------------- | ----------------------------------------- | ------ |
| `manifest-writer` | One-shot writer for `.data/manifest.yaml` | New    |

All agents enforce the **<150 line** thin-agent constraint (Praetorian §2.2). Developer agents are thin wrappers: they delegate domain knowledge to the gateway skill, keeping their own definition near-empty.

#### Rationale

- **Reviewer in fresh context is the load-bearing piece.** A reviewer running in the same context as the implementer rationalizes its own bugs (Praetorian §4.5). Symmetric reviewers on both sides preserve the guarantee that already works for backend.
- **Tester / Test-Lead roles collapse into the developer.** Solo project; the developer agent writes the test alongside the code, following existing repo convention (`bun run test` on both sides).
- **Lead = main thread.** The orchestrator holds the architecture plan natively. Praetorian's separate `lead` agent matters when the plan must be a serializable JSON handoff between humans — not the case here.
- **Manifest-writer separates manifest mutation from orchestration logic.** See Decision 5 for the rationale on why the orchestrator must not write the manifest directly.

#### Alternatives Considered

- **Minimal-3 (skip `frontend-reviewer`).** Rejected: creates an asymmetry where backend gets fresh-context review and frontend gets self-review. The asymmetry is the failure mode, not the simplification.
- **Full Praetorian 5×2 (10 agents).** Rejected: cargo-cult at this repo size. Each agent definition is maintenance cost.

#### Consequences

- Four agent files to maintain plus `manifest-writer`.
- Reviewer agents must be wired into the `feedback-loop.json` contract — they self-write their PASS/FAIL verdict. See Decision 4.

---

### Decision 4: Two-Hook Enforcement Layer

#### Context

CLAUDE.md instructions are voluntary. Skills are voluntary. Agents are voluntary. The only mechanism Claude Code provides that is _not_ voluntary is hooks — they execute outside the LLM and can block tool calls or session exit.

#### Decision

Two new hooks under `.claude/hooks/` (in addition to existing `require-rtk.sh`):

**Hook 1: `agent-first-enforcement.sh` (PreToolUse, matcher `Edit|Write`)**

Reads `tool_input.file_path`. If the path matches `backend/src/**` or `frontend/src/**` _and_ the caller is the main thread (not a sub-agent), blocks with a message like `"Spawn backend-developer instead"`. `packages/shared/**` is allowed from either developer agent. `.data/**` and `docs/**` are unrestricted.

**Hook 2: `feedback-loop-stop.sh` (Stop)**

Reads `.data/feedback-loop.json`. If `dirty_domains` is non-empty and any domain has `reviewer_status != "PASS"`, blocks session exit with `"Spawn {domain}-reviewer before completing"`. Per-domain tracking handles features that touch both backend and frontend.

**Supporting hook: `post-edit-dirty-bit.sh` (PostToolUse, matcher `Edit|Write`)**

Sets `dirty_domains.{backend|frontend} = true` in `.data/feedback-loop.json` whenever an Edit/Write touches the corresponding source tree. Deterministic; no LLM involvement in setting the bit.

#### Rationale

- **The reviewer step is the weakest link in the protocol.** Phases 1-8 produce visible artifacts (manifest entries, code diffs). Phases 9-11 produce judgments — easy to perform shallowly or skip entirely under context pressure. The Stop-hook dirty-bit is the only mechanism that catches "I performed review in my head."
- **PreToolUse alone is insufficient.** It enforces _who_ edits files but is silent on whether review ran afterward.
- **PostToolUse for dirty bits, agent-self-write for verdicts.** Dirty bits must be deterministic — the LLM cannot be trusted to set them. Verdicts are inherently judgments, so the agent producing the judgment is the right writer; relaying through the orchestrator adds a hop where the verdict can be fudged.
- **Two hooks is the right scope.** `inject-reminders.sh` (UserPromptSubmit) is mostly redundant with skill loading. `SubagentStop` validation does not solve a current failure mode. Both are deferred until a concrete failure is observed.

#### Alternatives Considered

- **One hook (PreToolUse only).** Rejected: leaves the most common failure mode (skipped review) unaddressed.
- **Three+ hooks (full Praetorian 8-layer).** Rejected: prophylactic over-engineering at this repo size.
- **Orchestrator parses reviewer output and writes verdict.** Rejected: extra hop, place to lose information.

#### Consequences

- The orchestrator cannot bypass the workflow even if the model wants to. Hooks survive prompt manipulation.
- Reviewer agents must write their verdict to `.data/feedback-loop.json` as part of their exit protocol. Their definitions must enforce this contract.
- **Hook script quality matters.** A buggy `feedback-loop-stop.sh` can lock the session. The hooks must fail open on parse errors (log and allow Stop) rather than fail closed.

---

### Decision 5: Tool-Agnostic State in `.data/`

#### Context

Workflow state must be readable by both Claude Code and the collaborator's LLM tool. State that lives only in `.claude/` forks the workflow.

#### Decision

Two state files under `.data/`:

| File                       | Lifecycle                           | Contents                                                                    | Writers                                                           |
| -------------------------- | ----------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `.data/manifest.yaml`      | Persistent (survives session reset) | `current_phase`, `completed_phases`, `findings`, `decisions`, `dirty_files` | Only `manifest-writer` agent                                      |
| `.data/feedback-loop.json` | Ephemeral (per-session)             | `dirty_domains`, per-domain `reviewer_status`, `tester_status`              | `post-edit-dirty-bit.sh` (dirty bits), reviewer agents (verdicts) |

Both files are **gitignored**. Per-machine, per-session workflow state is not committed.

A committed file `.data/SCHEMA.md` documents the YAML/JSON shape of both files. This is the **shared contract**: both tools agree on the schema; each implements its own writer.

**Manifest write rule:** the orchestrator MUST NOT edit `.data/manifest.yaml` directly. All manifest mutations go through the `manifest-writer` one-shot agent.

#### Rationale

- **`.claude/` forks the workflow.** State there is invisible to the collaborator's tool. `.data/` is a neutral namespace both tools can adopt.
- **Manifest write rule preserves the orchestrator's Edit boundary.** Without it, we would need to write exceptions into `agent-first-enforcement.sh` ("orchestrator may edit `.claude/state/**` but not `backend/src/**`"). The rule keeps the orchestrator's job uniform: delegate everything.
- **Schema-as-contract over mechanism-as-contract.** Hooks and agents are Claude-specific; the schema is portable. The collaborator's tool will have its own enforcement equivalent — what matters is that both tools fill in the same fields with the same semantics.
- **Gitignore is correct.** `.data/` is per-machine in-progress state, not a committed artifact. Plans for shareable feature work go in `docs/plans/<NAME>_<DATE>.md` per existing convention.

#### Alternatives Considered

- **`.claude/state/manifest.yaml`.** Rejected: invisible to the collaborator's tool.
- **Allow orchestrator to write the manifest directly.** Rejected: leaks complexity into the agent-first hook; normalizes orchestrator-as-writer.
- **Commit `.data/`.** Rejected: per-machine state is not collaborative content; conflicts on every push.

#### Consequences

- `manifest-writer` becomes a critical agent. Its prompt format is the API for manifest mutations.
- Schema drift between tools is a real risk; `.data/SCHEMA.md` must be maintained as the source of truth.
- Resumption across sessions (`/resume`) is enabled by the manifest but not implemented in v1.

---

### Decision 6: Skills Source in `.agents/`, Symlinked from `.claude/`

#### Context

The repo already establishes a pattern: existing skills live under `.agents/skills/<name>/SKILL.md` (source of truth) and `.claude/skills/<name>` (symlink). The collaborator's tool reads `.agents/`; Claude reads `.claude/skills/` via the symlinks.

#### Decision

New orchestration skills follow the existing pattern:

```
.agents/skills/orchestrate/SKILL.md         (source)
.agents/skills/gateway-backend/SKILL.md     (source)
.agents/skills/gateway-frontend/SKILL.md    (source)
.claude/skills/orchestrate -> ../../.agents/skills/orchestrate
.claude/skills/gateway-backend -> ../../.agents/skills/gateway-backend
.claude/skills/gateway-frontend -> ../../.agents/skills/gateway-frontend
```

#### Rationale

- **The orchestration playbook should be shared.** If both tools run features through the same skeleton, the manifest contract from Decision 5 carries real meaning. Diverging the playbook would make the shared schema cosmetic.
- **The pattern is already established.** Ten skills already use it. A second layout for these three skills would be inconsistent maintenance debt.
- **Gateways encode repo knowledge, not Claude knowledge.** Their natural home is the shared layer.

#### Alternatives Considered

- **Source in `.claude/skills/` directly.** Rejected: forks the playbook between tools.

#### Consequences

- Both tools must agree on the skill format. Markdown frontmatter conventions need to be portable.
- New skills added later default to `.agents/` first.

---

### Decision 7: Backend-First Vertical Slice Rollout

#### Context

The system has many parts: orchestrate skill, two gateways, four agents, three hooks, two state files. Building all of them simultaneously creates a high integration-bug surface and a long time-to-first-value.

#### Decision

Build the **full backend lane end-to-end first**, validate it on a real backend feature, then clone to frontend. Order:

1. Add `.data/` to `.gitignore`. Commit `.data/SCHEMA.md`.
2. `.agents/skills/gateway-backend/SKILL.md` (+ symlink).
3. `.claude/agents/backend-developer.md` — thin wrapper pointing at the gateway.
4. `.claude/agents/manifest-writer.md`.
5. `.agents/skills/orchestrate/SKILL.md` (+ symlink) — backend-only first pass; frontend stubs.
6. `.claude/hooks/agent-first-enforcement.sh` — scoped to `backend/src/**`.
7. `.claude/hooks/post-edit-dirty-bit.sh` — scoped to `backend/src/**`.
8. `.claude/hooks/feedback-loop-stop.sh` — checks only `dirty_domains.backend`.
9. **Run a real backend feature end-to-end. Iterate.**
10. Once stable: add `gateway-frontend`, `frontend-developer`, `frontend-reviewer`, expand hook scopes.

#### Rationale

- **Bottom-up (hooks first) is dead-end risk.** A hook that blocks main-thread edits to `backend/src/**` with no `backend-developer` agent yet means the session is stuck.
- **Top-down (skills first, no hooks) gives a voluntary protocol.** Validates under conditions that don't reflect real use; teeth bolted on later may not fit.
- **Vertical slice tests the whole loop on one domain.** Bug surface is half the size; integration issues surface in the cheapest setting; cloning to frontend is mostly mechanical.
- **Backend first specifically because:** (i) `effect-reviewer` already exists and works — half the loop is pre-built; (ii) backend has stricter invariants (no `SELECT *`, snake_case, `Effect.Service`), so consistency wins are more visible; (iii) frontend has more diffuse skill coverage, so first-pass mistakes in `gateway-frontend` cost more to undo.

#### Alternatives Considered

- **Bottom-up (hooks first).** Rejected.
- **Top-down (skills first, no hooks).** Rejected.
- **Frontend-first vertical slice.** Rejected: no existing reviewer; more skills to coordinate.

#### Consequences

- Frontend lane lags backend by some interval. Acceptable.
- The orchestrate skill will likely need a small revision when the second lane reveals asymmetries — plan for one cleanup pass after step 10.

---

## 3. Out of Scope

Explicitly **not** part of v1. Each is justifiable but unjustified at current scale.

| Praetorian primitive                                    | Reason for deferral                                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tier-2 skill library (`.claude/skill-library/`)         | 10 skills total; attention dilution is not the problem. Revisit at 30+.                         |
| Compaction gates (75/85% thresholds)                    | Solo dev sessions rarely hit 85% on this codebase. Add when observed.                           |
| Escalation Advisor (out-of-band LLM hint)               | Premature; no observed deadlocks.                                                               |
| Parallel agent dispatch (`dispatching-parallel-agents`) | Single-machine, single-developer; serial is fine.                                               |
| `inject-reminders.sh` (UserPromptSubmit hook)           | Largely redundant with skill loading.                                                           |
| `SubagentStop` validation                               | No multi-output-directory problem to solve.                                                     |
| Self-Annealing meta-agent                               | Praetorian Q1 2026 roadmap item; far beyond current need.                                       |
| 16-phase compression for solo workflows                 | Adopt Praetorian §4.3 classification (with a TRIVIAL escape hatch) until pain proves otherwise. |
| Per-feature manifest paths                              | Single `.data/manifest.yaml` is sufficient; per-feature paths add complexity.                   |
| `/resume` slash command                                 | Manifest persistence supports it but no implementation in v1.                                   |

---

## 4. Open Questions

1. **Schema versioning for `.data/SCHEMA.md`.** When the schema evolves, how do both tools detect incompatibility? Recommend a top-level `version: 1` field and a check in the orchestrate skill.
2. **Reviewer-self-write atomicity.** If two reviewer agents write to `.data/feedback-loop.json` near-simultaneously (rare but possible), file-level race exists. v1 acceptable: reviewers are spawned serially by the orchestrator. Revisit if parallel dispatch is added.
3. **Hook fail-open semantics.** Confirm both hooks fail open on parse errors; otherwise a corrupted state file locks the session.
4. **Friend's tool integration.** Concrete confirmation that the collaborator's tool can consume `orchestrate/SKILL.md` and read/write `.data/manifest.yaml`. Should happen before step 5 of the rollout.

---

## 5. References

- `docs/poc_deterministic_ai.md` — Praetorian Development Platform writeup.
- `docs/adrs/ADR_BACKEND.md` — backend architecture; this ADR's process governs changes to it.
- `docs/adrs/ADR_FRONTEND.md` — frontend architecture; same.
- `CLAUDE.md` — current rule set; orchestrate skill enforces several of these rules in-process.
