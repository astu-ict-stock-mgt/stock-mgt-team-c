import api from "../../services/apiClient";
export const listInventory=(params={})=>api.get("/inventory",params);
export const getInventoryBalance=(itemId,locationId)=>api.get(`/inventory/${itemId}/${locationId}`);
export default {listInventory,getInventoryBalance};
