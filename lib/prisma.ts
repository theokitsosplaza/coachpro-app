import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Lazy singleton — Pool/PrismaPg/PrismaClient are constructed on first property
// access (inside a request handler), not at module load. This prevents Vercel's
// build workers from triggering DB client init when collecting page data.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    const val = (globalForPrisma.prisma as unknown as Record<string | symbol, unknown>)[prop as string | symbol]
    return typeof val === 'function'
      ? (val as (...args: unknown[]) => unknown).bind(globalForPrisma.prisma)
      : val
  },
})
