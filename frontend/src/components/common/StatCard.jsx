import { clsx } from "clsx";

export default function StatCard({ title, value, icon: Icon, color = "blue", change, footer }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {change !== undefined && (
          <span className={clsx("text-xs font-medium", change >= 0 ? "text-green-600" : "text-red-600")}>
            {change >= 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
      {footer && <p className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">{footer}</p>}
    </div>
  );
}
