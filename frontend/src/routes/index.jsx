import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectIsAuthenticated,
  selectIsSuperAdmin,
  selectUserRoles,
} from "@/redux/slices/authSlice";
import { getDashboardPath } from "@/hooks/useAuth";

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

// Role dashboards
import EmployeeDashboard from "@/dashboards/EmployeeDashboard";
import HRDashboard from "@/dashboards/HRDashboard";
import PayrollManagerDashboard from "@/dashboards/PayrollManagerDashboard";
import RecruiterDashboard from "@/dashboards/RecruiterDashboard";
import ManagerDashboard from "@/dashboards/ManagerDashboard";
import TeamLeadDashboard from "@/dashboards/TeamLeadDashboard";

// HRMS module pages
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
import FinancePage from "@/finance/FinancePage";
import ReportsPage from "@/reports/ReportsPage";
import AuditLogsPage from "@/audit-logs/AuditLogsPage";
import TeamsPage from "@/teams/TeamsPage";
import RBACManagePage from "@/rbac/RBACManagePage";

// ─── Route Guards ─────────────────────────────────────────────────────────────

function useRoleGuard() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const roles = useSelector(selectUserRoles);
  return { isAuthenticated, isSuperAdmin, roles };
}

/** Any authenticated non-super-admin. Optionally require specific roles. */
function ProtectedRoute({ children, requiredRoles = [] }) {
  const { isAuthenticated, isSuperAdmin, roles } = useRoleGuard();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (isSuperAdmin) return <Navigate to="/super-admin/dashboard" replace />;
  if (requiredRoles.length > 0 && !requiredRoles.some((r) => roles.includes(r))) {
    return <Navigate to={getDashboardPath(roles, false)} replace />;
  }
  return children;
}

/** Super admin only. */
function SuperAdminRoute({ children }) {
  const { isAuthenticated, isSuperAdmin } = useRoleGuard();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/auth/login" replace />;
  return children;
}

/** Single-role guard factory — used for each role's dashboard. */
function RoleRoute({ children, roles: required }) {
  const { isAuthenticated, isSuperAdmin, roles } = useRoleGuard();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (isSuperAdmin) return <Navigate to="/super-admin/dashboard" replace />;
  if (!required.some((r) => roles.includes(r))) {
    return <Navigate to={getDashboardPath(roles, false)} replace />;
  }
  return children;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export default function AppRoutes() {
  const { isAuthenticated, isSuperAdmin, roles } = useRoleGuard();

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

      {/* All company-user routes share MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* ── Role dashboards ─────────────────────────────────────────── */}
        <Route
          path="/company-admin/dashboard"
          element={
            <RoleRoute roles={["company_admin"]}>
              <CompanyAdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/company-admin/setup"
          element={
            <RoleRoute roles={["company_admin"]}>
              <CompanySetupPage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/dashboard"
          element={
            <RoleRoute roles={["hr_admin", "company_admin"]}>
              <HRDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/payroll-manager/dashboard"
          element={
            <RoleRoute roles={["payroll_manager", "company_admin", "hr_admin"]}>
              <PayrollManagerDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/recruiter/dashboard"
          element={
            <RoleRoute roles={["recruiter", "hr_admin", "company_admin"]}>
              <RecruiterDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/manager/dashboard"
          element={
            <RoleRoute roles={["manager", "company_admin", "hr_admin"]}>
              <ManagerDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/team-lead/dashboard"
          element={
            <RoleRoute roles={["team_lead", "manager", "company_admin", "hr_admin"]}>
              <TeamLeadDashboard />
            </RoleRoute>
          }
        />
        {/* Default employee dashboard (accessible by all authenticated users) */}
        <Route path="/dashboard" element={<EmployeeDashboard />} />

        {/* ── HR & People ─────────────────────────────────────────────── */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute requiredRoles={["company_admin", "hr_admin", "manager", "team_lead", "recruiter", "payroll_manager", "finance_manager", "auditor"]}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute requiredRoles={["company_admin", "hr_admin", "manager", "team_lead", "recruiter", "payroll_manager", "finance_manager", "auditor"]}>
              <EmployeeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams"
          element={
            <ProtectedRoute requiredRoles={["company_admin", "hr_admin", "manager", "team_lead"]}>
              <TeamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruitment"
          element={
            <ProtectedRoute requiredRoles={["recruiter", "hr_admin", "company_admin"]}>
              <RecruitmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance"
          element={
            <ProtectedRoute requiredRoles={["manager", "hr_admin", "company_admin"]}>
              <PerformancePage />
            </ProtectedRoute>
          }
        />

        {/* ── Time & Leave ─────────────────────────────────────────────── */}
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/leaves" element={<LeavesPage />} />

        {/* ── Finance ─────────────────────────────────────────────────── */}
        <Route
          path="/payroll"
          element={
            <ProtectedRoute requiredRoles={["payroll_manager", "company_admin", "hr_admin", "finance_manager"]}>
              <PayrollPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute requiredRoles={["payroll_manager", "company_admin", "hr_admin", "finance_manager"]}>
              <FinancePage />
            </ProtectedRoute>
          }
        />

        {/* ── Insights ─────────────────────────────────────────────────── */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute requiredRoles={["hr_admin", "company_admin", "manager", "finance_manager", "auditor"]}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRoles={["hr_admin", "company_admin", "payroll_manager", "finance_manager", "auditor"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* ── System ────────────────────────────────────────────────────── */}
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute requiredRoles={["company_admin", "hr_admin", "auditor"]}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac"
          element={
            <ProtectedRoute requiredRoles={["company_admin", "hr_admin"]}>
              <RBACManagePage />
            </ProtectedRoute>
          }
        />

        {/* ── Always accessible ────────────────────────────────────────── */}
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Root — redirect to role dashboard if logged in, else login */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={getDashboardPath(roles, isSuperAdmin)} replace />
            : <Navigate to="/auth/login" replace />
        }
      />

      {/* 404 — redirect to role dashboard or login */}
      <Route
        path="*"
        element={
          isAuthenticated
            ? <Navigate to={getDashboardPath(roles, isSuperAdmin)} replace />
            : <Navigate to="/auth/login" replace />
        }
      />
    </Routes>
  );
}
