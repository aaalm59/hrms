import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target, Star, TrendingUp, Award, Plus, X, Check,
  ChevronRight, Edit, Clock
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";

const GOAL_STATUS = {
  pending: { label: "Not Started", class: "badge-inactive" },
  in_progress: { label: "In Progress", class: "badge-pending" },
  completed: { label: "Completed", class: "badge-active" },
  missed: { label: "Missed", class: "bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium" },
};

function StarRating({ value, onChange, max = 5 }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange && onChange(i + 1)}
          className="focus:outline-none"
        >
          <Star className={`w-5 h-5 transition-colors ${i < value ? "text-yellow-400 fill-current" : "text-gray-200"} ${onChange ? "hover:text-yellow-300 cursor-pointer" : "cursor-default"}`} />
        </button>
      ))}
    </div>
  );
}

function AddGoalModal({ cycles, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (d) => api.post("/performance/goals/", d),
    onSuccess: () => {
      toast.success("Goal created");
      qc.invalidateQueries(["my-goals"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to create goal"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Goal</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appraisal Cycle</label>
            <select {...register("appraisal_cycle", { required: true })} className="input">
              <option value="">Select cycle...</option>
              {cycles?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
            <input {...register("title", { required: true })} className="input" placeholder="e.g. Complete React certification" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register("description")} className="input h-20 resize-none" placeholder="Goal details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" {...register("start_date")} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" {...register("due_date")} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (%)</label>
            <input type="number" {...register("weightage")} className="input" placeholder="20" min={1} max={100} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Saving..." : "Add Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{review.employee_name}</p>
          <p className="text-xs text-gray-500">{review.appraisal_cycle_name}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          review.status === "completed" ? "badge-active" : "badge-pending"
        }`}>{review.status}</span>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Self Rating</p>
          <StarRating value={review.self_rating ?? 0} />
        </div>
        {review.manager_rating && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Manager Rating</p>
            <StarRating value={review.manager_rating} />
          </div>
        )}
        {review.overall_rating && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl">
            <Award className="w-4 h-4 text-yellow-600" />
            <div>
              <p className="text-xs text-gray-600">Overall Rating</p>
              <p className="font-bold text-yellow-700">{review.overall_rating}/5</p>
            </div>
          </div>
        )}
        {review.strengths && (
          <p className="text-xs text-gray-600 bg-green-50 p-2 rounded-lg">
            <span className="font-medium text-green-700">Strengths:</span> {review.strengths}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const user = useSelector(selectCurrentUser);
  const isHR = user?.roles?.some((r) => ["hr_admin", "company_admin", "manager"].includes(r));
  const [tab, setTab] = useState("goals");
  const [showAddGoal, setShowAddGoal] = useState(false);

  const { data: cycles } = useQuery({
    queryKey: ["appraisal-cycles"],
    queryFn: () => api.get("/performance/appraisal-cycles/").then((r) => r.data?.results ?? r.data),
  });

  const { data: myGoals } = useQuery({
    queryKey: ["my-goals"],
    queryFn: () => api.get("/performance/goals/").then((r) => r.data),
  });

  const { data: reviews } = useQuery({
    queryKey: ["performance-reviews"],
    queryFn: () => api.get("/performance/reviews/").then((r) => r.data),
    enabled: tab === "reviews",
  });

  const updateGoalStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/performance/goals/${id}/`, { status }),
    onSuccess: () => {
      toast.success("Goal updated");
      useQueryClient().invalidateQueries(["my-goals"]);
    },
  });

  const goals = myGoals?.results ?? [];
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const inProgressGoals = goals.filter((g) => g.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        subtitle="Goals, appraisals, and performance reviews"
        actions={
          <button onClick={() => setShowAddGoal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Goal
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Goals" value={myGoals?.count ?? goals.length} icon={Target} color="blue" />
        <StatCard title="Completed" value={completedGoals} icon={Check} color="green" />
        <StatCard title="In Progress" value={inProgressGoals} icon={TrendingUp} color="yellow" />
        <StatCard title="Appraisal Cycles" value={cycles?.length ?? "—"} icon={Award} color="purple" />
      </div>

      {/* Appraisal Cycles Banner */}
      {cycles?.filter((c) => c.is_active)?.map((cycle) => (
        <div key={cycle.id} className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Active Appraisal Cycle</p>
            <h3 className="text-xl font-bold mt-1">{cycle.name}</h3>
            <p className="text-sm opacity-70 mt-1">
              {cycle.start_date} → {cycle.end_date}
            </p>
          </div>
          <Award className="w-12 h-12 opacity-30" />
        </div>
      ))}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "goals", label: "My Goals" },
          { id: "reviews", label: "Reviews" },
          ...(isHR ? [{ id: "cycles", label: "Appraisal Cycles" }] : []),
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

      {/* Goals */}
      {tab === "goals" && (
        <div className="space-y-3">
          {goals.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No goals yet. Add your first goal!</p>
            </div>
          ) : (
            goals.map((goal) => {
              const cfg = GOAL_STATUS[goal.status] ?? GOAL_STATUS.pending;
              const pct = goal.weightage ?? 0;
              return (
                <div key={goal.id} className="card flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{goal.title}</p>
                        {goal.description && <p className="text-sm text-gray-500 mt-0.5">{goal.description}</p>}
                      </div>
                      <span className={cfg.class}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {goal.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due {format(parseISO(goal.due_date), "dd MMM yyyy")}
                        </span>
                      )}
                      {goal.weightage && <span>Weight: {goal.weightage}%</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {goal.status !== "completed" && (
                      <button
                        onClick={() => updateGoalStatus.mutate({ id: goal.id, status: goal.status === "pending" ? "in_progress" : "completed" })}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        {goal.status === "pending" ? "Start" : "Complete"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Reviews */}
      {tab === "reviews" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!reviews?.results?.length ? (
            <div className="col-span-full text-center py-12 text-gray-400">No reviews found</div>
          ) : (
            reviews.results.map((r) => <ReviewCard key={r.id} review={r} />)
          )}
        </div>
      )}

      {/* Appraisal Cycles */}
      {tab === "cycles" && isHR && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Cycle Name", "Period", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!cycles?.length ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400">No cycles found</td></tr>
              ) : (
                cycles.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.start_date} → {c.end_date}</td>
                    <td className="px-4 py-3">
                      {c.is_active ? (
                        <span className="badge-active">Active</span>
                      ) : (
                        <span className="badge-inactive">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddGoal && (
        <AddGoalModal cycles={cycles} onClose={() => setShowAddGoal(false)} />
      )}
    </div>
  );
}
