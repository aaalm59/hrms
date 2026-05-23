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
    // Route based on role
    if (data.is_super_admin) {
      navigate("/super-admin/dashboard");
    } else if (roles.includes("company_admin")) {
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
