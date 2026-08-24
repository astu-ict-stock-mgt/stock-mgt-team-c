import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.stockTakeItem.deleteMany({});
  await prisma.stockTake.deleteMany({});
  console.log('Cleared StockTake and StockTakeItem');
}

main().catch(console.error).finally(() => prisma.$disconnect());
