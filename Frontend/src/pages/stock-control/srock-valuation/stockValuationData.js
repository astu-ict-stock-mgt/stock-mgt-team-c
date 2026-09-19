import { apiFetch } from "../../../api/client";

export async function listValuation(params = {}) {
  // Convert standard date string to ISO if necessary, or pass as is.
  return await apiFetch("/stock-control/valuation", { query: params });
}

export async function getItemValuation(itemId, locationId, asOfDate) {
  const query = asOfDate ? { asOfDate } : {};
  return await apiFetch(`/stock-control/valuation/${itemId}/${locationId}`, { query });
}
