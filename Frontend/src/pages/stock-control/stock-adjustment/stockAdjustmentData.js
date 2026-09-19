import { apiFetch } from "../../../api/client";

const BASE = "/stock-control/adjustments";

export function normalizeAdjustment(record) {
  if (!record) return null;
  return {
    ...record,
    number: record.adjustmentNumber || "",
    item: record.item?.name || "Unknown Item",
    location: record.location?.name || "Unknown Location",
    requestedBy: record.requestedBy?.fullName || "Unknown Requester",
    approvedBy: record.approvedBy?.fullName || null,
    date: record.requestedAt ? new Date(record.requestedAt).toLocaleDateString() : "",
    status: record.status === "PENDING_APPROVAL" ? "Pending Authorization" :
            record.status === "APPROVED" ? "Approved" :
            record.status === "REJECTED" ? "Rejected" :
            record.status,
  };
}

export async function listAdjustments(params = {}) {
  const result = await apiFetch(BASE, { query: params });
  const records = result?.data?.adjustments || [];
  return records.map(normalizeAdjustment);
}

export async function getAdjustmentById(id) {
  const result = await apiFetch(`${BASE}/${id}`);
  return normalizeAdjustment(result?.data?.adjustment);
}

export async function createAdjustment(data) {
  const result = await apiFetch(BASE, { method: "POST", body: data });
  return normalizeAdjustment(result?.data?.adjustment);
}

export async function approveAdjustment(id, data = {}) {
  const result = await apiFetch(`${BASE}/${id}/approve`, { method: "POST", body: data });
  return normalizeAdjustment(result?.data?.adjustment);
}

export async function rejectAdjustment(id, data = {}) {
  const result = await apiFetch(`${BASE}/${id}/reject`, { method: "POST", body: data });
  return normalizeAdjustment(result?.data?.adjustment);
}
