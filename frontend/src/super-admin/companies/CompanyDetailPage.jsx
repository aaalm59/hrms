import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/redux/slices/authSlice";
import { store } from "@/redux/store";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, Building2, Users, Calendar, DollarSign, CheckCircle,
  XCircle, Clock, Mail, Phone, Globe, MapPin, CreditCard, Activity,
  UserPlus, Settings, LogIn, RotateCcw, Shield, Briefcase, BarChart3,
  TrendingUp, ToggleLeft, ToggleRight, Edit, X, ChevronRight,
  Package, FileText, AlertTriangle, Trash2, Save
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
    onSuccess: () => {
      toast.success("Admin created");
      qc.invalidateQueries(["company-admins", companyId]);
      qc.invalidateQueries(["company-stats", companyId]);
      onClose();
    },
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

function ResetPasswordModal({ companyId, user, onClose }) {
  const [pwd, setPwd] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post(`/companies/${companyId}/admins/${user.id}/reset-password/`, { new_password: pwd }),
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

function EditAdminModal({ companyId, user, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      status: user.status || "active",
    },
  });
  const mutation = useMutation({
    mutationFn: (data) => api.patch(`/companies/${companyId}/admins/${user.id}/`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Admin updated");
      qc.invalidateQueries(["company-admins", companyId]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Update failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Edit Admin</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 block mb-1">First Name</label><input {...register("first_name")} className="input py-2" /></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Last Name</label><input {...register("last_name")} className="input py-2" /></div>
            </div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Phone</label><input {...register("phone")} className="input py-2" /></div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select {...register("status")} className="input py-2">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving..." : "Save Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignRolesModal({ companyId, user, roles = [], onClose }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(() => new Set((user.roles || []).map((role) => String(role.id ?? role))));
  const mutation = useMutation({
    mutationFn: () => api.post(`/companies/${companyId}/admins/${user.id}/assign-roles/`, { role_ids: Array.from(selected) }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Roles updated");
      qc.invalidateQueries(["company-admins", companyId]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to assign roles"),
  });

  const toggleRole = (roleId) => {
    setSelected((current) => {
      const next = new Set(current);
      const key = String(roleId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Assign Roles</h3>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.has(String(role.id))}
                onChange={() => toggleRole(role.id)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="text-sm font-semibold text-gray-800">{role.display_name}</p>
                <p className="text-xs text-gray-400">{role.name}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || selected.size === 0} className="btn-primary flex-1">
            {mutation.isPending ? "Saving..." : "Assign Roles"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCompanyModal({ company, onClose, onSaved }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      industry: company.industry || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      country: company.country || "",
      pincode: company.pincode || "",
      gst_number: company.gst_number || "",
      pan_number: company.pan_number || "",
      max_employees: company.max_employees || 50,
      timezone: company.timezone || "Asia/Kolkata",
      currency: company.currency || "INR",
      description: company.description || "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => api.patch(`/companies/${company.id}/`, data).then((r) => r.data),
    onSuccess: () => { toast.success("Organization updated"); onSaved(); onClose(); },
    onError: (err) => toast.error(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(", ") || "Update failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Organization Profile</h2>
            <p className="text-xs text-gray-400 mt-0.5">{company.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Organization Name *</label>
              <input {...register("name", { required: true })} className="input" />
              {errors.name && <p className="err">Required</p>}
            </div>
            <div>
              <label className="label">Official Email *</label>
              <input type="email" {...register("email", { required: true })} className="input" />
              {errors.email && <p className="err">Required</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register("phone")} className="input" />
            </div>
            <div>
              <label className="label">Website</label>
              <input {...register("website")} className="input" />
            </div>
            <div>
              <label className="label">Industry</label>
              <input {...register("industry")} className="input" placeholder="e.g. Technology" />
            </div>
            <div>
              <label className="label">GST Number</label>
              <input {...register("gst_number")} className="input" />
            </div>
            <div>
              <label className="label">PAN Number</label>
              <input {...register("pan_number")} className="input" />
            </div>
            <div>
              <label className="label">City</label>
              <input {...register("city")} className="input" />
            </div>
            <div>
              <label className="label">State</label>
              <input {...register("state")} className="input" />
            </div>
            <div>
              <label className="label">Country</label>
              <input {...register("country")} className="input" />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input {...register("pincode")} className="input" />
            </div>
            <div>
              <label className="label">Max Employees</label>
              <input type="number" {...register("max_employees")} className="input" min={1} />
            </div>
            <div>
              <label className="label">Timezone</label>
              <input {...register("timezone")} className="input" />
            </div>
            <div>
              <label className="label">Currency</label>
              <input {...register("currency")} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input {...register("address")} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea {...register("description")} className="input" rows={3} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteCompanyModal({ company, onClose, onDeleted }) {
  const [confirm, setConfirm] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.delete(`/companies/${company.id}/`),
    onSuccess: () => { toast.success(`"${company.name}" deleted permanently`); onDeleted(); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to delete"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-red-700">Delete Organization</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This action is permanent and irreversible</p>
              <p className="text-xs text-red-600 mt-1">All employees, payroll, attendance, and settings data will be permanently erased.</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Type <strong className="text-gray-900">{company.name}</strong> to confirm:</p>
            <input
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={company.name}
            />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={confirm !== company.name || mutation.isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {mutation.isPending ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSubscriptionModal({ company, sub, onClose, onSaved }) {
  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get("/subscriptions/plans/").then((r) => r.data?.results ?? r.data),
  });

  const today = new Date().toISOString().split("T")[0];
  const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: sub ? {
      plan_id: sub.plan?.id || "",
      billing_cycle: sub.billing_cycle || "monthly",
      status: sub.status || "active",
      start_date: sub.start_date || today,
      end_date: sub.end_date || nextYear,
      amount_paid: sub.amount_paid || 0,
    } : {
      plan_id: "",
      billing_cycle: "monthly",
      status: "trial",
      start_date: today,
      end_date: nextYear,
      amount_paid: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post(`/companies/${company.id}/assign_subscription/`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success(sub ? "Subscription updated" : "Subscription assigned");
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(", ") || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{sub ? "Edit Subscription" : "Assign Subscription"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{company.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Subscription Plan *</label>
            <select {...register("plan_id", { required: true })} className="input">
              <option value="">Select a plan</option>
              {plans?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.price_monthly}/mo · ₹{p.price_yearly}/yr
                </option>
              ))}
            </select>
            {errors.plan_id && <p className="err">Plan is required</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Billing Cycle</label>
              <select {...register("billing_cycle")} className="input">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register("status")} className="input">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" {...register("start_date")} className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" {...register("end_date")} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Amount Paid (₹)</label>
              <input type="number" {...register("amount_paid")} className="input" min={0} step="0.01" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving..." : sub ? "Update Subscription" : "Assign Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const qc = useQueryClient();
  const [tab, setTab] = useState(() => searchParams.get("tab") || "overview");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [editAdmin, setEditAdmin] = useState(null);
  const [roleAdmin, setRoleAdmin] = useState(null);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showDeleteCompany, setShowDeleteCompany] = useState(false);
  const [showEditSubscription, setShowEditSubscription] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-detail", id],
    queryFn: () => api.get(`/companies/${id}/`).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["company-stats", id],
    queryFn: () => api.get(`/companies/${id}/stats/`).then((r) => r.data),
  });

  const { data: admins = [], isLoading: adminsLoading } = useQuery({
    queryKey: ["company-admins", id],
    queryFn: () => api.get(`/companies/${id}/admins/`).then((r) => r.data?.results ?? r.data),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["company-roles", id],
    queryFn: () => api.get(`/rbac/roles/?company_id=${id}`).then((r) => r.data?.results ?? r.data),
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

  const { data: departments = [], isLoading: deptLoading } = useQuery({
    queryKey: ["company-departments", id],
    queryFn: () => api.get(`/employees/departments/?company_id=${id}`).then(r => r.data?.results ?? r.data),
    enabled: tab === "departments",
  });

  const [leaveStatus, setLeaveStatus] = useState("");
  const { data: leaveRequests = [], isLoading: leavesLoading } = useQuery({
    queryKey: ["company-leaves", id, leaveStatus],
    queryFn: () => api.get(`/leaves/?company_id=${id}${leaveStatus ? `&status=${leaveStatus}` : ""}`).then(r => r.data?.results ?? r.data),
    enabled: tab === "leaves",
  });

  const { data: jobPosts = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["company-jobs", id],
    queryFn: () => api.get(`/recruitment/jobs/?company_id=${id}`).then(r => r.data?.results ?? r.data),
    enabled: tab === "recruitment",
  });

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ["company-candidates", id],
    queryFn: () => api.get(`/recruitment/candidates/?company_id=${id}`).then(r => r.data?.results ?? r.data),
    enabled: tab === "recruitment",
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post(`/companies/${id}/activate/`),
    onSuccess: () => { toast.success("Activated"); qc.invalidateQueries(["company-detail", id]); },
  });

  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/companies/${id}/suspend/`),
    onSuccess: () => { toast.success("Suspended"); qc.invalidateQueries(["company-detail", id]); },
  });

  const setupMutation = useMutation({
    mutationFn: () => api.post(`/companies/${id}/setup/`).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Setup complete! ${data.summary?.departments} depts, ${data.summary?.roles} roles, ${data.summary?.users?.length} demo users`);
      qc.invalidateQueries(["company-detail", id]);
      qc.invalidateQueries(["company-stats", id]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Setup failed"),
  });

  const impersonateMutation = useMutation({
    mutationFn: () => api.post(`/companies/${id}/login-as-admin/`).then(r => r.data),
    onSuccess: (data) => {
      const { accessToken, refreshToken } = store.getState().auth;
      sessionStorage.setItem("sa_access", accessToken ?? "");
      sessionStorage.setItem("sa_refresh", refreshToken ?? "");
      dispatch(setCredentials({ access: data.access, refresh: data.refresh }));
      toast.success(`Logged in as ${data.user_name || data.user_email} — ${data.company}`);
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
  const deleteAdminMutation = useMutation({
    mutationFn: (userId) => api.delete(`/companies/${id}/admins/${userId}/`),
    onSuccess: () => {
      toast.success("Admin deleted");
      qc.invalidateQueries(["company-admins", id]);
      qc.invalidateQueries(["company-stats", id]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to delete admin"),
  });

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
    { id: "departments", label: "Departments", icon: Briefcase },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "leaves", label: "Leaves", icon: Calendar },
    { id: "payroll", label: "Payroll", icon: DollarSign },
    { id: "recruitment", label: "Recruitment", icon: Activity },
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
              onClick={() => setShowEditCompany(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
            >
              <Edit className="w-4 h-4" /> Edit Profile
            </button>
            <button
              onClick={() => setShowCreateAdmin(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Add Admin
            </button>
            <button
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors"
              title="Auto-configure departments, roles, permissions, demo users, leave types"
            >
              {setupMutation.isPending
                ? <><RotateCcw className="w-4 h-4 animate-spin" /> Setting up…</>
                : <><Settings className="w-4 h-4" /> Run Setup</>}
            </button>
            <button
              onClick={() => impersonateMutation.mutate()}
              disabled={impersonateMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
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
            <button
              onClick={() => setShowDeleteCompany(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
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
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => {
              setTab(tid);
              setSearchParams(tid === "overview" ? {} : { tab: tid });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === tid ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Organization Details</h3>
              <button
                onClick={() => setShowEditCompany(true)}
                className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary-600" /> Subscription
                </h3>
                <button
                  onClick={() => setShowEditSubscription(true)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" /> {sub ? "Edit" : "Assign"}
                </button>
              </div>
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
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400 mb-3">No subscription</p>
                  <button onClick={() => setShowEditSubscription(true)} className="btn-primary text-xs">Assign Plan</button>
                </div>
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
                      <td className="px-4 py-3 font-medium text-gray-800 text-xs">{rec.employee_name || `#${rec.employee}`}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{rec.date}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{rec.check_in ? rec.check_in.slice(11, 16) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{rec.check_out ? rec.check_out.slice(11, 16) : "—"}</td>
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
                <p className="text-xs text-gray-400 text-center py-3">Showing first 100 of {attendance.length} records</p>
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
                      <td className="px-4 py-3 font-semibold text-gray-900">{pr.month}/{pr.year}</td>
                      <td className="px-4 py-3 text-gray-600">{pr.total_employees ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">₹{Number(pr.total_gross ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">₹{Number(pr.total_net ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          pr.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                          pr.status === "processing" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-500"
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

      {/* ── Departments tab ── */}
      {tab === "departments" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Departments</h3>
          </div>
          {deptLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading departments…</div>
          ) : departments.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No departments yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {departments.map(dept => (
                <div key={dept.id} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-900">{dept.name}</p>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {dept.employee_count ?? 0} emp
                    </span>
                  </div>
                  {dept.code && <p className="text-xs font-mono text-gray-400">{dept.code}</p>}
                  {dept.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{dept.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Leaves tab ── */}
      {tab === "leaves" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Leave Requests</h3>
            <select value={leaveStatus} onChange={(e) => setLeaveStatus(e.target.value)} className="input py-1.5 text-sm w-36">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {leavesLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading leaves…</div>
          ) : leaveRequests.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Employee", "Leave Type", "From", "To", "Days", "Status", "Applied On"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaveRequests.slice(0, 100).map(leave => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 text-xs">{leave.employee_name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{leave.leave_type_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{leave.from_date}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{leave.to_date}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700">{leave.total_days ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          leave.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                          leave.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {leave.applied_on ? leave.applied_on.slice(0, 10) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Recruitment tab ── */}
      {tab === "recruitment" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Open Positions</h3>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">{jobPosts.length} jobs</span>
            </div>
            {jobsLoading ? (
              <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading jobs…</div>
            ) : jobPosts.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">No job posts</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["Title", "Department", "Type", "Candidates", "Status", "Posted"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {jobPosts.map(job => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900 text-xs">{job.title}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{job.department_name || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 capitalize">{job.employment_type?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-indigo-700">{job.candidate_count ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            job.status === "open" ? "bg-emerald-100 text-emerald-700" :
                            job.status === "closed" ? "bg-gray-100 text-gray-500" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{job.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Candidates Pipeline</h3>
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-medium">{candidates.length} candidates</span>
            </div>
            {candidatesLoading ? (
              <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading candidates…</div>
            ) : candidates.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">No candidates yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["Candidate", "Job", "Stage", "Applied On"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {candidates.slice(0, 50).map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-xs">{c.full_name || `${c.first_name} ${c.last_name}`}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{c.job_title || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded capitalize">
                            {c.stage?.replace(/_/g, " ") || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {c.applied_on ? c.applied_on.slice(0, 10) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
          {adminsLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading admins...</div>
          ) : admins.length === 0 ? (
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
                          <span key={r.id ?? r.name ?? r} className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                            {r.display_name ?? r.name ?? r}
                          </span>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setEditAdmin(admin)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => setRoleAdmin(admin)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                        >
                          <Shield className="w-3 h-3" /> Roles
                        </button>
                        <button
                          onClick={() => setResetUser(admin)}
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete admin ${admin.email}?`)) deleteAdminMutation.mutate(admin.id);
                          }}
                          disabled={deleteAdminMutation.isPending}
                          className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
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
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900">Subscription Details</h3>
            <button
              onClick={() => setShowEditSubscription(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm font-medium transition-colors"
            >
              <Edit className="w-4 h-4" />
              {sub ? "Edit Subscription" : "Assign Plan"}
            </button>
          </div>
          {sub ? (
            <div className="space-y-5">
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
              {sub.plan?.features && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Plan Features</p>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(sub.plan.features) ? sub.plan.features : Object.entries(sub.plan.features)).map((f, i) => (
                      <span key={i} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium">
                        {typeof f === "string" ? f : `${f[0]}: ${f[1]}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-gray-500 mb-1">No active subscription</p>
              <p className="text-sm mb-4">Assign a plan to enable billing and feature limits</p>
              <button onClick={() => setShowEditSubscription(true)} className="btn-primary">
                Assign Subscription Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateAdmin && <CreateAdminModal companyId={id} onClose={() => setShowCreateAdmin(false)} />}
      {resetUser && <ResetPasswordModal companyId={id} user={resetUser} onClose={() => setResetUser(null)} />}
      {editAdmin && <EditAdminModal companyId={id} user={editAdmin} onClose={() => setEditAdmin(null)} />}
      {roleAdmin && <AssignRolesModal companyId={id} user={roleAdmin} roles={roles} onClose={() => setRoleAdmin(null)} />}
      {showEditCompany && company && (
        <EditCompanyModal
          company={company}
          onClose={() => setShowEditCompany(false)}
          onSaved={() => qc.invalidateQueries(["company-detail", id])}
        />
      )}
      {showDeleteCompany && company && (
        <DeleteCompanyModal
          company={company}
          onClose={() => setShowDeleteCompany(false)}
          onDeleted={() => navigate("/super-admin/companies")}
        />
      )}
      {showEditSubscription && company && (
        <EditSubscriptionModal
          company={company}
          sub={sub}
          onClose={() => setShowEditSubscription(false)}
          onSaved={() => qc.invalidateQueries(["company-detail", id])}
        />
      )}
    </div>
  );
}
