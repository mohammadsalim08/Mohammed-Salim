import React, { useState } from 'react';
import {
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Camera,
  Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VIZAG_AREAS, BUSINESS_SCALES, MOCK_CATEGORIES } from '../data/mockData';
import { BusinessListing, BusinessScale } from '../types';
import { LocationPickerMap } from './LocationPickerMap';
import { VIZAG_AREA_COORDINATES } from '../data/translations';
import { uploadBusinessImage } from '../lib/storage';
import { captureNativePhotoFile, isNativeAndroid } from '../lib/capacitor';

const DEFAULT_FALLBACK_BANNER =
  '/assets/aistudio/WhatsApp_Image_2026-11-12_at_6.03.22_PM_cdf1fa93.jpeg';

export const RegisterBusinessModal: React.FC = () => {
  const {
    isRegisterModalOpen,
    setIsRegisterModalOpen,
    addBusinessListing,
    listingQuota,
    currentUser,
    setIsAuthModalOpen,
    showToast,
  } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    teluguName: '',
    tagline: '',
    scale: 'Small Business' as BusinessScale,
    category: 'electronics-hardware',
    categoryLabel: 'Electronics, Hardware & Tools',
    area: 'Gajuwaka & Ukkunagaram',
    address: '',
    landmark: '',
    latitude: 17.6905,
    longitude: 83.2095,
    phone: '',
    whatsapp: '',
    email: '',
    establishedYear: 2020,
    verificationBadge: 'Local Merchant Verified' as BusinessListing['verificationBadge'],
    imageUrl: DEFAULT_FALLBACK_BANNER,
    description: '',
    keyOfferings: 'Quality Service, Local Supply, Direct Support',
    manufacturingCapacity: '',
    businessHours: '09:00 AM - 08:00 PM (Monday to Saturday)',
    contactPerson: '',
    contactDesignation: 'Proprietor',
  });

  if (!isRegisterModalOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in first to upload business photographs');
      return;
    }
    setUploadProgress(5);
    try {
      const res = await uploadBusinessImage(file, currentUser.id, 'listings', (pct) =>
        setUploadProgress(pct)
      );
      setFormData((prev) => ({ ...prev, imageUrl: res.url }));
      showToast('Business photo uploaded successfully!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to upload photo');
    } finally {
      setUploadProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in with Phone OTP or Google to submit your business listing');
      return;
    }

    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      showToast('Please fill in Business Name, Phone, and Address');
      return;
    }

    const selectedCat = MOCK_CATEGORIES.find((c) => c.id === formData.category);
    setIsSubmitting(true);

    try {
      await addBusinessListing({
        name: formData.name.trim(),
        teluguName: formData.teluguName.trim() || undefined,
        tagline: formData.tagline.trim() || `${formData.scale} in ${formData.area}`,
        scale: formData.scale,
        category: formData.category,
        categoryLabel: selectedCat?.name || formData.categoryLabel,
        area: formData.area,
        address: formData.address.trim(),
        landmark: formData.landmark.trim() || undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        status: currentUser.isAdmin ? 'approved' : 'pending',
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.replace(/[^0-9]/g, ''),
        email: formData.email.trim(),
        establishedYear: Number(formData.establishedYear) || 2020,
        verified: Boolean(currentUser.isAdmin),
        verificationBadge: formData.verificationBadge,
        imageUrl: formData.imageUrl.trim() || DEFAULT_FALLBACK_BANNER,
        gallery: [formData.imageUrl.trim() || DEFAULT_FALLBACK_BANNER],
        description:
          formData.description.trim() ||
          `${formData.name.trim()} is a ${formData.scale} based in ${formData.area}, Visakhapatnam.`,
        keyOfferings: formData.keyOfferings
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        manufacturingCapacity: formData.manufacturingCapacity.trim() || undefined,
        businessHours: formData.businessHours.trim(),
        isRetail: true,
        isWholesale: true,
        isManufacturer:
          formData.scale === 'Large Manufacturing Factory' ||
          formData.scale === 'Medium Enterprise',
        contactPerson: formData.contactPerson.trim() || currentUser.name || 'Business Owner',
        contactDesignation: formData.contactDesignation.trim() || 'Proprietor',
      });

      setIsRegisterModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-teal-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
              <Building2 className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Register Your Business or Factory
                </h3>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  {listingQuota.remainingFreeSlots}/100 Free Slots Left
                </span>
              </div>
              <p className="text-xs text-teal-100">
                Founding Free Listing assigned automatically upon Admin verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(false)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!currentUser && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Sign in with your +91 Mobile OTP or Google account to submit &amp; manage this listing.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1 rounded-lg shadow-2xs"
            >
              Sign In Now
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Business / Factory Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Visakha Precision Engineering"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Telugu Name (తెలుగులో పేరు)
              </label>
              <input
                type="text"
                placeholder="ఉదాహరణ: విశాఖ ఇంజనీరింగ్ వర్క్స్"
                value={formData.teluguName}
                onChange={(e) => setFormData({ ...formData, teluguName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Business Scale *</label>
              <select
                value={formData.scale}
                onChange={(e) =>
                  setFormData({ ...formData, scale: e.target.value as BusinessScale })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                {BUSINESS_SCALES.filter((s) => s !== 'All Scales').map((scale) => (
                  <option key={scale} value={scale}>
                    {scale}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Sector / Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const cat = MOCK_CATEGORIES.find((c) => c.id === e.target.value);
                  setFormData({
                    ...formData,
                    category: e.target.value,
                    categoryLabel: cat?.name || 'Local Commerce',
                  });
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                {MOCK_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Visakhapatnam Locality *
              </label>
              <select
                value={formData.area}
                onChange={(e) => {
                  const newArea = e.target.value;
                  const coords = VIZAG_AREA_COORDINATES[newArea];
                  setFormData((prev) => ({
                    ...prev,
                    area: newArea,
                    ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
                  }));
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                {VIZAG_AREAS.filter((a) => a !== 'All Areas in Vizag').map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Landmark / Phase
              </label>
              <input
                type="text"
                placeholder="e.g. Near Gajuwaka Flyover"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Full Street Address *
            </label>
            <input
              type="text"
              required
              placeholder="Plot No., Street, Locality, Visakhapatnam, AP - Pin code"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
            />
          </div>

          <LocationPickerMap
            area={formData.area}
            address={formData.address}
            latitude={formData.latitude}
            longitude={formData.longitude}
            onLocationChange={(lat, lng) =>
              setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
            }
            onAddressSelect={(formattedAddr) =>
              setFormData((prev) => (prev.address.trim() ? prev : { ...prev, address: formattedAddr }))
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+91 98480 12345"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                placeholder="919848012345"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="contact@business.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                placeholder="e.g. Venkata Rao"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Business Hours</label>
              <input
                type="text"
                value={formData.businessHours}
                onChange={(e) => setFormData({ ...formData, businessHours: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Key Offerings / Products / Services (comma separated)
            </label>
            <input
              type="text"
              value={formData.keyOfferings}
              onChange={(e) => setFormData({ ...formData, keyOfferings: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Describe your shop, services, manufacturing capacity, or specialties..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800"
            />
          </div>

          {/* Photo Upload + Image URL */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              Business Photograph (Upload to Firebase Storage or Image URL)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {uploadProgress !== null ? `Uploading ${uploadProgress}%...` : 'Upload Photo (JPG/PNG)'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileUpload(file);
                  }}
                />
              </label>

              {isNativeAndroid() && (
                <button
                  type="button"
                  onClick={async () => {
                    const file = await captureNativePhotoFile();
                    if (file) await handleFileUpload(file);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Take Photo</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="Or paste verified HTTPS photo URL"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploadProgress !== null}
              className="bg-gradient-to-r from-blue-900 to-teal-600 hover:opacity-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {isSubmitting
                  ? 'Submitting...'
                  : currentUser?.isAdmin
                  ? 'Publish Business'
                  : 'Submit for Verification'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
