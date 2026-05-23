import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Users, Plus, Search, X, MapPin, Clock,
  ChevronRight, Star, Phone, Video, User
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";

const JOB_STATUS = {
  open: { label: "Open", class: "badge-active" },
  on_hold: { label: "On Hold", class: "badge-pending" },
  closed: { label: "Closed", class: "badge-inactive" },
  filled: { label: "Filled", class: "bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-medium" },
};

const CANDIDATE_STAGES = [
  { key: "applied", label: "Applied", color: "bg-gray-100 text-gray-700" },
  { key: "screening", label: "Screening", color: "bg-blue-100 text-blue-700" },
  { key: "interview", label: "Interview", color: "bg-yellow-100 text-yellow-700" },
  { key: "offer", label: "Offer", color: "bg-orange-100 text-orange-700" },
  { key: "hired", label: "Hired", color: "bg-green-100 text-green-700" },
  { key: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
];

const INTERVIEW_TYPES = {
  phone: { label: "Phone", icon: Phone },
  video: { label: "Video", icon: Video },
  in_person: { label: "In Person", icon: User },
  technical: { label: "Technical", icon: Star },
  hr: { label: "HR Round", icon: User },
};

function AddJobModal({ onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (d) => api.post("/recruitment/jobs/", d),
    onSuccess: () => {
      toast.success("Job posted successfully");
      qc.invalidateQueries(["job-posts"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to post job"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Post New Job</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
            <input {...register("title", { required: true })} className="input" placeholder="e.g. Senior Developer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
              <input type="number" {...register("experience_required")} className="input" placeholder="2" min={0} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min CTC (₹ LPA)</label>
              <input type="number" {...register("min_ctc")} className="input" placeholder="5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max CTC (₹ LPA)</label>
              <input type="number" {...register("max_ctc")} className="input" placeholder="10" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input {...register("location")} className="input" placeholder="e.g. Bangalore" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Openings</label>
            <input type="number" {...register("openings", { min: 1 })} className="input" placeholder="1" defaultValue={1} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register("description")} className="input h-24 resize-none" placeholder="Job description..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Posting..." : "Post Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CandidateCard({ candidate, onClick }) {
  const stage = CANDIDATE_STAGES.find((s) => s.key === candidate.stage) ?? CANDIDATE_STAGES[0];
  return (
    <div
      onClick={onClick}
      className="p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-gray-900 text-sm">{candidate.first_name} {candidate.last_name}</p>
          <p className="text-xs text-gray-500">{candidate.email}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage.color}`}>{stage.label}</span>
      </div>
      {candidate.current_ctc && (
        <p className="text-xs text-gray-500 mt-1">
          CTC: ₹{candidate.current_ctc}L → ₹{candidate.expected_ctc}L
        </p>
      )}
      {candidate.applied_on && (
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Applied {format(parseISO(candidate.applied_on), "dd MMM")}
        </p>
      )}
    </div>
  );
}

export default function RecruitmentPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("jobs");
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [stageFilter, setStageFilter] = useState("");

  const { data: jobs } = useQuery({
    queryKey: ["job-posts", search],
    queryFn: () => api.get(`/recruitment/jobs/?search=${search}`).then((r) => r.data),
  });

  const { data: candidates } = useQuery({
    queryKey: ["candidates", selectedJob?.id, stageFilter, search],
    queryFn: () =>
      api.get(`/recruitment/candidates/?${selectedJob ? `job_post=${selectedJob.id}&` : ""}${stageFilter ? `stage=${stageFilter}&` : ""}search=${search}`).then((r) => r.data),
    enabled: tab === "candidates",
  });

  const { data: interviews } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => api.get("/recruitment/interviews/?ordering=scheduled_at").then((r) => r.data),
    enabled: tab === "interviews",
  });

  const updateCandidateStage = useMutation({
    mutationFn: ({ id, stage }) => api.patch(`/recruitment/candidates/${id}/`, { stage }),
    onSuccess: () => {
      toast.success("Stage updated");
      qc.invalidateQueries(["candidates"]);
    },
  });

  const openJobs = jobs?.results?.filter((j) => j.status === "open").length ?? 0;
  const totalCandidates = candidates?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        subtitle="Manage job posts, candidates, and interviews"
        actions={
          <button onClick={() => setShowAddJob(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Post Job
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Open Positions" value={openJobs} icon={Briefcase} color="blue" />
        <StatCard title="Total Jobs" value={jobs?.count ?? "—"} icon={Briefcase} color="green" />
        <StatCard title="Candidates" value={candidates?.count ?? "—"} icon={Users} color="purple" />
        <StatCard title="Interviews" value={interviews?.count ?? "—"} icon={Clock} color="yellow" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "jobs", label: "Job Posts" },
          { id: "candidates", label: "Candidates" },
          { id: "interviews", label: "Interviews" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder={tab === "jobs" ? "Search jobs..." : "Search candidates..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tab === "candidates" && (
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="input w-40 py-2"
          >
            <option value="">All Stages</option>
            {CANDIDATE_STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Job Posts */}
      {tab === "jobs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!jobs?.results?.length ? (
            <div className="col-span-full text-center py-12 text-gray-400">No job posts found</div>
          ) : (
            jobs.results.map((job) => {
              const cfg = JOB_STATUS[job.status] ?? JOB_STATUS.open;
              return (
                <div
                  key={job.id}
                  className="card hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => { setSelectedJob(job); setTab("candidates"); }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className={cfg.class}>{cfg.label}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
                  <div className="space-y-1 text-xs text-gray-500">
                    {job.location && (
                      <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</p>
                    )}
                    {job.employment_type && (
                      <p className="capitalize">{job.employment_type.replace("_", " ")}</p>
                    )}
                    {(job.min_ctc || job.max_ctc) && (
                      <p>₹{job.min_ctc}L – ₹{job.max_ctc}L</p>
                    )}
                    <p>{job.openings ?? 1} opening{job.openings > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {job.posted_on ? format(parseISO(job.posted_on), "dd MMM yyyy") : ""}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Candidates Pipeline */}
      {tab === "candidates" && (
        <div>
          {selectedJob && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
              <Briefcase className="w-4 h-4" />
              Showing candidates for: <strong>{selectedJob.title}</strong>
              <button onClick={() => setSelectedJob(null)} className="ml-auto text-blue-600 hover:text-blue-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!candidates?.results?.length ? (
              <div className="col-span-full text-center py-12 text-gray-400">No candidates found</div>
            ) : (
              candidates.results.map((c) => (
                <CandidateCard key={c.id} candidate={c} onClick={() => {}} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Interviews */}
      {tab === "interviews" && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Candidate", "Type", "Scheduled At", "Interviewer", "Status", "Rating"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!interviews?.results?.length ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No interviews scheduled</td></tr>
              ) : (
                interviews.results.map((iv) => {
                  const typeInfo = INTERVIEW_TYPES[iv.interview_type] ?? INTERVIEW_TYPES.phone;
                  const Icon = typeInfo.icon;
                  return (
                    <tr key={iv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{iv.candidate_name}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-600 text-xs">
                          <Icon className="w-3.5 h-3.5" /> {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {iv.scheduled_at ? format(parseISO(iv.scheduled_at), "dd MMM yyyy, HH:mm") : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{iv.interviewer_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          iv.status === "completed" ? "bg-green-100 text-green-700" :
                          iv.status === "cancelled" ? "bg-red-100 text-red-700" :
                          "badge-pending"
                        }`}>
                          {iv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {iv.rating ? (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < iv.rating ? "text-yellow-400 fill-current" : "text-gray-200"}`} />
                            ))}
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddJob && <AddJobModal onClose={() => setShowAddJob(false)} />}
    </div>
  );
}
