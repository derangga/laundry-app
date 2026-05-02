import { http, HttpResponse } from 'msw'

export const servicesHandlers = [
  http.get('*/api/services', () => HttpResponse.json([])),
]
