import { HttpApi, OpenApi } from '@effect/platform'
import { AuthGroup } from './AuthApi'
import { CustomerGroup } from './CustomerApi'
import { ServiceGroup } from './ServiceApi'
import { OrderGroup } from './OrderApi'

export class AppApi extends HttpApi.make('AppApi')
  .add(AuthGroup)
  .add(CustomerGroup)
  .add(ServiceGroup)
  .add(OrderGroup)
  .annotateContext(
    OpenApi.annotations({
      title: 'Laundry App API',
      version: '1.0.0',
      description: 'API for laundry management — customers, orders, services, payments',
    })
  ) {}
