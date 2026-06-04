//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  // Must stay last: disables every ESLint rule already covered by oxlint
  // (kept in sync with .oxlintrc.json) so the hybrid setup never double-reports.
  ...oxlint.buildFromOxlintConfigFile('.oxlintrc.json'),
  {
    ignores: ['eslint.config.js', 'prettier.config.js'],
  },
]
