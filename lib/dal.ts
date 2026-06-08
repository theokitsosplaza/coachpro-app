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
 *   asymmetric keys). Redirects to /login if the token is absent or invalid.
 * - Looks up the Coach row by authUserId (the Supabase auth UUID). Redirects
 *   to /login if no matching Coach exists (e.g. auth user without a Coach row).
 * - Wrapped in React cache() so within a single render pass the DB is only
 *   hit once even if multiple components call this function.
 *
 * Returns the full Coach record so callers have coach.id available for
 * coachId-scoped Prisma queries.
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
    redirect('/portal/login');
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
    redirect('/login');
  }

  return coach;
});
