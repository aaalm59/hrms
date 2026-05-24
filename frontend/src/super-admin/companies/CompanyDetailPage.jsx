import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, Users, Calendar, DollarSign,
  CheckCircle, XCircle, Clock, TrendingUp, Mail, Phone,
  Globe, MapPin, Shield, CreditCard, Activity, ChevronRight,
  AlertTriangle, UserPlus, Settings
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { format, parseISO } from "date-fns";

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
  trial: "bg-yellow-100 text-yellow-700",
  inactive: "bg-gray-100 text-gray-500",
};

function StatBox({ label, value, icon: Icon, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function CreateAdminModal({ companyId, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });

  const mutation = useMutation({
    mutationFn: (d) => api.post(`/companies/${companyId}/create_admin/`, d),
    onSuccess: () => {
      toast.success("Admin user created");
      qc.invalidateQueries(["company-detail", companyId]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Create Company Admin</h3>
          <button onClick={onClose}><XCircle className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              <input className="input py-2" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input className="input py-2" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Admin Email *</label>
            <input type="email" className="input py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
            <input type="password" className="input py-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.email || !form.password}
            className="btn-primary flex-1"
          >
            {mutation.isPending ? "Creating..." : "Create Admin"}
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

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-detail", id],
    queryFn: () => api.get(`/companies/${id}/`).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["company-stats", id],
    queryFn: () => api.get(`/companies/${id}/stats/`).then((r) => r.data),
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post(`/companies/${id}/activate/`),
    onSuccess: () => { toast.success("Activated"); qc.invalidateQueries(["company-detail", id]); },
  });

  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/companies/${id}/suspend/`),
    onSuccess: () => { toast.success("Suspended"); qc.invalidateQueries(["company-detail", id]); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading organization...</div>
  );

  if (!company) return (
    <div className="text-center py-16 text-gray-400">Organization not found</div>
  );

  const sub = company.subscription;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "subscription", label: "Subscription" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div>
        <button onClick={() => navigate("/super-admin/companies")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Organizations
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-bold text-2xl">{company.name?.[0]}</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[company.status] ?? "bg-gray-100 text-gray-500"}`}>
                  {company.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">{company.slug} · {company.country}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateAdmin(true)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Add Admin
            </button>
            {company.status !== "active" ? (
              <button onClick={() => activateMutation.mutate()} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors">
                <CheckCircle className="w-4 h-4" /> Activate
              </button>
            ) : (
              <button onClick={() => suspendMutation.mutate()} className="bg-red-50 hover:bg-red-100 text-red-700 text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors">
                <XCircle className="w-4 h-4" /> Suspend
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Employees" value={stats?.total_employees} icon={Users} color="blue" />
        <StatBox label="Present Today" value={stats?.present_today} icon={CheckCircle} color="green" />
        <StatBox label="On Leave" value={stats?.on_leave_today} icon={Calendar} color="yellow" />
        <StatBox label="Pending Leaves" value={stats?.pending_leaves} icon={Clock} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Company Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Organization Details</h3>
            <div className="space-y-3">
              {[
                { icon: Mail, label: "Email", value: company.email },
                { icon: Phone, label: "Phone", value: company.phone || "—" },
                { icon: Globe, label: "Website", value: company.website || "—" },
                { icon: MapPin, label: "Location", value: [company.city, company.state, company.country].filter(Boolean).join(", ") || "—" },
                { icon: Users, label: "Max Employees", value: company.max_employees },
                { icon: Calendar, label: "Joined", value: company.created_at ? format(parseISO(company.created_at), "dd MMM yyyy") : "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last Payroll */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Last Payroll</h3>
            {stats?.last_payroll ? (
              <div className="space-y-3">
                <div className="p-4 bg-primary-50 rounded-xl">
                  <p className="text-xs text-gray-500">Period</p>
                  <p className="font-bold text-primary-900">{stats.last_payroll.month}/{stats.last_payroll.year}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-xs text-gray-500">Net Payout</p>
                  <p className="font-bold text-emerald-800 text-xl">₹{Number(stats.last_payroll.total_net).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stats.last_payroll.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {stats.last_payroll.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4">No payroll processed yet</p>
            )}
          </div>
        </div>
      )}

      {/* Subscription tab */}
      {tab === "subscription" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Subscription Details</h3>
          {sub ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Plan", value: sub.plan?.name ?? "—", icon: CreditCard },
                { label: "Status", value: sub.status, icon: Activity },
                { label: "Billing", value: sub.billing_cycle, icon: Calendar },
                { label: "Start Date", value: sub.start_date, icon: Calendar },
                { label: "End Date", value: sub.end_date, icon: Calendar },
                { label: "Amount Paid", value: `₹${Number(sub.amount_paid).toLocaleString()}`, icon: DollarSign },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="font-semibold text-gray-800 capitalize">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>No active subscription</p>
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Company Settings</h3>
          {company.settings ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Working Days", value: company.settings.working_days?.join(", ") || "—" },
                { label: "Work Hours", value: `${company.settings.work_start_time?.slice(0,5)} – ${company.settings.work_end_time?.slice(0,5)}` },
                { label: "Weekly Off", value: company.settings.weekly_off_days?.join(", ") || "—" },
                { label: "Late Mark After", value: `${company.settings.late_mark_after_minutes} mins` },
                { label: "Payroll Day", value: `Day ${company.settings.payroll_processing_day}` },
                { label: "Probation", value: `${company.settings.probation_period_days} days` },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="text-sm font-medium text-gray-800 capitalize">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No settings configured</p>
          )}
        </div>
      )}

      {showCreateAdmin && (
        <CreateAdminModal companyId={id} onClose={() => setShowCreateAdmin(false)} />
      )}
    </div>
  );
}
