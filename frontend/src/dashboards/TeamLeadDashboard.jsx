import { useQuery } from "@tanstack/react-query";
import {
  Users, UserCheck, UserX, Calendar, Clock, ArrowUpRight
} from "lucide-react";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { clsx } from "clsx";

const STATUS_CLS = {
  present: "bg-green-100 text-green-700",
  wfh: "bg-blue-100 text-blue-700",
  leave: "bg-yellow-100 text-yellow-700",
  half_day: "bg-orange-100 text-orange-700",
  absent: "bg-red-100 text-red-600",
};

export default function TeamLeadDashboard() {
  const { data } = useQuery({
    queryKey: ["team-lead-dashboard"],
    queryFn: () => api.get("/dashboards/team-lead/").then((r) => r.data),
    refetchInterval: 60000,
  });

  const members = data?.members ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={data?.team_name ? `${data.team_name}` : "Team Dashboard"}
        subtitle={`Team status for ${format(new Date(), "EEEE, d MMMM yyyy")}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Team Members" value={data?.team_member_count ?? "—"} icon={Users} color="blue" />
        <StatCard title="Present Today" value={data?.present_today ?? "—"} icon={UserCheck} color="green" />
        <StatCard title="On Leave" value={data?.on_leave_today ?? "—"} icon={Calendar} color="yellow" />
        <StatCard title="Pending Approvals" value={data?.pending_leave_requests ?? "—"} icon={Clock} color="purple" />
      </div>

      {/* Team member list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Team Attendance Today</h3>
          <Link to="/attendance" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            Full Attendance <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {!members.length ? (
          <div className="text-center py-10">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No team members found</p>
            <p className="text-xs text-gray-300 mt-1">You may not be assigned as a team lead yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold text-sm">
                    {(m.name || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.designation ?? "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize", STATUS_CLS[m.attendance_status] ?? "bg-gray-100 text-gray-500")}>
                    {(m.attendance_status ?? "absent").replace("_", " ")}
                  </span>
                  {m.check_in && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {m.check_in}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Quick Access</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Leave Requests", to: "/leaves" },
            { label: "Team Members", to: "/employees" },
            { label: "Attendance Log", to: "/attendance" },
            { label: "Notifications", to: "/notifications" },
          ].map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
