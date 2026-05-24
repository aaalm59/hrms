import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Building2, Clock, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import api from "../../services/api";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

export default function GlobalLeavesPage() {
  const [companyId, setCompanyId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list-mini"],
    queryFn: () => api.get("/companies/?ordering=name").then(r => r.data?.results ?? r.data),
  });

  const params = new URLSearchParams({
    ...(companyId && { company_id: companyId }),
    ...(statusFilter && { status: statusFilter }),
  });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["global-leaves", companyId, statusFilter],
    queryFn: () => api.get(`/leaves/?${params}`).then(r => r.data?.results ?? r.data),
  });

  // Summary
  const pending = leaves.filter(l => l.status === "pending").length;
  const approved = leaves.filter(l => l.status === "approved").length;
  const rejected = leaves.filter(l => l.status === "rejected").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">All leave requests across organizations</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: leaves.length, color: "bg-gray-50 text-gray-700 border-gray-200" },
          { label: "Pending", value: pending, color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
          { label: "Approved", value: approved, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "Rejected", value: rejected, color: "bg-red-50 text-red-700 border-red-200" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border-2 p-4 ${color}`}>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-xs font-medium opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="input py-2 text-sm min-w-52"
        >
          <option value="">All Organizations</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input py-2 text-sm w-40"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400 animate-pulse">Loading leaves…</div>
        ) : leaves.length === 0 ? (
          <div className="p-16 text-center">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No leave requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Employee", "Organization", "Leave Type", "From", "To", "Days", "Status", "Applied On"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaves.slice(0, 200).map(leave => {
                  const StatusIcon = STATUS_ICONS[leave.status];
                  return (
                    <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 text-sm whitespace-nowrap">
                        {leave.employee_name || `#${leave.employee}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-gray-300 flex-shrink-0" />
                          <span className="text-xs text-gray-500">{leave.company_name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{leave.leave_type_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{leave.from_date}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{leave.to_date}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700">{leave.total_days ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {StatusIcon && <StatusIcon className="w-3.5 h-3.5 opacity-70" />}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[leave.status] ?? "bg-gray-100 text-gray-500"}`}>
                            {leave.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {leave.applied_on ? format(parseISO(leave.applied_on), "dd MMM yyyy") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {leaves.length > 200 && (
              <p className="text-xs text-gray-400 text-center py-3 border-t border-gray-50">
                Showing first 200 of {leaves.length} records.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
