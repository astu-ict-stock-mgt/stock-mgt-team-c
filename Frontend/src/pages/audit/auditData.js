import { apiFetch } from "../../api/client";

export const list = (params = {}) => apiFetch("/audit-logs", { query: params });
export const getAuditUsers = () => apiFetch("/audit-logs/users");

export default { list, getAuditUsers };
