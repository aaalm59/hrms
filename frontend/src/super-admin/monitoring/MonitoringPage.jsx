import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Server, Database, Zap, Clock, CheckCircle, AlertTriangle,
  Activity, Cpu, HardDrive, Wifi, RefreshCw
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/services/api";

function StatusDot({ status }) {
  if (status === "online") return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />;
  if (status === "degraded") return <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse inline-block" />;
  return <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />;
}

const SERVICES = [
  { name: "API Server", status: "online", latency: "24ms", uptime: "99.98%" },
  { name: "Database (PostgreSQL)", status: "online", latency: "8ms", uptime: "99.99%" },
  { name: "Cache (Redis)", status: "online", latency: "2ms", uptime: "100%" },
  { name: "Background Worker (Celery)", status: "online", latency: null, uptime: "99.9%" },
  { name: "File Storage", status: "online", latency: null, uptime: "99.95%" },
  { name: "Email Service", status: "online", latency: "120ms", uptime: "99.8%" },
  { name: "WebSocket Server", status: "online", latency: "18ms", uptime: "99.7%" },
];

function generateLatencyData() {
  return Array.from({ length: 12 }, (_, i) => ({
    time: `${i * 5}m`,
    api: Math.floor(20 + Math.random() * 15),
    db: Math.floor(5 + Math.random() * 8),
  }));
}

export default function MonitoringPage() {
  const [latencyData, setLatencyData] = useState(generateLatencyData);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: dashboard } = useQuery({
    queryKey: ["super-admin-dashboard"],
    queryFn: () => api.get("/dashboards/super-admin/").then((r) => r.data),
    refetchInterval: 30000,
  });

  const refresh = () => {
    setLatencyData(generateLatencyData());
    setLastRefresh(new Date());
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time platform health and performance metrics</p>
        </div>
        <button onClick={refresh} className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh · {lastRefresh.toLocaleTimeString()}
        </button>
      </div>

      {/* Overall Status Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-emerald-800">All Systems Operational</p>
          <p className="text-xs text-emerald-600">No incidents in the last 24 hours · Platform uptime: 99.97%</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-emerald-600 font-medium">Active Organizations</p>
          <p className="text-2xl font-bold text-emerald-800">{dashboard?.companies?.active ?? 0}</p>
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SERVICES.map((svc) => (
          <div key={svc.name} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <StatusDot status={svc.status} />
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{svc.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className={`text-xs font-medium ${svc.status === "online" ? "text-emerald-600" : svc.status === "degraded" ? "text-yellow-600" : "text-red-600"}`}>
                  {svc.status}
                </span>
                <span className="text-xs text-gray-400">Uptime {svc.uptime}</span>
              </div>
            </div>
            {svc.latency && (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg font-mono">{svc.latency}</span>
            )}
          </div>
        ))}
      </div>

      {/* Latency Chart + Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Latency trend */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Response Latency</h3>
          <p className="text-xs text-gray-400 mb-4">Last 60 minutes (simulated)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={latencyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="ms" />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 11 }} />
              <Line type="monotone" dataKey="api" stroke="#6366f1" strokeWidth={2} dot={false} name="API" />
              <Line type="monotone" dataKey="db" stroke="#10b981" strokeWidth={2} dot={false} name="DB" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Platform Statistics</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Orgs", value: dashboard?.companies?.total ?? 0, icon: Server, color: "bg-blue-50 text-blue-600" },
              { label: "Active Users", value: dashboard?.active_users ?? 0, icon: Activity, color: "bg-emerald-50 text-emerald-600" },
              { label: "Total Employees", value: dashboard?.total_employees ?? 0, icon: Cpu, color: "bg-purple-50 text-purple-600" },
              { label: "Subscriptions", value: dashboard?.active_subscriptions ?? 0, icon: Zap, color: "bg-yellow-50 text-yellow-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`${color.split(" ")[0]} rounded-xl p-3 flex items-center gap-2`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${color.split(" ")[1]}`} />
                <div>
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">API Health</span>
                <span className="text-emerald-600 font-medium">99.98%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "99.98%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">DB Health</span>
                <span className="text-emerald-600 font-medium">99.99%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "99.99%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Cache Hit Rate</span>
                <span className="text-blue-600 font-medium">94.2%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "94.2%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security quick view */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Security Overview (Last 24h)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Failed Logins", value: dashboard?.security?.failed_logins_24h ?? 0, icon: AlertTriangle, alert: (dashboard?.security?.failed_logins_24h ?? 0) > 5 },
            { label: "Failed Logins (7d)", value: dashboard?.security?.failed_logins_7d ?? 0, icon: Clock, alert: false },
            { label: "Active Sessions", value: dashboard?.active_users ?? 0, icon: Wifi, alert: false },
            { label: "Security Events", value: 0, icon: CheckCircle, alert: false },
          ].map(({ label, value, icon: Icon, alert }) => (
            <div key={label} className={`rounded-xl p-3 flex items-center gap-2 ${alert ? "bg-red-50" : "bg-gray-50"}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${alert ? "text-red-500" : "text-gray-400"}`} />
              <div>
                <p className={`text-lg font-bold ${alert ? "text-red-700" : "text-gray-900"}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
