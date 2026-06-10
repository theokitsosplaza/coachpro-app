'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifyCoachSession } from '@/lib/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type InviteState = { error: string } | { success: true; message: string } | null

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

  const admin = createAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/portal/auth-callback`

  // Look up whether a Supabase auth user already exists for this email before
  // deciding which path to take. This is the only reliable way to detect the
  // mismatch state where Supabase has the user but Client.authUserId is null.
  const { data: listData, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) {
    console.error('[inviteClient] listUsers failed:', listError.message, { status: listError.status })
    return { error: 'Failed to check invite status. Please try again.' }
  }

  const existingUser = listData.users.find((u) => u.email === client.email) ?? null

  let authUserId: string
  let message: string

  if (!existingUser) {
    // Branch A: no Supabase auth user — create one and send the invite email.
    // Also handles the stale-link edge case: if a previously linked Supabase
    // user was deleted, the lookup returns null here and we recreate cleanly.
    const { data, error } = await admin.auth.admin.inviteUserByEmail(client.email, {
      redirectTo,
    })
    if (error) {
      console.error('[inviteClient] inviteUserByEmail failed:', error.message, { status: error.status, name: error.name })
      return { error: 'Failed to send invite. Please try again.' }
    }
    authUserId = data.user.id
    message = 'Invite sent!'
  } else {
    // Branch B: Supabase user already exists — send a fresh magic link.
    // Covers: normal resend, mismatch (authUserId null in our DB), and
    // fully-registered clients who need a new login link.
    // Setting authUserId from the lookup result repairs any DB mismatch.
    authUserId = existingUser.id

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: client.email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    })
    if (error) {
      console.error('[inviteClient] signInWithOtp failed:', error.message, { status: error.status, name: error.name })
      return { error: 'Failed to send invite. Please try again.' }
    }

    message = existingUser.email_confirmed_at
      ? 'Client already has portal access — a login link has been sent.'
      : 'Invite resent — the previous link has been replaced.'
  }

  // Always write authUserId: repairs DB mismatches and keeps the link current.
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
