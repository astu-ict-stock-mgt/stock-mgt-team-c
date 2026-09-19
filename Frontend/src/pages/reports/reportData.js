import { apiFetch } from "../../api/client";

export async function fetchReport(type, params = {}) {
  return await apiFetch(`/reports/${type}`, { query: params });
}
