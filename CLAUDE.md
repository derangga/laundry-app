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

```
packages/shared/src/  # Shared domain models (DTOs, branded IDs, enums) — used by both backend & frontend
  common/             # Shared transforms (DecimalNumber, DateTimeUtcString)
  user.ts             # User schemas (UserId, CreateUserInput, UserWithoutPassword, etc.)
  auth.ts             # Auth schemas (LoginInput, AuthResponse, etc.)
  customer.ts         # Customer schemas (CustomerId, CreateCustomerInput, etc.)
  service.ts          # Service schemas (ServiceId, UnitType, etc.)
  order.ts            # Order schemas (OrderId, OrderStatus, CreateOrderInput, etc.)
  analytics.ts        # Analytics schemas (WeeklyAnalyticsResponse, DashboardStatsResponse)
  receipt.ts          # Receipt schemas (ReceiptResponse, ReceiptItem)

backend/src/
  domain/        # Backend-only error types + re-exports from @laundry-app/shared
  usecase/       # Business logic (Effect.Service pattern)
  repositories/  # Database access (SQL queries)
  handlers/      # Route handler implementations
  api/           # HttpApi route definitions
  middleware/    # AuthMiddleware (JWT verification)
  configs/       # Environment variable parsing
  http/          # HTTP server setup, router
  main.ts        # Entry point

frontend/src/
  routes/        # TanStack Router file-based routes
  components/    # React components
  data/          # Data fetching, API clients
  lib/           # Utilities
```

## Documentation

Read these for detailed context:

- `docs/PRD.md` — Product requirements, API specs, frontend routes
- `docs/ADR_BACKEND.md` — Architecture decisions, database schema
- `docs/CONTEXT.md` — Effect patterns, service composition, middleware, layer setup
- Use available **skills** for framework-specific patterns (Effect, TanStack Router, TanStack Query, shadcn/ui, Tailwind, etc.)

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

This project is indexed by GitNexus as **laundry-app** (3363 symbols, 5055 relationships, 33 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/laundry-app/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool             | When to use                   | Command                                                                 |
| ---------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `query`          | Find code by concept          | `gitnexus_query({query: "auth validation"})`                            |
| `context`        | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})`                              |
| `impact`         | Blast radius before editing   | `gitnexus_impact({target: "X", direction: "upstream"})`                 |
| `detect_changes` | Pre-commit scope check        | `gitnexus_detect_changes({scope: "staged"})`                            |
| `rename`         | Safe multi-file rename        | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher`         | Custom graph queries          | `gitnexus_cypher({query: "MATCH ..."})`                                 |

## Impact Risk Levels

| Depth | Meaning                               | Action                |
| ----- | ------------------------------------- | --------------------- |
| d=1   | WILL BREAK — direct callers/importers | MUST update these     |
| d=2   | LIKELY AFFECTED — indirect deps       | Should test           |
| d=3   | MAY NEED TESTING — transitive         | Test if critical path |

## Resources

| Resource                                     | Use for                                  |
| -------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/laundry-app/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/laundry-app/clusters`       | All functional areas                     |
| `gitnexus://repo/laundry-app/processes`      | All execution flows                      |
| `gitnexus://repo/laundry-app/process/{name}` | Step-by-step execution trace             |

## Self-Check Before Finishing

Before completing any code modification task, verify:

1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

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
