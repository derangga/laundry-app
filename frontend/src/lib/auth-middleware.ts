import { createMiddleware } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'

const API_BASE_URL =
  process.env.TANSTACK_API_BASE_URL || 'http://localhost:3000'

async function tryRefreshToken(request: Request): Promise<boolean> {
  try {
    const cookieHeader = request.headers.get('cookie') || ''

    if (!cookieHeader.includes('refreshToken=')) {
      return false
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({}),
    })

    return response.ok
  } catch (error) {
    return false
  }
}

export const authMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ request, next }) => {
    const accessToken = getCookie('accessToken')
    const refreshToken = getCookie('refreshToken')

    if (accessToken) {
      return next()
    }

    if (refreshToken) {
      const refreshed = await tryRefreshToken(request)

      if (refreshed) {
        return next()
      }
    }

    throw redirect({ to: '/login' })
  },
)

export const loginPageMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next }) => {
    const accessToken = getCookie('accessToken')

    if (accessToken) {
      throw redirect({ to: '/' })
    }

    return next()
  },
)
