import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  FileCheck2,
  AlertCircle,
  FileText,
  HelpCircle,
  Activity,
  FileSpreadsheet,
  Sliders,
  ShieldAlert,
  Bot,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Discover Jobs', href: '/jobs', icon: Compass },
  { name: 'Applications', href: '/applications', icon: FileCheck2 },
  { name: 'Pending Actions', href: '/pending-actions', icon: AlertCircle, badgeKey: 'pending' },
  { name: 'Resume Manager', href: '/resume', icon: FileText },
  { name: 'Answer Bank', href: '/answer-bank', icon: HelpCircle },
  { name: 'Agent Activity', href: '/activity', icon: Activity },
  { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
  { name: 'Automation Settings', href: '/settings/automation', icon: Sliders },
];

export const Sidebar = ({ pendingCount = 0 }) => {
  const { isAdmin } = useAuth();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-100 dark:border-slate-800/60">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white leading-none">
              JobPilot <span className="text-indigo-600 dark:text-indigo-400">AI</span>
            </h1>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Autonomous Agent
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badgeKey === 'pending' && pendingCount > 0 && (
                  <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="px-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Administration
              </span>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 mt-1 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Admin Panel</span>
              </NavLink>
            </div>
          )}
        </nav>
      </div>

      {/* System Status Pill */}
      <div className="p-4 m-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Greenhouse & Lever
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Source feeds online • Scheduled daily 8:00 AM IST
        </p>
      </div>
    </aside>
  );
};

