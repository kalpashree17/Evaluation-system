import {
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
// import { StatCard } from "../components/common";
// import { Avatar } from "../components/common";
import { StatCard, Avatar } from "../components/common";

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

export default function Analytics() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-3xl font-bold">Analytics & Results</h1>
        <p className="text-slate-400 mt-1">Deep insights into interview performance</p>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Top Subject", value: "Python", sub: "81% avg", icon: "trophy", color: "from-amber-500 to-orange-500" },
          { label: "Most Attempted", value: "DSA", sub: "42 candidates", icon: "star", color: "from-violet-500 to-indigo-600" },
          { label: "Hardest Question", value: "BST Impl.", sub: "42% pass rate", icon: "code", color: "from-red-500 to-rose-500" },
          { label: "Top Candidate", value: "Priya Patel", sub: "91% score", icon: "trophy", color: "from-emerald-500 to-teal-500" },
        ].map(c => (
          <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} icon={c.icon} color={c.color} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-6">Subject Performance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={subjectScores} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2943" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#4b5563" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis dataKey="subject" type="category" width={55} stroke="#4b5563" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#0f1623", border: "1px solid #1e2943", borderRadius: 12, color: "#fff" }}
                formatter={(v: any) => [`${v}%`, "Avg Score"]} />
              <Bar dataKey="avg" radius={[0, 6, 6, 0]} fill="url(#hbarGrad)" />
              <defs>
                <linearGradient id="hbarGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-6">Candidate Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={subjectScores} cx="50%" cy="50%" outerRadius={100}
                dataKey="total" nameKey="subject" label={({ subject, percent }: any) => `${subject} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: "#4b5563" }}>
                {subjectScores.map((_, i) => (
                  <Cell key={i} fill={["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f1623", border: "1px solid #1e2943", borderRadius: 12, color: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top performers */}
      <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-6">Top Performers</h3>
        <div className="space-y-4">
          {[...candidates].sort((a, b) => b.score - a.score).slice(0, 5).map((c, i) => (
            <div key={c.id} className="flex items-center gap-4">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-orange-600 text-white" : "bg-[#0f1623] text-slate-400"}`}>
                {i + 1}
              </span>
              <Avatar initials={c.avatar} />
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{c.name}</p>
                <p className="text-slate-400 text-xs">{c.subject}</p>
              </div>
              <div className="flex items-center gap-3 w-48">
                <div className="flex-1 h-1.5 bg-[#0f1623] rounded-full">
                  <div className="h-1.5 rounded-full bg-linear-to-r from-violet-500 to-indigo-500" style={{ width: `${c.score}%` }} />
                </div>
                <span className="text-white font-bold text-sm w-10 text-right">{c.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}