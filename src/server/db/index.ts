import { PrismaClient } from "@prisma/client";

/**
 * Prisma client — Supabase PostgreSQL via DATABASE_URL.
 */
// Bump when `prisma generate` must be picked up in dev — the global
// singleton otherwise keeps a stale engine (e.g. customerId non-null).
const PRISMA_CLIENT_GENERATION = "booking-customer-id-nullable-v1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClientGeneration?: string;
};

function createPrismaClient() {
  return new PrismaClient();
}

function isUsablePrismaClient(client: PrismaClient): boolean {
  return "hotelInformation" in client && "promotionCode" in client;
}

const cached = globalForPrisma.prisma;
export const prisma =
  cached &&
  globalForPrisma.prismaClientGeneration === PRISMA_CLIENT_GENERATION &&
  isUsablePrismaClient(cached)
    ? cached
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientGeneration = PRISMA_CLIENT_GENERATION;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}
