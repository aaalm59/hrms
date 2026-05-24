import { useSelector } from "react-redux";
import { selectPermissions, selectRbacIsSuperAdmin } from "@/redux/slices/rbacSlice";
import { selectIsSuperAdmin, selectUserRoles } from "@/redux/slices/authSlice";

/**
 * Central permission hook.
 *
 * can("employees", "create")          → single action
 * canAny("payroll", ["view","export"]) → at least one action
 * canAll("finance", ["view","approve"])→ all actions required
 * canModule("employees")              → any action on module
 */
export function usePermission() {
  const permissions = useSelector(selectPermissions);
  const rbacIsSuperAdmin = useSelector(selectRbacIsSuperAdmin);
  const authIsSuperAdmin = useSelector(selectIsSuperAdmin);
  const roles = useSelector(selectUserRoles);

  const isAdmin = authIsSuperAdmin || rbacIsSuperAdmin || permissions.includes("*");

  const can = (module, action) => {
    if (isAdmin) return true;
    return permissions.includes(`${module}:${action}`);
  };

  const canAny = (module, actions) => {
    if (isAdmin) return true;
    return actions.some((a) => permissions.includes(`${module}:${a}`));
  };

  const canAll = (module, actions) => {
    if (isAdmin) return true;
    return actions.every((a) => permissions.includes(`${module}:${a}`));
  };

  const canModule = (module) => {
    if (isAdmin) return true;
    return permissions.some((p) => p.startsWith(`${module}:`));
  };

  const hasRole = (role) => roles.includes(role);
  const hasAnyRole = (roleList) => roleList.some((r) => roles.includes(r));

  return {
    can,
    canAny,
    canAll,
    canModule,
    hasRole,
    hasAnyRole,
    isSuperAdmin: authIsSuperAdmin || rbacIsSuperAdmin,
    permissions,
    roles,
  };
}
