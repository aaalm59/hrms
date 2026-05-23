import api from "./api";

export const authService = {
  login: (credentials) => api.post("/auth/login/", credentials),
  logout: (refresh) => api.post("/auth/logout/", { refresh }),
  me: () => api.get("/auth/me/"),
  changePassword: (data) => api.post("/auth/change-password/", data),
  forgotPassword: (email) => api.post("/auth/forgot-password/", { email }),
  resetPassword: (data) => api.post("/auth/reset-password/", data),
};
