import React from 'react';
import { Bookmark, Trash2, ArrowRight, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BusinessContactActions } from './BusinessContactActions';
import { TRANSLATIONS } from '../data/translations';
import { shareContentCrossPlatform } from '../lib/capacitor';

export const FavouritesScreen: React.FC = () => {
  const {
    businesses,
    savedBusinesses,
    toggleSaveBusiness,
    openBusinessModal,
    setActiveTab,
    language,
    showToast,
  } = useApp();

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const savedList = businesses.filter((b) => savedBusinesses.includes(b.id));

  return (
    <div className="pb-24 pt-2 max-w-4xl mx-auto px-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-blue-700 fill-blue-700" />
            <span>{t.favourites}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {savedList.length} saved local Visakhapatnam shops, services &amp; factories
          </p>
        </div>

        {savedList.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className="text-xs font-bold text-blue-800 hover:underline"
          >
            Explore More →
          </button>
        )}
      </div>

      {savedList.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 mt-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
            <Bookmark className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">No favourites saved yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Bookmark local shops, suppliers, clinics, or factories across Visakhapatnam to keep their WhatsApp, Call, and Map shortcuts ready.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
          >
            <span>Browse Vizag Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {savedList.map((biz) => (
            <div
              key={biz.id}
              onClick={() => openBusinessModal(biz)}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between shadow-2xs hover:shadow-sm cursor-pointer hover:border-blue-400 transition-all"
            >
              <div className="flex gap-3 items-center min-w-0">
                <img
                  src={biz.imageUrl}
                  alt={biz.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-50 px-2 py-0.2 rounded">
                      {biz.scale}
                    </span>
                    <span className="text-[10px] text-slate-500">{biz.area}</span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 truncate mt-0.5">
                    {biz.name}
                  </h4>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{biz.tagline}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Contact: {biz.contactPerson} • {biz.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <BusinessContactActions business={biz} variant="card" showInquire={true} />

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const mode = await shareContentCrossPlatform({
                      title: `${biz.name} on VizagConnect`,
                      text: `${biz.name} — ${biz.tagline} (${biz.area})`,
                      url: window.location.href,
                    });
                    if (mode === 'copied') showToast('Business link copied to clipboard');
                  }}
                  aria-label="Share business"
                  className="p-2 text-slate-400 hover:text-blue-700 rounded-xl transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleSaveBusiness(biz.id);
                  }}
                  aria-label="Remove from Favourites"
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
