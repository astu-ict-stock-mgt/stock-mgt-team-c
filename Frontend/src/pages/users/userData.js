import api from "../../services/apiClient";

const BASE = "/users";

export const list = async (params = {}) => {
  const response = await api.get(BASE, params);
  return Array.isArray(response) ? response : response?.users || [];
};

export const getById = async (id) => {
  const response = await api.get(`${BASE}/${id}`);
  return response?.user || null;
};

export const create = (data) => api.post(BASE, data);
export const update = (id, data) => api.patch(`${BASE}/${id}`, data);
export const assignRoles = (id, data) => api.put(`${BASE}/${id}/roles`, data);

export const getRoles = async () => {
  const response = await api.get('/roles');
  return Array.isArray(response) ? response : response?.roles || [];
};

export default { list, getById, create, update, assignRoles, getRoles };
