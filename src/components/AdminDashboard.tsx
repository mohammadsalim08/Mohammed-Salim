import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  Flag,
  MessageSquare,
  Calendar,
  Megaphone,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BusinessListing, BusinessReview, PlatformReport, AppNotification } from '../types';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    setActiveTab,
    businesses,
    listingQuota,
    approveBusinessListing,
    rejectBusinessListing,
    suspendBusinessListing,
    reactivateBusinessListing,
    reports,
    updateReportStatus,
    events,
    moderateCommunityEvent,
    publishPublicAnnouncement,
    loadBusinessReviews,
    moderateReview,
  } = useApp();

  const [section, setSection] = useState<'businesses' | 'reports' | 'reviews' | 'events'>('businesses');
  const [bizFilter, setBizFilter] = useState<'pending' | 'approved' | 'rejected' | 'suspended'>('pending');
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [selectedReviewBizId, setSelectedReviewBizId] = useState<string>('');
  const [loadedReviews, setLoadedReviews] = useState<BusinessReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'update' as AppNotification['type'],
  });

  if (!currentUser?.isAdmin) {
    return (
      <div className="pb-24 pt-6 max-w-xl mx-auto px-4">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-3 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="font-extrabold text-lg text-slate-900">Administrator Access Only</h2>
          <p className="text-xs text-slate-600">
            This console is restricted to verified VizagConnect administrators.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="px-4 py-2 rounded-xl bg-blue-900 text-white font-bold text-xs"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const countsByStatus = {
    pending: businesses.filter((b) => b.status === 'pending').length,
    approved: businesses.filter((b) => b.status === 'approved').length,
    rejected: businesses.filter((b) => b.status === 'rejected').length,
    suspended: businesses.filter((b) => b.status === 'suspended').length,
  };

  const filteredBusinesses = businesses.filter((b) => b.status === bizFilter);
  const quotaPct = Math.min(
    100,
    Math.round((listingQuota.approvedFreeCount / Math.max(1, listingQuota.maxFreeListings)) * 100)
  );

  const handleFetchReviewsForModeration = async (bizId: string) => {
    setSelectedReviewBizId(bizId);
    if (!bizId) {
      setLoadedReviews([]);
      return;
    }
    setIsLoadingReviews(true);
    try {
      const revs = await loadBusinessReviews(bizId, true);
      setLoadedReviews(revs);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) return;
    await publishPublicAnnouncement({
      title: announcementForm.title.trim(),
      message: announcementForm.message.trim(),
      type: announcementForm.type,
    });
    setAnnouncementForm({ title: '', message: '', type: 'update' });
  };

  return (
    <div className="pb-24 pt-2 max-w-6xl mx-auto px-4 space-y-5">
      {/* Header Banner + First 100 Free Listings Quota Meter */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-teal-950 text-white rounded-3xl p-5 shadow-lg border border-teal-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-teal-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-300" />
                <h2 className="font-extrabold text-lg sm:text-xl">VizagConnect Admin Console</h2>
              </div>
              <p className="text-xs text-teal-200">
                Business moderation, First-100 free slots allocation, reviews, reports &amp; Vizag LIVE notices
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-teal-400 text-slate-950 px-3 py-1 rounded-full self-start sm:self-auto">
            Admin: {currentUser.email || currentUser.name}
          </span>
        </div>

        {/* Atomic Quota Tracker */}
        <div className="bg-white/10 rounded-2xl p-4 border border-white/15 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              First 100 Free Founding Business Listings Quota
            </span>
            <span className="font-mono font-extrabold text-white">
              {listingQuota.approvedFreeCount} / {listingQuota.maxFreeListings} Claimed ({listingQuota.remainingFreeSlots} remaining)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all"
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Section Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setSection('businesses')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
            section === 'businesses'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          Applications &amp; Listings ({countsByStatus.pending} Pending)
        </button>
        <button
          type="button"
          onClick={() => setSection('reports')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
            section === 'reports'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          Reports &amp; Complaints ({reports.filter((r) => r.status === 'Open').length} Open)
        </button>
        <button
          type="button"
          onClick={() => setSection('reviews')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
            section === 'reviews'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          Review Moderation
        </button>
        <button
          type="button"
          onClick={() => setSection('events')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
            section === 'events'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          Events &amp; Announcements ({events.filter((e) => e.status === 'pending').length} Pending)
        </button>
      </div>

      {/* SECTION 1: BUSINESS APPROVALS & SUSPENSION */}
      {section === 'businesses' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(['pending', 'approved', 'rejected', 'suspended'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setBizFilter(status)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize border transition-all ${
                  bizFilter === status
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {status} ({countsByStatus[status]})
              </button>
            ))}
          </div>

          {filteredBusinesses.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              No {bizFilter} business applications in this queue.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBusinesses.map((biz: BusinessListing) => (
                <div
                  key={biz.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <img
                        src={biz.imageUrl}
                        alt={biz.name}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-slate-900">{biz.name}</h4>
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                            {biz.scale}
                          </span>
                          {biz.freeListingEligible && (
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              Founding Free #{biz.freeListingNumber}/100
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {biz.area} • {biz.address}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Contact: {biz.contactPerson} • {biz.phone} • WhatsApp: {biz.whatsapp || 'N/A'}
                        </p>
                        {biz.rejectionReason && biz.status === 'rejected' && (
                          <p className="text-[11px] text-rose-700 mt-1 font-semibold">
                            Rejection Reason: {biz.rejectionReason}
                          </p>
                        )}
                        {biz.suspensionReason && biz.status === 'suspended' && (
                          <p className="text-[11px] text-amber-800 mt-1 font-semibold">
                            Suspension Reason: {biz.suspensionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {(biz.status === 'pending' || biz.status === 'rejected' || biz.status === 'suspended') && (
                        <button
                          type="button"
                          onClick={() => void approveBusinessListing(biz.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{biz.status === 'suspended' ? 'Reactivate' : 'Approve & Verify'}</span>
                        </button>
                      )}

                      {biz.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() =>
                            void rejectBusinessListing(
                              biz.id,
                              reasonDrafts[biz.id] || 'Incomplete verification details'
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}

                      {biz.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() =>
                            void suspendBusinessListing(
                              biz.id,
                              reasonDrafts[biz.id] || 'Suspended pending policy review'
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </button>
                      )}

                      {biz.status === 'suspended' && (
                        <button
                          type="button"
                          onClick={() => void reactivateBusinessListing(biz.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Restore Live</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {(biz.status === 'pending' || biz.status === 'approved') && (
                    <input
                      type="text"
                      placeholder="Optional rejection/suspension note for owner..."
                      value={reasonDrafts[biz.id] || ''}
                      onChange={(e) =>
                        setReasonDrafts((prev) => ({ ...prev, [biz.id]: e.target.value }))
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: REPORTS & COMPLAINTS */}
      {section === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              <Flag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No platform reports or complaints submitted yet.
            </div>
          ) : (
            reports.map((rep: PlatformReport) => (
              <div
                key={rep.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold uppercase text-[10px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                      {rep.type.replace('_', ' ')}
                    </span>
                    <strong className="text-slate-900">{rep.reason}</strong>
                    {rep.targetBusinessName && (
                      <span className="text-teal-700 font-semibold">
                        ({rep.targetBusinessName})
                      </span>
                    )}
                  </div>
                  <select
                    value={rep.status}
                    onChange={(e) =>
                      void updateReportStatus(
                        rep.id,
                        e.target.value as PlatformReport['status'],
                        reasonDrafts[rep.id]
                      )
                    }
                    className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-800"
                  >
                    <option value="Open">Open</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {rep.details}
                </p>
                <p className="text-[11px] text-slate-400">
                  Submitted by {rep.reporterName} • {rep.date}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION 3: REVIEW MODERATION */}
      {section === 'reviews' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Select Business to Inspect All Reviews (Approved &amp; Flagged):
            </label>
            <select
              value={selectedReviewBizId}
              onChange={(e) => void handleFetchReviewsForModeration(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
            >
              <option value="">-- Choose a Business --</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.status})
                </option>
              ))}
            </select>
          </div>

          {isLoadingReviews ? (
            <p className="text-slate-500">Loading reviews...</p>
          ) : selectedReviewBizId && loadedReviews.length === 0 ? (
            <p className="text-slate-500 italic">No reviews submitted for this business yet.</p>
          ) : (
            <div className="space-y-2.5">
              {loadedReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900">{rev.userName}</strong>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rev.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rev.status}
                      </span>
                      <span className="text-amber-600 font-bold">★ {rev.rating}/5</span>
                    </div>
                    <p className="text-slate-700 mt-1">"{rev.comment}"</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await moderateReview(rev.businessId, rev.id, 'approved', 'Verified by Admin');
                        await handleFetchReviewsForModeration(rev.businessId);
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await moderateReview(rev.businessId, rev.id, 'flagged', 'Flagged by Admin');
                        await handleFetchReviewsForModeration(rev.businessId);
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold"
                    >
                      Flag / Hide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: EVENTS & CITYWIDE ANNOUNCEMENTS */}
      {section === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-blue-700" />
              Publish Public Citywide Announcement
            </h4>
            <form onSubmit={handlePublishAnnouncement} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Announcement Headline *"
                value={announcementForm.title}
                onChange={(e) =>
                  setAnnouncementForm({ ...announcementForm, title: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
              <select
                value={announcementForm.type}
                onChange={(e) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    type: e.target.value as AppNotification['type'],
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              >
                <option value="update">City Update</option>
                <option value="offer">Citywide Offer</option>
              </select>
              <textarea
                rows={3}
                required
                placeholder="Announcement message for all VizagConnect users..."
                value={announcementForm.message}
                onChange={(e) =>
                  setAnnouncementForm({ ...announcementForm, message: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
              <button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl"
              >
                Publish to VizagConnect LIVE
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" />
              Community Event Queue ({events.length})
            </h4>
            {events.length === 0 ? (
              <p className="text-slate-500">No community events submitted yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-slate-900">{ev.title}</strong>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ev.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      {ev.venue}, {ev.area} • {ev.eventDate}
                    </p>
                    {ev.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void moderateCommunityEvent(ev.id, 'approved')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                        >
                          Approve Event
                        </button>
                        <button
                          type="button"
                          onClick={() => void moderateCommunityEvent(ev.id, 'rejected')}
                          className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
