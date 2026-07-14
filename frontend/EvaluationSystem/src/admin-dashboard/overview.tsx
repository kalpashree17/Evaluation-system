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
// import { Icon } from "../components/icon";
// import { icons } from "../components/icons";
import { Badge, Avatar, StatCard, SectionHeader } from "../components/common";

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

export default function Overview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-3xl font-bold">Overview Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2! lg:grid-cols-3! xl:grid-cols-3! gap-4!">
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
}