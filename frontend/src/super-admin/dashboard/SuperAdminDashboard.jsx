import { useQuery } from "@tanstack/react-query";
import { Building2, Users, CreditCard, Activity } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-dashboard"],
    queryFn: () => api.get("/dashboards/super-admin/").then((r) => r.data),
  });

  return (
    <div>
      <PageHeader title="Platform Overview" subtitle="Super Admin — All Companies" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Companies"
          value={data?.companies?.total}
          icon={Building2}
          color="blue"
          footer={`${data?.companies?.active ?? 0} active`}
        />
        <StatCard
          title="Active Companies"
          value={data?.companies?.active}
          icon={Building2}
          color="green"
        />
        <StatCard
          title="Total Users"
          value={data?.users?.total}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Active Subscriptions"
          value={data?.revenue?.subscriptions}
          icon={CreditCard}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Company Status</h3>
          <div className="space-y-3">
            {[
              { label: "Active", value: data?.companies?.active, color: "bg-green-500" },
              { label: "Trial", value: data?.companies?.trial, color: "bg-yellow-500" },
              { label: "Suspended", value: data?.companies?.suspended, color: "bg-red-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <span className="font-semibold text-gray-900">{value ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Company", href: "/super-admin/companies" },
              { label: "View Subscriptions", href: "/super-admin/subscriptions" },
              { label: "Monitor Platform", href: "/super-admin/monitoring" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="btn-secondary text-sm text-center"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
