import React, { useState, useEffect } from 'react';
import {
  MapPin,
  MessageSquare,
  Building2,
  Factory,
  LogOut,
  Languages,
  Bell,
  Navigation,
  ShieldCheck,
  Globe,
  Edit3,
  Trash2,
  Save,
  UserCheck,
  AlertTriangle,
  Calendar,
  HelpCircle,
  MessageCircle,
  Flag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VIZAG_AREAS } from '../data/mockData';
import { TRANSLATIONS, OFFICIAL_SUPPORT_WHATSAPP_URL } from '../data/translations';
import { NotificationPreferences, PrivacySettings } from '../types';

export const ProfileScreen: React.FC = () => {
  const {
    currentUser,
    inquiries,
    appointments,
    updateAppointmentStatus,
    reports,
    logout,
    deleteAccount,
    updateUserProfile,
    enablePushNotifications,
    updateUserPreferences,
    setActiveTab,
    setIsAuthModalOpen,
    setIsSupportModalOpen,
    openReportModal,
    language,
    setLanguage,
    customerLocation,
    requestCustomerLocation,
    isLocatingCustomer,
    unreadNotificationsCount,
    setIsNotificationsModalOpen,
  } = useApp();

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [activeSubTab, setActiveSubTab] = useState<'preferences' | 'bookings' | 'account' | 'support'>(
    'preferences'
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editArea, setEditArea] = useState(currentUser?.area || 'Siripuram & VIP Road');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    currentUser?.notificationPreferences || {
      offers: true,
      bookings: true,
      inquiries: true,
      events: true,
      pushEnabled: false,
    }
  );
  const [privacyPrefs, setPrivacyPrefs] = useState<PrivacySettings>(
    currentUser?.privacySettings || {
      shareLocationForNearby: true,
      showProfileNameInReviews: true,
    }
  );

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditArea(currentUser.area);
      if (currentUser.notificationPreferences) {
        setNotifPrefs(currentUser.notificationPreferences);
      }
      if (currentUser.privacySettings) {
        setPrivacyPrefs(currentUser.privacySettings);
      }
    }
  }, [currentUser]);

  const customerAppointments = currentUser
    ? appointments.filter((a) => a.customerId === currentUser.id)
    : [];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsSavingProfile(true);
    try {
      await updateUserProfile({ name: editName.trim(), area: editArea });
      setIsEditingProfile(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const ok = await deleteAccount();
      if (ok) {
        setConfirmDeleteStep(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePref = async (
    nextNotif: NotificationPreferences,
    nextPrivacy: PrivacySettings
  ) => {
    setNotifPrefs(nextNotif);
    setPrivacyPrefs(nextPrivacy);
    if (currentUser) {
      await updateUserPreferences(nextNotif, nextPrivacy);
    }
  };

  return (
    <div className="pb-24 pt-2 max-w-4xl mx-auto px-4 space-y-5">
      {/* User Card */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-teal-900 text-white rounded-3xl p-5 shadow-lg border border-teal-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-teal-400 text-blue-950 font-black text-2xl flex items-center justify-center shadow-md shrink-0">
              {currentUser ? currentUser.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-lg sm:text-xl text-white">
                  {currentUser ? currentUser.name : 'Guest Browsing Mode'}
                </h2>
                {currentUser?.isBusinessOwner && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Factory className="w-2.5 h-2.5" />
                    Business Owner
                  </span>
                )}
                {currentUser?.isAdmin && (
                  <span className="bg-teal-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-100 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-teal-300 inline shrink-0" />
                {currentUser?.area || 'Visakhapatnam, Andhra Pradesh'}
              </p>
              {currentUser && (
                <p className="text-[11px] text-teal-200 mt-0.5">
                  {[currentUser.phone, currentUser.email].filter(Boolean).join(' • ') ||
                    'Verified VizagConnect Account'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentUser?.isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Console</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('owner')}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Building2 className="w-4 h-4" />
              <span>Owner Portal</span>
            </button>

            {currentUser ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-200 hover:text-white bg-white/10 hover:bg-rose-500/30 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-sm"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab('preferences')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeSubTab === 'preferences'
              ? 'border-blue-800 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Preferences &amp; Push</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bookings')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeSubTab === 'bookings'
              ? 'border-blue-800 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Bookings &amp; Inquiries ({customerAppointments.length + inquiries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('account')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeSubTab === 'account'
              ? 'border-blue-800 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Account &amp; Privacy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('support')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeSubTab === 'support'
              ? 'border-blue-800 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>{t.supportHelp}</span>
        </button>
      </div>

      {/* TAB 1: PREFERENCES & PUSH */}
      {activeSubTab === 'preferences' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-blue-700" />
              <div>
                <strong className="block text-slate-800">Language / భాష</strong>
                <span className="text-[11px] text-slate-500">English or Telugu interface</span>
              </div>
            </div>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-lg font-bold ${
                  language === 'en' ? 'bg-blue-900 text-white' : 'text-slate-600'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('te')}
                className={`px-3 py-1 rounded-lg font-bold ${
                  language === 'te' ? 'bg-blue-900 text-white' : 'text-slate-600'
                }`}
              >
                తెలుగు
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-700" />
              <div>
                <strong className="block text-slate-800">GPS Location</strong>
                <span className="text-[11px] text-slate-500">
                  {customerLocation
                    ? `Active (${customerLocation.lat.toFixed(4)}, ${customerLocation.lng.toFixed(4)})`
                    : 'Not enabled yet'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void requestCustomerLocation()}
              disabled={isLocatingCustomer}
              className="bg-slate-100 hover:bg-blue-50 text-blue-900 border border-slate-200 px-3 py-1.5 rounded-xl font-bold"
            >
              {isLocatingCustomer ? 'Detecting...' : customerLocation ? 'Refresh GPS' : 'Enable GPS'}
            </button>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-700" />
              <div>
                <strong className="block text-slate-800">Push Notifications (FCM)</strong>
                <span className="text-[11px] text-slate-500">
                  {currentUser?.fcmToken
                    ? 'Device push token registered'
                    : 'Enable real-time alerts for offers, bookings & inquiries'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void enablePushNotifications()}
                className="bg-blue-900 hover:bg-blue-800 text-white px-3 py-1.5 rounded-xl font-bold"
              >
                Enable Push
              </button>
              <button
                type="button"
                onClick={() => setIsNotificationsModalOpen(true)}
                className="bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl font-bold border border-slate-200"
              >
                Inbox ({unreadNotificationsCount})
              </button>
            </div>
          </div>

          {/* Notification Channel Toggles */}
          {currentUser && (
            <div className="space-y-2 pt-1">
              <strong className="block text-slate-800">Notification Topics</strong>
              {(
                [
                  ['offers', 'Business Offers & Deals'],
                  ['bookings', 'Appointment Confirmations'],
                  ['inquiries', 'Inquiry Replies'],
                  ['events', 'VizagConnect LIVE Events'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer"
                >
                  <span className="text-slate-700 font-medium">{label}</span>
                  <input
                    type="checkbox"
                    checked={notifPrefs[key]}
                    onChange={(e) =>
                      void handleTogglePref(
                        { ...notifPrefs, [key]: e.target.checked },
                        privacyPrefs
                      )
                    }
                    className="w-4 h-4 accent-blue-800"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPOINTMENTS & INQUIRIES */}
      {activeSubTab === 'bookings' && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-700" />
              <span>My Appointments ({customerAppointments.length})</span>
            </h4>
            {customerAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                No appointments booked yet. Open any business profile and tap "Book Appointment".
              </div>
            ) : (
              customerAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900">{apt.businessName}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800">
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      {apt.serviceOrProduct} • {apt.slotDate} ({apt.slotTime})
                    </p>
                  </div>
                  {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                    <button
                      type="button"
                      onClick={() => void updateAppointmentStatus(apt.id, 'Cancelled')}
                      className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 font-bold border border-rose-200"
                    >
                      Cancel Slot
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="space-y-2.5">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span>My Business Inquiries ({inquiries.length})</span>
            </h4>
            {inquiries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                No inquiries sent yet.
              </div>
            ) : (
              inquiries.map((inq) => (
                <div key={inq.id} className="bg-white rounded-2xl border border-slate-200 p-4 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900">{inq.businessName}</strong>
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full">
                      {inq.status}
                    </span>
                  </div>
                  <p className="text-slate-600">"{inq.message}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNT & PRIVACY */}
      {activeSubTab === 'account' && (
        <div className="space-y-4">
          {!currentUser ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-3">
              <UserCheck className="w-10 h-10 text-blue-700 mx-auto" />
              <h4 className="font-bold text-slate-900 text-base">Sign in to Manage Your Account</h4>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-blue-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs"
              >
                Sign In with Phone OTP or Google
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900">Profile Details</h4>
                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="inline-flex items-center gap-1 font-bold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                  <select
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    {VIZAG_AREAS.filter((a) => a !== 'All Areas in Vizag').map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3.5 py-2 rounded-xl text-slate-600 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="bg-blue-900 text-white font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Name</span>
                    <div className="font-bold text-slate-800 mt-0.5">{currentUser.name}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Locality</span>
                    <div className="font-bold text-slate-800 mt-0.5">{currentUser.area}</div>
                  </div>
                </div>
              )}

              {/* Privacy Settings */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <strong className="block text-slate-800">Privacy Settings</strong>
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <span>Use GPS location for Near Me business distance</span>
                  <input
                    type="checkbox"
                    checked={privacyPrefs.shareLocationForNearby}
                    onChange={(e) =>
                      void handleTogglePref(notifPrefs, {
                        ...privacyPrefs,
                        shareLocationForNearby: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-800"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <span>Show my profile name on verified reviews</span>
                  <input
                    type="checkbox"
                    checked={privacyPrefs.showProfileNameInReviews}
                    onChange={(e) =>
                      void handleTogglePref(notifPrefs, {
                        ...privacyPrefs,
                        showProfileNameInReviews: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-800"
                  />
                </label>
              </div>

              {/* Account Deletion */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                {!confirmDeleteStep ? (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h5 className="font-bold text-rose-700">Delete Account</h5>
                      <p className="text-[11px] text-slate-500">
                        Permanently delete your VizagConnect account and private profile data.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteStep(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete My Account</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-start gap-2 text-rose-900 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Confirm permanent account deletion? This action cannot be undone.</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStep(false)}
                        className="px-3 py-1.5 rounded-lg bg-white text-slate-700 font-semibold border border-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleConfirmDeleteAccount()}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
                      >
                        {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SUPPORT & REPORTS */}
      {activeSubTab === 'support' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div>
              <h4 className="font-extrabold text-sm text-emerald-950">
                Official VizagConnect Support Desk
              </h4>
              <p className="text-emerald-800 mt-0.5">
                WhatsApp Helpline: <strong>+91 8466947304</strong>
              </p>
            </div>
            <a
              href={OFFICIAL_SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsSupportModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-900 text-white font-bold inline-flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Open FAQ &amp; Guidelines</span>
            </button>
            <button
              type="button"
              onClick={() => openReportModal({})}
              className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold inline-flex items-center gap-1.5"
            >
              <Flag className="w-4 h-4" />
              <span>Submit Complaint / Report</span>
            </button>
          </div>

          {reports.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <strong className="block text-slate-800">My Submitted Reports ({reports.length})</strong>
              {reports.map((r) => (
                <div key={r.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900">{r.reason}</strong>
                    <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                      {r.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{r.details}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
