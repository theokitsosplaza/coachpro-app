'use server';
import { verifyCoachSession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';

export async function updateCoachProfile(fields: {
  name: string;
  email: string;
  businessName: string;
  website: string;
}) {
  const coach = await verifyCoachSession();

  const email = fields.email.trim();
  if (!email) throw new Error('Email is required.');

  await prisma.coach.update({
    where: { id: coach.id },
    data: {
      name:         fields.name.trim()         || null,
      email,
      businessName: fields.businessName.trim() || null,
      website:      fields.website.trim()      || null,
    },
  });
}

// ── inviteCoach ───────────────────────────────────────────────────────────────

export type InviteCoachState = { error: string } | { success: true; message: string } | null

export async function inviteCoach(
  _prev: InviteCoachState,
  formData: FormData,
): Promise<InviteCoachState> {
  await verifyCoachSession()

  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const name  = (formData.get('name')  as string | null)?.trim() ?? ''

  if (!email) return { error: 'Email is required.' }
  if (!name)  return { error: 'Name is required.' }

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth-callback`
  const admin = createAdminClient()

  // Invite first — never write a dangling Coach row if the invite fails.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'A coach with this email is already registered.' }
    }
    console.error('[inviteCoach] inviteUserByEmail failed:', error.message, { status: error.status, name: error.name })
    return { error: 'Failed to send invite. Please try again.' }
  }

  // Coach.email is @unique so upsert is safe: re-inviting the same address
  // repairs the authUserId rather than duplicating the row.
  try {
    await prisma.coach.upsert({
      where:  { email },
      update: { name, authUserId: data.user.id },
      create: { email, name, authUserId: data.user.id },
    })
  } catch (err) {
    console.error('[inviteCoach] DB write failed:', err)
    return { error: 'Invite sent but failed to save coach record. Refresh and try again.' }
  }

  return { success: true, message: `Invite sent to ${email}.` }
}
