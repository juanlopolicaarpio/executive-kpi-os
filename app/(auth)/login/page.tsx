'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sparkles, Loader2, MailCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

// Sign-in by emailed link. No passwords to manage or reset for a team this
// size, and no self-signup — an email that nobody invited gets a link, signs in,
// and is turned away at /auth/callback with a reason.

/**
 * `useSearchParams` opts the subtree out of prerendering, so it has to sit
 * inside a Suspense boundary or the whole /login route fails to build. The
 * boundary is the page; the form is what suspends.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const params = useSearchParams()
  const urlError = params.get('error')

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    const address = email.trim().toLowerCase()
    if (!address) return

    setSending(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // Signing in must never create an account — access comes from being
          // invited, not from knowing the URL.
          shouldCreateUser: false,
        },
      })
      if (error) throw error
      setSent(true)
    } catch (e) {
      // Supabase returns "Signups not allowed for otp" when the address has no
      // auth user. Said plainly, that means "you were not invited".
      const raw = e instanceof Error ? e.message : 'Could not send the link.'
      setError(
        /signups? not allowed/i.test(raw)
          ? 'That email has not been invited to KPI OS. Ask an administrator to add you.'
          : raw,
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
            <Sparkles className="h-4.5 w-4.5" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-base font-semibold leading-tight text-slate-950">KPI OS</p>
            <p className="text-xs text-slate-500">Northstar Demo</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                <MailCheck className="h-5 w-5 text-emerald-600" aria-hidden />
              </div>
              <h1 className="mt-3 text-base font-semibold text-slate-950">Check your email</h1>
              <p className="mt-1.5 text-sm text-slate-600">
                A sign-in link is on its way to <span className="font-medium">{email.trim()}</span>.
                It expires in an hour and works once.
              </p>
              <button
                onClick={() => {
                  setSent(false)
                  setError(null)
                }}
                className="mt-4 text-sm font-medium text-emerald-700 hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-base font-semibold text-slate-950">Sign in</h1>
              <p className="mt-1 text-sm text-slate-600">
                We&apos;ll email you a link. No password needed.
              </p>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void send()}
                  placeholder="you@northstar.example"
                />
              </div>

              <Button
                className="mt-4 w-full"
                onClick={() => void send()}
                disabled={!email.trim() || sending}
              >
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send sign-in link
              </Button>
            </>
          )}

          {(error || urlError) && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-900">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error ?? urlError}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Access is invite-only. An administrator adds you before you can sign in.
        </p>
      </div>
    </div>
  )
}
