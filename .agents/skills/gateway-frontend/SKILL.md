---
name: gateway-frontend
description: Routes frontend TanStack/React tasks to the right skills, invariants, and reviewer. Use when modifying frontend/src/** or shared schemas backing a frontend feature. Returns the skill list to load, repo invariants to enforce, mandatory tools, and the required reviewer follow-up.
version: 1.0.0
---

# Frontend Gateway

This skill is the **portable contract** for any frontend code change in this repo. Both Claude Code and other LLM tools should consume it identically.

## When to use

Invoke this gateway whenever a task touches:

- `frontend/src/**` — TanStack Router routes, React components, hooks, data fetchers, integrations, lib utilities
- `packages/shared/**` — DTOs, branded IDs, enums backing a frontend-only feature

Do NOT invoke for: pure backend tasks, doc-only changes, or non-source-tree edits.

## Required skills (load by intent)

Pick the subset that matches the task. Loading skills you do not need wastes attention.

| Intent                                                     | Skills to load                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| New route, route loader, search params, navigation         | `tanstack-router-best-practices`, `tanstack-start-best-practices` |
| Server functions, SSR, middleware, deployment              | `tanstack-start-best-practices`                                   |
| Data fetching, mutations, cache invalidation, server state | `tanstack-query-best-practices`                                   |
| New UI component, form, dialog, table, toast               | `shadcn-ui`                                                       |
| Theme tokens, responsive layout, design system primitives  | `tailwind-design-system`                                          |

When in doubt, prefer loading less. Read the skill's `references/` directory only on demand.

## Invariants (cite when the model asks "why")

These come from `CLAUDE.md` and the existing frontend codebase. Treat as hard constraints.

- **Shared DTOs in `packages/shared/`.** Never duplicate a backend DTO inside `frontend/src/`. Import the shared schema and derive types via `Schema.Type<typeof Foo>`.
- **TanStack Router file-based routing.** Routes live under `frontend/src/routes/`. Do not register routes manually. Re-run codegen after adding/renaming routes; do not hand-edit `routeTree.gen.ts`.
- **TanStack Query for server state, React state for UI state.** Do not mirror server data into `useState`. Cache invalidation is the source of truth.
- **shadcn/ui primitives over hand-rolled components.** When a shadcn component covers the use case (Button, Dialog, Form, Table, etc.), use it. Customize via Tailwind classes, not via copy-paste forks.
- **Tailwind v4 utility-first.** No new CSS files for component styling. Design tokens go through the existing `styles.css` configuration.
- **No business logic in components.** Components render. Hooks orchestrate. `data/` and `integrations/` own API calls. Keep components testable by isolating side effects.

## Mandatory tools

- **Serena** for symbol-level reads and edits. Use `find_symbol`, `replace_symbol_body`, `insert_after_symbol`, `find_referencing_symbols`. Avoid full-file reads.
- **GitNexus**:
  - Run `gitnexus_impact({target: "<symbol>", direction: "upstream"})` BEFORE modifying any exported component, hook, or function. Report the blast radius if HIGH or CRITICAL.
  - Run `gitnexus_detect_changes()` BEFORE declaring the task complete. Verify the change scope matches expectations.
- **RTK** for shell commands (auto-rewritten by the require-rtk hook).

## Required follow-up

After implementation completes:

1. The orchestrator MUST spawn the `frontend-reviewer` agent (see `.claude/agents/frontend-reviewer.md`).
2. The reviewer returns `VERDICT: PASS | FAIL | SKIP` and writes its verdict to `.data/feedback-loop.json` under `domain_status.frontend.reviewer_status`.
3. On `FAIL`, fix every listed issue and re-spawn the reviewer. Do not declare the task done with a non-`PASS` verdict.
4. The Stop hook (`feedback-loop-stop.sh`) will refuse to end the session until both `reviewer_status` and `tests_status` are `PASS` for `frontend`.

## Domain boundary

`packages/shared/**` edits initiated for a frontend feature are owned by this gateway and reviewed by `frontend-reviewer`. When a backend feature initiates a shared-package edit, the backend gateway owns it instead — the orchestrator decides which gateway to invoke based on the originating task, not the file path. For changes that genuinely require both lanes (e.g., adding a field that exposes through API and renders in the UI), invoke both gateways and dispatch both developer agents serially.
