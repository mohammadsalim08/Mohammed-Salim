import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  Bookmark,
  Factory,
  UserCheck,
  CheckCircle2,
  Share2,
  Navigation,
  MessageSquare,
  Calendar,
  Flag,
  Tag,
  Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BusinessContactActions } from './BusinessContactActions';
import { TRANSLATIONS, formatDirectionsUrl } from '../data/translations';
import { shareContentCrossPlatform } from '../lib/capacitor';

export const BusinessDetailModal: React.FC = () => {
  const {
    selectedBusinessForModal,
    closeBusinessModal,
    toggleSaveBusiness,
    isBusinessSaved,
    showToast,
    addReview,
    openAppointmentModal,
    openReportModal,
    language,
    getBusinessDistanceKm,
    currentUser,
    setIsAuthModalOpen,
  } = useApp();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState(currentUser?.name || '');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (currentUser?.name && !reviewName) {
      setReviewName(currentUser.name);
    }
  }, [currentUser]);

  if (!selectedBusinessForModal) return null;

  const biz = selectedBusinessForModal;
  const isSaved = isBusinessSaved(biz.id);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const distanceKm = getBusinessDistanceKm(biz);
  const directionsUrl = formatDirectionsUrl(biz);

  const handleShare = async () => {
    const mode = await shareContentCrossPlatform({
      title: `${biz.name} on VizagConnect`,
      text: `${biz.name} — ${biz.tagline} in ${biz.area}, Visakhapatnam.`,
      url: window.location.href,
    });
    if (mode === 'copied') {
      showToast('Business details copied to clipboard!');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in to submit a verified customer review');
      return;
    }
    if (!reviewName.trim() || !reviewComment.trim()) {
      showToast('Please enter your name and review comments');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await addReview(biz.id, reviewRating, reviewComment.trim(), reviewName.trim());
      setReviewComment('');
      setShowReviewForm(false);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const approvedReviews = (biz.reviews || []).filter((r) => r.status === 'approved');
  const avgRating = biz.rating && biz.rating > 0 ? biz.rating : null;
  const products = biz.products || [];
  const offers = biz.offers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={closeBusinessModal} />

      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-6 z-10 max-h-[90vh] flex flex-col">
        {/* Top Action Buttons */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleShare()}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-slate-900 shadow-md"
            title={t.share}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => void toggleSaveBusiness(biz.id)}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-blue-700 shadow-md"
            title="Bookmark"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-700 text-blue-700' : ''}`} />
          </button>
          <button
            type="button"
            onClick={closeBusinessModal}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-slate-900 shadow-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Banner */}
        <div className="relative h-44 sm:h-52 bg-slate-200 shrink-0">
          <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

          <div className="absolute top-3 left-4 flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-md ${
                biz.scale === 'Large Manufacturing Factory'
                  ? 'bg-amber-400 text-slate-950'
                  : biz.scale === 'Medium Enterprise'
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {biz.scale}
            </span>

            {biz.freeListingEligible && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 shadow-md flex items-center gap-1">
                <Award className="w-3 h-3" />
                Founding Free #{biz.freeListingNumber}
              </span>
            )}

            {distanceKm !== null && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-teal-500 text-white shadow-md flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                <span>
                  {distanceKm} {t.kmAway}
                </span>
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-300">
              {biz.categoryLabel}
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">{biz.name}</h2>
            {biz.teluguName && <p className="text-xs text-slate-300 font-medium">{biz.teluguName}</p>}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <p className="text-xs font-bold text-blue-900">"{biz.tagline}"</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-slate-800">{avgRating ? avgRating.toFixed(1) : 'New'}</span>
                  <span className="text-slate-400 text-[11px]">
                    ({approvedReviews.length} {t.reviews})
                  </span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-500">
                  Est. {biz.establishedYear} • Visakhapatnam
                </span>
              </div>
            </div>

            {biz.verified && (
              <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold px-3 py-1 rounded-xl self-start sm:self-auto">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>{biz.verificationBadge}</span>
              </div>
            )}
          </div>

          {/* Book Appointment & Report Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => openAppointmentModal(biz)}
              className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs"
            >
              <Calendar className="w-4 h-4" />
              <span>{t.bookAppointment}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                openReportModal({ businessId: biz.id, businessName: biz.name })
              }
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{t.reportIssue}</span>
            </button>
          </div>

          {/* Active Offers */}
          {offers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Active Offers</span>
              </h4>
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-xl p-2.5 border border-amber-200/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <strong className="text-slate-900">{offer.title}</strong>
                    <p className="text-[11px] text-slate-600">{offer.description}</p>
                    <span className="text-[10px] text-slate-400">Valid till: {offer.validTill}</span>
                  </div>
                  {offer.discountBadge && (
                    <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded-lg shrink-0">
                      {offer.discountBadge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Location & Hours */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 text-xs sm:text-sm">{biz.area}</strong>
                  <span className="text-xs text-slate-600">{biz.address}</span>
                  {biz.landmark && (
                    <span className="block text-slate-500 text-[11px] mt-0.5">
                      Landmark: {biz.landmark}
                    </span>
                  )}
                </div>
              </div>

              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>Hours: {biz.businessHours}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>
                  Owner: <strong>{biz.contactPerson}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Products & Listed Prices Catalog */}
          {products.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                Products, Services &amp; Listed Prices ({products.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex gap-2.5 items-start"
                  >
                    {prod.imageUrl && (
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 bg-white"
                      />
                    )}
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-slate-900 truncate">{prod.name}</strong>
                        <span className="font-black text-blue-900 shrink-0">
                          ₹{prod.price.toLocaleString('en-IN')}
                          {prod.unit ? `/${prod.unit}` : ''}
                        </span>
                      </div>
                      <span className="inline-block text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded mt-0.5">
                        {prod.availability}
                      </span>
                      {prod.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {prod.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 mb-1.5">
              About This Business
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">{biz.description}</p>
          </div>

          {biz.manufacturingCapacity && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-0.5">
                <Factory className="w-4 h-4 text-amber-700" />
                <span>Industrial Plant &amp; Production Capacity:</span>
              </div>
              <p className="text-slate-800 font-medium">{biz.manufacturingCapacity}</p>
            </div>
          )}

          {/* Capabilities */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 mb-2">
              Capabilities &amp; Services Offered
            </h4>
            <div className="space-y-1.5">
              {biz.keyOfferings.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
                  <span>
                    {t.reviews} ({approvedReviews.length})
                  </span>
                </h4>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    setIsAuthModalOpen(true);
                    showToast('Sign in with Phone OTP or Google to write a review');
                    return;
                  }
                  setShowReviewForm(!showReviewForm);
                }}
                className="text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200"
              >
                {showReviewForm ? 'Cancel' : `+ ${t.writeReview}`}
              </button>
            </div>

            {showReviewForm && (
              <form
                onSubmit={handleReviewSubmit}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Your Star Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Your Name *"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                />

                <textarea
                  rows={2}
                  required
                  placeholder="Share your experience with this Visakhapatnam business..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-4 py-1.5 rounded-xl"
                  >
                    {t.submitReview}
                  </button>
                </div>
              </form>
            )}

            {approvedReviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">
                No customer reviews yet. Be the first to review {biz.name}!
              </p>
            ) : (
              <div className="space-y-2.5">
                {approvedReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{rev.userName}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-slate-400 ml-1">{rev.date}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">"{rev.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Contact Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <BusinessContactActions business={biz} variant="modal" showInquire={true} />
        </div>
      </div>
    </div>
  );
};
