/**
 * Company Setup Page (Company Admin)
 * ────────────────────────────────────
 * Lets company admins run the auto-setup to populate:
 *   • Departments, Designations, Teams
 *   • System Roles & RBAC Permissions
 *   • Default Leave Types & Policies
 *   • Demo Users with reporting hierarchy
 *
 * Also shows current setup status.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Users, UserCog, Shield, CalendarDays, GitBranch,
  CheckCircle, AlertCircle, Play, RefreshCw, Key, Briefcase,
  Target, DollarSign, Clock, Lock, Sparkles, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";

// ─── Setup checklist items ─────────────────────────────────────────────────────

const SETUP_ITEMS = [
  { key: "departments",   label: "Departments & Designations", icon: Building2,    desc: "8 default departments with standard job roles" },
  { key: "teams",         label: "Teams",                      icon: Users,        desc: "One team per department linked to departments" },
  { key: "roles",         label: "System Roles",               icon: UserCog,      desc: "8 roles: admin, HR, manager, team lead, employee, etc." },
  { key: "permissions",   label: "RBAC Permissions",           icon: Lock,         desc: "40 module:action permissions auto-assigned to roles" },
  { key: "leave_types",   label: "Leave Types & Policies",     icon: CalendarDays, desc: "EL, CL, SL, FL, ML, PL with monthly/yearly accrual" },
  { key: "users",         label: "Demo Users",                 icon: Key,          desc: "4 demo accounts with employee profiles" },
  { key: "hierarchy",     label: "Reporting Hierarchy",        icon: GitBranch,    desc: "Employee → Manager → Company Admin chain" },
];

const ROLE_META = [
  { role: "company_admin",  icon: Shield,    color: "text-red-600 bg-red-50",      desc: "Full platform control" },
  { role: "hr_admin",       icon: UserCog,   color: "text-purple-600 bg-purple-50", desc: "Employees, leaves, attendance" },
  { role: "payroll_manager",icon: DollarSign,color: "text-emerald-600 bg-emerald-50",desc: "Payroll & salary" },
  { role: "recruiter",      icon: Briefcase, color: "text-orange-600 bg-orange-50", desc: "Jobs, candidates, interviews" },
  { role: "manager",        icon: Users,     color: "text-blue-600 bg-blue-50",    desc: "Team management & approvals" },
  { role: "team_lead",      icon: Target,    color: "text-teal-600 bg-teal-50",    desc: "Limited team management" },
  { role: "employee",       icon: UserCog,   color: "text-gray-600 bg-gray-50",    desc: "Self-service access only" },
  { role: "auditor",        icon: Shield,    color: "text-indigo-600 bg-indigo-50", desc: "Read-only audit access" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SetupResultCard({ result }) {
  if (!result) return null;
  const { summary } = result;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-emerald-900">Setup Complete!</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Departments", summary.departments],
          ["Teams",       summary.teams],
          ["Roles",       summary.roles],
          ["Permissions", summary.permissions],
          ["Leave Types", summary.leave_types],
          ["Demo Users",  summary.users?.length ?? 0],
        ].map(([label, count]) => (
          <div key={label} className="rounded-lg bg-white px-3 py-2 text-center shadow-sm">
            <p className="text-lg font-bold text-emerald-700">{count}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      {summary.users?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-800 mb-2">Demo Credentials</p>
          <div className="space-y-1.5">
            {summary.users.map((u) => (
              <div key={u.email} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
                <span className="font-mono text-gray-700">{u.email}</span>
                <span className="font-mono font-medium text-gray-500">{u.password}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 capitalize">{u.role.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CompanySetupPage() {
  const user = useSelector(selectCurrentUser);
  const qc = useQueryClient();
  const [setupResult, setSetupResult] = useState(null);

  // Fetch current state summary
  const { data: stats } = useQuery({
    queryKey: ["company-setup-stats"],
    queryFn: async () => {
      const [depts, roles, perms, ltypes] = await Promise.all([
        api.get("/employees/departments/?page_size=1").then(r => r.data?.count ?? 0),
        api.get("/rbac/roles/?page_size=1").then(r => r.data?.count ?? 0),
        api.get("/rbac/permissions/?page_size=1").then(r => r.data?.count ?? 0),
        api.get("/leaves/types/?page_size=1").then(r => r.data?.count ?? 0),
      ]);
      return { depts, roles, perms, ltypes };
    },
    staleTime: 10000,
  });

  const setupMutation = useMutation({
    mutationFn: () => api.post(`/companies/${user?.company_id || ""}/setup/`),
    onSuccess: (res) => {
      toast.success("Company auto-setup completed!");
      setSetupResult(res.data);
      qc.invalidateQueries({ queryKey: ["company-setup-stats"] });
      qc.invalidateQueries({ queryKey: ["departments-flat"] });
      qc.invalidateQueries({ queryKey: ["rbac-roles-company"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Setup failed"),
  });

  const seedRbacMutation = useMutation({
    mutationFn: () => api.post("/rbac/seed-permissions/"),
    onSuccess: (res) => {
      toast.success(`Permissions seeded: ${res.data?.total_permissions} perms`);
      qc.invalidateQueries({ queryKey: ["company-setup-stats"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Seed failed"),
  });

  const seedLeavesMutation = useMutation({
    mutationFn: () => api.post("/leaves/policies/ensure_defaults/"),
    onSuccess: () => {
      toast.success("Default leave policies created");
      qc.invalidateQueries({ queryKey: ["company-setup-stats"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  const isConfigured = stats && stats.depts > 0 && stats.roles > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Setup</h1>
          <p className="mt-1 text-sm text-gray-500">
            Auto-configure your company with default departments, roles, permissions, and demo users.
          </p>
        </div>
        <button
          onClick={() => setupMutation.mutate()}
          disabled={setupMutation.isPending}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 shadow-sm"
        >
          {setupMutation.isPending
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Running Setup…</>
            : <><Sparkles className="h-4 w-4" /> Run Auto-Setup</>}
        </button>
      </div>

      {/* Current status */}
      {stats && (
        <div className={`rounded-xl border p-4 ${isConfigured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-center gap-2 mb-3">
            {isConfigured
              ? <CheckCircle className="h-5 w-5 text-emerald-600" />
              : <AlertCircle className="h-5 w-5 text-amber-600" />}
            <p className={`font-semibold text-sm ${isConfigured ? "text-emerald-900" : "text-amber-900"}`}>
              {isConfigured ? "Company is configured" : "Company needs initial setup"}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              ["Departments", stats.depts, stats.depts > 0],
              ["Roles",       stats.roles, stats.roles > 0],
              ["Permissions", stats.perms, stats.perms > 0],
              ["Leave Types", stats.ltypes, stats.ltypes > 0],
            ].map(([label, count, ok]) => (
              <div key={label} className="flex items-center gap-1.5">
                {ok
                  ? <CheckCircle className="h-4 w-4 text-emerald-600" />
                  : <AlertCircle className="h-4 w-4 text-amber-600" />}
                <span className="text-gray-700">{count} {label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup result */}
      {setupResult && <SetupResultCard result={setupResult} />}

      {/* What gets created */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">What Auto-Setup Creates</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SETUP_ITEMS.map(({ key, label, icon: Icon, desc }) => (
            <div key={key} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 bg-gray-50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                <Icon className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roles overview */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">System Roles</h2>
        <p className="text-sm text-gray-500">These roles are created with pre-configured module permissions.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_META.map(({ role, icon: Icon, color, desc }) => (
            <div key={role} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg mb-2 ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-gray-900 capitalize">{role.replace(/_/g, " ")}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Individual Setup Actions</h2>
        <p className="text-sm text-gray-500">Run specific setup steps independently.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => seedRbacMutation.mutate()}
            disabled={seedRbacMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {seedRbacMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Seed RBAC Permissions
          </button>
          <button
            onClick={() => seedLeavesMutation.mutate()}
            disabled={seedLeavesMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {seedLeavesMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
            Create Leave Defaults (EL, CL, SL, FL)
          </button>
        </div>
      </div>
    </div>
  );
}
