import { apiRequest } from "../../api/client";
const BASE = "/gate-passes";

export const create = async (data) => {
  const result = await apiRequest(BASE, { method: "POST", body: data });
  return normalizeGatePass(result?.data?.gatePass || result?.data);
};

export const verify = async (id, data = {}) => {
  const result = await apiRequest(`${BASE}/${id}/verify`, { method: "POST", body: data });
  return normalizeGatePass(result?.data?.gatePass || result?.data);
};

export const exit = async (id, data = {}) => {
  const result = await apiRequest(`${BASE}/${id}/exit`, { method: "POST", body: data });
  return normalizeGatePass(result?.data?.gatePass || result?.data);
};

export const dispatch = async (id, data = {}) => {
  const result = await apiRequest(`${BASE}/${id}/dispatch`, { method: "POST", body: data });
  return normalizeGatePass(result?.data?.dispatch || result?.data);
};

export const list = async ({ search = "", status = "All", page = 1, limit = 20 } = {}) => {
  const query = { page, limit };
  if (search) query.search = search;
  if (status && status !== "All") {
    query.status = status;
  }
  const result = await apiRequest(BASE, { query });
  const records = Array.isArray(result?.data) ? result.data : result?.data?.gatePasses || [];
  const pagination = result?.data?.pagination || {
    page: 1, limit: 20, total: records.length, totalPages: 1
  };
  return {
    data: records.map(normalizeGatePass),
    pagination
  };
};

export const getById = async (id) => {
  const result = await apiRequest(`${BASE}/${id}`);
  return normalizeGatePass(result?.data?.gatePass || result?.data);
};

export function normalizeGatePass(record = {}) {
  const issueVoucher = record.issueVoucher || {};
  return {
    id: record.id || "",
    gatePassNumber: record.gatePassNumber || "",
    issueVoucherId: record.issueVoucherId || "",
    issueVoucherNo: issueVoucher.voucherNo || issueVoucher.voucherNumber || "",
    vehicleNumber: record.vehicleNumber || "",
    driverName: record.driverName || "",
    destination: record.destination || "",
    status: record.status || "CREATED",
    remarks: record.remarks || "",
    createdAt: record.createdAt ? new Date(record.createdAt).toISOString().split("T")[0] : "",
    verifiedAt: record.verifiedAt ? new Date(record.verifiedAt).toISOString().split("T")[0] : null,
    exitConfirmedAt: record.exitConfirmedAt ? new Date(record.exitConfirmedAt).toISOString().split("T")[0] : null,
    dispatchedAt: record.dispatchedAt ? new Date(record.dispatchedAt).toISOString().split("T")[0] : null,
    issuedTo: record.issuedTo ? record.issuedTo.fullName : "",
    items: Array.isArray(record.items) ? record.items.map(it => ({
      id: it.id,
      itemId: it.itemId,
      itemCode: it.item ? it.item.code : "",
      itemName: it.item ? it.item.name : "",
      quantity: Number(it.quantity || 0)
    })) : [],
    metadata: record
  };
}

