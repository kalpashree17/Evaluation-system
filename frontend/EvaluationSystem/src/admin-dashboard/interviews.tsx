import { Icon } from "../components/icon";
import { icons } from "../components/icons";
import { Badge} from "../components/common";

interface Interview {
  id: number;
  name: string;
  subjects: string[];
  candidates: number;
  duration: string;
  passing: number;
  status: string;
  date: string;
}

const interviews: Interview[] = [
  { id: 1, name: "Frontend Developer Round 1", subjects: ["React", "Node.js"], candidates: 18, duration: "90 min", passing: 70, status: "active", date: "2024-06-12" },
  { id: 2, name: "Backend Engineer Assessment", subjects: ["Node.js", "DBMS"], candidates: 12, duration: "120 min", passing: 65, status: "completed", date: "2024-06-08" },
  { id: 3, name: "Full Stack Interview", subjects: ["React", "Node.js", "DSA"], candidates: 8, duration: "150 min", passing: 75, status: "scheduled", date: "2024-06-15" },
  { id: 4, name: "Data Engineer Test", subjects: ["Python", "DBMS", "DSA"], candidates: 22, duration: "120 min", passing: 60, status: "active", date: "2024-06-11" },
];

export default function Interviews() {
  // const statusColor: Record<string, string> = { 
  //   active: "from-blue-500 to-cyan-500", 
  //   completed: "from-emerald-500 to-teal-500", 
  //   scheduled: "from-violet-500 to-indigo-600" 
  // };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl font-bold">Manage Interviews</h1>
          <p className="text-slate-400 mt-1">Create and manage interview sessions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">
          <Icon d={icons.plus} size={16} />Create Interview
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active", v: 2, c: "from-blue-500 to-cyan-500" }, 
          { label: "Scheduled", v: 1, c: "from-violet-500 to-indigo-600" }, 
          { label: "Completed", v: 1, c: "from-emerald-500 to-teal-500" }
        ].map(s => (
          <div key={s.label} className="bg-[#141928] border border-[#1e2943] rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${s.c} flex items-center justify-center`}>
              <Icon d={icons.interview} size={18} className="text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">{s.label}</p>
              <p className="text-white font-bold text-xl">{s.v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Interview cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {interviews.map(iv => (
          <div key={iv.id} className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6 hover:border-[#2d3f6b] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-bold text-lg">{iv.name}</h3>
                <p className="text-slate-400 text-sm mt-1">{iv.date}</p>
              </div>
              <Badge status={iv.status} />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {iv.subjects.map(s => (
                <span key={s} className="text-xs px-2.5 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">{s}</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[#0f1623] rounded-xl p-3 text-center">
                <p className="text-white font-bold">{iv.candidates}</p>
                <p className="text-slate-500 text-xs">Candidates</p>
              </div>
              <div className="bg-[#0f1623] rounded-xl p-3 text-center">
                <p className="text-white font-bold">{iv.duration}</p>
                <p className="text-slate-500 text-xs">Duration</p>
              </div>
              <div className="bg-[#0f1623] rounded-xl p-3 text-center">
                <p className="text-white font-bold">{iv.passing}%</p>
                <p className="text-slate-500 text-xs">Passing</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 text-sm text-violet-400 hover:text-violet-300 font-medium py-2 bg-violet-500/10 hover:bg-violet-500/20 rounded-xl transition-colors">View Details</button>
              <button className="flex-1 text-sm text-blue-400 hover:text-blue-300 font-medium py-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-colors">Manage</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}