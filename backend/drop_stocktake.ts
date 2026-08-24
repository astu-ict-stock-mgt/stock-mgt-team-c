import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "StockTakeItem" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "StockTake" CASCADE');
  console.log('Dropped StockTake tables');
}

main().catch(console.error).finally(() => prisma.$disconnect());
