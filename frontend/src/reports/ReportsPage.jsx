import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Download, Clock, Calendar, DollarSign, Users,
  BarChart2, TrendingUp, Search
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const REPORT_TYPES = [
  { id: "attendance", label: "Attendance Report", icon: Clock, color: "bg-blue-50 text-blue-600", desc: "Monthly attendance per employee" },
  { id: "leave", label: "Leave Report", icon: Calendar, color: "bg-amber-50 text-amber-600", desc: "Leave usage by type & employee" },
  { id: "payroll", label: "Payroll Report", icon: DollarSign, color: "bg-purple-50 text-purple-600", desc: "Monthly payroll summary & trends" },
  { id: "headcount", label: "Headcount Report", icon: Users, color: "bg-emerald-50 text-emerald-600", desc: "Workforce composition & growth" },
];

function AttendanceReport() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report-attendance", month, year],
    queryFn: () => api.get(`/reports/attendance/?month=${month}&year=${year}`).then((r) => r.data),
  });

  const rows = data?.rows ?? [];
  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = async () => {
    try {
      const response = await api.get(`/reports/attendance/?month=${month}&year=${year}&export=csv`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${year}_${String(month).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input py-2 text-sm w-36">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), "MMMM")}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input py-2 text-sm w-28">
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9 py-2 text-sm w-full" placeholder="Filter by name or department..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {data?.summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{data.summary.total_employees}</p>
            <p className="text-xs text-blue-600">Total Employees</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{data.summary.avg_present}</p>
            <p className="text-xs text-emerald-600">Avg Present Days</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{data.summary.avg_absent}</p>
            <p className="text-xs text-red-600">Avg Absent Days</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Employee ID", "Name", "Department", "Present", "Absent", "Leave", "Half Day", "WFH", "Hours", "Att%"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">No data</td></tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{row.employee_id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{row.department}</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-semibold">{row.present}</td>
                  <td className="px-4 py-2.5 text-red-600 font-semibold">{row.absent}</td>
                  <td className="px-4 py-2.5 text-amber-600">{row.leave}</td>
                  <td className="px-4 py-2.5 text-gray-600">{row.half_day}</td>
                  <td className="px-4 py-2.5 text-blue-600">{row.wfh}</td>
                  <td className="px-4 py-2.5 text-gray-600">{row.total_hours}h</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-semibold ${row.attendance_pct >= 90 ? "text-emerald-600" : row.attendance_pct >= 75 ? "text-amber-600" : "text-red-600"}`}>
                      {row.attendance_pct}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaveReport() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = useQuery({
    queryKey: ["report-leave", year],
    queryFn: () => api.get(`/reports/leaves/?year=${year}`).then((r) => r.data),
  });

  const handleExport = async () => {
    try {
      const response = await api.get(`/reports/leaves/?year=${year}&export=csv`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `leave_report_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const rows = data?.rows ?? [];
  const typeSummary = data?.type_summary ?? [];

  const leaveTypeKeys = rows.length > 0
    ? Object.keys(rows[0]).filter((k) => !["employee_id", "name", "department", "total_used"].includes(k))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input py-2 text-sm w-28">
          {[currentYear - 1, currentYear].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {typeSummary.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h4 className="font-semibold text-gray-900 mb-4">Leave Usage by Type</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeSummary} layout="vertical" margin={{ top: 4, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="total_used" name="Days Used" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h4 className="font-semibold text-gray-900 mb-4">Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeSummary.map((x) => ({ name: x.type, value: x.total_used }))} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {typeSummary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Department</th>
              {leaveTypeKeys.map((k) => (
                <th key={k} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{k}</th>
              ))}
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Total Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">No data</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{row.department}</td>
                  {leaveTypeKeys.map((k) => (
                    <td key={k} className="px-4 py-2.5 text-gray-600">{row[k] ?? 0}</td>
                  ))}
                  <td className="px-4 py-2.5 font-semibold text-gray-900">{row.total_used}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayrollReport() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = useQuery({
    queryKey: ["report-payroll", year],
    queryFn: () => api.get(`/reports/payroll/?year=${year}`).then((r) => r.data),
  });

  const handleExport = async () => {
    try {
      const response = await api.get(`/reports/payroll/?year=${year}&export=csv`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll_report_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const rows = data?.rows ?? [];
  const ytd = data?.ytd ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input py-2 text-sm w-28">
          {[currentYear - 1, currentYear].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-blue-700">₹{(ytd.gross / 100000 || 0).toFixed(1)}L</p>
          <p className="text-xs text-blue-600">YTD Gross</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-emerald-700">₹{(ytd.net / 100000 || 0).toFixed(1)}L</p>
          <p className="text-xs text-emerald-600">YTD Net</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-red-700">₹{(ytd.deductions / 100000 || 0).toFixed(1)}L</p>
          <p className="text-xs text-red-600">YTD Deductions</p>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rows} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month_name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${v}`} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="total_gross" name="Gross" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total_net" name="Net" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Month", "Year", "Employees", "Gross", "Deductions", "Net Pay", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No payroll data for {year}</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.month_name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{row.year}</td>
                  <td className="px-4 py-2.5 text-gray-600">{row.total_employees}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">₹{Number(row.total_gross).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-red-600">₹{Number(row.total_deductions).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-semibold text-emerald-700">₹{Number(row.total_net).toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${row.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeadcountReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-headcount"],
    queryFn: () => api.get("/reports/headcount/").then((r) => r.data),
  });

  if (isLoading) return <p className="text-center py-8 text-gray-400">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{data?.total_active ?? 0}</p>
          <p className="text-xs text-blue-600">Total Active</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">+{data?.new_this_month ?? 0}</p>
          <p className="text-xs text-emerald-600">Joined This Month</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">-{data?.exited_this_month ?? 0}</p>
          <p className="text-xs text-red-600">Exited This Month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="font-semibold text-gray-900 mb-4">By Department</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.by_department ?? []} layout="vertical" margin={{ top: 4, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" name="Employees" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="font-semibold text-gray-900 mb-4">Employment Type</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data?.by_employment_type ?? []} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {(data?.by_employment_type ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("attendance");

  const REPORT_COMPONENTS = {
    attendance: <AttendanceReport />,
    leave: <LeaveReport />,
    payroll: <PayrollReport />,
    headcount: <HeadcountReport />,
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle="Download and analyze HR reports" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {REPORT_TYPES.map(({ id, label, icon: Icon, color, desc }) => (
          <button
            key={id}
            onClick={() => setActiveReport(id)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${activeReport === id ? "border-primary-500 bg-primary-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">
            {REPORT_TYPES.find((r) => r.id === activeReport)?.label}
          </h2>
        </div>
        {REPORT_COMPONENTS[activeReport]}
      </div>
    </div>
  );
}
