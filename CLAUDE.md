# CLAUDE.md

Laundry management web app — customers, orders, services, payments, analytics. Web only.
Bun workspace monorepo with `@laundry-app/shared` as the shared package (imported via `workspace:*`).

## Tech Stack

- **Runtime**: Bun
- **Backend**: Effect TypeScript (`@effect/platform-bun`, `@effect/sql-pg`, `effect/Schema`)
- **Frontend**: TanStack Start (React), Tailwind CSS v4
- **Shared**: `@laundry-app/shared` — domain models shared between backend & frontend
- **Database**: PostgreSQL (direct SQL, no ORM)
- **Auth**: JWT access tokens + refresh tokens in httpOnly cookies

## Project Structure

Layer map only — explore files with Serena (`get_symbols_overview`, `list_dir`) for current detail.

**Packages** (`workspace:*`, shared by backend & frontend):

- `packages/shared/` — domain models: DTOs, branded IDs, enums, common transforms
- `packages/api-contract/` — HttpApi contract: per-domain API defs, shared errors & middleware
- `packages/observability/` — OpenTelemetry: telemetry layer, config, custom metrics

**Backend** (`backend/src/`) — Effect-TS, request flows `api → handlers → usecase → repositories`:

- `api/` — HttpApi route definitions
- `handlers/` — route handler implementations
- `usecase/` — business logic (`Effect.Service`); never put DTOs here
- `repositories/` — DB access, raw SQL only
- `domain/` — error classes + re-exports from `@laundry-app/shared` (not data models)
- `middleware/` — AuthMiddleware (JWT)
- `configs/` — env var parsing · `http/` — server + router + layer wiring · `SqlClient.ts` — PG client · `main.ts` — entry

**Frontend** (`frontend/src/`) — TanStack Start / React:

- `routes/` — file-based routes (`routeTree.gen.ts` is generated, do not edit)
- `components/` — React components (`auth/`, `features/`, `layout/`, `shared/`, `ui/`)
- `api/` — data fetching / API clients (TanStack Query)
- `hooks/` — custom hooks · `domain/` — FE-only types · `integrations/` — tanstack-query provider · `lib/` — utilities · `test/` — setup, fixtures, MSW handlers

## Documentation

Read these for detailed context:

- `docs/PRD.md` — Product requirements, API specs, frontend routes
- `docs/ADR_BACKEND.md` — Architecture decisions, database schema
- `docs/CONTEXT.md` — Effect patterns, service composition, middleware, layer setup
- Use available **skills** for framework-specific patterns (Effect, TanStack Router, TanStack Query, shadcn/ui, Tailwind, etc.)

## AI Orchestration

This repo uses **deterministic AI orchestration** so every agent (Claude Code and other LLM tools) follows the same process. The full operational protocol lives in the `orchestrate` skill — invoke it (it auto-invokes on any non-trivial coding prompt) and follow it.

**The main thread is a coordinator, not an implementer.** It cannot `Edit`/`Write` to `backend/src/**` or `frontend/src/**` — the `agent-first-enforcement.sh` PreToolUse hook blocks those edits and forces delegation to a developer sub-agent. If you find yourself wanting to edit source from the main thread, spawn the right developer agent instead.

The pieces:

- **`orchestrate` skill** — 16-phase workflow auto-invoked on any non-trivial coding prompt. Phase 2 (Triage) classifies the task as TRIVIAL/SMALL/MEDIUM/LARGE and skips phases accordingly. Read-only questions and explanations bypass orchestrate entirely.
- **Gateway skills** — `gateway-backend` and `gateway-frontend` route work to the right Tier-1 skills, repo invariants, and required reviewer.
- **Developer agents** — `backend-developer` and `frontend-developer` implement changes per their gateway in fresh context. Thin (<150 lines), one-shot, no further delegation.
- **Reviewer agents** — `effect-reviewer` and `frontend-reviewer` audit changes in fresh context and self-write `PASS`/`FAIL` verdicts to `.data/feedback-loop.json`.
- **`manifest-writer` agent** — the orchestrator delegates every `.data/manifest.yaml` mutation to this one-shot agent. Main thread never edits the manifest directly.
- **Hooks** —
  - `agent-first-enforcement.sh` (PreToolUse): blocks main-thread source edits.
  - `post-edit-dirty-bit.sh` (PostToolUse): marks dirty domains; `packages/shared/**` dirties both.
  - `developer-tests-pass.sh` (SubagentStop): deterministically runs typecheck + tests for every dirty domain; blocks sub-agent exit on failure.
  - `feedback-loop-stop.sh` (Stop): refuses to end the session until every dirty domain has both `reviewer_status` and `tests_status` equal to `PASS`.
