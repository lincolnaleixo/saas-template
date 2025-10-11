'use client'

import Link from 'next/link'
import { GalleryVerticalEnd, Sparkles } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function LoginPage() {
  const isWaitlistEnabled = useQuery(api.settings.isWaitlistEnabled)

  return (
    <div className="dark:bg-muted min-h-svh w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="bg-muted flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-8" />
            </div>
            <h1 className="text-4xl font-bold">SaaS Template</h1>
            <p className="text-muted-foreground text-lg">
              The best template to build your next SaaS
            </p>
            {isWaitlistEnabled && (
              <div className="mt-4 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="size-4" />
                <span>Private Beta</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">
              {isWaitlistEnabled ? 'Join the Waitlist' : 'Login'}
            </h1>
            <p className="text-muted-foreground text-balance">
              {isWaitlistEnabled
                ? 'Sign in to join our exclusive waitlist. We\'re launching soon!'
                : 'Enter your email below to login to your account'}
            </p>
          </div>
          <LoginForm />
          {isWaitlistEnabled && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-primary">We're in private beta!</p>
              <p className="mt-1">
                Sign in to join our waitlist. We're onboarding users carefully and will approve you
                as soon as possible.
              </p>
            </div>
          )}
          {!isWaitlistEnabled && (
            <div className="text-muted-foreground mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="#" className="underline">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
