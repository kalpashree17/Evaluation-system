
// this page isnt included anywhere in project, nachaine leftover file

import { useState } from "react";
import { Navbar } from "../components/navbar";
import { Header } from "../components/header";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Icons (inline SVG) ────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d={d} />
  </svg>
);

const icons: Record<string, string> = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V4h16v13M4 19.5V21",
  question: "M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01",
  interview: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  analytics: "M18 20V10M12 20V4M6 20v-6",
  candidate: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  evaluate: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  settings: "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  arrow: "M5 12h14M12 5l7 7-7 7",
  check: "M20 6L9 17l-5-5",
  close: "M18 6L6 18M6 6l12 12",
  menu: "M3 12h18M3 6h18M3 18h18",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z",
  subject: "M12 3L2 9l10 6 10-6-10-6zM2 17l10 6 10-6M2 12l10 6 10-6",
  trophy: "M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z",
};

// ─── Data ───────────────────────────────────────────────────────────────────────
interface TrendData {
  month: string;
  completed: number;
  pending: number;
}

const trendData: TrendData[] = [
  { month: "Jan", completed: 12, pending: 4 },
  { month: "Feb", completed: 19, pending: 6 },
  { month: "Mar", completed: 15, pending: 8 },
  { month: "Apr", completed: 27, pending: 3 },
  { month: "May", completed: 32, pending: 5 },
  { month: "Jun", completed: 45, pending: 12 },
];

interface SubjectScore {
  subject: string;
  avg: number;
  total: number;
}

const subjectScores: SubjectScore[] = [
  { subject: "React", avg: 78, total: 35 },
  { subject: "Node.js", avg: 65, total: 28 },
  { subject: "DSA", avg: 55, total: 42 },
  { subject: "DBMS", avg: 72, total: 20 },
  { subject: "Python", avg: 81, total: 30 },
  { subject: "Java", avg: 68, total: 25 },
];

interface PassFailData {
  name: string;
  value: number;
  color: string;
}

const passFailData: PassFailData[] = [
  { name: "Selected", value: 42, color: "#10b981" },
  { name: "Rejected", value: 38, color: "#ef4444" },
  { name: "Pending", value: 20, color: "#f59e0b" },
];

interface Candidate {
  id: number;
  name: string;
  subject: string;
  score: number;
  status: string;
  date: string;
  avatar: string;
}

