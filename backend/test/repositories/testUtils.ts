import { Effect, Layer } from 'effect'
import { SqlClient, SqlError } from '@effect/sql'

/**
 * Creates a mock SqlClient that returns predefined data or errors.
 * Supports both tagged template literal syntax and unsafe method.
 * Also supports dialect-specific methods used by Model.makeRepository.
 */
export const createMockSqlClient = <T>(config: {
  rows?: T[]
  shouldFail?: boolean
  filterFn?: (arg: T) => boolean
  error?: SqlError.SqlError
}) => {
  const mockQueryFn = (..._args: any[]): Effect.Effect<T[], SqlError.SqlError> => {
    if (config.shouldFail && config.error) {
      return Effect.fail(config.error)
    }

    if (config.filterFn) {
      return Effect.succeed(config.rows?.filter(config.filterFn) || [])
    }
    return Effect.succeed(config.rows ?? [])
  }

  // Create insert builder that returns SQL fragments
  const mockInsert = (_data: any) => ({
    returning: (_columns: string) => Effect.succeed(config.rows ?? []),
  })

  // Mock SqlClient service with both tagged template and unsafe methods
  // and additional methods needed by Model.makeRepository
  const mockSql = Object.assign(mockQueryFn, {
    unsafe: (_query: string, _params?: any[]): Effect.Effect<T[], SqlError.SqlError> => {
      if (config.shouldFail && config.error) {
        return Effect.fail(config.error)
      }
      return Effect.succeed(config.rows ?? [])
    },
    // Support for dialect-specific operations used by Model.makeRepository
    onDialectOrElse: (handlers: { mysql?: () => any; orElse: () => any }) => {
      // Default to the 'orElse' handler (PostgreSQL-style)
      return handlers.orElse()
    },
    insert: mockInsert,
    // Helper methods for table/column references
    id: (val: string) => val,
  })

  return Layer.succeed(SqlClient.SqlClient, mockSql as any)
}

/**
 * Creates a SQL error for testing error scenarios
 */
export const createSqlError = (message: string): SqlError.SqlError =>
  new SqlError.SqlError({ cause: new Error(message) })
