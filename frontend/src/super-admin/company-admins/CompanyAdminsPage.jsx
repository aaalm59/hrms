import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { Users, Search, Building2, LogIn, RotateCcw, X, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import api from "../../services/api";
import { setCredentials } from "@/redux/slices/authSlice";
import { store } from "@/redux/store";

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
  suspended: "bg-red-100 text-red-700",
};

function ResetPasswordModal({ user, onClose }) {
  const [pwd, setPwd] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post(`/auth/users/${user.id}/reset-password/`, { new_password: pwd }),
    onSuccess: () => { toast.success(`Password reset for ${user.email}`); onClose(); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Reset Password</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500">Reset password for <strong>{user.email}</strong></p>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">New Password *</label>
            <input
              type="password"
              className="input w-full py-2"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Min 6 chars"
            />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || pwd.length < 6}
            className="btn-primary flex-1"
          >
            {mutation.isPending ? "Resetting…" : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyAdminsPage() {
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resetUser, setResetUser] = useState(null);
  const dispatch = useDispatch();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list-mini"],
    queryFn: () => api.get("/companies/?ordering=name").then(r => r.data?.results ?? r.data),
  });

  const params = new URLSearchParams({
    role: "company_admin",
    is_super_admin: "false",
    ...(search && { search }),
    ...(companyId && { company_id: companyId }),
    ...(statusFilter && { status: statusFilter }),
  });

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["company-admins-global", search, companyId, statusFilter],
    queryFn: () => api.get(`/auth/users/?${params}`).then(r => r.data?.results ?? r.data),
  });

  const impersonateMutation = useMutation({
    mutationFn: (cId) => api.post(`/auth/impersonate/${cId}/`).then(r => r.data),
    onSuccess: (data) => {
      const { accessToken, refreshToken } = store.getState().auth;
      sessionStorage.setItem("sa_access", accessToken ?? "");
      sessionStorage.setItem("sa_refresh", refreshToken ?? "");
      dispatch(setCredentials({ access: data.access, refresh: data.refresh }));
      toast.success(`Logged in as ${data.user_name || data.user_email}`);
      window.location.href = "/company-admin/dashboard";
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Admins</h1>
        <p className="text-sm text-gray-500 mt-0.5">All company admin users across organizations</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2 w-full text-sm"
          />
        </div>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="input py-2 text-sm min-w-48"
        >
          <option value="">All Organizations</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input py-2 text-sm w-36"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl">
          <Users className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-700">{admins.length} admins</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400 animate-pulse">Loading admins…</div>
        ) : admins.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No company admins found</p>
            <p className="text-sm text-gray-400">Create admins from the Organization workspace</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Admin", "Organization", "Roles", "Last Login", "Joined", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.map(admin => (
                <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        {admin.avatar ? (
                          <img src={admin.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
                        ) : (
                          <span className="text-indigo-700 font-bold text-sm">
                            {admin.first_name?.[0]?.toUpperCase() || admin.email?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {[admin.first_name, admin.last_name].filter(Boolean).join(" ") || "—"}
                        </p>
                        <p className="text-xs text-gray-400">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700 text-xs">{admin.company_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {admin.primary_role || "company_admin"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {admin.last_login ? format(parseISO(admin.last_login), "dd MMM, HH:mm") : "Never"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {admin.date_joined ? format(parseISO(admin.date_joined), "dd MMM yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[admin.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {admin.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setResetUser(admin)}
                        className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-orange-600 transition"
                        title="Reset Password"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {admin.company && (
                        <button
                          onClick={() => impersonateMutation.mutate(admin.company)}
                          disabled={impersonateMutation.isPending}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition"
                          title="Login As This Admin"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  );
}
