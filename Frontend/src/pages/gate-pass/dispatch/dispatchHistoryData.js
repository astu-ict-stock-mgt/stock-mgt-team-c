import { apiRequest } from "../../../api/client";
const BASE = "/gate-passes";

export const create = async (data) => {
  return await apiRequest(BASE, { method: "POST", body: data });
};
export const verify = async (id, data = {}) => {
  return await apiRequest(`${BASE}/${id}/verify`, { method: "POST", body: data });
};
export const exit = async (id, data = {}) => {
  return await apiRequest(`${BASE}/${id}/exit`, { method: "POST", body: data });
};
export const dispatch = async (id, data = {}) => {
  return await apiRequest(`${BASE}/${id}/dispatch`, { method: "POST", body: data });
};

export const listDispatches = async ({ search = "", status = "All", startDate = "", endDate = "", page = 1, limit = 20 } = {}) => {
  const query = { page, limit };
  if (search) query.search = search;
  if (status && status !== "All") {
    query.status = status;
  }
  if (startDate) query.startDate = startDate;
  if (endDate) query.endDate = endDate;
  
  const result = await apiRequest(`${BASE}/dispatches`, { query });
  
  const records = Array.isArray(result?.data) ? result.data : result?.data?.data || [];
  const data = records.map(normalizeDispatchRecord);
  const pagination = result?.data?.pagination || result?.pagination || {
    page: 1, limit: 20, total: records.length, totalPages: 1
  };
  
  return { data, pagination };
};

export const getDispatchById = async (id) => {
  const result = await apiRequest(`${BASE}/dispatches/${id}`);
  return normalizeDispatchRecord(result?.data?.dispatch || result?.data);
};

export function normalizeDispatchRecord(record = {}) {
  const gatePass = record.gatePass || {};
  const issueVoucher = gatePass.issueVoucher || {};
  return {
    id: record.id || "",
    gatePassId: record.gatePassId || "",
    gatePassNumber: gatePass.gatePassNumber || "",
    issueVoucherNo: issueVoucher.voucherNo || issueVoucher.voucherNumber || "",
    vehicleNumber: record.vehicleNumber || gatePass.vehicleNumber || "",
    driverName: record.driverName || gatePass.driverName || "",
    destination: record.destination || gatePass.destination || "",
    status: gatePass.status || "DISPATCH_RECORDED",
    remarks: record.remarks || "",
    dispatchedAt: record.dispatchedAt ? new Date(record.dispatchedAt).toISOString().split("T")[0] : "",
    securityOfficerName: record.securityOfficer ? record.securityOfficer.fullName : "",
    metadata: record
  };
}
