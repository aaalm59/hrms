import { Shield, Check, X, Users, Key, Lock } from "lucide-react";

const ROLES = [
  {
    name: "super_admin",
    label: "Super Admin",
    description: "Full platform access — all companies, all modules",
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  {
    name: "company_admin",
    label: "Company Admin",
    description: "Full company access — all HR modules, settings, billing",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  {
    name: "hr_admin",
    label: "HR Admin",
    description: "HR operations — employees, attendance, leaves, payroll",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  {
    name: "payroll_manager",
    label: "Payroll Manager",
    description: "Payroll processing, salary structures, compliance",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    name: "recruiter",
    label: "Recruiter",
    description: "Job posts, candidates, interviews, hiring pipeline",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  {
    name: "manager",
    label: "Manager",
    description: "Team management — attendance view, leave approvals",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  {
    name: "team_lead",
    label: "Team Lead",
    description: "Limited team management — view-only team data",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  {
    name: "employee",
    label: "Employee",
    description: "Self-service — own attendance, leaves, payslips",
    color: "bg-gray-50 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
  },
];

// Module-level RBAC matrix
const MODULES = [
  "Employees", "Attendance", "Leaves", "Payroll", "Recruitment",
  "Performance", "Analytics", "Settings", "Notifications",
];

// [Create, Read, Update, Delete, Approve, Export]
const PERMISSIONS = {
  super_admin: {
    Employees: [1,1,1,1,1,1], Attendance: [1,1,1,1,1,1], Leaves: [1,1,1,1,1,1],
    Payroll: [1,1,1,1,1,1], Recruitment: [1,1,1,1,1,1], Performance: [1,1,1,1,1,1],
    Analytics: [1,1,1,1,1,1], Settings: [1,1,1,1,1,1], Notifications: [1,1,1,1,1,1],
  },
  company_admin: {
    Employees: [1,1,1,1,1,1], Attendance: [1,1,1,1,1,1], Leaves: [1,1,1,1,1,1],
    Payroll: [1,1,1,1,1,1], Recruitment: [1,1,1,1,1,1], Performance: [1,1,1,1,1,1],
    Analytics: [0,1,0,0,0,1], Settings: [1,1,1,1,0,1], Notifications: [1,1,1,0,0,0],
  },
  hr_admin: {
    Employees: [1,1,1,0,1,1], Attendance: [1,1,1,0,1,1], Leaves: [1,1,1,0,1,1],
    Payroll: [0,1,0,0,0,1], Recruitment: [1,1,1,0,0,1], Performance: [1,1,1,0,1,1],
    Analytics: [0,1,0,0,0,1], Settings: [0,1,0,0,0,0], Notifications: [1,1,0,0,0,0],
  },
  payroll_manager: {
    Employees: [0,1,0,0,0,0], Attendance: [0,1,0,0,0,1], Leaves: [0,1,0,0,0,0],
    Payroll: [1,1,1,0,1,1], Recruitment: [0,0,0,0,0,0], Performance: [0,1,0,0,0,0],
    Analytics: [0,1,0,0,0,1], Settings: [0,0,0,0,0,0], Notifications: [0,1,0,0,0,0],
  },
  recruiter: {
    Employees: [0,1,0,0,0,0], Attendance: [0,0,0,0,0,0], Leaves: [0,0,0,0,0,0],
    Payroll: [0,0,0,0,0,0], Recruitment: [1,1,1,0,1,1], Performance: [0,0,0,0,0,0],
    Analytics: [0,0,0,0,0,0], Settings: [0,0,0,0,0,0], Notifications: [0,1,0,0,0,0],
  },
  manager: {
    Employees: [0,1,0,0,0,0], Attendance: [0,1,0,0,0,0], Leaves: [0,1,0,0,1,0],
    Payroll: [0,0,0,0,0,0], Recruitment: [0,0,0,0,0,0], Performance: [0,1,1,0,1,0],
    Analytics: [0,1,0,0,0,0], Settings: [0,0,0,0,0,0], Notifications: [0,1,0,0,0,0],
  },
  team_lead: {
    Employees: [0,1,0,0,0,0], Attendance: [0,1,0,0,0,0], Leaves: [0,1,0,0,0,0],
    Payroll: [0,0,0,0,0,0], Recruitment: [0,0,0,0,0,0], Performance: [0,1,0,0,0,0],
    Analytics: [0,0,0,0,0,0], Settings: [0,0,0,0,0,0], Notifications: [0,1,0,0,0,0],
  },
  employee: {
    Employees: [0,1,0,0,0,0], Attendance: [0,1,0,0,0,0], Leaves: [1,1,0,1,0,0],
    Payroll: [0,1,0,0,0,0], Recruitment: [0,0,0,0,0,0], Performance: [0,1,1,0,0,0],
    Analytics: [0,0,0,0,0,0], Settings: [0,0,0,0,0,0], Notifications: [0,1,0,0,0,0],
  },
};

const PERM_LABELS = ["Create", "Read", "Update", "Delete", "Approve", "Export"];

export default function RBACPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles & RBAC</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform role hierarchy and permission matrix</p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES.map((role) => (
          <div key={role.name} className={`bg-white rounded-2xl border-2 p-4 ${role.color}`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${role.dot}`} />
              <p className="font-bold text-sm">{role.label}</p>
            </div>
            <p className="text-xs opacity-70 leading-relaxed">{role.description}</p>
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="font-mono text-xs opacity-50">{role.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Permission Matrix</h3>
          <p className="text-xs text-gray-400 mt-1">Module-level access control across all roles</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-32">Module</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 w-20">Action</th>
                {ROLES.map((r) => (
                  <th key={r.name} className="text-center px-2 py-3 font-medium text-gray-500 min-w-16">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${r.dot}`} />
                      <span className="text-xs">{r.label.split(" ")[0]}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((module, mi) => (
                PERM_LABELS.map((perm, pi) => (
                  <tr
                    key={`${module}-${perm}`}
                    className={`border-b border-gray-50 ${pi === 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50`}
                  >
                    {pi === 0 && (
                      <td rowSpan={PERM_LABELS.length} className="px-4 py-2 font-semibold text-gray-800 align-middle border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-gray-400" />
                          {module}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-1.5 text-gray-400 whitespace-nowrap">{perm}</td>
                    {ROLES.map((role) => {
                      const allowed = PERMISSIONS[role.name]?.[module]?.[pi] === 1;
                      return (
                        <td key={role.name} className="text-center px-2 py-1.5">
                          {allowed ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="w-3 h-3 text-gray-200 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Hierarchy */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Role Hierarchy</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {ROLES.map((role, i) => (
            <div key={role.name} className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-xl border font-medium text-xs ${role.color}`}>
                {role.label}
              </span>
              {i < ROLES.length - 1 && <span className="text-gray-300 font-bold">›</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Higher roles inherit all permissions of lower roles in the hierarchy.</p>
      </div>
    </div>
  );
}
