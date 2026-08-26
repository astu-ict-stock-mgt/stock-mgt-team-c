// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import {
  useStores, useStoreBinStocks, useExecuteBinTransfer, useMe,
} from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionEmpty } from "@/components/app/section-utils";
import { formatNumber } from "@/lib/utils/format";
import { toast } from "sonner";

export function BinTransfersSection() {
  const me = useMe();
  const permissions = useMemo(() => new Set(me.data?.permissions ?? []), [me.data?.permissions]);
  const roles = useMemo(() => new Set(me.data?.roles ?? []), [me.data?.roles]);
  const isAdmin = roles.has("ADMINISTRATOR");
  const canExecute = isAdmin || permissions.has("bintransfers.execute");

  const { data: stores } = useStores();
  const execute = useExecuteBinTransfer();

  const [storeId, setStoreId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [toBinId, setToBinId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [recent, setRecent] = useState<Array<{ code: string; itemName: string; fromBin: string; toBin: string; quantity: number }>>([]);

  const { data: binStocks } = useStoreBinStocks(storeId || null);

  const bins = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    (binStocks?.items ?? []).forEach((bs) => {
      if (!map.has(bs.bin.id)) map.set(bs.bin.id, bs.bin);
    });
    return Array.from(map.values());
  }, [binStocks?.items]);

  const source = (binStocks?.items ?? []).find((bs) => bs.id === sourceId);
  const maxQty = source ? source.quantity - source.reservedQty : 0;

  const onSubmit = async () => {
    if (!source || !toBinId || quantity <= 0) { toast.error("Select an item/bin, destination bin, and a positive quantity"); return; }
    if (quantity > maxQty) { toast.error(`Available in source bin: ${formatNumber(maxQty)}`); return; }
    try {
      const r = await execute.mutateAsync({ itemId: source.itemId, fromBinId: source.binId, toBinId: toBinId, quantity });
      const toBin = bins.find((b) => b.id === toBinId);
      toast.success("Bin transfer executed");
      setRecent((p) => [{ code: r.code, itemName: source.item.name, fromBin: source.bin.code, toBin: toBin?.code ?? "", quantity }, ...p].slice(0, 8));
      setSourceId(""); setToBinId(""); setQuantity(1);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Bin transfer failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Internal Bin Transfers"
        description="Move stock between bins in the same store — total store stock is unchanged; bin cards record both movements"
        icon={ArrowRightLeft}
      />

      <div className="rounded-md border border-border p-4 mb-6 bg-surface/40">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Store *</Label>
            <Select value={storeId} onValueChange={(v) => { setStoreId(v); setSourceId(""); setToBinId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
              <SelectContent>
                {(stores?.items ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {storeId && (
            <div>
              <Label>Item in source bin *</Label>
              <Select value={sourceId} onValueChange={(v) => { setSourceId(v); setQuantity(1); }}>
                <SelectTrigger><SelectValue placeholder="Select item + bin" /></SelectTrigger>
                <SelectContent>
                  {(binStocks?.items ?? []).filter((bs) => bs.quantity > 0).map((bs) => (
                    <SelectItem key={bs.id} value={bs.id}>
                      {bs.item.code} · {bs.item.name} — {bs.bin.code} (on hand {formatNumber(bs.quantity)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {source && (
            <>
              <div>
                <Label>Destination bin *</Label>
                <Select value={toBinId} onValueChange={setToBinId}>
                  <SelectTrigger><SelectValue placeholder="Select destination bin" /></SelectTrigger>
                  <SelectContent>
                    {bins.filter((b) => b.id !== source.binId).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.code} · {b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity * (max {formatNumber(maxQty)})</Label>
                <Input
                  type="number" min="1" className="max-w-xs"
                  value={quantity || ""}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onSubmit} disabled={!source || !toBinId || !canExecute} className="bg-primary hover:bg-primary-strong text-primary-foreground">
            Execute Bin Transfer
          </Button>
        </div>
      </div>

      {recent.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Recent Bin Transfers</h4>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="astu-table">
              <thead>
                <tr><th>Code</th><th>Item</th><th>From</th><th>To</th><th className="text-right">Qty</th></tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs">{r.code}</td>
                    <td className="text-xs">{r.itemName}</td>
                    <td className="text-xs">{r.fromBin}</td>
                    <td className="text-xs">{r.toBin}</td>
                    <td className="text-right">{formatNumber(r.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {recent.length === 0 && !storeId && (
        <SectionEmpty title="Execute a bin transfer" message="Select a store, choose the item/bin to move, then pick a destination bin in the same store" />
      )}
    </div>
  );
}
          )}