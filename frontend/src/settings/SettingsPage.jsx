import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings, Building2, Calendar, Clock, Users, Shield,
  Save, Plus, X, Edit, ChevronRight
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";

function LeaveTypeModal({ existing, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: existing ?? { is_paid: true, days_per_year: 12, is_carry_forwardable: false },
  });

  const mutation = useMutation({
    mutationFn: (d) => existing ? api.patch(`/leaves/types/${existing.id}/`, d) : api.post("/leaves/types/", d),
    onSuccess: () => {
      toast.success(existing ? "Leave type updated" : "Leave type created");
      qc.invalidateQueries(["leave-types-admin"]);
      qc.invalidateQueries(["leave-types"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{existing ? "Edit" : "Add"} Leave Type</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input {...register("name", { required: true })} className="input" placeholder="e.g. Annual Leave" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
            <input {...register("code", { required: true })} className="input" placeholder="e.g. AL" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days/Year</label>
              <input type="number" {...register("days_per_year")} className="input" min={0} step="0.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Carry Fwd Days</label>
              <input type="number" {...register("max_carry_forward_days")} className="input" min={0} defaultValue={0} />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("is_paid")} className="w-4 h-4 text-primary-600 rounded" />
              <span className="text-sm text-gray-700">Paid Leave</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("is_carry_forwardable")} className="w-4 h-4 text-primary-600 rounded" />
              <span className="text-sm text-gray-700">Allow Carry Forward</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender Specific</label>
            <select {...register("gender_specific")} className="input">
              <option value="">All Genders</option>
              <option value="male">Male Only</option>
              <option value="female">Female Only</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShiftModal({ existing, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: existing ?? { start_time: "09:00", end_time: "18:00", grace_minutes: 15, break_minutes: 60 },
  });

  const mutation = useMutation({
    mutationFn: (d) => existing ? api.patch(`/attendance/shifts/${existing.id}/`, d) : api.post("/attendance/shifts/", d),
    onSuccess: () => {
      toast.success("Shift saved");
      qc.invalidateQueries(["shifts"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{existing ? "Edit" : "Add"} Shift</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name *</label>
            <input {...register("name", { required: true })} className="input" placeholder="e.g. Morning Shift" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="time" {...register("start_time")} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="time" {...register("end_time")} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (mins)</label>
              <input type="number" {...register("grace_minutes")} className="input" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Break Duration (mins)</label>
              <input type="number" {...register("break_minutes")} className="input" min={0} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DepartmentModal({ existing, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: existing ?? {},
  });

  const { data: deptList } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/employees/departments/?page_size=100").then((r) => r.data?.results ?? r.data),
  });

  const mutation = useMutation({
    mutationFn: (d) => existing ? api.patch(`/employees/departments/${existing.id}/`, d) : api.post("/employees/departments/", d),
    onSuccess: () => {
      toast.success("Department saved");
      qc.invalidateQueries(["departments"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{existing ? "Edit" : "Add"} Department</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input {...register("name", { required: true })} className="input" placeholder="e.g. Engineering" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Department</label>
            <select {...register("parent")} className="input">
              <option value="">None (Top Level)</option>
              {deptList?.filter((d) => d.id !== existing?.id).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const user = useSelector(selectCurrentUser);
  const [tab, setTab] = useState("leave-types");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types-admin"],
    queryFn: () => api.get("/leaves/types/").then((r) => r.data?.results ?? r.data),
    enabled: tab === "leave-types",
  });

  const { data: shifts } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => api.get("/attendance/shifts/").then((r) => r.data?.results ?? r.data),
    enabled: tab === "shifts",
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/employees/departments/").then((r) => r.data?.results ?? r.data),
    enabled: tab === "departments",
  });

  const { data: designations } = useQuery({
    queryKey: ["designations-admin"],
    queryFn: () => api.get("/employees/designations/").then((r) => r.data?.results ?? r.data),
    enabled: tab === "departments",
  });

  const tabs = [
    { id: "leave-types", label: "Leave Types", icon: Calendar },
    { id: "shifts", label: "Work Shifts", icon: Clock },
    { id: "departments", label: "Departments", icon: Users },
    { id: "roles", label: "Roles & Permissions", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure company settings and policies" />

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-56 flex-shrink-0">
          <div className="card p-3 space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === id ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Leave Types */}
          {tab === "leave-types" && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Leave Types</h2>
                <button onClick={() => { setEditItem(null); setShowLeaveModal(true); }} className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Leave Type
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Name", "Code", "Days/Year", "Paid", "Carry Fwd", "Gender", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!leaveTypes?.length ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">No leave types configured</td></tr>
                  ) : (
                    leaveTypes.map((lt) => (
                      <tr key={lt.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{lt.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{lt.code}</td>
                        <td className="px-4 py-3 text-gray-600">{lt.days_per_year}</td>
                        <td className="px-4 py-3">
                          {lt.is_paid ? <span className="badge-active">Yes</span> : <span className="badge-inactive">No</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {lt.is_carry_forwardable ? `${lt.max_carry_forward_days ?? 0}d` : "No"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{lt.gender_specific || "All"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setEditItem(lt); setShowLeaveModal(true); }} className="text-xs text-primary-600 hover:underline">Edit</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Shifts */}
          {tab === "shifts" && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Work Shifts</h2>
                <button onClick={() => { setEditItem(null); setShowShiftModal(true); }} className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Shift
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Name", "Start", "End", "Grace (mins)", "Break (mins)", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!shifts?.length ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No shifts configured</td></tr>
                  ) : (
                    shifts.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.start_time?.slice(0, 5)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.end_time?.slice(0, 5)}</td>
                        <td className="px-4 py-3 text-gray-600">{s.grace_minutes}</td>
                        <td className="px-4 py-3 text-gray-600">{s.break_minutes}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setEditItem(s); setShowShiftModal(true); }} className="text-xs text-primary-600 hover:underline">Edit</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Departments */}
          {tab === "departments" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Departments */}
              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Departments</h2>
                  <button onClick={() => { setEditItem(null); setShowDeptModal(true); }} className="btn-primary text-sm flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {!departments?.length ? (
                    <p className="text-center py-8 text-gray-400 text-sm">No departments</p>
                  ) : (
                    departments.map((d) => (
                      <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                          {d.parent_name && <p className="text-xs text-gray-400">under {d.parent_name}</p>}
                        </div>
                        <button onClick={() => { setEditItem(d); setShowDeptModal(true); }} className="text-xs text-primary-600">Edit</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Designations */}
              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Designations</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {!designations?.length ? (
                    <p className="text-center py-8 text-gray-400 text-sm">No designations</p>
                  ) : (
                    designations.map((d) => (
                      <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                          {d.department_name && <p className="text-xs text-gray-400">{d.department_name}</p>}
                        </div>
                        <span className="text-xs text-gray-400">Level {d.level ?? "—"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Roles */}
          {tab === "roles" && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">System Roles</h2>
              <div className="space-y-2">
                {[
                  { role: "super_admin", desc: "Full platform access — manages all companies" },
                  { role: "company_admin", desc: "Full company access — manages all company features" },
                  { role: "hr_admin", desc: "HR operations — employees, attendance, leaves, payroll" },
                  { role: "payroll_manager", desc: "Manages payroll processing and salary structures" },
                  { role: "recruiter", desc: "Manages job posts, candidates, and interviews" },
                  { role: "manager", desc: "Team management — views team attendance, approves leaves" },
                  { role: "team_lead", desc: "Team lead — limited team management" },
                  { role: "employee", desc: "Standard employee — self-service only" },
                ].map(({ role, desc }) => (
                  <div key={role} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 font-mono text-sm">{role}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showLeaveModal && <LeaveTypeModal existing={editItem} onClose={() => { setShowLeaveModal(false); setEditItem(null); }} />}
      {showShiftModal && <ShiftModal existing={editItem} onClose={() => { setShowShiftModal(false); setEditItem(null); }} />}
      {showDeptModal && <DepartmentModal existing={editItem} onClose={() => { setShowDeptModal(false); setEditItem(null); }} />}
    </div>
  );
}
