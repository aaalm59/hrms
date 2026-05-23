import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, CheckCheck, Info, CheckCircle, AlertTriangle, AlertCircle,
  Megaphone, X, Plus, Clock, Building2
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { setUnreadCount } from "@/redux/slices/notificationSlice";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";

const TYPE_CONFIG = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50" },
  success: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-50" },
  error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
};

function AnnouncementModal({ onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm();

  const mutation = useMutation({
    mutationFn: (d) => api.post("/notifications/announcements/", d),
    onSuccess: () => {
      toast.success("Announcement posted");
      qc.invalidateQueries(["announcements"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to post"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Post Announcement</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input {...register("title", { required: true })} className="input" placeholder="Announcement title..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea {...register("message", { required: true })} className="input h-24 resize-none" placeholder="Announcement message..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select {...register("priority")} className="input">
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NotificationItem({ notif, onMarkRead }) {
  const cfg = TYPE_CONFIG[notif.notification_type] ?? TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
        notif.is_read ? "border-gray-100 bg-white" : "border-primary-100 bg-primary-50/40"
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${notif.is_read ? "text-gray-700" : "text-gray-900"}`}>
          {notif.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {notif.created_at ? formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true }) : ""}
        </p>
      </div>
      {!notif.is_read && (
        <button
          onClick={() => onMarkRead(notif.id)}
          className="text-xs text-primary-600 hover:text-primary-800 font-medium flex-shrink-0"
        >
          Mark read
        </button>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const qc = useQueryClient();
  const isHR = user?.roles?.some((r) => ["hr_admin", "company_admin"].includes(r));
  const [tab, setTab] = useState("notifications");
  const [filter, setFilter] = useState("all");
  const [showAnnModal, setShowAnnModal] = useState(false);

  const { data: notifs } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () =>
      api.get(`/notifications/?${filter === "unread" ? "is_read=false&" : ""}ordering=-created_at`).then((r) => r.data),
  });

  const { data: announcements } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.get("/notifications/announcements/?ordering=-created_at").then((r) => r.data),
    enabled: tab === "announcements",
  });

  const markRead = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/mark_read/`),
    onSuccess: () => {
      qc.invalidateQueries(["notifications"]);
      const unread = (notifs?.results?.filter((n) => !n.is_read).length ?? 1) - 1;
      dispatch(setUnreadCount(Math.max(0, unread)));
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/mark_all_read/"),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      qc.invalidateQueries(["notifications"]);
      dispatch(setUnreadCount(0));
    },
  });

  const notifications = notifs?.results ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        actions={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <CheckCheck className="w-4 h-4" /> Mark All Read
              </button>
            )}
            {isHR && (
              <button
                onClick={() => setShowAnnModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Announce
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "notifications", label: "Notifications" },
          { id: "announcements", label: "Announcements" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            {t.label}
            {t.id === "notifications" && unreadCount > 0 && (
              <span className="ml-2 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {tab === "notifications" && (
        <div>
          <div className="flex gap-2 mb-4">
            {["all", "unread"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors ${
                  filter === f ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notif={n}
                  onMarkRead={(id) => markRead.mutate(id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Announcements */}
      {tab === "announcements" && (
        <div className="space-y-4">
          {!announcements?.results?.length ? (
            <div className="text-center py-16">
              <Megaphone className="w-12 h-12 mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">No announcements yet</p>
            </div>
          ) : (
            announcements.results.map((ann) => (
              <div key={ann.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      ann.priority === "urgent" ? "bg-red-100" :
                      ann.priority === "high" ? "bg-orange-100" : "bg-blue-100"
                    }`}>
                      <Megaphone className={`w-5 h-5 ${
                        ann.priority === "urgent" ? "text-red-600" :
                        ann.priority === "high" ? "text-orange-600" : "text-blue-600"
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                        {ann.priority !== "normal" && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            ann.priority === "urgent" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                          }`}>
                            {ann.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{ann.message}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {ann.created_by_name ?? "HR Team"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ann.created_at ? format(parseISO(ann.created_at), "dd MMM yyyy, HH:mm") : ""}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAnnModal && <AnnouncementModal onClose={() => setShowAnnModal(false)} />}
    </div>
  );
}
