import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign, Download, Play, CheckCircle, Clock, Search,
  FileText, TrendingUp, Users, AlertCircle, X, Eye
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import { format, parseISO } from "date-fns";

const STATUS_CONFIG = {
  draft: { label: "Draft", class: "badge-inactive" },
  processing: { label: "Processing", class: "badge-pending" },
  processed: { label: "Processed", class: "bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium" },
  approved: { label: "Approved", class: "badge-active" },
  paid: { label: "Paid", class: "bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-medium" },
};

function PayslipViewModal({ payslip, onClose }) {
  if (!payslip) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Payslip</h2>
            <p className="text-sm text-gray-500">{payslip.employee_name} · {payslip.month}/{payslip.year}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Earnings */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> Earnings
            </h3>
            <div className="space-y-2">
              {Object.entries(payslip.earnings ?? {}).map(([name, amount]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{name}</span>
                  <span className="font-medium text-gray-900">₹{Number(amount).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2 mt-2">
                <span>Gross Earnings</span>
                <span className="text-green-700">₹{Number(payslip.gross_salary || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" /> Deductions
            </h3>
            <div className="space-y-2">
              {Object.entries(payslip.deductions ?? {}).map(([name, amount]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{name}</span>
                  <span className="font-medium text-red-600">-₹{Number(amount).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2 mt-2">
                <span>Total Deductions</span>
                <span className="text-red-600">₹{Number(payslip.total_deductions || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-primary-50 rounded-xl p-4 flex justify-between items-center">
            <span className="font-semibold text-primary-900">Net Pay</span>
            <span className="text-2xl font-bold text-primary-700">
              ₹{Number(payslip.net_salary || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const user = useSelector(selectCurrentUser);
  const isHR = user?.roles?.some((r) => ["hr_admin", "company_admin", "payroll_manager"].includes(r));
  const qc = useQueryClient();

  const [tab, setTab] = useState(isHR ? "payrolls" : "payslips");
  const [search, setSearch] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const { data: payrolls } = useQuery({
    queryKey: ["payrolls"],
    queryFn: () => api.get("/payroll/?ordering=-year,-month").then((r) => r.data),
    enabled: isHR,
  });

  const { data: payslips } = useQuery({
    queryKey: ["payslips", search],
    queryFn: () => api.get(`/payroll/payslips/?search=${search}&ordering=-year,-month`).then((r) => r.data),
  });

  const { data: structures } = useQuery({
    queryKey: ["salary-structures"],
    queryFn: () => api.get("/payroll/salary-structures/").then((r) => r.data),
    enabled: isHR && tab === "structures",
  });

  const processPayroll = useMutation({
    mutationFn: (id) => api.post(`/payroll/${id}/process/`),
    onSuccess: () => {
      toast.success("Payroll processing started");
      qc.invalidateQueries(["payrolls"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Processing failed"),
  });

  const latestPayroll = payrolls?.results?.[0];
  const totalNetPay = payslips?.results?.reduce((sum, p) => sum + Number(p.net_salary || 0), 0) ?? 0;

  const tabs = isHR
    ? [{ id: "payrolls", label: "Payroll Runs" }, { id: "payslips", label: "Payslips" }, { id: "structures", label: "Salary Structures" }]
    : [{ id: "payslips", label: "My Payslips" }];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        subtitle="Manage payroll processing and payslips"
      />

      {isHR && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="This Month Payroll" value={latestPayroll ? `${latestPayroll.month}/${latestPayroll.year}` : "—"} icon={DollarSign} color="blue" />
          <StatCard title="Total Employees" value={latestPayroll?.total_employees ?? payslips?.count ?? "—"} icon={Users} color="green" />
          <StatCard title="Net Pay" value={totalNetPay ? `₹${(totalNetPay / 100000).toFixed(1)}L` : "—"} icon={TrendingUp} color="purple" />
          <StatCard title="Status" value={latestPayroll ? STATUS_CONFIG[latestPayroll.status]?.label : "—"} icon={CheckCircle} color="yellow" />
        </div>
      )}

      {/* Tabs */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "payslips" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9 py-1.5 text-sm w-48"
                placeholder={isHR ? "Search employee..." : "Search..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Payroll Runs */}
        {tab === "payrolls" && isHR && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Period", "Employees", "Gross Pay", "Net Pay", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!payrolls?.results?.length ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No payroll runs found</td></tr>
              ) : (
                payrolls.results.map((p) => {
                  const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {format(new Date(p.year, p.month - 1), "MMMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.total_employees ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.total_gross ? `₹${Number(p.total_gross).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {p.total_net ? `₹${Number(p.total_net).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cfg.class}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.status === "draft" && (
                          <button
                            onClick={() => processPayroll.mutate(p.id)}
                            disabled={processPayroll.isPending}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                          >
                            <Play className="w-3 h-3" /> Process
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* Payslips */}
        {tab === "payslips" && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {isHR && <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Gross</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Deductions</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Net Pay</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!payslips?.results?.length ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No payslips found</td></tr>
              ) : (
                payslips.results.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    {isHR && (
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.employee_name}</p>
                        <p className="text-xs text-gray-400">{p.employee_id}</p>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {format(new Date(p.year, p.month - 1), "MMMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.gross_salary ? `₹${Number(p.gross_salary).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-red-600">
                      {p.total_deductions ? `-₹${Number(p.total_deductions).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {p.net_salary ? `₹${Number(p.net_salary).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedPayslip(p)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Salary Structures */}
        {tab === "structures" && isHR && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Structure Name", "Components", "Is Default", "Created"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!structures?.results?.length ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400">No salary structures found</td></tr>
              ) : (
                structures.results.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.components?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      {s.is_default ? (
                        <span className="badge-active">Default</span>
                      ) : (
                        <span className="badge-inactive">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {s.created_at ? format(parseISO(s.created_at), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedPayslip && (
        <PayslipViewModal payslip={selectedPayslip} onClose={() => setSelectedPayslip(null)} />
      )}
    </div>
  );
}
