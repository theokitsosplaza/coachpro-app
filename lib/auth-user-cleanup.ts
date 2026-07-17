import 'server-only'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Best-effort deletion of a Supabase auth user that should no longer be
 * referenced by any Client or Coach row (an "orphan"). Call it AFTER the
 * referencing Client row has already been updated/deleted in the DB — so if this
 * fails, the worst case is a harmless lingering orphan, never a live row that
 * points at a deleted auth user.
 *
 * This function NEVER throws and NEVER deletes a still-referenced user:
 *   - If a Coach (or, defensively, another Client) still references the id, it is
 *     SKIPPED and logged. inviteClient's collision guards do not stop a client
 *     from being bound to a *different* coach's identity, so the same auth UUID
 *     can legitimately belong to a Coach — deleting it would break that coach's
 *     login. This guard is the safety-critical part.
 *   - "user not found" (already deleted) is treated as success. Any other delete
 *     error is logged and swallowed, so cleanup can never fail the caller's
 *     primary operation (an email change or a client deletion).
 */
export async function deleteOrphanedAuthUser(authUserId: string): Promise<void> {
  if (!authUserId) return

  try {
    // Never delete an auth user that another row still depends on.
    const [coach, client] = await Promise.all([
      prisma.coach.findFirst({ where: { authUserId }, select: { id: true } }),
      prisma.client.findFirst({ where: { authUserId }, select: { id: true } }),
    ])
    if (coach || client) {
      console.warn('[deleteOrphanedAuthUser] auth user still referenced — skipping delete', {
        authUserId,
        coachId: coach?.id ?? null,
        clientId: client?.id ?? null,
      })
      return
    }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(authUserId)
    if (error) {
      const alreadyGone =
        error.status === 404 || /not[\s_]?found/i.test(error.message)
      if (!alreadyGone) {
        console.warn('[deleteOrphanedAuthUser] delete failed — orphan remains', {
          authUserId,
          status: error.status,
          message: error.message,
        })
      }
    }
  } catch (err) {
    // Guard queries or the admin client itself could throw — never let cleanup
    // take down the caller. The orphan simply remains, reconcilable later.
    console.warn('[deleteOrphanedAuthUser] unexpected error — orphan remains', {
      authUserId,
      err,
    })
  }
}
