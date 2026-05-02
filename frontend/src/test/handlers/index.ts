import { authHandlers } from './auth'
import { ordersHandlers } from './orders'
import { servicesHandlers } from './services'

export const defaultHandlers = [
  ...authHandlers,
  ...ordersHandlers,
  ...servicesHandlers,
]
