import React from 'react';
import { Home, Compass, Map as MapIcon, Bookmark, User } from 'lucide-react';
import { useApp, NavTab } from '../context/AppContext';
import { TRANSLATIONS } from '../data/translations';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, savedBusinesses, language } = useApp();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    {
      id: 'home',
      label: t.home,
      icon: Home,
    },
    {
      id: 'directory',
      label: t.explore,
      icon: Compass,
    },
    {
      id: 'map',
      label: t.map,
      icon: MapIcon,
    },
    {
      id: 'saved',
      label: t.favourites,
      icon: Bookmark,
      badge: savedBusinesses.length > 0 ? savedBusinesses.length : undefined,
    },
    {
      id: 'profile',
      label: t.profile,
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-lg mx-auto px-2 py-1 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative min-h-[44px] min-w-[56px] flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all focus:outline-hidden ${
                isActive
                  ? 'text-blue-900 font-bold'
                  : 'text-slate-500 hover:text-blue-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'text-blue-700 stroke-[2.4] scale-105' : 'text-slate-500 stroke-[1.8]'
                  }`}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-teal-600 text-white text-[9px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                  isActive ? 'text-blue-900 font-extrabold' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-700 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
