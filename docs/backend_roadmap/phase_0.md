## Phase 0: Project Setup & Infrastructure

**Goal**: Set up the development environment and project structure

**Prerequisites**: None (starting point)

**Complexity**: Simple

**Estimated Time**: 2-4 hours

### Tasks

#### Task 0.1: Initialize Bun Workspace

- [ ] Create `/backend` directory
- [ ] Initialize Bun package: `bun init`
- [ ] Set up workspace in root `package.json`:
  ```json
  {
    "workspaces": ["/*", "packages/*"]
  }
  ```

#### Task 0.2: Install Core Dependencies

- [ ] Install Effect ecosystem:
  ```bash
  bun add effect @effect/platform @effect/platform-bun @effect/schema @effect/sql @effect/sql-pg
  ```
- [ ] Install database client: `bun add pg`
- [ ] Install authentication: `bun add jose @node-rs/bcrypt`
- [ ] Install dev dependencies:
  ```bash
  bun add -d typescript @types/node @types/pg vitest @effect/vitest prettier eslint
  ```

#### Task 0.3: Configure TypeScript

- [ ] Create `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "lib": ["ES2022"],
      "moduleResolution": "bundler",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "outDir": "./dist",
      "rootDir": "./src",
      "baseUrl": "./src",
      "paths": {
        "@domain/*": ["domain/*"],
        "@application/*": ["application/*"],
        "@infrastructure/*": ["infrastructure/*"],
        "@api/*": ["api/*"],
        "@shared/*": ["shared/*"]
      }
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "test"]
  }
  ```

#### Task 0.4: Create Project Structure

- [ ] Create directory structure:
  ```
  /backend/
  ├── src/
  │   ├── domain/
  │   │   ├── customer/
  │   │   ├── order/
  │   │   ├── service/
  │   │   └── user/
  │   ├── application/
  │   │   ├── auth/
  │   │   ├── customer/
  │   │   ├── order/
  │   │   ├── analytics/
  │   │   └── receipt/
  │   ├── infrastructure/
  │   │   ├── database/
  │   │   │   └── repositories/
  │   │   ├── http/
  │   │   │   └── middleware/
  │   │   └── config/
  │   ├── api/
  │   │   ├── auth/
  │   │   ├── customers/
  │   │   ├── orders/
  │   │   ├── services/
  │   │   ├── analytics/
  │   │   └── receipts/
  │   ├── shared/
  │   │   ├── errors/
  │   │   └── schemas/
  │   └── main.ts
  ├── test/
  ├── migrations/
  ├── package.json
  ├── tsconfig.json
  └── vitest.config.ts
  ```

#### Task 0.5: Configure Vitest

- [ ] Create `vitest.config.ts`:

  ```typescript
  import { defineConfig } from "vitest/config";
  import path from "path";

  export default defineConfig({
    test: {
      globals: true,
      environment: "node",
    },
    resolve: {
      alias: {
        "@domain": path.resolve(__dirname, "./src/domain"),
        "@application": path.resolve(__dirname, "./src/application"),
        "@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
        "@api": path.resolve(__dirname, "./src/api"),
        "@shared": path.resolve(__dirname, "./src/shared"),
      },
    },
  });
  ```

#### Task 0.6: Set Up Environment Variables

- [ ] Create `.env.example`:

  ```env
  # Database
  DATABASE_HOST=localhost
  DATABASE_PORT=5432
  DATABASE_NAME=laundry_dev
  DATABASE_USER=postgres
  DATABASE_PASSWORD=postgres

  # JWT
  JWT_SECRET=your-super-secret-jwt-key-min-32-chars
  JWT_ACCESS_EXPIRY=15m
  JWT_REFRESH_EXPIRY=7d

  # Server
  PORT=3000
  CORS_ORIGIN=http://localhost:5173
  NODE_ENV=development
  ```

- [ ] Create `.env` file (gitignored)
- [ ] Add `.env` to `.gitignore`

#### Task 0.7: Configure Development Tools

- [ ] Create `.prettierrc`:
  ```json
  {
    "semi": false,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "printWidth": 100
  }
  ```
- [ ] Create `.prettierignore`:
  ```
  node_modules
  dist
  coverage
  ```

#### Task 0.8: Add Package Scripts

- [ ] Update `package.json`:
  ```json
  {
    "scripts": {
      "dev": "bun --watch src/main.ts",
      "build": "bun build src/main.ts --outdir dist --target bun",
      "start": "bun dist/main.js",
      "test": "vitest",
      "test:watch": "vitest --watch",
      "format": "prettier --write \"src/**/*.ts\"",
      "lint": "eslint src --ext .ts",
      "migrate:up": "migrate -path ./migrations -database $DATABASE_URL up",
      "migrate:down": "migrate -path ./migrations -database $DATABASE_URL down",
      "migrate:create": "migrate create -ext sql -dir migrations -seq"
    }
  }
  ```

### Key Files to Create

- `/backend/package.json`
- `/backend/tsconfig.json`
- `/backend/vitest.config.ts`
- `/backend/.env.example`
- `/backend/.prettierrc`
- `/backend/.gitignore`

### Verification Steps

- [ ] `bun install` completes without errors
- [ ] TypeScript compiler runs: `bun tsc --noEmit`
- [ ] Project structure matches the layout above
- [ ] Environment variables can be loaded
- [ ] Test runner works: `bun test` (should find 0 tests)
- [ ] Prettier formats code: `bun run format`

### Deliverable

Working development environment with:

- Bun workspace configured
- All dependencies installed
- TypeScript configured with path aliases
- Project directory structure created
- Development tools configured (Vitest, Prettier)
- Environment variable setup complete
