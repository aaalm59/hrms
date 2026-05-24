import { usePermission } from "@/hooks/usePermission";

/**
 * Conditionally renders children based on RBAC permissions.
 *
 * Usage:
 *   <PermissionGate module="employees" action="create">
 *     <button>Add Employee</button>
 *   </PermissionGate>
 *
 *   <PermissionGate module="payroll" actions={["create","approve"]} fallback={<span>No access</span>}>
 *     <RunPayrollButton />
 *   </PermissionGate>
 *
 *   <PermissionGate roles={["company_admin","hr_admin"]}>
 *     <AdminOnlyPanel />
 *   </PermissionGate>
 */
export default function PermissionGate({
  module,
  action,
  actions,
  roles: requiredRoles,
  requireAll = false,
  fallback = null,
  children,
}) {
  const { can, canAny, canAll, hasAnyRole, isSuperAdmin } = usePermission();

  if (isSuperAdmin) return children;

  // Role-based gate
  if (requiredRoles?.length) {
    if (!hasAnyRole(requiredRoles)) return fallback;
  }

  // Permission-based gate
  if (module) {
    if (actions?.length) {
      const allowed = requireAll ? canAll(module, actions) : canAny(module, actions);
      if (!allowed) return fallback;
    } else if (action) {
      if (!can(module, action)) return fallback;
    }
  }

  return children;
}