- **State** — `.data/manifest.yaml` (persistent narrative state) and `.data/feedback-loop.json` (ephemeral enforcement state). Schema in `.data/SCHEMA.md`. Both files are gitignored; the schema is committed.

**Layout convention:** knowledge (skills) lives under `.agents/skills/` so collaborator tools can read it; Claude Code-specific mechanisms (agents, hooks) live under `.claude/`. Skills are symlinked into `.claude/skills/`.

## Dev Commands (from repo root)

- `bun run dev` — Start backend + frontend in parallel
- `bun run build` — Build both
- `bun run typecheck` — Type-check both
- `bun run format` — Format both
- `bun run lint` — Lint frontend
- Backend tests: `cd backend && bun run test:run`
- Frontend tests: `cd frontend && bun run test`
- Migrations: `cd backend && bun run migrate:up` / `migrate:down`

## Coding Rules

1. **No `SELECT *`** — Always use explicit column lists in SQL queries. Use explicit `RETURNING` clauses too.
2. **Shared models in `packages/shared/`** — All request/response DTOs, branded IDs, and enums go in `packages/shared/src/`. Backend `domain/` contains error classes and re-exports shared types. Never define data models inside `usecase/`.
3. **Snake_case DB columns** — Domain model property names must match database column names exactly (`snake_case`).
4. **Typed errors** — Use domain-specific error classes (e.g., `CustomerNotFound`). The error handler middleware maps them to HTTP responses.

## Git Workflow

- **Never push directly to master** — always create a branch
- Branch prefixes: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Plans for non-trivial work go in `docs/plans/<NAME>_<DATE>.md`

## CLI Commands — Use RTK

Always use `rtk` instead of raw shell commands. RTK is a token-optimized CLI proxy that reduces verbose output by 60-90%, producing cleaner output for LLM consumption.

- Commands are automatically rewritten by the Claude Code hook (`git status` → `rtk git status`)
- For meta commands, call `rtk` directly: `rtk gain`, `rtk discover`
- Use `rtk proxy <cmd>` to bypass filtering when debugging

# Code Exploration — Use Serena

Always use Serena's semantic tools for code exploration instead of reading entire files or grepping.

- Use `get_symbols_overview` to understand file structure without reading the full file
- Use `find_symbol` with `include_body=True` to read only the symbols you need
- Use `find_referencing_symbols` to trace callers and dependencies
- Use Serena's symbolic editing tools (`replace_symbol_body`, `insert_before_symbol`, `insert_after_symbol`) for precise code modifications
- Only fall back to full file reads when symbolic tools are insufficient

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **laundry-app** (3561 symbols, 5298 relationships, 32 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource                                     | Use for                                  |
| -------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/laundry-app/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/laundry-app/clusters`       | All functional areas                     |
| `gitnexus://repo/laundry-app/processes`      | All execution flows                      |
| `gitnexus://repo/laundry-app/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->

## Issue tracking — `bd` (beads)

Use `bd` for **all** task tracking. Do not use TodoWrite, TaskCreate, or
markdown TODO lists. Run `bd prime` after `/clear` or a new session to
reload the full workflow context (it covers everything below in detail).

- `bd ready` — unblocked work
- `bd show <id>` — issue detail
- `bd update <id> --claim` — claim atomically before writing code
- `bd close <id1> <id2> ...` — close one or more
- `bd remember "..."` — persistent cross-session notes (not MEMORY.md)

