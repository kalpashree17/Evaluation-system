import { useState } from "react";
import { Icon } from "../components/icon";
import { icons } from "../components/icons";
import { Badge, Avatar } from "../components/common";

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

export default function Candidates() {
  const [search, setSearch] = useState("");
  const filtered = candidates.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl font-bold">Candidates</h1>
          <p className="text-slate-400 mt-1">Track and evaluate all candidates</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">
          <Icon d={icons.plus} size={16} />Add Candidate
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Icon d={icons.search} size={18} className="text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search candidates by name…"
          className="w-full bg-[#141928] border border-[#1e2943] text-slate-300 pl-11 pr-4 py-3 rounded-2xl focus:outline-none focus:border-violet-500 transition-colors" />
      </div>

      {/* Table */}
      <div className="bg-[#141928] border border-[#1e2943] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e2943] bg-[#0f1623]">
              {["Candidate", "Subject", "Score", "Status", "Date", "Actions"].map(h => (
                <th key={h} className="text-left text-slate-400 text-sm font-semibold px-6 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2236]">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-[#1a2236] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={c.avatar} />
                    <span className="text-white font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300">{c.subject}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-[#0f1623] rounded-full h-1.5 w-20">
                      <div className="h-1.5 rounded-full bg-linear-to-r from-violet-500 to-indigo-500"
                        style={{ width: `${c.score}%` }} />
                    </div>
                    <span className="text-white font-bold text-sm">{c.score}%</span>
                  </div>
                </td>
                <td className="px-6 py-4"><Badge status={c.status} /></td>
                <td className="px-6 py-4 text-slate-400 text-sm">{c.date}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-xs text-blue-400 px-3 py-1.5 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors">View</button>
                    <button className="text-xs text-violet-400 px-3 py-1.5 bg-violet-500/10 rounded-lg hover:bg-violet-500/20 transition-colors">Evaluate</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}