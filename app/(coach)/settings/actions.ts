'use server';
import type { User } from '@supabase/supabase-js';
import type { Prisma } from '@prisma/client';
import { verifyCoachSession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { findAuthUserByEmail } from '@/lib/supabase/find-auth-user';
import { validateQuestions } from '@/lib/questionnaire';
import { CHECK_IN_STATUS } from '@/lib/check-in-status';

// ── saveCoachQuestionnaire ────────────────────────────────────────────────────

export type SaveQuestionnaireState = { error: string } | { success: true }

export async function saveCoachQuestionnaire(
  questionsRaw: unknown,
): Promise<SaveQuestionnaireState> {
  const coach = await verifyCoachSession();

  // Strict validation — a save rejects rather than silently repairing, so a
  // coach never loses a question to a quiet sanitiser. An EMPTY list is valid
  // (deliberately deleted everything).
  const result = validateQuestions(questionsRaw);
  if (!result.ok) return { error: result.error };

  try {
    // Any questionnaire change (delete, add, reorder) can change the AI
    // context for clients who already answered — deleted questions purge from
    // the context immediately. Cached aiSynthesis embedding the OLD context
    // must not survive, so clear non-approved caches for ALL this coach's
    // clients in the same transaction (the language-change pattern). Approved
    // history stays frozen. Both writes land or neither does.
    await prisma.$transaction([
      prisma.coach.update({
        where: { id: coach.id },
        data:  { questionnaire: result.questions as unknown as Prisma.InputJsonValue },
      }),
      prisma.checkIn.updateMany({
        where: { status: { not: CHECK_IN_STATUS.Approved }, client: { coachId: coach.id } },
        data:  { aiSynthesis: null },
      }),
    ]);
  } catch (err) {
    console.error('[saveCoachQuestionnaire]', err);
    return { error: 'Something went wrong saving the questionnaire. Please try again.' };
  }

  return { success: true };
}

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

const normalizeEmail = (e: string) => e.trim().toLowerCase()

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

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const rawEmail = (formData.get('email') as string | null)?.trim() ?? ''

  if (!rawEmail) return { error: 'Email is required.' }
  if (!name)     return { error: 'Name is required.' }

  // Normalize on compare so casing never misroutes an existing user (Supabase
  // stores emails lowercased). Mirrors inviteClient — the two flows must make
  // the same existence decision for the same address.
  const email = normalizeEmail(rawEmail)

  const admin = createAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth-callback`

  let authUserId: string
  let message: string

  // Try to create + invite. The existing-user path is decided by GROUND TRUTH
  // (an authoritative user lookup), NOT by parsing the invite error's message —
  // so which code/string Supabase returns for a duplicate email is irrelevant.
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, { redirectTo })

  if (!inviteError) {
    // Brand-new user: freshly minted id, so no collision with an existing
    // Coach row (or a client) is possible.
    authUserId = invited.user.id
    message = `Invite sent to ${email}.`
  } else {
    // Rate limiting deserves its own message regardless of path.
    if (inviteError.status === 429 || inviteError.code === 'over_email_send_rate_limit') {
      return { error: 'Too many emails sent recently. Please wait a minute and try again.' }
    }

    // Any other invite error → verify whether the user actually exists. If it
    // does, resend a fresh access link; if it doesn't, the error was real.
    let existingUser: User | null
    try {
      existingUser = await findAuthUserByEmail(admin, email)
    } catch (err) {
      console.error('[inviteCoach] listUsers failed:', err)
      return { error: 'Failed to check invite status. Please try again.' }
    }
    if (!existingUser) {
      console.error('[inviteCoach] invite failed and no existing user found:', inviteError.message, {
        status: inviteError.status,
        code: inviteError.code,
      })
      return { error: 'Failed to send invite. Please try again.' }
    }

    // Collision guard 1 — refuse if this identity is a CLIENT's auth user. A
    // coach invite must never repurpose a client's login: it would hand that
    // client's account coach-level access and break their portal sign-in.
    const clientOwner = await prisma.client.findFirst({
      where: { authUserId: existingUser.id },
      select: { id: true },
    })
    if (clientOwner) {
      return { error: 'This email is already linked to a client account. Use a different email.' }
    }

    // Collision guard 2 — refuse if this identity already belongs to a DIFFERENT
    // coach. Coach.authUserId is @unique, so reconnecting it to another coach's
    // row (the upsert below) would trip the constraint and cross-wire accounts.
    const otherCoach = await prisma.coach.findFirst({
      where: { authUserId: existingUser.id, NOT: { email } },
      select: { id: true },
    })
    if (otherCoach) {
      return { error: 'This email is already linked to another coach account. Use a different email.' }
    }

    // Existing users can't be re-invited — send a fresh magic link instead. It
    // lands on /auth-callback, which does setSession then routes to
    // /set-password: the same first-time-password flow the initial invite uses.
    const supabase = await createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    })
    if (otpError) {
      if (otpError.status === 429 || otpError.code === 'over_email_send_rate_limit') {
        return { error: 'Too many emails sent recently. Please wait a minute and try again.' }
      }
      console.error('[inviteCoach] signInWithOtp failed:', otpError.message, {
        status: otpError.status,
        code: otpError.code,
      })
      return { error: 'Failed to send invite. Please try again.' }
    }

    authUserId = existingUser.id
    message = existingUser.email_confirmed_at
      ? `${email} already has access — a fresh sign-in link has been sent.`
      : `Invite resent to ${email} — the previous link has been replaced.`
  }

  // Write/repair the Coach row. Coach.email is @unique so upsert reconnects a
  // half-created coach (row exists, authUserId never landed) to the found auth
  // user rather than duplicating it. Collisions are pre-guarded above, so the
  // unique authUserId constraint should never trip here.
  try {
    await prisma.coach.upsert({
      where:  { email },
      update: { name, authUserId },
      create: { email, name, authUserId },
    })
  } catch (err) {
    console.error('[inviteCoach] DB write failed:', err)
    return { error: 'Invite sent but failed to save coach record. Refresh and try again.' }
  }

  return { success: true, message }
}
