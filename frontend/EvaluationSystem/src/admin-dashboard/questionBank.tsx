import { useState } from "react";
import { Icon } from "../components/icon";
import { icons } from "../components/icons";
import { Badge } from "../components/common";

interface Question {
  id: number;
  title: string;
  subject: string;
  difficulty: string;
  type: string;
  marks: number;
  tags: string[];
}

const questions: Question[] = [
  { id: 1, title: "Explain React useEffect cleanup function", subject: "React", difficulty: "Medium", type: "Theory", marks: 10, tags: ["hooks", "lifecycle"] },
  { id: 2, title: "Implement a binary search tree", subject: "DSA", difficulty: "Hard", type: "Coding", marks: 20, tags: ["trees", "recursion"] },
  { id: 3, title: "What is database normalization?", subject: "DBMS", difficulty: "Easy", type: "MCQ", marks: 5, tags: ["normalization"] },
  { id: 4, title: "Design a REST API for user auth", subject: "Node.js", difficulty: "Hard", type: "Coding", marks: 25, tags: ["api", "auth"] },
  { id: 5, title: "Python list comprehension vs loops", subject: "Python", difficulty: "Easy", type: "MCQ", marks: 5, tags: ["basics"] },
  { id: 6, title: "Explain Java garbage collection", subject: "Java", difficulty: "Medium", type: "Theory", marks: 10, tags: ["memory", "jvm"] },
];

export default function QuestionBank() {
  const [filter, setFilter] = useState({ subject: "All", difficulty: "All", type: "All" });

  const filtered = questions.filter(q => {
    return (filter.subject === "All" || q.subject === filter.subject) &&
      (filter.difficulty === "All" || q.difficulty === filter.difficulty) &&
      (filter.type === "All" || q.type === filter.type);
  });

  const typeIcon = (type: string) => {
    const m: Record<string, string> = { MCQ: icons.check, Coding: icons.code, Theory: icons.book };
    return m[type] || icons.question;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl font-bold">Question Bank</h1>
          <p className="text-slate-400 mt-1">Manage all interview questions across subjects</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#141928] border border-[#1e2943] hover:border-violet-500/50 text-slate-300 text-sm font-semibold rounded-xl transition-colors">
            <Icon d={icons.upload} size={16} />Bulk Import
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">
            <Icon d={icons.plus} size={16} />Add Question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon d={icons.filter} size={16} /><span className="text-sm font-medium">Filters:</span>
        </div>
        {[
          { key: "subject" as const, opts: ["All", "React", "DSA", "DBMS", "Node.js", "Python", "Java"] },
          { key: "difficulty" as const, opts: ["All", "Easy", "Medium", "Hard"] },
          { key: "type" as const, opts: ["All", "MCQ", "Coding", "Theory"] },
        ].map(({ key, opts }) => (
          <select key={key} value={filter[key]}
            onChange={e => setFilter(f => ({ ...f, [key]: e.target.value }))}
            className="bg-[#0f1623] border border-[#1e2943] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500">
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        <div className="ml-auto relative">
          <Icon d={icons.search} size={16} className="text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input placeholder="Search questions…"
            className="bg-[#0f1623] border border-[#1e2943] text-slate-300 text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-violet-500 w-56" />
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filtered.map(q => (
          <div key={q.id} className="bg-[#141928] border border-[#1e2943] rounded-2xl p-5 hover:border-[#2d3f6b] transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0f1623] border border-[#1e2943] flex items-center justify-center shrink-0">
                <Icon d={typeIcon(q.type)} size={18} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h4 className="text-white font-semibold">{q.title}</h4>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={q.difficulty} />
                  <span className="text-slate-400 text-xs bg-[#0f1623] px-2 py-0.5 rounded-full">{q.type}</span>
                  <span className="text-slate-400 text-xs bg-[#0f1623] px-2 py-0.5 rounded-full">{q.subject}</span>
                  <span className="text-slate-400 text-xs">{q.marks} marks</span>
                  {q.tags.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 bg-blue-500/10 rounded-lg transition-colors">Edit</button>
                <button className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-500/10 rounded-lg transition-colors">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}