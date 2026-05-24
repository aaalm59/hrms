import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Clock,
  User, Monitor, Search, Filter, Download
} from "lucide-react";
import api from "@/services/api";
import { format, parseISO } from "date-fns";

const ACTION_COLOR = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-purple-100 text-purple-700",
  logout: "bg-gray-100 text-gray-600",
  approve: "bg-green-100 text-green-700",
  reject: "bg-red-100 text-red-600",
};

const LOGIN_STATUS = {
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  locked: "bg-orange-100 text-orange-700",
};

export default function SecurityPage() {
  const [tab, setTab] = useState("activity");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loginStatusFilter, setLoginStatusFilter] = useState("");

  const { data: activity } = useQuery({
    queryKey: ["activity-logs", search, actionFilter],
    queryFn: () =>
      api.get(`/audit-logs/activity/?search=${search}${actionFilter ? `&action=${actionFilter}` : ""}&ordering=-created_at`).then((r) => r.data),
    enabled: tab === "activity",
  });

  const { data: loginLogs } = useQuery({
    queryKey: ["login-logs", loginStatusFilter],
    queryFn: () =>
      api.get(`/audit-logs/logins/?${loginStatusFilter ? `status=${loginStatusFilter}&` : ""}ordering=-created_at`).then((r) => r.data),
    enabled: tab === "logins",
  });

  const activityList = activity?.results ?? [];
  const loginList = loginLogs?.results ?? [];

  const failedToday = loginList.filter((l) => l.status === "failed").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit & Security</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform activity logs, login history, and security events</p>
        </div>
      </div>

      {/* Security summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Activity Logs", value: activity?.count ?? "—", icon: Clock, color: "bg-blue-50 text-blue-600" },
          { label: "Login Attempts", value: loginLogs?.count ?? "—", icon: User, color: "bg-purple-50 text-purple-600" },
          { label: "Failed Logins", value: loginList.filter((l) => l.status === "failed").length || "—", icon: AlertTriangle, color: "bg-red-50 text-red-600" },
          { label: "Locked Accounts", value: loginList.filter((l) => l.status === "locked").length || 0, icon: Shield, color: "bg-orange-50 text-orange-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "activity", label: "Activity Logs" },
          { id: "logins", label: "Login History" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Activity Logs */}
      {tab === "activity" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9 py-2 text-sm"
                placeholder="Search model, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="input py-2 text-sm w-36"
            >
              <option value="">All Actions</option>
              {["create", "update", "delete", "login", "logout", "approve", "reject"].map((a) => (
                <option key={a} value={a} className="capitalize">{a}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400">{activity?.count ?? 0} records</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Action", "User", "Company", "Module", "Description", "Time"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activityList.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No activity logs found</td></tr>
              ) : (
                activityList.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[log.action?.toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{log.user?.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{log.company?.name ?? "Platform"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{log.model_name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.description || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {log.created_at ? format(parseISO(log.created_at), "dd MMM, HH:mm") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Login Logs */}
      {tab === "logins" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <select
              value={loginStatusFilter}
              onChange={(e) => setLoginStatusFilter(e.target.value)}
              className="input py-2 text-sm w-36"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="locked">Locked</option>
            </select>
            <span className="text-xs text-gray-400">{loginLogs?.count ?? 0} records</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Email", "Status", "IP Address", "Device", "Time"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loginList.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No login logs found</td></tr>
              ) : (
                loginList.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{log.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${LOGIN_STATUS[log.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.ip_address ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{log.device || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {log.created_at ? format(parseISO(log.created_at), "dd MMM yyyy, HH:mm") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
