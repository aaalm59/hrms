import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { LayoutDashboard, Building2, CreditCard, Activity, Settings } from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { to: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/super-admin/companies", icon: Building2, label: "Companies" },
  { to: "/super-admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { to: "/super-admin/monitoring", icon: Activity, label: "Monitoring" },
];

export default function SuperAdminSidebar() {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 z-30 flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="h-16 flex items-center px-4 border-b border-gray-800">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">SA</span>
        </div>
        {sidebarOpen && (
          <div className="ml-3">
            <p className="text-white font-bold text-sm">Super Admin</p>
            <p className="text-gray-400 text-xs">Platform Management</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
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
            <Icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
