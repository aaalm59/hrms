import { useQuery } from "@tanstack/react-query";
import {
  Users, Clock, Calendar, DollarSign, Briefcase,
  TrendingUp, UserMinus, Activity
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

function KpiCard({ title, value, sub, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] || colors.blue}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-sm text-gray-500">{title}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="font-semibold text-gray-900 mb-1 text-base">{children}</h3>;
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["company-analytics"],
    queryFn: () => api.get("/analytics/company/").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const headcount = data?.headcount ?? {};
  const headcountTrend = data?.headcount_trend ?? [];
  const deptBreakdown = data?.dept_breakdown ?? [];
  const empTypeBreakdown = data?.emp_type_breakdown ?? [];
  const genderBreakdown = data?.gender_breakdown ?? [];
  const attendance = data?.attendance ?? {};
  const attendanceWeekly = data?.attendance_weekly ?? [];
  const leaveDistribution = data?.leave_distribution ?? [];
  const payrollTrend = data?.payroll_trend ?? [];
  const recruitment = data?.recruitment ?? {};
  const candidateStages = data?.candidate_stages ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Real-time workforce, payroll & attendance insights" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Employees" value={headcount.total} sub={`+${headcount.new_this_month ?? 0} this month`} icon={Users} color="blue" />
        <KpiCard title="Attendance Rate" value={`${attendance.rate ?? 0}%`} sub="Last 30 days" icon={Clock} color="green" />
        <KpiCard title="Pending Leaves" value={data?.leaves?.pending} sub={`${data?.leaves?.approved_ytd ?? 0} approved YTD`} icon={Calendar} color="amber" />
        <KpiCard title="Open Positions" value={recruitment.open_jobs} sub={`${recruitment.pipeline ?? 0} in pipeline`} icon={Briefcase} color="indigo" />
      </div>

      {/* Headcount Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <SectionTitle>Headcount Trend (12 months)</SectionTitle>
        <p className="text-xs text-gray-400 mb-4">Total employee count over time</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={headcountTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="count" name="Employees" stroke="#2563eb" fill="url(#hcGrad)" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Attendance + Payroll */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionTitle>Weekly Attendance</SectionTitle>
          <p className="text-xs text-gray-400 mb-4">Last 7 days</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendanceWeekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="leave" name="Leave" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="wfh" name="WFH" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionTitle>Payroll Trend (6 months)</SectionTitle>
          <p className="text-xs text-gray-400 mb-4">Gross vs Net salary (₹)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payrollTrend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${v}`} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="gross" name="Gross" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionTitle>By Department</SectionTitle>
          <div className="space-y-3 mt-3">
            {deptBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No data</p>
            ) : deptBreakdown.map(({ name, value }, i) => {
              const total = deptBreakdown.reduce((s, d) => s + d.value, 0);
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate">{name}</span>
                    <span className="font-semibold text-gray-900 ml-2">{value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(value / total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Employment type */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionTitle>Employment Type</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={empTypeBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {empTypeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gender breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionTitle>Gender Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genderBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {genderBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leave Distribution + Recruitment Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionTitle>Leave Distribution (YTD)</SectionTitle>
          <p className="text-xs text-gray-400 mb-4">Days used per leave type</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={leaveDistribution} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" name="Days Used" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionTitle>Recruitment Pipeline</SectionTitle>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{recruitment.open_jobs ?? 0}</p>
              <p className="text-xs text-gray-500">Open Jobs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{recruitment.pipeline ?? 0}</p>
              <p className="text-xs text-gray-500">In Pipeline</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{recruitment.hired_this_month ?? 0}</p>
              <p className="text-xs text-gray-500">Hired This Month</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={candidateStages} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Candidates" radius={[4, 4, 0, 0]}>
                {candidateStages.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance 30-day summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <SectionTitle>30-Day Attendance Summary</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[
            { label: "Present Days", value: attendance.present_30d, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Absent Days", value: attendance.absent_30d, color: "text-red-600", bg: "bg-red-50" },
            { label: "Leave Days", value: attendance.leave_30d, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "WFH Days", value: attendance.wfh_30d, color: "text-blue-600", bg: "bg-blue-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl p-4 text-center ${bg}`}>
              <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
              <p className="text-xs text-gray-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
