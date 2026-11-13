import React from 'react';
import { X, Bell, Tag, Sparkles, MessageSquare, Check, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const NotificationsModal: React.FC = () => {
  const {
    isNotificationsModalOpen,
    setIsNotificationsModalOpen,
    notifications,
    markNotificationAsRead,
    language,
    setActiveTab,
  } = useApp();

  if (!isNotificationsModalOpen) return null;

  const isTe = language === 'te';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="fixed inset-0" 
        onClick={() => setIsNotificationsModalOpen(false)} 
      />

      <div className="relative bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 z-10 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Bell className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {isTe ? 'నోటిఫికేషన్లు & ఆఫర్లు' : 'Notifications & Updates'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isTe ? 'విశాఖపట్నం తాజా వ్యాపార సమాచారం' : 'Visakhapatnam city commercial news & alerts'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNotificationsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of notifications */}
        <div className="flex-1 overflow-y-auto custom-scrollbar my-3 space-y-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              {isTe ? 'ఎలాంటి కొత్త నోటిఫికేషన్లు లేవు' : 'No notifications yet'}
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markNotificationAsRead(notif.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                    : 'bg-teal-50/40 border-teal-200 text-slate-900 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        notif.read ? 'bg-slate-300' : 'bg-teal-500 animate-pulse'
                      }`}
                    />
                    <h4 className="font-bold text-xs text-slate-900">{notif.title}</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">{notif.date}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 pl-4 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              notifications.forEach((n) => markNotificationAsRead(n.id));
            }}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            {isTe ? 'అన్నీ చదివినట్లుగా గుర్తించండి' : 'Mark all as read'}
          </button>

          <button
            onClick={() => {
              setIsNotificationsModalOpen(false);
              setActiveTab('directory');
            }}
            className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1"
          >
            <span>{isTe ? 'షాపులు అన్వేషించండి' : 'Explore Directory'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
