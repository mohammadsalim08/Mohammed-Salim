import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Bookmark,
  Building2,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  X,
  Factory,
  Bell,
  Languages,
  Navigation,
  UserCheck,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VIZAG_AREAS } from '../data/mockData';
import { TRANSLATIONS } from '../data/translations';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedArea,
    setSelectedArea,
    searchQuery,
    setSearchQuery,
    savedBusinesses,
    currentUser,
    setIsAuthModalOpen,
    setIsRegisterModalOpen,
    setIsSupportModalOpen,
    language,
    setLanguage,
    userRoleMode,
    setUserRoleMode,
    customerLocation,
    requestCustomerLocation,
    isLocatingCustomer,
    unreadNotificationsCount,
    setIsNotificationsModalOpen,
  } = useApp();

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [showPlatformInfo, setShowPlatformInfo] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'directory') {
      setActiveTab('directory');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        {/* Top Area & Scale Announcement Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-teal-900 text-white px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            {/* Vizag Area Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="relative">
                <button
                  onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
                  className="flex items-center gap-1 font-medium hover:text-teal-200 transition-colors py-0.5 px-2 rounded-md hover:bg-white/10"
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-300 animate-pulse shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-none">
                    {selectedArea === 'All Areas in Vizag' ? 'All Visakhapatnam' : selectedArea}
                  </span>
                  <ChevronDown className="w-3 h-3 text-teal-300 shrink-0" />
                </button>

                {/* Area Dropdown */}
                {isAreaDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsAreaDropdownOpen(false)}
                    />
                    <div className="absolute left-0 mt-1.5 w-64 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Select Visakhapatnam Area
                      </div>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
                        {VIZAG_AREAS.map((area) => (
                          <button
                            key={area}
                            onClick={() => {
                              setSelectedArea(area);
                              setIsAreaDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-teal-50 hover:text-teal-700 transition-colors ${
                              selectedArea === area ? 'font-semibold text-teal-700 bg-teal-50/70' : 'text-slate-700'
                            }`}
                          >
                            <span className="truncate">{area}</span>
                            {selectedArea === area && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 📍 GPS Near Me Button */}
              <button
                onClick={requestCustomerLocation}
                disabled={isLocatingCustomer}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-all border ${
                  customerLocation
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                    : isLocatingCustomer
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-teal-200'
                }`}
                title="Detect my current location in Visakhapatnam"
              >
                <Navigation className={`w-3 h-3 ${isLocatingCustomer ? 'animate-spin' : ''}`} />
                <span className="truncate">
                  {customerLocation
                    ? `GPS: ${selectedArea === 'All Areas in Vizag' ? 'Vizag Active' : selectedArea}`
                    : isLocatingCustomer
                    ? 'Detecting...'
                    : t.nearMe}
                </span>
                {customerLocation && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            </div>

            {/* Language Switcher, Role Mode, Admin Console & Registration */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}
                className="flex items-center gap-1 text-[11px] font-bold bg-teal-400/20 hover:bg-teal-400/30 text-teal-200 border border-teal-400/30 px-2 py-0.5 rounded transition-colors"
                title="Switch Language / భాషను మార్చండి"
              >
                <Languages className="w-3 h-3 text-teal-300" />
                <span>{language === 'en' ? 'తెలుగు' : 'English'}</span>
              </button>

              <button
                onClick={() => {
                  const newMode = userRoleMode === 'customer' ? 'owner' : 'customer';
                  setUserRoleMode(newMode);
                  if (newMode === 'owner') {
                    setActiveTab('owner');
                  } else if (activeTab === 'owner') {
                    setActiveTab('home');
                  }
                }}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                  userRoleMode === 'owner' || activeTab === 'owner'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="Switch between Customer & Shop Owner portal"
              >
                {userRoleMode === 'owner' || activeTab === 'owner' ? (
                  <>
                    <Building2 className="w-3 h-3 text-slate-950" />
                    <span className="hidden sm:inline">{t.ownerPortal}</span>
                    <span className="sm:hidden">Owner</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3 h-3 text-teal-300" />
                    <span className="hidden sm:inline">{t.customerView}</span>
                    <span className="sm:hidden">Customer</span>
                  </>
                )}
              </button>

              {currentUser?.isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                    activeTab === 'admin'
                      ? 'bg-teal-400 text-slate-950'
                      : 'bg-teal-500/25 text-teal-200 border border-teal-400/40 hover:bg-teal-500/40'
                  }`}
                  title="Open VizagConnect Admin Console"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span className="hidden sm:inline">{t.adminPortal}</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              )}

              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="text-[11px] hidden sm:flex items-center gap-1 font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-0.5 rounded shadow-2xs transition-all"
              >
                <Factory className="w-3 h-3" />
                <span>{t.listBusiness}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Header Bar */}
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          {/* Official Logo & Tagline */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
          >
            <div className="h-10 sm:h-12 w-10 sm:w-12 rounded-xl bg-white p-0.5 shadow-xs border border-slate-200/90 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform shrink-0">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_6.03.22_PM_cdf1fa93.jpeg"
                alt="VizagConnect"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-2xl font-black tracking-tight text-[#0f2b48]">
                  Vizag<span className="text-[#0084d6]">Connect</span>
                </span>
                <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 rounded">
                  CITY SUPER APP
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-600 -mt-0.5 tracking-tight flex items-center gap-1">
                <span className="text-teal-500 font-bold hidden sm:inline">—</span>
                <span>{t.tagline}</span>
                <span className="text-teal-500 font-bold hidden sm:inline">—</span>
              </p>
            </div>
          </div>

          {/* Search Bar (Desktop / Tablet) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md mx-4 relative"
          >
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-full py-2 pl-10 pr-24 text-xs lg:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-700 to-teal-600 hover:from-blue-800 hover:to-teal-700 text-white text-xs font-semibold px-3 py-1 rounded-full transition-all"
            >
              Search
            </button>
          </form>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Ask VIZAG AI City Assistant */}
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeTab === 'ai'
                  ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                  : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100/80'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="hidden sm:inline">Ask</span>
              <span>VIZAG AI</span>
            </button>

            {/* Support & FAQ */}
            <button
              onClick={() => setIsSupportModalOpen(true)}
              aria-label="Help and Support"
              className="p-2 rounded-xl text-slate-700 hover:text-blue-800 hover:bg-blue-50 transition-colors"
              title="Help, FAQ & WhatsApp Support"
            >
              <HelpCircle className="w-5 h-5 text-blue-900" />
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => setIsNotificationsModalOpen(true)}
              aria-label="Notifications"
              className="relative p-2 rounded-xl text-slate-700 hover:text-teal-700 hover:bg-teal-50 transition-colors"
              title="City Offers & Business Notifications"
            >
              <Bell className="w-5 h-5 text-blue-900" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Saved Bookmarks */}
            <button
              onClick={() => setActiveTab('saved')}
              aria-label="Favourites"
              className={`relative p-2 rounded-xl transition-colors border ${
                activeTab === 'saved'
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'text-slate-700 hover:text-teal-700 hover:bg-teal-50 border-transparent'
              }`}
              title="Saved Local Businesses & Contacts"
            >
              <Bookmark className="w-5 h-5 text-blue-900" />
              {savedBusinesses.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {savedBusinesses.length}
                </span>
              )}
            </button>

            {/* Profile / Sign In */}
            <button
              onClick={() => {
                if (currentUser) {
                  setActiveTab('profile');
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
              className="hidden sm:flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[11px]">
                {currentUser ? currentUser.name.charAt(0) : '?'}
              </div>
              <span className="max-w-[80px] truncate">
                {currentUser ? currentUser.name.split(' ')[0] : 'Sign In'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="md:hidden px-4 pb-2.5 pt-1">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search shops, factories, steel, chemicals, seafood..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-full py-2 pl-9 pr-16 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-blue-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full"
            >
              Go
            </button>
          </form>
        </div>
      </header>

      {/* Platform Info Modal */}
      {showPlatformInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white p-0.5 border border-slate-200 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                  <img 
                    src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_6.03.22_PM_cdf1fa93.jpeg" 
                    alt="VizagConnect" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">VizagConnect</h3>
                  <p className="text-xs font-semibold text-teal-700">Discover Local. Support Local.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPlatformInfo(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <p>
                <strong>VizagConnect</strong> connects the people of Visakhapatnam directly to every corner of city commerce — from neighborhood grocery shops, local bakers, and handloom weavers to large industrial factories and marine engineering shipyards!
              </p>
              <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 border border-slate-200/60">
                <div className="font-semibold text-slate-800 text-[11px]">🏙️ Covering All Areas & Scale:</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li><strong>Heavy Industry & Factories:</strong> RINL Vizag Steel, Hindustan Shipyard, Parawada Pharma City, Autonagar Industrial Fabrication.</li>
                  <li><strong>Small Local Businesses:</strong> Fishing Harbour catch, Araku coffee roasters, Jagadamba silk looms, Daba Gardens electronics, Dwaraka sweets.</li>
                  <li><strong>Direct Connect:</strong> Call, WhatsApp, locate on map, and request business quotes directly without intermediaries.</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowPlatformInfo(false)}
                className="w-full bg-gradient-to-r from-blue-700 to-teal-600 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/20 hover:opacity-95"
              >
                Explore Vizag Local Network
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
