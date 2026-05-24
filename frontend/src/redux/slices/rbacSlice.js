import { createSlice } from "@reduxjs/toolkit";
import { logout } from "./authSlice";

const PERMS_KEY = "hrms_permissions";

const initialState = {
  permissions: [],
  roles: [],
  isSuperAdmin: false,
  loaded: false,
};

const rbacSlice = createSlice({
  name: "rbac",
  initialState,
  reducers: {
    setPermissions(state, { payload }) {
      state.permissions = payload.permissions ?? [];
      state.roles = payload.roles ?? [];
      state.isSuperAdmin = payload.is_super_admin ?? false;
      state.loaded = true;
      localStorage.setItem(PERMS_KEY, JSON.stringify(payload));
    },
    clearPermissions(state) {
      state.permissions = [];
      state.roles = [];
      state.isSuperAdmin = false;
      state.loaded = false;
      localStorage.removeItem(PERMS_KEY);
    },
    loadPersistedPermissions(state) {
      try {
        const stored = localStorage.getItem(PERMS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          state.permissions = parsed.permissions ?? [];
          state.roles = parsed.roles ?? [];
          state.isSuperAdmin = parsed.is_super_admin ?? false;
          state.loaded = true;
        }
      } catch {
        localStorage.removeItem(PERMS_KEY);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, (state) => {
      state.permissions = [];
      state.roles = [];
      state.isSuperAdmin = false;
      state.loaded = false;
      localStorage.removeItem(PERMS_KEY);
    });
  },
});

export const { setPermissions, clearPermissions, loadPersistedPermissions } = rbacSlice.actions;

// Selectors
export const selectPermissions = (state) => state.rbac.permissions;
export const selectPermissionsLoaded = (state) => state.rbac.loaded;
export const selectRbacRoles = (state) => state.rbac.roles;
export const selectRbacIsSuperAdmin = (state) => state.rbac.isSuperAdmin;

export default rbacSlice.reducer;
