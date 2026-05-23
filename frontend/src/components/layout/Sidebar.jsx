import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  LayoutDashboard, Users, Clock, DollarSign, Calendar,
  Briefcase, TrendingUp, BarChart2, Bell, Settings,
  FileText, Shield, Package, Ticket, BookOpen, Building2,
} from "lucide-react";
import { selectUserRoles } from "@/redux/slices/authSlice";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: [] },
  { to: "/hr/dashboard", icon: Building2, label: "HR Dashboard", roles: ["hr_admin", "company_admin"] },
  { to: "/employees", icon: Users, label: "Employees", roles: ["hr_admin", "company_admin", "manager"] },
  { to: "/attendance", icon: Clock, label: "Attendance", roles: [] },
  { to: "/leaves", icon: Calendar, label: "Leaves", roles: [] },
  { to: "/payroll", icon: DollarSign, label: "Payroll", roles: ["payroll_manager", "company_admin", "hr_admin"] },
  { to: "/recruitment", icon: Briefcase, label: "Recruitment", roles: ["recruiter", "hr_admin", "company_admin"] },
  { to: "/performance", icon: TrendingUp, label: "Performance", roles: ["manager", "hr_admin", "company_admin"] },
  { to: "/analytics", icon: BarChart2, label: "Analytics", roles: ["hr_admin", "company_admin"] },
  { to: "/notifications", icon: Bell, label: "Notifications", roles: [] },
];

export default function Sidebar() {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const roles = useSelector(selectUserRoles);

  const visible = NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.some((r) => roles.includes(r))
  );

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        {sidebarOpen && (
          <span className="ml-3 font-bold text-gray-900 text-lg whitespace-nowrap">HRMS</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visible.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
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
            <Icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-gray-100">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
