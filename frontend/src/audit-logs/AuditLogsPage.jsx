import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, Search, LogIn, LogOut, Activity,
  User, Clock, Globe, AlertTriangle, CheckCircle, XCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";

const ACTION_COLORS = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  VIEW: "bg-gray-100 text-gray-600",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-amber-100 text-amber-700",
};

const LOGIN_STATUS = {
  success: { cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  failed: { cls: "bg-red-100 text-red-700", icon: XCircle },
  locked: { cls: "bg-amber-100 text-amber-700", icon: AlertTriangle },
};

export default function AuditLogsPage() {
  const [tab, setTab] = useState("activity");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: activityData, isLoading: actLoading } = useQuery({
    queryKey: ["activity-logs", search, actionFilter, page],
    queryFn: () =>
      api.get(`/audit-logs/activity/?search=${search}${actionFilter ? `&action=${actionFilter}` : ""}&ordering=-created_at&page=${page}`)
        .then((r) => r.data),
    enabled: tab === "activity",
  });

  const { data: loginData, isLoading: loginLoading } = useQuery({
    queryKey: ["login-logs", page],
    queryFn: () =>
      api.get(`/audit-logs/logins/?ordering=-created_at&page=${page}`).then((r) => r.data),
    enabled: tab === "login",
  });

  const activityLogs = activityData?.results ?? [];
  const loginLogs = loginData?.results ?? [];

  const ACTIONS = ["CREATE", "UPDATE", "DELETE", "VIEW", "LOGIN", "LOGOUT"];

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" subtitle="Track all system activities and login events" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Activity Events", value: activityData?.count ?? "—", icon: Activity, color: "bg-blue-50 text-blue-600" },
          { label: "Login Events", value: loginData?.count ?? "—", icon: LogIn, color: "bg-purple-50 text-purple-600" },
          { label: "Failed Logins", value: loginData?.results?.filter((l) => l.status === "failed").length ?? "—", icon: AlertTriangle, color: "bg-red-50 text-red-600" },
          { label: "Unique Users", value: "—", icon: User, color: "bg-emerald-50 text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {["activity", "login"].map((t) => (
              <button key={t} onClick={() => { setTab(t); setPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {t === "activity" ? "Activity Log" : "Login History"}
              </button>
            ))}
          </div>

          {tab === "activity" && (
            <>
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input pl-9 py-2 text-sm w-full" placeholder="Search by model or description..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input py-2 text-sm w-32">
                <option value="">All Actions</option>
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </>
          )}
        </div>

        {tab === "activity" && (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["User", "Action", "Module", "Description", "IP Address", "Timestamp"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {actLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : activityLogs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>No activity logs found</p>
                  </td></tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <span className="text-xs text-gray-700">{log.user_email || "System"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-500"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-medium">{log.model_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{log.description || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ip_address || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {log.created_at ? format(parseISO(log.created_at), "dd MMM, HH:mm") : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {activityData && activityData.count > 20 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm">
                <p className="text-gray-500">Showing page {page} · {activityData.count} total events</p>
                <div className="flex gap-2">
                  <button disabled={!activityData.previous} onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 text-xs hover:bg-gray-50">
                    Previous
                  </button>
                  <button disabled={!activityData.next} onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 text-xs hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "login" && (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["User", "Status", "IP Address", "User Agent", "Timestamp"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loginLoading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : loginLogs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                    <LogIn className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>No login events found</p>
                  </td></tr>
                ) : (
                  loginLogs.map((log) => {
                    const s = LOGIN_STATUS[log.status] ?? LOGIN_STATUS.success;
                    const StatusIcon = s.icon;
                    return (
                      <tr key={log.id} className={`hover:bg-gray-50 ${log.status === "failed" ? "bg-red-50/30" : ""}`}>
                        <td className="px-4 py-3 text-xs text-gray-700">{log.email || log.user_email || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
                            <StatusIcon className="w-3 h-3" />
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ip_address || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{log.user_agent || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {log.created_at ? format(parseISO(log.created_at), "dd MMM yyyy, HH:mm") : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
