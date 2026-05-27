import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, Check, ChevronRight, CircleDollarSign, Clock, FileText, GanttChartSquare,
  History, ListChecks, Play, Plus, Search, Settings2, Trash2, Upload, X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { selectCurrentUser } from "@/redux/slices/authSlice";

const STATUS_BADGE = {
  pending: "badge-pending",
  manager_approved: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800",
  escalated: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800",
  approved: "badge-active",
  rejected: "bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium",
  cancelled: "badge-inactive",
};

const unwrap = (res) => res.data?.results ?? res.data ?? [];
const roleLabel = (value) => (value || "").replaceAll("_", " ");
const hasAnyRole = (user, roles) => user?.is_super_admin || user?.roles?.some((role) => roles.includes(role));

function ModalShell({ title, children, onClose, width = "max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${width} max-h-[92vh] overflow-hidden rounded-lg bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-64px)] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function ApplyLeaveModal({ leaveTypes, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { day_type: "full_day" } });
  const selectedType = leaveTypes?.find((item) => String(item.id) === String(watch("leave_type")));

  const mutation = useMutation({
    mutationFn: (values) => {
      const form = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (key === "document") {
          if (value?.[0]) form.append(key, value[0]);
        } else if (value !== "" && value !== undefined) {
          form.append(key, value);
        }
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
    onError: (err) => toast.error(err.response?.data?.detail || Object.values(err.response?.data ?? {}).flat().join(", ") || "Submission failed"),
  });

  return (
    <ModalShell title="Apply Leave" onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div>
          <label className="label">Leave Type</label>
          <select {...register("leave_type", { required: true })} className="input">
            <option value="">Select leave type</option>
            {leaveTypes?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {errors.leave_type && <p className="err">Leave type is required</p>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">From</label>
            <input type="date" {...register("from_date", { required: true })} className="input" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" {...register("to_date", { required: true })} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Day Option</label>
          <select {...register("day_type")} className="input">
            <option value="full_day">Full day</option>
            <option value="half_day">Half day</option>
          </select>
        </div>
        <div>
          <label className="label">Reason</label>
          <textarea {...register("reason", { required: true })} className="input min-h-24 resize-none" />
          {errors.reason && <p className="err">Reason is required</p>}
        </div>
        <div>
          <label className="label">Supporting Document {selectedType?.requires_document ? "*" : ""}</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-600 hover:border-primary-400">
            <Upload className="h-4 w-4" />
            <span>{watch("document")?.[0]?.name || "Upload file"}</span>
            <input type="file" {...register("document")} className="hidden" />
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
            {mutation.isPending ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ReviewModal({ request, onClose }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const mutation = useMutation({
    mutationFn: (action) => api.post(`/leaves/${request.id}/review/`, { action, comment }),
    onSuccess: () => {
      toast.success("Workflow updated");
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leave-dashboard"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Review failed"),
  });

  return (
    <ModalShell title="Review Leave" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4 text-sm">
          <p className="font-semibold text-gray-900">{request.employee_name}</p>
          <p className="mt-1 text-gray-600">{request.leave_type_name} · {request.total_days} days · {request.from_date} to {request.to_date}</p>
          <p className="mt-2 text-gray-700">{request.reason}</p>
        </div>
        <div>
          <label className="label">Comment</label>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="input min-h-24 resize-none" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => mutation.mutate("reject")} disabled={mutation.isPending} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            Reject
          </button>
          <button onClick={() => mutation.mutate("escalate")} disabled={mutation.isPending} className="btn-secondary">
            Escalate
          </button>
          <button onClick={() => mutation.mutate("approve")} disabled={mutation.isPending} className="btn-primary">
            Approve
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function PolicyModal({ policy, leaveTypes, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: policy || {
      leave_type: "", accrual_frequency: "monthly", credit_amount: 1, monthly_credit_timing: "month_end",
      monthly_credit_day: 1, yearly_credit_month: 1, yearly_credit_day: 5,
      is_carry_forward_enabled: false, max_carry_forward_days: 0, max_balance_days: 0,
      allow_negative_balance: false, max_negative_days: 0, auto_expire_days: 0, is_active: true,
    },
  });
  const mutation = useMutation({
    mutationFn: (data) => policy ? api.patch(`/leaves/policies/${policy.id}/`, data) : api.post("/leaves/policies/", data),
    onSuccess: () => {
      toast.success(policy ? "Leave policy updated" : "Leave policy created");
      qc.invalidateQueries({ queryKey: ["leave-policies"] });
      qc.invalidateQueries({ queryKey: ["leave-types"] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Policy save failed"),
  });

  return (
    <ModalShell title={policy ? "Edit Leave Policy" : "Create Leave Policy"} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        {!policy && (
          <div>
            <label className="label">Leave Type</label>
            <select {...register("leave_type", { required: true })} className="input">
              <option value="">Select leave type</option>
              {leaveTypes?.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Accrual Frequency</label>
            <select {...register("accrual_frequency")} className="input">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div><label className="label">Credit Amount</label><input type="number" step="0.5" {...register("credit_amount")} className="input" /></div>
          <div>
            <label className="label">Monthly Credit Date</label>
            <select {...register("monthly_credit_timing")} className="input">
              <option value="month_end">Month end</option>
              <option value="next_month_first">1st day of next month</option>
              <option value="day_of_month">Specific day</option>
            </select>
          </div>
          <div><label className="label">Specific Monthly Day</label><input type="number" min="1" max="31" {...register("monthly_credit_day")} className="input" /></div>
          <div><label className="label">Yearly Credit Month</label><input type="number" min="1" max="12" {...register("yearly_credit_month")} className="input" /></div>
          <div><label className="label">Yearly Credit Day</label><input type="number" min="1" max="31" {...register("yearly_credit_day")} className="input" /></div>
          <div><label className="label">Max Carry Forward</label><input type="number" step="0.5" {...register("max_carry_forward_days")} className="input" /></div>
          <div><label className="label">Max Balance Limit</label><input type="number" step="0.5" {...register("max_balance_days")} className="input" /></div>
          <div><label className="label">Max Negative Days</label><input type="number" step="0.5" {...register("max_negative_days")} className="input" /></div>
          <div><label className="label">Auto Expiry Days</label><input type="number" {...register("auto_expire_days")} className="input" /></div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            ["is_carry_forward_enabled", "Carry forward"],
            ["allow_negative_balance", "Allow negative balance"],
            ["is_active", "Active"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register(key)} className="rounded border-gray-300 text-primary-600" />
              {label}
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

function LeaveTypeModal({ leaveType, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: leaveType || {
      name: "", code: "", days_per_year: 0, is_paid: true, requires_document: false,
      min_notice_days: 0, is_encashable: false, requires_hr_approval: true, is_active: true,
    },
  });
  const mutation = useMutation({
    mutationFn: (data) => leaveType ? api.patch(`/leaves/types/${leaveType.id}/`, data) : api.post("/leaves/types/", data),
    onSuccess: () => {
      toast.success(leaveType ? "Leave type updated" : "Leave type created");
      qc.invalidateQueries({ queryKey: ["leave-types"] });
      onClose();
    },
    onError: () => toast.error("Leave type save failed"),
  });

  return (
    <ModalShell title={leaveType ? "Edit Leave Type" : "Create Leave Type"} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label">Name</label><input {...register("name", { required: true })} className="input" /></div>
          <div><label className="label">Code</label><input {...register("code", { required: true })} className="input" /></div>
          <div><label className="label">Annual Display Days</label><input type="number" step="0.5" {...register("days_per_year")} className="input" /></div>
          <div><label className="label">Min Notice Days</label><input type="number" {...register("min_notice_days")} className="input" /></div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            ["is_paid", "Paid leave"],
            ["requires_document", "Document required"],
            ["is_encashable", "Encashable"],
            ["requires_hr_approval", "HR final approval"],
            ["is_active", "Active"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register(key)} className="rounded border-gray-300 text-primary-600" />
              {label}
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

function HolidayModal({ holiday, departments, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: holiday || { name: "", date: "", holiday_type: "public", department: "", is_active: true } });
  const mutation = useMutation({
    mutationFn: (data) => {
      const clean = { ...data, department: data.department || null };
      return holiday ? api.patch(`/leaves/holidays/${holiday.id}/`, clean) : api.post("/leaves/holidays/", clean);
    },
    onSuccess: () => {
      toast.success(holiday ? "Holiday updated" : "Holiday created");
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["leave-calendar"] });
      onClose();
    },
    onError: () => toast.error("Holiday save failed"),
  });

  return (
    <ModalShell title={holiday ? "Edit Holiday" : "Create Holiday"} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div><label className="label">Name</label><input {...register("name", { required: true })} className="input" /></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label">Date</label><input type="date" {...register("date", { required: true })} className="input" /></div>
          <div>
            <label className="label">Type</label>
            <select {...register("holiday_type")} className="input">
              <option value="public">Public</option>
              <option value="restricted">Restricted</option>
              <option value="company">Company</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Department</label>
          <select {...register("department")} className="input">
            <option value="">All departments</option>
            {departments?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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

function StatTile({ icon: Icon, label, value, tone = "text-gray-900" }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100"><Icon className="h-5 w-5 text-gray-600" /></div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

function RequestTable({ requests, isApprovalQueue, onReview, onCancel }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Dates</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Workflow</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {requests.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No leave requests found</td></tr>
          ) : requests.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{item.employee_name}</p>
                <p className="text-xs text-gray-500">{item.employee_department || "No department"}</p>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800">{item.leave_type_name}</p>
                <p className="text-xs capitalize text-gray-500">{roleLabel(item.day_type)} · {item.total_days} days</p>
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">{item.from_date} <ChevronRight className="inline h-3 w-3" /> {item.to_date}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {item.approvals?.map((approval) => (
                    <span key={approval.id} className={`rounded-full px-2 py-0.5 text-xs capitalize ${approval.status === "approved" ? "bg-green-100 text-green-700" : approval.status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                      L{approval.level} {roleLabel(approval.role)}
                    </span>
                  ))}
                </div>
                {item.current_approver_name && <p className="mt-1 text-xs text-gray-500">Now with {item.current_approver_name}</p>}
              </td>
              <td className="px-4 py-3"><span className={STATUS_BADGE[item.status] ?? "badge-inactive"}>{roleLabel(item.status)}</span></td>
              <td className="px-4 py-3 text-right">
                {isApprovalQueue && ["pending", "manager_approved", "escalated"].includes(item.status) && (
                  <button onClick={() => onReview(item)} className="text-sm font-medium text-primary-600 hover:underline">Review</button>
                )}
                {!isApprovalQueue && ["pending", "manager_approved", "escalated"].includes(item.status) && (
                  <button onClick={() => onCancel(item.id)} className="text-sm font-medium text-red-600 hover:underline">Cancel</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LeavesPage() {
  const user = useSelector(selectCurrentUser);
  const qc = useQueryClient();
  const isAdmin = hasAnyRole(user, ["company_admin", "hr_admin"]);
  const canApprove = hasAnyRole(user, ["company_admin", "hr_admin", "manager", "team_lead"]);
  const [tab, setTab] = useState("requests");
  const [showApply, setShowApply] = useState(false);
  const [reviewReq, setReviewReq] = useState(null);
  const [policyModal, setPolicyModal] = useState(null);
  const [leaveTypeModal, setLeaveTypeModal] = useState(null);
  const [holidayModal, setHolidayModal] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data: leaveTypes = [] } = useQuery({ queryKey: ["leave-types"], queryFn: () => api.get("/leaves/types/?page_size=100").then(unwrap) });
  const { data: leavePolicies = [] } = useQuery({ queryKey: ["leave-policies"], queryFn: () => api.get("/leaves/policies/?page_size=100").then(unwrap), enabled: isAdmin });
  const { data: balances = [] } = useQuery({ queryKey: ["leave-balances"], queryFn: () => api.get("/leaves/balances/?page_size=200").then(unwrap) });
  const { data: transactions = [] } = useQuery({ queryKey: ["leave-transactions"], queryFn: () => api.get("/leaves/transactions/?page_size=100").then(unwrap) });
  const { data: creditLogs = [] } = useQuery({ queryKey: ["leave-credit-logs"], queryFn: () => api.get("/leaves/credit-logs/?page_size=100").then(unwrap), enabled: isAdmin });
  const { data: dashboard } = useQuery({ queryKey: ["leave-dashboard"], queryFn: () => api.get("/leaves/dashboard/").then((res) => res.data) });
  const { data: requestsData } = useQuery({
    queryKey: ["leaves", "requests", search, status],
    queryFn: () => api.get(`/leaves/?page_size=100&search=${search}&${status ? `status=${status}&` : ""}ordering=-created_at`).then(unwrap),
  });
  const { data: approvals = [] } = useQuery({
    queryKey: ["leaves", "approvals", status],
    queryFn: () => api.get(`/leaves/?scope=approvals&page_size=100&${status ? `status=${status}&` : ""}ordering=-created_at`).then(unwrap),
    enabled: canApprove,
  });
  const { data: calendar = { leaves: [], holidays: [] } } = useQuery({ queryKey: ["leave-calendar"], queryFn: () => api.get("/leaves/calendar/").then((res) => res.data) });
  const { data: holidays = [] } = useQuery({ queryKey: ["holidays"], queryFn: () => api.get("/leaves/holidays/?page_size=100").then(unwrap), enabled: isAdmin });
  const { data: departments = [] } = useQuery({ queryKey: ["departments-flat"], queryFn: () => api.get("/employees/departments/?page_size=100").then(unwrap), enabled: isAdmin });

  const requests = requestsData ?? [];
  const totals = useMemo(() => {
    const available = balances.reduce((sum, item) => sum + Number(item.available_days ?? 0), 0);
    const used = balances.reduce((sum, item) => sum + Number(item.used_days ?? 0), 0);
    return { available: available.toFixed(1), used: used.toFixed(1) };
  }, [balances]);

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/leaves/${id}/cancel/`),
    onSuccess: () => {
      toast.success("Leave cancelled");
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
    },
  });
  const deletePolicy = useMutation({
    mutationFn: (id) => api.delete(`/leaves/policies/${id}/`),
    onSuccess: () => {
      toast.success("Leave policy deleted");
      qc.invalidateQueries({ queryKey: ["leave-policies"] });
    },
  });
  const ensureDefaults = useMutation({
    mutationFn: () => api.post("/leaves/policies/ensure_defaults/"),
    onSuccess: () => {
      toast.success("Default EL, CL and FL policies are ready");
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

  const tabs = [
    ["requests", "Requests", FileText],
    ...(canApprove ? [["approvals", "Approvals", ListChecks]] : []),
    ["calendar", "Calendar", CalendarDays],
    ["ledger", "Ledger", History],
    ...(isAdmin ? [["policies", "Policies", Settings2], ["credits", "Credit Logs", Clock], ["holidays", "Holidays", GanttChartSquare]] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Policy-driven leave requests, balances, holidays, and approval hierarchy"
        actions={<button onClick={() => setShowApply(true)} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> Apply Leave</button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatTile icon={Clock} label="Available" value={totals.available} tone="text-primary-700" />
        <StatTile icon={Check} label="Used" value={totals.used} />
        <StatTile icon={ListChecks} label="Pending Approvals" value={dashboard?.pending_approvals ?? 0} tone="text-amber-700" />
        <StatTile icon={CircleDollarSign} label="Policies" value={leavePolicies.length || leaveTypes.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {balances.map((item) => (
          <div key={item.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">{item.leave_type_name}</p>
              <span className="text-xs text-gray-400">{item.year}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">{Number(item.available_days).toFixed(1)}</p>
            <p className="text-xs text-gray-500">{item.used_days} used · {item.pending_days} pending · {item.carried_forward} carried</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium ${tab === key ? "border-primary-600 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {["requests", "approvals"].includes(tab) && (
          <div className="flex gap-2 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="input w-52 pl-9" placeholder="Search" />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="input w-40">
              <option value="">All status</option>
              {Object.keys(STATUS_BADGE).map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}
            </select>
          </div>
        )}
      </div>

      {tab === "requests" && <div className="card p-0"><RequestTable requests={requests} onCancel={(id) => cancelMutation.mutate(id)} /></div>}
      {tab === "approvals" && <div className="card p-0"><RequestTable requests={approvals} isApprovalQueue onReview={setReviewReq} /></div>}
      {tab === "calendar" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[...calendar.leaves, ...calendar.holidays.map((item) => ({ ...item, isHoliday: true }))].map((item) => (
            <div key={`${item.isHoliday ? "h" : "l"}-${item.id}`} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{item.isHoliday ? item.name : `${item.employee_name} · ${item.leave_type_name}`}</p>
                  <p className="mt-1 text-sm text-gray-500">{item.isHoliday ? `${item.date} · ${roleLabel(item.holiday_type)}` : `${item.from_date} to ${item.to_date} · ${item.total_days} days`}</p>
                </div>
                <span className={item.isHoliday ? "badge-inactive" : STATUS_BADGE[item.status]}>{item.isHoliday ? "Holiday" : roleLabel(item.status)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "policies" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLeaveTypeModal({})} className="btn-secondary flex items-center gap-2"><Plus className="h-4 w-4" /> Create Leave Type</button>
            <button onClick={() => setPolicyModal({})} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> Create Policy</button>
            <button onClick={() => ensureDefaults.mutate()} disabled={ensureDefaults.isPending} className="btn-secondary">Ensure EL, CL, FL</button>
            <button onClick={() => runCredits.mutate()} disabled={runCredits.isPending} className="btn-secondary flex items-center gap-2"><Play className="h-4 w-4" /> Run Due Credits</button>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {leavePolicies.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{item.leave_type_name} <span className="text-xs text-gray-400">({item.leave_type_code})</span></p>
                    <p className="mt-1 text-sm capitalize text-gray-500">{item.accrual_frequency} · {item.credit_amount} days credit</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.accrual_frequency === "yearly" ? `Every ${item.yearly_credit_day}/${item.yearly_credit_month}` : roleLabel(item.monthly_credit_timing)}
                      {" "}· Cap {item.max_balance_days || "none"} · Expiry {item.auto_expire_days || "none"} days
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setPolicyModal(item)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" title="Edit"><Settings2 className="h-4 w-4" /></button>
                    <button onClick={() => deletePolicy.mutate(item.id)} className="rounded-md p-2 text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {leavePolicies.length === 0 && <div className="card p-6 text-sm text-gray-500">No leave policies configured. Use default EL, CL and FL to bootstrap policy automation.</div>}
          </div>
        </div>
      )}
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
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-gray-600">{item.effective_date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.employee_name}</td>
                    <td className="px-4 py-3">{item.leave_type_name}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{roleLabel(item.transaction_type)}<p className="text-xs text-gray-400">{item.reference}</p></td>
                    <td className="px-4 py-3 text-right">{item.days}</td>
                    <td className="px-4 py-3 text-right">{item.balance_after}</td>
                  </tr>
                ))}
                {transactions.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No leave transactions yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "credits" && (
        <div className="space-y-3">
          <button onClick={() => runCredits.mutate()} disabled={runCredits.isPending} className="btn-primary flex items-center gap-2"><Play className="h-4 w-4" /> Run Due Credits</button>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {creditLogs.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.leave_type_name} ({item.leave_type_code})</p>
                    <p className="mt-1 text-sm text-gray-500">{item.period_key} · {item.credit_date}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.employees_credited}/{item.employees_processed} employees · {item.total_days_credited} days</p>
                  </div>
                  <span className={item.status === "success" ? "badge-active" : "badge-pending"}>{item.status}</span>
                </div>
              </div>
            ))}
            {creditLogs.length === 0 && <div className="card p-6 text-sm text-gray-500">No credit runs logged yet.</div>}
          </div>
        </div>
      )}
      {tab === "holidays" && (
        <div className="space-y-3">
          <button onClick={() => setHolidayModal({})} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> Create Holiday</button>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {holidays.map((item) => (
              <button key={item.id} onClick={() => setHolidayModal(item)} className="card p-4 text-left hover:border-primary-200">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="mt-1 text-sm text-gray-500">{item.date} · {roleLabel(item.holiday_type)} · {item.department_name || "All departments"}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showApply && <ApplyLeaveModal leaveTypes={leaveTypes.filter((item) => item.is_active)} onClose={() => setShowApply(false)} />}
      {reviewReq && <ReviewModal request={reviewReq} onClose={() => setReviewReq(null)} />}
      {policyModal && <PolicyModal policy={policyModal.id ? policyModal : null} leaveTypes={leaveTypes} onClose={() => setPolicyModal(null)} />}
      {leaveTypeModal && <LeaveTypeModal leaveType={leaveTypeModal.id ? leaveTypeModal : null} onClose={() => setLeaveTypeModal(null)} />}
      {holidayModal && <HolidayModal holiday={holidayModal.id ? holidayModal : null} departments={departments} onClose={() => setHolidayModal(null)} />}
    </div>
  );
}
