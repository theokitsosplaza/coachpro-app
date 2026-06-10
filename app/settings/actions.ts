'use server';
import { verifyCoachSession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

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
