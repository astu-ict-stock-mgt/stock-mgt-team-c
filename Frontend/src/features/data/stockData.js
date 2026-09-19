import api from "../../services/apiClient";

const BASE = "/inventory";

export async function list(params = {}) { return api.get(BASE, params); }
export async function getById(id) { return api.get(`${BASE}/${id}`); }
export async function create(data) { return api.post(BASE, data); }
export async function update(id, data) { return api.patch(`${BASE}/${id}`, data); }
export async function remove(id) { return api.delete(`${BASE}/${id}`); }

export async function getInventory(params = {}) { return api.get(BASE, params); }
export async function getBalance(itemId, locationId) { return api.get(`${BASE}/${itemId}/${locationId}`); }
export const listInventory = getInventory;

export const stockItems = [];
export const binCards = [];

export const stockData = { list, getById, create, update, remove };
export default stockData;
