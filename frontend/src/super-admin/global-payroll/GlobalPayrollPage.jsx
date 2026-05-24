import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Building2, TrendingUp } from "lucide-react";
import api from "../../services/api";

const STATUS_COLORS = {
  paid: "bg-emerald-100 text-emerald-700",
  processing: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-500",
  failed: "bg-red-100 text-red-700",
};

export default function GlobalPayrollPage() {
  const [companyId, setCompanyId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list-mini"],
    queryFn: () => api.get("/companies/?ordering=name").then(r => r.data?.results ?? r.data),
  });

  const params = new URLSearchParams({
    ...(companyId && { company_id: companyId }),
  });

  const { data: payrolls = [], isLoading } = useQuery({
    queryKey: ["global-payrolls", companyId],
    queryFn: () => api.get(`/payroll/?${params}`).then(r => r.data?.results ?? r.data),
  });

  const filtered = statusFilter ? payrolls.filter(p => p.status === statusFilter) : payrolls;

  // Aggregates
  const totalGross = filtered.reduce((s, p) => s + Number(p.total_gross || 0), 0);
  const totalNet = filtered.reduce((s, p) => s + Number(p.total_net || 0), 0);
  const totalEmps = filtered.reduce((s, p) => s + (p.total_employees || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Payroll runs across all organizations</p>
      </div>

      {/* Aggregate cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Runs", value: filtered.length, prefix: "", color: "bg-gray-50 text-gray-700" },
          { label: "Total Employees Paid", value: totalEmps.toLocaleString(), prefix: "", color: "bg-blue-50 text-blue-700" },
          { label: "Total Gross", value: `₹${(totalGross / 1e5).toFixed(1)}L`, prefix: "", color: "bg-indigo-50 text-indigo-700" },
          { label: "Total Net", value: `₹${(totalNet / 1e5).toFixed(1)}L`, prefix: "", color: "bg-emerald-50 text-emerald-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border border-current border-opacity-20 p-4 ${color}`}>
            <p className="text-xl font-black">{value}</p>
            <p className="text-xs font-medium opacity-70 mt-0.5">{label}</p>
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
          className="input py-2 text-sm w-36"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400 animate-pulse">Loading payroll data…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No payroll runs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Organization", "Period", "Employees", "Gross Pay", "Deductions", "Net Pay", "Payslips", "Status", "Processed"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(pr => (
                  <tr key={pr.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 text-xs whitespace-nowrap">
                          {pr.company_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                      {pr.month}/{pr.year}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{pr.total_employees ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                      ₹{Number(pr.total_gross ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-red-600 text-xs">
                      ₹{Number(pr.total_deductions ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700 text-xs">
                      ₹{Number(pr.total_net ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{pr.payslip_count ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[pr.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {pr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {pr.processed_at ? pr.processed_at.slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-100">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-600 text-xs" colSpan={2}>
                    Total ({filtered.length} runs)
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700 text-xs">{totalEmps.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-gray-800 text-xs">₹{totalGross.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-red-700 text-xs">
                    ₹{filtered.reduce((s, p) => s + Number(p.total_deductions || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-black text-emerald-700 text-xs">₹{totalNet.toLocaleString()}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
