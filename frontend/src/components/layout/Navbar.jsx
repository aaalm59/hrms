import { useDispatch, useSelector } from "react-redux";
import { Menu, Bell, Sun, Moon, LogOut, User } from "lucide-react";
import { toggleSidebar, toggleDarkMode } from "@/redux/slices/uiSlice";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar({ variant = "default" }) {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const unreadCount = useSelector((state) => state.notifications.unreadCount);
  const { logout } = useAuth();

  const navBg = variant === "super-admin" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const textColor = variant === "super-admin" ? "text-gray-100" : "text-gray-700";
  const iconBg = variant === "super-admin" ? "hover:bg-gray-800" : "hover:bg-gray-100";

  return (
    <header className={`h-16 ${navBg} border-b flex items-center justify-between px-4 z-20 flex-shrink-0`}>
      <button
        onClick={() => dispatch(toggleSidebar())}
        className={`p-2 rounded-lg ${iconBg} ${textColor} transition-colors`}
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={() => dispatch(toggleDarkMode())}
          className={`p-2 rounded-lg ${iconBg} ${textColor} transition-colors`}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className={`relative p-2 rounded-lg ${iconBg} ${textColor} transition-colors`}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* User info */}
        <div className={`flex items-center gap-2 pl-2 border-l ${variant === "super-admin" ? "border-gray-700" : "border-gray-200"}`}>
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <div className="hidden md:block">
            <p className={`text-sm font-medium ${textColor}`}>{user?.full_name || user?.email}</p>
            <p className={`text-xs ${variant === "super-admin" ? "text-gray-400" : "text-gray-500"} capitalize`}>
              {user?.is_super_admin
                ? "Super Admin"
                : (user?.roles?.[0] ?? "User").replace(/_/g, " ")}
            </p>
          </div>
          <button
            onClick={logout}
            className={`p-2 rounded-lg ${iconBg} text-red-500 transition-colors ml-1`}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
