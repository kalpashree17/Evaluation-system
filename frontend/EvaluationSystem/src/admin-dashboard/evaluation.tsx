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

export default function Evaluation() {
  const [active, setActive] = useState<Candidate | null>(candidates[0]);
  const [rating, setRating] = useState(0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-3xl font-bold">Evaluation Panel</h1>
        <p className="text-slate-400 mt-1">Review and score candidate answers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidate list */}
        <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-4 space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-2 mb-3">Pending Evaluation</p>
          {candidates.filter(c => c.status === "pending" || c.status === "selected").map(c => (
            <button key={c.id} onClick={() => setActive(c)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${active?.id === c.id ? "bg-violet-500/15 border border-violet-500/30" : "hover:bg-[#1a2236]"}`}>
              <Avatar initials={c.avatar} />
              <div>
                <p className="text-white text-sm font-medium">{c.name}</p>
                <p className="text-slate-400 text-xs">{c.subject} · {c.score}%</p>
              </div>
              <Badge status={c.status} />
            </button>
          ))}
        </div>

        {/* Evaluation detail */}
        <div className="lg:col-span-2 space-y-5">
          {active && (
            <>
              <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar initials={active.avatar} color="from-violet-500 to-indigo-600" />
                  <div>
                    <h3 className="text-white font-bold text-lg">{active.name}</h3>
                    <p className="text-slate-400 text-sm">{active.subject} · Interviewed on {active.date}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-white font-bold text-2xl">{active.score}%</p>
                    <p className="text-slate-400 text-xs">Auto Score</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["MCQ", "Theory", "Coding"].map((t, i) => (
                    <div key={t} className="bg-[#0f1623] rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">{t}</p>
                      <p className="text-white font-bold text-lg">{[85, 70, active.score][i]}%</p>
                      <div className="mt-2 h-1 bg-[#1e2943] rounded-full">
                        <div className="h-1 rounded-full bg-linear-to-r from-violet-500 to-indigo-500"
                          style={{ width: `${[85, 70, active.score][i]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual rating */}
              <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6">
                <h4 className="text-white font-semibold mb-4">Manual Evaluation</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">Interviewer Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setRating(s)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${rating >= s ? "bg-amber-500 text-white" : "bg-[#0f1623] text-slate-400 hover:text-amber-400"}`}>
                          <Icon d={icons.star} size={18} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">Notes & Feedback</label>
                    <textarea rows={4}
                      className="w-full bg-[#0f1623] border border-[#1e2943] text-slate-300 p-3 rounded-xl focus:outline-none focus:border-violet-500 text-sm resize-none"
                      placeholder="Add evaluation notes..." />
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors">Select Candidate</button>
                    <button className="flex-1 py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 font-semibold rounded-xl transition-colors border border-red-500/30">Reject</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}