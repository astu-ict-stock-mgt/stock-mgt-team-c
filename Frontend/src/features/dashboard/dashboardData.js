import api from "../../services/apiClient";

export async function getOverview(params = {}) {
  const result = await api.get("/dashboard/overview", params);
  return result;
}

export const getDashboard = getOverview;
export default { getOverview, getDashboard };
