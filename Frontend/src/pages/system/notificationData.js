import api from "../../services/apiClient";
export const list=(params={})=>api.get("/notifications",params);
export const markRead=id=>api.patch(`/notifications/${id}/read`,{});
export const markAllRead=()=>api.patch("/notifications/read-all",{});
export default {list,markRead,markAllRead};
