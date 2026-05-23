import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  LayoutDashboard, Users, Clock, DollarSign, Calendar,
  Briefcase, TrendingUp, BarChart2, Bell, Settings,
  Building2, ChevronDown, Package, Ticket, BookOpen,
  Shield, FileText
} from "lucide-react";
import { selectUserRoles } from "@/redux/slices/authSlice";
import { clsx } from "clsx";
import { useState } from "react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "My Dashboard", roles: [] },
      { to: "/hr/dashboard", icon: Building2, label: "HR Dashboard", roles: ["hr_admin", "company_admin"] },
      { to: "/company-admin/dashboard", icon: Building2, label: "Company Dashboard", roles: ["company_admin"] },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/employees", icon: Users, label: "Employees", roles: ["hr_admin", "company_admin", "manager"] },
      { to: "/recruitment", icon: Briefcase, label: "Recruitment", roles: ["recruiter", "hr_admin", "company_admin"] },
      { to: "/performance", icon: TrendingUp, label: "Performance", roles: ["manager", "hr_admin", "company_admin"] },
    ],
  },
  {
    label: "Time & Leave",
    items: [
      { to: "/attendance", icon: Clock, label: "Attendance", roles: [] },
      { to: "/leaves", icon: Calendar, label: "Leaves", roles: [] },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/payroll", icon: DollarSign, label: "Payroll", roles: ["payroll_manager", "company_admin", "hr_admin"] },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/analytics", icon: BarChart2, label: "Analytics", roles: ["hr_admin", "company_admin"] },
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
            ? "bg-primary-50 text-primary-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )
      }
    >
      <Icon className="w-4.5 h-4.5 flex-shrink-0 w-5 h-5" />
      {sidebarOpen && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const roles = useSelector(selectUserRoles);
  const unreadCount = useSelector((state) => state.notifications.unreadCount);

  const isVisible = (item) => item.roles.length === 0 || item.roles.some((r) => roles.includes(r));

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

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              {sidebarOpen && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(({ to, icon, label }) => (
                  <NavItem key={to} to={to} icon={icon} label={label} sidebarOpen={sidebarOpen} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Notifications with badge */}
        <div>
          {sidebarOpen && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
              Activity
            </p>
          )}
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100"
              )
            }
          >
            <div className="relative flex-shrink-0">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {sidebarOpen && <span className="truncate">Notifications</span>}
          </NavLink>
        </div>
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-gray-100 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100"
            )
          }
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
