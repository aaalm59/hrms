import { Outlet, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Building2, LogOut } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { setCredentials } from "@/redux/slices/authSlice";

function parseJwt(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

function ImpersonationBanner() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const saAccess = sessionStorage.getItem("sa_access");
  const saRefresh = sessionStorage.getItem("sa_refresh");

  // Only show if sa_access exists AND it truly belongs to a super admin
  if (!saAccess || !saRefresh) return null;
  const saPayload = parseJwt(saAccess);
  if (!saPayload?.is_super_admin) return null;

  const handleExit = () => {
    sessionStorage.removeItem("sa_access");
    sessionStorage.removeItem("sa_refresh");
    dispatch(setCredentials({ access: saAccess, refresh: saRefresh }));
    navigate("/super-admin/dashboard");
  };

  return (
    <div className="bg-amber-500 text-white px-5 py-2.5 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Building2 className="w-4 h-4 flex-shrink-0" />
        You are viewing this company as Super Admin
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap"
      >
        <LogOut className="w-3.5 h-3.5" />
        Exit &amp; Return to Super Admin
      </button>
    </div>
  );
}

export default function MainLayout() {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"}`}>
        <ImpersonationBanner />
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
