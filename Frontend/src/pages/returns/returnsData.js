import api from "../../services/apiClient";

const BASE = "/returns";

export async function list(params = {}) {
  return api.get(BASE, params);
}

export async function getById(id) {
  return api.get(`${BASE}/${id}`);
}

export async function create(data) {
  return api.post(BASE, data);
}

export async function update(id, data) {
  return api.patch(`${BASE}/${id}`, data);
}

export async function receive(id, data = {}) {
  return api.post(`${BASE}/${id}/receive`, data);
}

export async function inspect(id, data = {}) {
  return api.post(`${BASE}/${id}/inspect`, data);
}

export async function approve(id, data = {}) {
  return api.post(`${BASE}/${id}/approve`, data);
}

export async function reject(id, data = {}) {
  return api.post(`${BASE}/${id}/reject`, data);
}

export const getReturns = list;
export const createReturn = create;
export const getReturnById = getById;
export const updateReturn = update;

export default {
  list,
  getById,
  create,
  update,
  receive,
  inspect,
  approve,
  reject,
  getReturns,
  createReturn,
  getReturnById,
  updateReturn,
};
