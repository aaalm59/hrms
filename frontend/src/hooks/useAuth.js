import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectIsSuperAdmin,
  selectUserRoles,
  setCredentials,
  logout,
} from "@/redux/slices/authSlice";
import { authService } from "@/services/authService";

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const roles = useSelector(selectUserRoles);

  const login = async (credentials) => {
    const { data } = await authService.login(credentials);
    dispatch(setCredentials(data));
    const decoded = parseJwt(data.access);
    const nextRoles = decoded.roles ?? [];
    // Route based on role
    if (decoded.is_super_admin) {
      navigate("/super-admin/dashboard");
    } else if (nextRoles.includes("company_admin")) {
      navigate("/company-admin/dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  const logoutUser = async () => {
    try {
      const refresh = localStorage.getItem("hrms_refresh_token");
      await authService.logout(refresh);
    } finally {
      dispatch(logout());
      navigate("/auth/login");
    }
  };

  const hasRole = (role) => roles.includes(role);
  const hasAnyRole = (roleList) => roleList.some((r) => roles.includes(r));

  return {
    user,
    isAuthenticated,
    isSuperAdmin,
    roles,
    login,
    logout: logoutUser,
    hasRole,
    hasAnyRole,
  };
}
