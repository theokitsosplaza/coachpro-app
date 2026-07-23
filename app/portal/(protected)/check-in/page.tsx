import Link from 'next/link'
import { verifyClientSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { PortalCheckInForm } from './CheckInForm'

export default async function CheckInPage() {
  const client = await verifyClientSession()

  const lastCheckIn = await prisma.checkIn.findFirst({
    where: { clientId: client.id },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    select: {
      weight: true,
      loggedProtein: true,
      loggedCarbs: true,
      loggedFats: true,
      sleepScore: true,
      fatigueScore: true,
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em] text-foreground">
            Weekly check-in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lastCheckIn
              ? "Pre-filled from your last check-in — update what's changed."
              : 'Fill in your stats for this week.'}
          </p>
        </div>
        <Link
          href="/portal"
          className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Dashboard
        </Link>
      </div>

      <PortalCheckInForm lastCheckIn={lastCheckIn} />
    </div>
  )
}
