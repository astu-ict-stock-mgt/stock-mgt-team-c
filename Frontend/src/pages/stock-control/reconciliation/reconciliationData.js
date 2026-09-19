import { apiFetch } from "../../../api/client";

export async function reconcile(data) {
  return await apiFetch("/stock-control/reconciliation", {
    method: "POST",
    body: data,
  });
}
