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
import SecurityPage from "@/super-admin/security/SecurityPage";
import RBACPage from "@/super-admin/rbac/RBACPage";
import BillingPage from "@/super-admin/billing/BillingPage";
import SuperAdminAnalyticsPage from "@/super-admin/analytics/SuperAdminAnalyticsPage";
import UsersPage from "@/super-admin/users/UsersPage";
import CompanyAdminsPage from "@/super-admin/company-admins/CompanyAdminsPage";
import GlobalEmployeesPage from "@/super-admin/global-employees/GlobalEmployeesPage";
import GlobalAttendancePage from "@/super-admin/global-attendance/GlobalAttendancePage";
import GlobalLeavesPage from "@/super-admin/global-leaves/GlobalLeavesPage";
import GlobalPayrollPage from "@/super-admin/global-payroll/GlobalPayrollPage";

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

// New pages
import FinancePage from "@/finance/FinancePage";
import ReportsPage from "@/reports/ReportsPage";
import AuditLogsPage from "@/audit-logs/AuditLogsPage";
import TeamsPage from "@/teams/TeamsPage";

function ProtectedRoute({ children, requiredRoles = [] }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const roles = useSelector(selectUserRoles);

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (isSuperAdmin) return <Navigate to="/super-admin/dashboard" replace />;
  if (requiredRoles.length > 0 && !requiredRoles.some((r) => roles.includes(r))) {
    return <Navigate to="/dashboard" replace />;
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
        <Route path="/super-admin/security" element={<SecurityPage />} />
        <Route path="/super-admin/rbac" element={<RBACPage />} />
        <Route path="/super-admin/billing" element={<BillingPage />} />
        <Route path="/super-admin/analytics" element={<SuperAdminAnalyticsPage />} />
        <Route path="/super-admin/users" element={<UsersPage />} />
        <Route path="/super-admin/company-admins" element={<CompanyAdminsPage />} />
        <Route path="/super-admin/employees" element={<GlobalEmployeesPage />} />
        <Route path="/super-admin/attendance" element={<GlobalAttendancePage />} />
        <Route path="/super-admin/leaves" element={<GlobalLeavesPage />} />
        <Route path="/super-admin/payroll-overview" element={<GlobalPayrollPage />} />
      </Route>

      {/* Company Admin + HR routes (all under MainLayout) */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Company Admin */}
        <Route path="/company-admin/dashboard" element={<CompanyAdminDashboard />} />
        <Route path="/company-admin/setup" element={<CompanySetupPage />} />

        {/* Dashboards */}
        <Route path="/dashboard" element={<EmployeeDashboard />} />
        <Route path="/hr/dashboard" element={<HRDashboard />} />

        {/* Core HR */}
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/leaves" element={<LeavesPage />} />
        <Route path="/recruitment" element={<RecruitmentPage />} />
        <Route path="/performance" element={<PerformancePage />} />

        {/* New modules */}
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />

        {/* System */}
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/auth/login" replace />} />
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}
