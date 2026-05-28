import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Shield, Plus, Edit2, Trash2, Save, Lock, Check,
  Users, UserPlus, UserMinus, ChevronDown, Sparkles, RefreshCw,
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

const ROLE_DOTS = [
  "bg-red-500", "bg-purple-500", "bg-blue-500", "bg-emerald-500",
  "bg-teal-500", "bg-yellow-500", "bg-orange-500", "bg-gray-400",
  "bg-indigo-500", "bg-pink-500",
];
const ACTIONS = ["view", "create", "edit", "delete", "approve", "export"];
const TABS = ["Roles & Permissions", "User Roles"];

// ── Modals ──────────────────────────────────────────────────────────────────

function CreateRoleModal({ onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const mutation = useMutation({
    mutationFn: (d) => api.post("/rbac/roles/", d).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rbac-roles-company"] }); onClose(); },
    onError: (e) => toast.error(e.response?.data?.detail || "Failed to create role"),
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Create Role</h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Role Slug</label>
            <input {...register("name", { required: "Required" })} className="input w-full" placeholder="e.g. hr_manager" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Display Name</label>
            <input {...register("display_name", { required: "Required" })} className="input w-full" placeholder="e.g. HR Manager" />
            {errors.display_name && <p className="text-xs text-red-500 mt-1">{errors.display_name.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
            <textarea {...register("description")} className="input w-full resize-none" rows={3} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Creating…" : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRoleModal({ role, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: { name: role.name, display_name: role.display_name, description: role.description },
  });
  const mutation = useMutation({
    mutationFn: (d) => api.patch(`/rbac/roles/${role.id}/`, d).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rbac-roles-company"] }); onClose(); },
    onError: (e) => toast.error(e.response?.data?.detail || "Failed to save"),
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Edit Role</h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Role Slug</label>
            <input {...register("name")} className="input w-full disabled:bg-gray-50" disabled={role.is_system_role} />
            {role.is_system_role && <p className="text-xs text-amber-500 mt-1">System role slug is locked</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Display Name</label>
            <input {...register("display_name", { required: true })} className="input w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
            <textarea {...register("description")} className="input w-full resize-none" rows={3} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Roles & Permissions Panel ───────────────────────────────────────────────

function RolesPermissionsPanel() {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [deleteRole, setDeleteRole] = useState(null);
  const [checkedPerms, setCheckedPerms] = useState({});
  const [permsSaved, setPermsSaved] = useState(false);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["rbac-roles-company"],
    queryFn: () => api.get("/rbac/roles/").then((r) => r.data?.results ?? r.data),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["rbac-permissions-company"],
    queryFn: () => api.get("/rbac/permissions/").then((r) => r.data?.results ?? r.data),
  });

  const { data: rolePerms = [], isLoading: rolePermsLoading } = useQuery({
    queryKey: ["rbac-role-perms-company", selectedRole?.id],
    queryFn: () => api.get(`/rbac/roles/${selectedRole.id}/permissions/`).then((r) => r.data),
    enabled: !!selectedRole,
  });

  useEffect(() => {
    if (!selectedRole || !permissions.length || rolePermsLoading) return;
    const map = {};
    permissions.forEach((p) => { map[p.id] = false; });
    rolePerms.forEach((rp) => { map[rp.id] = true; });
    setCheckedPerms(map);
    setPermsSaved(false);
  }, [selectedRole?.id, rolePermsLoading, permissions.length]);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/rbac/roles/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac-roles-company"] });
      if (selectedRole?.id === deleteRole?.id) setSelectedRole(null);
      setDeleteRole(null);
      toast.success("Role deleted");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ roleId, permIds }) =>
      api.post(`/rbac/roles/${roleId}/assign_permissions/`, { permission_ids: permIds }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac-role-perms-company", selectedRole?.id] });
      setPermsSaved(true);
      setTimeout(() => setPermsSaved(false), 3000);
    },
  });

  const permsByModule = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = {};
    acc[p.module][p.action] = p;
    return acc;
  }, {});
  const modules = Object.keys(permsByModule).sort();

  const togglePerm = (id) => setCheckedPerms((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleModule = (module) => {
    const modPerms = Object.values(permsByModule[module] || {});
    const allChecked = modPerms.every((p) => checkedPerms[p.id]);
    const updates = {};
    modPerms.forEach((p) => { updates[p.id] = !allChecked; });
    setCheckedPerms((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    if (!selectedRole) return;
    const permIds = Object.entries(checkedPerms).filter(([, v]) => v).map(([id]) => parseInt(id));
    assignMutation.mutate({ roleId: selectedRole.id, permIds });
  };

  return (
    <div className="grid grid-cols-12 gap-5 items-start">
      {/* Roles list */}
      <div className="col-span-4 space-y-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Roles ({roles.length})
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> New Role
          </button>
        </div>

        {rolesLoading
          ? [1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
          : roles.map((role, idx) => {
              const dot = ROLE_DOTS[idx % ROLE_DOTS.length];
              const isSelected = selectedRole?.id === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => { setSelectedRole(role); setCheckedPerms({}); setPermsSaved(false); }}
                  className={`relative bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    isSelected ? "border-indigo-400 shadow-md" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full" />}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{role.display_name}</p>
                        <p className="font-mono text-xs text-gray-400">{role.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditRole(role); }}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!role.is_system_role && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteRole(role); }}
                          className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-4">
                    <span className="text-xs text-gray-400">{(role.permissions || []).length} permissions</span>
                    {role.is_system_role && (
                      <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full">system</span>
                    )}
                  </div>
                </div>
              );
            })}
      </div>

      {/* Permission matrix */}
      <div className="col-span-8">
        {!selectedRole ? (
          <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20">
            <Shield className="w-12 h-12 text-gray-200 mb-3" />
            <p className="font-semibold text-gray-500">Select a role to manage permissions</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selectedRole.display_name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Check cells to grant access — click Save when done</p>
              </div>
              <button onClick={handleSave} disabled={assignMutation.isPending} className="btn-primary flex items-center gap-2 text-sm">
                <Save className="w-4 h-4" />
                {assignMutation.isPending ? "Saving…" : "Save Permissions"}
              </button>
            </div>

            {permsSaved && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs px-5 py-2 border-b border-emerald-100">
                <Check className="w-3.5 h-3.5" /> Permissions saved successfully
              </div>
            )}

            {rolePermsLoading ? (
              <div className="py-12 text-center text-sm text-gray-400 animate-pulse">Loading permissions…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 w-36">Module</th>
                      {ACTIONS.map((a) => (
                        <th key={a} className="text-center px-3 py-3 font-semibold text-gray-500 capitalize min-w-14">{a}</th>
                      ))}
                      <th className="text-center px-3 py-3 font-semibold text-gray-400 w-14">All</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.length === 0 ? (
                      <tr>
                        <td colSpan={ACTIONS.length + 2} className="text-center py-10 text-gray-400">
                          <p className="font-medium text-gray-500">No permissions configured yet</p>
                          <p className="text-xs mt-1">Click <strong>"Seed Standard Permissions"</strong> at the top of the page to create all module:action permissions automatically.</p>
                        </td>
                      </tr>
                    ) : (
                      modules.map((module, mi) => {
                        const modPerms = permsByModule[module];
                        const existing = ACTIONS.map((a) => modPerms[a]).filter(Boolean);
                        const allChecked = existing.length > 0 && existing.every((p) => checkedPerms[p.id]);
                        const anyChecked = existing.some((p) => checkedPerms[p.id]);
                        return (
                          <tr key={module} className={`border-b border-gray-50 hover:bg-indigo-50/20 ${mi % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              <div className="flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-gray-300" />
                                {module.charAt(0).toUpperCase() + module.slice(1)}
                              </div>
                            </td>
                            {ACTIONS.map((action) => {
                              const perm = modPerms[action];
                              return !perm ? (
                                <td key={action} className="text-center px-3 py-3">
                                  <span className="text-gray-200">—</span>
                                </td>
                              ) : (
                                <td key={action} className="text-center px-3 py-3">
                                  <input
                                    type="checkbox"
                                    checked={!!checkedPerms[perm.id]}
                                    onChange={() => togglePerm(perm.id)}
                                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                                  />
                                </td>
                              );
                            })}
                            <td className="text-center px-3 py-3">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => { if (el) el.indeterminate = !allChecked && anyChecked; }}
                                onChange={() => toggleModule(module)}
                                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} />}
      {editRole && <EditRoleModal role={editRole} onClose={() => setEditRole(null)} />}
      {deleteRole && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Delete Role</h3>
            <p className="text-sm text-gray-500 mb-6">
              Delete <strong>{deleteRole.display_name}</strong>? All user assignments will also be removed.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteRole(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteRole.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── User Roles Panel ────────────────────────────────────────────────────────

function UserRolesPanel() {
  const qc = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ["rbac-user-roles-company"],
    queryFn: () => api.get("/rbac/user-roles/").then((r) => r.data?.results ?? r.data),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["rbac-roles-company"],
    queryFn: () => api.get("/rbac/roles/").then((r) => r.data?.results ?? r.data),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list-rbac"],
    queryFn: () => api.get("/employees/").then((r) => r.data?.results ?? r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => api.delete(`/rbac/user-roles/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac-user-roles-company"] });
      setRevokeTarget(null);
      toast.success("Role revoked");
    },
  });

  // Group by user
  const grouped = userRoles.reduce((acc, ur) => {
    const key = ur.user;
    if (!acc[key]) acc[key] = { email: ur.user_email, assignments: [] };
    acc[key].assignments.push(ur);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Manage which roles are assigned to each user.</p>
        <button onClick={() => setShowAssign(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Assign Role
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-16">
          <Users className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No user roles assigned yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Assign Role" to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-5 py-3">Assigned Roles</th>
                <th className="text-left px-5 py-3">Assigned At</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.values(grouped).map(({ email, assignments }) => (
                <tr key={email} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{email}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {assignments.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                          {a.role_name}
                          <button
                            onClick={() => setRevokeTarget(a)}
                            className="hover:text-red-500 transition"
                            title="Revoke"
                          >
                            <UserMinus className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {assignments[0]?.assigned_at ? new Date(assignments[0].assigned_at).toLocaleDateString() : "—"}
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAssign && (
        <AssignRoleModal
          roles={roles}
          employees={employees}
          onClose={() => setShowAssign(false)}
        />
      )}

      {revokeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <UserMinus className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Revoke Role</h3>
            <p className="text-sm text-gray-500 mb-6">
              Remove <strong>{revokeTarget.role_name}</strong> from <strong>{revokeTarget.user_email}</strong>?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setRevokeTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => revokeMutation.mutate(revokeTarget.id)}
                disabled={revokeMutation.isPending}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-semibold text-sm"
              >
                {revokeMutation.isPending ? "Revoking…" : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignRoleModal({ roles, employees, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (d) => api.post("/rbac/user-roles/", { user: parseInt(d.user), role: parseInt(d.role) }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac-user-roles-company"] });
      toast.success("Role assigned");
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || "Failed to assign role"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Assign Role to User</h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Employee</label>
            <select {...register("user", { required: "Select an employee" })} className="input w-full">
              <option value="">— Select employee —</option>
              {employees.map((e) => (
                <option key={e.user || e.id} value={e.user || e.id}>
                  {e.full_name || `${e.first_name} ${e.last_name}`} ({e.email})
                </option>
              ))}
            </select>
            {errors.user && <p className="text-xs text-red-500 mt-1">{errors.user.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Role</label>
            <select {...register("role", { required: "Select a role" })} className="input w-full">
              <option value="">— Select role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.display_name}</option>
              ))}
            </select>
            {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Assigning…" : "Assign Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RBACManagePage() {
  const [activeTab, setActiveTab] = useState(0);
  const qc = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: () => api.post("/rbac/seed-permissions/"),
    onSuccess: (res) => {
      toast.success(`Permissions seeded: ${res.data?.total_permissions} perms, ${res.data?.roles_created} new roles`);
      qc.invalidateQueries({ queryKey: ["rbac-roles-company"] });
      qc.invalidateQueries({ queryKey: ["rbac-perms-company"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Seed failed"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Access Control</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage roles, permissions, and user role assignments for your organisation</p>
        </div>
        <button
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          title="Create all standard module:action permissions and assign defaults to system roles"
        >
          {seedMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {seedMutation.isPending ? "Seeding…" : "Seed Standard Permissions"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === i
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && <RolesPermissionsPanel />}
      {activeTab === 1 && <UserRolesPanel />}
    </div>
  );

}
