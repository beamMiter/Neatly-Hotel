import { PrismaClient } from "@prisma/client";

/**
 * Prisma client — Supabase PostgreSQL via DATABASE_URL.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient();
}

const cached = globalForPrisma.prisma;
export const prisma =
  cached && "hotelInformation" in cached && "promotionCode" in cached
    ? cached
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}
