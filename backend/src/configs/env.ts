import { Config } from 'effect'

// Database configuration (5 variables)
// All database config is required (no defaults) for security
export const DatabaseConfig = Config.all({
  host: Config.string('DATABASE_HOST'), // Required
  port: Config.integer('DATABASE_PORT'), // Required
  username: Config.string('DATABASE_USER'), // Required
  password: Config.redacted('DATABASE_PASSWORD'), // Required
  database: Config.string('DATABASE_NAME'), // Required
})

// JWT configuration (3 variables)
// Note: JWT_SECRET is required (no default) for security
export const JwtConfig = Config.all({
  secret: Config.string('JWT_SECRET'), // Required - no default for security
  accessExpiry: Config.string('JWT_ACCESS_EXPIRY').pipe(Config.withDefault('15m')),
  refreshExpiry: Config.string('JWT_REFRESH_EXPIRY').pipe(Config.withDefault('7d')),
})

// Server configuration (3 variables) - for future HTTP server use
export const ServerConfig = Config.all({
  port: Config.integer('PORT').pipe(Config.withDefault(3000)),
  host: Config.string('HOST').pipe(Config.withDefault('0.0.0.0')),
  nodeEnv: Config.string('NODE_ENV').pipe(Config.withDefault('development')),
})

// Bcrypt configuration (1 variable)
export const BcryptConfig = Config.all({
  saltRounds: Config.integer('BCRYPT_ROUNDS').pipe(Config.withDefault(12)),
})
