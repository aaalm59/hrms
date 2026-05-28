/**
 * Enterprise Leave Management Page
 * ───────────────────────────────────
 * Tabs shown by role:
 *   Employee   : My Leaves · Balance · Calendar
 *   Team Lead  : + Team Requests · Pending Approvals
 *   Manager    : + Department Leaves · Pending Approvals · Analytics
 *   HR Admin   : + All Requests · Pending Approvals · Policies · Holidays · Analytics
 *   Company Admin: all of the above + Workflow Settings
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, BarChart3, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleDollarSign, Clock, FileText, GanttChartSquare, History, ListChecks,
  Play, Plus, Search, Settings2, Trash2, TrendingUp, Upload, UserCheck,
  Users, X, AlertTriangle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { selectCurrentUser } from "@/redux/slices/authSlice";

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  pending:          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800",
  manager_approved: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800",
  escalated:        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800",
  approved:         "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800",
  rejected:         "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800",
  cancelled:        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600",
};

const APPROVAL_STEP_COLORS = {
  approved:  "bg-green-100 text-green-700 border-green-200",
  rejected:  "bg-red-100 text-red-700 border-red-200",
  escalated: "bg-purple-100 text-purple-700 border-purple-200",
  skipped:   "bg-gray-100 text-gray-500 border-gray-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
};

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const unwrap = (res) => res.data?.results ?? res.data ?? [];
const fmt = (value) => (value || "").replaceAll("_", " ");

// ─── Role helpers ────────────────────────────────────────────────────────────────

function hasAnyRole(user, roles) {
  return user?.is_super_admin || user?.roles?.some((r) => roles.includes(r));
}

// ─── Shared UI ───────────────────────────────────────────────────────────────────

function ModalShell({ title, children, onClose, width = "max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${width} max-h-[92vh] overflow-hidden rounded-xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-64px)] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone = "text-gray-900", sub }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50">
        <Icon className="h-5 w-5 text-primary-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`mt-0.5 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function ApprovalSteps({ approvals }) {
  if (!approvals?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {approvals.map((ap, idx) => (
        <span key={ap.id} className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs capitalize ${APPROVAL_STEP_COLORS[ap.status] || APPROVAL_STEP_COLORS.pending}`}>
          L{ap.level} {ap.approver_role_display || fmt(ap.role)}
          {ap.status === "approved" && <Check className="h-3 w-3" />}
          {ap.status === "rejected" && <X className="h-3 w-3" />}
          {ap.status === "escalated" && <AlertTriangle className="h-3 w-3" />}
        </span>
      ))}
    </div>
  );
}

// ─── Apply Leave Modal ────────────────────────────────────────────────────────────

function ApplyLeaveModal({ leaveTypes, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { day_type: "full_day" } });
  const selectedType = leaveTypes?.find((item) => String(item.id) === String(watch("leave_type")));

  const mutation = useMutation({
    mutationFn: (values) => {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (k === "document") { if (v?.[0]) form.append(k, v[0]); }
        else if (v !== "" && v !== undefined) form.append(k, v);
      });
      return api.post("/leaves/", form, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      toast.success("Leave request submitted");
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
      qc.invalidateQueries({ queryKey: ["leave-dashboard"] });
      onClose();
    },
    onError: (err) => toast.error(
      err.response?.data?.detail || Object.values(err.response?.data ?? {}).flat().join(", ") || "Submission failed"
    ),
  });

  return (
    <ModalShell title="Apply for Leave" onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div>
          <label className="label">Leave Type *</label>
          <select {...register("leave_type", { required: true })} className="input">
            <option value="">Select leave type</option>
            {leaveTypes?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.code}) — {item.days_per_year} days/yr
              </option>
            ))}
          </select>
          {errors.leave_type && <p className="err">Leave type is required</p>}
        </div>
        {selectedType && (
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
            {selectedType.requires_document && <p>⚠ Document required for this leave type</p>}
            {selectedType.min_notice_days > 0 && <p>ℹ Minimum {selectedType.min_notice_days} days notice required</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">From *</label>
            <input type="date" {...register("from_date", { required: true })} className="input" />
          </div>
          <div>
            <label className="label">To *</label>
            <input type="date" {...register("to_date", { required: true })} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Day Option</label>
          <select {...register("day_type")} className="input">
            <option value="full_day">Full Day</option>
            <option value="half_day">Half Day</option>
          </select>
        </div>
        <div>
          <label className="label">Reason *</label>
          <textarea {...register("reason", { required: true })} className="input min-h-20 resize-none" placeholder="Brief reason for leave..." />
          {errors.reason && <p className="err">Reason is required</p>}
        </div>
        <div>
          <label className="label">Supporting Document {selectedType?.requires_document ? "*" : "(optional)"}</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-600 hover:border-primary-400">
            <Upload className="h-4 w-4" />
            <span>{watch("document")?.[0]?.name || "Upload file"}</span>
            <input type="file" {...register("document")} className="hidden" />
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
            {mutation.isPending ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────────

function ReviewModal({ request, onClose }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: (action) => api.post(`/leaves/${request.id}/review/`, { action, comment }),
    onSuccess: (_, action) => {
      const labels = { approve: "approved ✓", reject: "rejected", escalate: "escalated to HR" };
      toast.success(`Leave ${labels[action] || action}`);
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leave-dashboard"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Review failed"),
  });

  return (
    <ModalShell title="Review Leave Request" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{request.employee_name}</p>
              <p className="text-xs text-gray-500">{request.employee_id_code} · {request.employee_department}</p>
            </div>
            <span className={STATUS_BADGE[request.status]}>{fmt(request.status)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div><span className="font-medium">Type: </span>{request.leave_type_name}</div>
            <div><span className="font-medium">Days: </span>{request.total_days} ({fmt(request.day_type)})</div>
            <div><span className="font-medium">From: </span>{request.from_date}</div>
            <div><span className="font-medium">To: </span>{request.to_date}</div>
          </div>
          <p className="text-sm text-gray-700 italic">"{request.reason}"</p>
          {request.approvals?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Approval Chain:</p>
              <ApprovalSteps approvals={request.approvals} />
            </div>
          )}
        </div>
        <div>
          <label className="label">Comment (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="input min-h-20 resize-none"
            placeholder="Add a note for the employee..."
          />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => mutation.mutate("reject")}
            disabled={mutation.isPending}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Reject
          </button>
          <button
            onClick={() => mutation.mutate("escalate")}
            disabled={mutation.isPending}
            className="btn-secondary flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="h-4 w-4" /> Escalate
          </button>
          <button
            onClick={() => mutation.mutate("approve")}
            disabled={mutation.isPending}
            className="btn-primary flex items-center justify-center gap-1.5"
          >
            <Check className="h-4 w-4" /> Approve
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Leave Request Table ──────────────────────────────────────────────────────────

function LeaveTable({ requests, showEmployee = true, isApprovalQueue = false, onReview, onCancel }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            {showEmployee && <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>}
            <th className="px-4 py-3 text-left font-medium text-gray-600">Leave Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Period</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Approval Chain</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {!requests?.length ? (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No leave requests found</td></tr>
          ) : requests.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              {showEmployee && (
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{item.employee_name}</p>
                  <p className="text-xs text-gray-500">{item.employee_id_code} · {item.employee_department || "—"}</p>
                  {item.employee_team && <p className="text-xs text-indigo-500">{item.employee_team}</p>}
                </td>
              )}
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800">{item.leave_type_name}</p>
                <p className="text-xs capitalize text-gray-500">{fmt(item.day_type)} · {item.total_days} day{Number(item.total_days) !== 1 ? "s" : ""}</p>
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">
                <p>{item.from_date}</p>
                <p className="text-gray-400">→ {item.to_date}</p>
              </td>
              <td className="px-4 py-3">
                <ApprovalSteps approvals={item.approvals} />
                {item.current_approver_name && (
                  <p className="mt-1 text-xs text-gray-400">Waiting: {item.current_approver_name}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={STATUS_BADGE[item.status] ?? STATUS_BADGE.cancelled}>{fmt(item.status)}</span>
              </td>
              <td className="px-4 py-3 text-right">
                {isApprovalQueue && item.can_approve && (
                  <button
                    onClick={() => onReview(item)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                  >
                    <UserCheck className="h-3.5 w-3.5" /> Review
                  </button>
                )}
                {!isApprovalQueue && ["pending", "manager_approved", "escalated"].includes(item.status) && (
                  <button
                    onClick={() => onCancel(item.id)}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Analytics View ────────────────────────────────────────────────────────────────

function AnalyticsView({ analytics }) {
  if (!analytics) return <div className="py-12 text-center text-gray-400">Loading analytics…</div>;

  const statusData = Object.entries(analytics.status_counts || {}).map(([name, value]) => ({ name: fmt(name), value }));
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyData = (analytics.monthly_trend || []).map((item) => ({
    month: monthNames[(item.from_date__month || 1) - 1],
    count: item.count,
    days: Number(item.days || 0).toFixed(1),
  }));
  const byType = (analytics.by_type || []).map((item) => ({
    name: item["leave_type__name"] || "Unknown",
    total: item.total,
    days: Number(item.days || 0).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={FileText} label="Total Requests" value={analytics.total_requests ?? 0} />
        <StatTile icon={Clock} label="Pending" value={analytics.pending_count ?? 0} tone="text-amber-700" />
        <StatTile icon={Users} label="On Leave Now" value={analytics.on_leave_now ?? 0} tone="text-red-600" />
        <StatTile icon={Check} label="Approved" value={analytics.status_counts?.approved ?? 0} tone="text-green-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly trend */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Monthly Leave Trend ({analytics.year})</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">No approved leaves this year yet</p>
          )}
        </div>

        {/* Status distribution */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Status Distribution</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">No data</p>
          )}
        </div>
      </div>

      {/* By leave type */}
      {byType.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Leave by Type</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Leave Type</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Requests</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Total Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {byType.map((item) => (
                  <tr key={item.name}>
                    <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.total}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-500">{item.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By department (HR / Admin only) */}
      {analytics.by_department?.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Leave by Department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.by_department.map((d) => ({
              dept: d["employee__department__name"] || "Unknown",
              requests: d.total,
              days: Number(d.days || 0).toFixed(1),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="requests" fill="#10b981" radius={[3, 3, 0, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Policy Modal ──────────────────────────────────────────────────────────────────

function PolicyModal({ policy, leaveTypes, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: policy || {
      leave_type: "", accrual_frequency: "monthly", credit_amount: 1,
      monthly_credit_timing: "month_end", monthly_credit_day: 1,
      yearly_credit_month: 1, yearly_credit_day: 5,
      is_carry_forward_enabled: false, max_carry_forward_days: 0,
      max_balance_days: 0, allow_negative_balance: false,
      max_negative_days: 0, auto_expire_days: 0, is_active: true,
    },
  });
  const mutation = useMutation({
    mutationFn: (data) => policy
      ? api.patch(`/leaves/policies/${policy.id}/`, data)
      : api.post("/leaves/policies/", data),
    onSuccess: () => {
      toast.success(policy ? "Policy updated" : "Policy created");
      qc.invalidateQueries({ queryKey: ["leave-policies"] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Save failed"),
  });

  return (
    <ModalShell title={policy?.id ? "Edit Leave Policy" : "Create Leave Policy"} onClose={onClose} width="max-w-xl">
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        {!policy?.id && (
          <div>
            <label className="label">Leave Type</label>
            <select {...register("leave_type", { required: true })} className="input">
              <option value="">Select leave type</option>
              {leaveTypes?.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Accrual Frequency</label>
            <select {...register("accrual_frequency")} className="input">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div><label className="label">Credit Amount (days)</label><input type="number" step="0.5" {...register("credit_amount")} className="input" /></div>
          <div>
            <label className="label">Monthly Credit Timing</label>
            <select {...register("monthly_credit_timing")} className="input">
              <option value="month_end">Month End</option>
              <option value="next_month_first">1st of Next Month</option>
              <option value="day_of_month">Specific Day</option>
            </select>
          </div>
          <div><label className="label">Specific Day</label><input type="number" min="1" max="31" {...register("monthly_credit_day")} className="input" /></div>
          <div><label className="label">Yearly Credit Month</label><input type="number" min="1" max="12" {...register("yearly_credit_month")} className="input" /></div>
          <div><label className="label">Yearly Credit Day</label><input type="number" min="1" max="31" {...register("yearly_credit_day")} className="input" /></div>
          <div><label className="label">Max Carry Forward</label><input type="number" step="0.5" {...register("max_carry_forward_days")} className="input" /></div>
          <div><label className="label">Max Balance Limit</label><input type="number" step="0.5" {...register("max_balance_days")} className="input" /></div>
          <div><label className="label">Max Negative Days</label><input type="number" step="0.5" {...register("max_negative_days")} className="input" /></div>
          <div><label className="label">Auto Expiry Days</label><input type="number" {...register("auto_expire_days")} className="input" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[["is_carry_forward_enabled", "Carry Forward"], ["allow_negative_balance", "Allow Negative Balance"], ["is_active", "Active"]].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register(k)} className="rounded border-gray-300 text-primary-600" /> {l}
            </label>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">Save Policy</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Leave Type Modal ─────────────────────────────────────────────────────────────

function LeaveTypeModal({ leaveType, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: leaveType || {
      name: "", code: "", days_per_year: 0, is_paid: true, requires_document: false,
      min_notice_days: 0, gender_specific: "", is_encashable: false,
      requires_hr_approval: true, is_active: true,
    },
  });
  const mutation = useMutation({
    mutationFn: (data) => leaveType?.id
      ? api.patch(`/leaves/types/${leaveType.id}/`, data)
      : api.post("/leaves/types/", data),
    onSuccess: () => {
      toast.success(leaveType?.id ? "Leave type updated" : "Leave type created");
      qc.invalidateQueries({ queryKey: ["leave-types"] });
      onClose();
    },
    onError: () => toast.error("Save failed"),
  });

  return (
    <ModalShell title={leaveType?.id ? "Edit Leave Type" : "Create Leave Type"} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Name</label><input {...register("name", { required: true })} className="input" /></div>
          <div><label className="label">Code (e.g. EL)</label><input {...register("code", { required: true })} className="input" /></div>
          <div><label className="label">Days / Year</label><input type="number" step="0.5" {...register("days_per_year")} className="input" /></div>
          <div><label className="label">Min Notice Days</label><input type="number" {...register("min_notice_days")} className="input" /></div>
          <div>
            <label className="label">Gender Specific</label>
            <select {...register("gender_specific")} className="input">
              <option value="">All genders</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[["is_paid","Paid leave"],["requires_document","Document required"],["is_encashable","Encashable"],["requires_hr_approval","HR final approval"],["is_active","Active"]].map(([k,l]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register(k)} className="rounded border-gray-300 text-primary-600" /> {l}
            </label>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">Save</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Holiday Modal ────────────────────────────────────────────────────────────────

function HolidayModal({ holiday, departments, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: holiday || { name: "", date: "", holiday_type: "public", department: "", is_active: true },
  });
  const mutation = useMutation({
    mutationFn: (data) => {
      const clean = { ...data, department: data.department || null };
      return holiday?.id
        ? api.patch(`/leaves/holidays/${holiday.id}/`, clean)
        : api.post("/leaves/holidays/", clean);
    },
    onSuccess: () => {
      toast.success(holiday?.id ? "Holiday updated" : "Holiday created");
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["leave-calendar"] });
      onClose();
    },
    onError: () => toast.error("Save failed"),
  });

  return (
    <ModalShell title={holiday?.id ? "Edit Holiday" : "Create Holiday"} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div><label className="label">Name</label><input {...register("name", { required: true })} className="input" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Date</label><input type="date" {...register("date", { required: true })} className="input" /></div>
          <div>
            <label className="label">Type</label>
            <select {...register("holiday_type")} className="input">
              <option value="public">Public Holiday</option>
              <option value="restricted">Restricted Holiday</option>
              <option value="company">Company Holiday</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Department</label>
          <select {...register("department")} className="input">
            <option value="">All Departments</option>
            {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register("is_active")} className="rounded border-gray-300 text-primary-600" /> Active
        </label>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">Save</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Reporting Manager Modal ──────────────────────────────────────────────────────

function ReportingManagerModal({ employee, employees, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: { employee: employee?.id || "", manager: "", level: 1, is_active: true },
  });
  const mutation = useMutation({
    mutationFn: (data) => api.post("/leaves/reporting-managers/", data),
    onSuccess: () => {
      toast.success("Reporting manager assigned");
      qc.invalidateQueries({ queryKey: ["reporting-managers"] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <ModalShell title="Assign Reporting Manager" onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div>
          <label className="label">Employee</label>
          <select {...register("employee", { required: true })} className="input" defaultValue={employee?.id || ""}>
            <option value="">Select employee</option>
            {employees?.map((e) => <option key={e.id} value={e.id}>{e.full_name || `${e.first_name} ${e.last_name}`} ({e.employee_id})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Manager</label>
          <select {...register("manager", { required: true })} className="input">
            <option value="">Select manager</option>
            {employees?.map((e) => <option key={e.id} value={e.id}>{e.full_name || `${e.first_name} ${e.last_name}`} ({e.employee_id})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Level</label>
          <input type="number" min="1" max="5" {...register("level")} className="input" />
          <p className="mt-1 text-xs text-gray-500">Level 1 = direct manager, Level 2 = skip-level, etc.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">Assign</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Main LeavesPage ───────────────────────────────────────────────────────────────

export default function LeavesPage() {
  const user = useSelector(selectCurrentUser);
  const qc = useQueryClient();

  // Role checks
  const isAdmin      = hasAnyRole(user, ["company_admin", "hr_admin"]);
  const isManager    = hasAnyRole(user, ["manager"]);
  const isTeamLead   = hasAnyRole(user, ["team_lead"]);
  const canApprove   = hasAnyRole(user, ["company_admin", "hr_admin", "manager", "team_lead"]);

  // UI state
  const [tab, setTab] = useState("my-leaves");
  const [showApply, setShowApply] = useState(false);
  const [reviewReq, setReviewReq] = useState(null);
  const [policyModal, setPolicyModal] = useState(null);
  const [leaveTypeModal, setLeaveTypeModal] = useState(null);
  const [holidayModal, setHolidayModal] = useState(null);
  const [rmModal, setRmModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── Data queries ───────────────────────────────────────────────────────────────

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => api.get("/leaves/types/?page_size=100").then(unwrap),
  });
  const { data: balances = [] } = useQuery({
    queryKey: ["leave-balances"],
    queryFn: () => api.get("/leaves/balances/?page_size=200").then(unwrap),
  });
  const { data: dashboard } = useQuery({
    queryKey: ["leave-dashboard"],
    queryFn: () => api.get("/leaves/dashboard/").then((r) => r.data),
  });
  const { data: myLeaves = [] } = useQuery({
    queryKey: ["leaves", "my", search, statusFilter],
    queryFn: () => api.get(`/leaves/?page_size=100&search=${search}${statusFilter ? `&status=${statusFilter}` : ""}&ordering=-created_at`).then(unwrap),
  });
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["leaves", "my-approvals"],
    queryFn: () => api.get("/leaves/my_approvals/?page_size=100").then(unwrap),
    enabled: canApprove,
  });
  const { data: teamLeaves = [] } = useQuery({
    queryKey: ["leaves", "team", search, statusFilter],
    queryFn: () => api.get(`/leaves/team_leaves/?page_size=200&search=${search}${statusFilter ? `&status=${statusFilter}` : ""}`).then(unwrap),
    enabled: canApprove,
  });
  const { data: analytics } = useQuery({
    queryKey: ["leave-analytics"],
    queryFn: () => api.get("/leaves/analytics/").then((r) => r.data),
    enabled: canApprove,
  });
  const { data: calendar = { leaves: [], holidays: [] } } = useQuery({
    queryKey: ["leave-calendar"],
    queryFn: () => api.get("/leaves/calendar/").then((r) => r.data),
  });
  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => api.get("/leaves/holidays/?page_size=100").then(unwrap),
    enabled: isAdmin,
  });
  const { data: leavePolicies = [] } = useQuery({
    queryKey: ["leave-policies"],
    queryFn: () => api.get("/leaves/policies/?page_size=100").then(unwrap),
    enabled: isAdmin,
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ["leave-transactions"],
    queryFn: () => api.get("/leaves/transactions/?page_size=100").then(unwrap),
  });
  const { data: creditLogs = [] } = useQuery({
    queryKey: ["leave-credit-logs"],
    queryFn: () => api.get("/leaves/credit-logs/?page_size=100").then(unwrap),
    enabled: isAdmin,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-flat"],
    queryFn: () => api.get("/employees/departments/?page_size=100").then(unwrap),
    enabled: isAdmin,
  });
  const { data: reportingManagers = [] } = useQuery({
    queryKey: ["reporting-managers"],
    queryFn: () => api.get("/leaves/reporting-managers/?page_size=200").then(unwrap),
    enabled: isAdmin,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-flat"],
    queryFn: () => api.get("/employees/?page_size=500&fields=id,first_name,last_name,employee_id").then(unwrap),
    enabled: isAdmin,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/leaves/${id}/cancel/`),
    onSuccess: () => {
      toast.success("Leave cancelled");
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Cancel failed"),
  });

  const deletePolicy = useMutation({
    mutationFn: (id) => api.delete(`/leaves/policies/${id}/`),
    onSuccess: () => { toast.success("Policy deleted"); qc.invalidateQueries({ queryKey: ["leave-policies"] }); },
  });

  const deleteRM = useMutation({
    mutationFn: (id) => api.delete(`/leaves/reporting-managers/${id}/`),
    onSuccess: () => { toast.success("Reporting manager removed"); qc.invalidateQueries({ queryKey: ["reporting-managers"] }); },
  });

  const ensureDefaults = useMutation({
    mutationFn: () => api.post("/leaves/policies/ensure_defaults/"),
    onSuccess: () => {
      toast.success("Default EL, CL, SL and FL policies ensured");
      qc.invalidateQueries({ queryKey: ["leave-types"] });
      qc.invalidateQueries({ queryKey: ["leave-policies"] });
    },
  });

  const runCredits = useMutation({
    mutationFn: () => api.post("/leaves/policies/run_credits/", { force: false }),
    onSuccess: () => {
      toast.success("Leave credit job completed");
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
      qc.invalidateQueries({ queryKey: ["leave-transactions"] });
      qc.invalidateQueries({ queryKey: ["leave-credit-logs"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Credit job failed"),
  });

  // ── Computed ───────────────────────────────────────────────────────────────────

  const myBalance = useMemo(() => {
    const available = balances.reduce((s, b) => s + Number(b.available_days ?? 0), 0);
    const used = balances.reduce((s, b) => s + Number(b.used_days ?? 0), 0);
    return { available: available.toFixed(1), used: used.toFixed(1) };
  }, [balances]);

  const currentYear = new Date().getFullYear();
  const myCurrentYearBalances = balances.filter((b) => b.year === currentYear);

  // ── Tab definitions by role ────────────────────────────────────────────────────

  const tabs = [
    ["my-leaves", "My Leaves", FileText],
    ["balance", "My Balance", CircleDollarSign],
    ["calendar", "Calendar", CalendarDays],
    ["ledger", "Ledger", History],
    ...(canApprove ? [["pending-approvals", `Approvals${pendingApprovals.length ? ` (${pendingApprovals.length})` : ""}`, ListChecks]] : []),
    ...(canApprove ? [["team-leaves", "Team Leaves", Users]] : []),
    ...(canApprove ? [["analytics", "Analytics", BarChart3]] : []),
    ...(isAdmin ? [["policies", "Policies", Settings2], ["holidays", "Holidays", GanttChartSquare], ["hierarchy", "Hierarchy", UserCheck], ["credits", "Credit Logs", Clock]] : []),
  ];

  const activeLeaves = [...(calendar.leaves || []), ...(calendar.holidays || []).map((h) => ({ ...h, isHoliday: true }))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Enterprise leave workflow with hierarchy-based approvals"
        actions={
          <button onClick={() => setShowApply(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Apply Leave
          </button>
        }
      />

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={CircleDollarSign} label="Available Days" value={myBalance.available} tone="text-primary-700" sub={`${currentYear}`} />
        <StatTile icon={Check} label="Days Used" value={myBalance.used} />
        <StatTile icon={ListChecks} label="Pending Approvals" value={dashboard?.pending_approvals ?? 0} tone="text-amber-700" />
        <StatTile icon={Users} label="On Leave Today" value={dashboard?.on_leave_today ?? 0} tone="text-red-600" />
      </div>

      {/* ── Balance Cards (current year) ── */}
      {myCurrentYearBalances.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {myCurrentYearBalances.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">{b.leave_type_name}</p>
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">{b.leave_type_code}</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900 tabular-nums">{Number(b.available_days).toFixed(1)}</p>
              <p className="text-xs text-gray-400">available</p>
              <div className="mt-2 flex gap-3 text-xs text-gray-500">
                <span>{b.used_days} used</span>
                <span>·</span>
                <span className="text-amber-600">{b.pending_days} pending</span>
                {Number(b.carried_forward) > 0 && <><span>·</span><span className="text-green-600">{b.carried_forward} carried</span></>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200">
        <div className="flex flex-wrap gap-0.5">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {["my-leaves", "team-leaves", "pending-approvals"].includes(tab) && (
          <div className="flex gap-2 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="input w-52 pl-9" placeholder="Search…" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-40">
              <option value="">All Status</option>
              {Object.keys(STATUS_BADGE).map((s) => <option key={s} value={s}>{fmt(s)}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Tab content ── */}

      {/* My Leaves */}
      {tab === "my-leaves" && (
        <div className="card p-0">
          <LeaveTable
            requests={myLeaves}
            showEmployee={false}
            onCancel={(id) => cancelMutation.mutate(id)}
          />
        </div>
      )}

      {/* My Balance */}
      {tab === "balance" && (
        <div className="space-y-4">
          {balances.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-500">No leave balances allocated for your account.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {balances.map((b) => (
                <div key={b.id} className="card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{b.leave_type_name}</p>
                      <p className="text-xs text-gray-400">{b.year} · {b.leave_type_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-700 tabular-nums">{Number(b.available_days).toFixed(1)}</p>
                      <p className="text-xs text-gray-400">available</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${Math.min(100, (Number(b.used_days) / (Number(b.total_days) || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>{b.used_days} used</span>
                    <span>{b.total_days} total</span>
                  </div>
                  {Number(b.carried_forward) > 0 && (
                    <p className="mt-1 text-xs text-green-600">+{b.carried_forward} carried forward</p>
                  )}
                  {Number(b.pending_days) > 0 && (
                    <p className="mt-1 text-xs text-amber-600">{b.pending_days} day(s) pending approval</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      {tab === "calendar" && (
        <div className="space-y-3">
          {activeLeaves.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-500">No upcoming leaves or holidays</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeLeaves.map((item) => (
                <div key={`${item.isHoliday ? "h" : "l"}-${item.id}`} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.isHoliday ? item.name : `${item.employee_name}`}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {item.isHoliday
                          ? `${item.date} · ${fmt(item.holiday_type)}`
                          : `${item.leave_type_name} · ${item.from_date} → ${item.to_date} (${item.total_days}d)`}
                      </p>
                      {!item.isHoliday && item.employee_department && (
                        <p className="text-xs text-gray-400">{item.employee_department}</p>
                      )}
                    </div>
                    <span className={item.isHoliday ? STATUS_BADGE.cancelled : STATUS_BADGE[item.status] ?? STATUS_BADGE.cancelled}>
                      {item.isHoliday ? "Holiday" : fmt(item.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ledger */}
      {tab === "ledger" && (
        <div className="card p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Transaction</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Days</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No leave transactions yet</td></tr>
                  : transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{t.effective_date}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{t.employee_name}<p className="text-xs text-gray-400">{t.employee_id_code}</p></td>
                      <td className="px-4 py-3">{t.leave_type_name}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">{fmt(t.transaction_type)}<p className="text-xs text-gray-400">{t.reference}</p></td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${Number(t.days) >= 0 ? "text-green-600" : "text-red-600"}`}>{t.days}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{t.balance_after}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Approvals */}
      {tab === "pending-approvals" && (
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="card p-10 text-center">
              <Check className="mx-auto mb-3 h-10 w-10 text-green-400" />
              <p className="font-medium text-gray-700">All caught up!</p>
              <p className="text-sm text-gray-400">No leave requests are pending your approval.</p>
            </div>
          ) : (
            <div className="card p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="font-medium text-gray-900">{pendingApprovals.length} request{pendingApprovals.length !== 1 ? "s" : ""} awaiting your review</p>
              </div>
              <LeaveTable
                requests={pendingApprovals}
                isApprovalQueue
                onReview={setReviewReq}
              />
            </div>
          )}
        </div>
      )}

      {/* Team Leaves */}
      {tab === "team-leaves" && (
        <div className="card p-0">
          <LeaveTable
            requests={teamLeaves}
            isApprovalQueue={canApprove}
            onReview={setReviewReq}
            onCancel={(id) => cancelMutation.mutate(id)}
          />
        </div>
      )}

      {/* Analytics */}
      {tab === "analytics" && <AnalyticsView analytics={analytics} />}

      {/* Policies (HR Admin) */}
      {tab === "policies" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLeaveTypeModal({})} className="btn-secondary flex items-center gap-2"><Plus className="h-4 w-4" /> Leave Type</button>
            <button onClick={() => setPolicyModal({})} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> Leave Policy</button>
            <button onClick={() => ensureDefaults.mutate()} disabled={ensureDefaults.isPending} className="btn-secondary">Seed EL, CL, SL, FL</button>
            <button onClick={() => runCredits.mutate()} disabled={runCredits.isPending} className="btn-secondary flex items-center gap-2"><Play className="h-4 w-4" /> Run Credits</button>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {leavePolicies.length === 0 ? (
              <div className="card p-6 text-sm text-gray-500">No policies yet. Use "Seed EL, CL, SL, FL" to bootstrap defaults.</div>
            ) : leavePolicies.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{p.leave_type_name}</p>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{p.leave_type_code}</span>
                      {!p.is_active && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500">Inactive</span>}
                    </div>
                    <p className="mt-1 text-sm capitalize text-gray-500">{fmt(p.accrual_frequency)} · {p.credit_amount} days credit</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {p.accrual_frequency === "yearly"
                        ? `Credit on ${p.yearly_credit_day}/${p.yearly_credit_month}`
                        : fmt(p.monthly_credit_timing)}
                      {" "}· Cap {p.max_balance_days || "∞"} · Expiry {p.auto_expire_days || "none"}d
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setPolicyModal(p)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><Settings2 className="h-4 w-4" /></button>
                    <button onClick={() => deletePolicy.mutate(p.id)} className="rounded-md p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holidays (HR Admin) */}
      {tab === "holidays" && (
        <div className="space-y-3">
          <button onClick={() => setHolidayModal({})} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> Add Holiday</button>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {holidays.map((h) => (
              <button key={h.id} onClick={() => setHolidayModal(h)} className="card p-4 text-left hover:border-primary-200 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">{h.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${h.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {h.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{h.date}</p>
                <p className="text-xs text-gray-400">{fmt(h.holiday_type)} · {h.department_name || "All Departments"}</p>
              </button>
            ))}
            {holidays.length === 0 && <div className="card p-6 text-sm text-gray-500">No holidays configured.</div>}
          </div>
        </div>
      )}

      {/* Reporting Hierarchy (HR Admin) */}
      {tab === "hierarchy" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Reporting Hierarchy</h3>
              <p className="text-sm text-gray-500">Explicit reporting manager overrides for the approval chain</p>
            </div>
            <button onClick={() => setRmModal(true)} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> Assign Manager</button>
          </div>
          <div className="card p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Reports To</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Level</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportingManagers.length === 0
                  ? <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No reporting manager overrides configured</td></tr>
                  : reportingManagers.map((rm) => (
                    <tr key={rm.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{rm.employee_name}<p className="text-xs text-gray-400">{rm.employee_id_code}</p></td>
                      <td className="px-4 py-3 text-gray-700">{rm.manager_name}<p className="text-xs text-gray-400">{rm.manager_id_code}</p></td>
                      <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">L{rm.level}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${rm.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{rm.is_active ? "Active" : "Inactive"}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteRM.mutate(rm.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit Logs (HR Admin) */}
      {tab === "credits" && (
        <div className="space-y-3">
          <button onClick={() => runCredits.mutate()} disabled={runCredits.isPending} className="btn-primary flex items-center gap-2"><Play className="h-4 w-4" /> Run Due Credits</button>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {creditLogs.length === 0
              ? <div className="card p-6 text-sm text-gray-500">No credit runs logged yet.</div>
              : creditLogs.map((log) => (
                <div key={log.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{log.leave_type_name} ({log.leave_type_code})</p>
                      <p className="mt-1 text-sm text-gray-500">{log.period_key} · {log.credit_date}</p>
                      <p className="mt-1 text-xs text-gray-400">{log.employees_credited}/{log.employees_processed} employees credited · {log.total_days_credited} days</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${log.status === "success" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{log.status}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showApply && <ApplyLeaveModal leaveTypes={leaveTypes.filter((t) => t.is_active)} onClose={() => setShowApply(false)} />}
      {reviewReq && <ReviewModal request={reviewReq} onClose={() => setReviewReq(null)} />}
      {policyModal !== null && <PolicyModal policy={policyModal?.id ? policyModal : null} leaveTypes={leaveTypes} onClose={() => setPolicyModal(null)} />}
      {leaveTypeModal !== null && <LeaveTypeModal leaveType={leaveTypeModal?.id ? leaveTypeModal : null} onClose={() => setLeaveTypeModal(null)} />}
      {holidayModal !== null && <HolidayModal holiday={holidayModal?.id ? holidayModal : null} departments={departments} onClose={() => setHolidayModal(null)} />}
      {rmModal && <ReportingManagerModal employees={employees} onClose={() => setRmModal(false)} />}
    </div>
  );
}