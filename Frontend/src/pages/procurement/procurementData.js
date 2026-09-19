import api from "../../services/apiClient";
export const getOverview=(params={})=>api.get("/procurement/overview",params);
export const listRequisitions=(params={})=>api.get("/procurement/requisitions",params);
export const generateReport=(data)=>api.post("/procurement/reports",data);
export default {getOverview,listRequisitions,generateReport};
