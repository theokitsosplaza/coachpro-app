import 'server-only'
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Locate an existing Supabase auth user by email, paginating through ALL pages
 * (a naive single-page scan only sees the first 1000). Used as the
 * authoritative existence check when inviteUserByEmail fails — supabase-js v2
 * has no getUserByEmail, and callers need the user id to store on their row.
 *
 * `email` MUST already be normalized to lowercase by the caller: Supabase stores
 * emails lowercased, and the comparison below is an exact match against that.
 *
 * Shared by both invite flows — inviteClient (app/(coach)/clients/[id]/actions.ts)
 * and inviteCoach (app/(coach)/settings/actions.ts) — so their resend paths make
 * the identical existence decision. Lives here (not in either 'use server' file)
 * so it can be imported without being exposed as a client-callable Server Action.
 */
export async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<User | null> {
  const perPage = 1000
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < perPage) return null // reached the last page
  }
}
