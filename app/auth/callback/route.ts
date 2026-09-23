import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getClient, getOrgId } from '@/lib/initiatives/mapping'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /auth/callback — where every sign-in link lands.
//
// Establishes a session, then binds that auth user to a pre-created `members`
// row by email. There is no self-signup: an email with no member row gets a
// session but no access, and is sent back to /login with a reason rather than
// into an app that would show them nothing.
//
// Two link shapes arrive here, so both are handled rather than making the
// caller know which route to use:
//   ?code=        the PKCE flow, used by signInWithOtp from the login page
//   ?token_hash=  the OTP flow, used by Supabase's own email templates and by
//                 admin-generated links
// A route that understood only one silently rejected the other as "missing its
// code", which reads as an expired link.

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = (url.searchParams.get('type') ?? 'email') as EmailOtpType
  const next = url.searchParams.get('next') ?? '/today'

  const deny = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, url.origin))

  if (!code && !tokenHash) {
    return deny('That sign-in link is missing its token. Request a new one.')
  }

  const supabase = await createServerClient()
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type })

  if (error) {
    return deny('That sign-in link has expired or was already used. Request a new one.')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return deny('Could not read your email from that sign-in link.')

  // Bind auth user -> member. The database function only claims a row whose
  // email already matches and which is active, so this cannot mint access.
  const admin = getClient()
  if (!admin) return deny('The backend is unavailable. Try again shortly.')

  const { data: memberId, error: claimError } = await admin.rpc('claim_member_for_auth_user', {
    p_auth_user_id: user.id,
    p_email: user.email,
  })

  if (claimError) return deny('Could not verify your account. Contact your administrator.')

  if (!memberId) {
    // Signed in with a real email that nobody invited. Sign them straight back
    // out so a half-authenticated session cannot linger.
    await supabase.auth.signOut()
    return deny(
      `${user.email} has not been invited to KPI OS. Ask an administrator to add you first.`,
    )
  }

  // Touch last_seen so an admin can tell who is actually using it.
  const orgId = await getOrgId(admin)
  if (orgId) {
    await admin
      .from('members')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', memberId)
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
