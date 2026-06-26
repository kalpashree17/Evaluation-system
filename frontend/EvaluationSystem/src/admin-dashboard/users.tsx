import { Icon } from "../components/icon";
import { icons } from "../components/icons";
import { Badge, Avatar } from "../components/common";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
}

const users: User[] = [
  { id: 1, name: "Deepak Admin", email: "deepak@company.com", role: "Admin", status: "active", joined: "2024-01-15" },
  { id: 2, name: "Meena Joshi", email: "meena@company.com", role: "Interviewer", status: "active", joined: "2024-02-20" },
  { id: 3, name: "Raj Verma", email: "raj@company.com", role: "Interviewer", status: "active", joined: "2024-03-10" },
  { id: 4, name: "Anita Gupta", email: "anita@company.com", role: "Candidate", status: "pending", joined: "2024-06-01" },
];

export default function Users() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl font-bold">User Management</h1>
          <p className="text-slate-400 mt-1">Manage roles and permissions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">
          <Icon d={icons.plus} size={16} />Invite User
        </button>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { role: "Admin", count: 1, desc: "Full system access", color: "from-violet-500 to-indigo-600", icon: icons.settings },
          { role: "Interviewer", count: 2, desc: "Evaluate & manage interviews", color: "from-blue-500 to-cyan-500", icon: icons.evaluate },
          { role: "Candidate", count: 1, desc: "Attend interviews only", color: "from-emerald-500 to-teal-500", icon: icons.candidate },
        ].map(r => (
          <div key={r.role} className="bg-[#141928] border border-[#1e2943] rounded-2xl p-5">
            <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${r.color} flex items-center justify-center mb-4`}>
              <Icon d={r.icon} size={22} className="text-white" />
            </div>
            <h3 className="text-white font-bold text-lg">{r.role}</h3>
            <p className="text-slate-400 text-sm">{r.desc}</p>
            <p className="text-slate-300 mt-3 font-semibold">{r.count} user{r.count > 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-[#141928] border border-[#1e2943] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e2943] bg-[#0f1623]">
              {["User", "Email", "Role", "Status", "Joined", "Actions"].map(h => (
                <th key={h} className="text-left text-slate-400 text-sm font-semibold px-6 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2236]">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-[#1a2236] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={u.name.split(" ").map(n => n[0]).join("").slice(0, 2)} />
                    <span className="text-white font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">{u.email}</td>
                <td className="px-6 py-4"><Badge status={u.role} /></td>
                <td className="px-6 py-4"><Badge status={u.status} /></td>
                <td className="px-6 py-4 text-slate-400 text-sm">{u.joined}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-xs text-blue-400 px-3 py-1.5 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors">Edit</button>
                    <button className="text-xs text-red-400 px-3 py-1.5 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">Remove</button>
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