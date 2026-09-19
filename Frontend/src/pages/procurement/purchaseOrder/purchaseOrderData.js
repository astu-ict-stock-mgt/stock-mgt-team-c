import api from "../../../services/apiClient";
const BASE="/procurement/purchase-orders";
export const list=(params={})=>api.get(BASE,params);
export const getById=id=>api.get(`${BASE}/${id}`);
export const update=(id,data)=>api.patch(`${BASE}/${id}`,data);
export const createFromRequisition=(requisitionId,data)=>api.post(`/procurement/requisitions/${requisitionId}/purchase-order`,data);
export default {list,getById,update,createFromRequisition};
