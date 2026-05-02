import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

const devtoolsStub = fileURLToPath(
  new URL('./src/test/devtools-stub.tsx', import.meta.url),
)

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] }), viteReact()],
  resolve: {
    alias: [
      { find: '@tanstack/react-devtools', replacement: devtoolsStub },
      { find: '@tanstack/react-router-devtools', replacement: devtoolsStub },
      { find: '@tanstack/react-query-devtools', replacement: devtoolsStub },
    ],
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3100/',
      },
    },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