const candidates: Candidate[] = [
  { id: 1, name: "Arjun Sharma", subject: "React", score: 82, status: "selected", date: "2024-06-10", avatar: "AS" },
  { id: 2, name: "Priya Patel", subject: "DSA", score: 91, status: "selected", date: "2024-06-09", avatar: "PP" },
  { id: 3, name: "Ravi Kumar", subject: "Node.js", score: 58, status: "rejected", date: "2024-06-09", avatar: "RK" },
  { id: 4, name: "Sneha Reddy", subject: "Python", score: 74, status: "pending", date: "2024-06-08", avatar: "SR" },
  { id: 5, name: "Amit Singh", subject: "Java", score: 67, status: "pending", date: "2024-06-08", avatar: "AS" },
  { id: 6, name: "Kavya Nair", subject: "DBMS", score: 88, status: "selected", date: "2024-06-07", avatar: "KN" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const Badge = ({ status }: { status: string }) => {
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

const Avatar = ({ initials, color = "from-violet-500 to-indigo-600" }: { initials: string; color?: string }) => (
  <div
    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
  >
    {initials}
  </div>
);

const StatCard = ({
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
      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}
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

const SectionHeader = ({
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

// ─── MODULE: Overview ──────────────────────────────────────────────────────────
const Overview = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-white text-3xl font-bold">Overview Dashboard</h1>
      <p className="text-slate-400 mt-1">Welcome back! Here's what's happening today.</p>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        label="Total Candidates"
        value="120"
        icon="users"
        color="from-violet-500 to-indigo-600"
        sub="+12 this week"
      />
      <StatCard
        label="Interviews Done"
        value="45"
        icon="interview"
        color="from-blue-500 to-cyan-500"
        sub="This month"
      />
      <StatCard
        label="Pending Reviews"
        value="12"
        icon="clock"
        color="from-amber-500 to-orange-500"
        sub="Needs attention"
      />
      <StatCard
        label="Avg. Score"
        value="72%"
        icon="analytics"
        color="from-emerald-500 to-teal-500"
        sub="↑ 4% from last"
      />
      <StatCard
        label="Selected"
        value="42"
        icon="check"
        color="from-emerald-500 to-green-600"
        sub="35% pass rate"
      />
      <StatCard
        label="Rejected"
        value="38"
        icon="close"
        color="from-red-500 to-rose-600"
        sub="32% reject rate"
      />
    </div>

    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Trend */}
      <div className="lg:col-span-2 bg-[#141928] border border-[#1e2943] rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-6">Interview Completion Trends</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2943" />
            <XAxis dataKey="month" stroke="#4b5563" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis stroke="#4b5563" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "#0f1623",
                border: "1px solid #1e2943",
                borderRadius: 12,
                color: "#fff",
              }}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="#7c3aed"
              fill="url(#gc)"
              strokeWidth={2}
              name="Completed"
            />
            <Area
              type="monotone"
              dataKey="pending"
              stroke="#f59e0b"
              fill="url(#gp)"
              strokeWidth={2}
              name="Pending"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pie */}
      <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Pass / Fail Ratio</h3>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={passFailData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              stroke="none"
            >
              {passFailData.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0f1623",
                border: "1px solid #1e2943",
                borderRadius: 12,
                color: "#fff",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2 mt-2">
          {passFailData.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                <span className="text-slate-400 text-sm">{d.name}</span>
              </div>
              <span className="text-white font-semibold text-sm">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Subject Scores */}
    <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6">
      <h3 className="text-white font-semibold mb-6">Average Scores per Subject</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={subjectScores} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2943" vertical={false} />
          <XAxis dataKey="subject" stroke="#4b5563" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis stroke="#4b5563" tick={{ fill: "#94a3b8", fontSize: 12 }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              background: "#0f1623",
              border: "1px solid #1e2943",
              borderRadius: 12,
              color: "#fff",
            }}
            formatter={(v: any) => [`${v}%`, "Avg Score"]}
          />
          <Bar dataKey="avg" radius={[6, 6, 0, 0]} fill="url(#barGrad)" />
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* Recent Activity */}
    <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6">
      <SectionHeader title="Recent Candidates" />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e2943]">
              {["Candidate", "Subject", "Score", "Status", "Date"].map((h) => (
                <th key={h} className="text-left text-slate-400 text-sm font-medium pb-3 pr-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2236]">
            {candidates.map((c) => (
              <tr key={c.id} className="hover:bg-[#1a2236] transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={c.avatar} />
                    <span className="text-white font-medium text-sm">{c.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-300 text-sm">{c.subject}</td>
                <td className="py-3 pr-4">
                  <span className="text-white font-bold">{c.score}%</span>
                </td>
                <td className="py-3 pr-4">
                  <Badge status={c.status} />
                </td>
                <td className="py-3 text-slate-400 text-sm">{c.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// ─── NAV CONFIG ────────────────────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "subjects", label: "Subjects", icon: "subject" },
  { id: "questions", label: "Question Bank", icon: "question" },
  { id: "interviews", label: "Interviews", icon: "interview" },
  { id: "candidates", label: "Candidates", icon: "candidate" },
  { id: "evaluation", label: "Evaluation", icon: "evaluate" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "users", label: "Users", icon: "users" },
];

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [module, setModule] = useState<string>("overview");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const moduleMap: Record<string, () => any> = {
    overview: Overview,
    // Add other modules here as needed
  };

  const ActiveModule = moduleMap[module] || Overview;
  const activeNav = navItems.find((n) => n.id === module);

  return (
    <div className="h-screen w-screen bg-[#0a0f1c] flex font-sans overflow-hidden">
      <Navbar module={module} setModule={setModule} sidebarOpen={sidebarOpen} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeNavLabel={activeNav?.label}
        />
        <main className="flex-1 overflow-y-auto p-8">
          <ActiveModule />
        </main>
      </div>
    </div>
  );
}