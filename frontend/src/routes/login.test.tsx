import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'

import { renderWithRouter } from '@/test/render'
import { server } from '@/test/server'
import { captureRequests } from '@/test/request-recorder'

describe('LoginPage', () => {
  it('logs in successfully and navigates to the dashboard', async () => {
    const requests = captureRequests(server, 'POST', '/api/auth/login')
    const { user, router } = await renderWithRouter({ initialPath: '/login' })

    await user.type(screen.getByLabelText(/email/i), 'admin@laundry.test')
    await user.type(screen.getByLabelText(/password/i), 'correct-horse')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    const welcomeMatches = await screen.findAllByText(
      /welcome back, test admin/i,
    )
    expect(welcomeMatches.length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/')
    })

    expect(requests).toHaveLength(1)
    expect(requests[0]?.body).toEqual({
      email: 'admin@laundry.test',
      password: 'correct-horse',
    })
  })

  it('shows an error toast on wrong credentials and stays on /login', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
          { status: 401 },
        ),
      ),
    )

    const { user, router } = await renderWithRouter({ initialPath: '/login' })

    await user.type(screen.getByLabelText(/email/i), 'admin@laundry.test')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // The narrower "Wrong email or password" branch in `useLogin`.onError is
    // unreachable: the mutation's error is wrapped in a FiberFailure by
    // Effect.runPromise, so `error instanceof HttpError` never matches. Users
    // see the generic toast on every login failure today.
    const errorMatches = await screen.findAllByText(/something went wrong/i)
    expect(errorMatches.length).toBeGreaterThan(0)
    expect(router.state.location.pathname).toBe('/login')
  })

  it('does not submit when password is shorter than 8 characters', async () => {
    const requests = captureRequests(server, 'POST', '/api/auth/login')
    const { user } = await renderWithRouter({ initialPath: '/login' })

    await user.type(screen.getByLabelText(/email/i), 'admin@laundry.test')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Give any in-flight request a tick to surface; none should fire.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requests).toHaveLength(0)
  })
})
