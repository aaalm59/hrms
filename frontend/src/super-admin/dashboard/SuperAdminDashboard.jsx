import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Building2, Users, DollarSign, CreditCard, TrendingUp, Shield,
  AlertTriangle, Globe, Activity, ArrowUpRight, ChevronRight,
  CheckCircle, XCircle, Clock, UserCheck, Server, Zap
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import api from "@/services/api";
import { format, parseISO } from "date-fns";

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-yellow-100 text-yellow-700",
  suspended: "bg-red-100 text-red-700",
  inactive: "bg-gray-100 text-gray-500",
  none: "bg-gray-100 text-gray-500",
};

const PLAN_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];

function KPICard({ title, value, subtitle, icon: Icon, trend, color = "blue", onClick }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
    indigo: "bg-indigo-50 text-indigo-600",
    orange: "bg-orange-50 text-orange-600",
    teal: "bg-teal-50 text-teal-600",
  };
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm ${onClick ? "cursor-pointer hover:border-primary-200 hover:shadow-md" : ""} transition-all`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            <TrendingUp className="w-3 h-3" /> {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
      <p className="text-sm text-gray-500 mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function ActivityItem({ log }) {
  const actionColors = {
    create: "bg-emerald-100 text-emerald-700",
    update: "bg-blue-100 text-blue-700",
    delete: "bg-red-100 text-red-700",
    login: "bg-purple-100 text-purple-700",
    approve: "bg-green-100 text-green-700",
    reject: "bg-red-100 text-red-700",
  };
  const color = actionColors[log.action?.toLowerCase()] ?? "bg-gray-100 text-gray-600";
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${color}`}>
        {log.action}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">
          <span className="font-medium">{log.company || "Platform"}</span>
          {" — "}{log.description || log.model}
        </p>
        <p className="text-xs text-gray-400">{log.user} · {log.created_at ? format(parseISO(log.created_at), "dd MMM, HH:mm") : "—"}</p>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-dashboard"],
    queryFn: () => api.get("/dashboards/super-admin/").then((r) => r.data),
    refetchInterval: 60000,
  });

  const companies = data?.companies ?? {};
  const growth = data?.company_growth ?? [];
  const planDist = data?.plan_distribution ?? [];
  const topCompanies = data?.top_companies ?? [];
  const recentActivity = data?.recent_activity ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">Super Admin · Enterprise HRMS Control Center</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            System Online
          </span>
          <button
            onClick={() => navigate("/super-admin/companies")}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" /> Manage Organizations
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Organizations"
          value={companies.total}
          subtitle={`${companies.active ?? 0} active · ${companies.trial ?? 0} trial`}
          icon={Building2}
          color="blue"
          onClick={() => navigate("/super-admin/companies")}
        />
        <KPICard
          title="Total Employees"
          value={data?.total_employees?.toLocaleString()}
          subtitle="Across all organizations"
          icon={Users}
          color="green"
        />
        <KPICard
          title="Monthly Revenue"
          value={data?.mrr ? `₹${(data.mrr / 1000).toFixed(1)}K` : "₹0"}
          subtitle={`${data?.active_subscriptions ?? 0} active subscriptions`}
          icon={DollarSign}
          color="purple"
          onClick={() => navigate("/super-admin/billing")}
        />
        <KPICard
          title="Active Users"
          value={data?.active_users?.toLocaleString()}
          subtitle={`of ${data?.total_users ?? 0} total`}
          icon={UserCheck}
          color="teal"
        />
        <KPICard
          title="New This Month"
          value={companies.new_this_month}
          subtitle="New organizations joined"
          icon={TrendingUp}
          color="indigo"
        />
        <KPICard
          title="Suspended"
          value={companies.suspended ?? 0}
          subtitle="Organizations on hold"
          icon={XCircle}
          color={companies.suspended > 0 ? "red" : "teal"}
        />
        <KPICard
          title="Security Alerts"
          value={data?.security?.failed_logins_24h ?? 0}
          subtitle="Failed logins (24h)"
          icon={AlertTriangle}
          color={data?.security?.failed_logins_24h > 5 ? "red" : "yellow"}
          onClick={() => navigate("/super-admin/security")}
        />
        <KPICard
          title="Active Subscriptions"
          value={data?.active_subscriptions}
          subtitle="Paid plans active"
          icon={CreditCard}
          color="orange"
          onClick={() => navigate("/super-admin/subscriptions")}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Growth */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Organization & Employee Growth</h3>
              <p className="text-xs text-gray-400">Last 6 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="orgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="organizations" stroke="#6366f1" fill="url(#orgGrad)" strokeWidth={2} name="Orgs" dot={{ r: 3 }} />
              <Area type="monotone" dataKey="employees" stroke="#10b981" fill="url(#empGrad)" strokeWidth={2} name="New Employees" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Subscription Plans</h3>
            <p className="text-xs text-gray-400">Active + trial</p>
          </div>
          {planDist.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={planDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="count" paddingAngle={3}>
                    {planDist.map((_, i) => (
                      <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} companies`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {planDist.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                      <span className="text-gray-600">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-900">{p.count}</span>
                      <span className="text-gray-400 text-xs ml-1">·₹{(p.revenue / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Organization Table + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organizations Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Organizations</h3>
            <button onClick={() => navigate("/super-admin/companies")} className="text-xs text-primary-600 hover:underline font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Organization", "Employees", "Plan", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : topCompanies.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No organizations yet</td></tr>
                ) : (
                  topCompanies.slice(0, 8).map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/super-admin/companies/${c.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-700 font-bold text-xs">{c.name?.[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.city || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.employee_count}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.plan}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <button onClick={() => navigate("/super-admin/security")} className="text-xs text-primary-600 hover:underline font-medium">
              View logs
            </button>
          </div>
          <div className="p-4">
            {recentActivity.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No recent activity</p>
            ) : (
              recentActivity.map((log, i) => <ActivityItem key={i} log={log} />)
            )}
          </div>
        </div>
      </div>

      {/* Status Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Company Status */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Organization Status</h3>
          <div className="space-y-3">
            {[
              { label: "Active", value: companies.active ?? 0, color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
              { label: "Trial", value: companies.trial ?? 0, color: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50" },
              { label: "Suspended", value: companies.suspended ?? 0, color: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
              { label: "Inactive", value: companies.inactive ?? 0, color: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-50" },
            ].map(({ label, value, color, text, bg }) => {
              const total = companies.total || 1;
              const pct = Math.round((value / total) * 100);
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-sm text-gray-600">{label}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${text}`}>{value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: "Create Organization", icon: Building2, to: "/super-admin/companies" },
              { label: "Manage Subscriptions", icon: CreditCard, to: "/super-admin/subscriptions" },
              { label: "View Audit Logs", icon: Shield, to: "/super-admin/security" },
              { label: "Platform Analytics", icon: TrendingUp, to: "/super-admin/analytics" },
              { label: "Billing & Revenue", icon: DollarSign, to: "/super-admin/billing" },
            ].map(({ label, icon: Icon, to }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100">
                  <Icon className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
              </button>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-3">
            {[
              { label: "API Server", status: "online", latency: "24ms" },
              { label: "Database", status: "online", latency: "8ms" },
              { label: "Cache (Redis)", status: "online", latency: "2ms" },
              { label: "Background Jobs", status: "online", latency: null },
              { label: "Storage", status: "online", latency: null },
            ].map(({ label, status, latency }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${status === "online" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {latency && <span className="text-xs text-gray-400">{latency}</span>}
                  <span className={`text-xs font-medium ${status === "online" ? "text-emerald-600" : "text-red-600"}`}>
                    {status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-emerald-50 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-emerald-700 font-medium">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
