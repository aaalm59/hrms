import { useQuery } from "@tanstack/react-query";
import { Clock, Calendar, DollarSign, Bell } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function EmployeeDashboard() {
  const user = useSelector(selectCurrentUser);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => api.get("/dashboards/employee/").then((r) => r.data),
  });

  const checkIn = useMutation({
    mutationFn: () => api.post("/attendance/check-in/"),
    onSuccess: (res) => { toast.success(`Checked in at ${new Date(res.data.time).toLocaleTimeString()}`); qc.invalidateQueries(["employee-dashboard"]); },
    onError: (err) => toast.error(err.response?.data?.detail || "Check-in failed"),
  });

  const checkOut = useMutation({
    mutationFn: () => api.post("/attendance/check-out/"),
    onSuccess: (res) => { toast.success(`Checked out. Hours: ${res.data.working_hours}`); qc.invalidateQueries(["employee-dashboard"]); },
    onError: (err) => toast.error(err.response?.data?.detail || "Check-out failed"),
  });

  return (
    <div>
      <PageHeader title={`Good morning, ${user?.full_name?.split(" ")[0] || "there"}!`} subtitle="Your personal dashboard" />

      {/* Check In/Out */}
      <div className="card mb-6 flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">Attendance</p>
          <p className="text-sm text-gray-500">{data?.checked_in_today ? "You are checked in" : "You haven't checked in yet"}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => checkIn.mutate()} disabled={data?.checked_in_today} className="btn-primary disabled:opacity-50">
            Check In
          </button>
          <button onClick={() => checkOut.mutate()} disabled={!data?.checked_in_today} className="btn-secondary disabled:opacity-50">
            Check Out
          </button>
        </div>
      </div>

      {/* Leave Balances */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Leave Balances</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.leave_balances?.map((lb) => (
            <div key={lb.leave_type__name} className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{(lb.total_days - lb.used_days).toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">{lb.leave_type__name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
