import api from "../../../services/apiClient";

export async function list(params = {}) {
  const response = await api.get("/roles", params);
  return Array.isArray(response) ? response : response?.roles || [];
}

export async function listPermissions(params = {}) {
  const response = await api.get("/roles/permissions", params);
  return Array.isArray(response) ? response : response?.permissions || [];
}

export async function getById(id) {
  const response = await api.get(`/roles/${id}`);
  return response?.role || null;
}

export async function create(data) {
  return await api.post("/roles", data);
}

export async function update(id, data) {
  return await api.patch(`/roles/${id}`, data);
}

export const roleData = { list, listPermissions, getById, create, update };
export default roleData;
