import { useQuery } from "@tanstack/react-query";
import {
  Users, UserCheck, UserX, Calendar, Clock, Target, ArrowUpRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function ManagerDashboard() {
  const { data } = useQuery({
    queryKey: ["manager-dashboard"],
    queryFn: () => api.get("/dashboards/manager/").then((r) => r.data),
    refetchInterval: 60000,
  });

  const trend = data?.attendance_trend ?? [
    { day: "Mon", present: 0, absent: 0, leave: 0 },
    { day: "Tue", present: 0, absent: 0, leave: 0 },
    { day: "Wed", present: 0, absent: 0, leave: 0 },
    { day: "Thu", present: 0, absent: 0, leave: 0 },
    { day: "Fri", present: 0, absent: 0, leave: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Dashboard"
        subtitle={`Team overview for ${format(new Date(), "MMMM yyyy")}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Team Size" value={data?.team_member_count ?? "—"} icon={Users} color="blue" />
        <StatCard title="Present Today" value={data?.present_today ?? "—"} icon={UserCheck} color="green" />
        <StatCard title="On Leave" value={data?.on_leave_today ?? "—"} icon={Calendar} color="yellow" />
        <StatCard title="Absent" value={data?.absent_today ?? "—"} icon={UserX} color="red" />
        <StatCard title="Pending Leaves" value={data?.pending_leave_requests ?? "—"} icon={Clock} color="purple" />
      </div>

      {/* Attendance trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Weekly Team Attendance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="present" name="Present" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leave" name="Leave" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Team Members", to: "/employees", icon: Users, color: "bg-blue-50 text-blue-600" },
              { label: "Leave Approvals", to: "/leaves", icon: Calendar, color: "bg-yellow-50 text-yellow-600" },
              { label: "Attendance", to: "/attendance", icon: Clock, color: "bg-green-50 text-green-600" },
              { label: "Performance", to: "/performance", icon: Target, color: "bg-purple-50 text-purple-600" },
            ].map(({ label, to, icon: Icon, color }) => (
              <Link
                key={label}
                to={to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Today's summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Today's Team Status</h3>
          <Link to="/attendance" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            Full Report <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Present / WFH", value: data?.present_today ?? "—", color: "text-green-600 bg-green-50" },
            { label: "On Leave", value: data?.on_leave_today ?? "—", color: "text-yellow-600 bg-yellow-50" },
            { label: "Absent", value: data?.absent_today ?? "—", color: "text-red-600 bg-red-50" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${color} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs mt-1 font-medium opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
