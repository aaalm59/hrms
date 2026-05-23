import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { selectCurrentUser } from "@/redux/slices/authSlice";

export default function MainLayout() {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"}`}>
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
