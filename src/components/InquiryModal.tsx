import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BusinessInquiry } from '../types';

export const InquiryModal: React.FC = () => {
  const {
    inquiryModalBusiness,
    closeInquiryModal,
    submitInquiry,
    currentUser,
    setIsAuthModalOpen,
    showToast,
  } = useApp();

  const [inquiryType, setInquiryType] = useState<BusinessInquiry['inquiryType']>('Wholesale / Bulk Order');
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [userPhone, setUserPhone] = useState(currentUser?.phone || '');
  const [userEmail, setUserEmail] = useState(currentUser?.email || '');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUserName((prev) => prev || currentUser.name || '');
      setUserPhone((prev) => prev || currentUser.phone || '');
      setUserEmail((prev) => prev || currentUser.email || '');
    }
  }, [currentUser]);

  if (!inquiryModalBusiness) return null;

  const biz = inquiryModalBusiness;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in first to send a tracked inquiry');
      return;
    }

    if (!userName.trim() || !userPhone.trim() || !message.trim()) {
      showToast('Please fill in your name, contact phone, and inquiry details');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await submitInquiry({
        businessId: biz.id,
        businessName: biz.name,
        userName: userName.trim(),
        userPhone: userPhone.trim(),
        userEmail: userEmail.trim(),
        inquiryType,
        message: message.trim(),
      });
      if (ok) {
        setIsSubmitted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setMessage('');
    closeInquiryModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={handleClose} />

      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-200">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-lg text-slate-900">Inquiry Sent Successfully!</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your inquiry has been saved and routed directly to <strong>{biz.name}</strong> ({biz.contactPerson}). They can reply via phone or WhatsApp.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Back to Directory
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                Direct Contact
              </span>
              <h3 className="font-extrabold text-lg text-slate-900 mt-1">
                Request Quote / Inquire
              </h3>
              <p className="text-xs text-slate-500">
                To: <strong className="text-slate-800">{biz.name}</strong> ({biz.area})
              </p>
            </div>

            {!currentUser && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Sign in to track inquiry replies</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="font-bold bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg shrink-0"
                >
                  Sign In
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inquiry Purpose *</label>
                <select
                  value={inquiryType}
                  onChange={(e: any) => setInquiryType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-teal-500 font-medium"
                >
                  <option value="Wholesale / Bulk Order">Wholesale / Bulk Order</option>
                  <option value="Retail Purchase">Retail Purchase / Availability</option>
                  <option value="Manufacturing & Supply">Manufacturing &amp; Contract Supply</option>
                  <option value="General Query">General Query / Location Visit</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Varma"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Phone (+91) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98480 12345"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@domain.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Message / Quantity / Requirement Details *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your requirement, quantity needed, or questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[44px] bg-gradient-to-r from-blue-700 to-teal-600 hover:from-blue-800 hover:to-teal-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mt-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSubmitting ? 'Sending Inquiry...' : 'Submit Inquiry Directly'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
