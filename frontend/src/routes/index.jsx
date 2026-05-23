import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated, selectIsSuperAdmin, selectUserRoles } from "@/redux/slices/authSlice";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import AuthLayout from "@/layouts/AuthLayout";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";

// Auth pages
import LoginPage from "@/auth/LoginPage";
import ForgotPasswordPage from "@/auth/ForgotPasswordPage";

// Super Admin pages
import SuperAdminDashboard from "@/super-admin/dashboard/SuperAdminDashboard";
import CompaniesPage from "@/super-admin/companies/CompaniesPage";
import CompanyDetailPage from "@/super-admin/companies/CompanyDetailPage";
import SubscriptionsPage from "@/super-admin/subscriptions/SubscriptionsPage";
import MonitoringPage from "@/super-admin/monitoring/MonitoringPage";

// Company Admin pages
import CompanyAdminDashboard from "@/company-admin/dashboard/CompanyAdminDashboard";
import CompanySetupPage from "@/company-admin/setup/CompanySetupPage";

// HRMS pages
import EmployeeDashboard from "@/dashboards/EmployeeDashboard";
import HRDashboard from "@/dashboards/HRDashboard";
import EmployeesPage from "@/employees/EmployeesPage";
import EmployeeDetailPage from "@/employees/EmployeeDetailPage";
import AttendancePage from "@/attendance/AttendancePage";
import PayrollPage from "@/payroll/PayrollPage";
import LeavesPage from "@/leaves/LeavesPage";
import RecruitmentPage from "@/recruitment/RecruitmentPage";
import PerformancePage from "@/performance/PerformancePage";
import AnalyticsPage from "@/analytics/AnalyticsPage";
import NotificationsPage from "@/notifications/NotificationsPage";
import SettingsPage from "@/settings/SettingsPage";

function ProtectedRoute({ children, requiredRoles = [] }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const roles = useSelector(selectUserRoles);

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (requiredRoles.length > 0 && !requiredRoles.some((r) => roles.includes(r))) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

function SuperAdminRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Super Admin routes */}
      <Route
        element={
          <SuperAdminRoute>
            <SuperAdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/companies" element={<CompaniesPage />} />
        <Route path="/super-admin/companies/:id" element={<CompanyDetailPage />} />
        <Route path="/super-admin/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/super-admin/monitoring" element={<MonitoringPage />} />
      </Route>

      {/* Company Admin routes */}
      <Route
        element={
          <ProtectedRoute requiredRoles={["company_admin"]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/company-admin/dashboard" element={<CompanyAdminDashboard />} />
        <Route path="/company-admin/setup" element={<CompanySetupPage />} />
      </Route>

      {/* HR & General routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<EmployeeDashboard />} />
        <Route path="/hr/dashboard" element={<HRDashboard />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/leaves" element={<LeavesPage />} />
        <Route path="/recruitment" element={<RecruitmentPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/auth/login" replace />} />
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}
