// components/navbar.tsx
import { Icon } from "./icon";
import { icons } from "./icons";
import Overview from "../admin-dashboard/overview";
import Subjects from "../admin-dashboard/Subjects";
import QuestionBank from "../admin-dashboard/questionBank";
import Interviews from "../admin-dashboard/interviews";
import Candidates from "../admin-dashboard/candidates";
import Evaluation from "../admin-dashboard/evaluation";
import Analytics from "../admin-dashboard/analytics";
import Users from "../admin-dashboard/users";

// User-specific components
import SubjectsCard from "../user-role/subjects";
// import MyResults from "../user-dashboard/myResults";
// import Practice from "../user-dashboard/practice";

import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/authContext";
import AIInterviewEvaluation from "../user-role/AiPannel";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = 'admin' | 'user';

interface NavbarProps {
  module: string;
  setModule: (module: string) => void;
  sidebarOpen: boolean;
  role?: Role | null;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
  roles?: Role[];
}

// ── Nav config per role ──────────────────────────────────────────────────────

// Admin navigation items
const adminNavItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: "dashboard", component: Overview, roles: ['admin'] },
  { id: "subjects", label: "Subjects", icon: "subject", component: Subjects, roles: ['admin'] },
  { id: "questions", label: "Question Bank", icon: "question", component: QuestionBank, roles: ['admin'] },
  { id: "interviews", label: "Interviews", icon: "interview", component: Interviews, roles: ['admin'] },
  { id: "candidates", label: "Candidates", icon: "candidate", component: Candidates, roles: ['admin'] },
  { id: "evaluation", label: "Evaluation", icon: "evaluate", component: Evaluation, roles: ['admin'] },
  { id: "analytics", label: "Analytics", icon: "analytics", component: Analytics, roles: ['admin'] },
  { id: "users", label: "Users", icon: "users", component: Users, roles: ['admin'] },
];

// User navigation items
const userNavItems: NavItem[] = [
  { id: "subjects", label: "My Subjects", icon: "subject", component: SubjectsCard, roles: ['user'] },
  { id: "practice", label: "Practice", icon: "subject", component: AIInterviewEvaluation, roles: ['user'] },
  // { id: "my-results", label: "My Results", icon: "analytics", component: MyResults, roles: ['user'] },
];

// Get nav items based on role
const getNavItemsForRole = (role?: Role | string | null): NavItem[] => {
  if (!role) return adminNavItems;

  switch (role) {
    case 'admin':
      return adminNavItems;
    case 'user':
      return userNavItems;
    default:
      return adminNavItems;
  }
};

// Get default module for role
const getDefaultModule = (role?: Role | string | null): string => {
  if (!role) return 'overview';

  switch (role) {
    case 'admin':
      return 'overview';
    case 'user':
      return 'practice';
    default:
      return 'overview';
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

export const Navbar = ({ module, setModule, sidebarOpen, role }: NavbarProps) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Fall back to the localStorage-persisted user if context user isn't populated
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const effectiveRole: Role | undefined = role ?? user?.role ?? storedUser?.role;
  const displayName: string = user?.name ?? storedUser?.name ?? 'User';

  // Get nav items based on role
  const navItems = getNavItemsForRole(effectiveRole);

  // Filter nav items based on the effective role
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(effectiveRole as Role);
  });

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Get user initials
  const getUserInitials = () => {
    if (!displayName || displayName === 'User') return 'U';
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get role display name
  const getRoleDisplay = () => {
    if (!effectiveRole) return 'User';
    return effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1);
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
            PrepWise
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
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
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#141928] transition-colors">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {getUserInitials()}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-slate-500 text-xs capitalize">{getRoleDisplay()}</p>
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

export { adminNavItems, userNavItems, getNavItemsForRole, getDefaultModule };