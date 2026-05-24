import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Shield, Plus, Edit2, Trash2, Save, Lock, Check } from "lucide-react";
import api from "../../services/api";

const ROLE_DOTS = [
  "bg-red-500", "bg-purple-500", "bg-blue-500", "bg-emerald-500",
  "bg-teal-500", "bg-yellow-500", "bg-orange-500", "bg-gray-400",
  "bg-indigo-500", "bg-pink-500",
];

const ACTIONS = ["view", "create", "edit", "delete", "approve", "export"];

// ── Create Role Modal ────────────────────────────────────────────────────────
function CreateRoleModal({ onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => api.post("/rbac/roles/", data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rbac-roles"] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Create Role</h2>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Role Slug</label>
            <input
              {...register("name", { required: "Required" })}
              className="input w-full"
              placeholder="e.g. hr_manager"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Display Name</label>
            <input
              {...register("display_name", { required: "Required" })}
              className="input w-full"
              placeholder="e.g. HR Manager"
            />
            {errors.display_name && <p className="text-xs text-red-500 mt-1">{errors.display_name.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
            <textarea
              {...register("description")}
              className="input w-full resize-none"
              rows={3}
              placeholder="What can this role do?"
            />
          </div>
          {mutation.isError && (
            <p className="text-xs text-red-500">{mutation.error?.response?.data?.detail || "Failed to create role"}</p>
          )}
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

// ── Edit Role Modal ──────────────────────────────────────────────────────────
function EditRoleModal({ role, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: { name: role.name, display_name: role.display_name, description: role.description },
  });

  const mutation = useMutation({
    mutationFn: (data) => api.patch(`/rbac/roles/${role.id}/`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rbac-roles"] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Edit Role</h2>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Role Slug</label>
            <input
              {...register("name", { required: true })}
              className="input w-full disabled:bg-gray-50 disabled:text-gray-400"
              disabled={role.is_system_role}
            />
            {role.is_system_role && (
              <p className="text-xs text-amber-500 mt-1">System role slug cannot be changed</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Display Name</label>
            <input {...register("display_name", { required: true })} className="input w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
            <textarea {...register("description")} className="input w-full resize-none" rows={3} />
          </div>
          {mutation.isError && (
            <p className="text-xs text-red-500">{mutation.error?.response?.data?.detail || "Failed to save"}</p>
          )}
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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RBACPage() {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [deleteRole, setDeleteRole] = useState(null);
  const [checkedPerms, setCheckedPerms] = useState({});
  const [permsSaved, setPermsSaved] = useState(false);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["rbac-roles"],
    queryFn: () => api.get("/rbac/roles/").then(r => r.data),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["rbac-permissions"],
    queryFn: () => api.get("/rbac/permissions/").then(r => r.data),
  });

  const { data: rolePerms = [], isLoading: rolePermsLoading } = useQuery({
    queryKey: ["rbac-role-perms", selectedRole?.id],
    queryFn: () => api.get(`/rbac/roles/${selectedRole.id}/permissions/`).then(r => r.data),
    enabled: !!selectedRole,
  });

  // Initialise checkbox state whenever the selected role's permissions load
  useEffect(() => {
    if (!selectedRole || !permissions.length || rolePermsLoading) return;
    const map = {};
    permissions.forEach(p => { map[p.id] = false; });
    rolePerms.forEach(rp => { map[rp.id] = true; });
    setCheckedPerms(map);
    setPermsSaved(false);
  }, [selectedRole?.id, rolePermsLoading, permissions.length]);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/rbac/roles/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac-roles"] });
      if (selectedRole?.id === deleteRole?.id) setSelectedRole(null);
      setDeleteRole(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ roleId, permIds }) =>
      api.post(`/rbac/roles/${roleId}/assign_permissions/`, { permission_ids: permIds }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac-role-perms", selectedRole?.id] });
      setPermsSaved(true);
      setTimeout(() => setPermsSaved(false), 3000);
    },
  });

  // Group permissions by module → action → Permission object
  const permsByModule = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = {};
    acc[p.module][p.action] = p;
    return acc;
  }, {});
  const modules = Object.keys(permsByModule).sort();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setCheckedPerms({});
    setPermsSaved(false);
  };

  const togglePerm = (permId) =>
    setCheckedPerms(prev => ({ ...prev, [permId]: !prev[permId] }));

  const toggleModule = (module) => {
    const modPerms = Object.values(permsByModule[module] || {});
    const allChecked = modPerms.every(p => checkedPerms[p.id]);
    const updates = {};
    modPerms.forEach(p => { updates[p.id] = !allChecked; });
    setCheckedPerms(prev => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    if (!selectedRole) return;
    const permIds = Object.entries(checkedPerms)
      .filter(([, v]) => v)
      .map(([id]) => parseInt(id));
    assignMutation.mutate({ roleId: selectedRole.id, permIds });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & RBAC</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage roles and module-level permissions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* ── Roles list ── */}
        <div className="col-span-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3">
            Roles ({roles.length})
          </p>

          {rolesLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))
          ) : (
            roles.map((role, idx) => {
              const dot = ROLE_DOTS[idx % ROLE_DOTS.length];
              const isSelected = selectedRole?.id === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => handleRoleSelect(role)}
                  className={`relative bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-indigo-400 shadow-md"
                      : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full" />
                  )}
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
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!role.is_system_role && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteRole(role); }}
                          className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {role.description && (
                    <p className="text-xs text-gray-400 mt-2 pl-4 line-clamp-2 leading-relaxed">
                      {role.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 pl-4">
                    <span className="text-xs text-gray-400">
                      {(role.permissions || []).length} permissions
                    </span>
                    {role.is_system_role && (
                      <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full">
                        system
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Permission matrix ── */}
        <div className="col-span-8">
          {!selectedRole ? (
            <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20">
              <Shield className="w-12 h-12 text-gray-200 mb-3" />
              <p className="font-semibold text-gray-500">Select a role to manage permissions</p>
              <p className="text-sm text-gray-400 mt-1">Click any role from the list on the left</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Matrix header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">
                    {selectedRole.display_name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Check cells to grant access — click Save when done
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={assignMutation.isPending}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  {assignMutation.isPending ? "Saving…" : "Save Permissions"}
                </button>
              </div>

              {permsSaved && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs px-5 py-2 border-b border-emerald-100">
                  <Check className="w-3.5 h-3.5" /> Permissions saved successfully
                </div>
              )}
              {assignMutation.isError && (
                <div className="bg-red-50 text-red-600 text-xs px-5 py-2 border-b border-red-100">
                  Failed to save permissions. Please try again.
                </div>
              )}

              {rolePermsLoading ? (
                <div className="py-12 text-center text-sm text-gray-400 animate-pulse">
                  Loading permissions…
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 w-36">Module</th>
                        {ACTIONS.map(a => (
                          <th key={a} className="text-center px-3 py-3 font-semibold text-gray-500 capitalize min-w-14">
                            {a}
                          </th>
                        ))}
                        <th className="text-center px-3 py-3 font-semibold text-gray-400 w-14">All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.length === 0 ? (
                        <tr>
                          <td colSpan={ACTIONS.length + 2} className="text-center py-10 text-gray-400">
                            No permissions defined yet. Seed permissions via Django admin.
                          </td>
                        </tr>
                      ) : (
                        modules.map((module, mi) => {
                          const modPerms = permsByModule[module];
                          const existingPerms = ACTIONS.map(a => modPerms[a]).filter(Boolean);
                          const allChecked = existingPerms.length > 0 && existingPerms.every(p => checkedPerms[p.id]);
                          const anyChecked = existingPerms.some(p => checkedPerms[p.id]);

                          return (
                            <tr
                              key={module}
                              className={`border-b border-gray-50 hover:bg-indigo-50/20 transition-colors ${
                                mi % 2 === 1 ? "bg-gray-50/40" : ""
                              }`}
                            >
                              <td className="px-4 py-3 font-semibold text-gray-800">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-3.5 h-3.5 text-gray-300" />
                                  {module.charAt(0).toUpperCase() + module.slice(1)}
                                </div>
                              </td>
                              {ACTIONS.map(action => {
                                const perm = modPerms[action];
                                if (!perm) {
                                  return (
                                    <td key={action} className="text-center px-3 py-3">
                                      <span className="text-gray-200 text-base leading-none">—</span>
                                    </td>
                                  );
                                }
                                return (
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
                              {/* Toggle-all column */}
                              <td className="text-center px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = !allChecked && anyChecked;
                                  }}
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
      </div>

      {/* ── Modals ── */}
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
              Delete <strong>{deleteRole.display_name}</strong>? All user assignments for this role
              will also be removed. This cannot be undone.
            </p>
            {deleteMutation.isError && (
              <p className="text-xs text-red-500 mb-3">
                {deleteMutation.error?.response?.data?.detail || "Failed to delete"}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setDeleteRole(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteRole.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
