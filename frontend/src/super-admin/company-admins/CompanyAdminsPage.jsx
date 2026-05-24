import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import {
  BarChart3,
  Building2,
  Edit2,
  Eye,
  LogIn,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import api from "@/services/api";
import { setCredentials } from "@/redux/slices/authSlice";
import { store } from "@/redux/store";

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
  suspended: "bg-red-100 text-red-700",
};

function getError(err, fallback = "Something went wrong") {
  const data = err.response?.data;
  if (data?.detail) return data.detail;
  if (data && typeof data === "object") return Object.values(data).flat().join(", ");
  return fallback;
}

function roleNames(user) {
  return (user.roles || []).map((role) => {
    if (typeof role === "string") return role;
    return role.name || role.display_name || "";
  }).filter(Boolean);
}

function ModalShell({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-5 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="p-5 border-t border-gray-100">{footer}</div>}
      </div>
    </div>
  );
}

function CreateAdminModal({ companies, defaultCompanyId, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    company_id: defaultCompanyId || "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [selectedRoles, setSelectedRoles] = useState(new Set());

  const { data: roles = [] } = useQuery({
    queryKey: ["company-admin-create-roles", form.company_id],
    queryFn: () => api.get(`/rbac/roles/?company_id=${form.company_id}`).then((r) => r.data?.results ?? r.data),
    enabled: Boolean(form.company_id),
  });

  useEffect(() => {
    const adminRole = roles.find((role) => role.name === "company_admin");
    setSelectedRoles(adminRole ? new Set([String(adminRole.id)]) : new Set());
  }, [roles]);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/companies/${form.company_id}/create_admin/`, {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
      });
      const userId = response.data?.user?.id || response.data?.user_id;
      if (userId && selectedRoles.size > 0) {
        await api.post(`/companies/${form.company_id}/admins/${userId}/assign-roles/`, {
          role_ids: Array.from(selectedRoles),
        });
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success("Company admin created");
      qc.invalidateQueries({ queryKey: ["company-admins-global"] });
      qc.invalidateQueries({ queryKey: ["company-admins"] });
      onClose();
    },
    onError: (err) => toast.error(getError(err, "Failed to create admin")),
  });

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleRole = (roleId) => {
    setSelectedRoles((current) => {
      const next = new Set(current);
      const key = String(roleId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <ModalShell
      title="Create Company Admin"
      subtitle="Create a login user and assign tenant roles"
      onClose={onClose}
      footer={(
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.company_id || !form.email || !form.password}
            className="btn-primary flex-1"
          >
            {mutation.isPending ? "Creating..." : "Create Admin"}
          </button>
        </div>
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Organization *</label>
          <select value={form.company_id} onChange={(e) => setField("company_id", e.target.value)} className="input">
            <option value="">Select organization</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">First Name</label>
          <input value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Email *</label>
          <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Password *</label>
          <input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} className="input" />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-gray-800 mb-2">Roles & Permissions</p>
        {!form.company_id ? (
          <p className="text-sm text-gray-400">Select an organization to load tenant roles.</p>
        ) : roles.length === 0 ? (
          <p className="text-sm text-gray-400">No roles found for this organization.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {roles.map((role) => (
              <label key={role.id} className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedRoles.has(String(role.id))}
                  onChange={() => toggleRole(role.id)}
                  className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{role.display_name}</p>
                  <p className="text-xs text-gray-400">{role.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(role.permissions || []).length} permissions</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function EditAdminModal({ user, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    phone: user.phone || "",
    status: user.status || "active",
  });

  const mutation = useMutation({
    mutationFn: () => api.patch(`/companies/${user.company}/admins/${user.id}/`, form).then((r) => r.data),
    onSuccess: () => {
      toast.success("Company admin updated");
      qc.invalidateQueries({ queryKey: ["company-admins-global"] });
      onClose();
    },
    onError: (err) => toast.error(getError(err, "Failed to update admin")),
  });

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <ModalShell
      title="Edit Company Admin"
      subtitle={user.company_name}
      onClose={onClose}
      footer={(
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.email} className="btn-primary flex-1">
            {mutation.isPending ? "Saving..." : "Save Admin"}
          </button>
        </div>
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">First Name</label>
          <input value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Email *</label>
          <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Status</label>
          <select value={form.status} onChange={(e) => setField("status", e.target.value)} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>
    </ModalShell>
  );
}

function AssignRolesModal({ user, onClose }) {
  const qc = useQueryClient();
  const existingRoleNames = useMemo(() => roleNames(user), [user]);
  const [selectedRoles, setSelectedRoles] = useState(new Set());

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["company-admin-roles", user.company],
    queryFn: () => api.get(`/rbac/roles/?company_id=${user.company}`).then((r) => r.data?.results ?? r.data),
    enabled: Boolean(user.company),
  });

  useEffect(() => {
    if (!roles.length) return;
    setSelectedRoles(new Set(
      roles
        .filter((role) => existingRoleNames.includes(role.name) || existingRoleNames.includes(role.display_name))
        .map((role) => String(role.id))
    ));
  }, [roles, existingRoleNames]);

  const mutation = useMutation({
    mutationFn: () => api.post(`/companies/${user.company}/admins/${user.id}/assign-roles/`, {
      role_ids: Array.from(selectedRoles),
    }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Roles updated");
      qc.invalidateQueries({ queryKey: ["company-admins-global"] });
      onClose();
    },
    onError: (err) => toast.error(getError(err, "Failed to assign roles")),
  });

  const toggleRole = (roleId) => {
    setSelectedRoles((current) => {
      const next = new Set(current);
      const key = String(roleId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <ModalShell
      title="Assign Roles & Permissions"
      subtitle={user.email}
      onClose={onClose}
      footer={(
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || selectedRoles.size === 0} className="btn-primary flex-1">
            {mutation.isPending ? "Saving..." : "Save Roles"}
          </button>
        </div>
      )}
    >
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading roles...</div>
      ) : roles.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No roles found for this organization.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roles.map((role) => (
            <label key={role.id} className="rounded-xl border border-gray-100 p-4 hover:bg-gray-50 flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedRoles.has(String(role.id))}
                onChange={() => toggleRole(role.id)}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">{role.display_name}</p>
                <p className="text-xs text-gray-400">{role.name}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(role.permissions || []).slice(0, 4).map((permission) => (
                    <span key={permission} className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                      {permission}
                    </span>
                  ))}
                  {(role.permissions || []).length > 4 && (
                    <span className="text-xs text-gray-400">+{role.permissions.length - 4} more</span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [pwd, setPwd] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post(`/companies/${user.company}/admins/${user.id}/reset-password/`, { new_password: pwd }),
    onSuccess: () => {
      toast.success(`Password reset for ${user.email}`);
      onClose();
    },
    onError: (err) => toast.error(getError(err, "Failed to reset password")),
  });

  return (
    <ModalShell
      title="Reset Password"
      subtitle={user.email}
      onClose={onClose}
      footer={(
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || pwd.length < 6} className="btn-primary flex-1">
            {mutation.isPending ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      )}
    >
      <label className="label">New Password *</label>
      <input
        type="password"
        className="input"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        placeholder="Minimum 6 characters"
      />
    </ModalShell>
  );
}

function DeleteAdminModal({ user, onClose }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.delete(`/companies/${user.company}/admins/${user.id}/`),
    onSuccess: () => {
      toast.success("Company admin deleted");
      qc.invalidateQueries({ queryKey: ["company-admins-global"] });
      onClose();
    },
    onError: (err) => toast.error(getError(err, "Failed to delete admin")),
  });

  return (
    <ModalShell
      title="Delete Company Admin"
      subtitle={user.email}
      onClose={onClose}
      footer={(
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {mutation.isPending ? "Deleting..." : "Delete Admin"}
          </button>
        </div>
      )}
    >
      <div className="rounded-xl border border-red-100 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-800">This admin will lose access immediately.</p>
        <p className="text-xs text-red-600 mt-1">The organization and its HRMS data will not be deleted.</p>
      </div>
    </ModalShell>
  );
}

export default function CompanyAdminsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [roleUser, setRoleUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list-mini"],
    queryFn: () => api.get("/companies/?ordering=name&page_size=200").then((r) => r.data?.results ?? r.data),
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
    queryFn: () => api.get(`/auth/users/?${params}`).then((r) => r.data?.results ?? r.data),
  });

  const impersonateMutation = useMutation({
    mutationFn: (admin) => api.post(`/companies/${admin.company}/login-as-admin/`).then((r) => r.data),
    onSuccess: (data) => {
      const { accessToken, refreshToken } = store.getState().auth;
      sessionStorage.setItem("sa_access", accessToken ?? "");
      sessionStorage.setItem("sa_refresh", refreshToken ?? "");
      dispatch(setCredentials({ access: data.access, refresh: data.refresh }));
      toast.success(`Logged in as ${data.user_name || data.user_email}`);
      window.location.href = "/company-admin/dashboard";
    },
    onError: (err) => toast.error(getError(err, "Failed to login as admin")),
  });

  const summary = {
    total: admins.length,
    active: admins.filter((admin) => admin.status === "active").length,
    suspended: admins.filter((admin) => admin.status === "suspended").length,
    companies: new Set(admins.map((admin) => admin.company).filter(Boolean)).size,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Admins</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create, manage, secure, and impersonate tenant admins</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Create Admin
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Admins", value: summary.total, bg: "bg-gray-50", color: "text-gray-900" },
          { label: "Active", value: summary.active, bg: "bg-emerald-50", color: "text-emerald-700" },
          { label: "Suspended", value: summary.suspended, bg: "bg-red-50", color: "text-red-700" },
          { label: "Organizations", value: summary.companies, bg: "bg-indigo-50", color: "text-indigo-700" },
        ].map((item) => (
          <div key={item.label} className={`${item.bg} rounded-xl px-4 py-3 flex items-center justify-between`}>
            <span className="text-sm text-gray-500">{item.label}</span>
            <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search admin name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 py-2 w-full text-sm"
            />
          </div>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="input py-2 text-sm min-w-52">
            <option value="">All Organizations</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-2 text-sm w-40">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Admin", "Organization", "Roles", "Last Login", "Joined", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading admins...</td></tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No company admins found</p>
                    <button onClick={() => setShowCreate(true)} className="btn-primary text-xs mt-3">Create Company Admin</button>
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
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
                            {[admin.first_name, admin.last_name].filter(Boolean).join(" ") || "Admin User"}
                          </p>
                          <p className="text-xs text-gray-400">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => admin.company && navigate(`/super-admin/companies/${admin.company}`)}
                        className="flex items-center gap-2 text-gray-700 hover:text-primary-700"
                      >
                        <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs font-medium">{admin.company_name || "-"}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {roleNames(admin).length === 0 ? (
                          <span className="text-xs text-gray-400">No roles</span>
                        ) : roleNames(admin).map((role) => (
                          <span key={role} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {admin.last_login ? format(parseISO(admin.last_login), "dd MMM, HH:mm") : "Never"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {admin.date_joined ? format(parseISO(admin.date_joined), "dd MMM yyyy") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[admin.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {admin.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/super-admin/companies/${admin.company}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700" title="View Company Profile">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => navigate(`/super-admin/companies/${admin.company}?tab=analytics`)} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600" title="View Company Analytics">
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditUser(admin)} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600" title="Edit Admin">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setRoleUser(admin)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600" title="Assign Roles & Permissions">
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setResetUser(admin)} className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-orange-600" title="Reset Password">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => impersonateMutation.mutate(admin)} disabled={impersonateMutation.isPending} className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600" title="Login As Admin">
                          <LogIn className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteUser(admin)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600" title="Delete Admin">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateAdminModal companies={companies} defaultCompanyId={companyId} onClose={() => setShowCreate(false)} />}
      {editUser && <EditAdminModal user={editUser} onClose={() => setEditUser(null)} />}
      {roleUser && <AssignRolesModal user={roleUser} onClose={() => setRoleUser(null)} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
      {deleteUser && <DeleteAdminModal user={deleteUser} onClose={() => setDeleteUser(null)} />}
    </div>
  );
}
