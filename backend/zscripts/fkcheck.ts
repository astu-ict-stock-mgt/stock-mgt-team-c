import { prisma } from "../src/config/db";
const j = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? Number(x) : x));
(async () => {
  console.log("foreign_keys pragma:", j(await prisma.$queryRawUnsafe<any[]>("PRAGMA foreign_keys")));
  console.log("orphan fifo layers:", j(await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) AS n FROM FifoLayer f LEFT JOIN StockReceipt r ON r.id = f.receiptId WHERE r.id IS NULL`)));
  console.log("counts:", j(await prisma.$queryRawUnsafe<any[]>(
    `SELECT (SELECT COUNT(*) FROM FifoLayer) AS layers, (SELECT COUNT(*) FROM StockTransfer) AS transfers, (SELECT COUNT(*) FROM StockReceipt) AS receipts`)));
  await prisma.$disconnect();
})();
