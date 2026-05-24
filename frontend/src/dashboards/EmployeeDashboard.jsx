import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, Calendar, DollarSign, Bell, CheckCircle, XCircle,
  ArrowUpRight, MapPin, FileText, TrendingUp, Target, Users, Shield
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

function QuickAction({ to, icon: Icon, label, color }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer group`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">{label}</span>
    </Link>
  );
}

export default function EmployeeDashboard() {
  const user = useSelector(selectCurrentUser);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => api.get("/dashboards/employee/").then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: recentNotifs } = useQuery({
    queryKey: ["recent-notifications"],
    queryFn: () => api.get("/notifications/?page_size=5&ordering=-created_at").then((r) => r.data),
  });

  const { data: myGoals } = useQuery({
    queryKey: ["my-goals-dash"],
    queryFn: () => api.get("/performance/goals/?status=in_progress&page_size=3").then((r) => r.data),
  });

  const checkIn = useMutation({
    mutationFn: () => api.post("/attendance/check-in/"),
    onSuccess: (res) => {
      toast.success(`Checked in at ${new Date(res.data.time).toLocaleTimeString()}`);
      qc.invalidateQueries(["employee-dashboard"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Check-in failed"),
  });

  const checkOut = useMutation({
    mutationFn: () => api.post("/attendance/check-out/"),
    onSuccess: (res) => {
      toast.success(`Checked out. Hours: ${res.data.working_hours}`);
      qc.invalidateQueries(["employee-dashboard"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Check-out failed"),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, {firstName}! 👋</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Check In/Out Hero Card */}
      <div className={`rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        data?.checked_in_today
          ? "bg-gradient-to-r from-green-600 to-emerald-700 text-white"
          : "bg-gradient-to-r from-primary-600 to-primary-800 text-white"
      }`}>
        <div>
          <p className="text-sm opacity-80 font-medium">Today's Attendance</p>
          <h2 className="text-2xl font-bold mt-1">
            {data?.checked_in_today ? "You're Checked In ✓" : "You're not checked in"}
          </h2>
          {data?.check_in_time && (
            <p className="text-sm opacity-70 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Checked in at {data.check_in_time}
              {data.working_hours_today && ` · ${data.working_hours_today}h worked`}
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={() => checkIn.mutate()}
            disabled={data?.checked_in_today || checkIn.isPending}
            className="px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-opacity-90 disabled:opacity-40 transition-all text-sm flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {checkIn.isPending ? "..." : "Check In"}
          </button>
          <button
            onClick={() => checkOut.mutate()}
            disabled={!data?.checked_in_today || checkOut.isPending}
            className="px-5 py-2.5 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 disabled:opacity-40 transition-all text-sm flex items-center gap-2 border border-white/30"
          >
            <XCircle className="w-4 h-4" />
            {checkOut.isPending ? "..." : "Check Out"}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
          <QuickAction to="/leaves" icon={Calendar} label="Apply Leave" color="bg-yellow-100 text-yellow-600" />
          <QuickAction to="/attendance" icon={Clock} label="Attendance" color="bg-blue-100 text-blue-600" />
          <QuickAction to="/payroll" icon={DollarSign} label="Payslip" color="bg-green-100 text-green-600" />
          <QuickAction to="/performance" icon={Target} label="My Goals" color="bg-purple-100 text-purple-600" />
          <QuickAction to="/notifications" icon={Bell} label="Notifications" color="bg-red-100 text-red-600" />
          <QuickAction to="/employees" icon={TrendingUp} label="Directory" color="bg-indigo-100 text-indigo-600" />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leave Balances */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Leave Balances</h3>
            <Link to="/leaves" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {data?.leave_balances?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.leave_balances.map((lb) => {
                const remaining = lb.total_days - lb.used_days;
                const pct = lb.total_days > 0 ? (remaining / lb.total_days) * 100 : 0;
                return (
                  <div key={lb.leave_type__name} className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{remaining.toFixed(1)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{lb.leave_type__name}</p>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{lb.used_days} used of {lb.total_days}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No leave balances configured</p>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <Link to="/notifications" className="text-xs text-primary-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {!recentNotifs?.results?.length ? (
              <p className="text-gray-400 text-sm text-center py-4">No notifications</p>
            ) : (
              recentNotifs.results.map((n) => (
                <div key={n.id} className={`flex gap-3 p-2.5 rounded-lg ${n.is_read ? "" : "bg-primary-50"}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? "bg-gray-200" : "bg-primary-500"}`} />
                  <div>
                    <p className="text-xs font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {n.created_at ? formatDistanceToNow(parseISO(n.created_at), { addSuffix: true }) : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* My Team */}
      {data?.team && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{data.team.name}</h3>
                {data.team.lead_name && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Shield className="w-3 h-3" />
                    {data.team.lead_name}
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {data.team.total_members} members
            </span>
          </div>

          <div className="space-y-2">
            {data.team.members.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-2.5 rounded-xl ${
                  member.is_self
                    ? "bg-primary-50 border border-primary-100"
                    : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                    {member.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.name}
                      {member.is_self && (
                        <span className="ml-1.5 text-xs text-primary-500 font-normal">You</span>
                      )}
                    </p>
                    {member.designation && (
                      <p className="text-xs text-gray-500 truncate">{member.designation}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {member.check_in && (
                    <span className="text-xs text-gray-400 flex items-center gap-1 hidden sm:flex">
                      <Clock className="w-3 h-3" />
                      {member.check_in}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      member.attendance_status === "present"
                        ? "bg-green-100 text-green-700"
                        : member.attendance_status === "absent"
                        ? "bg-red-100 text-red-700"
                        : member.attendance_status === "leave"
                        ? "bg-yellow-100 text-yellow-700"
                        : member.attendance_status === "wfh"
                        ? "bg-blue-100 text-blue-700"
                        : member.attendance_status === "half_day"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {member.attendance_status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals in Progress */}
      {myGoals?.results?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Goals In Progress</h3>
            <Link to="/performance" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {myGoals.results.map((g) => (
              <div key={g.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                  {g.due_date && (
                    <p className="text-xs text-gray-400">Due {format(parseISO(g.due_date), "dd MMM yyyy")}</p>
                  )}
                </div>
                <span className="badge-pending text-xs">In Progress</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
