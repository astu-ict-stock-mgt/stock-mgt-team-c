import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDbUrl: string | undefined;
};

const currentUrl = process.env.DATABASE_URL;

// Re-create the client if the DB URL has changed (e.g. between dev and test environments)
if (globalForPrisma.prisma && globalForPrisma.prismaDbUrl !== currentUrl) {
  // URL changed — disconnect old client and recreate
  globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = db;
globalForPrisma.prismaDbUrl = currentUrl;
