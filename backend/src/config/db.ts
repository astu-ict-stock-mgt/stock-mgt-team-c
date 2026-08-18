import { PrismaClient } from "@prisma/client";
import { config } from "../config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDbUrl: string | undefined;
};

const currentUrl = config.databaseUrl;

if (globalForPrisma.prisma && globalForPrisma.prismaDbUrl !== currentUrl) {
  globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isProd ? ["error"] : ["warn", "error"],
  });

globalForPrisma.prisma = prisma;
globalForPrisma.prismaDbUrl = currentUrl;
