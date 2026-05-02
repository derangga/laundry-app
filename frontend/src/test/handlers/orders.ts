import { http, HttpResponse } from 'msw'

export const ordersHandlers = [
  http.get('*/api/orders', () => HttpResponse.json([])),
]
