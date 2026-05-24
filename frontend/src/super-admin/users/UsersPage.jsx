import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Shield, Building2, CheckCircle, XCircle } from "lucide-react";
import api from "@/services/api";
import { format, parseISO } from "date-fns";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-users", search, statusFilter],
    queryFn: () =>
      api.get(`/auth/users/?search=${search}${statusFilter ? `&status=${statusFilter}` : ""}&ordering=-date_joined`).then((r) => r.data).catch(() => ({ results: [], count: 0 })),
  });

  const users = data?.results ?? [];

  const STATUS_BADGE = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-gray-100 text-gray-500",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">{data?.count ?? "—"} users across all organizations</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Users", value: data?.count ?? "—", color: "bg-blue-50 text-blue-600", icon: Users },
          { label: "Active", value: users.filter((u) => u.status === "active").length, color: "bg-emerald-50 text-emerald-600", icon: CheckCircle },
          { label: "Suspended", value: users.filter((u) => u.status === "suspended").length, color: "bg-red-50 text-red-600", icon: XCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 py-2 text-sm"
              placeholder="Search users by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input py-2 text-sm w-32"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["User", "Email", "Company", "Roles", "Status", "Joined"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-14 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No users found</p>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-bold text-xs">
                          {(u.first_name?.[0] || u.email?.[0] || "U").toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : "—"}
                        </p>
                        {u.is_super_admin && (
                          <span className="text-xs text-red-600 font-medium">Super Admin</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.company_name ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {u.company_name}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Platform</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles?.slice(0, 2).map((r) => (
                        <span key={r} className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded font-medium">{r}</span>
                      ))}
                      {(u.roles?.length ?? 0) > 2 && (
                        <span className="text-xs text-gray-400">+{u.roles.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[u.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {u.date_joined ? format(parseISO(u.date_joined), "dd MMM yyyy") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
