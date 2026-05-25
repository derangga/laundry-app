import { HttpApi, OpenApi } from '@effect/platform'
import { HealthGroup } from './HealthApi.js'
import { AuthGroup } from './AuthApi.js'
import { CustomerGroup } from './CustomerApi.js'
import { ServiceGroup } from './ServiceApi.js'
import { OrderGroup } from './OrderApi.js'
import { ReceiptGroup } from './ReceiptApi.js'
import { AnalyticsGroup } from './AnalyticsApi.js'
import { UserGroup } from './UserApi.js'

export class AppApi extends HttpApi.make('AppApi')
  .add(HealthGroup)
  .add(AuthGroup)
  .add(CustomerGroup)
  .add(ServiceGroup)
  .add(OrderGroup)
  .add(ReceiptGroup)
  .add(AnalyticsGroup)
  .add(UserGroup)
  .annotateContext(
    OpenApi.annotations({
      title: 'Laundry App API',
      version: '1.0.0',
      description: 'API for laundry management — customers, orders, services, payments',
    })
  ) {}
