import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Search, Building2, Filter } from "lucide-react";
import api from "../../services/api";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
  on_leave: "bg-yellow-100 text-yellow-700",
  terminated: "bg-red-100 text-red-700",
};

export default function GlobalEmployeesPage() {
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list-mini"],
    queryFn: () => api.get("/companies/?ordering=name").then(r => r.data?.results ?? r.data),
  });

  const params = new URLSearchParams({
    ...(search && { search }),
    ...(companyId && { company_id: companyId }),
    ...(statusFilter && { status: statusFilter }),
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["global-employees", search, companyId, statusFilter],
    queryFn: () => api.get(`/employees/?${params}`).then(r => r.data?.results ?? r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">All employees across all organizations</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-blue-700">{employees.length} total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2 w-full text-sm"
          />
        </div>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="input py-2 text-sm min-w-52"
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
          <option value="on_leave">On Leave</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400 animate-pulse">Loading employees…</div>
        ) : employees.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No employees found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Employee", "ID", "Organization", "Department", "Designation", "Type", "Joined", "Status"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {emp.photo ? (
                            <img src={emp.photo} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-700 text-xs font-bold">
                                {emp.first_name?.[0]}{emp.last_name?.[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 whitespace-nowrap">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-xs text-gray-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{emp.employee_id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-gray-300 flex-shrink-0" />
                          <span className="text-xs text-gray-600 whitespace-nowrap">{emp.company_name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{emp.department_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{emp.designation_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                          {emp.employment_type?.replace(/_/g, " ") || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {emp.date_of_joining || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
              Showing {employees.length} employees
              {companyId && ` for ${companies.find(c => String(c.id) === companyId)?.name}`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
