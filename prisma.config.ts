import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // Prisma CLI (db push / introspect) needs a direct, session-mode
    // connection. Supabase's DATABASE_URL is the transaction pooler (6543),
    // which can't hold the advisory lock the schema engine takes and hangs.
    // DIRECT_URL is the 5432 session connection; the app runtime keeps using
    // the pooled DATABASE_URL via the driver adapter in lib/prisma.ts.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }
})