import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Plus, Search, Check, X, Clock, ArrowUpRight, ChevronDown
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { format, differenceInCalendarDays, parseISO } from "date-fns";

const STATUS_BADGE = {
  pending: "badge-pending",
  approved: "badge-active",
  rejected: "bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium",
  cancelled: "badge-inactive",
};

function ApplyLeaveModal({ onClose, leaveTypes }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const start = watch("start_date");
  const end = watch("end_date");
  const days = start && end ? Math.max(0, differenceInCalendarDays(parseISO(end), parseISO(start)) + 1) : 0;

  const mutation = useMutation({
    mutationFn: (d) => api.post("/leaves/leave-requests/", d),
    onSuccess: () => {
      toast.success("Leave request submitted");
      qc.invalidateQueries(["my-leave-requests"]);
      qc.invalidateQueries(["leave-balances"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Submission failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Apply for Leave</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select {...register("leave_type", { required: true })} className="input">
              <option value="">Select leave type...</option>
              {leaveTypes?.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
            {errors.leave_type && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input type="date" {...register("start_date", { required: true })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input type="date" {...register("end_date", { required: true })} className="input" />
            </div>
          </div>
          {days > 0 && (
            <p className="text-sm text-primary-600 font-medium">{days} day{days > 1 ? "s" : ""} selected</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Half Day</label>
            <select {...register("half_day")} className="input">
              <option value="">No (Full Day)</option>
              <option value="first_half">First Half</option>
              <option value="second_half">Second Half</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              {...register("reason", { required: true })}
              className="input h-20 resize-none"
              placeholder="Reason for leave..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Submitting..." : "Apply Leave"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeaveReviewModal({ request, onClose }) {
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState("");

  const review = useMutation({
    mutationFn: ({ action }) => api.post(`/leaves/leave-requests/${request.id}/review/`, { action, remarks }),
    onSuccess: (_, { action }) => {
      toast.success(`Leave ${action}d`);
      qc.invalidateQueries(["team-leave-requests"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Review failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Review Leave Request</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <p><span className="text-gray-500">Employee:</span> <span className="font-medium">{request.employee_name}</span></p>
            <p><span className="text-gray-500">Type:</span> <span className="font-medium">{request.leave_type_name}</span></p>
            <p><span className="text-gray-500">Duration:</span> <span className="font-medium">{request.start_date} → {request.end_date} ({request.total_days} days)</span></p>
            <p><span className="text-gray-500">Reason:</span> <span className="font-medium">{request.reason}</span></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
            <textarea
              className="input h-20 resize-none"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add review remarks..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => review.mutate({ action: "reject" })}
              disabled={review.isPending}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => review.mutate({ action: "approve" })}
              disabled={review.isPending}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeavesPage() {
  const user = useSelector(selectCurrentUser);
  const isHR = user?.roles?.some((r) => ["hr_admin", "company_admin", "manager"].includes(r));
  const [tab, setTab] = useState("my");
  const [showApply, setShowApply] = useState(false);
  const [reviewReq, setReviewReq] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => api.get("/leaves/leave-types/").then((r) => r.data?.results ?? r.data),
  });

  const { data: balances } = useQuery({
    queryKey: ["leave-balances"],
    queryFn: () => api.get("/leaves/leave-balances/").then((r) => r.data?.results ?? r.data),
  });

  const { data: myRequests } = useQuery({
    queryKey: ["my-leave-requests", statusFilter],
    queryFn: () =>
      api.get(`/leaves/leave-requests/?${statusFilter ? `status=${statusFilter}&` : ""}ordering=-applied_on`).then((r) => r.data),
  });

  const { data: teamRequests } = useQuery({
    queryKey: ["team-leave-requests", search, statusFilter],
    queryFn: () =>
      api.get(`/leaves/leave-requests/?search=${search}&${statusFilter ? `status=${statusFilter}&` : ""}ordering=-applied_on`).then((r) => r.data),
    enabled: isHR && tab === "team",
  });

  const cancelLeave = useMutation({
    mutationFn: (id) => api.post(`/leaves/leave-requests/${id}/review/`, { action: "cancel" }),
    onSuccess: () => {
      toast.success("Leave cancelled");
      useQueryClient().invalidateQueries(["my-leave-requests"]);
    },
  });

  const requests = tab === "my" ? myRequests?.results ?? [] : teamRequests?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Manage your leaves and team approvals"
        actions={
          <button onClick={() => setShowApply(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        }
      />

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {balances?.map((b) => {
          const remaining = (b.total_days - b.used_days).toFixed(1);
          const pct = b.total_days > 0 ? ((b.total_days - b.used_days) / b.total_days) * 100 : 0;
          return (
            <div key={b.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">{b.leave_type_name}</p>
                <span className="text-xs text-gray-400">{format(new Date(), "yyyy")}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{remaining}</p>
              <p className="text-xs text-gray-500 mb-2">of {b.total_days} days remaining</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{b.used_days} used · {b.carry_forward ?? 0} carried</p>
            </div>
          );
        })}
        {(!balances || balances.length === 0) && (
          <div className="col-span-full text-center py-4 text-gray-400 text-sm">No leave balances configured</div>
        )}
      </div>

      {/* Leave Requests */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isHR && (
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {["my", "team"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                  >
                    {t === "my" ? "My Leaves" : "Team Leaves"}
                  </button>
                ))}
              </div>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input py-1.5 text-sm w-36"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {tab === "team" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9 py-1.5 text-sm w-48"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {tab === "team" && <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>}
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Days</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Applied On</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              {isHR && tab === "team" && <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {requests.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No leave requests found</td></tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  {tab === "team" && (
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{req.employee_name}</p>
                      <p className="text-xs text-gray-400">{req.employee_id}</p>
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-gray-800">{req.leave_type_name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {req.start_date} → {req.end_date}
                    {req.half_day && <span className="ml-1 text-orange-600">({req.half_day.replace("_", " ")})</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{req.total_days}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{req.reason || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {req.applied_on ? format(parseISO(req.applied_on), "dd MMM yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[req.status] ?? "badge-inactive"}>{req.status}</span>
                  </td>
                  {isHR && tab === "team" && (
                    <td className="px-4 py-3">
                      {req.status === "pending" && (
                        <button
                          onClick={() => setReviewReq(req)}
                          className="text-xs text-primary-600 hover:underline font-medium"
                        >
                          Review
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showApply && (
        <ApplyLeaveModal onClose={() => setShowApply(false)} leaveTypes={leaveTypes} />
      )}
      {reviewReq && (
        <LeaveReviewModal request={reviewReq} onClose={() => setReviewReq(null)} />
      )}
    </div>
  );
}
