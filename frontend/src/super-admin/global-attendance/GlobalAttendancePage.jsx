import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Search, Building2 } from "lucide-react";
import api from "../../services/api";

const STATUS_COLORS = {
  present: "bg-emerald-100 text-emerald-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-yellow-100 text-yellow-700",
  wfh: "bg-blue-100 text-blue-700",
  holiday: "bg-purple-100 text-purple-700",
  half_day: "bg-orange-100 text-orange-700",
};

export default function GlobalAttendancePage() {
  const [companyId, setCompanyId] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState("");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list-mini"],
    queryFn: () => api.get("/companies/?ordering=name").then(r => r.data?.results ?? r.data),
  });

  const params = new URLSearchParams({
    month,
    ...(companyId && { company_id: companyId }),
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["global-attendance", month, companyId],
    queryFn: () => api.get(`/attendance/?${params}`).then(r => r.data?.results ?? r.data),
  });

  const filtered = statusFilter ? records.filter(r => r.status === statusFilter) : records;

  // Summary counts
  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Attendance records across all organizations</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Present", key: "present", color: "bg-emerald-50 text-emerald-700" },
          { label: "Absent", key: "absent", color: "bg-red-50 text-red-700" },
          { label: "Leave", key: "leave", color: "bg-yellow-50 text-yellow-700" },
          { label: "WFH", key: "wfh", color: "bg-blue-50 text-blue-700" },
          { label: "Total", key: "_total", color: "bg-gray-50 text-gray-700" },
        ].map(({ label, key, color }) => (
          <div key={key} className={`rounded-2xl border p-4 ${color} border-current border-opacity-20`}>
            <p className="text-2xl font-black">
              {key === "_total" ? records.length : (summary[key] || 0)}
            </p>
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
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input py-2 text-sm w-40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input py-2 text-sm w-36"
        >
          <option value="">All Statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="leave">Leave</option>
          <option value="wfh">WFH</option>
          <option value="half_day">Half Day</option>
        </select>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
          <span className="text-sm text-gray-600 font-medium">{filtered.length} records</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400 animate-pulse">Loading attendance…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Employee", "Organization", "Date", "Check In", "Check Out", "Hours", "Late", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice(0, 200).map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 text-xs whitespace-nowrap">
                      {rec.employee_name || `#${rec.employee}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        <span className="text-xs text-gray-500">{rec.company_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{rec.date}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {rec.check_in ? rec.check_in.slice(11, 16) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {rec.check_out ? rec.check_out.slice(11, 16) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {rec.working_hours ? `${rec.working_hours}h` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {rec.is_late ? (
                        <span className="text-orange-600 font-medium">{rec.late_minutes}m</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[rec.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <p className="text-xs text-gray-400 text-center py-3 border-t border-gray-50">
                Showing first 200 of {filtered.length} records. Apply a company filter to narrow results.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
