import api from "../../services/apiClient";

const BASE = "/receiving";

export async function list(params = {}) { return api.get(BASE, params); }
export async function getById(id) { return api.get(`${BASE}/${id}`); }
export async function create(data) { return api.post(BASE, data); }
export async function update(id, data) { return api.patch(`${BASE}/${id}`, data); }
export async function remove(id) { return api.delete(`${BASE}/${id}`); }

export async function verify(id,data={}) { return api.post(`${BASE}/${id}/verify`,data); }
export async function createInspection(data) { return api.post(`${BASE}/inspections`,data); }
export async function evaluateInspection(id,data) { return api.post(`${BASE}/inspections/${id}/evaluate`,data); }
export async function listGRNs(params={}) { return api.get(`${BASE}/grn/list`,params); }

export const receivingData = { list, getById, create, update, remove };
export default receivingData;
