import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, CreditCard, Building2,
  ArrowUpRight, CheckCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import api from "@/services/api";

const PLAN_COLORS = ["#6366f1", "#f59e0b", "#10b981"];

export default function BillingPage() {
  const { data: dashboard } = useQuery({
    queryKey: ["super-admin-dashboard"],
    queryFn: () => api.get("/dashboards/super-admin/").then((r) => r.data),
  });

  const { data: subs } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => api.get("/subscriptions/").then((r) => r.data),
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get("/subscriptions/invoices/").then((r) => r.data),
  });

  const subscriptions = subs?.results ?? [];
  const invoiceList = invoices?.results ?? [];
  const planDist = dashboard?.plan_distribution ?? [];
  const growth = dashboard?.company_growth ?? [];

  const mrr = dashboard?.mrr ?? 0;
  const arr = mrr * 12;
  const paidInvoices = invoiceList.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
  const pendingInvoices = invoiceList.filter((i) => i.status === "pending").reduce((s, i) => s + Number(i.amount), 0);

  // Revenue bar data from company growth
  const revenueData = growth.map((g) => ({
    month: g.month,
    revenue: g.organizations * mrr / Math.max(growth.length, 1),
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Revenue</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform revenue, invoices, and financial metrics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Monthly Revenue (MRR)", value: `₹${Number(mrr).toLocaleString()}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
          { label: "Annual Run Rate (ARR)", value: `₹${(arr / 100000).toFixed(1)}L`, icon: TrendingUp, color: "bg-blue-50 text-blue-600" },
          { label: "Collected", value: `₹${paidInvoices.toLocaleString()}`, icon: CheckCircle, color: "bg-purple-50 text-purple-600" },
          { label: "Pending", value: `₹${pendingInvoices.toLocaleString()}`, icon: CreditCard, color: "bg-yellow-50 text-yellow-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Bar dataKey="organizations" fill="#6366f1" radius={[4, 4, 0, 0]} name="New Orgs" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Revenue Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
          {planDist.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={planDist} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="revenue" paddingAngle={3}>
                    {planDist.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {planDist.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                      <span className="text-gray-600">{p.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">₹{Number(p.revenue).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Revenue Organizations */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Top Subscriptions by Revenue</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Organization", "Plan", "Monthly Value", "Billing", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subscriptions.filter((s) => s.status === "active").length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No active subscriptions</td></tr>
            ) : (
              subscriptions
                .filter((s) => s.status === "active")
                .sort((a, b) => Number(b.plan?.price_monthly ?? 0) - Number(a.plan?.price_monthly ?? 0))
                .slice(0, 10)
                .map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-bold text-xs">{s.company_name?.[0]}</span>
                        </div>
                        <span className="font-medium text-gray-900">{s.company_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.plan?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₹{Number(s.plan?.price_monthly ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{s.billing_cycle}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">active</span>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
