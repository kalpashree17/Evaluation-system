import { useState } from "react";
import { Icon } from "../components/icon";
import { icons } from "../components/icons";
// import { SectionHeader } from "../components/common";

interface Subject {
  id: number;
  name: string;
  questions: number;
  difficulty: string;
  duration: string;
  totalMarks: number;
  tags: string[];
}

const subjects: Subject[] = [
  { id: 1, name: "React", questions: 85, difficulty: "Mixed", duration: "60 min", totalMarks: 100, tags: ["frontend", "javascript"] },
  { id: 2, name: "Node.js", questions: 64, difficulty: "Mixed", duration: "60 min", totalMarks: 100, tags: ["backend", "javascript"] },
  { id: 3, name: "DSA", questions: 120, difficulty: "Mixed", duration: "90 min", totalMarks: 150, tags: ["algorithms", "data-structures"] },
  { id: 4, name: "DBMS", questions: 48, difficulty: "Mixed", duration: "45 min", totalMarks: 80, tags: ["database", "sql"] },
  { id: 5, name: "Python", questions: 72, difficulty: "Mixed", duration: "60 min", totalMarks: 100, tags: ["scripting", "ml"] },
  { id: 6, name: "Java", questions: 90, difficulty: "Mixed", duration: "75 min", totalMarks: 120, tags: ["oop", "enterprise"] },
];

export default function Subjects() {
  const [selected, setSelected] = useState<number | null>(null);
  const colors = [
    "from-violet-500 to-indigo-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-pink-500 to-rose-500",
    "from-red-500 to-orange-500",
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl font-bold">Subject Management</h1>
          <p className="text-slate-400 mt-1">Manage interview subjects and their configurations</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">
          <Icon d={icons.plus} size={16} />New Subject
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {subjects.map((s, i) => (
          <div key={s.id} onClick={() => setSelected(selected === s.id ? null : s.id)}
            className={`bg-[#141928] border rounded-2xl p-6 cursor-pointer transition-all hover:border-violet-500/50 ${selected === s.id ? "border-violet-500" : "border-[#1e2943]"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${colors[i % colors.length]} flex items-center justify-center`}>
                <Icon d={icons.subject} size={22} className="text-white" />
              </div>
              <span className="text-slate-400 text-xs bg-[#0f1623] px-2 py-1 rounded-lg">{s.duration}</span>
            </div>
            <h3 className="text-white font-bold text-lg">{s.name}</h3>
            <p className="text-slate-400 text-sm mt-1">{s.questions} questions · {s.totalMarks} marks</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {s.tags.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">{t}</span>
              ))}
            </div>
            {selected === s.id && (
              <div className="mt-4 pt-4 border-t border-[#1e2943] grid grid-cols-2 gap-3">
                <button className="text-sm text-violet-400 hover:text-violet-300 font-medium">Edit Subject</button>
                <button className="text-sm text-blue-400 hover:text-blue-300 font-medium">View Questions</button>
                <button className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">Add Questions</button>
                <button className="text-sm text-red-400 hover:text-red-300 font-medium">Delete</button>
              </div>
            )}
          </div>
        ))}
        {/* Add new card */}
        <div className="bg-[#141928] border border-dashed border-[#1e2943] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-violet-500/50 transition-colors min-h-50">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Icon d={icons.plus} size={22} className="text-violet-400" />
          </div>
          <p className="text-slate-400 font-medium">Add New Subject</p>
        </div>
      </div>
    </div>
  );
}