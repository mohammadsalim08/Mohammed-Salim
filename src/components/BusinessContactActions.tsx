import React from 'react';
import { Phone, MessageCircle, Navigation, Send } from 'lucide-react';
import { BusinessListing } from '../types';
import { formatWhatsAppUrl, formatTelUrl, formatDirectionsUrl } from '../data/translations';
import { useApp } from '../context/AppContext';

interface BusinessContactActionsProps {
  business: BusinessListing;
  variant?: 'card' | 'modal' | 'compact';
  showInquire?: boolean;
}

export const BusinessContactActions: React.FC<BusinessContactActionsProps> = ({
  business,
  variant = 'card',
  showInquire = false,
}) => {
  const { openInquiryModal, language } = useApp();

  const whatsappUrl = formatWhatsAppUrl(business.whatsapp || '', business.name);
  const telUrl = formatTelUrl(business.phone || '');
  const directionsUrl = formatDirectionsUrl(business);

  const isTe = language === 'te';

  if (!whatsappUrl && !telUrl && !directionsUrl && !showInquire) {
    return null;
  }

  // Variant: Full Modal Footer Action Bar (large touch targets, responsive)
  if (variant === 'modal') {
    return (
      <div className="w-full flex flex-wrap items-center gap-2">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-[120px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all text-center"
            title="Open WhatsApp Chat (+91)"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>{isTe ? 'వాట్సాప్' : 'WhatsApp'}</span>
          </a>
        )}

        {telUrl && (
          <a
            href={telUrl}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-[120px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 shadow-sm transition-all text-center"
            title={`Call: ${business.phone}`}
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>{isTe ? 'కాల్ చేయండి' : 'Call Now'}</span>
          </a>
        )}

        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-[120px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-800 bg-amber-300 hover:bg-amber-400 active:bg-amber-500 shadow-sm transition-all text-center"
            title="Open Google Maps Navigation"
          >
            <Navigation className="w-4 h-4 shrink-0 text-slate-900" />
            <span>{isTe ? 'దారి (మ్యాప్)' : 'Directions'}</span>
          </a>
        )}

        {showInquire && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openInquiryModal(business);
            }}
            className="flex-1 min-w-[120px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 active:bg-teal-300 border border-teal-300 transition-all text-center"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>{isTe ? 'విచారణ' : 'Inquire'}</span>
          </button>
        )}
      </div>
    );
  }

  // Variant: Standard Card Layout (used in Home grid, Explore directory cards, Favourites)
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* 1. WHATSAPP BUTTON */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="min-h-[36px] inline-flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 px-2.5 py-1.5 rounded-xl border border-emerald-300 transition-colors shadow-2xs"
          title={`Chat on WhatsApp with ${business.name}`}
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{isTe ? 'వాట్సాప్' : 'WhatsApp'}</span>
        </a>
      )}

      {/* 2. CALL NOW BUTTON */}
      {telUrl && (
        <a
          href={telUrl}
          onClick={(e) => e.stopPropagation()}
          className="min-h-[36px] inline-flex items-center justify-center gap-1 text-[11px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-2.5 py-1.5 rounded-xl border border-blue-200 transition-colors shadow-2xs"
          title={`Call ${business.phone}`}
        >
          <Phone className="w-3.5 h-3.5 text-blue-700 shrink-0" />
          <span>{isTe ? 'కాల్' : 'Call Now'}</span>
        </a>
      )}

      {/* 3. GOOGLE MAPS DIRECTIONS BUTTON */}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="min-h-[36px] inline-flex items-center justify-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 px-2.5 py-1.5 rounded-xl border border-amber-300 transition-colors shadow-2xs"
          title="Open Google Maps Directions"
        >
          <Navigation className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>{isTe ? 'మ్యాప్' : 'Directions'}</span>
        </a>
      )}

      {/* Optional Inquire button */}
      {showInquire && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openInquiryModal(business);
          }}
          className="min-h-[36px] inline-flex items-center justify-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 active:bg-teal-200 px-2.5 py-1.5 rounded-xl border border-teal-200 transition-colors"
        >
          <Send className="w-3 h-3 text-teal-700 shrink-0" />
          <span>{isTe ? 'విచారణ' : 'Inquire'}</span>
        </button>
      )}
    </div>
  );
};
