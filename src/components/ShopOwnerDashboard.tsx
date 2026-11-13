import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Star,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Phone,
  MessageCircle,
  X,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  Package,
  CalendarClock,
  Tag,
  Upload,
  Camera,
  Loader2,
  Award,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VIZAG_AREAS, MOCK_CATEGORIES } from '../data/mockData';
import {
  AppointmentBooking,
  BusinessListing,
  BusinessOffer,
  BusinessProduct,
  BusinessScale,
} from '../types';
import { LocationPickerMap } from './LocationPickerMap';
import { uploadBusinessImage } from '../lib/storage';
import { captureNativePhotoFile, isNativeAndroid } from '../lib/capacitor';

const DEFAULT_FALLBACK_BANNER =
  '/assets/aistudio/WhatsApp_Image_2026-11-12_at_6.03.22_PM_cdf1fa93.jpeg';

const DEFAULT_SLOTS = [
  '10:00 AM - 11:00 AM',
  '11:30 AM - 12:30 PM',
  '03:00 PM - 04:00 PM',
  '05:00 PM - 06:00 PM',
];

type DashboardTab =
  | 'inquiries'
  | 'appointments'
  | 'products'
  | 'offers'
  | 'listings'
  | 'reviews';

export const ShopOwnerDashboard: React.FC = () => {
  const {
    ownerBusiness,
    businesses,
    listingQuota,
    addBusinessListing,
    updateBusinessListing,
    deleteBusinessListing,
    inquiries,
    updateInquiryStatus,
    appointments,
    updateAppointmentStatus,
    productsByBusiness,
    loadBusinessProducts,
    addBusinessProduct,
    updateBusinessProduct,
    deleteBusinessProduct,
    saveBusinessOffers,
    saveBusinessAppointmentSlots,
    loadBusinessReviews,
    setActiveTab,
    currentUser,
    setIsAuthModalOpen,
    showToast,
  } = useApp();

  const [activeTab, setActiveTabState] = useState<DashboardTab>('inquiries');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessListing | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [listingUploadProgress, setListingUploadProgress] = useState<number | null>(null);

  const ownerListings = useMemo(
    () =>
      currentUser
        ? currentUser.isAdmin
          ? businesses
          : businesses.filter((b) => b.ownerId === currentUser.id)
        : [],
    [currentUser, businesses]
  );

  const [selectedManagedBizId, setSelectedManagedBizId] = useState<string>('');
  const activeManagedBiz = useMemo(() => {
    if (ownerListings.length === 0) return null;
    return ownerListings.find((b) => b.id === selectedManagedBizId) || ownerListings[0];
  }, [ownerListings, selectedManagedBizId]);

  useEffect(() => {
    if (activeManagedBiz && activeManagedBiz.id !== selectedManagedBizId) {
      setSelectedManagedBizId(activeManagedBiz.id);
    }
  }, [activeManagedBiz, selectedManagedBizId]);

  useEffect(() => {
    if (activeManagedBiz) {
      void loadBusinessProducts(activeManagedBiz.id);
    }
  }, [activeManagedBiz?.id]);

  useEffect(() => {
    if (activeTab === 'reviews' && ownerListings.length > 0) {
      ownerListings.forEach((b) => {
        if (!b.reviews) {
          void loadBusinessReviews(b.id, Boolean(currentUser?.isAdmin));
        }
      });
    }
  }, [activeTab, ownerListings.length]);

  const ownerInquiries = currentUser
    ? currentUser.isAdmin
      ? inquiries
      : inquiries.filter((i) => i.businessOwnerId === currentUser.id)
    : [];

  const ownerAppointments = currentUser
    ? currentUser.isAdmin
      ? appointments
      : appointments.filter((a) => a.businessOwnerId === currentUser.id)
    : [];

  const allOwnerReviews = ownerListings.flatMap((b) =>
    (b.reviews || []).map((r) => ({ ...r, businessName: b.name }))
  );

  const avgOwnerRating = (() => {
    const rated = ownerListings.filter((b) => (b.rating || 0) > 0);
    if (rated.length === 0) return 'New';
    const avg = rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length;
    return avg.toFixed(1);
  })();

  // Business listing form state
  const emptyListingForm = () => ({
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
    phone: currentUser?.phone || '',
    whatsapp: '',
    email: currentUser?.email || '',
    establishedYear: 2020,
    verificationBadge: 'Local Merchant Verified' as BusinessListing['verificationBadge'],
    imageUrl: DEFAULT_FALLBACK_BANNER,
    description: '',
    keyOfferings: 'Quality Service, Local Supply, Direct Support',
    manufacturingCapacity: '',
    businessHours: '09:00 AM - 08:00 PM (Monday to Saturday)',
    contactPerson: currentUser?.name || '',
    contactDesignation: 'Proprietor',
  });

  const [formData, setFormData] = useState(emptyListingForm);

  // Products CRUD form state
  const [editingProduct, setEditingProduct] = useState<BusinessProduct | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productUploadProgress, setProductUploadProgress] = useState<number | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    price: '',
    unit: 'per unit',
    availability: 'In Stock' as BusinessProduct['availability'],
    description: '',
    imageUrl: '',
  });

  // Offers & Appointment Slots state
  const [isSavingOffers, setIsSavingOffers] = useState(false);
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    discountBadge: '',
    validTill: '',
    tag: 'Local Deal',
  });
  const [newSlotInput, setNewSlotInput] = useState('');
  const [isSavingSlots, setIsSavingSlots] = useState(false);

  const handleListingFileUpload = async (file: File) => {
    if (!currentUser) return;
    setListingUploadProgress(5);
    try {
      const res = await uploadBusinessImage(file, currentUser.id, 'listings', (pct) =>
        setListingUploadProgress(pct)
      );
      setFormData((prev) => ({ ...prev, imageUrl: res.url }));
      showToast('Business photograph uploaded.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to upload business photograph.');
    } finally {
      setListingUploadProgress(null);
    }
  };

  const handleProductFileUpload = async (file: File) => {
    if (!currentUser) return;
    setProductUploadProgress(5);
    try {
      const res = await uploadBusinessImage(file, currentUser.id, 'products', (pct) =>
        setProductUploadProgress(pct)
      );
      setProductForm((prev) => ({ ...prev, imageUrl: res.url }));
      showToast('Product photograph uploaded.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to upload product photograph.');
    } finally {
      setProductUploadProgress(null);
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in to save your business listing');
      return;
    }

    const selectedCat = MOCK_CATEGORIES.find((c) => c.id === formData.category);
    setIsSaving(true);

    try {
      if (editingBusiness) {
        await updateBusinessListing(editingBusiness.id, {
          name: formData.name.trim(),
          teluguName: formData.teluguName.trim() || undefined,
          tagline: formData.tagline.trim(),
          scale: formData.scale,
          category: formData.category,
          categoryLabel: selectedCat?.name || formData.categoryLabel,
          area: formData.area,
          address: formData.address.trim(),
          landmark: formData.landmark.trim() || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
          phone: formData.phone.trim(),
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          email: formData.email.trim(),
          establishedYear: Number(formData.establishedYear) || 2020,
          imageUrl: formData.imageUrl.trim() || DEFAULT_FALLBACK_BANNER,
          gallery: [formData.imageUrl.trim() || DEFAULT_FALLBACK_BANNER],
          description: formData.description.trim(),
          keyOfferings: formData.keyOfferings
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          manufacturingCapacity: formData.manufacturingCapacity.trim() || undefined,
          businessHours: formData.businessHours.trim(),
          contactPerson: formData.contactPerson.trim() || currentUser.name,
          contactDesignation: formData.contactDesignation.trim() || 'Proprietor',
        });
        setEditingBusiness(null);
      } else {
        await addBusinessListing({
          name: formData.name.trim(),
          teluguName: formData.teluguName.trim() || undefined,
          tagline: formData.tagline.trim(),
          scale: formData.scale,
          category: formData.category,
          categoryLabel: selectedCat?.name || 'Local Business',
          area: formData.area,
          address: formData.address.trim(),
          landmark: formData.landmark.trim() || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
          status: currentUser.isAdmin ? 'approved' : 'pending',
          phone: formData.phone.trim(),
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          email: formData.email.trim(),
          establishedYear: Number(formData.establishedYear) || 2020,
          verified: Boolean(currentUser.isAdmin),
          verificationBadge: formData.verificationBadge,
          imageUrl: formData.imageUrl.trim() || DEFAULT_FALLBACK_BANNER,
          gallery: [formData.imageUrl.trim() || DEFAULT_FALLBACK_BANNER],
          description: formData.description.trim(),
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
          contactPerson: formData.contactPerson.trim() || currentUser.name,
          contactDesignation: formData.contactDesignation.trim() || 'Proprietor',
        });
      }

      setIsAddModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (biz: BusinessListing) => {
    setEditingBusiness(biz);
    setFormData({
      name: biz.name,
      teluguName: biz.teluguName || '',
      tagline: biz.tagline,
      scale: biz.scale,
      category: biz.category,
      categoryLabel: biz.categoryLabel,
      area: biz.area,
      address: biz.address,
      landmark: biz.landmark || '',
      latitude: biz.latitude || 17.6905,
      longitude: biz.longitude || 83.2095,
      phone: biz.phone,
      whatsapp: biz.whatsapp,
      email: biz.email,
      establishedYear: biz.establishedYear,
      verificationBadge: biz.verificationBadge,
      imageUrl: biz.imageUrl || DEFAULT_FALLBACK_BANNER,
      description: biz.description,
      keyOfferings: biz.keyOfferings.join(', '),
      manufacturingCapacity: biz.manufacturingCapacity || '',
      businessHours: biz.businessHours,
      contactPerson: biz.contactPerson,
      contactDesignation: biz.contactDesignation,
    });
    setIsAddModalOpen(true);
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      category: activeManagedBiz?.categoryLabel || 'General',
      price: '',
      unit: 'per piece',
      availability: 'In Stock',
      description: '',
      imageUrl: '',
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: BusinessProduct) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      category: prod.category,
      price: String(prod.price),
      unit: prod.unit || '',
      availability: prod.availability,
      description: prod.description || '',
      imageUrl: prod.imageUrl || '',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeManagedBiz) return;
    if (!productForm.name.trim()) {
      showToast('Enter a product or service name.');
      return;
    }

    const numericPrice = Math.max(0, Number(productForm.price) || 0);
    setIsSavingProduct(true);
    try {
      if (editingProduct) {
        await updateBusinessProduct(activeManagedBiz.id, editingProduct.id, {
          name: productForm.name.trim(),
          category: productForm.category.trim() || activeManagedBiz.categoryLabel,
          price: numericPrice,
          unit: productForm.unit.trim() || undefined,
          availability: productForm.availability,
          description: productForm.description.trim() || undefined,
          imageUrl: productForm.imageUrl.trim() || undefined,
        });
      } else {
        await addBusinessProduct(activeManagedBiz.id, {
          name: productForm.name.trim(),
          category: productForm.category.trim() || activeManagedBiz.categoryLabel,
          price: numericPrice,
          unit: productForm.unit.trim() || undefined,
          availability: productForm.availability,
          description: productForm.description.trim() || undefined,
          imageUrl: productForm.imageUrl.trim() || undefined,
        });
      }
      setIsProductModalOpen(false);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeManagedBiz) return;
    if (!offerForm.title.trim() || !offerForm.description.trim()) {
      showToast('Enter offer title and description.');
      return;
    }
    const newOffer: BusinessOffer = {
      id: `off-${Date.now()}`,
      businessId: activeManagedBiz.id,
      businessName: activeManagedBiz.name,
      title: offerForm.title.trim(),
      description: offerForm.description.trim(),
      discountBadge: offerForm.discountBadge.trim() || undefined,
      validTill: offerForm.validTill.trim() || 'Limited Period',
      tag: offerForm.tag.trim() || 'Local Deal',
    };
    const nextOffers = [newOffer, ...(activeManagedBiz.offers || [])].slice(0, 10);
    setIsSavingOffers(true);
    try {
      await saveBusinessOffers(activeManagedBiz.id, nextOffers);
      setOfferForm({
        title: '',
        description: '',
        discountBadge: '',
        validTill: '',
        tag: 'Local Deal',
      });
    } finally {
      setIsSavingOffers(false);
    }
  };

  const handleRemoveOffer = async (offerId: string) => {
    if (!activeManagedBiz) return;
    const nextOffers = (activeManagedBiz.offers || []).filter((o) => o.id !== offerId);
    setIsSavingOffers(true);
    try {
      await saveBusinessOffers(activeManagedBiz.id, nextOffers);
    } finally {
      setIsSavingOffers(false);
    }
  };

  const handleAddAppointmentSlot = async () => {
    if (!activeManagedBiz || !newSlotInput.trim()) return;
    const currentSlots =
      activeManagedBiz.appointmentSlots && activeManagedBiz.appointmentSlots.length > 0
        ? activeManagedBiz.appointmentSlots
        : DEFAULT_SLOTS;
    if (currentSlots.includes(newSlotInput.trim())) {
      showToast('This slot already exists.');
      return;
    }
    setIsSavingSlots(true);
    try {
      await saveBusinessAppointmentSlots(activeManagedBiz.id, [
        ...currentSlots,
        newSlotInput.trim(),
      ]);
      setNewSlotInput('');
    } finally {
      setIsSavingSlots(false);
    }
  };

  const handleRemoveAppointmentSlot = async (slot: string) => {
    if (!activeManagedBiz) return;
    const currentSlots =
      activeManagedBiz.appointmentSlots && activeManagedBiz.appointmentSlots.length > 0
        ? activeManagedBiz.appointmentSlots
        : DEFAULT_SLOTS;
    setIsSavingSlots(true);
    try {
      await saveBusinessAppointmentSlots(
        activeManagedBiz.id,
        currentSlots.filter((s) => s !== slot)
      );
    } finally {
      setIsSavingSlots(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="pb-24 pt-6 max-w-xl mx-auto px-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="font-extrabold text-lg text-slate-900">
            Sign In to Access Business &amp; Factory Portal
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Verify your +91 mobile number or Google account to register your Visakhapatnam business, manage product prices, appointment bookings, offers, and customer inquiries.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Home
            </button>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-teal-600 text-white text-xs font-bold shadow-md"
            >
              Sign In / Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  const managedProducts = activeManagedBiz ? productsByBusiness[activeManagedBiz.id] || [] : [];
  const managedSlots =
    activeManagedBiz?.appointmentSlots && activeManagedBiz.appointmentSlots.length > 0
      ? activeManagedBiz.appointmentSlots
      : DEFAULT_SLOTS;

  const statusMeta = (status: BusinessListing['status']) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved & Live',
          cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'rejected':
        return {
          label: 'Needs Changes (Rejected)',
          cls: 'bg-rose-50 text-rose-800 border-rose-200',
        };
      case 'suspended':
        return {
          label: 'Suspended',
          cls: 'bg-slate-100 text-slate-800 border-slate-300',
        };
      default:
        return {
          label: 'Pending Verification',
          cls: 'bg-amber-50 text-amber-800 border-amber-200',
        };
    }
  };

  return (
    <div className="pb-24 pt-2 max-w-6xl mx-auto px-4 space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-teal-950 text-white rounded-3xl p-5 shadow-lg border border-teal-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-teal-300 transition-colors shrink-0"
              title="Return to City Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-lg sm:text-xl text-white truncate">
                  {ownerBusiness?.name || 'Visakhapatnam Business & Factory Portal'}
                </h2>
                <span className="text-[11px] font-semibold text-amber-300">
                  Owner Workspace
                </span>
              </div>
              <p className="text-xs text-teal-200 mt-0.5">
                {ownerBusiness
                  ? `${ownerBusiness.area}, Visakhapatnam · ${ownerBusiness.scale}`
                  : 'Visakhapatnam, Andhra Pradesh · Register your business or manufacturing factory'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingBusiness(null);
                setFormData(emptyListingForm());
                setIsAddModalOpen(true);
              }}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>List New Business</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="bg-white/15 hover:bg-white/25 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 whitespace-nowrap shrink-0"
            >
              View Directory
            </button>
          </div>
        </div>

        {/* Portal Metrics (Live Firestore Counts) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/10 rounded-2xl p-3">
            <span className="text-[11px] text-teal-200 font-semibold">
              Owned Listings
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5 tabular-nums">
              {ownerListings.length}
            </div>
            <span className="text-[11px] text-emerald-300">
              {ownerListings.filter((b) => b.status === 'approved').length} approved &amp; live
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3">
            <span className="text-[11px] text-teal-200 font-semibold">
              Inquiries &amp; Bookings
            </span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5 tabular-nums">
              {ownerInquiries.length} / {ownerAppointments.length}
            </div>
            <span className="text-[11px] text-teal-300">
              Direct messages &amp; slots
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3">
            <span className="text-[11px] text-teal-200 font-semibold">
              Catalog &amp; Reviews
            </span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5 tabular-nums">
              {allOwnerReviews.length} ({avgOwnerRating})
            </div>
            <span className="text-[11px] text-slate-300">
              Verified customer feedback
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3">
            <span className="text-[11px] text-teal-200 font-semibold">
              Founding Free Quota
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5 flex items-center gap-1 tabular-nums">
              <span>{listingQuota.remainingFreeSlots}/{listingQuota.maxFreeListings}</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-slate-300">
              First-100 free slots remaining
            </span>
          </div>
        </div>
      </div>

      {/* Business Switcher if owner has listings */}
      {ownerListings.length > 0 && (activeTab === 'products' || activeTab === 'offers') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <p className="text-xs font-bold text-slate-900">Managing Business Workspace</p>
            <p className="text-[11px] text-slate-500">
              Select which registered business listing to manage catalog, offers, and slots for.
            </p>
          </div>
          <select
            value={activeManagedBiz?.id || ''}
            onChange={(e) => setSelectedManagedBizId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-600"
          >
            {ownerListings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-5 text-xs font-bold overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTabState('inquiries')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
            activeTab === 'inquiries'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="tabular-nums">Inquiries ({ownerInquiries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabState('appointments')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
            activeTab === 'appointments'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span className="tabular-nums">Appointments ({ownerAppointments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabState('products')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
            activeTab === 'products'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="tabular-nums">Products &amp; Prices ({managedProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabState('offers')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
            activeTab === 'offers'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Offers &amp; Slots</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabState('listings')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
            activeTab === 'listings'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span className="tabular-nums">Listings &amp; Status ({ownerListings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabState('reviews')}
          className={`pb-2.5 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
            activeTab === 'reviews'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Star className="w-4 h-4 text-amber-500" />
          <span className="tabular-nums">Reviews ({allOwnerReviews.length})</span>
        </button>
      </div>

      {/* TAB 1: INCOMING INQUIRIES */}
      {activeTab === 'inquiries' && (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-600">
            Direct wholesale, manufacturing supply, and retail quote inquiries submitted by Visakhapatnam customers.
          </p>

          {ownerInquiries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">No customer inquiries yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once customers view your approved business profile and request a quote, their messages appear here immediately.
              </p>
            </div>
          ) : (
            ownerInquiries.map((inq) => (
              <div
                key={inq.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono font-bold text-sm text-blue-950">
                        Inquiry #{inq.id}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-teal-800">{inq.inquiryType}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{inq.date}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium mt-1">
                      Customer: <strong>{inq.userName}</strong> · {inq.userPhone}
                      {inq.userEmail ? ` · ${inq.userEmail}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">Regarding: {inq.businessName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Status:</span>
                    <select
                      value={inq.status}
                      onChange={(e) =>
                        updateInquiryStatus(inq.id, e.target.value as 'Pending' | 'Contacted' | 'Closed')
                      }
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-600"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-800 leading-relaxed border border-slate-100">
                  &ldquo;{inq.message}&rdquo;
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`https://wa.me/${inq.userPhone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                      inq.userName
                    )},%20responding%20to%20your%20inquiry%20for%20${encodeURIComponent(
                      inq.businessName
                    )}%20on%20VizagConnect.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-200"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Reply on WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${inq.userPhone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Customer</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-600">
            Manage customer appointment slots booked through VizagConnect. Cancelling a booking automatically frees up the reserved slot.
          </p>

          {ownerAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <CalendarClock className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">No appointment bookings yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Customers can reserve time slots from your business profile page. You can customize available time slots in the Offers &amp; Slots tab.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ownerAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{apt.customerName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-xs font-semibold text-blue-800">{apt.businessName}</span>
                      <span className="text-slate-400">·</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                          apt.status === 'Confirmed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : apt.status === 'Completed'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : apt.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-semibold tabular-nums">
                      {apt.slotDate} · {apt.slotTime} · Service: {apt.serviceOrProduct}
                    </p>
                    <p className="text-xs text-slate-500">
                      Phone: {apt.customerPhone}
                      {apt.notes ? ` · Notes: "${apt.notes}"` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {apt.status === 'Requested' && (
                      <button
                        type="button"
                        onClick={() => updateAppointmentStatus(apt.id, 'Confirmed')}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm</span>
                      </button>
                    )}
                    {(apt.status === 'Requested' || apt.status === 'Confirmed') && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(apt.id, 'Completed')}
                          className="px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold whitespace-nowrap"
                        >
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(apt.id, 'Cancelled')}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Slot</span>
                        </button>
                      </>
                    )}
                    <a
                      href={`tel:${apt.customerPhone}`}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCTS & PRICES */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {!activeManagedBiz ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">
                Create a business listing first
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Register your shop or service center to publish transparent ₹ prices and products for Vizag customers.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingBusiness(null);
                  setFormData(emptyListingForm());
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold"
              >
                Register Business
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Products &amp; Service Catalog for {activeManagedBiz.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Listed prices appear in customer Price Comparison and business profile views once your business is approved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewProductModal}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product / Service</span>
                </button>
              </div>

              {managedProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2.5">
                  <Package className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-slate-900 text-sm">No products or services listed</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add your real products, service packages, and ₹ pricing so Visakhapatnam shoppers can compare offerings accurately.
                  </p>
                  <button
                    type="button"
                    onClick={openNewProductModal}
                    className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Product</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {managedProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3.5 items-start justify-between"
                    >
                      <div className="flex gap-3 min-w-0">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100 border border-slate-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{prod.category}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                prod.availability === 'In Stock'
                                  ? 'text-emerald-700 font-semibold'
                                  : prod.availability === 'Out of Stock'
                                  ? 'text-rose-700 font-semibold'
                                  : 'text-amber-700 font-semibold'
                              }
                            >
                              {prod.availability}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 truncate mt-0.5">
                            {prod.name}
                          </h4>
                          <p className="text-sm font-black text-blue-800 tabular-nums mt-0.5">
                            ₹{prod.price.toLocaleString('en-IN')}
                            {prod.unit ? (
                              <span className="text-xs font-medium text-slate-500">
                                {' '}
                                / {prod.unit}
                              </span>
                            ) : null}
                          </p>
                          {prod.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                              {prod.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditProductModal(prod)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="Edit product"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBusinessProduct(activeManagedBiz.id, prod.id)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 4: OFFERS & APPOINTMENT SLOTS */}
      {activeTab === 'offers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!activeManagedBiz ? (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-xs text-slate-500">
                Register a business listing first to configure special offers and appointment slots.
              </p>
            </div>
          ) : (
            <>
              {/* Active Offers */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Special Offers · {activeManagedBiz.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Publish real discounts, seasonal deals, or bulk inquiry promotions.
                  </p>
                </div>

                <form onSubmit={handleAddOffer} className="space-y-2.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    required
                    placeholder="Offer title (e.g. 10% Off Plumbing Pipe Bulk Orders)"
                    value={offerForm.title}
                    onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                  <textarea
                    rows={2}
                    required
                    placeholder="Offer terms & conditions..."
                    value={offerForm.description}
                    onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Badge (e.g. 10% OFF)"
                      value={offerForm.discountBadge}
                      onChange={(e) =>
                        setOfferForm({ ...offerForm, discountBadge: e.target.value })
                      }
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Valid till (e.g. 30 Nov)"
                      value={offerForm.validTill}
                      onChange={(e) => setOfferForm({ ...offerForm, validTill: e.target.value })}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Tag (Festival / Bulk)"
                      value={offerForm.tag}
                      onChange={(e) => setOfferForm({ ...offerForm, tag: e.target.value })}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingOffers}
                    className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-60"
                  >
                    {isSavingOffers ? 'Publishing Offer...' : 'Publish Offer'}
                  </button>
                </form>

                <div className="space-y-2.5">
                  {(activeManagedBiz.offers || []).length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No active offers published for this business yet.
                    </p>
                  ) : (
                    (activeManagedBiz.offers || []).map((off) => (
                      <div
                        key={off.id}
                        className="p-3 rounded-xl border border-slate-200 flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {off.discountBadge && (
                              <span className="font-bold text-teal-800">{off.discountBadge}</span>
                            )}
                            <span>{off.tag}</span>
                            <span aria-hidden="true">·</span>
                            <span>Valid till {off.validTill}</span>
                          </div>
                          <h4 className="font-bold text-xs text-slate-900 mt-0.5">{off.title}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">{off.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOffer(off.id)}
                          disabled={isSavingOffers}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 shrink-0"
                          title="Remove offer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Appointment Slots Configuration */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Appointment Time Slots · {activeManagedBiz.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize bookable customer visit or consultation hours.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 04:00 PM - 05:00 PM"
                    value={newSlotInput}
                    onChange={(e) => setNewSlotInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddAppointmentSlot}
                    disabled={isSavingSlots || !newSlotInput.trim()}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    Add Slot
                  </button>
                </div>

                <div className="space-y-2">
                  {managedSlots.map((slot) => (
                    <div
                      key={slot}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-blue-700" />
                        <span>{slot}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAppointmentSlot(slot)}
                        disabled={isSavingSlots || managedSlots.length <= 1}
                        className="text-rose-600 hover:text-rose-800 disabled:opacity-40 text-xs font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 5: MANAGE LISTINGS & HOURS */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              View moderation status, Founding-100 free slot assignments, opening hours, and business location coordinates.
            </p>
          </div>

          {ownerListings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">No business listings created yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                List your Visakhapatnam shop, artisan workshop, or manufacturing factory with verified contact and Google Maps coordinates.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingBusiness(null);
                  setFormData(emptyListingForm());
                  setIsAddModalOpen(true);
                }}
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>List New Business</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {ownerListings.map((biz) => {
                const st = statusMeta(biz.status);
                return (
                  <div
                    key={biz.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between">
                      <div className="flex gap-3 items-center min-w-0">
                        <img
                          src={biz.imageUrl || DEFAULT_FALLBACK_BANNER}
                          alt={biz.name}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100 border border-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-slate-600 font-semibold">{biz.scale}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-teal-700 font-semibold">{biz.area}</span>
                            {biz.freeListingEligible && biz.freeListingNumber && (
                              <>
                                <span className="text-slate-400">·</span>
                                <span className="text-emerald-700 font-bold inline-flex items-center gap-1 tabular-nums">
                                  <Award className="w-3.5 h-3.5" />
                                  Founding Free #{biz.freeListingNumber}/100
                                </span>
                              </>
                            )}
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900 truncate mt-0.5">
                            {biz.name}
                          </h4>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {biz.contactPerson} · {biz.phone} · {biz.businessHours}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap self-end sm:self-center shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${st.cls}`}>
                          {st.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditModal(biz)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBusinessListing(biz.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {biz.status === 'rejected' && biz.rejectionReason && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
                        <strong>Admin Review Feedback:</strong> {biz.rejectionReason}. Update your business details and save to request re-review.
                      </div>
                    )}
                    {biz.status === 'suspended' && biz.suspensionReason && (
                      <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-xs text-slate-800">
                        <strong>Suspension Notice:</strong> {biz.suspensionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CUSTOMER REVIEWS & RATINGS */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Customer Ratings &amp; Feedback
              </h3>
              <p className="text-xs text-slate-500">
                Direct reviews submitted by authenticated Visakhapatnam shoppers and clients.
              </p>
            </div>
            <span className="text-xs text-teal-800 font-semibold">
              Verified Review Moderation Active
            </span>
          </div>

          {allOwnerReviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <Star className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">No customer reviews yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Customer ratings and reviews left on your approved business listings will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allOwnerReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-sm text-slate-900">{rev.userName}</span>
                        <span className="text-slate-400">·</span>
                        <span
                          className={
                            rev.status === 'approved'
                              ? 'text-emerald-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {rev.status === 'approved' ? 'Approved & Public' : 'Under Review'}
                        </span>
                      </div>
                      <p className="text-xs text-blue-700 font-semibold mt-0.5">
                        For: {rev.businessName}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                      <span className="text-slate-400 text-xs ml-1">{rev.date}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Business Listing Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingBusiness
                  ? 'Edit Business / Factory Listing'
                  : 'List Your Vizag Business or Factory'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingBusiness && !currentUser.isAdmin && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                <Award className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  New submissions enter Admin Verification.{' '}
                  <strong>
                    {listingQuota.remainingFreeSlots}/{listingQuota.maxFreeListings}
                  </strong>{' '}
                  First-100 Founding Free Listing slots remain.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveBusiness} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Business / Factory Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Visakha Precision Metal Works"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scale *</label>
                  <select
                    value={formData.scale}
                    onChange={(e) =>
                      setFormData({ ...formData, scale: e.target.value as BusinessScale })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="Small Business">Small Business</option>
                    <option value="Medium Enterprise">Medium Enterprise</option>
                    <option value="Large Manufacturing Factory">Large Manufacturing Factory</option>
                    <option value="Artisan / Cottage Industry">Artisan / Cottage Industry</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    {MOCK_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vizag Area *</label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    {VIZAG_AREAS.filter((a) => a !== 'All Areas in Vizag').map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Opening Hours *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessHours}
                    onChange={(e) => setFormData({ ...formData, businessHours: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tagline / Specialization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CNC Laser Machining & Custom Industrial Structures"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Street Address &amp; Landmark *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shed 14, Autonagar Industrial Belt, Gajuwaka, Vizag - 530012"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              {/* Photo Upload (Cloud Storage + Native Camera) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <label className="block font-semibold text-slate-700">
                  Business / Storefront Photograph
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={formData.imageUrl || DEFAULT_FALLBACK_BANNER}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                  />
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold cursor-pointer">
                      {listingUploadProgress !== null ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {listingUploadProgress !== null
                          ? `Uploading ${listingUploadProgress}%`
                          : 'Upload Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleListingFileUpload(file);
                        }}
                      />
                    </label>

                    {isNativeAndroid() && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const f = await captureNativePhotoFile();
                            if (f) await handleListingFileUpload(f);
                          } catch (err: unknown) {
                            showToast(err instanceof Error ? err.message : 'Camera error');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white font-bold"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Camera</span>
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="url"
                  placeholder="Or paste verified HTTPS image URL"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700"
                />
              </div>

              {/* Interactive Location Pinning */}
              <div>
                <LocationPickerMap
                  area={formData.area}
                  address={formData.address}
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationChange={(lat, lng) =>
                    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                  }
                  onAddressSelect={(formattedAddr) =>
                    setFormData((prev) =>
                      prev.address.trim() ? prev : { ...prev, address: formattedAddr }
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number (+91) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98480 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Business WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="919848012345"
                    value={formData.whatsapp}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M. Sriman Narayana"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="Proprietor / Managing Director"
                    value={formData.contactDesignation}
                    onChange={(e) =>
                      setFormData({ ...formData, contactDesignation: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Key Capabilities / Offerings (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.keyOfferings}
                  onChange={(e) => setFormData({ ...formData, keyOfferings: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plant / Manufacturing Capacity (if factory)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 150 Metric Tonnes finished fabrication / month"
                  value={formData.manufacturingCapacity}
                  onChange={(e) =>
                    setFormData({ ...formData, manufacturingCapacity: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain your services, product lines, and quality standards..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-60"
                >
                  {isSaving
                    ? 'Saving...'
                    : editingBusiness
                    ? 'Save Changes'
                    : currentUser.isAdmin
                    ? 'Publish Listing'
                    : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && activeManagedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? 'Edit Product / Service' : 'Add Product / Service'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product / Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Split AC Servicing & Gas Refill"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 650"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="per visit / per kg / per piece"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Repairs & Maintenance"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Availability</label>
                  <select
                    value={productForm.availability}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        availability: e.target.value as BusinessProduct['availability'],
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="By Appointment">By Appointment</option>
                    <option value="Made to Order">Made to Order</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Specifications, warranty, or service inclusions..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <label className="block font-semibold text-slate-700">
                  Product Photo (Optional)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 text-white font-bold cursor-pointer">
                    {productUploadProgress !== null ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {productUploadProgress !== null
                        ? `${productUploadProgress}%`
                        : 'Upload Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleProductFileUpload(file);
                      }}
                    />
                  </label>

                  {isNativeAndroid() && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const f = await captureNativePhotoFile();
                          if (f) await handleProductFileUpload(f);
                        } catch (err: unknown) {
                          showToast(err instanceof Error ? err.message : 'Camera error');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="Or paste image URL"
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-60"
                >
                  {isSavingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
