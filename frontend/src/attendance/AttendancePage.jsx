import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, CheckCircle, XCircle, Calendar, Search, Filter,
  MapPin, AlertCircle, ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, parseISO } from "date-fns";
import { useForm } from "react-hook-form";

const STATUS_CONFIG = {
  present: { label: "Present", color: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
  absent: { label: "Absent", color: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  leave: { label: "Leave", color: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50" },
  half_day: { label: "Half Day", color: "bg-orange-400", text: "text-orange-700", bg: "bg-orange-50" },
  holiday: { label: "Holiday", color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
  weekend: { label: "Weekend", color: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-50" },
  wfh: { label: "WFH", color: "bg-blue-400", text: "text-blue-700", bg: "bg-blue-50" },
};

function RegularizationModal({ onClose, date }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => api.post("/attendance/regularize/", data),
    onSuccess: () => {
      toast.success("Regularization request submitted");
      qc.invalidateQueries(["attendance-records"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Submission failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Request Attendance Regularization</h2>
          <p className="text-sm text-gray-500 mt-1">For: {date ? format(parseISO(date), "dd MMM yyyy") : "—"}</p>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, date }))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
            <input type="time" {...register("check_in_time", { required: true })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
            <input type="time" {...register("check_out_time", { required: true })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea {...register("reason", { required: true })} className="input h-24 resize-none" placeholder="Explain why you need to regularize attendance..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendanceCalendar({ records, currentDate }) {
  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const firstDayOfWeek = getDay(startOfMonth(currentDate));

  const getRecord = (day) => records?.find((r) => isSameDay(parseISO(r.date), day));

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const rec = getRecord(day);
          const cfg = rec ? STATUS_CONFIG[rec.status] : null;
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs cursor-pointer transition-all
                ${cfg ? `${cfg.bg} ${cfg.text}` : "hover:bg-gray-50 text-gray-400"}
                ${isToday ? "ring-2 ring-primary-500" : ""}
              `}
              title={rec ? `${cfg?.label} ${rec.check_in ? `· In: ${rec.check_in?.slice(0, 5)}` : ""}` : ""}
            >
              <span className="font-semibold">{format(day, "d")}</span>
              {cfg && <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${cfg.color}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const user = useSelector(selectCurrentUser);
  const qc = useQueryClient();
  const isHR = user?.roles?.some((r) => ["hr_admin", "company_admin"].includes(r));

  const [currentDate, setCurrentDate] = useState(new Date());
  const [tab, setTab] = useState("my"); // my | team
  const [search, setSearch] = useState("");
  const [showRegModal, setShowRegModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const month = format(currentDate, "yyyy-MM");

  const { data: myRecords } = useQuery({
    queryKey: ["attendance-records", month],
    queryFn: () => api.get(`/attendance/?month=${month}`).then((r) => r.data),
  });

  const { data: teamRecords } = useQuery({
    queryKey: ["team-attendance", month, search],
    queryFn: () => api.get(`/attendance/?month=${month}&search=${search}`).then((r) => r.data),
    enabled: isHR && tab === "team",
  });

  const { data: todaySummary } = useQuery({
    queryKey: ["today-attendance-summary"],
    queryFn: () => api.get("/attendance/today_summary/").then((r) => r.data),
  });

  const { data: dashData } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => api.get("/dashboards/employee/").then((r) => r.data),
  });

  const checkIn = useMutation({
    mutationFn: () => api.post("/attendance/check-in/"),
    onSuccess: (res) => {
      toast.success(`Checked in at ${new Date(res.data.time).toLocaleTimeString()}`);
      qc.invalidateQueries(["attendance-records"]);
      qc.invalidateQueries(["employee-dashboard"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Check-in failed"),
  });

  const checkOut = useMutation({
    mutationFn: () => api.post("/attendance/check-out/"),
    onSuccess: (res) => {
      toast.success(`Checked out. Hours: ${res.data.working_hours}`);
      qc.invalidateQueries(["attendance-records"]);
      qc.invalidateQueries(["employee-dashboard"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Check-out failed"),
  });

  const records = tab === "my" ? myRecords?.results ?? [] : teamRecords?.results ?? [];

  const stats = {
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    leave: records.filter((r) => r.status === "leave").length,
    half_day: records.filter((r) => r.status === "half_day").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Track and manage attendance"
        actions={
          <button
            onClick={() => setShowRegModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <AlertCircle className="w-4 h-4" /> Regularize
          </button>
        }
      />

      {/* Check In/Out Card */}
      <div className="card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dashData?.checked_in_today ? "bg-green-100" : "bg-gray-100"}`}>
            <Clock className={`w-6 h-6 ${dashData?.checked_in_today ? "text-green-600" : "text-gray-400"}`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {dashData?.checked_in_today ? "Currently Checked In" : "Not Checked In"}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {format(new Date(), "EEEE, dd MMM yyyy · HH:mm")}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => checkIn.mutate()}
            disabled={dashData?.checked_in_today || checkIn.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {checkIn.isPending ? "Checking In..." : "Check In"}
          </button>
          <button
            onClick={() => checkOut.mutate()}
            disabled={!dashData?.checked_in_today || checkOut.isPending}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            {checkOut.isPending ? "Checking Out..." : "Check Out"}
          </button>
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Present", value: stats.present, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Absent", value: stats.absent, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "On Leave", value: stats.leave, icon: Calendar, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Half Day", value: stats.half_day, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card flex items-center gap-3 ${bg}`}>
            <Icon className={`w-6 h-6 ${color}`} />
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-600">{label} this month</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar + Records */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{format(currentDate, "MMMM yyyy")}</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2 py-1 text-xs rounded-lg hover:bg-gray-100 text-primary-600 font-medium"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <AttendanceCalendar records={myRecords?.results ?? []} currentDate={currentDate} />
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            {Object.entries(STATUS_CONFIG).slice(0, 4).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1 text-xs text-gray-500">
                <div className={`w-2 h-2 rounded-full ${v.color}`} />
                {v.label}
              </div>
            ))}
          </div>
        </div>

        {/* Records Table */}
        <div className="lg:col-span-3 card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
            {isHR && (
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {["my", "team"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                  >
                    {t === "my" ? "My Attendance" : "Team"}
                  </button>
                ))}
              </div>
            )}
            {tab === "team" && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-9 text-sm py-1.5"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {tab === "team" && <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>}
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Check In</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Check Out</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Hours</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No records found</td></tr>
                ) : (
                  records.map((rec) => {
                    const cfg = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.absent;
                    return (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        {tab === "team" && (
                          <td className="px-4 py-3 font-medium text-gray-900">{rec.employee_name}</td>
                        )}
                        <td className="px-4 py-3 text-gray-600">
                          {rec.date ? format(parseISO(rec.date), "dd MMM") : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {rec.check_in ? rec.check_in.slice(0, 5) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {rec.check_out ? rec.check_out.slice(0, 5) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {rec.working_hours ? `${rec.working_hours}h` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Regularization Modal */}
      {showRegModal && (
        <RegularizationModal
          onClose={() => setShowRegModal(false)}
          date={format(new Date(), "yyyy-MM-dd")}
        />
      )}
    </div>
  );
}
