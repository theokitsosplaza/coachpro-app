'use server'

import { revalidatePath } from 'next/cache'
import type { User } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { verifyCoachSession } from '@/lib/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { findAuthUserByEmail } from '@/lib/supabase/find-auth-user'

export type InviteState = { error: string } | { success: true; message: string } | null

const normalizeEmail = (e: string) => e.trim().toLowerCase()

export async function inviteClient(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const coach = await verifyCoachSession()
  const clientId = formData.get('clientId') as string

  // Ownership check: only the client's own coach can send an invite.
  const client = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { id: true, email: true, authUserId: true },
  })
  if (!client) return { error: 'Client not found.' }
  if (!client.email) return { error: 'This client has no email address.' }

  // Normalize on compare so casing never misroutes an existing user (Supabase
  // stores emails lowercased). Covers legacy rows saved before normalization.
  const email = normalizeEmail(client.email)

  // Collision guard 1 — never bind a client to the coach's own auth identity.
  if (coach.email && normalizeEmail(coach.email) === email) {
    return {
      error: 'This email belongs to your coach account. Use a different email for the client.',
    }
  }

  const admin = createAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/portal/auth-callback`

  let authUserId: string
  let message: string

  // Try to create + invite. The existing-user path is decided by GROUND TRUTH
  // (an authoritative user lookup), not by parsing the invite error's shape —
  // so which code Supabase returns for a duplicate email is irrelevant.
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, { redirectTo })

  if (!inviteError) {
    // Brand-new user: freshly minted id, so no collision with an existing
    // Client row (or the coach) is possible.
    authUserId = invited.user.id
    message = 'Invite sent!'
  } else {
    // Rate limiting deserves its own message regardless of path.
    if (inviteError.status === 429 || inviteError.code === 'over_email_send_rate_limit') {
      return { error: 'Too many emails sent recently. Please wait a minute and try again.' }
    }

    // Any other invite error → verify whether the user actually exists. If it
    // does, fall back to a magic link; if it doesn't, the error was real.
    let existingUser: User | null
    try {
      existingUser = await findAuthUserByEmail(admin, email)
    } catch (err) {
      console.error('[inviteClient] listUsers failed:', err)
      return { error: 'Failed to check invite status. Please try again.' }
    }
    if (!existingUser) {
      console.error('[inviteClient] invite failed and no existing user found:', inviteError.message, {
        status: inviteError.status,
        code: inviteError.code,
      })
      return { error: 'Failed to send invite. Please try again.' }
    }

    // Collision guard 2 — refuse if this identity already belongs to a DIFFERENT
    // client. Prevents two Client rows sharing one authUserId (unique-constraint
    // crash + cross-account data leak). Never half-complete.
    const other = await prisma.client.findFirst({
      where: { authUserId: existingUser.id, NOT: { id: client.id } },
      select: { id: true },
    })
    if (other) {
      return { error: 'This email is already linked to another client. Use a different email.' }
    }

    // Existing users can't be re-invited — send a fresh magic link instead.
    const supabase = await createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    })
    if (otpError) {
      if (otpError.status === 429 || otpError.code === 'over_email_send_rate_limit') {
        return { error: 'Too many emails sent recently. Please wait a minute and try again.' }
      }
      console.error('[inviteClient] signInWithOtp failed:', otpError.message, {
        status: otpError.status,
        code: otpError.code,
      })
      return { error: 'Failed to send invite. Please try again.' }
    }

    authUserId = existingUser.id
    message = existingUser.email_confirmed_at
      ? 'Client already has portal access — a login link has been sent.'
      : 'Invite resent — the previous link has been replaced.'
  }

  // Write/repair the link. Collisions are pre-guarded above, so the unique
  // constraint should never trip here; the catch stays as a safety net.
  try {
    await prisma.client.update({
      where: { id: client.id },
      data: { authUserId },
    })
  } catch (err) {
    console.error('[inviteClient] DB write failed', err)
    return { error: 'Invite sent but failed to save record. Refresh and try again.' }
  }

  revalidatePath(`/clients/${clientId}`)
  return { success: true, message }
}
