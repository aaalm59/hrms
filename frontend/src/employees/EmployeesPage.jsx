import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { Link } from "react-router-dom";

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, page],
    queryFn: () => api.get(`/employees/?search=${search}&page=${page}`).then((r) => r.data),
    keepPreviousData: true,
  });

  const STATUS_COLORS = {
    active: "badge-active",
    inactive: "badge-inactive",
    on_notice: "badge-pending",
    terminated: "bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium",
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${data?.count ?? 0} employees`}
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, ID, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter
        </button>
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
              <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-semibold text-primary-700">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-gray-500">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{emp.employee_id}</td>
                <td className="px-4 py-3 text-gray-600">{emp.department_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{emp.designation_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{emp.employment_type?.replace("_", " ")}</td>
                <td className="px-4 py-3 text-gray-500">{emp.date_of_joining}</td>
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.previous} className="btn-secondary text-xs px-3 py-1 disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!data.next} className="btn-secondary text-xs px-3 py-1 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
