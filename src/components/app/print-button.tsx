"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openPrintDocument, usePermissions } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { toast } from "sonner";

/**
 * Opens the print-ready version of a document in a new tab, where the browser's
 * own Print dialog turns it into paper or a PDF.
 *
 * The document endpoint needs the bearer token, so the URL cannot simply be given
 * to an <a href> — openPrintDocument fetches it with auth and writes the result
 * into the new window.
 *
 * Hidden entirely without reports.export rather than shown and refused.
 */
export function PrintDocumentButton({
  kind,
  id,
  label,
}: {
  kind: "receipts" | "issues" | "requisitions";
  id: string;
  label?: string;
}) {
  const { can } = usePermissions();
  const [busy, setBusy] = useState(false);

  if (!can("reports.export")) return null;

  const onClick = async () => {
    setBusy(true);
    try {
      await openPrintDocument(kind, id);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not open the print view");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="h-8" onClick={onClick} disabled={busy}>
      <Printer className="h-3.5 w-3.5" />
      {busy ? "Preparing..." : label ?? "Print"}
    </Button>
  );
}
