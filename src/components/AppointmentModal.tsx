import React, { useState, useEffect } from 'react';
import { Calendar, Clock, X, CheckCircle2, AlertCircle, User, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookedSlot } from '../types';

export const AppointmentModal: React.FC = () => {
  const {
    appointmentModalBusiness,
    closeAppointmentModal,
    bookAppointment,
    loadBookedSlotsForBusiness,
    currentUser,
    setIsAuthModalOpen,
    showToast,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [slotDate, setSlotDate] = useState(todayStr);
  const [slotTime, setSlotTime] = useState('');
  const [serviceOrProduct, setServiceOrProduct] = useState('');
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [notes, setNotes] = useState('');
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSlots =
    appointmentModalBusiness?.appointmentSlots && appointmentModalBusiness.appointmentSlots.length > 0
      ? appointmentModalBusiness.appointmentSlots
      : ['10:00 AM - 11:00 AM', '11:30 AM - 12:30 PM', '03:00 PM - 04:00 PM', '05:00 PM - 06:00 PM'];

  useEffect(() => {
    if (currentUser) {
      if (!customerName) setCustomerName(currentUser.name || '');
      if (!customerPhone) setCustomerPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!appointmentModalBusiness) return;
    setSlotTime('');
    setServiceOrProduct(
      appointmentModalBusiness.products?.[0]?.name ||
        appointmentModalBusiness.keyOfferings?.[0] ||
        'Consultation / Store Visit'
    );
    setIsLoadingSlots(true);
    void loadBookedSlotsForBusiness(appointmentModalBusiness.id)
      .then((slots) => setBookedSlots(slots))
      .catch(() => setBookedSlots([]))
      .finally(() => setIsLoadingSlots(false));
  }, [appointmentModalBusiness]);

  if (!appointmentModalBusiness) return null;

  const isSlotTaken = (time: string) =>
    bookedSlots.some(
      (s) => s.slotDate === slotDate && s.slotTime === time && s.status === 'booked'
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in to book an appointment');
      return;
    }
    if (!slotDate || !slotTime || !customerName.trim() || !customerPhone.trim()) {
      showToast('Please select a date, available time slot, name, and phone.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await bookAppointment({
        businessId: appointmentModalBusiness.id,
        slotDate,
        slotTime,
        serviceOrProduct: serviceOrProduct.trim() || 'Business Visit',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim() || undefined,
      });
      if (ok) {
        closeAppointmentModal();
      } else {
        const refreshed = await loadBookedSlotsForBusiness(appointmentModalBusiness.id);
        setBookedSlots(refreshed);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="fixed inset-0" onClick={closeAppointmentModal} />
      <div className="relative z-10 bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Confirmed Slot Booking
            </span>
            <h3 className="font-extrabold text-base text-slate-900 mt-1">
              Book Appointment
            </h3>
            <p className="text-xs text-slate-500">
              with <strong>{appointmentModalBusiness.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={closeAppointmentModal}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!currentUser && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Sign in required to reserve slot
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
            <label className="block font-bold text-slate-700 mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1 text-blue-700" />
              Select Preferred Date *
            </label>
            <input
              type="date"
              min={todayStr}
              required
              value={slotDate}
              onChange={(e) => {
                setSlotDate(e.target.value);
                setSlotTime('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              <Clock className="w-3.5 h-3.5 inline mr-1 text-blue-700" />
              Select Time Slot * {isLoadingSlots && <span className="text-slate-400 font-normal">(Checking availability...)</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableSlots.map((slot) => {
                const taken = isSlotTaken(slot);
                const selected = slotTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={taken}
                    onClick={() => setSlotTime(slot)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold border text-center transition-all ${
                      taken
                        ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                        : selected
                        ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {slot} {taken ? '(Booked)' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Service or Product *</label>
            <input
              type="text"
              required
              placeholder="e.g. Bulk Quote Discussion / Fitting / Service"
              value={serviceOrProduct}
              onChange={(e) => setServiceOrProduct(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                <User className="w-3 h-3 inline mr-1" />
                Your Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                <Phone className="w-3 h-3 inline mr-1" />
                Mobile (+91) *
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Any specific requirements or questions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeAppointmentModal}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !slotTime}
              className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Reserving...' : 'Confirm Slot Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
