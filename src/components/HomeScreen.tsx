import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  ArrowRight,
  Star,
  Bookmark,
  ShieldCheck,
  Building2,
  Factory,
  Store,
  Navigation,
  Tag,
  Map as MapIcon,
  Search,
  Award,
  Clock,
  Utensils,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MOCK_CATEGORIES, VIZAG_AREAS, BUSINESS_SCALES } from '../data/mockData';
import { BusinessScale } from '../types';
import { BusinessContactActions } from './BusinessContactActions';
import { TRANSLATIONS } from '../data/translations';
import { TourismSection } from './TourismSection';
import { VizagLiveSection } from './VizagLiveSection';

export const HomeScreen: React.FC = () => {
  const {
    approvedBusinesses,
    isLoadingBusinesses,
    listingQuota,
    recentlyViewedIds,
    selectedArea,
    setSelectedArea,
    setSelectedScale,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    setActiveTab,
    toggleSaveBusiness,
    isBusinessSaved,
    openBusinessModal,
    triggerAiPrompt,
    setIsRegisterModalOpen,
    language,
    customerLocation,
    requestCustomerLocation,
    isLocatingCustomer,
    getBusinessDistanceKm,
  } = useApp();

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [activeScaleTab, setActiveScaleTab] = useState<BusinessScale | 'All Scales'>('All Scales');

  // Filter approved businesses
  const filteredBusinesses = approvedBusinesses.filter((biz) => {
    const matchesArea = selectedArea === 'All Areas in Vizag' || biz.area === selectedArea;
    const matchesScale = activeScaleTab === 'All Scales' || biz.scale === activeScaleTab;
    return matchesArea && matchesScale;
  });

  // Recently added businesses sorted newest first
  const recentlyAddedBusinesses = [...approvedBusinesses]
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    .slice(0, 4);

  // Best-rated businesses (>= 4 stars or reviewed)
  const bestRatedBusinesses = [...approvedBusinesses]
    .filter((b) => (b.rating || 0) > 0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  // Popular food & agro/restaurants
  const foodBusinesses = approvedBusinesses
    .filter((b) => b.category === 'agro-coffee' || b.category === 'seafood-coldchain')
    .slice(0, 4);

  // Recently viewed businesses
  const recentlyViewedBusinesses = recentlyViewedIds
    .map((id) => approvedBusinesses.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .slice(0, 4);

  // Nearby businesses when GPS location is available
  const nearbyBusinesses = customerLocation
    ? [...approvedBusinesses]
        .map((biz) => ({
          ...biz,
          distanceKm: getBusinessDistanceKm(biz),
        }))
        .filter((biz) => biz.distanceKm !== null)
        .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
    : [];

  // Active offers across approved businesses
  const activeOffers = approvedBusinesses.flatMap((b) =>
    (b.offers || []).map((offer) => ({
      ...offer,
      business: b,
    }))
  );

  // Category counts computed dynamically from live approved businesses
  const categoryLiveCount = (catId: string) =>
    approvedBusinesses.filter((b) => b.category === catId).length;

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveTab('directory');
  };

  return (
    <div className="pb-24 pt-2 space-y-6">
      {/* Official Brand & First-100 Free Listings Banner */}
      <div className="px-4">
        <div className="bg-gradient-to-r from-blue-50 via-white to-sky-50 rounded-2xl p-3 sm:p-4 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-white p-1 shadow-xs border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_6.03.22_PM_cdf1fa93.jpeg"
                alt="VizagConnect"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-extrabold text-[#0f2b48]">
                  Vizag<span className="text-[#0084d6]">Connect</span>
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                  Visakhapatnam Super App
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  {listingQuota.remainingFreeSlots}/{listingQuota.maxFreeListings} Free Founding Slots Left
                </span>
              </div>
              <p className="text-xs font-semibold text-blue-800 mt-0.5">{t.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className="text-[11px] font-bold text-blue-900 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs flex items-center gap-1 shrink-0"
            >
              <MapIcon className="w-3.5 h-3.5 text-blue-700" />
              <span>Explore on Map</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className="text-[11px] font-bold text-white bg-blue-900 hover:bg-blue-800 flex items-center gap-1 px-3 py-1.5 rounded-xl shadow-2xs shrink-0"
            >
              <span>All Listings</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Animated Modern Blue-and-White Hero Banner with Search & Location Selector */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-teal-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden border border-blue-400/20">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-white/15 text-teal-200 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-white/20">
              <Factory className="w-3.5 h-3.5 text-teal-300" />
              <span>Visakhapatnam’s Local Discovery &amp; Commerce Platform</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Discover Local Shops, Manufacturers, Services &amp; Vizag Tourism
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              From neighborhood shops and handloom weavers to steel plants and pharma parks — verify real contacts, compare listed prices, book appointments, and explore Visakhapatnam.
            </p>

            {/* Unified Search + Locality Form */}
            <form
              onSubmit={handleHeroSearch}
              className="bg-white rounded-2xl p-1.5 shadow-lg flex flex-col sm:flex-row gap-1.5 text-slate-800"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm bg-transparent focus:outline-hidden text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Select Visakhapatnam Area"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 max-w-[165px]"
                >
                  {VIZAG_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedScale('Large Manufacturing Factory');
                  setActiveTab('directory');
                }}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Factory className="w-3.5 h-3.5" />
                <span>Factories</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedScale('Small Business');
                  setActiveTab('directory');
                }}
                className="bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-white/20 transition-all"
              >
                <Store className="w-3.5 h-3.5 text-teal-300" />
                <span>Local Shops</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className="bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Explore on Map</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EXPLORE VIZAG TOURISM SECTION (Directly below main search area) */}
      <TourismSection />

      {/* VIZAG AI Assistant Card (Vizag First + General AI Second) */}
      <div className="px-4">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-teal-900 text-white rounded-3xl p-4 sm:p-5 shadow-md border border-teal-400/30">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-8 h-8 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center border border-teal-300/30">
                  <Sparkles className="w-4 h-4 text-teal-300" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Vizag AI — Your AI. Your City. Your World.
                </h3>
              </div>
              <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
                Ask about Visakhapatnam businesses, tourist spots, products, and city services in Telugu, Hindi, or English — or ask any general question about science, coding, education, or life.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className="shrink-0 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all"
            >
              <span>Open Vizag AI</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {[
              'Best beaches & museums to visit in Vizag today',
              'Approved steel & fabrication suppliers in Gajuwaka',
              'Seafood wholesale cold storage at Fishing Harbour',
              'Explain how solar net metering works for homes',
            ].map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => triggerAiPrompt(prompt)}
                className="whitespace-nowrap bg-white/10 hover:bg-white/20 text-teal-100 text-[11px] px-3 py-1 rounded-full border border-white/15 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VIZAGCONNECT LIVE (Real-Time City Events, Offers & Recent Launches) */}
      <VizagLiveSection />

      {/* Today's Offers Highlight */}
      {activeOffers.length > 0 && (
        <div className="px-4">
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-teal-600 rounded-3xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 font-extrabold text-sm sm:text-base">
                <Tag className="w-4 h-4 text-amber-200" />
                <span>{t.offers}</span>
              </div>
              <span className="text-[10px] bg-white/20 font-bold px-2 py-0.5 rounded-full">
                {activeOffers.length} Active
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeOffers.slice(0, 2).map((offer) => (
                <div
                  key={offer.id}
                  onClick={() => openBusinessModal(offer.business)}
                  className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 cursor-pointer border border-white/20 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                      {offer.business.name}
                    </span>
                    <h5 className="font-extrabold text-xs sm:text-sm text-white truncate">
                      {offer.title}
                    </h5>
                    <p className="text-[11px] text-white/80 line-clamp-1">{offer.description}</p>
                  </div>
                  {offer.discountBadge && (
                    <div className="bg-amber-300 text-slate-950 font-black text-xs px-2.5 py-1 rounded-xl shrink-0">
                      {offer.discountBadge}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recently Viewed Businesses */}
      {recentlyViewedBusinesses.length > 0 && (
        <div className="px-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>{t.recentlyViewed}</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {recentlyViewedBusinesses.map((biz) => (
              <div
                key={biz.id}
                onClick={() => openBusinessModal(biz)}
                className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3 cursor-pointer hover:border-blue-400 transition-all shadow-2xs"
              >
                <img
                  src={biz.imageUrl}
                  alt={biz.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-100"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 truncate">{biz.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{biz.area}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Businesses Section (GPS Distance Engine) */}
      <div className="px-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-700" />
                <h3 className="font-extrabold text-slate-900 text-base">{t.nearbyShops}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {customerLocation
                  ? 'Sorted by exact distance from your current Visakhapatnam GPS location'
                  : 'Enable location to see closest verified shops, restaurants, and factories in km'}
              </p>
            </div>

            <button
              type="button"
              onClick={requestCustomerLocation}
              disabled={isLocatingCustomer}
              className={`self-start sm:self-auto text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
                customerLocation
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-blue-900 hover:bg-blue-800 text-white'
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocatingCustomer ? 'animate-spin' : ''}`} />
              <span>
                {customerLocation
                  ? 'GPS Active'
                  : isLocatingCustomer
                  ? t.detectingLocation
                  : t.nearMe}
              </span>
            </button>
          </div>

          {customerLocation && nearbyBusinesses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {nearbyBusinesses.slice(0, 4).map((biz) => (
                <div
                  key={biz.id}
                  onClick={() => openBusinessModal(biz)}
                  className="bg-slate-50 hover:bg-blue-50/50 rounded-2xl p-3 border border-slate-200/80 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex gap-3">
                    <img
                      src={biz.imageUrl}
                      alt={biz.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-100/70 px-2 py-0.2 rounded">
                          {biz.scale}
                        </span>
                        {biz.distanceKm !== null && (
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                            {biz.distanceKm} {t.kmAway}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate mt-1">
                        {biz.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">{biz.area}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-slate-800">
                        {biz.rating && biz.rating > 0 ? biz.rating.toFixed(1) : 'New'}
                      </span>
                    </div>
                    <BusinessContactActions business={biz} variant="card" />
                  </div>
                </div>
              ))}
            </div>
          ) : !customerLocation ? (
            <div className="bg-slate-50 rounded-2xl p-4 text-center border border-dashed border-slate-300">
              <p className="text-xs text-slate-600 font-medium">
                Tap <strong>"{t.nearMe}"</strong> to discover nearby Vizag shops and factories sorted by distance.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Curated Discovery Highlights: Best-Rated & Culinary/Food */}
      {(bestRatedBusinesses.length > 0 || foodBusinesses.length > 0 || recentlyAddedBusinesses.length > 0) && (
        <div className="px-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestRatedBusinesses.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Best-Rated Services &amp; Shops</span>
              </h3>
              <div className="space-y-2">
                {bestRatedBusinesses.map((biz) => (
                  <div
                    key={biz.id}
                    onClick={() => openBusinessModal(biz)}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={biz.imageUrl} alt={biz.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{biz.name}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{biz.area}</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-amber-600 flex items-center gap-0.5 shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {biz.rating.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {foodBusinesses.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-teal-600" />
                <span>Food, Coffee &amp; Coastal Agro</span>
              </h3>
              <div className="space-y-2">
                {foodBusinesses.map((biz) => (
                  <div
                    key={biz.id}
                    onClick={() => openBusinessModal(biz)}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 hover:bg-teal-50/50 cursor-pointer border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={biz.imageUrl} alt={biz.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{biz.name}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{biz.area}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded shrink-0">
                      {biz.categoryLabel.split(',')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scale Filter & Featured Verified Businesses Grid */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Verified Businesses &amp; Manufacturers in Visakhapatnam
            </h3>
            <p className="text-xs text-slate-500">
              Browse by scale — from local neighborhood shops to major factories
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {BUSINESS_SCALES.map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setActiveScaleTab(scale as BusinessScale | 'All Scales')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeScaleTab === scale
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
              }`}
            >
              {scale}
            </button>
          ))}
        </div>

        {isLoadingBusinesses ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((skeleton) => (
              <div
                key={skeleton}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                </div>
                <div className="h-8 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : approvedBusinesses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 text-center shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-700">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="max-w-xl mx-auto space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {listingQuota.remainingFreeSlots} of 100 Founding Free Listings Remaining
              </span>
              <h4 className="text-lg sm:text-xl font-black text-slate-900">
                Be Among the First 100 Verified Vizag Businesses
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Register your Visakhapatnam shop, clinic, service center, or factory with verified phone, WhatsApp, product catalog, and pinned Google Maps location.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-gradient-to-r from-blue-900 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>{t.listBusiness}</span>
            </button>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-base">No businesses match this scale or area</h4>
            <button
              type="button"
              onClick={() => {
                setSelectedArea('All Areas in Vizag');
                setActiveScaleTab('All Scales');
              }}
              className="bg-blue-900 text-white font-bold px-4 py-2 rounded-xl text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBusinesses.map((biz) => {
              const isSaved = isBusinessSaved(biz.id);
              return (
                <div
                  key={biz.id}
                  onClick={() => openBusinessModal(biz)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            biz.scale === 'Large Manufacturing Factory'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : biz.scale === 'Medium Enterprise'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {biz.scale}
                        </span>
                        <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                          {biz.categoryLabel}
                        </span>
                        {biz.freeListingEligible && (
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Free #{biz.freeListingNumber}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleSaveBusiness(biz.id);
                        }}
                        aria-label={isSaved ? 'Remove from Favourites' : 'Save to Favourites'}
                        className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-700 text-blue-700' : ''}`} />
                      </button>
                    </div>

                    <div className="mt-3 flex gap-3.5">
                      <img
                        src={biz.imageUrl}
                        alt={biz.name}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 bg-slate-100"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1">
                            {biz.name}
                          </h4>
                          {biz.verified && <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />}
                        </div>
                        {biz.teluguName && (
                          <p className="text-[11px] text-slate-500 font-medium truncate">{biz.teluguName}</p>
                        )}
                        <p className="text-xs text-slate-600 font-medium line-clamp-1 mt-0.5">{biz.tagline}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-blue-700 shrink-0" />
                            {biz.area}
                          </p>
                          {getBusinessDistanceKm(biz) !== null && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              <Navigation className="w-2.5 h-2.5 text-teal-600" />
                              {getBusinessDistanceKm(biz)} {t.kmAway}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="text-slate-800">
                            {biz.rating && biz.rating > 0 ? biz.rating.toFixed(1) : 'New'}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            ({biz.reviewCount || (biz.reviews ? biz.reviews.length : 0)} {t.reviews})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {biz.products && biz.products.length > 0
                          ? `Catalog Highlights (${biz.products.length} items):`
                          : 'Core Offerings:'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(biz.products && biz.products.length > 0
                          ? biz.products.slice(0, 3).map((p) => `${p.name} • ₹${p.price}`)
                          : biz.keyOfferings.slice(0, 3)
                        ).map((item, idx) => (
                          <span
                            key={idx}
                            className="bg-white text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200 truncate"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Est. {biz.establishedYear} • {biz.businessHours.split('(')[0]}
                    </span>
                    <BusinessContactActions business={biz} variant="card" showInquire={true} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Popular Business Sectors */}
      <div className="space-y-3">
        <div className="px-4 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">{t.exploreCategories}</h3>
            <p className="text-xs text-slate-500">From coastal crafts to industrial fabrication</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className="text-xs font-semibold text-blue-700 hover:underline"
          >
            Browse All ({MOCK_CATEGORIES.length})
          </button>
        </div>

        <div className="px-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MOCK_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setActiveTab('directory');
              }}
              className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 text-left transition-all hover:shadow-xs group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-2 group-hover:bg-blue-900 group-hover:text-white transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{cat.name}</h4>
              <p className="text-[10px] text-teal-700 font-semibold">{cat.teluguName}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {categoryLiveCount(cat.id)} verified listings
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Free Listing Callout */}
      <div className="px-4">
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-teal-950 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-teal-500/20">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              {t.freeListingBanner} • Zero Commission
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">
              Own a Shop, Restaurant, Service, or Factory in Vizag?
            </h3>
            <p className="text-xs text-slate-300 max-w-lg">
              Publish your verified business profile, product prices, offers, and appointment slots to reach customers across Visakhapatnam.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="shrink-0 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4" />
            <span>List Your Business</span>
          </button>
        </div>
      </div>
    </div>
  );
};
