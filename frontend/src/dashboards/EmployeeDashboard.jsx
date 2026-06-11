import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, Calendar, DollarSign, Bell, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Users, ArrowUpRight, Target,
  TrendingUp, MapPin, LayoutDashboard, CreditCard, FileText,
  Shield, AlertCircle, Home, Briefcase, BarChart2, LogIn,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import {
  format, parseISO, formatDistanceToNow,
  getDaysInMonth, addMonths, subMonths, getDay, getMonth, getYear,
} from "date-fns";
import { Link } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];

const STATUS_CLS = {
  present:     "bg-teal-500 text-white",
  wfh:         "bg-blue-500 text-white",
  leave:       "bg-amber-400 text-white",
  half_day:    "bg-orange-400 text-white",
  absent:      "bg-red-100 text-red-500",
  regularized: "bg-teal-400 text-white",
  not_marked:  "text-gray-300",
};

const LEAVE_DONUT_COLORS = ["#f87171", "#10b981"];

// ─── Small helpers ────────────────────────────────────────────────────────────

function TabBtn({ label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
        ${active ? "bg-primary-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function Banner({ text, variant = "warning" }) {
  const cls = {
    warning: "border-amber-400 bg-amber-50 text-amber-800",
    success: "border-green-500 bg-green-50 text-green-800",
    info:    "border-blue-400 bg-blue-50 text-blue-800",
  }[variant];
  return (
    <div className={`border-l-4 px-4 py-2.5 rounded-r-xl text-sm font-medium flex-1 ${cls}`}>
      {text}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }) {
  const bg = {
    blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600", purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  }[color] ?? "bg-gray-50 text-gray-600";
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, color }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all group"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 text-center">{label}</span>
    </Link>
  );
}

// ─── Team Calendar ────────────────────────────────────────────────────────────

function CalDot({ day, attendance, leaves, isWeekend, isHoliday, isToday }) {
  const status = leaves?.length ? "leave" : attendance?.status;
  const cls = isHoliday
    ? "bg-lime-100 text-lime-700 border border-lime-200"
    : isWeekend
    ? "bg-amber-100 text-amber-600"
    : status
    ? STATUS_CLS[status] ?? "bg-gray-100 text-gray-500"
    : "text-gray-300";
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold mx-auto select-none
        ${cls} ${attendance?.is_late ? "ring-2 ring-red-300" : ""} ${attendance?.is_remote ? "outline outline-2 outline-blue-200" : ""} ${isToday ? "ring-2 ring-primary-500 ring-offset-1" : ""}`}
      title={[
        attendance?.status,
        attendance?.is_late ? "Late" : "",
        attendance?.is_remote ? "Remote clock-in" : "",
        leaves?.length ? leaves.map((item) => `${item.leave_type_code} ${item.status}`).join(", ") : "",
        isHoliday ? "Holiday" : "",
      ].filter(Boolean).join(" · ")}
    >
      {day}
    </div>
  );
}

function TeamCalendar({ members, month, year, calendarDays = [] }) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const days = calendarDays.length
    ? calendarDays
    : Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const value = new Date(year, month - 1, d);
        return { day: d, date: format(value, "yyyy-MM-dd"), weekday: getDay(value), is_weekly_off: [0, 6].includes(getDay(value)) };
      });

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white z-10 text-left pl-4 pr-6 py-2 min-w-[180px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Member</span>
            </th>
            {days.map((item) => {
              const dow = getDay(parseISO(item.date));
              return (
                <th key={item.date} className="text-center px-0.5 py-1.5 min-w-[32px]">
                  <div className="text-[9px] text-gray-400 font-medium">{DAYS_SHORT[dow]}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-gray-50/50">
              <td className="sticky left-0 bg-white hover:bg-gray-50/50 z-10 pl-4 pr-4 py-2">
                <div className="flex items-center gap-2.5">
                  {member.photo ? (
                    <img src={member.photo} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                      {member.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[130px]">
                      {member.name}
                      {member.is_self && <span className="ml-1 text-xs text-primary-500 font-normal">(You)</span>}
                    </p>
                    {member.designation && (
                      <p className="text-[11px] text-gray-400 truncate max-w-[130px]">{member.designation}</p>
                    )}
                  </div>
                </div>
              </td>
              {days.map((item) => {
                const date = parseISO(item.date);
                const isToday =
                  today.getFullYear() === year &&
                  today.getMonth() === month - 1 &&
                  today.getDate() === item.day;
                const attendance = member.attendance?.[item.date];
                const leaves = member.leaves?.[item.date] || [];
                return (
                  <td key={item.date} className="px-0.5 py-2 text-center">
                    <CalDot
                      day={item.day}
                      attendance={attendance}
                      leaves={leaves}
                      isWeekend={item.is_weekly_off}
                      isHoliday={!!item.holiday}
                      isToday={isToday}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Leave Balance Donut Card ─────────────────────────────────────────────────

function DonutLeaveCard({ name, total, used, accrued, carryover }) {
  const totalF = parseFloat(total) || 0;
  const usedF = parseFloat(used) || 0;
  const available = Math.max(0, totalF - usedF);

  const chartData =
    totalF > 0
      ? [
          { name: "Used", value: usedF },
          { name: "Available", value: available },
        ]
      : [{ name: "No quota", value: 1 }];
  const colors = totalF > 0 ? LEAVE_DONUT_COLORS : ["#e5e7eb"];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800 text-sm">{name}</h4>
        <Link to="/leaves" className="text-xs text-primary-600 hover:underline">
          View details
        </Link>
      </div>
      <div className="relative flex justify-center">
        <ResponsiveContainer width={130} height={130}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={58}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{available.toFixed(1)}</p>
            <p className="text-[10px] text-gray-400 leading-tight">Days<br />Available</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Available</p>
          <p className="font-semibold text-gray-700">{available.toFixed(1)} days</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Consumed</p>
          <p className="font-semibold text-gray-700">{usedF.toFixed(1)} days</p>
        </div>
        {accrued != null && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Accrued So Far</p>
            <p className="font-semibold text-gray-700">{parseFloat(accrued).toFixed(1)} days</p>
          </div>
        )}
        {carryover != null && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Carryover</p>
            <p className="font-semibold text-gray-700">{parseFloat(carryover).toFixed(1)} days</p>
          </div>
        )}
        <div className={accrued == null && carryover == null ? "col-span-2" : ""}>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Annual Quota</p>
          <p className="font-semibold text-gray-700">{totalF.toFixed(1)} days</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
  const user = useSelector(selectCurrentUser);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("home");
  const [calDate, setCalDate] = useState(new Date());

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth() + 1;
  const calMonthStr = `${calYear}-${String(calMonth).padStart(2, "0")}`;

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: dash } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => api.get("/dashboards/employee/").then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: teamCal, isLoading: teamCalLoading } = useQuery({
    queryKey: ["team-calendar", calMonthStr],
    queryFn: () =>
      api.get(`/dashboards/team-calendar/?month=${calMonthStr}`).then((r) => r.data),
    enabled: activeTab === "team",
  });

  const { data: leavesData } = useQuery({
    queryKey: ["my-leaves-dash"],
    queryFn: () =>
      api.get("/leaves/?ordering=-created_at&page_size=50").then((r) => r.data),
    enabled: activeTab === "leave",
  });

  const { data: leaveBalances } = useQuery({
    queryKey: ["my-leave-balances"],
    queryFn: () =>
      api.get("/leaves/balances/?page_size=50").then((r) => r.data),
    enabled: activeTab === "leave",
  });

  const { data: payslipsData } = useQuery({
    queryKey: ["my-payslips-dash"],
    queryFn: () =>
      api.get("/payroll/payslips/?ordering=-created_at&page_size=12").then((r) => r.data),
    enabled: activeTab === "pay",
  });

  const { data: recentNotifs } = useQuery({
    queryKey: ["recent-notifs-dash"],
    queryFn: () =>
      api.get("/notifications/?page_size=5&ordering=-created_at").then((r) => r.data),
    enabled: activeTab === "home",
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

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
      toast.success(`Checked out · ${res.data.working_hours}h worked`);
      qc.invalidateQueries(["employee-dashboard"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Check-out failed"),
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const leaveList = leavesData?.results ?? [];
  const pendingLeaveList = leaveList.filter((l) => l.status === "pending");
  const balanceList = (leaveBalances?.results ?? leaveBalances) ?? dash?.leave_balances ?? [];
  const payslipList = payslipsData?.results ?? payslipsData ?? [];

  // Leave stats derived from history
  const leaveStats = useMemo(() => {
    const weekPattern = Array(7).fill(0);
    const byType = {};
    const byMonth = {};

    for (const lv of leaveList) {
      if (lv.status !== "approved") continue;
      if (lv.from_date) {
        const d = new Date(lv.from_date);
        weekPattern[getDay(d)] += parseFloat(lv.total_days ?? 1);
        const mKey = format(d, "MMM");
        byMonth[mKey] = (byMonth[mKey] || 0) + parseFloat(lv.total_days ?? 1);
      }
      const tn = lv.leave_type_name || "Other";
      byType[tn] = (byType[tn] || 0) + parseFloat(lv.total_days ?? 1);
    }

    const weekData = DAYS_SHORT.map((d, i) => ({ day: d, leaves: weekPattern[i] }));
    const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }));
    const monthData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      .map((m) => ({ month: m, leaves: byMonth[m] || 0 }));

    return { weekData, typeData, monthData };
  }, [leaveList]);

  const PIE_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

  // ── Today's status banners (team tab) ─────────────────────────────────────

  const todayStats = teamCal?.today_stats ?? {};
  const allIn = todayStats.all_in;
  const offToday = todayStats.off_today ?? [];

  const TABS = [
    { id: "home",  label: "Home",     icon: Home },
    { id: "team",  label: "My Team",  icon: Users },
    { id: "leave", label: "Leave",    icon: Calendar },
    { id: "pay",   label: "My Pay",   icon: CreditCard },
  ];

  return (
    <div className="space-y-5">
      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map((t) => (
          <TabBtn
            key={t.id}
            label={t.label}
            icon={t.icon}
            active={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
          />
        ))}
      </div>

      {/* ════════════════════════════════════ HOME TAB ══════════════════════ */}
      {activeTab === "home" && (
        <div className="space-y-5">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}, {firstName}!
            </h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>

          {/* Check In/Out Hero */}
          <div
            className={`rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              dash?.checked_in_today
                ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white"
                : "bg-gradient-to-r from-primary-600 to-primary-800 text-white"
            }`}
          >
            <div>
              <p className="text-sm opacity-80 font-medium">Today's Attendance</p>
              <h2 className="text-2xl font-bold mt-1">
                {dash?.checked_in_today ? "You're Checked In ✓" : "You're not checked in yet"}
              </h2>
              {dash?.check_in_time && (
                <p className="text-sm opacity-70 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Checked in at {dash.check_in_time}
                  {dash.working_hours_today && ` · ${dash.working_hours_today}h worked`}
                  {dash.live_working_seconds ? ` · live ${(dash.live_working_seconds / 3600).toFixed(1)}h` : ""}
                </p>
              )}
              {dash?.shift?.name && (
                <p className="text-xs opacity-70 mt-1">
                  Shift: {dash.shift.name} · {dash.shift.start_time} - {dash.shift.end_time}
                  {dash.late_alert ? ` · ${dash.late_alert}` : ""}
                </p>
              )}
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => checkIn.mutate()}
                disabled={dash?.checked_in_today || checkIn.isPending}
                className="px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-opacity-90 disabled:opacity-40 transition-all text-sm flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {checkIn.isPending ? "..." : "Check In"}
              </button>
              <button
                onClick={() => checkOut.mutate()}
                disabled={!dash?.checked_in_today || checkOut.isPending}
                className="px-5 py-2.5 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 disabled:opacity-40 transition-all text-sm flex items-center gap-2 border border-white/30"
              >
                <XCircle className="w-4 h-4" />
                {checkOut.isPending ? "..." : "Check Out"}
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Leave Balance" value={dash?.leave_balances?.reduce((s, b) => s + Math.max(0, b.total_days - b.used_days), 0)?.toFixed(1)} icon={Calendar} color="amber" />
            <KpiCard label="Pending Leaves" value={dash?.pending_leave_requests} icon={AlertCircle} color="red" />
            <KpiCard label="Team Members" value={dash?.team?.total_members} icon={Users} color="blue" />
            <KpiCard label="Payslips" value={dash?.recent_payslips?.length} icon={CreditCard} color="purple" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Employees On Time" value={dash?.widgets?.employees_on_time ?? 0} icon={CheckCircle} color="green" />
            <KpiCard label="Late Arrivals" value={dash?.widgets?.late_arrivals ?? 0} icon={Clock} color="amber" />
            <KpiCard label="Work From Home" value={dash?.widgets?.work_from_home ?? 0} icon={Home} color="blue" />
            <KpiCard label="Remote Clock-ins" value={dash?.widgets?.remote_clockins ?? 0} icon={MapPin} color="purple" />
            <KpiCard label="Team Availability" value={`${dash?.widgets?.team_available ?? 0}/${dash?.widgets?.team_total ?? 0}`} icon={Users} color="blue" />
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Quick Actions</h3>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              <QuickAction to="/leaves" icon={Calendar} label="Apply Leave" color="bg-amber-100 text-amber-600" />
              <QuickAction to="/attendance" icon={Clock} label="Attendance" color="bg-blue-100 text-blue-600" />
              <QuickAction to="/payroll" icon={DollarSign} label="Pay Slip" color="bg-green-100 text-green-600" />
              <QuickAction to="/performance" icon={Target} label="My Goals" color="bg-purple-100 text-purple-600" />
              <QuickAction to="/notifications" icon={Bell} label="Inbox" color="bg-red-100 text-red-600" />
              <QuickAction to="/employees" icon={Users} label="Directory" color="bg-indigo-100 text-indigo-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recent Payslips */}
            <div className="card lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Recent Pay Slips</h3>
                <Link to="/payroll" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {!dash?.recent_payslips?.length ? (
                <p className="text-center text-sm text-gray-400 py-4">No payslips yet</p>
              ) : (
                <div className="space-y-2">
                  {dash.recent_payslips.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {MONTH_NAMES[(p["payroll__month"] ?? 1) - 1]} {p["payroll__year"]}
                          </p>
                          <p className="text-xs text-gray-400">Net Pay</p>
                        </div>
                      </div>
                      <p className="font-bold text-green-700">
                        ₹{Number(p.net_salary).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <Link to="/notifications" className="text-xs text-primary-600 hover:underline">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {!recentNotifs?.results?.length ? (
                  <p className="text-center text-sm text-gray-400 py-4">No notifications</p>
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

          {/* Leave Balances mini */}
          {dash?.leave_balances?.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Leave Balances</h3>
                <button onClick={() => setActiveTab("leave")} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                  Full view <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dash.leave_balances.map((lb) => {
                  const rem = lb.total_days - lb.used_days;
                  const pct = lb.total_days > 0 ? (Math.max(0, rem) / lb.total_days) * 100 : 0;
                  return (
                    <div key={lb.leave_type__name} className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xl font-bold text-gray-900">{Math.max(0, rem).toFixed(1)}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{lb.leave_type__name}</p>
                      <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{lb.used_days} used of {lb.total_days}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Attendance Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dash?.attendance_trend ?? []} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="present" stackId="a" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="wfh" stackId="a" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="late" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Attendance</h3>
              <div className="space-y-2 max-h-48 overflow-auto">
                {dash?.attendance_history?.length ? dash.attendance_history.map((item) => (
                  <div key={item.date} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{item.date}</p>
                      <p className="text-xs text-gray-400">{item.check_in || "--"} - {item.check_out || "--"} · {item.working_hours}h</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${item.is_late ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                      {item.is_late ? `Late ${item.late_minutes}m` : item.status}
                    </span>
                  </div>
                )) : <p className="py-8 text-center text-sm text-gray-400">No attendance history yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════ MY TEAM TAB ═══════════════════ */}
      {activeTab === "team" && (
        <div className="space-y-5">
          {/* Status banners */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Banner
              text={offToday.length === 0 ? "No employee is off today." : `${offToday.slice(0, 3).join(", ")}${offToday.length > 3 ? ` +${offToday.length - 3} more` : ""} are off today.`}
              variant={offToday.length === 0 ? "success" : "warning"}
            />
            <Banner
              text={allIn ? "All employees are already in." : `${todayStats.on_time ?? 0} of ${teamCal?.members?.length ?? 0} employees checked in.`}
              variant={allIn ? "success" : "info"}
            />
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Employees On Time today" value={todayStats.on_time ?? 0} icon={CheckCircle} color="green" />
            <KpiCard label="Late Arrivals today" value={todayStats.late ?? 0} icon={Clock} color="amber" />
            <KpiCard label="Work from Home / On Duty" value={todayStats.wfh ?? 0} icon={Home} color="blue" />
            <KpiCard label="Remote Clock-ins today" value={todayStats.remote_clockins ?? 0} icon={MapPin} color="purple" />
            <KpiCard label="Team Available" value={`${todayStats.team_available ?? 0}/${todayStats.team_total ?? teamCal?.members?.length ?? 0}`} icon={Users} color="green" />
            <KpiCard label="On Leave Today" value={todayStats.on_leave ?? 0} icon={Calendar} color="amber" />
            <KpiCard label="Not Marked" value={todayStats.not_marked ?? offToday.length} icon={XCircle} color="red" />
          </div>

          {/* Team Calendar */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Team calendar</h3>
                {teamCal?.team_name && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {teamCal.team_name}
                    {teamCal.team_lead && ` · Lead: ${teamCal.team_lead}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalDate((d) => subMonths(d, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <span className="text-sm font-semibold text-gray-800 min-w-[120px] text-center">
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                </span>
                <button
                  onClick={() => setCalDate((d) => addMonths(d, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 px-5 py-3 border-b border-gray-50">
              {[
                { label: "Present",  cls: "bg-teal-500" },
                { label: "WFH",      cls: "bg-blue-500" },
                { label: "Leave",    cls: "bg-amber-400" },
                { label: "Holiday",  cls: "bg-lime-100 border border-lime-200" },
                { label: "Weekend",  cls: "bg-amber-100 border border-amber-200" },
                { label: "Remote",   cls: "bg-white border-2 border-blue-200" },
                { label: "Late",     cls: "bg-white border-2 border-red-300" },
                { label: "Absent",   cls: "bg-red-100" },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${cls}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            </div>

            {teamCalLoading ? (
              <div className="p-12 text-center text-gray-400 text-sm animate-pulse">Loading calendar…</div>
            ) : !teamCal?.members?.length ? (
              <div className="p-12 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No team assigned yet</p>
              </div>
            ) : (
              <div className="p-4">
                <TeamCalendar members={teamCal.members} month={calMonth} year={calYear} calendarDays={teamCal.calendar_days} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════ LEAVE TAB ═════════════════════ */}
      {activeTab === "leave" && (
        <div className="space-y-5">
          {/* Pending leave requests */}
          {pendingLeaveList.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Pending leave requests</h3>
                <Link to="/leaves" className="text-xs text-primary-600 hover:underline">
                  Request Leave
                </Link>
              </div>
              <div className="space-y-3">
                {pendingLeaveList.map((lv) => (
                  <div key={lv.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 font-medium mb-1">Leave Type</p>
                      <p className="text-sm font-semibold text-gray-800">{lv.leave_type_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {lv.from_date} → {lv.to_date}
                        {lv.total_days && ` · ${lv.total_days} day${lv.total_days > 1 ? "s" : ""}`}
                      </p>
                      {lv.reason && (
                        <p className="text-xs text-gray-400 mt-1 italic">"{lv.reason}"</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 font-medium mb-1">Requested On</p>
                      <p className="text-sm font-medium text-gray-700">
                        {lv.applied_on ? format(parseISO(lv.applied_on), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 font-medium mb-1">Status</p>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center justify-end">
                      <Link to="/leaves" className="text-xs text-primary-600 hover:underline">
                        View Approvers →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Leave Stats */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">My Leave Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Weekly Pattern */}
              <div className="card">
                <p className="text-sm font-semibold text-gray-700 mb-3">Weekly Pattern</p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={leaveStats.weekData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="leaves" fill="#a5b4fc" radius={[3, 3, 0, 0]} name="Days" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Consumed Leave Types */}
              <div className="card">
                <p className="text-sm font-semibold text-gray-700 mb-3">Consumed Leave Types</p>
                {leaveStats.typeData.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-xs text-gray-400">No approved leaves yet</div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={90} height={90}>
                      <PieChart>
                        <Pie
                          data={leaveStats.typeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={42}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {leaveStats.typeData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {leaveStats.typeData.slice(0, 4).map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-[11px] text-gray-600 truncate">{d.name}</span>
                          <span className="text-[11px] font-semibold text-gray-800 ml-auto">{d.value.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Stats */}
              <div className="card">
                <p className="text-sm font-semibold text-gray-700 mb-3">Monthly Stats</p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={leaveStats.monthData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="leaves" fill="#a5b4fc" radius={[3, 3, 0, 0]} name="Days" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Leave Balances — donut cards */}
          {balanceList.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Leave Balances</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {balanceList.map((lb) => {
                  const name = lb.leave_type_name ?? lb.leave_type__name ?? "Leave";
                  const total = lb.total_days ?? lb.annual_days ?? 0;
                  const used = lb.used_days ?? 0;
                  return (
                    <DonutLeaveCard
                      key={name}
                      name={name}
                      total={total}
                      used={used}
                      accrued={lb.accrued_days ?? null}
                      carryover={lb.carryover_days ?? null}
                    />
                  );
                })}
              </div>

              {/* Other leave types available */}
              <p className="text-xs text-gray-400 mt-3">
                <span className="font-medium text-gray-600">Other Leave Types Available: </span>
                <Link to="/leaves" className="text-primary-600 hover:underline">
                  View all leave types
                </Link>
              </p>
            </div>
          )}

          {/* Leave History */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Leave History</h3>
              <p className="text-xs text-gray-400">Total: {leaveList.length}</p>
            </div>
            {leaveList.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No leave history</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Leave Dates", "Leave Type", "Status", "Requested By", "Applied On", "Reason"].map(
                        (h) => (
                          <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leaveList.map((lv) => (
                      <tr key={lv.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-800">{lv.from_date}</p>
                          <p className="text-xs text-gray-400">{lv.total_days} Day{lv.total_days > 1 ? "s" : ""}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{lv.leave_type_name}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              lv.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : lv.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {lv.status?.charAt(0).toUpperCase() + lv.status?.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{lv.employee_name}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {lv.applied_on ? format(parseISO(lv.applied_on), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[160px] truncate">{lv.reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════ MY PAY TAB ════════════════════ */}
      {activeTab === "pay" && (
        <div className="space-y-5">
          {/* Current Compensation header */}
          {payslipList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest mb-2">Current Compensation</p>
                <p className="text-3xl font-black text-gray-900">
                  ₹{Number(payslipList[0]?.gross_salary ?? 0).toLocaleString()}
                  <span className="text-sm font-normal text-gray-500 ml-2">/ Month</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Gross · latest payslip</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Pay Cycle</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">Monthly</p>
                </div>
              </div>
            </div>
          )}

          {/* Salary Timeline */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-5">Salary Timeline</h3>
            {payslipList.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No payslips available</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-100" />
                <div className="space-y-4">
                  {payslipList.map((slip, idx) => (
                    <div key={slip.id} className="relative">
                      <div className="absolute -left-4 top-4 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm" />
                      <div className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">
                                {MONTH_NAMES[(slip["payroll__month"] ?? 1) - 1]} {slip["payroll__year"]}
                              </p>
                              {idx === 0 && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                  LATEST
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm">
                              <div>
                                <span className="text-xs text-gray-400">Regular Salary </span>
                                <span className="font-medium text-gray-700">
                                  ₹{Number(slip.gross_salary ?? 0).toLocaleString()}
                                </span>
                              </div>
                              <span className="text-gray-300">+</span>
                              <div>
                                <span className="text-xs text-gray-400">Deductions </span>
                                <span className="font-medium text-red-600">
                                  ₹{Number(slip.total_deductions ?? 0).toLocaleString()}
                                </span>
                              </div>
                              <span className="text-gray-300">=</span>
                              <div>
                                <span className="text-xs text-gray-400">Net Pay </span>
                                <span className="font-bold text-emerald-700">
                                  ₹{Number(slip.net_salary ?? 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Link
                            to="/payroll"
                            className="text-xs text-primary-600 hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            View Salary breakup <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
