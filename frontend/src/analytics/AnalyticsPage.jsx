import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, TrendingUp, TrendingDown, UserMinus,
  BarChart2, DollarSign, Calendar
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import api from "@/services/api";
import { format, subMonths } from "date-fns";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), 5 - i);
  return { month: format(d, "MMM"), full: format(d, "yyyy-MM") };
});

const mockHeadcountTrend = MONTHS.map((m, i) => ({
  month: m.month,
  employees: 42 + i * 2,
  joined: 2 + Math.floor(Math.random() * 3),
  left: Math.floor(Math.random() * 2),
}));

const mockPayrollTrend = MONTHS.map((m, i) => ({
  month: m.month,
  gross: 1200000 + i * 50000,
  net: 980000 + i * 40000,
  deductions: 220000 + i * 10000,
}));

const mockAttendanceTrend = MONTHS.map((m, i) => ({
  month: m.month,
  attendance_pct: 88 + Math.floor(Math.random() * 8),
  leave_pct: 5 + Math.floor(Math.random() * 4),
  absent_pct: 2 + Math.floor(Math.random() * 3),
}));

const mockDeptDistribution = [
  { name: "Engineering", value: 18 },
  { name: "Sales", value: 12 },
  { name: "Operations", value: 10 },
  { name: "Finance", value: 8 },
  { name: "HR", value: 6 },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("6months");

  const { data: hrDash } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: () => api.get("/dashboards/hr/").then((r) => r.data),
  });

  const { data: superDash } = useQuery({
    queryKey: ["company-admin-dashboard"],
    queryFn: () => api.get("/dashboards/company-admin/").then((r) => r.data),
  });

  const headcountTrend = hrDash?.headcount_trend ?? mockHeadcountTrend;
  const payrollTrend = hrDash?.payroll_trend ?? mockPayrollTrend;
  const attendanceTrend = hrDash?.attendance_monthly ?? mockAttendanceTrend;
  const deptDist = hrDash?.department_distribution ?? mockDeptDistribution;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Workforce, payroll, and attendance insights"
        actions={
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input py-2 text-sm w-40"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={hrDash?.total_employees ?? superDash?.total_employees ?? "—"}
          icon={Users}
          color="blue"
          change={hrDash?.employee_growth ?? null}
        />
        <StatCard
          title="Avg Attendance"
          value={hrDash?.avg_attendance_pct ? `${hrDash.avg_attendance_pct}%` : "92%"}
          icon={Calendar}
          color="green"
        />
        <StatCard
          title="Monthly Payroll"
          value={hrDash?.total_payroll ? `₹${(hrDash.total_payroll / 100000).toFixed(1)}L` : "—"}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Attrition Rate"
          value={hrDash?.attrition_rate ? `${hrDash.attrition_rate}%` : "—"}
          icon={UserMinus}
          color="red"
        />
      </div>

      {/* Headcount Trend */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-1">Headcount Trend</h3>
        <p className="text-xs text-gray-400 mb-4">Employee count over the past 6 months</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={headcountTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="employees" name="Employees" stroke="#2563eb" fill="url(#empGrad)" strokeWidth={2} />
            <Bar dataKey="joined" name="Joined" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="left" name="Left" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payroll + Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Trend */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-1">Payroll Trend</h3>
          <p className="text-xs text-gray-400 mb-4">Monthly payroll (₹)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payrollTrend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="gross" name="Gross" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="deductions" name="Deductions" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Trend */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-1">Attendance Trend (%)</h3>
          <p className="text-xs text-gray-400 mb-4">Monthly attendance percentage</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attendanceTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="attendance_pct" name="Attendance" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="leave_pct" name="Leave" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="absent_pct" name="Absent" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={deptDist}
                cx="50%" cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={11}
              >
                {deptDist.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Department Breakdown</h3>
          <div className="space-y-3">
            {deptDist.map(({ name, value }, i) => {
              const total = deptDist.reduce((s, d) => s + d.value, 0);
              return (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{name}</span>
                      <span className="font-semibold text-gray-900">{value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(value / total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
