import { Icon } from "./icon";
import { icons } from "./icons";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeNavLabel?: string;
}

export const Header = ({ sidebarOpen, setSidebarOpen, activeNavLabel }: HeaderProps) => {
  return (
    <header className="h-16 bg-[#0d1221] border-b border-[#1e2943] flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <Icon d={icons.menu} size={20} />
        </button>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <span>Dashboard</span>
          <Icon d={icons.arrow} size={14} />
          <span className="text-white font-medium">{activeNavLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Icon
            d={icons.search}
            size={16}
            className="text-slate-500 absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            placeholder="Search…"
            className="bg-[#141928] border border-[#1e2943] text-slate-300 text-sm pl-9 pr-4 py-2 rounded-xl w-48 focus:outline-none focus:border-violet-500 focus:w-64 transition-all"
          />
        </div>
        <button className="relative w-9 h-9 bg-[#141928] border border-[#1e2943] rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <Icon d={icons.bell} size={17} />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-violet-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
            3
          </span>
        </button>
      </div>
    </header>
  );
};