import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";

export default function CompaniesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["companies", search],
    queryFn: () => api.get(`/companies/?search=${search}`).then((r) => r.data),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => api.post(`/companies/${id}/activate/`),
    onSuccess: () => { qc.invalidateQueries(["companies"]); toast.success("Company activated."); },
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => api.post(`/companies/${id}/suspend/`),
    onSuccess: () => { qc.invalidateQueries(["companies"]); toast.success("Company suspended."); },
  });

  const STATUS_BADGE = {
    active: "badge-active",
    suspended: "bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium",
    trial: "badge-pending",
    inactive: "badge-inactive",
  };

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Manage all tenant companies on the platform"
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Company
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Company", "Email", "Employees", "Plan", "Status", "Joined", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.results?.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{company.name}</td>
                <td className="px-4 py-3 text-gray-500">{company.email}</td>
                <td className="px-4 py-3">{company.employee_count}</td>
                <td className="px-4 py-3">{company.subscription_plan ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={STATUS_BADGE[company.status] ?? "badge-inactive"}>
                    {company.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(company.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => activateMutation.mutate(company.id)}
                      className="text-green-600 hover:text-green-800"
                      title="Activate"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => suspendMutation.mutate(company.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Suspend"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
