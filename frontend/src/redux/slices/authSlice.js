import { createSlice } from "@reduxjs/toolkit";

const TOKEN_KEY = "hrms_access_token";
const REFRESH_KEY = "hrms_refresh_token";
const USER_KEY = "hrms_user";

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

const stored = localStorage.getItem(USER_KEY);

const initialState = {
  user: stored ? JSON.parse(stored) : null,
  accessToken: localStorage.getItem(TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY)),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, { payload }) {
      const { access, refresh } = payload;
      const decoded = parseJwt(access);
      state.accessToken = access;
      state.refreshToken = refresh;
      state.isAuthenticated = true;
      state.user = decoded;
      localStorage.setItem(TOKEN_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
      localStorage.setItem(USER_KEY, JSON.stringify(decoded));
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    },
    updateUser(state, { payload }) {
      state.user = { ...state.user, ...payload };
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    },
  },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsSuperAdmin = (state) => state.auth.user?.is_super_admin;
export const selectUserRoles = (state) => state.auth.user?.roles ?? [];
export const selectCompanyId = (state) => state.auth.user?.company_id;

export default authSlice.reducer;
