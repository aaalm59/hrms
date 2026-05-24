import { useQuery } from "@tanstack/react-query";
import {
  Users, UserCheck, UserX, Clock, Calendar, Briefcase,
  ArrowUpRight, CheckCircle, XCircle, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { format } from "date-fns";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function HRDashboard() {
  const { data } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: () => api.get("/dashboards/hr/").then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ["pending-leaves-hr"],
    queryFn: () => api.get("/leaves/?status=pending&page_size=5").then((r) => r.data),
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["today-attendance-summary"],
    queryFn: () => api.get("/attendance/today_summary/").then((r) => r.data),
  });

  const attendanceTrend = data?.attendance_trend ?? [
    { day: "Mon", present: 42, absent: 3, leave: 2 },
    { day: "Tue", present: 45, absent: 1, leave: 1 },
    { day: "Wed", present: 40, absent: 4, leave: 3 },
    { day: "Thu", present: 44, absent: 2, leave: 1 },
    { day: "Fri", present: 38, absent: 5, leave: 4 },
  ];

  const deptData = data?.department_headcount ?? [
    { name: "Engineering", count: 18 },
    { name: "HR", count: 6 },
    { name: "Finance", count: 8 },
    { name: "Sales", count: 12 },
    { name: "Operations", count: 10 },
  ];

  const leaveDistribution = data?.leave_distribution ?? [
    { name: "Annual", value: 40 },
    { name: "Sick", value: 20 },
    { name: "Casual", value: 25 },
    { name: "Others", value: 15 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Dashboard"
        subtitle={`Overview for ${format(new Date(), "MMMM yyyy")}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Employees" value={data?.total_employees ?? "—"} icon={Users} color="blue" />
        <StatCard title="Present Today" value={todayAttendance?.present ?? data?.present_today ?? "—"} icon={UserCheck} color="green" />
        <StatCard title="On Leave" value={todayAttendance?.on_leave ?? data?.on_leave ?? "—"} icon={Calendar} color="yellow" />
        <StatCard title="Absent" value={todayAttendance?.absent ?? data?.absent ?? "—"} icon={UserX} color="red" />
        <StatCard title="Pending Leaves" value={data?.pending_leave_requests ?? pendingLeaves?.count ?? "—"} icon={Clock} color="purple" />
        <StatCard title="Open Positions" value={data?.open_positions ?? "—"} icon={Briefcase} color="blue" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4">Weekly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendanceTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leave" name="Leave" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Leave Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={leaveDistribution}
                cx="50%" cy="50%"
                outerRadius={70}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={10}
              >
                {leaveDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Headcount + Pending Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Department Headcount</h3>
          <div className="space-y-3">
            {deptData.map(({ name, count }, i) => {
              const max = Math.max(...deptData.map((d) => d.count));
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{name}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Pending Leave Requests</h3>
            <a href="/leaves" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-3">
            {!pendingLeaves?.results?.length ? (
              <p className="text-sm text-gray-400 text-center py-6">No pending requests</p>
            ) : (
              pendingLeaves.results.slice(0, 5).map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.employee_name}</p>
                    <p className="text-xs text-gray-500">
                      {req.leave_type_name} · {req.start_date} → {req.end_date}
                    </p>
                  </div>
                  <span className="badge-pending">Pending</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Today's Attendance Summary */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Today's Status Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Present", value: todayAttendance?.present ?? "—", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
            { label: "Absent", value: todayAttendance?.absent ?? "—", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
            { label: "On Leave", value: todayAttendance?.on_leave ?? "—", color: "text-yellow-600", bg: "bg-yellow-50", icon: Calendar },
            { label: "WFH", value: todayAttendance?.wfh ?? "—", color: "text-blue-600", bg: "bg-blue-50", icon: RefreshCw },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-600">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
