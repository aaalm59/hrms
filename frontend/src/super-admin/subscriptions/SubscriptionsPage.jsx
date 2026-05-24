import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard, Plus, X, CheckCircle, XCircle, Calendar,
  DollarSign, Building2, ArrowUpRight, AlertTriangle, Star
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { format, parseISO } from "date-fns";
import { useForm } from "react-hook-form";

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-yellow-100 text-yellow-700",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const TIER_COLOR = {
  basic: "bg-blue-50 text-blue-700 border-blue-200",
  standard: "bg-purple-50 text-purple-700 border-purple-200",
  enterprise: "bg-amber-50 text-amber-700 border-amber-200",
};

function PlanCard({ plan, onEdit }) {
  return (
    <div className={`bg-white rounded-2xl border-2 p-5 ${TIER_COLOR[plan.tier] ?? "border-gray-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{plan.tier}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
        </div>
        {!plan.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">₹{Number(plan.price_monthly).toLocaleString()}</p>
      <p className="text-xs text-gray-500 mb-4">per month · ₹{Number(plan.price_yearly).toLocaleString()}/yr</p>
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span>Up to {plan.max_employees} employees</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span>{plan.max_storage_gb}GB storage</span>
        </div>
        {plan.features?.slice(0, 3).map((f) => (
          <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("subscriptions");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get("/subscriptions/plans/").then((r) => r.data?.results ?? r.data),
  });

  const { data: subs } = useQuery({
    queryKey: ["subscriptions", statusFilter],
    queryFn: () =>
      api.get(`/subscriptions/${statusFilter ? `?status=${statusFilter}` : ""}`).then((r) => r.data),
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get("/subscriptions/invoices/").then((r) => r.data),
    enabled: tab === "invoices",
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/subscriptions/${id}/cancel/`),
    onSuccess: () => { toast.success("Subscription cancelled"); qc.invalidateQueries(["subscriptions"]); },
    onError: () => toast.error("Failed to cancel"),
  });

  const subscriptions = subs?.results ?? [];
  const invoiceList = invoices?.results ?? [];
  const totalMRR = subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + (s.plan?.price_monthly ? Number(s.plan.price_monthly) : 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage plans, billing, and organization subscriptions</p>
        </div>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Monthly Revenue", value: `₹${totalMRR.toLocaleString()}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
          { label: "Active Subscriptions", value: subscriptions.filter((s) => s.status === "active").length, icon: CheckCircle, color: "bg-blue-50 text-blue-600" },
          { label: "Trial", value: subscriptions.filter((s) => s.status === "trial").length, icon: Calendar, color: "bg-yellow-50 text-yellow-600" },
          { label: "Expired/Cancelled", value: subscriptions.filter((s) => ["expired", "cancelled"].includes(s.status)).length, icon: XCircle, color: "bg-red-50 text-red-600" },
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
        {["subscriptions", "plans", "invoices"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Subscriptions tab */}
      {tab === "subscriptions" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input py-1.5 text-sm w-36"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Organization", "Plan", "Status", "Billing", "Start", "End", "Paid", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subscriptions.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No subscriptions found</td></tr>
              ) : (
                subscriptions.map((s) => (
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
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[s.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{s.billing_cycle}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.start_date}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.end_date}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium text-xs">₹{Number(s.amount_paid).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {!["cancelled", "expired"].includes(s.status) && (
                        <button
                          onClick={() => cancelMutation.mutate(s.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Plans tab */}
      {tab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {!plans?.length ? (
            <div className="col-span-3 text-center py-14 text-gray-400">No plans configured</div>
          ) : (
            plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)
          )}
        </div>
      )}

      {/* Invoices tab */}
      {tab === "invoices" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Invoice #", "Organization", "Amount", "Status", "Due Date", "Paid At"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoiceList.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No invoices found</td></tr>
              ) : (
                invoiceList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{inv.subscription?.company?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₹{Number(inv.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : inv.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{inv.due_date}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {inv.paid_at ? format(parseISO(inv.paid_at), "dd MMM yyyy") : "—"}
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
