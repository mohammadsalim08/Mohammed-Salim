import React, { useState } from 'react';
import {
  Radio,
  Calendar,
  Tag,
  Sparkles,
  Plus,
  X,
  MapPin,
  Megaphone,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VIZAG_AREAS } from '../data/mockData';
import { CommunityEvent } from '../types';

export const VizagLiveSection: React.FC = () => {
  const {
    approvedBusinesses,
    events,
    notifications,
    submitCommunityEvent,
    openBusinessModal,
    currentUser,
    setIsAuthModalOpen,
    language,
  } = useApp();

  const isTe = language === 'te';
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    category: 'Event' as CommunityEvent['category'],
    area: 'Siripuram & VIP Road',
    venue: '',
    eventDate: new Date().toISOString().split('T')[0],
    eventTime: '10:00 AM - 06:00 PM',
    description: '',
  });

  const approvedEvents = events.filter((e) => e.status === 'approved');
  const publicAnnouncements = notifications.filter((n) => n.audience === 'public');
  const activeOffers = approvedBusinesses.flatMap((b) =>
    (b.offers || []).map((offer) => ({ ...offer, business: b }))
  );

  const recentlyApproved = [...approvedBusinesses]
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    .slice(0, 4);

  const handleOpenPostEvent = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsEventModalOpen(true);
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.venue.trim() || !eventForm.description.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await submitCommunityEvent({
        title: eventForm.title.trim(),
        category: eventForm.category,
        area: eventForm.area,
        venue: eventForm.venue.trim(),
        eventDate: eventForm.eventDate,
        eventTime: eventForm.eventTime.trim() || undefined,
        description: eventForm.description.trim(),
      });
      if (ok) {
        setIsEventModalOpen(false);
        setEventForm({
          title: '',
          category: 'Event',
          area: 'Siripuram & VIP Road',
          venue: '',
          eventDate: new Date().toISOString().split('T')[0],
          eventTime: '10:00 AM - 06:00 PM',
          description: '',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="px-4 space-y-3.5">
      <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white rounded-3xl p-4 sm:p-5 shadow-md border border-blue-500/20 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-teal-400/20 text-teal-200 border border-teal-400/30 px-2.5 py-0.5 rounded-full">
              <Radio className="w-3 h-3 text-emerald-300" />
              <span>{isTe ? 'వైజాగ్ కనెక్ట్ లైవ్' : 'VizagConnect LIVE • Real-Time Updates'}</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
              {isTe ? 'విశాఖపట్నం తాజా వేడుకలు, ఆఫర్లు & ప్రకటనలు' : 'City Events, Approved Launches & Announcements'}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleOpenPostEvent}
            className="self-start sm:self-auto min-h-[40px] inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isTe ? 'ఈవెంట్ జోడించండి' : 'Post Community Event'}</span>
          </button>
        </div>

        {/* Live Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Column 1: Public Announcements & Events */}
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/15 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-teal-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Vizag Events & Notices</span>
              </h4>
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-bold">
                {approvedEvents.length + publicAnnouncements.length}
              </span>
            </div>

            {approvedEvents.length === 0 && publicAnnouncements.length === 0 ? (
              <p className="text-[11px] text-slate-300 leading-relaxed py-2">
                No verified exhibitions, cultural programs, or civic announcements published yet. Verified organizers can post local Vizag events here.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {publicAnnouncements.map((ann) => (
                  <div key={ann.id} className="bg-blue-950/70 rounded-xl p-2.5 border border-teal-400/20">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                      <Megaphone className="w-3 h-3" />
                      <span>CITY ANNOUNCEMENT</span>
                    </div>
                    <h5 className="font-bold text-xs text-white mt-0.5">{ann.title}</h5>
                    <p className="text-[11px] text-slate-200 mt-0.5 line-clamp-2">{ann.message}</p>
                  </div>
                ))}
                {approvedEvents.map((ev) => (
                  <div key={ev.id} className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                    <span className="text-[10px] font-bold text-teal-300 uppercase">
                      {ev.category} • {ev.eventDate}
                    </span>
                    <h5 className="font-bold text-xs text-white mt-0.5">{ev.title}</h5>
                    <p className="text-[11px] text-slate-200 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-teal-300 shrink-0" />
                      <span className="truncate">{ev.venue}, {ev.area}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Active Business Offers */}
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/15 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Verified Shop Offers</span>
              </h4>
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-bold">
                {activeOffers.length}
              </span>
            </div>

            {activeOffers.length === 0 ? (
              <p className="text-[11px] text-slate-300 leading-relaxed py-2">
                Verified local business owners can publish seasonal discounts and bulk supply offers directly from their Owner Dashboard.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {activeOffers.slice(0, 4).map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => openBusinessModal(offer.business)}
                    className="bg-white/10 hover:bg-white/20 rounded-xl p-2.5 border border-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-teal-200 truncate">
                        {offer.businessName}
                      </span>
                      {offer.discountBadge && (
                        <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded">
                          {offer.discountBadge}
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-xs text-white mt-0.5">{offer.title}</h5>
                    <p className="text-[11px] text-slate-200 line-clamp-1">{offer.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 3: Recently Approved on VizagConnect */}
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/15 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recently Added in Vizag</span>
              </h4>
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-bold">
                {recentlyApproved.length}
              </span>
            </div>

            {recentlyApproved.length === 0 ? (
              <p className="text-[11px] text-slate-300 leading-relaxed py-2">
                Newly approved Visakhapatnam businesses appear here live as soon as verified by moderators.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {recentlyApproved.map((biz) => (
                  <div
                    key={biz.id}
                    onClick={() => openBusinessModal(biz)}
                    className="bg-white/10 hover:bg-white/20 rounded-xl p-2.5 border border-white/10 cursor-pointer transition-colors flex items-center gap-2.5"
                  >
                    <img
                      src={biz.imageUrl}
                      alt={biz.name}
                      className="w-10 h-10 rounded-lg object-cover bg-slate-800 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h5 className="font-bold text-xs text-white truncate">{biz.name}</h5>
                        {biz.freeListingEligible && (
                          <span className="text-[9px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.2 rounded">
                            #{biz.freeListingNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-teal-200 truncate">
                        {biz.area} • {biz.categoryLabel}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Community Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-700" />
                <span>Post Visakhapatnam Event</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Visakhapatnam Handloom & Craft Expo"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={eventForm.category}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        category: e.target.value as CommunityEvent['category'],
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="Event">Event</option>
                    <option value="Exhibition">Exhibition</option>
                    <option value="Cultural Program">Cultural Program</option>
                    <option value="Public Announcement">Public Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Area *</label>
                  <select
                    value={eventForm.area}
                    onChange={(e) => setEventForm({ ...eventForm, area: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    {VIZAG_AREAS.filter((a) => a !== 'All Areas in Vizag').map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Venue / Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VMRDA Children's Arena, Siripuram"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.eventDate}
                    onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Timings</label>
                  <input
                    type="text"
                    value={eventForm.eventTime}
                    onChange={(e) => setEventForm({ ...eventForm, eventTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide details for Visakhapatnam residents and visitors..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div className="bg-blue-50 text-blue-900 text-[11px] p-2.5 rounded-xl flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  {currentUser?.isAdmin
                    ? 'Admin post will publish immediately to VizagConnect LIVE.'
                    : 'Community submissions are reviewed by VizagConnect moderators before appearing publicly.'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
