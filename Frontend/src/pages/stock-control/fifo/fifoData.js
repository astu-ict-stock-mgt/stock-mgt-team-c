import { apiFetch } from "../../../api/client";

export async function getItemValuation(itemId, locationId, asOfDate) {
  const query = asOfDate ? { asOfDate } : {};
  return await apiFetch(`/stock-control/valuation/${itemId}/${locationId}`, { query });
}
