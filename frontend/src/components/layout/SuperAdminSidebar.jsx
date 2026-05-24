import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  LayoutDashboard, Building2, CreditCard, Activity, Settings,
  Users, Shield, BarChart3, DollarSign, Key, Globe,
  UserCheck, Clock, Calendar, Briefcase, TrendingUp, FileText,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_GROUPS = [
  {
    label: "Platform",
    items: [
      { to: "/super-admin/dashboard", icon: LayoutDashboard, label: "Overview" },
    ],
  },
  {
    label: "Organizations",
    items: [
      { to: "/super-admin/companies", icon: Building2, label: "All Organizations" },
      { to: "/super-admin/company-admins", icon: UserCheck, label: "Company Admins" },
      { to: "/super-admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
    ],
  },
  {
    label: "HRMS Data",
    items: [
      { to: "/super-admin/employees", icon: Users, label: "Employees" },
      { to: "/super-admin/attendance", icon: Clock, label: "Attendance" },
      { to: "/super-admin/leaves", icon: Calendar, label: "Leaves" },
      { to: "/super-admin/payroll-overview", icon: DollarSign, label: "Payroll" },
    ],
  },
  {
    label: "Platform Admin",
    items: [
      { to: "/super-admin/users", icon: Shield, label: "Platform Users" },
      { to: "/super-admin/rbac", icon: Key, label: "Roles & RBAC" },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/super-admin/billing", icon: TrendingUp, label: "Billing & Revenue" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/super-admin/analytics", icon: BarChart3, label: "Platform Analytics" },
    ],
  },
  {
    label: "Security",
    items: [
      { to: "/super-admin/security", icon: FileText, label: "Audit & Logs" },
      { to: "/super-admin/monitoring", icon: Activity, label: "System Monitor" },
    ],
  },
];

function NavItem({ to, icon: Icon, label, sidebarOpen }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-primary-600 text-white"
            : "text-gray-400 hover:bg-gray-800 hover:text-white"
        )
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {sidebarOpen && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default function SuperAdminSidebar() {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 z-30 flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-800 flex-shrink-0">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 relative">
          <Globe className="w-4 h-4 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
        </div>
        {sidebarOpen && (
          <div className="ml-3 min-w-0">
            <p className="text-white font-bold text-sm truncate">Super Admin</p>
            <p className="text-gray-500 text-xs">Platform Control</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {sidebarOpen && (
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-3 mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} {...item} sidebarOpen={sidebarOpen} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <NavLink
          to="/super-admin/settings"
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive ? "bg-primary-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )
          }
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>Platform Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
