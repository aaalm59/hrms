import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Building2, Users, DollarSign, Activity } from "lucide-react";
import api from "@/services/api";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function SuperAdminAnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["super-admin-dashboard"],
    queryFn: () => api.get("/dashboards/super-admin/").then((r) => r.data),
  });

  const growth = data?.company_growth ?? [];
  const planDist = data?.plan_distribution ?? [];
  const companies = data?.companies ?? {};

  // Status distribution for pie
  const statusData = [
    { name: "Active", value: companies.active ?? 0 },
    { name: "Trial", value: companies.trial ?? 0 },
    { name: "Suspended", value: companies.suspended ?? 0 },
    { name: "Inactive", value: companies.inactive ?? 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Organization growth, user trends, and revenue insights</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Organizations", value: companies.total ?? 0, icon: Building2, color: "bg-blue-50 text-blue-600" },
          { label: "Total Employees", value: data?.total_employees?.toLocaleString() ?? "—", icon: Users, color: "bg-emerald-50 text-emerald-600" },
          { label: "Monthly Revenue", value: data?.mrr ? `₹${(data.mrr / 1000).toFixed(1)}K` : "₹0", icon: DollarSign, color: "bg-purple-50 text-purple-600" },
          { label: "Active Users", value: data?.active_users?.toLocaleString() ?? "—", icon: Activity, color: "bg-yellow-50 text-yellow-600" },
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Organization Growth */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Organization Growth</h3>
          <p className="text-xs text-gray-400 mb-4">New organizations joined per month</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="orgFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="organizations" stroke="#6366f1" fill="url(#orgFill)" strokeWidth={2} dot={{ r: 4 }} name="Organizations" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Employee Joining Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Employee Joining Trend</h3>
          <p className="text-xs text-gray-400 mb-4">New employees across all organizations</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={growth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Bar dataKey="employees" fill="#10b981" radius={[4, 4, 0, 0]} name="New Employees" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Organization Status Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Organization Status Mix</h3>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Plan Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Plan Distribution & Revenue</h3>
          {planDist.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No subscription data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={planDist} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
                <Bar yAxisId="left" dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Companies" />
                <Bar yAxisId="right" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue ₹" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
