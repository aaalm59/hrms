import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, Users, UserCheck, XCircle, ArrowUpRight, Search
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const STAGE_COLORS = {
  Applied: "#94a3b8",
  Screening: "#f59e0b",
  Interview: "#2563eb",
  Offer: "#10b981",
};

const JOB_STATUS_CLS = {
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  on_hold: "bg-yellow-100 text-yellow-700",
  draft: "bg-blue-100 text-blue-700",
};

export default function RecruiterDashboard() {
  const { data } = useQuery({
    queryKey: ["recruiter-dashboard"],
    queryFn: () => api.get("/dashboards/recruiter/").then((r) => r.data),
    refetchInterval: 120000,
  });

  const pipeline = data?.pipeline_by_stage ?? [
    { stage: "Applied", count: 0 },
    { stage: "Screening", count: 0 },
    { stage: "Interview", count: 0 },
    { stage: "Offer", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment Dashboard"
        subtitle={`Hiring overview for ${format(new Date(), "MMMM yyyy")}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Open Positions" value={data?.open_positions ?? "—"} icon={Briefcase} color="blue" />
        <StatCard title="Total Candidates" value={data?.total_candidates ?? "—"} icon={Users} color="purple" />
        <StatCard title="In Pipeline" value={data?.in_pipeline ?? "—"} icon={Search} color="yellow" />
        <StatCard title="Hired" value={data?.hired_total ?? "—"} icon={UserCheck} color="green" />
        <StatCard title="Rejected" value={data?.rejected_total ?? "—"} icon={XCircle} color="red" />
      </div>

      {/* Pipeline by stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Candidate Pipeline</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pipeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                {pipeline.map((entry) => (
                  <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "#2563eb"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline stage breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Stage Breakdown</h3>
          <div className="space-y-4">
            {pipeline.map(({ stage, count }) => {
              const total = pipeline.reduce((s, p) => s + (p.count || 0), 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={stage}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-700 font-medium">{stage}</span>
                    <span className="text-gray-500">{count} candidates ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[stage] ?? "#2563eb" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent job posts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Job Posts</h3>
          <Link to="/recruitment" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            Manage <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {!data?.recent_jobs?.length ? (
          <p className="text-sm text-gray-400 text-center py-8">No job posts found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Title</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidates</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Posted On</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-900">{job.title}</td>
                    <td className="py-3 px-3 text-center text-gray-700">{job.candidates}</td>
                    <td className="py-3 px-3 text-center text-gray-500">{job.posted_on}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${JOB_STATUS_CLS[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {job.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
