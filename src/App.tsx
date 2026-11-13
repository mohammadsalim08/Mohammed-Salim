import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { ExploreScreen } from './components/ExploreScreen';
import { MapScreen } from './components/MapScreen';
import { AiAssistantScreen } from './components/AiAssistantScreen';
import { FavouritesScreen } from './components/FavouritesScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { ShopOwnerDashboard } from './components/ShopOwnerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { BusinessDetailModal } from './components/BusinessDetailModal';
import { InquiryModal } from './components/InquiryModal';
import { AppointmentModal } from './components/AppointmentModal';
import { ReportModal } from './components/ReportModal';
import { SupportFaqModal } from './components/SupportFaqModal';
import { AuthModal } from './components/AuthModal';
import { RegisterBusinessModal } from './components/RegisterBusinessModal';
import { NotificationsModal } from './components/NotificationsModal';
import { Smartphone, Monitor, Sparkles } from 'lucide-react';
import { initCapacitorNativeShell } from './lib/capacitor';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

const MainAppContent: React.FC<{ mapsQuotaExceeded: boolean }> = ({ mapsQuotaExceeded }) => {
  const {
    activeTab,
    setActiveTab,
    toastMessage,
    selectedBusinessForModal,
    closeBusinessModal,
    inquiryModalBusiness,
    closeInquiryModal,
    appointmentModalBusiness,
    closeAppointmentModal,
    reportModalTarget,
    closeReportModal,
    isSupportModalOpen,
    setIsSupportModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isRegisterModalOpen,
    setIsRegisterModalOpen,
    isNotificationsModalOpen,
    setIsNotificationsModalOpen,
  } = useApp();
  const [deviceFrameMode, setDeviceFrameMode] = useState<'responsive' | 'mobile'>('responsive');

  useEffect(() => {
    let unsub: (() => void) | undefined;
    void initCapacitorNativeShell(() => {
      if (selectedBusinessForModal) {
        closeBusinessModal();
        return true;
      }
      if (inquiryModalBusiness) {
        closeInquiryModal();
        return true;
      }
      if (appointmentModalBusiness) {
        closeAppointmentModal();
        return true;
      }
      if (reportModalTarget) {
        closeReportModal();
        return true;
      }
      if (isSupportModalOpen) {
        setIsSupportModalOpen(false);
        return true;
      }
      if (isNotificationsModalOpen) {
        setIsNotificationsModalOpen(false);
        return true;
      }
      if (isRegisterModalOpen) {
        setIsRegisterModalOpen(false);
        return true;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return true;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    }).then((fn) => {
      unsub = fn;
    });
    return () => {
      if (unsub) unsub();
    };
  }, [
    activeTab,
    selectedBusinessForModal,
    inquiryModalBusiness,
    appointmentModalBusiness,
    reportModalTarget,
    isSupportModalOpen,
    isNotificationsModalOpen,
    isRegisterModalOpen,
    isAuthModalOpen,
  ]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <div className="hidden lg:flex items-center justify-between px-6 py-1.5 bg-slate-900 text-slate-300 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>VizagConnect • Discover Local. Support Local. • Visakhapatnam Super App</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">View Mode:</span>
          <button
            type="button"
            onClick={() => setDeviceFrameMode('responsive')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              deviceFrameMode === 'responsive' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:text-white'
            }`}
          >
            <Monitor className="w-3 h-3" />
            <span>Responsive Web</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceFrameMode('mobile')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              deviceFrameMode === 'mobile' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Mobile-First Frame</span>
          </button>
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col w-full mx-auto bg-slate-50 min-h-screen transition-all ${
          deviceFrameMode === 'mobile'
            ? 'max-w-md my-4 shadow-2xl rounded-3xl border border-slate-300/80 overflow-hidden'
            : 'max-w-6xl'
        }`}
      >
        <Header />

        <main className="flex-1 w-full">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'directory' && <ExploreScreen />}
          {activeTab === 'map' && <MapScreen />}
          {activeTab === 'ai' && <AiAssistantScreen />}
          {activeTab === 'saved' && <FavouritesScreen />}
          {activeTab === 'profile' && <ProfileScreen />}
          {activeTab === 'owner' && <ShopOwnerDashboard />}
          {activeTab === 'admin' && <AdminDashboard />}
        </main>

        {/* Floating Vizag AI Launcher when on primary tabs */}
        {activeTab !== 'ai' && activeTab !== 'owner' && activeTab !== 'admin' && (
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            aria-label="Ask Vizag AI"
            className="fixed bottom-20 right-4 z-30 bg-gradient-to-r from-blue-900 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <Sparkles className="w-4 h-4 text-teal-200" />
            <span>Vizag AI</span>
          </button>
        )}

        {activeTab !== 'owner' && activeTab !== 'admin' && <BottomNav />}

        {/* Modals */}
        <BusinessDetailModal />
        <InquiryModal />
        <AppointmentModal />
        <ReportModal />
        <SupportFaqModal />
        <AuthModal />
        <RegisterBusinessModal />
        <NotificationsModal />

        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700/50 animate-in fade-in zoom-in-95 duration-150">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const appTree = (
    <AppProvider>
      <MainAppContent mapsQuotaExceeded={mapsQuotaExceeded} />
    </AppProvider>
  );

  if (!MAPS_API_KEY) {
    return appTree;
  }

  return (
    <APIProvider
      apiKey={MAPS_API_KEY}
      language="en"
      region="IN"
      libraries={['marker', 'places']}
    >
      {appTree}
    </APIProvider>
  );
}
