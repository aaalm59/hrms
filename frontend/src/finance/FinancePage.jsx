import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PermissionGate from "@/components/common/PermissionGate";
import {
  DollarSign, Plus, TrendingUp, TrendingDown, Wallet,
  Search, Filter, CheckCircle, XCircle, Clock, X, Edit, PieChart
} from "lucide-react";
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import toast from "react-hot-toast";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-blue-100 text-blue-700",
};

function ExpenseModal({ existing, categories, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: existing ?? { currency: "INR", payment_method: "bank_transfer", expense_date: format(new Date(), "yyyy-MM-dd") },
  });

  const mutation = useMutation({
    mutationFn: (d) => existing
      ? api.patch(`/finance/expenses/${existing.id}/`, d)
      : api.post("/finance/expenses/", d),
    onSuccess: () => {
      toast.success(existing ? "Expense updated" : "Expense submitted");
      qc.invalidateQueries(["expenses"]);
      qc.invalidateQueries(["expense-summary"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{existing ? "Edit" : "Submit"} Expense</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input {...register("title", { required: true })} className="input" placeholder="e.g. Office Supplies" />
            {errors.title && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input type="number" step="0.01" {...register("amount", { required: true })} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" {...register("expense_date", { required: true })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select {...register("category")} className="input">
                <option value="">Select category</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select {...register("payment_method")} className="input">
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register("description")} className="input h-20 resize-none" placeholder="Optional description..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BudgetModal({ onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { budget_type: "monthly", fiscal_year: new Date().getFullYear(), status: "active" },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/employees/departments/").then((r) => r.data?.results ?? r.data),
  });

  const mutation = useMutation({
    mutationFn: (d) => api.post("/finance/budgets/", d),
    onSuccess: () => {
      toast.success("Budget created");
      qc.invalidateQueries(["budgets"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Create Budget</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name *</label>
            <input {...register("name", { required: true })} className="input" placeholder="e.g. Q1 Marketing Budget" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input type="number" step="0.01" {...register("amount", { required: true })} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year *</label>
              <input type="number" {...register("fiscal_year", { required: true })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select {...register("budget_type")} className="input">
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select {...register("department")} className="input">
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("expenses");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const currentYear = new Date().getFullYear();

  const { data: summary } = useQuery({
    queryKey: ["expense-summary"],
    queryFn: () => api.get(`/finance/expenses/summary/?year=${currentYear}`).then((r) => r.data),
  });

  const { data: expenses = [], isLoading: expLoading } = useQuery({
    queryKey: ["expenses", search, statusFilter],
    queryFn: () =>
      api.get(`/finance/expenses/?search=${search}${statusFilter ? `&status=${statusFilter}` : ""}&ordering=-expense_date`)
        .then((r) => r.data?.results ?? r.data),
    enabled: tab === "expenses",
  });

  const { data: budgets = [], isLoading: budLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => api.get(`/finance/budgets/?year=${currentYear}`).then((r) => r.data?.results ?? r.data),
    enabled: tab === "budgets",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => api.get("/finance/categories/").then((r) => r.data?.results ?? r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.post(`/finance/expenses/${id}/approve/`),
    onSuccess: () => { toast.success("Expense approved"); qc.invalidateQueries(["expenses"]); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api.post(`/finance/expenses/${id}/reject/`),
    onSuccess: () => { toast.success("Expense rejected"); qc.invalidateQueries(["expenses"]); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.spent || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finance"
        subtitle="Budgets, expenses & financial overview"
        actions={
          <div className="flex gap-2">
            {tab === "budgets" && (
              <PermissionGate module="finance" action="create">
                <button onClick={() => setShowBudgetModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Budget
                </button>
              </PermissionGate>
            )}
            <PermissionGate module="finance" action="create">
              <button onClick={() => { setEditExpense(null); setShowExpenseModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Expense
              </button>
            </PermissionGate>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Expenses (YTD)", value: `₹${(summary?.total / 100000 || 0).toFixed(1)}L`, icon: DollarSign, color: "bg-blue-50 text-blue-600" },
          { label: "Pending Approval", value: summary?.by_status?.find((s) => s.status === "pending")?.count ?? 0, icon: Clock, color: "bg-amber-50 text-amber-600" },
          { label: "Approved", value: summary?.by_status?.find((s) => s.status === "approved")?.count ?? 0, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
          { label: "Total Budget", value: `₹${(totalBudget / 100000).toFixed(1)}L`, icon: Wallet, color: "bg-purple-50 text-purple-600" },
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

      {/* Charts */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Monthly Expenses ({currentYear})</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary.monthly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${v}`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Bar dataKey="amount" name="Expenses" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">By Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie data={summary.by_category} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {summary.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {["expenses", "budgets"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {t}
              </button>
            ))}
          </div>
          {tab === "expenses" && (
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input pl-9 py-2 text-sm w-52" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-2 text-sm w-32">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          )}
        </div>

        {tab === "expenses" && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Title", "Category", "Amount", "Date", "Submitted By", "Method", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expLoading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No expenses found</p>
                </td></tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{exp.title}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{exp.category_name || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₹{Number(exp.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {exp.expense_date ? format(parseISO(exp.expense_date), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{exp.submitted_by_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{exp.payment_method?.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[exp.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {exp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditExpense(exp); setShowExpenseModal(true); }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {exp.status === "pending" && (
                          <>
                            <button onClick={() => approveMutation.mutate(exp.id)}
                              className="p-1 hover:bg-emerald-50 rounded text-gray-400 hover:text-emerald-600">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => rejectMutation.mutate(exp.id)}
                              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === "budgets" && (
          <div className="p-4">
            {budLoading ? (
              <p className="text-center py-8 text-gray-400">Loading...</p>
            ) : budgets.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Wallet className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No budgets created yet</p>
                <button onClick={() => setShowBudgetModal(true)} className="btn-primary mt-4 text-sm">Create Budget</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgets.map((b) => {
                  const pct = Math.min(100, b.utilization_pct ?? 0);
                  const over = pct >= 90;
                  return (
                    <div key={b.id} className="border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{b.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{b.budget_type} · FY {b.fiscal_year}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {b.status}
                        </span>
                      </div>
                      {b.department_name && (
                        <p className="text-xs text-gray-500 mb-2">{b.department_name}</p>
                      )}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Spent</span>
                          <span className={`font-semibold ${over ? "text-red-600" : "text-gray-900"}`}>
                            ₹{Number(b.spent).toLocaleString()} / ₹{Number(b.amount).toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <p className={`text-xs ${over ? "text-red-600" : "text-gray-400"}`}>{pct}% utilized · ₹{Number(b.remaining).toLocaleString()} remaining</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showExpenseModal && (
        <ExpenseModal existing={editExpense} categories={categories} onClose={() => { setShowExpenseModal(false); setEditExpense(null); }} />
      )}
      {showBudgetModal && <BudgetModal onClose={() => setShowBudgetModal(false)} />}
    </div>
  );
}
