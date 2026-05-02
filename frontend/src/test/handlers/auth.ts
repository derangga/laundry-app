import { http, HttpResponse } from 'msw'

import { fakeAuthResponse, fakeAuthenticatedUser } from '@/test/fixtures/user'

export const authHandlers = [
  http.get('*/api/auth/me', () => {
    return HttpResponse.json(fakeAuthenticatedUser())
  }),

  http.post('*/api/auth/login', async () => {
    return HttpResponse.json(fakeAuthResponse())
  }),

  http.post('*/api/auth/refresh', () => {
    return HttpResponse.json(fakeAuthResponse())
  }),

  http.post('*/api/auth/logout', () => {
    return HttpResponse.json({ success: true, message: 'Logged out' })
  }),
]
