import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, X, User } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

const STATUS_COLORS = {
  active: "badge-active",
  inactive: "badge-inactive",
  on_notice: "badge-pending",
  terminated: "bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium",
};

function AddEmployeeModal({ departments, designations, teams, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { password: "Welcome@123", role_name: "employee" },
  });

  const cleanEmployeePayload = (data) =>
    Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== "")
    );

  const formatApiError = (data) => {
    if (!data) return "Failed to add employee";
    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.map(formatApiError).join(", ");
    if (typeof data === "object") {
      return Object.entries(data)
        .map(([field, value]) => `${field}: ${formatApiError(value)}`)
        .join(", ");
    }
    return String(data);
  };

  const mutation = useMutation({
    mutationFn: (d) => api.post("/employees/", cleanEmployeePayload(d)),
    onSuccess: () => {
      toast.success("Employee added successfully");
      qc.invalidateQueries(["employees"]);
      onClose();
    },
    onError: (err) => {
      toast.error(formatApiError(err.response?.data));
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add New Employee</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input {...register("first_name", { required: true })} className="input" placeholder="John" />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input {...register("last_name", { required: true })} className="input" placeholder="Doe" />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" {...register("email", { required: true })} className="input" placeholder="john@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input {...register("phone")} className="input" placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select {...register("department")} className="input">
                <option value="">Select department...</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <select {...register("designation")} className="input">
                <option value="">Select designation...</option>
                {designations?.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
              <select {...register("employment_type")} className="input">
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining *</label>
              <input type="date" {...register("date_of_joining", { required: true })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select {...register("gender")} className="input">
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" {...register("date_of_birth")} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select {...register("team")} className="input">
                <option value="">No Team</option>
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select {...register("role_name", { required: true })} className="input">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="team_lead">Team Lead</option>
                <option value="hr_admin">HR Admin</option>
                <option value="payroll_manager">Payroll Manager</option>
                <option value="finance_manager">Finance Manager</option>
                <option value="recruiter">Recruiter</option>
                <option value="auditor">Auditor</option>
                <option value="company_admin">Company Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login Password *</label>
              <input type="text" {...register("password", { required: true, minLength: 6 })} className="input" placeholder="Welcome@123" />
              {errors.password && <p className="text-red-500 text-xs mt-1">Min 6 characters</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-6 mt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Adding..." : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, page, statusFilter, deptFilter],
    queryFn: () =>
      api.get(`/employees/?search=${search}&page=${page}${statusFilter ? `&status=${statusFilter}` : ""}${deptFilter ? `&department=${deptFilter}` : ""}`).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/employees/departments/?page_size=100").then((r) => r.data?.results ?? r.data),
  });

  const { data: designations } = useQuery({
    queryKey: ["designations"],
    queryFn: () => api.get("/employees/designations/?page_size=100").then((r) => r.data?.results ?? r.data),
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get("/employees/teams/?page_size=100").then((r) => r.data?.results ?? r.data),
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${data?.count ?? 0} employees`}
        actions={
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, ID, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input py-2 w-36"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_notice">On Notice</option>
          <option value="terminated">Terminated</option>
        </select>
        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
          className="input py-2 w-44"
        >
          <option value="">All Departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Employee", "ID", "Department", "Designation", "Type", "Joined", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.results?.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No employees found.</td></tr>
            ) : data?.results?.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/employees/${emp.id}`} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-gray-500">{emp.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{emp.employee_id}</td>
                <td className="px-4 py-3 text-gray-600">{emp.department_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{emp.designation_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 capitalize text-xs">{emp.employment_type?.replace("_", " ")}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{emp.date_of_joining}</td>
                <td className="px-4 py-3">
                  <span className={STATUS_COLORS[emp.status] ?? "badge-inactive"}>{emp.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {data.current_page} of {data.total_pages} ({data.count} total)
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous} className="btn-secondary text-xs px-3 py-1 disabled:opacity-50">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={!data.next} className="btn-secondary text-xs px-3 py-1 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddEmployeeModal
          departments={departments}
          designations={designations}
          teams={teams}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
