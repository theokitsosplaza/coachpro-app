'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifyCoachSession } from '@/lib/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type InviteState = { error: string } | { success: true } | null

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

  let authUserId = client.authUserId

  if (!authUserId) {
    // First invite — create the Supabase auth user and send the invite email.
    // inviteUserByEmail uses implicit flow (tokens in URL fragment), so the
    // redirectTo points at the client-side /portal/auth-callback handler, not
    // the PKCE /api/auth/confirm route.
    const inviteRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/portal/auth-callback`
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.inviteUserByEmail(client.email, {
      redirectTo: inviteRedirectTo,
    })
    if (error) {
      console.error('[inviteClient]', error)
      return { error: 'Failed to send invite. Please try again.' }
    }
    authUserId = data.user.id
  } else {
    // Resend — user already exists; send a fresh magic link via PKCE flow.
    // signInWithOtp with shouldCreateUser: false sends a token_hash link that
    // the server-side /api/auth/confirm route handles correctly.
    const resendRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/portal/auth-callback`
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: client.email,
      options: { shouldCreateUser: false, emailRedirectTo: resendRedirectTo },
    })
    if (error) {
      console.error('[inviteClient resend]', error)
      return { error: 'Failed to resend invite. Please try again.' }
    }
  }

  // Write authUserId back (only meaningful on first invite; harmless on resend).
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
  return { success: true }
}
