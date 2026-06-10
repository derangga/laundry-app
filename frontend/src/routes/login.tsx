/**
 * Login page with session restoration
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { BarChart3, ClipboardList, CreditCard } from 'lucide-react'

import { useLogin } from '@/api/auth'
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
  component: LoginPage,
})

const HERO_FEATURES = [
  {
    icon: ClipboardList,
    text: 'Track every order from drop-off to pickup',
  },
  {
    icon: CreditCard,
    text: 'Flexible payments and instant receipts',
  },
  {
    icon: BarChart3,
    text: 'Real-time revenue and business insights',
  },
] as const

function LoginHero({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-4 text-white">
      <span
        className={`font-bold tracking-tight ${
          compact ? 'text-2xl' : 'text-4xl lg:text-5xl'
        }`}
      >
        Laundry Manager
      </span>
      <p className="max-w-md text-base text-white/80">
        Manage orders, payments, and customers — all in one place.
      </p>
      {!compact && (
        <ul className="mt-2 flex flex-col gap-4">
          {HERO_FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <Icon
                className="mt-0.5 size-5 shrink-0 text-white/70"
                aria-hidden="true"
              />
              <span className="text-sm text-white/90">{text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Desktop brand panel */}
      <div className="relative hidden flex-col justify-end overflow-hidden p-12 lg:flex">
        <img
          src="/laundry.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.21_0.006_285.885)] via-[oklch(0.21_0.006_285.885)]/60 to-transparent" />
        <div className="relative z-10 mt-auto flex flex-col items-start text-left">
          <LoginHero />
        </div>
      </div>

      {/* Form column */}
      <div className="flex min-h-screen flex-col lg:min-h-0">
        {/* Mobile-only brand band */}
        <div className="bg-[oklch(0.21_0.006_285.885)] px-6 py-8 lg:hidden">
          <LoginHero compact />
        </div>

        <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-10">
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
      </div>
    </div>
  )
}
