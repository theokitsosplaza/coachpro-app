'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyCoachSession } from '@/lib/dal'
import { deleteOrphanedAuthUser } from '@/lib/auth-user-cleanup'

async function getOwnedClient(clientId: string, coachId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, coachId: true, archivedAt: true },
  })
  if (!client || client.coachId !== coachId) {
    throw new Error('Client not found or access denied.')
  }
  return client
}

export async function archiveClient(clientId: string) {
  const coach = await verifyCoachSession()
  await getOwnedClient(clientId, coach.id)
  await prisma.client.update({
    where: { id: clientId },
    data: { archivedAt: new Date() },
  })
  revalidatePath('/clients')
}

export async function restoreClient(clientId: string) {
  const coach = await verifyCoachSession()
  await getOwnedClient(clientId, coach.id)
  await prisma.client.update({
    where: { id: clientId },
    data: { archivedAt: null },
  })
  revalidatePath('/clients')
}

export async function deleteClient(clientId: string) {
  const coach = await verifyCoachSession()
  const client = await getOwnedClient(clientId, coach.id)
  if (!client.archivedAt) {
    throw new Error('Client must be archived before deleting.')
  }
  // Capture the auth-user link from the deleted row, then clean it up AFTER the
  // row is gone (DB-first). Best-effort — a cleanup failure won't undo the delete,
  // and it skips any auth user still referenced by a Coach.
  const deleted = await prisma.client.delete({
    where: { id: clientId },
    select: { authUserId: true },
  })
  if (deleted.authUserId) {
    await deleteOrphanedAuthUser(deleted.authUserId)
  }
  revalidatePath('/clients')
}
