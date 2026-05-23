import axios from "axios";
import { store } from "@/redux/store";
import { logout, setCredentials } from "@/redux/slices/authSlice";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = store.getState().auth.refreshToken;
      if (!refreshToken) {
        store.dispatch(logout());
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh: refreshToken });
        store.dispatch(setCredentials({ access: data.access, refresh: refreshToken }));
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        store.dispatch(logout());
      }
    }
    return Promise.reject(error);
  }
);

export default api;
