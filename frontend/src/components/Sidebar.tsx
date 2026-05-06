import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity, 
  ShieldAlert, 
  Database, 
  Settings, 
  Map, 
  BrainCircuit, 
  Timeline,
  BarChart3,
  Microscope,
  Stethoscope,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, label: 'Immune Dashboard', path: '/dashboard' },
  { icon: Map, label: 'Cluster Topology', path: '/topology' },
  { icon: Activity, label: 'Cluster Visualization', path: '/visualization' },
  { icon: BrainCircuit, label: 'Pod Intelligence', path: '/intelligence' },
  { icon: Microscope, label: 'Agent Control', path: '/agents' },
  { icon: ShieldAlert, label: 'Threat Detection', path: '/threats' },
  { icon: Database, label: 'Memory Archive', path: '/memory' },
  { icon: Stethoscope, label: 'Self-Healing', path: '/healing' },
  { icon: Timeline, label: 'Event Timeline', path: '/events' },
  { icon: BarChart3, label: 'Agent Analytics', path: '/analytics' },
  { icon: Settings, label: 'System Settings', path: '/settings' },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  return (
    <aside className={cn(
      "w-64 h-screen bg-bio-darker border-r border-white/5 flex flex-col fixed left-0 top-0 z-[60] transition-all duration-500 ease-in-out shadow-[20px_0_50px_rgba(0,0,0,0.5)]",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-bio-green/20 border border-bio-green/40 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-bio-green rounded-full animate-pulse-slow shadow-[0_0_10px_rgba(0,255,128,0.8)]" />
          </div>
          <span className="text-xl font-display font-bold tracking-wider text-white">BIOPODS</span>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              // Close sidebar on navigation for mobile-like feel
              if (window.innerWidth < 1024) setIsOpen(false);
            }}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
              isActive 
                ? "bg-bio-green/10 text-bio-green border border-bio-green/20 shadow-[0_0_15px_rgba(0,255,128,0.05)]" 
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                  isActive && "drop-shadow-[0_0_5px_rgba(0,255,128,0.5)] text-bio-green"
                )} />
                <span className="text-sm font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto border-t border-white/5">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <div className="w-10 h-10 rounded-full bg-bio-green/20 flex items-center justify-center text-bio-green font-bold">
            88
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white uppercase tracking-tighter">System Status</span>
            <span className="text-[10px] text-bio-green animate-pulse">Vitals: Optimal</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
