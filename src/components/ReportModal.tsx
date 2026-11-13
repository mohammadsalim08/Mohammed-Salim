import React, { useState } from 'react';
import { Flag, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PlatformReport } from '../types';

export const ReportModal: React.FC = () => {
  const {
    reportModalTarget,
    closeReportModal,
    submitReport,
    currentUser,
    setIsAuthModalOpen,
  } = useApp();

  const [type, setType] = useState<PlatformReport['type']>(
    reportModalTarget?.businessId ? 'business_report' : 'complaint'
  );
  const [reason, setReason] = useState('Incorrect phone number or address');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!reportModalTarget) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!reason.trim() || !details.trim()) return;

    setIsSubmitting(true);
    try {
      const ok = await submitReport({
        type,
        targetBusinessId: reportModalTarget.businessId,
        targetBusinessName: reportModalTarget.businessName,
        reason: reason.trim(),
        details: details.trim(),
      });
      if (ok) {
        setDetails('');
        closeReportModal();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="fixed inset-0" onClick={closeReportModal} />
      <div className="relative z-10 bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Flag className="w-4 h-4 text-rose-600" />
            <span>
              {reportModalTarget.businessName
                ? `Report: ${reportModalTarget.businessName}`
                : 'Report Incorrect Info / Complaint'}
            </span>
          </h3>
          <button
            type="button"
            onClick={closeReportModal}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!currentUser && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Sign in required to track report
            </span>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg"
            >
              Sign In
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Report Category *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PlatformReport['type'])}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
            >
              <option value="business_report">Report Business / Misleading Claim</option>
              <option value="incorrect_info">Incorrect Address, Hours, or Phone</option>
              <option value="complaint">Platform Feedback / Complaint</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Summary Reason *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Detailed Explanation *</label>
            <textarea
              rows={3}
              required
              placeholder="Explain what needs correction or review by our Visakhapatnam moderation team..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeReportModal}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
