import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import SuperAdminSidebar from "@/components/layout/SuperAdminSidebar";
import Navbar from "@/components/layout/Navbar";

export default function SuperAdminLayout() {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SuperAdminSidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"}`}>
        <Navbar variant="super-admin" />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
