import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * Verifies the coach session on every protected server request.
 *
 * - Calls getClaims() which validates the JWT signature against Supabase's
 *   published public keys (local crypto check — no network round-trip for
 *   asymmetric keys). Redirects to the login page if the token is absent or
 *   invalid (a genuinely unauthenticated request — nothing to clear).
 * - Looks up the row by authUserId (the Supabase auth UUID). If the caller is
 *   authenticated but has NO matching row (e.g. an orphaned auth user, or an
 *   invite whose row insert failed), that is a half-authenticated dead-end:
 *   sending them to the login page while they still hold a valid session cookie
 *   strands them on a login screen they can't get past (and is one "redirect
 *   already-authed users" guard away from an infinite loop). So instead we
 *   redirect through /api/auth/signout, which CLEARS the session cookie (a
 *   Route Handler can write cookies; Server Component render cannot) and lands
 *   them on the login page with ?error=no_account so they see why.
 * - Wrapped in React cache() so within a single render pass the DB is only
 *   hit once even if multiple components call this function.
 *
 * Returns the full record so callers have the id available for
 * ownership-scoped Prisma queries.
 */
export const verifyClientSession = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) {
    redirect('/portal/login');
  }

  const client = await prisma.client.findUnique({
    where: { authUserId: data.claims.sub },
  });

  if (!client) {
    // Authenticated but no Client row: clear the session, then land on the
    // portal login with an explanation (see the header comment).
    redirect('/api/auth/signout?type=client');
  }

  if (client.archivedAt) {
    redirect('/portal/suspended');
  }

  return client;
});

export const verifyCoachSession = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) {
    redirect('/login');
  }

  const coach = await prisma.coach.findUnique({
    where: { authUserId: data.claims.sub },
  });

  if (!coach) {
    // Authenticated but no Coach row: clear the session, then land on the
    // login page with an explanation (see the header comment).
    redirect('/api/auth/signout?type=coach');
  }

  return coach;
});
