import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Flag,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OFFICIAL_SUPPORT_WHATSAPP_URL } from '../data/translations';

const FAQ_ITEMS = [
  {
    q: 'How are businesses verified on VizagConnect?',
    a: 'Every business submitted by owners enters an Admin Verification queue. Moderators check phone, Visakhapatnam locality, address, and category before approving listings to go public.',
  },
  {
    q: 'How does the First 100 Free Listings offer work?',
    a: 'The first 100 approved businesses on VizagConnect automatically receive Founding Free Listing Slot #1–#100 at zero listing cost when approved by platform administrators.',
  },
  {
    q: 'Does VizagConnect charge commissions on inquiries or bookings?',
    a: 'No. Customers connect directly with Visakhapatnam business owners via Call Now, WhatsApp, Tracked Inquiry, or Appointment Booking with zero middleman commission.',
  },
  {
    q: 'How do I report incorrect business phone numbers or closed shops?',
    a: 'Open any business profile and tap "Report Issue", or click "Submit Complaint / Report" below to notify our moderation team.',
  },
];

export const SupportFaqModal: React.FC = () => {
  const {
    isSupportModalOpen,
    setIsSupportModalOpen,
    openReportModal,
  } = useApp();

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  if (!isSupportModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="fixed inset-0" onClick={() => setIsSupportModalOpen(false)} />
      <div className="relative z-10 bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-teal-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">VizagConnect Help &amp; Support</h3>
              <p className="text-xs text-teal-200">Discover Local. Support Local.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSupportModalOpen(false)}
            className="text-slate-300 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar text-xs">
          {/* Official Platform Support WhatsApp */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h4 className="font-extrabold text-emerald-950 text-sm">
                  Official VizagConnect Support Desk
                </h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Need help with business verification, account issues, or listing updates? Chat directly on WhatsApp (+91 8466947304).
                </p>
              </div>
              <a
                href={OFFICIAL_SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Support (+91 8466947304)</span>
              </a>
            </div>
          </div>

          {/* FAQs */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              Frequently Asked Questions
            </h4>
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = openIdx === i;
              return (
                <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left font-bold text-slate-900"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-3.5 py-2.5 bg-white text-slate-600 leading-relaxed border-t border-slate-100">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Policies & Report Launcher */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Privacy &amp; Community Guidelines</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              VizagConnect stores only necessary profile, inquiry, and booking information in Cloud Firestore. Users may delete their account anytime from Profile &gt; Account Management.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsSupportModalOpen(false);
                openReportModal({});
              }}
              className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold px-3 py-1.5 rounded-xl"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Submit Complaint / Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
