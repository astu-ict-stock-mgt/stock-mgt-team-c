import { prisma } from "../src/config/db";
import { createTransfer } from "../src/services/transfers";
(async () => {
  const stores = await prisma.store.findMany({ where: { deletedAt: null }, select: { id: true, code: true } });
  const stock = await prisma.storeStock.findFirst({
    where: { quantity: { gt: 1 } },
    include: { item: { select: { code: true } }, store: { select: { code: true } } },
  });
  console.log("stores:", stores.map((s) => s.code).join(", "));
  if (!stock) { console.log("no stock on hand — cannot probe"); await prisma.$disconnect(); return; }
  const dest = stores.find((s) => s.id !== stock.storeId);
  if (!dest) { console.log("only one store — cannot probe"); await prisma.$disconnect(); return; }
  const user = await prisma.user.findFirst({ where: { status: "ACTIVE" }, select: { id: true } });
  console.log(`probing transfer of 1 x ${stock.item.code} from ${stock.store.code} -> ${dest.code}`);
  try {
    const t = await createTransfer({
      fromStoreId: stock.storeId, toStoreId: dest.id,
      transferredById: user!.id, notes: "FK probe",
      items: [{ itemId: stock.itemId, quantity: 1 }],
    });
    console.log("RESULT: transfer succeeded", (t as any).code);
  } catch (e: any) {
    console.log("RESULT: transfer FAILED ->", e?.code ?? e?.name, "|", String(e?.message).split("\n")[0]);
  }
  await prisma.$disconnect();
})();
