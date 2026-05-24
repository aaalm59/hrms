import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  LayoutDashboard, Users, Clock, DollarSign, Calendar,
  Briefcase, TrendingUp, BarChart2, Bell, Settings,
  Building2, Shield, FileText, Activity, Wallet,
  Target, UsersRound, UserCog, Search, KeyRound,
} from "lucide-react";
import { selectUserRoles, selectCurrentUser } from "@/redux/slices/authSlice";
import { clsx } from "clsx";

// ─── Per-role nav definition ──────────────────────────────────────────────────
// Each role has a curated list of nav groups. Roles at the top of the priority
// chain can still reach narrower dashboards via their own section.

const ROLE_NAV = {
  company_admin: [
    {
      label: "Overview",
      items: [
        { to: "/company-admin/dashboard", icon: Building2, label: "Company Dashboard" },
        { to: "/hr/dashboard", icon: LayoutDashboard, label: "HR Overview" },
      ],
    },
    {
      label: "People",
      items: [
        { to: "/employees", icon: Users, label: "Employees" },
        { to: "/teams", icon: UsersRound, label: "Teams" },
        { to: "/recruitment", icon: Briefcase, label: "Recruitment" },
        { to: "/performance", icon: Target, label: "Performance" },
      ],
    },
    {
      label: "Time & Leave",
      items: [
        { to: "/attendance", icon: Clock, label: "Attendance" },
        { to: "/leaves", icon: Calendar, label: "Leaves" },
      ],
    },
    {
      label: "Finance",
      items: [
        { to: "/payroll", icon: DollarSign, label: "Payroll" },
        { to: "/finance", icon: Wallet, label: "Finance & Budget" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/analytics", icon: BarChart2, label: "Analytics" },
        { to: "/reports", icon: FileText, label: "Reports" },
      ],
    },
    {
      label: "System",
      items: [
        { to: "/rbac", icon: KeyRound, label: "Roles & Access" },
        { to: "/audit-logs", icon: Activity, label: "Audit Logs" },
        { to: "/company-admin/setup", icon: UserCog, label: "Company Setup" },
      ],
    },
  ],

  hr_admin: [
    {
      label: "Overview",
      items: [
        { to: "/hr/dashboard", icon: LayoutDashboard, label: "HR Dashboard" },
      ],
    },
    {
      label: "People",
      items: [
        { to: "/employees", icon: Users, label: "Employees" },
        { to: "/teams", icon: UsersRound, label: "Teams" },
        { to: "/recruitment", icon: Briefcase, label: "Recruitment" },
        { to: "/performance", icon: Target, label: "Performance" },
      ],
    },
    {
      label: "Time & Leave",
      items: [
        { to: "/attendance", icon: Clock, label: "Attendance" },
        { to: "/leaves", icon: Calendar, label: "Leaves" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/analytics", icon: BarChart2, label: "Analytics" },
        { to: "/reports", icon: FileText, label: "Reports" },
      ],
    },
    {
      label: "System",
      items: [
        { to: "/rbac", icon: KeyRound, label: "Roles & Access" },
        { to: "/audit-logs", icon: Activity, label: "Audit Logs" },
      ],
    },
  ],

  payroll_manager: [
    {
      label: "Overview",
      items: [
        { to: "/payroll-manager/dashboard", icon: DollarSign, label: "Payroll Dashboard" },
      ],
    },
    {
      label: "Finance",
      items: [
        { to: "/payroll", icon: DollarSign, label: "Payroll" },
        { to: "/finance", icon: Wallet, label: "Finance & Budget" },
      ],
    },
    {
      label: "People",
      items: [
        { to: "/employees", icon: Users, label: "Employees" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/reports", icon: FileText, label: "Reports" },
      ],
    },
  ],

  recruiter: [
    {
      label: "Overview",
      items: [
        { to: "/recruiter/dashboard", icon: Search, label: "Recruitment Dashboard" },
      ],
    },
    {
      label: "Hiring",
      items: [
        { to: "/recruitment", icon: Briefcase, label: "Job Posts & Candidates" },
        { to: "/employees", icon: Users, label: "Employees" },
      ],
    },
  ],

  manager: [
    {
      label: "Overview",
      items: [
        { to: "/manager/dashboard", icon: LayoutDashboard, label: "Team Dashboard" },
      ],
    },
    {
      label: "Team",
      items: [
        { to: "/employees", icon: Users, label: "Team Members" },
        { to: "/teams", icon: UsersRound, label: "Teams" },
        { to: "/performance", icon: Target, label: "Performance" },
      ],
    },
    {
      label: "Time & Leave",
      items: [
        { to: "/attendance", icon: Clock, label: "Attendance" },
        { to: "/leaves", icon: Calendar, label: "Leaves" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/analytics", icon: BarChart2, label: "Analytics" },
      ],
    },
  ],

  team_lead: [
    {
      label: "Overview",
      items: [
        { to: "/team-lead/dashboard", icon: LayoutDashboard, label: "Team Dashboard" },
      ],
    },
    {
      label: "Team",
      items: [
        { to: "/employees", icon: Users, label: "Team Members" },
        { to: "/teams", icon: UsersRound, label: "Teams" },
      ],
    },
    {
      label: "Time & Leave",
      items: [
        { to: "/attendance", icon: Clock, label: "Attendance" },
        { to: "/leaves", icon: Calendar, label: "Leaves" },
      ],
    },
  ],

  employee: [
    {
      label: "Overview",
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "My Dashboard" },
      ],
    },
    {
      label: "Time & Leave",
      items: [
        { to: "/attendance", icon: Clock, label: "Attendance" },
        { to: "/leaves", icon: Calendar, label: "Leaves" },
      ],
    },
  ],
};

// Role priority — first match in user's role list wins for nav selection
const ROLE_PRIORITY = [
  "company_admin",
  "hr_admin",
  "payroll_manager",
  "recruiter",
  "manager",
  "team_lead",
  "employee",
];

function getNavGroups(roles = []) {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return ROLE_NAV[role];
  }
  return ROLE_NAV.employee;
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

function NavItem({ to, icon: Icon, label, sidebarOpen }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
          isActive
            ? "bg-primary-50 text-primary-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )
      }
      title={!sidebarOpen ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <Icon
            className={clsx(
              "w-5 h-5 flex-shrink-0",
              isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"
            )}
          />
          {sidebarOpen && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const roles = useSelector(selectUserRoles);
  const user = useSelector(selectCurrentUser);
  const unreadCount = useSelector((state) => state.notifications.unreadCount);

  const navGroups = getNavGroups(roles);
  const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? "employee";

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100 flex-shrink-0">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        {sidebarOpen && (
          <div className="ml-3">
            <span className="font-bold text-gray-900 text-base">HRMS</span>
            <p className="text-xs text-gray-400 -mt-0.5">Enterprise</p>
          </div>
        )}
      </div>

      {/* User badge */}
      {sidebarOpen && user && (
        <div className="mx-3 mt-3 p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-bold text-xs">
                {(user.full_name || user.email || "U")[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-gray-400 capitalize truncate">
                {primaryRole.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto mt-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            {sidebarOpen && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, icon, label }) => (
                <NavItem key={to} to={to} icon={icon} label={label} sidebarOpen={sidebarOpen} />
              ))}
            </div>
          </div>
        ))}

        {/* Notifications — always visible */}
        <div>
          {sidebarOpen && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">
              Activity
            </p>
          )}
          <NavLink
            to="/notifications"
            title={!sidebarOpen ? "Notifications" : undefined}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative flex-shrink-0">
                  <Bell className={clsx("w-5 h-5", isActive ? "text-primary-600" : "text-gray-400")} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                {sidebarOpen && <span className="truncate">Notifications</span>}
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* Settings footer — always visible */}
      <div className="p-3 border-t border-gray-100">
        <NavLink
          to="/settings"
          title={!sidebarOpen ? "Settings" : undefined}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings className={clsx("w-5 h-5 flex-shrink-0", isActive ? "text-primary-600" : "text-gray-400")} />
              {sidebarOpen && <span>Settings</span>}
            </>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
