import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Briefcase,
  CreditCard, FileText, AlertCircle, CheckCircle, Edit
} from "lucide-react";
import api from "@/services/api";
import { format, parseISO } from "date-fns";

const STATUS_COLORS = {
  active: "badge-active",
  inactive: "badge-inactive",
  on_notice: "badge-pending",
  terminated: "bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium",
};

function InfoRow({ label, value, icon: Icon }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: emp, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.get(`/employees/${id}/`).then((r) => r.data),
  });

  const { data: attendanceSummary } = useQuery({
    queryKey: ["emp-attendance", id],
    queryFn: () => api.get(`/attendance/?employee=${id}&page_size=5`).then((r) => r.data),
  });

  const { data: leaveBalance } = useQuery({
    queryKey: ["emp-leave-balance", id],
    queryFn: () => api.get(`/leaves/balances/?employee_id=${id}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!emp) return <div className="text-center py-16 text-gray-400">Employee not found</div>;

  const initials = `${emp.first_name?.[0] ?? ""}${emp.last_name?.[0] ?? ""}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Employee Profile</h1>
          <p className="text-sm text-gray-500">Detailed view</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{emp.first_name} {emp.last_name}</h2>
                <p className="text-sm text-gray-500">{emp.designation_name ?? "—"} · {emp.department_name ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={STATUS_COLORS[emp.status] ?? "badge-inactive"}>{emp.status}</span>
                <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">{emp.employee_id}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              {emp.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {emp.email}
                </span>
              )}
              {emp.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {emp.phone}
                </span>
              )}
              {emp.date_of_joining && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Joined {format(parseISO(emp.date_of_joining), "dd MMM yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Personal Info */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary-600" /> Personal Information
          </h3>
          <InfoRow label="Date of Birth" value={emp.date_of_birth ? format(parseISO(emp.date_of_birth), "dd MMM yyyy") : null} icon={Calendar} />
          <InfoRow label="Gender" value={emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : null} />
          <InfoRow label="Blood Group" value={emp.blood_group} />
          <InfoRow label="Marital Status" value={emp.marital_status} />
          <InfoRow label="Address" value={emp.address} icon={MapPin} />
          <InfoRow label="Nationality" value={emp.nationality} />
        </div>

        {/* Employment Info */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary-600" /> Employment Details
          </h3>
          <InfoRow label="Employee ID" value={emp.employee_id} />
          <InfoRow label="Department" value={emp.department_name} />
          <InfoRow label="Designation" value={emp.designation_name} />
          <InfoRow label="Employment Type" value={emp.employment_type?.replace("_", " ")} />
          <InfoRow label="Reporting Manager" value={emp.reporting_manager_name} icon={User} />
          <InfoRow label="Work Location" value={emp.work_location} icon={MapPin} />
          <InfoRow label="Probation End" value={emp.probation_end_date ? format(parseISO(emp.probation_end_date), "dd MMM yyyy") : null} />
        </div>

        {/* Government IDs */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-600" /> Government IDs
          </h3>
          <InfoRow label="PAN Number" value={emp.pan_number} />
          <InfoRow label="Aadhar Number" value={emp.aadhar_number} />
          <InfoRow label="PF Number" value={emp.pf_number} />
          <InfoRow label="UAN Number" value={emp.uan_number} />
          <InfoRow label="ESI Number" value={emp.esi_number} />
        </div>
      </div>

      {/* Leave Balances */}
      {leaveBalance?.results?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" /> Leave Balances
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {leaveBalance.results.map((b) => (
              <div key={b.id} className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">{(b.total_days - b.used_days).toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">{b.leave_type_name}</p>
                <p className="text-xs text-gray-400">{b.used_days} used</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Attendance */}
      {attendanceSummary?.results?.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Attendance</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "Check In", "Check Out", "Hours", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attendanceSummary.results.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{rec.date ? format(parseISO(rec.date), "dd MMM") : "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{rec.check_in?.slice(0, 5) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{rec.check_out?.slice(0, 5) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{rec.working_hours ? `${rec.working_hours}h` : "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      rec.status === "present" ? "bg-green-100 text-green-700" :
                      rec.status === "absent" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
