# Task Completion Checklist

After completing a coding task, run the following:

1. **Type-check**: `bun run typecheck` (both backend and frontend)
2. **Format**: `bun run format` (Prettier for both)
3. **Lint**: `bun run lint` (ESLint for frontend)
4. **Tests**: 
   - Backend: `cd backend && bun run test`
   - Frontend: `cd frontend && bun run test`
5. **For UI changes**: Start dev server (`bun run dev`) and test in browser — type checks and tests verify code correctness, not feature correctness
6. **GitNexus**: Run `gitnexus_detect_changes()` before committing to verify scope
