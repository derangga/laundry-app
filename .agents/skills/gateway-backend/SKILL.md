---
name: gateway-backend
description: Routes backend Effect tasks to the right skills, invariants, and reviewer. Use when modifying backend/src/** or shared schemas backing a backend feature. Returns the skill list to load, repo invariants to enforce, mandatory tools, and the required reviewer follow-up.
version: 1.0.0
---

# Backend Gateway

This skill is the **portable contract** for any backend code change in this repo. Both Claude Code and other LLM tools should consume it identically.

## When to use

Invoke this gateway whenever a task touches:

- `backend/src/**` — Effect services, repositories, handlers, API definitions, middleware, HTTP wiring, configs
- `packages/shared/**` — DTOs, branded IDs, enums backing a backend feature

Do NOT invoke for: pure frontend tasks, doc-only changes, or non-source-tree edits.

## Required skills (load in order)

1. **`effect-best-practices`** — always. Reference its `references/` directory for pattern detail (`anti-patterns.md`, `service-patterns.md`, `error-patterns.md`, `layer-patterns.md`, `schema-patterns.md`, `http-api-patterns.md`, `concurrency-patterns.md`, `observability-patterns.md`, `resource-patterns.md`, `testing-patterns.md`).
2. **`observability-backend`** — when touching `backend/src/repositories/**`, `backend/src/handlers/**`, or `backend/src/middleware/**`. Adds OpenTelemetry traces, metrics, and structured logs.

## Invariants (cite when the model asks "why")

These come from `CLAUDE.md`. Treat as hard constraints.

- **No `SELECT *`.** Always use explicit column lists. Always use explicit `RETURNING` clauses on `INSERT`/`UPDATE`/`DELETE` that need return values.
- **DTOs in `packages/shared/`, error classes in `backend/src/domain/`.** Never define data models inside `usecase/`. Backend `domain/` re-exports shared types and contains only error classes.
- **Snake_case columns, matching property names.** Domain model property names must match database column names exactly.
- **Domain-specific error classes.** Use typed errors (e.g. `CustomerNotFound`); never raw `Error`. The error handler middleware maps tagged errors to HTTP responses.
- **Effect patterns.** Services as `Effect.Service<Self>()("Tag", { ... })`; errors as `Schema.TaggedError`; layers composed explicitly with no circular deps.

## Mandatory tools

- **Serena** for symbol-level reads and edits. Use `find_symbol`, `replace_symbol_body`, `insert_after_symbol`, `find_referencing_symbols`. Avoid full-file reads.
- **GitNexus**:
  - Run `gitnexus_impact({target: "<symbol>", direction: "upstream"})` BEFORE modifying any function/class/method. Report the blast radius if HIGH or CRITICAL.
  - Run `gitnexus_detect_changes()` BEFORE declaring the task complete. Verify the change scope matches expectations.
- **RTK** for shell commands (auto-rewritten by the require-rtk hook).

## Required follow-up

After implementation completes:

1. The orchestrator MUST spawn the `effect-reviewer` agent (see `.claude/agents/effect-reviewer.md`).
2. The reviewer returns `VERDICT: PASS | FAIL | SKIP` and writes its verdict to `.data/feedback-loop.json` under `domain_status.backend.reviewer_status`.
3. On `FAIL`, fix every listed issue and re-spawn the reviewer. Do not declare the task done with a non-`PASS` verdict.
4. The Stop hook (`feedback-loop-stop.sh`) will refuse to end the session until the reviewer is `PASS` for all dirty domains.

## Domain boundary

`packages/shared/**` edits initiated for a backend feature are owned by this gateway and reviewed by `effect-reviewer`. When a frontend feature initiates a shared-package edit, the frontend gateway owns it instead — the orchestrator decides which gateway to invoke based on the originating task, not the file path.
