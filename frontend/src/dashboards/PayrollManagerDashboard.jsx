import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, Users, CheckCircle, Clock, TrendingUp, FileText
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { format } from "date-fns";

const STATUS_COLOR = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-emerald-100 text-emerald-700",
  not_started: "bg-yellow-100 text-yellow-700",
};

const BAR_COLORS = ["#94a3b8", "#94a3b8", "#94a3b8", "#94a3b8", "#94a3b8", "#2563eb"];

export default function PayrollManagerDashboard() {
  const { data } = useQuery({
    queryKey: ["payroll-manager-dashboard"],
    queryFn: () => api.get("/dashboards/payroll-manager/").then((r) => r.data),
    refetchInterval: 120000,
  });

  const recentPayrolls = data?.recent_payrolls ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Dashboard"
        subtitle={`Payroll overview for ${format(new Date(), "MMMM yyyy")}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={data?.total_employees ?? "—"} icon={Users} color="blue" />
        <StatCard title="Processed This Month" value={data?.employees_on_payroll ?? "—"} icon={CheckCircle} color="green" />
        <StatCard title="Gross Payroll" value={data?.current_month_gross ? `₹${(data.current_month_gross / 1000).toFixed(0)}K` : "—"} icon={DollarSign} color="purple" />
        <StatCard title="Net Payroll" value={data?.current_month_net ? `₹${(data.current_month_net / 1000).toFixed(0)}K` : "—"} icon={TrendingUp} color="green" />
      </div>

      {/* Current month status */}
      <div className="card flex items-center gap-4">
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">Current Month Status</p>
          <p className="font-semibold text-gray-900 capitalize">{(data?.current_month_status ?? "Not Started").replace("_", " ")}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLOR[data?.current_month_status] ?? "bg-gray-100 text-gray-600"}`}>
          {(data?.current_month_status ?? "not_started").replace("_", " ")}
        </span>
      </div>

      {/* Net Payroll trend */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Net Payroll — Last 6 Months</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={recentPayrolls} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => v ? `₹${(v / 1000).toFixed(0)}K` : "0"} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Net Payroll"]} />
            <Bar dataKey="net_total" radius={[4, 4, 0, 0]}>
              {recentPayrolls.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent payrolls table */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Payroll Runs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Net Total</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayrolls.map((p) => (
                <tr key={`${p.year}-${p.month}`} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-900">{p.label}</td>
                  <td className="py-3 px-3 text-right text-gray-700">
                    {p.net_total ? `₹${Number(p.net_total).toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
