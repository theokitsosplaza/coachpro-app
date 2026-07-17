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

  // Coaches sign in via signInWithPassword against their SUPABASE AUTH email
  // (see app/login/page.tsx). Updating only Coach.email in the DB would leave the
  // auth email stale — the coach would keep having to log in with the OLD address.
  // So on an email change we keep the auth email in sync via the admin API.
  const emailChanged = email.toLowerCase() !== coach.email.trim().toLowerCase();

  if (emailChanged) {
    // Fail fast if another coach already owns this email (Coach.email is @unique),
    // BEFORE touching Supabase auth — so we never half-apply the change.
    const clash = await prisma.coach.findFirst({
      where: { email, NOT: { id: coach.id } },
      select: { id: true },
    });
    if (clash) throw new Error('That email is already in use by another account.');

    // AUTH-FIRST: update the Supabase auth email; only if it succeeds do we write
    // the DB below. If it fails, we abort WITHOUT changing the DB, so the two can
    // never diverge. (A Coach row with no authUserId has no auth user to sync —
    // the DB update alone is correct; they link on first login.)
    if (coach.authUserId) {
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.updateUserById(coach.authUserId, {
        email,
        // The coach is editing their own authenticated profile, so confirm the
        // new address directly rather than forcing a re-confirmation round-trip
        // that would otherwise leave login on the old email until confirmed.
        email_confirm: true,
      });
      if (error) {
        console.error('[updateCoachProfile] Supabase auth email update failed', {
          coachId: coach.id, status: error.status, message: error.message,
        });
        throw new Error(
          'Could not update your sign-in email — it may already be registered to another account. Your profile was not changed.',
        );
      }
    }
  }

  try {
    await prisma.coach.update({
      where: { id: coach.id },
      data: {
        name:         fields.name.trim()         || null,
        email,
        businessName: fields.businessName.trim() || null,
        website:      fields.website.trim()      || null,
      },
    });
  } catch (err) {
    // Unlikely after the pre-checks, but if the DB write fails AFTER we changed
    // the auth email, revert the auth email (best-effort) so the two can't
    // diverge, then surface a generic error.
    console.error('[updateCoachProfile] DB update failed', { coachId: coach.id, err });
    if (emailChanged && coach.authUserId) {
      await createAdminClient()
        .auth.admin.updateUserById(coach.authUserId, { email: coach.email, email_confirm: true })
        .catch((revertErr) =>
          console.error('[updateCoachProfile] auth email revert FAILED — manual reconcile needed', {
            coachId: coach.id, revertErr,
          }),
        );
    }
    throw new Error('Something went wrong updating your profile. Please try again.');
  }
}

// ── inviteCoach ───────────────────────────────────────────────────────────────

export type InviteCoachState = { error: string } | { success: true; message: string } | null

export async function inviteCoach(
  _prev: InviteCoachState,
  formData: FormData,
): Promise<InviteCoachState> {
  const coach = await verifyCoachSession()
  // Admin-only: reject even a non-admin who calls this action directly. The UI
  // also hides the invite form, but that is only a secondary convenience — this
  // check is the real gate.
  if (!coach.isAdmin) {
    return { error: 'You do not have permission to invite coaches.' }
  }

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
