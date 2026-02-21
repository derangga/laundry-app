import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { HealthResponse, DatabaseHealthResponse } from '@domain/Health'

export const HealthGroup = HttpApiGroup.make('Health')
  .add(HttpApiEndpoint.get('serverHealth', '/health').addSuccess(HealthResponse))
  .add(HttpApiEndpoint.get('databaseHealth', '/health/db').addSuccess(DatabaseHealthResponse))
