import { PrismaClient } from "@prisma/client";

/**
 * Prisma client — local SQLite for now; switch DATABASE_URL to Supabase Postgres later.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}
