import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, Users, Calendar, DollarSign, CheckCircle,
  XCircle, Clock, Mail, Phone, Globe, MapPin, CreditCard, Activity,
  UserPlus, Settings, LogIn, RotateCcw, Shield, Briefcase, BarChart3,
  TrendingUp, ToggleLeft, ToggleRight, Edit, X, ChevronRight,
  Package, FileText, AlertTriangle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import toast from "react-hot-toast";
import api from "@/services/api";
import { format, parseISO } from "date-fns";

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
  trial: "bg-yellow-100 text-yellow-700",
  inactive: "bg-gray-100 text-gray-500",
};

const ATTENDANCE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#6366f1"];

const DEFAULT_MODULES = {
  employees: true, attendance: true, leaves: true, payroll: true,
  recruitment: true, performance: true, finance: false,
  assets: false, training: false, compliance: false,
};

const MODULE_META = {
  employees: { label: "Employees", icon: Users, desc: "Employee management, profiles, lifecycle" },
  attendance: { label: "Attendance", icon: Clock, desc: "Check-in/out, shifts, regularization" },
  leaves: { label: "Leaves", icon: Calendar, desc: "Leave types, balances, approvals" },
  payroll: { label: "Payroll", icon: DollarSign, desc: "Salary processing, payslips, compliance" },
  recruitment: { label: "Recruitment", icon: Briefcase, desc: "Jobs, candidates, interviews" },
  performance: { label: "Performance", icon: TrendingUp, desc: "Goals, appraisals, reviews" },
  finance: { label: "Finance", icon: BarChart3, desc: "Expenses, budgets, reports" },
  assets: { label: "Assets", icon: Package, desc: "Asset tracking, assignment" },
  training: { label: "Training", icon: FileText, desc: "Courses, certifications" },
  compliance: { label: "Compliance", icon: Shield, desc: "Statutory compliance, documents" },
};

