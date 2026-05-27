import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Users, Edit2, Trash2, UserPlus, X,
  UserCheck, UserX, Clock, Shield,
} from "lucide-react";
import { useForm } from "react-hook-form";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import toast from "react-hot-toast";

const ATTENDANCE_BADGE = {
  present:  "bg-green-100 text-green-700",
  absent:   "bg-red-100 text-red-700",
  leave:    "bg-yellow-100 text-yellow-700",
  wfh:      "bg-blue-100 text-blue-700",
  half_day: "bg-orange-100 text-orange-700",
  holiday:  "bg-purple-100 text-purple-700",
  weekend:  "bg-gray-100 text-gray-500",
};

// ─── Team Form Modal (Create / Edit) ────────────────────────────────────────

function TeamFormModal({ team, employees, departments, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: team
      ? {
          name: team.name,
          description: team.description || "",
          lead: team.lead || "",
          reporting_manager: team.reporting_manager || "",
          department: team.department || "",
        }
      : {},
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      team
        ? api.patch(`/employees/teams/${team.id}/`, data)
        : api.post("/employees/teams/", data),
    onSuccess: () => {
      toast.success(team ? "Team updated" : "Team created");
      qc.invalidateQueries(["teams"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to save team"),
  });

  const submit = (data) => {
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ""));
    mutation.mutate(clean);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {team ? "Edit Team" : "Create Team"}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
            <input
              {...register("name", { required: true })}
              className="input"
              placeholder="e.g. Frontend Team"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register("description")}
              rows={3}
              className="input resize-none"
              placeholder="What does this team do?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Lead</label>
            <select {...register("lead")} className="input">
              <option value="">Select team lead...</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                  {e.designation_name ? ` — ${e.designation_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Manager</label>
            <select {...register("reporting_manager")} className="input">
              <option value="">Use team lead / employee manager</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                  {e.designation_name ? ` — ${e.designation_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select {...register("department")} className="input">
              <option value="">No department mapping</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving..." : team ? "Save Changes" : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Manage Members Modal ────────────────────────────────────────────────────

function ManageMembersModal({ team, allEmployees, onClose }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["team-members", team.id],
    queryFn: () => api.get(`/employees/teams/${team.id}/members/`).then((r) => r.data),
  });

  const currentMemberIds = useMemo(
    () => new Set(membersData?.members?.map((m) => m.id) ?? []),
    [membersData]
  );

  const available = useMemo(
    () =>
      (allEmployees ?? []).filter(
        (e) =>
          !currentMemberIds.has(e.id) &&
          `${e.first_name} ${e.last_name} ${e.email}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [allEmployees, currentMemberIds, search]
  );

  const assignMutation = useMutation({
    mutationFn: (ids) =>
      api.post(`/employees/teams/${team.id}/assign_members/`, { employee_ids: ids }),
    onSuccess: () => {
      toast.success("Members assigned");
      setSelectedIds([]);
      qc.invalidateQueries(["team-members", team.id]);
      qc.invalidateQueries(["teams"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  const removeMutation = useMutation({
    mutationFn: (empId) =>
      api.post(`/employees/teams/${team.id}/remove_member/`, { employee_id: empId }),
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries(["team-members", team.id]);
      qc.invalidateQueries(["teams"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Members</h2>
            <p className="text-sm text-gray-500 mt-0.5">{team.name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Current members */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-600" />
              Current Members ({membersData?.members?.length ?? 0})
            </h3>

            {membersLoading ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
            ) : !membersData?.members?.length ? (
              <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-xl">
                No members yet
              </p>
            ) : (
              <div className="space-y-2">
                {membersData.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                        {m.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500">
                          {m.designation || m.employee_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ATTENDANCE_BADGE[m.attendance_status] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {m.attendance_status}
                      </span>
                      {m.check_in && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {m.check_in}
                        </span>
                      )}
                      <button
                        onClick={() => removeMutation.mutate(m.id)}
                        disabled={removeMutation.isPending}
                        className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove from team"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add members */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary-600" />
              Add Members
            </h3>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {available.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-xl">
                {search ? "No employees match" : "All employees are already in this team"}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {available.map((e) => (
                  <label
                    key={e.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                      selectedIds.includes(e.id)
                        ? "bg-primary-50 border border-primary-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(e.id)}
                      onChange={() => toggleSelect(e.id)}
                      className="rounded border-gray-300 text-primary-600"
                    />
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {e.first_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {e.first_name} {e.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{e.email}</p>
                    </div>
                    {e.department_name && (
                      <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                        {e.department_name}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {selectedIds.length > 0 && (
              <button
                onClick={() => assignMutation.mutate(selectedIds)}
                disabled={assignMutation.isPending}
                className="btn-primary w-full mt-3"
              >
                {assignMutation.isPending
                  ? "Assigning..."
                  : `Assign ${selectedIds.length} Employee${selectedIds.length > 1 ? "s" : ""} to Team`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────

function DeleteConfirmModal({ team, onClose }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.delete(`/employees/teams/${team.id}/`),
    onSuccess: () => {
      toast.success("Team deleted");
      qc.invalidateQueries(["teams"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Team</h2>
        <p className="text-sm text-gray-600 mb-6">
          Delete <span className="font-semibold">{team.name}</span>? Team members will be
          unassigned but not deleted.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => del.mutate()}
            disabled={del.isPending}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
          >
            {del.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Team Card ───────────────────────────────────────────────────────────────

function TeamCard({ team, onEdit, onDelete, onManage }) {
  return (
    <div className="card hover:shadow-md transition-shadow flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{team.name}</h3>
            {team.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{team.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
          <button
            onClick={() => onManage(team)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="Manage Members"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(team)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit Team"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(team)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete Team"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reporting Manager */}
      <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
        <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Reporting Manager</p>
          <p className="text-sm font-medium text-gray-800 truncate">
            {team.reporting_manager_name || team.lead_name || "Not Assigned"}
          </p>
          {team.department_name && <p className="text-xs text-gray-400 truncate">{team.department_name}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2.5 bg-blue-50 rounded-xl">
          <p className="text-2xl font-bold text-blue-700">{team.member_count}</p>
          <p className="text-xs text-blue-500 font-medium mt-0.5">Total</p>
        </div>
        <div className="text-center p-2.5 bg-green-50 rounded-xl">
          <p className="text-2xl font-bold text-green-700">{team.today_present ?? 0}</p>
          <p className="text-xs text-green-500 font-medium mt-0.5">Present</p>
        </div>
        <div className="text-center p-2.5 bg-red-50 rounded-xl">
          <p className="text-2xl font-bold text-red-700">{team.today_absent ?? 0}</p>
          <p className="text-xs text-red-500 font-medium mt-0.5">Absent</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [manageTeam, setManageTeam] = useState(null);
  const [deleteTeam, setDeleteTeam] = useState(null);

  const anyModalOpen = !!(showCreate || editTeam || manageTeam);

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () =>
      api.get("/employees/teams/?page_size=100").then((r) => r.data?.results ?? r.data),
    refetchInterval: 60000,
  });

  const { data: employees } = useQuery({
    queryKey: ["all-employees-flat"],
    queryFn: () =>
      api.get("/employees/?page_size=500").then((r) => r.data?.results ?? r.data),
    enabled: anyModalOpen,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments-flat"],
    queryFn: () =>
      api.get("/employees/departments/?page_size=100").then((r) => r.data?.results ?? r.data),
    enabled: anyModalOpen,
  });

  const filtered = useMemo(
    () =>
      (teams ?? []).filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.lead_name ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [teams, search]
  );

  const closeAll = () => {
    setShowCreate(false);
    setEditTeam(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        subtitle={`${teams?.length ?? 0} teams`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Team
          </button>
        }
      />

      {/* Search bar + summary stats */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by team name or manager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {teams?.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-green-500" />
              {teams.reduce((s, t) => s + (t.today_present ?? 0), 0)} present today
            </span>
            <span className="flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-red-400" />
              {teams.reduce((s, t) => s + (t.today_absent ?? 0), 0)} absent today
            </span>
          </div>
        )}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading teams...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No teams found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? "Try a different search term" : "Create your first team to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onEdit={setEditTeam}
              onDelete={setDeleteTeam}
              onManage={setManageTeam}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(showCreate || editTeam) && (
        <TeamFormModal
          team={editTeam}
          employees={employees}
          departments={departments}
          onClose={closeAll}
        />
      )}
      {manageTeam && (
        <ManageMembersModal
          team={manageTeam}
          allEmployees={employees}
          onClose={() => setManageTeam(null)}
        />
      )}
      {deleteTeam && (
        <DeleteConfirmModal
          team={deleteTeam}
          onClose={() => setDeleteTeam(null)}
        />
      )}
    </div>
  );
}
