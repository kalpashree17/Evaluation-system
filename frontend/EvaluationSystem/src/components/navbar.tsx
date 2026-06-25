import { Icon } from "./icon";
import { icons } from "./icons";
import Overview from "../dashboard/overview";
import Subjects from "../dashboard/Subjects";
import QuestionBank from "../dashboard/questionBank";
import Interviews from "../dashboard/interviews";
import Candidates from "../dashboard/candidates";
import Evaluation from "../dashboard/evaluation";
import Analytics from "../dashboard/analytics";
import Users from "../dashboard/users";

import { useNavigate } from 'react-router-dom';
// import  Login  from "../auth/login";
import { useAuth } from "../context/authContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavbarProps {
  module: string;
  setModule: (module: string) => void;
  sidebarOpen: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
}

// ── Nav config ────────────────────────────────────────────────────────────────
// Always store component references (no JSX), rendered by the parent layout.

const navItems: NavItem[] = [
  { id: "overview",    label: "Overview",      icon: "dashboard",  component: Overview    },
  { id: "subjects",    label: "Subjects",       icon: "subject",    component: Subjects    },
  { id: "questions",   label: "Question Bank",  icon: "question",   component: QuestionBank },
  { id: "interviews",  label: "Interviews",     icon: "interview",  component: Interviews  },
  { id: "candidates",  label: "Candidates",     icon: "candidate",  component: Candidates  },
  { id: "evaluation",  label: "Evaluation",     icon: "evaluate",   component: Evaluation  },
  { id: "analytics",   label: "Analytics",      icon: "analytics",  component: Analytics   },
  { id: "users",       label: "Users",          icon: "users",      component: Users       },
];

export { navItems };

// ── Component ─────────────────────────────────────────────────────────────────

export const Navbar = ({ module, setModule, sidebarOpen }: NavbarProps)  => {
    const navigate = useNavigate();
    const { logout } = useAuth();

      const handleLogout = () => {
    logout();           // clears token + user from localStorage
    navigate('/login'); // redirect to login page
  };

  return (
    <aside
      className={`${
        sidebarOpen ? "w-64" : "w-16"
      } shrink-0 bg-[#0d1221] border-r border-[#1e2943] flex flex-col transition-all duration-300`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-[#1e2943]">
        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Icon d={icons.star} size={16} className="text-white" />
        </div>
        {sidebarOpen && (
          <span className="text-white font-bold text-lg tracking-tight">
            InterviewIQ
          </span>
        )}
      </div>

      {/* Nav items — plain buttons, no <Link> needed */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setModule(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left
              ${
                module === item.id
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                  : "text-slate-400 hover:text-white hover:bg-[#141928]"
              }`}
          >
            <Icon d={icons[item.icon]} size={18} className="shrink-0" />
            {sidebarOpen && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      
{/* User profile */}
<div className="p-3 border-t border-[#1e2943]">
  <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#141928] transition-colors cursor-pointer">
    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">
      DA
    </div>
    {sidebarOpen && (
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">Deepak Admin</p>
        <p className="text-slate-500 text-xs">Super Admin</p>
      </div>
    )}
    {sidebarOpen && (
      <button
        onClick={handleLogout}
        className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
        title="Logout"
      >
        <Icon d={icons.logout} size={16} />
      </button>
    )}
  </div>
</div>
    </aside>
  );
};