function StatBox({ label, value, icon: Icon, color = "blue", sub }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600",
    yellow: "bg-yellow-50 text-yellow-600", red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600", orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CreateAdminModal({ companyId, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const mutation = useMutation({
    mutationFn: (d) => api.post(`/companies/${companyId}/create_admin/`, d),
    onSuccess: () => { toast.success("Admin created"); qc.invalidateQueries(["company-stats", companyId]); onClose(); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add Company Admin</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600 block mb-1">First Name</label><input className="input py-2" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Last Name</label><input className="input py-2" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          </div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Admin Email *</label><input type="email" className="input py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Password *</label><input type="password" className="input py-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.email || !form.password} className="btn-primary flex-1">
            {mutation.isPending ? "Creating..." : "Create Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [pwd, setPwd] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post(`/auth/users/${user.id}/reset-password/`, { new_password: pwd }),
    onSuccess: () => { toast.success(`Password reset for ${user.email}`); onClose(); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Reset Password</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500">Reset password for <strong>{user.email}</strong></p>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">New Password *</label><input type="password" className="input py-2" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Min 6 chars" /></div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || pwd.length < 6} className="btn-primary flex-1">
            {mutation.isPending ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [resetUser, setResetUser] = useState(null);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-detail", id],
    queryFn: () => api.get(`/companies/${id}/`).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["company-stats", id],
    queryFn: () => api.get(`/companies/${id}/stats/`).then((r) => r.data),
  });

  const [empSearch, setEmpSearch] = useState("");
  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["company-employees", id, empSearch],
    queryFn: () => api.get(`/employees/?company_id=${id}&search=${empSearch}`).then(r => r.data?.results ?? r.data),
    enabled: tab === "employees",
  });

  const [attMonth, setAttMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { data: attendance = [], isLoading: attLoading } = useQuery({
    queryKey: ["company-attendance", id, attMonth],
    queryFn: () => api.get(`/attendance/?company_id=${id}&month=${attMonth}`).then(r => r.data?.results ?? r.data),
    enabled: tab === "attendance",
  });

  const { data: payrolls = [], isLoading: payrollLoading } = useQuery({
    queryKey: ["company-payrolls", id],
    queryFn: () => api.get(`/payroll/?company_id=${id}`).then(r => r.data?.results ?? r.data),
    enabled: tab === "payroll",
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post(`/companies/${id}/activate/`),
    onSuccess: () => { toast.success("Activated"); qc.invalidateQueries(["company-detail", id]); },
  });

  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/companies/${id}/suspend/`),
    onSuccess: () => { toast.success("Suspended"); qc.invalidateQueries(["company-detail", id]); },
  });

  const impersonateMutation = useMutation({
    mutationFn: () => api.post(`/auth/impersonate/${id}/`),
    onSuccess: (res) => {
      const data = res.data;
      // Store current super admin tokens so we can restore
      const currentAccess = localStorage.getItem("access_token");
      const currentRefresh = localStorage.getItem("refresh_token");
      sessionStorage.setItem("sa_access", currentAccess);
      sessionStorage.setItem("sa_refresh", currentRefresh);
      // Set the impersonated user's tokens
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      toast.success(`Logged in as ${data.user_name || data.user_email} (${data.company})`);
      // Redirect to company admin dashboard
      window.location.href = "/company-admin/dashboard";
    },
    onError: (err) => toast.error(err.response?.data?.detail || "No users found in this company"),
  });

  const updateModulesMutation = useMutation({
    mutationFn: (flags) => api.patch(`/companies/${id}/update_modules/`, { module_flags: flags }),
    onSuccess: () => { toast.success("Modules updated"); qc.invalidateQueries(["company-detail", id]); },
    onError: () => toast.error("Failed to update modules"),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading organization...</div>
  );
  if (!company) return (
    <div className="text-center py-16 text-gray-400">Organization not found</div>
  );

  const sub = company.subscription;
  const moduleFlags = { ...DEFAULT_MODULES, ...(company.module_flags ?? {}) };
  const admins = stats?.admins ?? [];

  // Attendance today pie data
  const attendancePie = [
    { name: "Present", value: stats?.present_today ?? 0 },
    { name: "On Leave", value: stats?.on_leave_today ?? 0 },
    { name: "WFH", value: stats?.wfh_today ?? 0 },
    { name: "Absent", value: Math.max(0, (stats?.total_employees ?? 0) - (stats?.present_today ?? 0) - (stats?.on_leave_today ?? 0) - (stats?.wfh_today ?? 0)) },
  ].filter((d) => d.value > 0);

  const TABS = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "employees", label: "Employees", icon: Users },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "payroll", label: "Payroll", icon: DollarSign },
    { id: "modules", label: "Modules", icon: Package },
    { id: "admins", label: "Admins", icon: Shield },
    { id: "subscription", label: "Subscription", icon: CreditCard },
  ];

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <button onClick={() => navigate("/super-admin/companies")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Organizations
      </button>

      {/* Company Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-wrap items-start gap-4">
          {/* Logo / Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-lg">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-white font-black text-2xl">{company.name?.[0]?.toUpperCase()}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_BADGE[company.status] ?? "bg-gray-100 text-gray-500"}`}>
                {company.status?.toUpperCase()}
              </span>
              {company.industry && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{company.industry}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
              {company.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{company.email}</span>}
              {company.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{company.phone}</span>}
              {company.website && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{company.website}</span>}
              {(company.city || company.country) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[company.city, company.state, company.country].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
            {company.description && <p className="text-sm text-gray-400 mt-2">{company.description}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCreateAdmin(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Add Admin
            </button>
            <button
              onClick={() => impersonateMutation.mutate()}
              disabled={impersonateMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
              title="Login as Company Admin"
            >
              <LogIn className="w-4 h-4" />
              {impersonateMutation.isPending ? "Logging in..." : "Login As Admin"}
            </button>
            {company.status !== "active" ? (
              <button onClick={() => activateMutation.mutate()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                <CheckCircle className="w-4 h-4" /> Activate
              </button>
            ) : (
              <button onClick={() => suspendMutation.mutate()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors">
                <XCircle className="w-4 h-4" /> Suspend
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatBox label="Total Employees" value={stats?.total_employees} icon={Users} color="blue" />
        <StatBox label="Present Today" value={stats?.present_today} icon={CheckCircle} color="green" />
        <StatBox label="On Leave" value={stats?.on_leave_today} icon={Calendar} color="yellow" />
        <StatBox label="Open Positions" value={stats?.open_positions} icon={Briefcase} color="purple" />
        <StatBox label="Pending Leaves" value={stats?.pending_leaves} icon={Clock} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Company details */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Organization Details</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              {[
                { label: "Industry", value: company.industry || "—" },
                { label: "GST Number", value: company.gst_number || "—" },
                { label: "PAN Number", value: company.pan_number || "—" },
                { label: "Currency", value: company.currency },
                { label: "Timezone", value: company.timezone },
                { label: "Max Employees", value: company.max_employees },
                { label: "Pincode", value: company.pincode || "—" },
                { label: "Joined", value: company.created_at ? format(parseISO(company.created_at), "dd MMM yyyy") : "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
              {company.address && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Address</p>
                  <p className="text-sm font-semibold text-gray-800">{company.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Subscription + quick admin */}
          <div className="space-y-4">
            {/* Subscription mini card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary-600" /> Subscription
              </h3>
              {sub ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Plan</span>
                    <span className="font-bold text-gray-900">{sub.plan?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[sub.status] ?? "bg-gray-100 text-gray-500"}`}>{sub.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Billing</span>
                    <span className="text-sm text-gray-700 capitalize">{sub.billing_cycle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Expires</span>
                    <span className="text-sm font-medium text-gray-800">{sub.end_date}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No subscription</p>
              )}
            </div>

            {/* Last payroll mini card */}
            {stats?.last_payroll && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Last Payroll
                </h3>
                <p className="text-xs text-gray-400">{stats.last_payroll.month}/{stats.last_payroll.year}</p>
                <p className="text-2xl font-black text-emerald-700">₹{Number(stats.last_payroll.total_net).toLocaleString()}</p>
                <p className="text-xs text-gray-400">Net · {stats.last_payroll.total_employees} employees</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-2 inline-block ${stats.last_payroll.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {stats.last_payroll.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Analytics tab ── */}
      {tab === "analytics" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Attendance week bar */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Attendance This Week</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.attendance_week ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Bar dataKey="present" fill="#10b981" radius={[3, 3, 0, 0]} name="Present" stackId="a" />
                  <Bar dataKey="leave" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Leave" stackId="a" />
                  <Bar dataKey="absent" fill="#ef4444" radius={[3, 3, 0, 0]} name="Absent" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Attendance today pie */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Today's Status</h3>
              {attendancePie.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={attendancePie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                        {attendancePie.map((_, i) => <Cell key={i} fill={ATTENDANCE_COLORS[i % ATTENDANCE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-1">
                    {attendancePie.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: ATTENDANCE_COLORS[i] }} />
                          <span className="text-gray-600">{d.name}</span>
                        </div>
                        <span className="font-semibold text-gray-800">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Employee growth area chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Employee Joining Trend (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats?.employee_growth ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="joinings" stroke="#6366f1" fill="url(#empGrad)" strokeWidth={2} dot={{ r: 4 }} name="New Joinings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Dept headcount */}
          {(stats?.department_headcount?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Department Headcount</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.department_headcount} layout="vertical" margin={{ top: 4, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Employees tab ── */}
      {tab === "employees" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900">Employees</h3>
            <input
              type="text"
              placeholder="Search name, email, ID…"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="input py-1.5 text-sm w-64"
            />
          </div>
          {empLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading employees…</div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Employee", "ID", "Department", "Designation", "Type", "Joined", "Status"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {emp.photo ? (
                            <img src={emp.photo} className="w-8 h-8 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-700 text-xs font-bold">
                                {emp.first_name?.[0]}{emp.last_name?.[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-gray-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{emp.employee_id}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{emp.department_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{emp.designation_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                          {emp.employment_type?.replace("_", " ") || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{emp.date_of_joining || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          emp.status === "active" ? "bg-emerald-100 text-emerald-700" :
                          emp.status === "inactive" ? "bg-gray-100 text-gray-500" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Attendance tab ── */}
      {tab === "attendance" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900">Attendance Records</h3>
            <input
              type="month"
              value={attMonth}
              onChange={(e) => setAttMonth(e.target.value)}
              className="input py-1.5 text-sm w-40"
            />
          </div>
          {attLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading attendance…</div>
          ) : attendance.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No attendance records for this month</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Employee", "Date", "Check In", "Check Out", "Hours", "Status"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendance.slice(0, 100).map(rec => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 text-xs">
                        {rec.employee_name || `#${rec.employee}`}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{rec.date}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {rec.check_in ? rec.check_in.slice(11, 16) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {rec.check_out ? rec.check_out.slice(11, 16) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{rec.working_hours ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          rec.status === "present" ? "bg-emerald-100 text-emerald-700" :
                          rec.status === "absent" ? "bg-red-100 text-red-700" :
                          rec.status === "leave" ? "bg-yellow-100 text-yellow-700" :
                          rec.status === "wfh" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendance.length > 100 && (
                <p className="text-xs text-gray-400 text-center py-3">
                  Showing first 100 of {attendance.length} records
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Payroll tab ── */}
      {tab === "payroll" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Payroll Runs</h3>
          </div>
          {payrollLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading payrolls…</div>
          ) : payrolls.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No payroll runs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Period", "Employees", "Gross Pay", "Net Pay", "Status", "Run Date"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payrolls.map(pr => (
                    <tr key={pr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {pr.month}/{pr.year}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{pr.total_employees ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        ₹{Number(pr.total_gross ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        ₹{Number(pr.total_net ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          pr.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                          pr.status === "processing" ? "bg-blue-100 text-blue-700" :
                          pr.status === "draft" ? "bg-gray-100 text-gray-500" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {pr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{pr.created_at?.slice(0, 10) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modules tab ── */}
      {tab === "modules" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Module Management</h3>
              <p className="text-xs text-gray-400 mt-0.5">Enable or disable HRMS modules for this organization</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(MODULE_META).map(([key, meta]) => {
              const enabled = moduleFlags[key] !== false;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${enabled ? "border-primary-200 bg-primary-50/30" : "border-gray-100 bg-gray-50"}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? "bg-primary-100" : "bg-gray-100"}`}>
                    <meta.icon className={`w-5 h-5 ${enabled ? "text-primary-600" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${enabled ? "text-gray-900" : "text-gray-400"}`}>{meta.label}</p>
                    <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
                  </div>
                  <button
                    onClick={() => updateModulesMutation.mutate({ [key]: !enabled })}
                    disabled={updateModulesMutation.isPending}
                    className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${enabled ? "bg-primary-600" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Admins tab ── */}
      {tab === "admins" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Company Admin Users</h3>
            <button onClick={() => setShowCreateAdmin(true)} className="btn-primary text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add Admin
            </button>
          </div>
          {admins.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No admin users yet</p>
              <button onClick={() => setShowCreateAdmin(true)} className="mt-3 btn-primary text-xs">Create First Admin</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Admin", "Email", "Roles", "Last Login", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-bold text-xs">{admin.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-gray-900">{admin.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{admin.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {admin.roles?.map((r) => (
                          <span key={r} className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {admin.last_login ? format(parseISO(admin.last_login), "dd MMM, HH:mm") : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[admin.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setResetUser(admin)}
                        className="text-xs text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset Pwd
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Subscription tab ── */}
      {tab === "subscription" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-5">Subscription Details</h3>
          {sub ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Plan Name", value: sub.plan?.name ?? "—" },
                { label: "Plan Tier", value: sub.plan?.tier ?? "—" },
                { label: "Status", value: sub.status },
                { label: "Billing Cycle", value: sub.billing_cycle },
                { label: "Monthly Price", value: `₹${Number(sub.plan?.price_monthly ?? 0).toLocaleString()}` },
                { label: "Annual Price", value: `₹${Number(sub.plan?.price_yearly ?? 0).toLocaleString()}` },
                { label: "Start Date", value: sub.start_date },
                { label: "End Date", value: sub.end_date },
                { label: "Amount Paid", value: `₹${Number(sub.amount_paid ?? 0).toLocaleString()}` },
                { label: "Max Employees", value: sub.plan?.max_employees },
                { label: "Storage", value: `${sub.plan?.max_storage_gb ?? 0} GB` },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="font-semibold text-gray-800 capitalize">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No active subscription</p>
              <button
                onClick={() => navigate("/super-admin/subscriptions")}
                className="mt-3 btn-primary text-xs"
              >
                Assign Subscription
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateAdmin && <CreateAdminModal companyId={id} onClose={() => setShowCreateAdmin(false)} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  );
}
