import { useQuery } from "@tanstack/react-query";
import {
  Users, Clock, Calendar, AlertCircle, DollarSign,
  Briefcase, TrendingUp, ArrowUpRight, UserCheck, UserX,
  CheckCircle, RefreshCw, Building2, LogOut
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { useSelector, useDispatch } from "react-redux";
import { selectCurrentUser, setCredentials } from "@/redux/slices/authSlice";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";

function ImpersonationBanner() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saAccess = sessionStorage.getItem("sa_access");
  if (!saAccess) return null;

  const handleExit = () => {
    const saAccess = sessionStorage.getItem("sa_access");
    const saRefresh = sessionStorage.getItem("sa_refresh");
    sessionStorage.removeItem("sa_access");
    sessionStorage.removeItem("sa_refresh");
    dispatch(setCredentials({ access: saAccess, refresh: saRefresh }));
    navigate("/super-admin/dashboard");
  };

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between rounded-xl mb-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Building2 className="w-4 h-4" />
        You are viewing this company as Super Admin
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-semibold transition"
      >
        <LogOut className="w-3.5 h-3.5" />
        Exit &amp; Return to Super Admin
      </button>
    </div>
  );
}

export default function CompanyAdminDashboard() {
  const user = useSelector(selectCurrentUser);

  const { data } = useQuery({
    queryKey: ["company-admin-dashboard"],
    queryFn: () => api.get("/dashboards/company-admin/").then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: hrData } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: () => api.get("/dashboards/hr/").then((r) => r.data),
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ["pending-leaves-admin"],
    queryFn: () => api.get("/leaves/?status=pending&page_size=5").then((r) => r.data),
  });

  const weeklyAttendance = hrData?.attendance_trend ?? [
    { day: "Mon", present: 42, absent: 3 },
    { day: "Tue", present: 45, absent: 1 },
    { day: "Wed", present: 40, absent: 4 },
    { day: "Thu", present: 44, absent: 2 },
    { day: "Fri", present: 38, absent: 5 },
  ];

  return (
    <div className="space-y-6">
      <ImpersonationBanner />
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(" ")[0] || "Admin"}!`}
        subtitle={`${format(new Date(), "EEEE, MMMM d, yyyy")} · Company Overview`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={data?.employees?.total ?? hrData?.total_employees} icon={Users} color="blue" />
        <StatCard title="Present Today" value={data?.attendance_today?.present} icon={UserCheck} color="green" />
        <StatCard title="On Leave" value={data?.attendance_today?.on_leave} icon={Calendar} color="yellow" />
        <StatCard title="Pending Leaves" value={data?.pending_leaves ?? pendingLeaves?.count} icon={AlertCircle} color="red" />
      </div>

      {/* Charts + Today Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Weekly Attendance</h3>
            <Link to="/analytics" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Full Analytics <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyAttendance} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Status */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Today's Status</h3>
          <div className="space-y-3">
            {[
              { label: "Present", value: data?.attendance_today?.present, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
              { label: "Absent", value: data?.attendance_today?.absent, icon: UserX, color: "text-red-600", bg: "bg-red-50" },
              { label: "On Leave", value: data?.attendance_today?.on_leave, icon: Calendar, color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "WFH", value: data?.attendance_today?.wfh, icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Half Day", value: data?.attendance_today?.half_day, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span className="flex-1 text-sm text-gray-600">{label}</span>
                <span className={`font-bold ${color}`}>{value ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Leaves + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Leave Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Pending Leave Requests</h3>
            <Link to="/leaves" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Review all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {!pendingLeaves?.results?.length ? (
              <p className="text-center py-6 text-gray-400 text-sm">No pending requests</p>
            ) : (
              pendingLeaves.results.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.employee_name}</p>
                    <p className="text-xs text-gray-500">{req.leave_type_name} · {req.start_date} → {req.end_date}</p>
                  </div>
                  <Link to="/leaves" className="text-xs text-primary-600 hover:underline font-medium">Review</Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Employee", to: "/employees", icon: Users, color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
              { label: "Post a Job", to: "/recruitment", icon: Briefcase, color: "bg-green-50 text-green-600 hover:bg-green-100" },
              { label: "Run Payroll", to: "/payroll", icon: DollarSign, color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
              { label: "View Analytics", to: "/analytics", icon: TrendingUp, color: "bg-orange-50 text-orange-600 hover:bg-orange-100" },
              { label: "HR Dashboard", to: "/hr/dashboard", icon: Building2, color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" },
              { label: "Settings", to: "/settings", icon: Clock, color: "bg-gray-50 text-gray-600 hover:bg-gray-100" },
            ].map(({ label, to, icon: Icon, color }) => (
              <Link
                key={label}
                to={to}
                className={`flex items-center gap-2 p-3 rounded-xl font-medium text-sm transition-colors ${color}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Department Summary */}
      {hrData?.department_headcount && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Department Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {hrData.department_headcount.map(({ name, count }, i) => (
              <div key={name} className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">{name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
