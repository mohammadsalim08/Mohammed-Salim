import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Clock,
  Navigation,
  ExternalLink,
  X,
  Camera,
  Sparkles,
  Ticket,
  Sun,
  ChevronRight,
} from 'lucide-react';
import { VIZAG_TOURISM_DESTINATIONS } from '../data/tourismData';
import { TourismDestination } from '../types';
import { useApp } from '../context/AppContext';

type TourismCategory =
  | 'All'
  | 'Beach'
  | 'Heritage & Museum'
  | 'Hill Station & Nature'
  | 'Temple & Spiritual'
  | 'Park & Viewpoint';

const TOURISM_CATEGORIES: TourismCategory[] = [
  'All',
  'Beach',
  'Heritage & Museum',
  'Hill Station & Nature',
  'Temple & Spiritual',
  'Park & Viewpoint',
];

export const TourismSection: React.FC = () => {
  const { language, triggerAiPrompt, setActiveTab } = useApp();
  const isTe = language === 'te';

  const [selectedCategory, setSelectedCategory] = useState<TourismCategory>('All');
  const [showAll, setShowAll] = useState(false);
  const [activeDestination, setActiveDestination] = useState<TourismDestination | null>(null);

  const filteredDestinations =
    selectedCategory === 'All'
      ? VIZAG_TOURISM_DESTINATIONS
      : VIZAG_TOURISM_DESTINATIONS.filter((d) => d.category === selectedCategory);

  const visibleDestinations = showAll
    ? filteredDestinations
    : filteredDestinations.slice(0, 6);

  return (
    <section className="px-4 space-y-3.5">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              <Compass className="w-3 h-3 text-blue-600" />
              <span>{isTe ? 'వైజాగ్ పర్యాటకం • 15 ప్రదేశాలు' : 'Explore Vizag • 15 Official Destinations'}</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
              {isTe ? 'విశాఖపట్నం ప్రముఖ పర్యాటక ప్రదేశాలు' : 'Discover Visakhapatnam Tourism'}
            </h3>
            <p className="text-xs text-slate-500">
              {isTe
                ? 'నిజమైన ఫోటోలు, సమయాలు మరియు గూగుల్ మ్యాప్స్ దారితో బీచ్‌లు, మ్యూజియంలు, అరకు & కొండలు'
                : 'Authentic photographs with source attribution, timings, and direct Google Maps navigation'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className="text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-700" />
              <span>{isTe ? 'మ్యాప్‌లో చూడండి' : 'View on Map'}</span>
            </button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {TOURISM_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setShowAll(false);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Destination Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleDestinations.map((dest) => {
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest.latitude},${dest.longitude}`;

            return (
              <article
                key={dest.id}
                onClick={() => setActiveDestination(dest)}
                className="group bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-slate-200 overflow-hidden">
                    <img
                      src={dest.imageUrl}
                      alt={dest.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-bold bg-white/95 text-blue-950 px-2 py-0.5 rounded-lg shadow-xs">
                      {dest.category}
                    </span>
                    <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                      <h4 className="font-extrabold text-sm leading-tight line-clamp-1">
                        {isTe ? dest.teluguName : dest.name}
                      </h4>
                      <p className="text-[11px] text-slate-200 flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="w-3 h-3 text-teal-300 shrink-0" />
                        <span>{dest.area}</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                      {dest.shortTagline}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">{dest.timings}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                      <Camera className="w-3 h-3 shrink-0" />
                      <span>
                        Photo: {dest.photoArtist} ({dest.photoLicense}) • {dest.photoSource}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="px-3 pb-3 pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDestination(dest);
                    }}
                    className="text-[11px] font-bold text-blue-800 hover:text-blue-950 inline-flex items-center gap-0.5"
                  >
                    <span>{isTe ? 'వివరాలు' : 'Details & Attribution'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-300 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-2xs transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>{isTe ? 'దారి' : 'Directions'}</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {/* Expand / Collapse toggle */}
        {filteredDestinations.length > 6 && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="px-5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200 transition-colors"
            >
              {showAll
                ? isTe
                  ? 'తక్కువ ప్రదేశాలు చూపించు'
                  : 'Show Fewer Destinations'
                : isTe
                ? `మొత్తం ${filteredDestinations.length} పర్యాటక ప్రదేశాలు చూడండి`
                : `Show All ${filteredDestinations.length} Vizag Destinations`}
            </button>
          </div>
        )}
      </div>

      {/* Destination Details & License Attribution Modal */}
      {activeDestination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setActiveDestination(null)}
          />
          <div className="relative z-10 bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setActiveDestination(null)}
              aria-label="Close destination details"
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/90 text-slate-800 hover:bg-white flex items-center justify-center shadow-md"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative h-56 bg-slate-200 shrink-0">
              <img
                src={activeDestination.imageUrl}
                alt={activeDestination.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-500 text-slate-950 px-2 py-0.5 rounded">
                  {activeDestination.category}
                </span>
                <h3 className="text-lg sm:text-xl font-black mt-1 leading-tight">
                  {activeDestination.name}
                </h3>
                <p className="text-xs text-teal-200 font-semibold">
                  {activeDestination.teluguName}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar text-xs">
              <p className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                {activeDestination.description}
              </p>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">Location</strong>
                    <span className="text-slate-600">{activeDestination.area}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">Visiting Hours</strong>
                    <span className="text-slate-600">{activeDestination.timings}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Ticket className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">Entry Information</strong>
                    <span className="text-slate-600">{activeDestination.entryInfo}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Sun className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">Best Time to Visit</strong>
                    <span className="text-slate-600">{activeDestination.bestTime}</span>
                  </div>
                </div>
              </div>

              {/* Explicit Photo License & Source Record */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <Camera className="w-3.5 h-3.5 text-blue-700" />
                  <span>Verified Photograph Attribution</span>
                </div>
                <p className="text-[11px] text-slate-700">
                  Source: <strong>{activeDestination.photoSource}</strong> • Photographer:{' '}
                  <strong>{activeDestination.photoArtist}</strong> • License:{' '}
                  <strong>{activeDestination.photoLicense}</strong>
                </p>
                <div className="flex flex-wrap gap-3 pt-0.5">
                  <a
                    href={activeDestination.photoAttributionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline"
                  >
                    <span>View Photo Attribution</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={activeDestination.officialReferenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline"
                  >
                    <span>Official Tourism Reference</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2 shrink-0">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeDestination.latitude},${activeDestination.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-sm"
              >
                <Navigation className="w-4 h-4" />
                <span>Google Maps Directions</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  const destName = activeDestination.name;
                  setActiveDestination(null);
                  triggerAiPrompt(
                    `Tell me travel tips, nearby local restaurants, and approved businesses near ${destName} in Visakhapatnam.`
                  );
                }}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-teal-300" />
                <span>Ask Vizag AI</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
