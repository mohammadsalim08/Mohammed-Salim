import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Building2,
  Map as MapIcon,
  ShieldCheck,
  Bookmark,
  Layers,
  Star,
  Navigation,
  Tag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VIZAG_AREAS, BUSINESS_SCALES, MOCK_CATEGORIES } from '../data/mockData';
import { BusinessScale } from '../types';
import { BusinessContactActions } from './BusinessContactActions';
import { TRANSLATIONS } from '../data/translations';

export const ExploreScreen: React.FC = () => {
  const {
    approvedBusinesses,
    allApprovedProducts,
    searchQuery,
    setSearchQuery,
    selectedArea,
    setSelectedArea,
    selectedScale,
    setSelectedScale,
    selectedCategory,
    setSelectedCategory,
    toggleSaveBusiness,
    isBusinessSaved,
    openBusinessModal,
    setIsRegisterModalOpen,
    setActiveTab,
    language,
    getBusinessDistanceKm,
  } = useApp();

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [viewMode, setViewMode] = useState<'businesses' | 'products'>('businesses');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortByPriceAsc, setSortByPriceAsc] = useState<boolean>(true);

  const filteredBusinesses = approvedBusinesses.filter((biz) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      biz.name.toLowerCase().includes(q) ||
      (biz.teluguName && biz.teluguName.includes(searchQuery)) ||
      biz.description.toLowerCase().includes(q) ||
      biz.keyOfferings.some((item) => item.toLowerCase().includes(q)) ||
      (biz.products || []).some((p) => p.name.toLowerCase().includes(q)) ||
      biz.area.toLowerCase().includes(q) ||
      biz.categoryLabel.toLowerCase().includes(q);

    const matchesArea = selectedArea === 'All Areas in Vizag' || biz.area === selectedArea;
    const matchesScale = selectedScale === 'All Scales' || biz.scale === selectedScale;
    const matchesCategory = !selectedCategory || biz.category === selectedCategory;
    const matchesRating = minRating === 0 || (biz.rating || 0) >= minRating;

    return matchesSearch && matchesArea && matchesScale && matchesCategory && matchesRating;
  });

  const filteredProducts = allApprovedProducts
    .filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.business.name.toLowerCase().includes(q) ||
        item.business.area.toLowerCase().includes(q);
      const matchesArea = selectedArea === 'All Areas in Vizag' || item.business.area === selectedArea;
      const matchesCategory = !selectedCategory || item.business.category === selectedCategory;
      return matchesSearch && matchesArea && matchesCategory;
    })
    .sort((a, b) => (sortByPriceAsc ? a.price - b.price : b.price - a.price));

  return (
    <div className="pb-24 pt-2 space-y-4">
      {/* Header & Mode Switcher */}
      <div className="px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Explore Visakhapatnam Businesses &amp; Prices
            </h2>
            <p className="text-xs text-slate-500">
              Verified local shops, services, factories, and live listed product prices
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-1 bg-slate-200/70 rounded-2xl border border-slate-300/40">
              <button
                type="button"
                onClick={() => setViewMode('businesses')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'businesses'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Businesses ({filteredBusinesses.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('products')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'products'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-teal-600" />
                <span>{t.priceComparison} ({filteredProducts.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4">
        <div className="relative">
          <input
            type="text"
            placeholder={
              viewMode === 'products'
                ? 'Search real product or service names to compare listed prices across Vizag...'
                : t.searchPlaceholder
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-2xl py-2.5 pl-10 pr-24 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Scale & Rating Filter Row (for Businesses view) */}
      {viewMode === 'businesses' && (
        <div className="px-4 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <Layers className="w-3.5 h-3.5 text-blue-700" />
              <span>Filter by Scale &amp; Rating:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 4, 4.5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setMinRating(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    minRating === r
                      ? 'bg-amber-400 text-slate-950 border-amber-400'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {r === 0 ? 'All Ratings' : `${r}★+`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {BUSINESS_SCALES.map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => setSelectedScale(scale as BusinessScale | 'All Scales')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedScale === scale
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
                }`}
              >
                {scale}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Area Selector */}
      <div className="px-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-600" />
          <span>Visakhapatnam Locality:</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {VIZAG_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setSelectedArea(area)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedArea === area
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Category Chips */}
      <div className="px-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t.allCategories}
          </button>
          {MOCK_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODE 1: BUSINESS DIRECTORY */}
      {viewMode === 'businesses' && (
        <div className="px-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing <strong className="text-slate-900">{filteredBusinesses.length}</strong> verified listings in{' '}
              <span className="text-blue-800 font-bold">{selectedArea}</span>
            </span>

            {(selectedArea !== 'All Areas in Vizag' ||
              selectedScale !== 'All Scales' ||
              selectedCategory ||
              searchQuery ||
              minRating > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedArea('All Areas in Vizag');
                  setSelectedScale('All Scales');
                  setSelectedCategory(null);
                  setSearchQuery('');
                  setMinRating(0);
                }}
                className="text-blue-700 font-bold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          {approvedBusinesses.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-3 shadow-2xs">
              <Building2 className="w-10 h-10 text-blue-700 mx-auto" />
              <h3 className="font-extrabold text-slate-900 text-base">Directory Ready For Verified Listings</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Real Visakhapatnam businesses appear here immediately once reviewed and approved by VizagConnect moderators.
              </p>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs"
              >
                {t.listBusiness}
              </button>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-base">{t.noListings}</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedArea('All Areas in Vizag');
                  setSelectedScale('All Scales');
                  setSelectedCategory(null);
                  setSearchQuery('');
                  setMinRating(0);
                }}
                className="bg-blue-900 text-white font-bold px-4 py-2 rounded-xl text-xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredBusinesses.map((biz) => {
                const isSaved = isBusinessSaved(biz.id);
                const reviewTotal = biz.reviewCount || (biz.reviews ? biz.reviews.length : 0);

                return (
                  <div
                    key={biz.id}
                    onClick={() => openBusinessModal(biz)}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col sm:flex-row gap-4"
                  >
                    <div className="relative w-full sm:w-44 h-36 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                      <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                      <span
                        className={`absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs ${
                          biz.scale === 'Large Manufacturing Factory'
                            ? 'bg-amber-400 text-slate-950'
                            : biz.scale === 'Medium Enterprise'
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {biz.scale}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-black text-base sm:text-lg text-slate-900">{biz.name}</h3>
                              {biz.verified && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.2 rounded border border-teal-200">
                                  <ShieldCheck className="w-3 h-3 text-teal-600" />
                                  {biz.verificationBadge}
                                </span>
                              )}
                            </div>
                            {biz.teluguName && (
                              <p className="text-xs text-slate-500 font-medium">{biz.teluguName}</p>
                            )}
                            <p className="text-xs font-semibold text-blue-800 mt-0.5">{biz.tagline}</p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleSaveBusiness(biz.id);
                            }}
                            aria-label={isSaved ? 'Remove from Favourites' : 'Save to Favourites'}
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg shrink-0"
                          >
                            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-700 text-blue-700' : ''}`} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span>{biz.address}</span>
                          </p>
                          {getBusinessDistanceKm(biz) !== null && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              <Navigation className="w-2.5 h-2.5 text-teal-600" />
                              {getBusinessDistanceKm(biz)} {t.kmAway}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            <span className="text-slate-800">
                              {biz.rating && biz.rating > 0 ? biz.rating.toFixed(1) : 'New'}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              ({reviewTotal} {t.reviews})
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                          {biz.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Contact: <strong>{biz.contactPerson}</strong>
                        </span>
                        <BusinessContactActions business={biz} variant="card" showInquire={true} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: REAL PRICE COMPARISON ACROSS BUSINESS CATALOGS */}
      {viewMode === 'products' && (
        <div className="px-4 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-600">
              Comparing <strong>{filteredProducts.length}</strong> owner-listed products &amp; services across Visakhapatnam
            </span>
            <button
              type="button"
              onClick={() => setSortByPriceAsc(!sortByPriceAsc)}
              className="px-3 py-1 rounded-xl bg-white border border-slate-200 font-bold text-blue-900"
            >
              Price: {sortByPriceAsc ? 'Lowest First ↑' : 'Highest First ↓'}
            </button>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-2">
              <Tag className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">
                No owner-listed product prices match yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Only real product catalogs published by approved Visakhapatnam business owners are shown here — prices are never invented or estimated.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredProducts.map((item) => (
                <div
                  key={`${item.businessId}-${item.id}`}
                  onClick={() => openBusinessModal(item.business)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          {item.availability}
                        </span>
                        <span className="text-base font-black text-blue-900">
                          ₹{item.price.toLocaleString('en-IN')}
                          {item.unit ? ` / ${item.unit}` : ''}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-1 line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-semibold text-blue-700 truncate">
                        {item.business.name} • {item.business.area}
                      </p>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <BusinessContactActions business={item.business} variant="card" showInquire={true} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
