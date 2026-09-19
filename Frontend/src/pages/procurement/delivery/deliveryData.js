import api from "../../../services/apiClient";
const BASE="/procurement/deliveries";
export const list=(params={})=>api.get(BASE,params);
export const getById=id=>api.get(`${BASE}/${id}`);
export const create=data=>api.post(BASE,data);
export const update=(id,data)=>api.patch(`${BASE}/${id}`,data);
export default {list,getById,create,update};
