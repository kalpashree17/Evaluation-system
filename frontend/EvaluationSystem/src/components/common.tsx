import { Icon } from "./icon";
import { icons } from "./icons";

export const Badge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    selected: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border border-red-500/30",
    pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    active: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    scheduled: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
    Easy: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    Medium: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    Hard: "bg-red-500/15 text-red-400 border border-red-500/30",
    Admin: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
    Interviewer: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    Candidate: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        map[status] || "bg-slate-700 text-slate-300"
      }`}
    >
      {status}
    </span>
  );
};

export const Avatar = ({ initials, color = "from-violet-500 to-indigo-600" }: { initials: string; color?: string }) => (
  <div
    className={`w-9 h-9 rounded-xl bg-linear-to-br ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}
  >
    {initials}
  </div>
);

export const StatCard = ({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  sub?: string;
}) => (
  <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-5 flex gap-4 items-start hover:border-[#2d3f6b] transition-colors">
    <div
      className={`w-12 h-12 rounded-xl bg-linear-to-br ${color} flex items-center justify-center shrink-0`}
    >
      <Icon d={icons[icon]} size={22} className="text-white" />
    </div>
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-white text-2xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  </div>
);

export const SectionHeader = ({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-white text-xl font-bold">{title}</h2>
    {action && (
      <button
        onClick={onAction}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <Icon d={icons.plus} size={16} />
        {action}
      </button>
    )}
  </div>
);