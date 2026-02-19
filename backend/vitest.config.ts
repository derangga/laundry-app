import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts'],
    },
  },
  resolve: {
    alias: {
      '@domain': resolve(__dirname, './src/domain'),
      '@usecase': resolve(__dirname, './src/usecase'),
      '@repositories': resolve(__dirname, './src/repositories'),
      '@api': resolve(__dirname, './src/api'),
      '@http': resolve(__dirname, './src/http'),
      '@configs': resolve(__dirname, './src/configs'),
      '@shared': resolve(__dirname, './src/shared'),
      '@middleware': resolve(__dirname, './src/middleware'),
      '@handlers': resolve(__dirname, './src/handlers'),
    },
  },
})
