/**
 * Login page with session restoration
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'

import { useLogin, getMeFn, refreshFn } from '@/api/auth'
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    // Check 1: If user already has access token, verify it's valid
    const accessToken = getAccessToken()
    if (accessToken) {
      try {
        await getMeFn() // Verify access token is still valid
        throw redirect({ to: '/' }) // User is logged in → redirect to home
      } catch {
        // Access token is invalid/expired, continue to check refresh token
      }
    }

    // Check 2: Attempt to restore session from refresh token
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        const authResponse = await refreshFn(refreshToken)
        setAccessToken(authResponse.accessToken)
        setRefreshToken(authResponse.refreshToken)
        throw redirect({ to: '/' }) // Session restored → redirect to home
      } catch {
        // Refresh failed - show login form
      }
    }

    // No valid session → show login form
  },
  component: LoginPage,
})

function LoginPage() {
  const loginMutation = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()

    // Client-side validation
    if (!email.trim() || !password.trim()) {
      return
    }

    if (password.length < 8) {
      return
    }

    loginMutation.mutate({ email, password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginMutation.isPending}
                required
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
