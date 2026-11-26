import React from 'react';
import {
  LayoutDashboard,
  Camera,
  MessageSquareText,
  Database,
  Cpu,
  BarChart3,
  History,
  Volume2
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  classesCount?: number;
  modelReady?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  classesCount = 26,
  modelReady = false
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Recognition', icon: Camera, badge: 'LIVE' },
    { id: 'sentence', label: 'Sentence Builder', icon: MessageSquareText },
    { id: 'dataset', label: 'Dataset Explorer', icon: Database },
    { id: 'speech', label: 'Speech Settings', icon: Volume2 },
  ];

  return (
    <aside className="w-64 bg-[#0B0F19] border-r border-gray-800/80 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)]">
      {/* Navigation Links */}
      <div className="p-4 space-y-1">
        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Model & System Status Card at Bottom */}
      <div className="p-4 m-3 rounded-2xl bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800/80 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-300">Active Model</span>
          <span className={`w-2 h-2 rounded-full ${modelReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </div>
        <p className="text-xs font-bold text-white truncate">
          ASL 3-Stage CNN
        </p>
        <div className="mt-2.5 pt-2.5 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
          <span>Alphabet Classes</span>
          <span className="font-semibold text-blue-400">{classesCount} Gestures</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
          <span>Architecture</span>
          <span className="font-mono text-gray-300">16-32-64 CNN</span>
        </div>
      </div>
    </aside>
  );
};
