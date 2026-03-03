import React from 'react';
import {
  LayoutDashboard, Table2, Network, DollarSign, Users, Kanban,
  HeartPulse, Search, Calendar, Settings, Upload, Gauge,
  BarChart3, GitBranch, AlertTriangle, Moon, Sun, Scale,
  LogOut, Cloud, CloudOff, Briefcase
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { usePlanningMode } from '../../hooks/usePlanningMode';
import { useAuth } from '../../contexts/AuthContext';
import type { ViewType } from '../../types';

const views: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'executive', label: 'Dashboard', icon: <Gauge size={14} /> },
  { id: 'orgChart', label: 'Org Chart', icon: <Network size={14} /> },
  { id: 'hiringConsole', label: 'Hiring', icon: <Briefcase size={14} /> },
  { id: 'grid', label: 'Grid', icon: <Table2 size={14} /> },
  { id: 'practiceArea', label: 'Practices', icon: <LayoutDashboard size={14} /> },
  { id: 'revenue', label: 'Revenue', icon: <DollarSign size={14} /> },
  { id: 'teamComposition', label: 'Structure', icon: <Users size={14} /> },
  { id: 'supportBoard', label: 'Support', icon: <Kanban size={14} /> },
  { id: 'practiceScorecard', label: 'Scorecard', icon: <HeartPulse size={14} /> },
  { id: 'gapAnalysis', label: 'Gap Analysis', icon: <BarChart3 size={14} /> },
  { id: 'retentionMatrix', label: 'Retention', icon: <AlertTriangle size={14} /> },
  { id: 'businessLogic', label: 'Rules', icon: <Scale size={14} /> },
];

export function Header() {
  const { activeView, setActiveView, setSearchModalOpen, toggleEventsSidebar, isPlanningMode } = useUIStore();
  const darkMode = useUIStore(s => s.darkMode);
  const toggleDarkMode = useUIStore(s => s.toggleDarkMode);
  const setImportModalOpen = useUIStore(s => s.setImportModalOpen);
  const { isActive, activate, deactivate } = usePlanningMode();
  const { user, signOut, isCloudMode } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#1c2431]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/50">
      {/* Planning mode banner -- calm amber style, no spinning */}
      {isPlanningMode && (
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200/60 dark:border-amber-700/30">
          <Settings size={13} className="text-amber-700 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300 tracking-wide">
            PLANNING MODE — Changes are sandboxed. Live data is unchanged.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between px-5 h-12">
        {/* Logo / Title */}
        <div className="flex items-center gap-3.5 min-w-[210px]">
          <img
            src="/odgers-logo-small.png"
            alt="Odgers Berndtson"
            className="h-7 w-auto"
          />
          <div className="border-l border-gray-200 dark:border-gray-700 pl-3.5">
            <h1 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-tight font-heading tracking-tight">
              Odgers Berndtson US
            </h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight tracking-wide uppercase">
              Workforce Planning
            </p>
          </div>
        </div>

        {/* View Tabs -- Apple-style segmented control */}
        <nav className="flex items-center bg-gray-100/80 dark:bg-gray-800/60 rounded-lg p-0.5 gap-0.5 overflow-x-auto scrollbar-hidden">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={[
                'relative flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all duration-300 ease-in-out whitespace-nowrap',
                activeView === v.id
                  ? 'bg-[#00857C] text-white shadow-sm shadow-[#00857C]/25'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-700/50',
              ].join(' ')}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1 min-w-[210px] justify-end">
          {/* Search */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-700/60 transition-all duration-200"
          >
            <Search size={13} />
            <span className="text-gray-400 dark:text-gray-500">Search</span>
            <kbd className="ml-0.5 text-[9px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-1 py-px rounded font-mono">
              {'\u2318'}K
            </kbd>
          </button>

          {/* Separator */}
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Icon buttons */}
          <button
            onClick={toggleEventsSidebar}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            title="Events & Calendar"
          >
            <Calendar size={15} />
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            title="Import / Export Data"
          >
            <Upload size={15} />
          </button>

          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Separator */}
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Planning mode toggle */}
          <button
            onClick={isActive ? deactivate : activate}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-300',
              isActive
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/50 dark:border-amber-600/30 hover:bg-amber-500/20'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent',
            ].join(' ')}
          >
            <GitBranch size={13} />
            {isActive ? 'Exit Planning' : 'Planning'}
          </button>

          {/* Cloud status indicator */}
          <div
            className="flex items-center gap-1 px-1.5"
            title={
              isCloudMode
                ? `Synced to cloud${user?.email ? ` as ${user.email}` : ''}`
                : 'Running locally'
            }
          >
            {isCloudMode ? (
              <Cloud size={13} className="text-[#00857C]" />
            ) : (
              <CloudOff size={13} className="text-gray-300 dark:text-gray-600" />
            )}
          </div>

          {/* Sign out (only in cloud mode) */}
          {isCloudMode && user && (
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
              title={`Sign out (${user.email})`}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
