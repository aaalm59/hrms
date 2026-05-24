import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, CheckCircle, XCircle, Building2, Users,
  ArrowUpRight, X, Edit2, Trash2, AlertTriangle, ChevronLeft, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
  trial: "bg-yellow-100 text-yellow-700",
  inactive: "bg-gray-100 text-gray-500",
};

function CreateOrgModal({ onClose }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { status: "trial", country: "India", timezone: "Asia/Kolkata", currency: "INR" },
  });

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get("/subscriptions/plans/").then((r) => r.data?.results ?? r.data),
  });

  const createOrg = useMutation({
    mutationFn: async (d) => {
      const { admin_email, admin_password, admin_first_name, admin_last_name, plan_id, ...orgData } = d;
      const company = await api.post("/companies/", orgData).then((r) => r.data);
      if (admin_email && admin_password) {
        await api.post(`/companies/${company.id}/create_admin/`, {
          email: admin_email,
          password: admin_password,
          first_name: admin_first_name || "",
          last_name: admin_last_name || "",
        });
      }
      if (plan_id) {
        const today = new Date();
        const end = new Date(today); end.setFullYear(end.getFullYear() + 1);
        await api.post("/subscriptions/", {
          company: company.id,
          plan_id,
          status: "trial",
          billing_cycle: "monthly",
          start_date: today.toISOString().split("T")[0],
          end_date: end.toISOString().split("T")[0],
          amount_paid: 0,
        }).catch(() => {});
      }
      return company;
    },
    onSuccess: () => {
      toast.success("Organization created successfully");
      qc.invalidateQueries(["companies"]);
      qc.invalidateQueries(["super-admin-dashboard"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(", ") || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Organization</h2>
            <div className="flex gap-1 mt-2">
              {[1, 2].map((s) => (
                <div key={s} className={`h-1 w-12 rounded-full transition-colors ${step >= s ? "bg-primary-600" : "bg-gray-200"}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => createOrg.mutate(d))} className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Organization Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Organization Name *</label>
                  <input {...register("name", { required: true })} className="input" placeholder="Acme Corp" />
                  {errors.name && <p className="err">Required</p>}
                </div>
                <div>
                  <label className="label">Official Email *</label>
                  <input type="email" {...register("email", { required: true })} className="input" placeholder="hr@acmecorp.com" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input {...register("phone")} className="input" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input {...register("website")} className="input" placeholder="https://acmecorp.com" />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <input {...register("industry")} className="input" placeholder="Technology" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select {...register("status")} className="input">
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                  </select>
                </div>
                <div>
                  <label className="label">City</label>
                  <input {...register("city")} className="input" placeholder="Mumbai" />
                </div>
                <div>
                  <label className="label">State</label>
                  <input {...register("state")} className="input" placeholder="Maharashtra" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input {...register("country")} className="input" />
                </div>
                <div>
                  <label className="label">Max Employees</label>
                  <input type="number" {...register("max_employees")} className="input" defaultValue={50} min={1} />
                </div>
                <div>
                  <label className="label">Subscription Plan</label>
                  <select {...register("plan_id")} className="input">
                    <option value="">None (free trial)</option>
                    {plans?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — ₹{p.price_monthly}/mo</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setStep(2)} className="btn-primary">
                  Next: Admin Account →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Company Admin Credentials</p>
              <p className="text-xs text-gray-400 bg-blue-50 px-3 py-2 rounded-lg">This creates the first Company Admin user who can log in and manage the organization.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input {...register("admin_first_name")} className="input" placeholder="John" />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input {...register("admin_last_name")} className="input" placeholder="Smith" />
                </div>
                <div>
                  <label className="label">Admin Email *</label>
                  <input type="email" {...register("admin_email")} className="input" placeholder="admin@acmecorp.com" />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input type="password" {...register("admin_password")} className="input" placeholder="Min 8 characters" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                <button type="submit" disabled={createOrg.isPending} className="btn-primary flex-1">
                  {createOrg.isPending ? "Creating..." : "Create Organization"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function EditOrgModal({ company, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      industry: company.industry || "",
      city: company.city || "",
      state: company.state || "",
      country: company.country || "",
      address: company.address || "",
      pincode: company.pincode || "",
      gst_number: company.gst_number || "",
      pan_number: company.pan_number || "",
      max_employees: company.max_employees || 50,
      description: company.description || "",
      status: company.status || "trial",
    },
  });

  const editMutation = useMutation({
    mutationFn: (data) => api.patch(`/companies/${company.id}/`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Organization updated");
      qc.invalidateQueries(["companies"]);
      qc.invalidateQueries(["company-detail", String(company.id)]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(", ") || "Update failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Organization</h2>
            <p className="text-xs text-gray-400 mt-0.5">{company.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => editMutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Organization Name *</label>
              <input {...register("name", { required: true })} className="input" />
              {errors.name && <p className="err">Required</p>}
            </div>
            <div>
              <label className="label">Official Email *</label>
              <input type="email" {...register("email", { required: true })} className="input" />
              {errors.email && <p className="err">Required</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register("phone")} className="input" />
            </div>
            <div>
              <label className="label">Website</label>
              <input {...register("website")} className="input" />
            </div>
            <div>
              <label className="label">Industry</label>
              <input {...register("industry")} className="input" placeholder="e.g. Technology" />
            </div>
            <div>
              <label className="label">GST Number</label>
              <input {...register("gst_number")} className="input" />
            </div>
            <div>
              <label className="label">PAN Number</label>
              <input {...register("pan_number")} className="input" />
            </div>
            <div>
              <label className="label">City</label>
              <input {...register("city")} className="input" />
            </div>
            <div>
              <label className="label">State</label>
              <input {...register("state")} className="input" />
            </div>
            <div>
              <label className="label">Country</label>
              <input {...register("country")} className="input" />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input {...register("pincode")} className="input" />
            </div>
            <div>
              <label className="label">Max Employees</label>
              <input type="number" {...register("max_employees")} className="input" min={1} />
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register("status")} className="input">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input {...register("address")} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea {...register("description")} className="input" rows={3} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={editMutation.isPending} className="btn-primary flex-1">
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ company, onClose }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/companies/${company.id}/`),
    onSuccess: () => {
      toast.success(`"${company.name}" deleted`);
      qc.invalidateQueries(["companies"]);
      qc.invalidateQueries(["super-admin-dashboard"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to delete"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-red-700">Delete Organization</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This action is permanent and irreversible</p>
              <p className="text-xs text-red-600 mt-1">All company data including employees, payroll records, and settings will be permanently deleted.</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Type <strong className="text-gray-900">{company.name}</strong> to confirm:</p>
            <input
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={company.name}
            />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={confirm !== company.name || deleteMutation.isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [deleteCompany, setDeleteCompany] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["companies", search, statusFilter, page],
    queryFn: () =>
      api.get(`/companies/?search=${search}${statusFilter ? `&status=${statusFilter}` : ""}&ordering=-created_at&page=${page}`).then((r) => r.data),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => api.post(`/companies/${id}/activate/`),
    onSuccess: () => { qc.invalidateQueries(["companies"]); toast.success("Organization activated"); },
    onError: () => toast.error("Failed"),
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => api.post(`/companies/${id}/suspend/`),
    onSuccess: () => { qc.invalidateQueries(["companies"]); toast.success("Organization suspended"); },
    onError: () => toast.error("Failed"),
  });

  const companies = data?.results ?? [];
  const totalPages = data?.count ? Math.ceil(data.count / 20) : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count ?? "—"} total organizations on the platform
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Organization
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: data?.count ?? 0, color: "text-gray-900", bg: "bg-gray-50" },
          { label: "Active", value: companies.filter((c) => c.status === "active").length, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Trial", value: companies.filter((c) => c.status === "trial").length, color: "text-yellow-700", bg: "bg-yellow-50" },
          { label: "Suspended", value: companies.filter((c) => c.status === "suspended").length, color: "text-red-700", bg: "bg-red-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl px-4 py-3 flex items-center justify-between`}>
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-xl font-bold ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 py-2 text-sm"
              placeholder="Search organization, email, slug..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input py-2 text-sm w-36"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Organization", "Contact", "Employees", "Plan", "Status", "Created", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-14 text-gray-400">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No organizations found</p>
                  <button onClick={() => setShowCreate(true)} className="mt-3 btn-primary text-xs">
                    Create First Organization
                  </button>
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/super-admin/companies/${c.id}`)}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-bold text-sm">{c.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-gray-600 text-xs">{c.email}</p>
                    {c.phone && <p className="text-gray-400 text-xs">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700 font-medium">{c.employee_count}</span>
                      {c.max_employees && <span className="text-gray-400 text-xs">/ {c.max_employees}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">{c.subscription_plan ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs">
                    {c.created_at ? format(parseISO(c.created_at), "dd MMM yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {c.status !== "active" && (
                        <button
                          onClick={() => activateMutation.mutate(c.id)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                          title="Activate"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {c.status !== "suspended" && (
                        <button
                          onClick={() => suspendMutation.mutate(c.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Suspend"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditCompany(c)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteCompany(c)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/super-admin/companies/${c.id}`)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                        title="View Details"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.count > 20 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <p className="text-gray-500 text-xs">
              Page {page} of {totalPages} · {data.count} total organizations
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={!data.previous}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 text-xs hover:bg-gray-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="text-xs text-gray-400 px-2">{page}</span>
              <button
                disabled={!data.next}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 text-xs hover:bg-gray-50"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} />}
      {editCompany && <EditOrgModal company={editCompany} onClose={() => setEditCompany(null)} />}
      {deleteCompany && <DeleteConfirmModal company={deleteCompany} onClose={() => setDeleteCompany(null)} />}
    </div>
  );
}
