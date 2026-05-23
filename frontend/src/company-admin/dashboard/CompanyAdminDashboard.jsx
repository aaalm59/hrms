import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Calendar, AlertCircle } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";

export default function CompanyAdminDashboard() {
  const user = useSelector(selectCurrentUser);

  const { data } = useQuery({
    queryKey: ["company-admin-dashboard"],
    queryFn: () => api.get("/dashboards/company-admin/").then((r) => r.data),
  });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.full_name || "Admin"}`}
        subtitle={`${user?.company_name} — Company Dashboard`}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Employees" value={data?.employees?.total} icon={Users} color="blue" />
        <StatCard title="Present Today" value={data?.attendance_today?.present} icon={Clock} color="green" />
        <StatCard title="On Leave" value={data?.attendance_today?.on_leave} icon={Calendar} color="yellow" />
        <StatCard title="Pending Leaves" value={data?.pending_leaves} icon={AlertCircle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Today's Attendance</h3>
          {[
            { label: "Present", value: data?.attendance_today?.present, color: "text-green-600" },
            { label: "Absent", value: data?.attendance_today?.absent, color: "text-red-500" },
            { label: "WFH", value: data?.attendance_today?.wfh, color: "text-blue-500" },
            { label: "Half Day", value: data?.attendance_today?.half_day, color: "text-yellow-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-600">{label}</span>
              <span className={`font-semibold ${color}`}>{value ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
