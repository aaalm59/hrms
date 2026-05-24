import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings, Building2, Calendar, Clock, Users, Shield,
  Plus, X, Edit, Trash2, Save, Globe, MapPin
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";

// ─── Leave Type Modal ──────────────────────────────────────────────────────────
function LeaveTypeModal({ existing, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: existing ?? { is_paid: true, days_per_year: 12, is_carry_forwardable: false, max_carry_forward_days: 0 },
  });
  const mutation = useMutation({
    mutationFn: (d) => existing ? api.patch(`/leaves/types/${existing.id}/`, d) : api.post("/leaves/types/", d),
    onSuccess: () => { toast.success(existing ? "Updated" : "Created"); qc.invalidateQueries(["leave-types-admin"]); qc.invalidateQueries(["leave-types"]); onClose(); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between"><h3 className="font-bold">{existing ? "Edit" : "Add"} Leave Type</h3><button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div><label className="label">Name *</label><input {...register("name", { required: true })} className="input" placeholder="e.g. Annual Leave" />{errors.name && <p className="err">Required</p>}</div>
          <div><label className="label">Code *</label><input {...register("code", { required: true })} className="input" placeholder="e.g. AL" />{errors.code && <p className="err">Required</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Days/Year</label><input type="number" step="0.5" min={0} {...register("days_per_year")} className="input" /></div>
            <div><label className="label">Max Carry Fwd</label><input type="number" min={0} {...register("max_carry_forward_days")} className="input" /></div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" {...register("is_paid")} className="w-4 h-4 accent-primary-600" /> Paid Leave</label>
            <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" {...register("is_carry_forwardable")} className="w-4 h-4 accent-primary-600" /> Carry Forward</label>
          </div>
          <div><label className="label">Gender Specific</label>
            <select {...register("gender_specific")} className="input">
              <option value="">All Genders</option><option value="male">Male Only</option><option value="female">Female Only</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? "Saving..." : "Save"}</button></div>
        </form>
      </div>
    </div>
  );
}

// ─── Shift Modal ───────────────────────────────────────────────────────────────
function ShiftModal({ existing, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: existing ?? { start_time: "09:00", end_time: "18:00", grace_minutes: 15, break_minutes: 60 },
  });
  const mutation = useMutation({
    mutationFn: (d) => existing ? api.patch(`/attendance/shifts/${existing.id}/`, d) : api.post("/attendance/shifts/", d),
    onSuccess: () => { toast.success("Shift saved"); qc.invalidateQueries(["shifts"]); onClose(); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between"><h3 className="font-bold">{existing ? "Edit" : "Add"} Shift</h3><button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div><label className="label">Shift Name *</label><input {...register("name", { required: true })} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Time</label><input type="time" {...register("start_time")} className="input" /></div>
            <div><label className="label">End Time</label><input type="time" {...register("end_time")} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Grace (mins)</label><input type="number" {...register("grace_minutes")} className="input" min={0} /></div>
            <div><label className="label">Break (mins)</label><input type="number" {...register("break_minutes")} className="input" min={0} /></div>
          </div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? "Saving..." : "Save"}</button></div>
        </form>
      </div>
    </div>
  );
}

// ─── Department Modal ──────────────────────────────────────────────────────────
function DepartmentModal({ existing, departments, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: existing ?? {} });
  const mutation = useMutation({
    mutationFn: (d) => existing ? api.patch(`/employees/departments/${existing.id}/`, d) : api.post("/employees/departments/", d),
    onSuccess: () => { toast.success("Department saved"); qc.invalidateQueries(["departments-settings"]); onClose(); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b flex items-center justify-between"><h3 className="font-bold">{existing ? "Edit" : "Add"} Department</h3><button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div><label className="label">Name *</label><input {...register("name", { required: true })} className="input" placeholder="e.g. Engineering" /></div>
          <div><label className="label">Code</label><input {...register("code")} className="input" placeholder="e.g. ENG" /></div>
          <div><label className="label">Parent Department</label>
            <select {...register("parent")} className="input">
              <option value="">None (Top Level)</option>
              {departments?.filter((d) => d.id !== existing?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? "Saving..." : "Save"}</button></div>
        </form>
      </div>
    </div>
  );
}

// ─── Designation Modal ─────────────────────────────────────────────────────────
function DesignationModal({ existing, departments, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: existing ?? { level: 1 } });
  const mutation = useMutation({
    mutationFn: (d) => existing ? api.patch(`/employees/designations/${existing.id}/`, d) : api.post("/employees/designations/", d),
    onSuccess: () => { toast.success("Designation saved"); qc.invalidateQueries(["designations-settings"]); onClose(); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b flex items-center justify-between"><h3 className="font-bold">{existing ? "Edit" : "Add"} Designation</h3><button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div><label className="label">Name *</label><input {...register("name", { required: true })} className="input" placeholder="e.g. Senior Engineer" /></div>
          <div><label className="label">Department *</label>
            <select {...register("department", { required: true })} className="input">
              <option value="">Select department</option>
              {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Level</label><input type="number" {...register("level")} className="input" min={1} /></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? "Saving..." : "Save"}</button></div>
        </form>
      </div>
    </div>
  );
}

// ─── Holiday Modal ─────────────────────────────────────────────────────────────
function HolidayModal({ existing, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: existing ?? { is_optional: false, date: format(new Date(), "yyyy-MM-dd") },
  });
  const mutation = useMutation({
    mutationFn: (d) => existing ? api.patch(`/companies/holidays/${existing.id}/`, d) : api.post("/companies/holidays/", d),
    onSuccess: () => { toast.success("Holiday saved"); qc.invalidateQueries(["holidays"]); onClose(); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b flex items-center justify-between"><h3 className="font-bold">{existing ? "Edit" : "Add"} Holiday</h3><button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div><label className="label">Holiday Name *</label><input {...register("name", { required: true })} className="input" placeholder="e.g. Diwali" /></div>
          <div><label className="label">Date *</label><input type="date" {...register("date", { required: true })} className="input" /></div>
          <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" {...register("is_optional")} className="w-4 h-4 accent-primary-600" /> Optional Holiday</label>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? "Saving..." : "Save"}</button></div>
        </form>
      </div>
    </div>
  );
}

// ─── Company Settings Form ─────────────────────────────────────────────────────
function CompanySettingsTab() {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.get("/companies/settings/").then((r) => r.data),
    onSuccess: (d) => reset(d),
  });

  useEffect(() => { if (settings) reset(settings); }, [settings]);

  const mutation = useMutation({
    mutationFn: (d) => api.patch("/companies/settings/", d),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries(["company-settings"]); },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-900 mb-5">Company Settings</h2>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="label">Work Start Time</label><input type="time" {...register("work_start_time")} className="input" /></div>
          <div><label className="label">Work End Time</label><input type="time" {...register("work_end_time")} className="input" /></div>
          <div><label className="label">Late Mark After (minutes)</label><input type="number" {...register("late_mark_after_minutes")} className="input" min={0} /></div>
          <div><label className="label">Half Day Hours</label><input type="number" step="0.5" {...register("half_day_hours")} className="input" min={1} /></div>
          <div><label className="label">Payroll Processing Day</label><input type="number" {...register("payroll_processing_day")} className="input" min={1} max={31} /></div>
          <div><label className="label">Fiscal Year Start Month</label>
            <select {...register("fiscal_year_start_month")} className="input">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), "MMMM")}</option>)}
            </select>
          </div>
          <div><label className="label">Probation Period (days)</label><input type="number" {...register("probation_period_days")} className="input" min={0} /></div>
          <div><label className="label">Notice Period (days)</label><input type="number" {...register("notice_period_days")} className="input" min={0} /></div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />{mutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const user = useSelector(selectCurrentUser);
  const qc = useQueryClient();
  const [tab, setTab] = useState("leave-types");
  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const isHR = user?.roles?.some((r) => ["hr_admin", "company_admin"].includes(r));

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
    queryKey: ["departments-settings"],
    queryFn: () => api.get("/employees/departments/?page_size=100").then((r) => r.data?.results ?? r.data),
    enabled: tab === "departments",
  });

  const { data: designations } = useQuery({
    queryKey: ["designations-settings"],
    queryFn: () => api.get("/employees/designations/?page_size=100").then((r) => r.data?.results ?? r.data),
    enabled: tab === "departments",
  });

  const { data: holidays } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => api.get("/companies/holidays/?ordering=date").then((r) => r.data?.results ?? r.data),
    enabled: tab === "holidays",
  });

  const deleteLeaveType = useMutation({
    mutationFn: (id) => api.delete(`/leaves/types/${id}/`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries(["leave-types-admin"]); },
  });

  const deleteHoliday = useMutation({
    mutationFn: (id) => api.delete(`/companies/holidays/${id}/`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries(["holidays"]); },
  });

  const TABS = [
    { id: "leave-types", label: "Leave Types", icon: Calendar },
    { id: "shifts", label: "Work Shifts", icon: Clock },
    { id: "departments", label: "Departments", icon: Users },
    { id: "holidays", label: "Holidays", icon: Globe },
    { id: "company", label: "Company Settings", icon: Building2 },
    { id: "roles", label: "Roles", icon: Shield },
  ];

  const openModal = (type, item = null) => { setModal(type); setEditItem(item); };
  const closeModal = () => { setModal(null); setEditItem(null); };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure company-wide settings and policies" />

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0">
          <div className="card p-3 space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100"}`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Leave Types */}
          {tab === "leave-types" && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Leave Types</h2>
                <button onClick={() => openModal("leave")} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{["Name", "Code", "Days/Yr", "Paid", "Carry Fwd", "Gender", ""].map((h) => <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!leaveTypes?.length ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">No leave types</td></tr>
                  ) : leaveTypes.map((lt) => (
                    <tr key={lt.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{lt.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{lt.code}</td>
                      <td className="px-4 py-3 text-gray-600">{lt.days_per_year}</td>
                      <td className="px-4 py-3">{lt.is_paid ? <span className="badge-active">Yes</span> : <span className="badge-inactive">No</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{lt.is_carry_forwardable ? `${lt.max_carry_forward_days ?? 0}d` : "No"}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{lt.gender_specific || "All"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openModal("leave", lt)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteLeaveType.mutate(lt.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Shifts */}
          {tab === "shifts" && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Work Shifts</h2>
                <button onClick={() => openModal("shift")} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Shift</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{["Name", "Start", "End", "Grace", "Break", ""].map((h) => <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!shifts?.length ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No shifts configured</td></tr>
                  ) : shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.start_time?.slice(0, 5)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.end_time?.slice(0, 5)}</td>
                      <td className="px-4 py-3 text-gray-600">{s.grace_minutes} min</td>
                      <td className="px-4 py-3 text-gray-600">{s.break_minutes} min</td>
                      <td className="px-4 py-3"><button onClick={() => openModal("shift", s)} className="text-xs text-primary-600 hover:underline">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Departments & Designations */}
          {tab === "departments" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Departments</h2>
                  <button onClick={() => openModal("dept")} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {!departments?.length ? (
                    <p className="text-center py-8 text-gray-400 text-sm">No departments</p>
                  ) : departments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                        {d.code && <p className="text-xs text-gray-400 font-mono">{d.code}</p>}
                        {d.parent_name && <p className="text-xs text-gray-400">↳ {d.parent_name}</p>}
                      </div>
                      <button onClick={() => openModal("dept", d)} className="text-xs text-primary-600 hover:underline">Edit</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Designations</h2>
                  <button onClick={() => openModal("desig")} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {!designations?.length ? (
                    <p className="text-center py-8 text-gray-400 text-sm">No designations</p>
                  ) : designations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                        <p className="text-xs text-gray-400">{d.department_name} · Level {d.level ?? 1}</p>
                      </div>
                      <button onClick={() => openModal("desig", d)} className="text-xs text-primary-600 hover:underline">Edit</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Holidays */}
          {tab === "holidays" && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Company Holidays</h2>
                <button onClick={() => openModal("holiday")} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Holiday</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{["Holiday", "Date", "Day", "Type", ""].map((h) => <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!holidays?.length ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">No holidays added</td></tr>
                  ) : holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{h.name}</td>
                      <td className="px-4 py-3 text-gray-600">{h.date ? format(parseISO(h.date), "dd MMM yyyy") : "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{h.date ? format(parseISO(h.date), "EEEE") : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.is_optional ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {h.is_optional ? "Optional" : "Mandatory"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openModal("holiday", h)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteHoliday.mutate(h.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Company Settings */}
          {tab === "company" && <CompanySettingsTab />}

          {/* Roles Reference */}
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

      {modal === "leave" && <LeaveTypeModal existing={editItem} onClose={closeModal} />}
      {modal === "shift" && <ShiftModal existing={editItem} onClose={closeModal} />}
      {modal === "dept" && <DepartmentModal existing={editItem} departments={departments} onClose={closeModal} />}
      {modal === "desig" && <DesignationModal existing={editItem} departments={departments} onClose={closeModal} />}
      {modal === "holiday" && <HolidayModal existing={editItem} onClose={closeModal} />}
    </div>
  );
}
