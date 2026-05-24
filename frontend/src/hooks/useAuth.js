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

// Role priority order — first match wins
const ROLE_DASHBOARD = [
  { role: "company_admin",    path: "/company-admin/dashboard" },
  { role: "hr_admin",         path: "/hr/dashboard" },
  { role: "payroll_manager",  path: "/payroll-manager/dashboard" },
  { role: "recruiter",        path: "/recruiter/dashboard" },
  { role: "manager",          path: "/manager/dashboard" },
  { role: "team_lead",        path: "/team-lead/dashboard" },
];

export function getDashboardPath(roles = [], isSuperAdmin = false) {
  if (isSuperAdmin) return "/super-admin/dashboard";
  for (const { role, path } of ROLE_DASHBOARD) {
    if (roles.includes(role)) return path;
  }
  return "/dashboard";
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
    navigate(getDashboardPath(nextRoles, decoded.is_super_admin));
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
    dashboardPath: getDashboardPath(roles, isSuperAdmin),
  };
}
