import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithPopup,
  signOut,
  deleteUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  BusinessListing,
  BusinessScale,
  BusinessInquiry,
  BusinessProduct,
  BusinessOffer,
  AppointmentBooking,
  BookedSlot,
  PlatformReport,
  CommunityEvent,
  ListingQuotaState,
  NotificationPreferences,
  PrivacySettings,
  User,
  BusinessReview,
  AppNotification,
  AppLanguage,
} from '../types';
import { VIZAG_AREA_COORDINATES, calculateDistanceKm } from '../data/translations';
import { getCurrentCoordinatesCrossPlatform } from '../lib/capacitor';
import { requestPushToken, subscribeForegroundPush } from '../lib/messaging';
import {
  auth,
  db,
  googleProvider,
  ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
  testConnection,
  clampStr,
  stripUndefined,
} from '../lib/firebase';

export type NavTab = 'home' | 'directory' | 'map' | 'saved' | 'profile' | 'ai' | 'owner' | 'admin';

export interface PendingPhoneProfile {
  name?: string;
  area?: string;
}

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  offers: true,
  bookings: true,
  inquiries: true,
  events: true,
  pushEnabled: false,
};

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  shareLocationForNearby: true,
  showProfileNameInReviews: true,
};

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedArea: string;
  setSelectedArea: (area: string) => void;
  selectedScale: BusinessScale | 'All Scales';
  setSelectedScale: (scale: BusinessScale | 'All Scales') => void;
  selectedCategory: string | null;
  setSelectedCategory: (categoryId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Language & Role Mode
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  userRoleMode: 'customer' | 'owner';
  setUserRoleMode: (mode: 'customer' | 'owner') => void;

  // Customer Location & Nearby
  customerLocation: { lat: number; lng: number } | null;
  isLocatingCustomer: boolean;
  requestCustomerLocation: () => Promise<void>;
  getBusinessDistanceKm: (biz: BusinessListing) => number | null;

  // Directory Data & First-100 Free Quota
  businesses: BusinessListing[];
  approvedBusinesses: BusinessListing[];
  isLoadingBusinesses: boolean;
  listingQuota: ListingQuotaState;
  addBusinessListing: (biz: Omit<BusinessListing, 'id' | 'rating' | 'reviewCount'>) => Promise<void>;
  updateBusinessListing: (id: string, updates: Partial<BusinessListing>) => Promise<void>;
  deleteBusinessListing: (id: string) => Promise<void>;

  // Admin Operations (Atomic First-100 Transaction + Moderation)
  approveBusinessListing: (businessId: string) => Promise<void>;
  rejectBusinessListing: (businessId: string, reason: string) => Promise<void>;
  suspendBusinessListing: (businessId: string, reason: string) => Promise<void>;
  reactivateBusinessListing: (businessId: string) => Promise<void>;
  moderateReview: (
    businessId: string,
    reviewId: string,
    status: 'approved' | 'flagged',
    notes?: string
  ) => Promise<void>;
  publishPublicAnnouncement: (data: {
    title: string;
    message: string;
    type: AppNotification['type'];
    businessId?: string;
  }) => Promise<void>;

  // Products & Services Catalog
  productsByBusiness: Record<string, BusinessProduct[]>;
  allApprovedProducts: Array<BusinessProduct & { business: BusinessListing }>;
  loadBusinessProducts: (businessId: string) => Promise<BusinessProduct[]>;
  addBusinessProduct: (
    businessId: string,
    product: Omit<BusinessProduct, 'id' | 'businessId' | 'ownerId' | 'businessStatus'>
  ) => Promise<void>;
  updateBusinessProduct: (
    businessId: string,
    productId: string,
    updates: Partial<BusinessProduct>
  ) => Promise<void>;
  deleteBusinessProduct: (businessId: string, productId: string) => Promise<void>;

  // Offers & Appointment Slots Management
  saveBusinessOffers: (businessId: string, offers: BusinessOffer[]) => Promise<void>;
  saveBusinessAppointmentSlots: (businessId: string, slots: string[]) => Promise<void>;

  // Appointments & Concurrency-Safe Booking
  appointments: AppointmentBooking[];
  loadBookedSlotsForBusiness: (businessId: string) => Promise<BookedSlot[]>;
  bookAppointment: (data: {
    businessId: string;
    slotDate: string;
    slotTime: string;
    serviceOrProduct: string;
    customerName: string;
    customerPhone: string;
    notes?: string;
  }) => Promise<boolean>;
  updateAppointmentStatus: (
    appointmentId: string,
    status: AppointmentBooking['status']
  ) => Promise<void>;

  // Bookmarks & Recently Viewed
  savedBusinesses: string[];
  toggleSaveBusiness: (id: string) => Promise<void>;
  isBusinessSaved: (id: string) => boolean;
  recentlyViewedIds: string[];

  // Reviews
  addReview: (businessId: string, rating: number, comment: string, userName: string) => Promise<void>;
  loadBusinessReviews: (businessId: string, includeFlagged?: boolean) => Promise<BusinessReview[]>;

  // Inquiries
  inquiries: BusinessInquiry[];
  submitInquiry: (inquiryData: {
    businessId: string;
    businessName: string;
    userName: string;
    userPhone: string;
    userEmail: string;
    inquiryType: BusinessInquiry['inquiryType'];
    message: string;
  }) => Promise<boolean>;
  updateInquiryStatus: (id: string, status: BusinessInquiry['status']) => Promise<void>;

  // Reports & Community Events
  reports: PlatformReport[];
  submitReport: (data: {
    type: PlatformReport['type'];
    targetBusinessId?: string;
    targetBusinessName?: string;
    reason: string;
    details: string;
  }) => Promise<boolean>;
  updateReportStatus: (
    reportId: string,
    status: PlatformReport['status'],
    adminNotes?: string
  ) => Promise<void>;
  events: CommunityEvent[];
  submitCommunityEvent: (data: {
    title: string;
    category: CommunityEvent['category'];
    area: string;
    venue: string;
    eventDate: string;
    eventTime?: string;
    description: string;
  }) => Promise<boolean>;
  moderateCommunityEvent: (eventId: string, status: 'approved' | 'rejected') => Promise<void>;

  // Notifications & Push
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  isNotificationsModalOpen: boolean;
  setIsNotificationsModalOpen: (open: boolean) => void;
  enablePushNotifications: () => Promise<string>;
  updateUserPreferences: (
    notifPrefs: NotificationPreferences,
    privacy: PrivacySettings
  ) => Promise<void>;

  // Auth & User Profile
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthReady: boolean;
  isLoggedIn: boolean;
  loginWithGoogle: () => Promise<void>;
  updateUserProfile: (updates: { name: string; area: string }) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  setPendingPhoneProfile: (profile: PendingPhoneProfile | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;

  // Modals
  selectedBusinessForModal: BusinessListing | null;
  openBusinessModal: (biz: BusinessListing) => void;
  closeBusinessModal: () => void;
  inquiryModalBusiness: BusinessListing | null;
  openInquiryModal: (biz: BusinessListing) => void;
  closeInquiryModal: () => void;
  appointmentModalBusiness: BusinessListing | null;
  openAppointmentModal: (biz: BusinessListing) => void;
  closeAppointmentModal: () => void;
  reportModalTarget: { businessId?: string; businessName?: string } | null;
  openReportModal: (target?: { businessId?: string; businessName?: string }) => void;
  closeReportModal: () => void;
  isRegisterModalOpen: boolean;
  setIsRegisterModalOpen: (open: boolean) => void;
  isSupportModalOpen: boolean;
  setIsSupportModalOpen: (open: boolean) => void;

  // Business Owner Context
  ownerBusiness: BusinessListing | null;

  // Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // AI Prompt trigger
  aiPrefillPrompt: string | null;
  triggerAiPrompt: (prompt: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function mapBusinessDoc(docId: string, data: Record<string, unknown>): BusinessListing {
  return {
    id: docId,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    name: String(data.name || ''),
    teluguName: typeof data.teluguName === 'string' ? data.teluguName : undefined,
    tagline: String(data.tagline || ''),
    scale: (data.scale as BusinessScale) || 'Small Business',
    category: String(data.category || 'electronics-hardware'),
    categoryLabel: String(data.categoryLabel || 'Local Business'),
    area: String(data.area || 'Siripuram & VIP Road'),
    address: String(data.address || ''),
    landmark: typeof data.landmark === 'string' ? data.landmark : undefined,
    phone: String(data.phone || ''),
    alternatePhone: typeof data.alternatePhone === 'string' ? data.alternatePhone : undefined,
    whatsapp: String(data.whatsapp || ''),
    email: String(data.email || ''),
    website: typeof data.website === 'string' ? data.website : undefined,
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    status: (data.status as BusinessListing['status']) || 'pending',
    rejectionReason: typeof data.rejectionReason === 'string' ? data.rejectionReason : undefined,
    suspensionReason: typeof data.suspensionReason === 'string' ? data.suspensionReason : undefined,
    freeListingEligible: Boolean(data.freeListingEligible),
    freeListingNumber:
      typeof data.freeListingNumber === 'number' ? data.freeListingNumber : undefined,
    establishedYear: Number(data.establishedYear) || 2020,
    rating: typeof data.rating === 'number' ? data.rating : 0,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
    verified: Boolean(data.verified),
    verificationBadge:
      (data.verificationBadge as BusinessListing['verificationBadge']) || 'Local Merchant Verified',
    imageUrl: String(data.imageUrl || ''),
    gallery: Array.isArray(data.gallery) ? (data.gallery as string[]) : [],
    description: String(data.description || ''),
    keyOfferings: Array.isArray(data.keyOfferings) ? (data.keyOfferings as string[]) : [],
    manufacturingCapacity:
      typeof data.manufacturingCapacity === 'string' ? data.manufacturingCapacity : undefined,
    businessHours: String(data.businessHours || ''),
    appointmentSlots: Array.isArray(data.appointmentSlots)
      ? (data.appointmentSlots as string[])
      : [],
    isRetail: Boolean(data.isRetail),
    isWholesale: Boolean(data.isWholesale),
    isManufacturer: Boolean(data.isManufacturer),
    certifications: Array.isArray(data.certifications)
      ? (data.certifications as string[])
      : undefined,
    contactPerson: String(data.contactPerson || 'Owner'),
    contactDesignation: String(data.contactDesignation || 'Proprietor'),
    offers: Array.isArray(data.offers) ? (data.offers as BusinessOffer[]) : undefined,
    createdAtMs: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : undefined,
  };
}

function formatDocDate(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  if (typeof val === 'string' && val.trim()) return val;
  return 'Recently';
}

function makeSlotKey(slotDate: string, slotTime: string): string {
  const cleanDate = slotDate.replace(/[^a-zA-Z0-9_-]/g, '-');
  const cleanTime = slotTime.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${cleanDate}_${cleanTime}`.slice(0, 120);
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedArea, setSelectedArea] = useState<string>('All Areas in Vizag');
  const [selectedScale, setSelectedScale] = useState<BusinessScale | 'All Scales'>('All Scales');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [language, setLanguage] = useState<AppLanguage>(() => {
    return (localStorage.getItem('vizagconnect_lang') as AppLanguage) || 'en';
  });
  const [userRoleMode, setUserRoleMode] = useState<'customer' | 'owner'>('customer');

  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);

  // Directory & Products
  const [publicBusinesses, setPublicBusinesses] = useState<BusinessListing[]>([]);
  const [ownerOrAdminBusinesses, setOwnerOrAdminBusinesses] = useState<BusinessListing[]>([]);
  const [reviewsByBusiness, setReviewsByBusiness] = useState<Record<string, BusinessReview[]>>({});
  const [productsByBusiness, setProductsByBusiness] = useState<Record<string, BusinessProduct[]>>({});
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [listingQuota, setListingQuota] = useState<ListingQuotaState>({
    approvedFreeCount: 0,
    maxFreeListings: 100,
    remainingFreeSlots: 100,
  });

  // User data
  const [savedBusinesses, setSavedBusinesses] = useState<string[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('vizagconnect_recent');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [sentInquiries, setSentInquiries] = useState<BusinessInquiry[]>([]);
  const [receivedInquiries, setReceivedInquiries] = useState<BusinessInquiry[]>([]);
  const [customerAppointments, setCustomerAppointments] = useState<AppointmentBooking[]>([]);
  const [ownerAppointments, setOwnerAppointments] = useState<AppointmentBooking[]>([]);
  const [reports, setReports] = useState<PlatformReport[]>([]);
  const [publicEvents, setPublicEvents] = useState<CommunityEvent[]>([]);
  const [ownerOrAdminEvents, setOwnerOrAdminEvents] = useState<CommunityEvent[]>([]);
  const [publicNotifications, setPublicNotifications] = useState<AppNotification[]>([]);
  const [userNotifications, setUserNotifications] = useState<AppNotification[]>([]);
  const [localReadNotifIds, setLocalReadNotifIds] = useState<string[]>([]);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  // Firebase Auth
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const pendingPhoneProfileRef = useRef<PendingPhoneProfile | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [selectedBusinessIdForModal, setSelectedBusinessIdForModal] = useState<string | null>(null);
  const [inquiryModalBusiness, setInquiryModalBusiness] = useState<BusinessListing | null>(null);
  const [appointmentModalBusiness, setAppointmentModalBusiness] = useState<BusinessListing | null>(null);
  const [reportModalTarget, setReportModalTarget] = useState<{
    businessId?: string;
    businessName?: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiPrefillPrompt, setAiPrefillPrompt] = useState<string | null>(null);

  const setPendingPhoneProfile = (profile: PendingPhoneProfile | null) => {
    pendingPhoneProfileRef.current = profile;
  };

  useEffect(() => {
    localStorage.setItem('vizagconnect_lang', language);
  }, [language]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Connectivity & Foreground Push
  useEffect(() => {
    void testConnection();
    let cleanupPush: (() => void) | undefined;
    void subscribeForegroundPush((title, body) => {
      showToast(`${title}${body ? `: ${body}` : ''}`);
    }).then((unsub) => {
      cleanupPush = unsub;
    });
    return () => {
      if (cleanupPush) cleanupPush();
    };
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        setCurrentUser(null);
        setOwnerOrAdminBusinesses([]);
        setSavedBusinesses([]);
        setSentInquiries([]);
        setReceivedInquiries([]);
        setCustomerAppointments([]);
        setOwnerAppointments([]);
        setReports([]);
        setOwnerOrAdminEvents([]);
        setUserNotifications([]);
        setIsAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const privateRef = doc(db, 'users', fbUser.uid, 'private', 'info');
        const isPhoneProvider = fbUser.providerData.some((p) => p.providerId === 'phone');
        const isBootstrappedAdmin =
          Boolean(fbUser.emailVerified) &&
          fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        let isAdminDoc = false;
        try {
          const adminSnap = await getDoc(doc(db, 'admins', fbUser.uid));
          isAdminDoc = adminSnap.exists();
        } catch {
          isAdminDoc = false;
        }

        const [userSnap, privateSnap] = await Promise.all([getDoc(userRef), getDoc(privateRef)]);

        const pending = pendingPhoneProfileRef.current;
        const resolvedName =
          (userSnap.exists() ? String(userSnap.data().name || '') : '') ||
          clampStr(pending?.name, 100) ||
          clampStr(fbUser.displayName, 100) ||
          'Vizag Citizen';
        const resolvedArea =
          (userSnap.exists() ? String(userSnap.data().area || '') : '') ||
          clampStr(pending?.area, 100) ||
          'Siripuram & VIP Road';

        const resolvedPhone =
          fbUser.phoneNumber ||
          (privateSnap.exists() ? String(privateSnap.data().phone || '') : '');
        const resolvedEmail =
          fbUser.email ||
          (privateSnap.exists() ? String(privateSnap.data().email || '') : '');

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            id: fbUser.uid,
            name: resolvedName,
            area: resolvedArea,
            isBusinessOwner: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        if (!privateSnap.exists() || (pending && (resolvedPhone || resolvedEmail))) {
          const privatePayload = stripUndefined({
            uid: fbUser.uid,
            email: resolvedEmail ? clampStr(resolvedEmail, 150) : undefined,
            phone: resolvedPhone ? clampStr(resolvedPhone, 30) : undefined,
            notificationPreferences: privateSnap.exists()
              ? privateSnap.data().notificationPreferences
              : DEFAULT_NOTIF_PREFS,
            privacySettings: privateSnap.exists()
              ? privateSnap.data().privacySettings
              : DEFAULT_PRIVACY_SETTINGS,
            updatedAt: serverTimestamp(),
          });
          await setDoc(privateRef, privatePayload, { merge: true });
        }

        pendingPhoneProfileRef.current = null;

        const userData = userSnap.exists() ? userSnap.data() : {};
        const privData = privateSnap.exists() ? privateSnap.data() : {};
        setCurrentUser({
          id: fbUser.uid,
          name: resolvedName,
          email: resolvedEmail,
          phone: resolvedPhone,
          area: resolvedArea,
          isBusinessOwner: Boolean(userData.isBusinessOwner),
          isAdmin: isBootstrappedAdmin || isAdminDoc,
          authProvider: isPhoneProvider ? 'phone' : 'google',
          businessId: typeof userData.businessId === 'string' ? userData.businessId : undefined,
          businessName: typeof userData.businessName === 'string' ? userData.businessName : undefined,
          fcmToken: typeof privData.fcmToken === 'string' ? privData.fcmToken : undefined,
          notificationPreferences:
            (privData.notificationPreferences as NotificationPreferences) || DEFAULT_NOTIF_PREFS,
          privacySettings: (privData.privacySettings as PrivacySettings) || DEFAULT_PRIVACY_SETTINGS,
        });
      } catch (err) {
        console.error('Error hydrating authenticated user profile:', err);
        setCurrentUser({
          id: fbUser.uid,
          name: fbUser.displayName || 'Vizag Citizen',
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '',
          area: 'Visakhapatnam',
          authProvider: fbUser.phoneNumber ? 'phone' : 'google',
          notificationPreferences: DEFAULT_NOTIF_PREFS,
          privacySettings: DEFAULT_PRIVACY_SETTINGS,
        });
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Platform Quota Listener (First 100 Free Listings)
  useEffect(() => {
    const quotaRef = doc(db, 'platformConfig', 'listingQuota');
    const unsub = onSnapshot(
      quotaRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const count = Number(data.approvedFreeCount) || 0;
          const max = Number(data.maxFreeListings) || 100;
          setListingQuota({
            approvedFreeCount: count,
            maxFreeListings: max,
            remainingFreeSlots: Math.max(0, max - count),
          });
        } else {
          setListingQuota({
            approvedFreeCount: 0,
            maxFreeListings: 100,
            remainingFreeSlots: 100,
          });
        }
      },
      () => {
        // Quota doc may not be seeded yet until first admin approval
      }
    );
    return () => unsub();
  }, []);

  // Public Approved Businesses Live Query
  useEffect(() => {
    const businessesPath = 'businesses';
    const q = query(collection(db, businessesPath), where('status', '==', 'approved'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) =>
          mapBusinessDoc(d.id, d.data() as Record<string, unknown>)
        );
        setPublicBusinesses(list);
        setIsLoadingBusinesses(false);
      },
      (error) => {
        setIsLoadingBusinesses(false);
        handleFirestoreError(error, OperationType.LIST, businessesPath);
      }
    );

    return () => unsub();
  }, []);

  // Auto-load products for approved businesses (syncs Catalog, Price Comparison & Vizag AI)
  useEffect(() => {
    if (publicBusinesses.length === 0) return;
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        publicBusinesses.map(async (biz) => {
          try {
            const snap = await getDocs(
              query(
                collection(db, 'businesses', biz.id, 'products'),
                where('businessStatus', '==', 'approved')
              )
            );
            const items: BusinessProduct[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                businessId: String(data.businessId || biz.id),
                ownerId: String(data.ownerId || ''),
                businessStatus: (data.businessStatus as BusinessProduct['businessStatus']) || 'approved',
                name: String(data.name || ''),
                category: String(data.category || ''),
                price: Number(data.price) || 0,
                unit: typeof data.unit === 'string' ? data.unit : undefined,
                availability:
                  (data.availability as BusinessProduct['availability']) || 'In Stock',
                description: typeof data.description === 'string' ? data.description : undefined,
                imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
              };
            });
            return [biz.id, items] as [string, BusinessProduct[]];
          } catch {
            return [biz.id, []] as [string, BusinessProduct[]];
          }
        })
      );
      if (!cancelled) {
        setProductsByBusiness((prev) => {
          const next = { ...prev };
          for (const [bId, items] of entries) {
            next[bId] = items;
          }
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicBusinesses]);

  // Authenticated Owner / Admin Businesses Live Query
  useEffect(() => {
    if (!isAuthReady || !firebaseUser) {
      setOwnerOrAdminBusinesses([]);
      return;
    }

    const businessesPath = 'businesses';
    const q = currentUser?.isAdmin
      ? collection(db, businessesPath)
      : query(collection(db, businessesPath), where('ownerId', '==', firebaseUser.uid));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) =>
          mapBusinessDoc(d.id, d.data() as Record<string, unknown>)
        );
        setOwnerOrAdminBusinesses(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, businessesPath);
      }
    );

    return () => unsub();
  }, [isAuthReady, firebaseUser, currentUser?.isAdmin]);

  // Saved & Recently Viewed Listeners
  useEffect(() => {
    if (!isAuthReady || !firebaseUser) {
      setSavedBusinesses([]);
      return;
    }

    const savedPath = `users/${firebaseUser.uid}/saved`;
    const unsubSaved = onSnapshot(
      collection(db, 'users', firebaseUser.uid, 'saved'),
      (snapshot) => {
        setSavedBusinesses(snapshot.docs.map((d) => d.id));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, savedPath);
      }
    );

    const recentPath = `users/${firebaseUser.uid}/recentlyViewed`;
    const unsubRecent = onSnapshot(
      collection(db, 'users', firebaseUser.uid, 'recentlyViewed'),
      (snapshot) => {
        const sorted = [...snapshot.docs]
          .sort((a, b) => {
            const ta = a.data().viewedAt instanceof Timestamp ? a.data().viewedAt.toMillis() : 0;
            const tb = b.data().viewedAt instanceof Timestamp ? b.data().viewedAt.toMillis() : 0;
            return tb - ta;
          })
          .map((d) => d.id)
          .slice(0, 10);
        setRecentlyViewedIds(sorted);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, recentPath);
      }
    );

    return () => {
      unsubSaved();
      unsubRecent();
    };
  }, [isAuthReady, firebaseUser]);

  // Inquiries Listeners
  useEffect(() => {
    if (!isAuthReady || !firebaseUser) {
      setSentInquiries([]);
      setReceivedInquiries([]);
      return;
    }

    const inquiriesPath = 'inquiries';
    const mapInq = (docSnap: { id: string; data: () => Record<string, unknown> }): BusinessInquiry => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        businessId: String(d.businessId || ''),
        businessOwnerId: typeof d.businessOwnerId === 'string' ? d.businessOwnerId : undefined,
        businessName: String(d.businessName || ''),
        senderId: typeof d.senderId === 'string' ? d.senderId : undefined,
        userName: String(d.userName || ''),
        userPhone: String(d.userPhone || ''),
        userEmail: String(d.userEmail || ''),
        inquiryType: (d.inquiryType as BusinessInquiry['inquiryType']) || 'General Query',
        message: String(d.message || ''),
        date: formatDocDate(d.createdAt || d.date),
        status: (d.status as BusinessInquiry['status']) || 'Pending',
      };
    };

    const unsubSent = onSnapshot(
      query(collection(db, inquiriesPath), where('senderId', '==', firebaseUser.uid)),
      (snapshot) => setSentInquiries(snapshot.docs.map((d) => mapInq(d))),
      (error) => handleFirestoreError(error, OperationType.LIST, inquiriesPath)
    );

    const unsubReceived = onSnapshot(
      query(collection(db, inquiriesPath), where('businessOwnerId', '==', firebaseUser.uid)),
      (snapshot) => setReceivedInquiries(snapshot.docs.map((d) => mapInq(d))),
      (error) => handleFirestoreError(error, OperationType.LIST, inquiriesPath)
    );

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [isAuthReady, firebaseUser]);

  // Appointments Listeners
  useEffect(() => {
    if (!isAuthReady || !firebaseUser) {
      setCustomerAppointments([]);
      setOwnerAppointments([]);
      return;
    }

    const aptPath = 'appointments';
    const mapApt = (docSnap: { id: string; data: () => Record<string, unknown> }): AppointmentBooking => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        businessId: String(d.businessId || ''),
        businessOwnerId: String(d.businessOwnerId || ''),
        businessName: String(d.businessName || ''),
        customerId: String(d.customerId || ''),
        customerName: String(d.customerName || ''),
        customerPhone: String(d.customerPhone || ''),
        slotDate: String(d.slotDate || ''),
        slotTime: String(d.slotTime || ''),
        serviceOrProduct: String(d.serviceOrProduct || ''),
        notes: typeof d.notes === 'string' ? d.notes : undefined,
        status: (d.status as AppointmentBooking['status']) || 'Requested',
        date: formatDocDate(d.createdAt),
      };
    };

    const unsubCust = onSnapshot(
      query(collection(db, aptPath), where('customerId', '==', firebaseUser.uid)),
      (snap) => setCustomerAppointments(snap.docs.map((d) => mapApt(d))),
      (err) => handleFirestoreError(err, OperationType.LIST, aptPath)
    );

    const unsubOwner = onSnapshot(
      query(collection(db, aptPath), where('businessOwnerId', '==', firebaseUser.uid)),
      (snap) => setOwnerAppointments(snap.docs.map((d) => mapApt(d))),
      (err) => handleFirestoreError(err, OperationType.LIST, aptPath)
    );

    return () => {
      unsubCust();
      unsubOwner();
    };
  }, [isAuthReady, firebaseUser]);

  // Reports Listener (reporter own OR admin all)
  useEffect(() => {
    if (!isAuthReady || !firebaseUser) {
      setReports([]);
      return;
    }
    const reportsPath = 'reports';
    const q = currentUser?.isAdmin
      ? collection(db, reportsPath)
      : query(collection(db, reportsPath), where('reporterId', '==', firebaseUser.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setReports(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: (data.type as PlatformReport['type']) || 'business_report',
              targetBusinessId:
                typeof data.targetBusinessId === 'string' ? data.targetBusinessId : undefined,
              targetBusinessName:
                typeof data.targetBusinessName === 'string' ? data.targetBusinessName : undefined,
              reporterId: String(data.reporterId || ''),
              reporterName: String(data.reporterName || ''),
              reason: String(data.reason || ''),
              details: String(data.details || ''),
              status: (data.status as PlatformReport['status']) || 'Open',
              adminNotes: typeof data.adminNotes === 'string' ? data.adminNotes : undefined,
              date: formatDocDate(data.createdAt),
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, reportsPath)
    );
    return () => unsub();
  }, [isAuthReady, firebaseUser, currentUser?.isAdmin]);

  // Community Events & Vizag LIVE Listeners
  useEffect(() => {
    const eventsPath = 'events';
    const mapEvent = (docSnap: { id: string; data: () => Record<string, unknown> }): CommunityEvent => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        title: String(d.title || ''),
        category: (d.category as CommunityEvent['category']) || 'Event',
        area: String(d.area || ''),
        venue: String(d.venue || ''),
        eventDate: String(d.eventDate || ''),
        eventTime: typeof d.eventTime === 'string' ? d.eventTime : undefined,
        organizerName: String(d.organizerName || ''),
        organizerId: String(d.organizerId || ''),
        description: String(d.description || ''),
        status: (d.status as CommunityEvent['status']) || 'approved',
        date: formatDocDate(d.createdAt),
      };
    };

    const unsubPublic = onSnapshot(
      query(collection(db, eventsPath), where('status', '==', 'approved')),
      (snap) => setPublicEvents(snap.docs.map((d) => mapEvent(d))),
      (err) => handleFirestoreError(err, OperationType.LIST, eventsPath)
    );

    let unsubOwnOrAdmin: (() => void) | undefined;
    if (isAuthReady && firebaseUser) {
      const qPrivate = currentUser?.isAdmin
        ? collection(db, eventsPath)
        : query(collection(db, eventsPath), where('organizerId', '==', firebaseUser.uid));
      unsubOwnOrAdmin = onSnapshot(
        qPrivate,
        (snap) => setOwnerOrAdminEvents(snap.docs.map((d) => mapEvent(d))),
        (err) => handleFirestoreError(err, OperationType.LIST, eventsPath)
      );
    } else {
      setOwnerOrAdminEvents([]);
    }

    return () => {
      unsubPublic();
      if (unsubOwnOrAdmin) unsubOwnOrAdmin();
    };
  }, [isAuthReady, firebaseUser, currentUser?.isAdmin]);

  // Public & User Notifications Listeners
  useEffect(() => {
    const publicNotifPath = 'notifications';
    const unsubPublic = onSnapshot(
      query(collection(db, publicNotifPath), where('audience', '==', 'public')),
      (snapshot) => {
        setPublicNotifications(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title || ''),
              message: String(data.message || ''),
              date: formatDocDate(data.createdAt || data.date),
              type: (data.type as AppNotification['type']) || 'update',
              read: false,
              businessId: typeof data.businessId === 'string' ? data.businessId : undefined,
              audience: 'public',
            };
          })
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, publicNotifPath);
      }
    );

    return () => unsubPublic();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !firebaseUser) {
      setUserNotifications([]);
      return;
    }

    const userNotifPath = `users/${firebaseUser.uid}/notifications`;
    const unsub = onSnapshot(
      collection(db, 'users', firebaseUser.uid, 'notifications'),
      (snapshot) => {
        setUserNotifications(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title || ''),
              message: String(data.message || ''),
              date: formatDocDate(data.createdAt || data.date),
              type: (data.type as AppNotification['type']) || 'update',
              read: Boolean(data.read),
              businessId: typeof data.businessId === 'string' ? data.businessId : undefined,
              audience: 'user',
            };
          })
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, userNotifPath);
      }
    );

    return () => unsub();
  }, [isAuthReady, firebaseUser]);

  // Merged Businesses
  const businesses: BusinessListing[] = useMemo(() => {
    const map: Record<string, BusinessListing> = {};
    for (const b of publicBusinesses) map[b.id] = b;
    for (const b of ownerOrAdminBusinesses) map[b.id] = b;
    return Object.values(map).map((b) => {
      const revs = reviewsByBusiness[b.id];
      const prods = productsByBusiness[b.id];
      if (!revs && !prods) return b;
      const approvedRevs = revs ? revs.filter((r) => r.status === 'approved') : null;
      const avgRating =
        approvedRevs && approvedRevs.length > 0
          ? Math.round(
              (approvedRevs.reduce((sum, r) => sum + r.rating, 0) / approvedRevs.length) * 10
            ) / 10
          : b.rating;
      return {
        ...b,
        ...(revs ? { reviews: revs, rating: avgRating, reviewCount: approvedRevs?.length || 0 } : {}),
        ...(prods ? { products: prods } : {}),
      };
    });
  }, [publicBusinesses, ownerOrAdminBusinesses, reviewsByBusiness, productsByBusiness]);

  const approvedBusinesses = useMemo(
    () => businesses.filter((b) => b.status === 'approved'),
    [businesses]
  );

  const allApprovedProducts = useMemo(() => {
    const list: Array<BusinessProduct & { business: BusinessListing }> = [];
    for (const biz of approvedBusinesses) {
      const prods = productsByBusiness[biz.id] || [];
      for (const p of prods) {
        list.push({ ...p, business: biz });
      }
    }
    return list;
  }, [approvedBusinesses, productsByBusiness]);

  const inquiries: BusinessInquiry[] = useMemo(() => {
    const map: Record<string, BusinessInquiry> = {};
    for (const i of receivedInquiries) map[i.id] = i;
    for (const i of sentInquiries) map[i.id] = i;
    return Object.values(map);
  }, [receivedInquiries, sentInquiries]);

  const appointments: AppointmentBooking[] = useMemo(() => {
    const map: Record<string, AppointmentBooking> = {};
    for (const a of ownerAppointments) map[a.id] = a;
    for (const a of customerAppointments) map[a.id] = a;
    return Object.values(map);
  }, [ownerAppointments, customerAppointments]);

  const events: CommunityEvent[] = useMemo(() => {
    const map: Record<string, CommunityEvent> = {};
    for (const e of publicEvents) map[e.id] = e;
    for (const e of ownerOrAdminEvents) map[e.id] = e;
    return Object.values(map);
  }, [publicEvents, ownerOrAdminEvents]);

  const notifications: AppNotification[] = useMemo(() => {
    const mappedPublic = publicNotifications.map((n) => ({
      ...n,
      read: localReadNotifIds.includes(n.id),
    }));
    return [...userNotifications, ...mappedPublic];
  }, [userNotifications, publicNotifications, localReadNotifIds]);

  const selectedBusinessForModal = useMemo(
    () => businesses.find((b) => b.id === selectedBusinessIdForModal) || null,
    [businesses, selectedBusinessIdForModal]
  );

  // Location detection (Cross-platform Web + Capacitor Android)
  const requestCustomerLocation = async (): Promise<void> => {
    setIsLocatingCustomer(true);
    showToast(language === 'te' ? 'మీ లొకేషన్ గుర్తిస్తోంది...' : 'Detecting your location in Visakhapatnam...');

    try {
      const userCoords = await getCurrentCoordinatesCrossPlatform();
      setCustomerLocation(userCoords);
      showToast(
        language === 'te'
          ? 'లొకేషన్ గుర్తించబడింది! సమీప దుకాణాలు కనిపిస్తున్నాయి.'
          : 'Location detected! Showing nearby shops & factories in Vizag.'
      );
    } catch {
      showToast(
        language === 'te' ? 'లొకేషన్ అనుమతి లభించలేదు' : 'Location permission denied or unavailable.'
      );
    } finally {
      setIsLocatingCustomer(false);
    }
  };

  const getBusinessDistanceKm = (biz: BusinessListing): number | null => {
    if (!customerLocation) return null;
    let bLat = biz.latitude;
    let bLng = biz.longitude;

    if (!bLat || !bLng) {
      const areaCoords = VIZAG_AREA_COORDINATES[biz.area];
      if (areaCoords) {
        bLat = areaCoords.lat;
        bLng = areaCoords.lng;
      }
    }

    if (bLat && bLng) {
      return calculateDistanceKm(customerLocation.lat, customerLocation.lng, bLat, bLng);
    }
    return null;
  };

  // Save / Bookmark
  const toggleSaveBusiness = async (id: string) => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in to save businesses to your account');
      return;
    }

    const savedDocPath = `users/${firebaseUser.uid}/saved/${id}`;
    const docRef = doc(db, 'users', firebaseUser.uid, 'saved', id);
    const exists = savedBusinesses.includes(id);

    try {
      if (exists) {
        await deleteDoc(docRef);
        showToast(language === 'te' ? 'ఇష్టమైన జాబితా నుండి తొలగించబడింది' : 'Removed from Favourites');
      } else {
        await setDoc(docRef, {
          businessId: id,
          userId: firebaseUser.uid,
          savedAt: serverTimestamp(),
        });
        showToast(language === 'te' ? 'ఇష్టమైన జాబితాలో సేవ్ చేయబడింది' : 'Saved to Favourites');
      }
    } catch (error) {
      handleFirestoreError(error, exists ? OperationType.DELETE : OperationType.CREATE, savedDocPath);
    }
  };

  const isBusinessSaved = (id: string) => savedBusinesses.includes(id);

  // Record Recently Viewed
  const recordRecentlyViewed = async (businessId: string) => {
    setRecentlyViewedIds((prev) => {
      const next = [businessId, ...prev.filter((id) => id !== businessId)].slice(0, 10);
      try {
        localStorage.setItem('vizagconnect_recent', JSON.stringify(next));
      } catch {}
      return next;
    });

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid, 'recentlyViewed', businessId), {
          businessId,
          userId: firebaseUser.uid,
          viewedAt: serverTimestamp(),
        });
      } catch {
        // Non-critical tracking failure
      }
    }
  };

  // Reviews
  const loadBusinessReviews = async (
    businessId: string,
    includeFlagged = false
  ): Promise<BusinessReview[]> => {
    const reviewsPath = `businesses/${businessId}/reviews`;
    try {
      const q = includeFlagged && currentUser?.isAdmin
        ? collection(db, 'businesses', businessId, 'reviews')
        : query(collection(db, 'businesses', businessId, 'reviews'), where('status', '==', 'approved'));
      const snap = await getDocs(q);
      const list: BusinessReview[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          businessId: String(data.businessId || businessId),
          userId: typeof data.userId === 'string' ? data.userId : undefined,
          userName: String(data.userName || 'Vizag Resident'),
          rating: Number(data.rating) || 5,
          comment: String(data.comment || ''),
          date: formatDocDate(data.createdAt || data.date),
          status: (data.status as BusinessReview['status']) || 'approved',
          moderationNotes:
            typeof data.moderationNotes === 'string' ? data.moderationNotes : undefined,
        };
      });
      setReviewsByBusiness((prev) => ({ ...prev, [businessId]: list }));
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, reviewsPath);
    }
  };

  const addReview = async (
    businessId: string,
    rating: number,
    comment: string,
    userName: string
  ) => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in to submit a verified customer review');
      return;
    }

    const spamKeywords = ['spam', 'scam', 'cheat', 'fraud', 'fake money', 'casino', 'viagra'];
    const lowerComment = comment.toLowerCase();
    const hasSpam = spamKeywords.some((word) => lowerComment.includes(word));
    const moderationStatus: BusinessReview['status'] = hasSpam ? 'flagged' : 'approved';

    const reviewId = `rev-${Date.now()}`;
    const reviewPath = `businesses/${businessId}/reviews/${reviewId}`;
    const clampedRating = Math.min(5, Math.max(1, Math.round(rating)));

    const payload = stripUndefined({
      id: reviewId,
      businessId,
      userId: firebaseUser.uid,
      userName: clampStr(userName || currentUser?.name || 'Vizag Citizen', 100),
      rating: clampedRating,
      comment: clampStr(comment, 1500),
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      status: moderationStatus,
      moderationNotes: hasSpam ? 'Automated spam filter flag' : undefined,
      createdAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'businesses', businessId, 'reviews', reviewId), payload);
      await loadBusinessReviews(businessId);
      showToast(
        moderationStatus === 'flagged'
          ? 'Review submitted for admin moderation review.'
          : 'Thank you! Your verified review has been published.'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, reviewPath);
    }
  };

  const moderateReview = async (
    businessId: string,
    reviewId: string,
    status: 'approved' | 'flagged',
    notes?: string
  ) => {
    if (!currentUser?.isAdmin) return;
    const reviewPath = `businesses/${businessId}/reviews/${reviewId}`;
    try {
      await updateDoc(
        doc(db, 'businesses', businessId, 'reviews', reviewId),
        stripUndefined({
          status,
          moderationNotes: notes ? clampStr(notes, 250) : undefined,
        })
      );
      await loadBusinessReviews(businessId, true);
      showToast(`Review marked as ${status}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, reviewPath);
    }
  };

  // Products Catalog CRUD
  const loadBusinessProducts = async (businessId: string): Promise<BusinessProduct[]> => {
    const prodPath = `businesses/${businessId}/products`;
    try {
      const targetBiz = businesses.find((b) => b.id === businessId);
      const isOwnerOrAdmin =
        Boolean(currentUser?.isAdmin) ||
        (Boolean(firebaseUser) && targetBiz?.ownerId === firebaseUser?.uid);
      const q = isOwnerOrAdmin
        ? collection(db, 'businesses', businessId, 'products')
        : query(
            collection(db, 'businesses', businessId, 'products'),
            where('businessStatus', '==', 'approved')
          );
      const snap = await getDocs(q);
      const items: BusinessProduct[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          businessId: String(data.businessId || businessId),
          ownerId: String(data.ownerId || ''),
          businessStatus: (data.businessStatus as BusinessProduct['businessStatus']) || 'pending',
          name: String(data.name || ''),
          category: String(data.category || ''),
          price: Number(data.price) || 0,
          unit: typeof data.unit === 'string' ? data.unit : undefined,
          availability: (data.availability as BusinessProduct['availability']) || 'In Stock',
          description: typeof data.description === 'string' ? data.description : undefined,
          imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
        };
      });
      setProductsByBusiness((prev) => ({ ...prev, [businessId]: items }));
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, prodPath);
    }
  };

  const addBusinessProduct = async (
    businessId: string,
    product: Omit<BusinessProduct, 'id' | 'businessId' | 'ownerId' | 'businessStatus'>
  ) => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const targetBiz = businesses.find((b) => b.id === businessId);
    if (!targetBiz) {
      showToast('Business record not found.');
      return;
    }

    const productId = `prod-${Date.now()}`;
    const prodPath = `businesses/${businessId}/products/${productId}`;
    const payload = stripUndefined({
      id: productId,
      businessId,
      ownerId: targetBiz.ownerId || firebaseUser.uid,
      businessStatus: targetBiz.status,
      name: clampStr(product.name, 160),
      category: clampStr(product.category || targetBiz.categoryLabel, 80),
      price: Math.max(0, Number(product.price) || 0),
      unit: product.unit ? clampStr(product.unit, 50) : undefined,
      availability: product.availability || 'In Stock',
      description: product.description ? clampStr(product.description, 600) : undefined,
      imageUrl: product.imageUrl ? clampStr(product.imageUrl, 800) : undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'businesses', businessId, 'products', productId), payload);
      await loadBusinessProducts(businessId);
      showToast(`Added "${product.name}" to your business catalog!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, prodPath);
    }
  };

  const updateBusinessProduct = async (
    businessId: string,
    productId: string,
    updates: Partial<BusinessProduct>
  ) => {
    const prodPath = `businesses/${businessId}/products/${productId}`;
    const clean = stripUndefined({
      name: updates.name !== undefined ? clampStr(updates.name, 160) : undefined,
      category: updates.category !== undefined ? clampStr(updates.category, 80) : undefined,
      price: updates.price !== undefined ? Math.max(0, Number(updates.price)) : undefined,
      unit: updates.unit !== undefined ? clampStr(updates.unit, 50) : undefined,
      availability: updates.availability,
      description:
        updates.description !== undefined ? clampStr(updates.description, 600) : undefined,
      imageUrl: updates.imageUrl !== undefined ? clampStr(updates.imageUrl, 800) : undefined,
      updatedAt: serverTimestamp(),
    });
    try {
      await updateDoc(doc(db, 'businesses', businessId, 'products', productId), clean);
      await loadBusinessProducts(businessId);
      showToast('Product updated!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, prodPath);
    }
  };

  const deleteBusinessProduct = async (businessId: string, productId: string) => {
    const prodPath = `businesses/${businessId}/products/${productId}`;
    try {
      await deleteDoc(doc(db, 'businesses', businessId, 'products', productId));
      await loadBusinessProducts(businessId);
      showToast('Product removed from catalog.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, prodPath);
    }
  };

  const saveBusinessOffers = async (businessId: string, offers: BusinessOffer[]) => {
    await updateBusinessListing(businessId, { offers: offers.slice(0, 10) });
  };

  const saveBusinessAppointmentSlots = async (businessId: string, slots: string[]) => {
    const cleanSlots = slots.map((s) => clampStr(s, 60)).filter(Boolean).slice(0, 20);
    await updateBusinessListing(businessId, { appointmentSlots: cleanSlots });
  };

  // Inquiries
  const submitInquiry = async (inquiryData: {
    businessId: string;
    businessName: string;
    userName: string;
    userPhone: string;
    userEmail: string;
    inquiryType: BusinessInquiry['inquiryType'];
    message: string;
  }): Promise<boolean> => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in first to send a tracked business inquiry');
      return false;
    }

    const targetBiz = businesses.find((b) => b.id === inquiryData.businessId);
    const businessOwnerId = targetBiz?.ownerId;
    if (!businessOwnerId) {
      showToast('Unable to route inquiry: business owner reference is missing');
      return false;
    }

    const inquiryId = `INQ-${Date.now()}`;
    const inquiryPath = `inquiries/${inquiryId}`;

    const payload = stripUndefined({
      id: inquiryId,
      businessId: inquiryData.businessId,
      businessOwnerId,
      businessName: clampStr(inquiryData.businessName, 160),
      senderId: firebaseUser.uid,
      userName: clampStr(inquiryData.userName, 100),
      userPhone: clampStr(inquiryData.userPhone, 30),
      userEmail: inquiryData.userEmail.trim() ? clampStr(inquiryData.userEmail, 150) : undefined,
      inquiryType: inquiryData.inquiryType,
      message: clampStr(inquiryData.message, 2000),
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'inquiries', inquiryId), payload);
      try {
        const notifId = `notif-${Date.now()}`;
        await setDoc(doc(db, 'users', businessOwnerId, 'notifications', notifId), {
          id: notifId,
          userId: businessOwnerId,
          title: `New Inquiry for ${clampStr(inquiryData.businessName, 80)}`,
          message: clampStr(`${inquiryData.userName} requested: ${inquiryData.inquiryType}`, 500),
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: 'inquiry',
          read: false,
          businessId: inquiryData.businessId,
          createdAt: serverTimestamp(),
        });
      } catch {
        // Notification is best-effort
      }
      showToast(`Inquiry sent directly to ${inquiryData.businessName}!`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, inquiryPath);
    }
  };

  const updateInquiryStatus = async (id: string, status: BusinessInquiry['status']) => {
    const inquiryPath = `inquiries/${id}`;
    try {
      await updateDoc(doc(db, 'inquiries', id), {
        status,
        updatedAt: serverTimestamp(),
      });
      showToast(`Inquiry #${id} status updated to ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, inquiryPath);
    }
  };

  // Appointments & Concurrency-Safe Slot Booking
  const loadBookedSlotsForBusiness = async (businessId: string): Promise<BookedSlot[]> => {
    const slotPath = `businesses/${businessId}/bookedSlots`;
    try {
      const snap = await getDocs(
        query(collection(db, 'businesses', businessId, 'bookedSlots'), where('status', '==', 'booked'))
      );
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          businessId: String(data.businessId || businessId),
          slotDate: String(data.slotDate || ''),
          slotTime: String(data.slotTime || ''),
          appointmentId: String(data.appointmentId || ''),
          customerId: String(data.customerId || ''),
          status: (data.status as BookedSlot['status']) || 'booked',
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, slotPath);
    }
  };

  const bookAppointment = async (data: {
    businessId: string;
    slotDate: string;
    slotTime: string;
    serviceOrProduct: string;
    customerName: string;
    customerPhone: string;
    notes?: string;
  }): Promise<boolean> => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in first to book an appointment');
      return false;
    }

    const targetBiz = businesses.find((b) => b.id === data.businessId);
    if (!targetBiz || targetBiz.status !== 'approved' || !targetBiz.ownerId) {
      showToast('Appointments can only be booked with approved businesses.');
      return false;
    }

    const slotKey = makeSlotKey(data.slotDate, data.slotTime);
    const appointmentId = `apt-${Date.now()}`;
    const slotRef = doc(db, 'businesses', targetBiz.id, 'bookedSlots', slotKey);
    const aptRef = doc(db, 'appointments', appointmentId);

    try {
      await runTransaction(db, async (tx) => {
        const slotSnap = await tx.get(slotRef);
        if (slotSnap.exists() && slotSnap.data().status === 'booked') {
          throw new Error('SLOT_ALREADY_BOOKED');
        }

        const aptPayload = stripUndefined({
          id: appointmentId,
          businessId: targetBiz.id,
          businessOwnerId: targetBiz.ownerId!,
          businessName: clampStr(targetBiz.name, 160),
          customerId: firebaseUser.uid,
          customerName: clampStr(data.customerName, 100),
          customerPhone: clampStr(data.customerPhone, 30),
          slotDate: clampStr(data.slotDate, 20),
          slotTime: clampStr(data.slotTime, 60),
          serviceOrProduct: clampStr(data.serviceOrProduct, 160),
          notes: data.notes?.trim() ? clampStr(data.notes, 500) : undefined,
          status: 'Requested',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        tx.set(aptRef, aptPayload);
        tx.set(slotRef, {
          id: slotKey,
          businessId: targetBiz.id,
          businessOwnerId: targetBiz.ownerId!,
          customerId: firebaseUser.uid,
          appointmentId,
          slotDate: clampStr(data.slotDate, 20),
          slotTime: clampStr(data.slotTime, 60),
          status: 'booked',
          createdAt: slotSnap.exists() ? slotSnap.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      try {
        const notifId = `notif-${Date.now()}`;
        await setDoc(doc(db, 'users', targetBiz.ownerId, 'notifications', notifId), {
          id: notifId,
          userId: targetBiz.ownerId,
          title: `New Appointment Request (${targetBiz.name})`,
          message: clampStr(
            `${data.customerName} requested ${data.serviceOrProduct} on ${data.slotDate} at ${data.slotTime}`,
            500
          ),
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: 'booking',
          read: false,
          businessId: targetBiz.id,
          createdAt: serverTimestamp(),
        });
      } catch {
        // Non-blocking notification
      }

      showToast(`Appointment requested for ${data.slotDate} (${data.slotTime})!`);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'SLOT_ALREADY_BOOKED') {
        showToast('That time slot was just reserved. Please pick another slot.');
        return false;
      }
      handleFirestoreError(error, OperationType.CREATE, `appointments/${appointmentId}`);
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: AppointmentBooking['status']
  ) => {
    const target = appointments.find((a) => a.id === appointmentId);
    const aptPath = `appointments/${appointmentId}`;
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status,
        updatedAt: serverTimestamp(),
      });

      if (status === 'Cancelled' && target) {
        const slotKey = makeSlotKey(target.slotDate, target.slotTime);
        try {
          await updateDoc(doc(db, 'businesses', target.businessId, 'bookedSlots', slotKey), {
            status: 'cancelled',
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Best-effort slot release
        }
      }

      if (target && firebaseUser?.uid === target.businessOwnerId) {
        try {
          const notifId = `notif-${Date.now()}`;
          await setDoc(doc(db, 'users', target.customerId, 'notifications', notifId), {
            id: notifId,
            userId: target.customerId,
            title: `Appointment ${status}: ${target.businessName}`,
            message: `Your slot on ${target.slotDate} at ${target.slotTime} is now ${status}.`,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'booking',
            read: false,
            businessId: target.businessId,
            createdAt: serverTimestamp(),
          });
        } catch {
          // Best-effort notification
        }
      }

      showToast(`Appointment updated to ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, aptPath);
    }
  };

  // Reports & Complaints
  const submitReport = async (data: {
    type: PlatformReport['type'];
    targetBusinessId?: string;
    targetBusinessName?: string;
    reason: string;
    details: string;
  }): Promise<boolean> => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in to submit a report or complaint');
      return false;
    }

    const reportId = `rep-${Date.now()}`;
    const reportPath = `reports/${reportId}`;
    const payload = stripUndefined({
      id: reportId,
      type: data.type,
      targetBusinessId: data.targetBusinessId || undefined,
      targetBusinessName: data.targetBusinessName
        ? clampStr(data.targetBusinessName, 160)
        : undefined,
      reporterId: firebaseUser.uid,
      reporterName: clampStr(currentUser?.name || 'Vizag Citizen', 100),
      reason: clampStr(data.reason, 160),
      details: clampStr(data.details, 1500),
      status: 'Open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'reports', reportId), payload);
      showToast('Report submitted. Our Visakhapatnam moderation team will review it.');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, reportPath);
    }
  };

  const updateReportStatus = async (
    reportId: string,
    status: PlatformReport['status'],
    adminNotes?: string
  ) => {
    if (!currentUser?.isAdmin) return;
    const reportPath = `reports/${reportId}`;
    try {
      await updateDoc(
        doc(db, 'reports', reportId),
        stripUndefined({
          status,
          adminNotes: adminNotes ? clampStr(adminNotes, 500) : undefined,
          updatedAt: serverTimestamp(),
        })
      );
      showToast(`Report updated to ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, reportPath);
    }
  };

  // Community Events
  const submitCommunityEvent = async (data: {
    title: string;
    category: CommunityEvent['category'];
    area: string;
    venue: string;
    eventDate: string;
    eventTime?: string;
    description: string;
  }): Promise<boolean> => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in to submit a Visakhapatnam community event');
      return false;
    }

    const eventId = `evt-${Date.now()}`;
    const eventPath = `events/${eventId}`;
    const payload = stripUndefined({
      id: eventId,
      title: clampStr(data.title, 160),
      category: data.category,
      area: clampStr(data.area, 100),
      venue: clampStr(data.venue, 250),
      eventDate: clampStr(data.eventDate, 40),
      eventTime: data.eventTime ? clampStr(data.eventTime, 60) : undefined,
      organizerName: clampStr(currentUser?.name || 'Vizag Organizer', 100),
      organizerId: firebaseUser.uid,
      description: clampStr(data.description, 1500),
      status: currentUser?.isAdmin ? 'approved' : 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'events', eventId), payload);
      showToast(
        currentUser?.isAdmin
          ? 'Community event published to VizagConnect LIVE!'
          : 'Event submitted for admin verification.'
      );
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, eventPath);
    }
  };

  const moderateCommunityEvent = async (eventId: string, status: 'approved' | 'rejected') => {
    if (!currentUser?.isAdmin) return;
    const eventPath = `events/${eventId}`;
    try {
      await updateDoc(doc(db, 'events', eventId), {
        status,
        updatedAt: serverTimestamp(),
      });
      showToast(`Community event ${status}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, eventPath);
    }
  };

  // Admin: Concurrency-Safe First-100 Free Listings Transaction Approval
  const syncProductsBusinessStatus = async (
    businessId: string,
    newStatus: BusinessListing['status']
  ) => {
    try {
      const snap = await getDocs(collection(db, 'businesses', businessId, 'products'));
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(d.ref, { businessStatus: newStatus, updatedAt: serverTimestamp() });
      });
      await batch.commit();
    } catch {
      // No products or skipped safely
    }
  };

  const approveBusinessListing = async (businessId: string) => {
    if (!currentUser?.isAdmin) {
      showToast('Admin privileges required.');
      return;
    }
    const bizRef = doc(db, 'businesses', businessId);
    const quotaRef = doc(db, 'platformConfig', 'listingQuota');
    const claimRef = doc(db, 'freeListingClaims', businessId);

    try {
      const result = await runTransaction(db, async (tx) => {
        const [bizSnap, quotaSnap, claimSnap] = await Promise.all([
          tx.get(bizRef),
          tx.get(quotaRef),
          tx.get(claimRef),
        ]);

        if (!bizSnap.exists()) {
          throw new Error('Business listing not found.');
        }

        const bizData = bizSnap.data();
        const ownerId = String(bizData.ownerId || '');
        const currentCount = quotaSnap.exists() ? Number(quotaSnap.data().approvedFreeCount) || 0 : 0;
        const maxListings = 100;

        let assignedFreeEligible = Boolean(bizData.freeListingEligible);
        let assignedNumber: number | undefined =
          typeof bizData.freeListingNumber === 'number' ? bizData.freeListingNumber : undefined;

        if (!claimSnap.exists() && currentCount < maxListings) {
          const nextNum = currentCount + 1;
          assignedFreeEligible = true;
          assignedNumber = nextNum;

          tx.set(claimRef, {
            businessId,
            ownerId,
            listingNumber: nextNum,
            claimedAt: serverTimestamp(),
          });

          tx.set(quotaRef, {
            approvedFreeCount: nextNum,
            maxFreeListings: maxListings,
            updatedAt: serverTimestamp(),
          });
        }

        tx.update(
          bizRef,
          stripUndefined({
            status: 'approved',
            verified: true,
            freeListingEligible: assignedFreeEligible,
            freeListingNumber: assignedNumber,
            rejectionReason: '',
            suspensionReason: '',
            updatedAt: serverTimestamp(),
          })
        );

        return { ownerId, bizName: String(bizData.name || 'Business'), assignedNumber, assignedFreeEligible };
      });

      await syncProductsBusinessStatus(businessId, 'approved');

      if (result.ownerId) {
        try {
          const notifId = `notif-${Date.now()}`;
          await setDoc(doc(db, 'users', result.ownerId, 'notifications', notifId), {
            id: notifId,
            userId: result.ownerId,
            title: `Approved: ${clampStr(result.bizName, 90)}`,
            message: result.assignedFreeEligible
              ? `Your business is now live on VizagConnect under Free Founding Slot #${result.assignedNumber}/100!`
              : 'Your business listing has been approved and is now live on VizagConnect!',
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'update',
            read: false,
            businessId,
            createdAt: serverTimestamp(),
          });
        } catch {
          // Non-blocking notification
        }
      }

      showToast(
        result.assignedFreeEligible
          ? `Approved! Assigned Founding Free Slot #${result.assignedNumber}/100.`
          : 'Business approved and published!'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `businesses/${businessId}`);
    }
  };

  const rejectBusinessListing = async (businessId: string, reason: string) => {
    if (!currentUser?.isAdmin) return;
    const target = businesses.find((b) => b.id === businessId);
    const bizPath = `businesses/${businessId}`;
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        status: 'rejected',
        verified: false,
        rejectionReason: clampStr(reason || 'Incomplete verification details', 400),
        updatedAt: serverTimestamp(),
      });
      await syncProductsBusinessStatus(businessId, 'rejected');

      if (target?.ownerId) {
        try {
          const notifId = `notif-${Date.now()}`;
          await setDoc(doc(db, 'users', target.ownerId, 'notifications', notifId), {
            id: notifId,
            userId: target.ownerId,
            title: `Listing Needs Attention: ${clampStr(target.name, 90)}`,
            message: clampStr(`Application rejected: ${reason}`, 500),
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'update',
            read: false,
            businessId,
            createdAt: serverTimestamp(),
          });
        } catch {}
      }
      showToast('Business application rejected.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, bizPath);
    }
  };

  const suspendBusinessListing = async (businessId: string, reason: string) => {
    if (!currentUser?.isAdmin) return;
    const bizPath = `businesses/${businessId}`;
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        status: 'suspended',
        suspensionReason: clampStr(reason || 'Temporarily suspended by moderator', 400),
        updatedAt: serverTimestamp(),
      });
      await syncProductsBusinessStatus(businessId, 'suspended');
      showToast('Business listing suspended.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, bizPath);
    }
  };

  const reactivateBusinessListing = async (businessId: string) => {
    await approveBusinessListing(businessId);
  };

  const publishPublicAnnouncement = async (data: {
    title: string;
    message: string;
    type: AppNotification['type'];
    businessId?: string;
  }) => {
    if (!currentUser?.isAdmin) return;
    const notifId = `pub-${Date.now()}`;
    try {
      await setDoc(
        doc(db, 'notifications', notifId),
        stripUndefined({
          id: notifId,
          title: clampStr(data.title, 150),
          message: clampStr(data.message, 600),
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: data.type,
          audience: 'public',
          businessId: data.businessId || undefined,
          createdAt: serverTimestamp(),
        })
      );
      showToast('Public announcement published to VizagConnect LIVE!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `notifications/${notifId}`);
    }
  };

  // Notifications & Push Preferences
  const markNotificationAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target) return;

    if (target.audience === 'user' && firebaseUser) {
      const notifPath = `users/${firebaseUser.uid}/notifications/${id}`;
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid, 'notifications', id), { read: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, notifPath);
      }
    } else {
      setLocalReadNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const enablePushNotifications = async (): Promise<string> => {
    const res = await requestPushToken();
    if (firebaseUser) {
      const nextPrefs: NotificationPreferences = {
        ...(currentUser?.notificationPreferences || DEFAULT_NOTIF_PREFS),
        pushEnabled: res.status === 'enabled',
      };
      await setDoc(
        doc(db, 'users', firebaseUser.uid, 'private', 'info'),
        stripUndefined({
          uid: firebaseUser.uid,
          fcmToken: res.token,
          notificationPreferences: nextPrefs,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              fcmToken: res.token || prev.fcmToken,
              notificationPreferences: nextPrefs,
            }
          : prev
      );
    }
    showToast(res.message);
    return res.message;
  };

  const updateUserPreferences = async (
    notifPrefs: NotificationPreferences,
    privacy: PrivacySettings
  ) => {
    if (!firebaseUser) return;
    const privPath = `users/${firebaseUser.uid}/private/info`;
    try {
      await setDoc(
        doc(db, 'users', firebaseUser.uid, 'private', 'info'),
        {
          uid: firebaseUser.uid,
          notificationPreferences: notifPrefs,
          privacySettings: privacy,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setCurrentUser((prev) =>
        prev ? { ...prev, notificationPreferences: notifPrefs, privacySettings: privacy } : prev
      );
      showToast('Notification & privacy preferences saved.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, privPath);
    }
  };

  // Business Listing Create / Update / Delete
  const addBusinessListing = async (
    bizData: Omit<BusinessListing, 'id' | 'rating' | 'reviewCount'>
  ) => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      showToast('Please sign in first to publish your business listing');
      return;
    }

    const defaultCoords = VIZAG_AREA_COORDINATES[bizData.area] || { lat: 17.7225, lng: 83.315 };
    const latitude = typeof bizData.latitude === 'number' ? bizData.latitude : defaultCoords.lat;
    const longitude = typeof bizData.longitude === 'number' ? bizData.longitude : defaultCoords.lng;

    const businessId = `biz-${Date.now()}`;
    const businessPath = `businesses/${businessId}`;

    const offerings = (bizData.keyOfferings || []).map((o) => clampStr(o, 120)).filter(Boolean);
    const safeOfferings = offerings.length > 0 ? offerings.slice(0, 20) : ['Local Products & Services'];
    const galleryList = (bizData.gallery || [bizData.imageUrl]).map((g) => clampStr(g, 800)).filter(Boolean);
    const safeGallery = galleryList.length > 0 ? galleryList.slice(0, 10) : [clampStr(bizData.imageUrl, 800)];

    const isAdminCreator = Boolean(currentUser?.isAdmin);
    const initialStatus: BusinessListing['status'] = isAdminCreator ? 'approved' : 'pending';

    const payload = stripUndefined({
      id: businessId,
      ownerId: firebaseUser.uid,
      name: clampStr(bizData.name, 160),
      teluguName: bizData.teluguName ? clampStr(bizData.teluguName, 160) : undefined,
      tagline: clampStr(bizData.tagline || `${bizData.scale} in ${bizData.area}`, 220),
      scale: bizData.scale,
      category: clampStr(bizData.category, 64),
      categoryLabel: clampStr(bizData.categoryLabel, 100),
      area: clampStr(bizData.area, 100),
      address: clampStr(bizData.address, 400),
      landmark: bizData.landmark ? clampStr(bizData.landmark, 200) : undefined,
      phone: clampStr(bizData.phone, 30),
      alternatePhone: bizData.alternatePhone ? clampStr(bizData.alternatePhone, 30) : undefined,
      whatsapp: clampStr(bizData.whatsapp || '', 30),
      email: clampStr(bizData.email || '', 150),
      website: bizData.website ? clampStr(bizData.website, 250) : undefined,
      latitude,
      longitude,
      status: initialStatus,
      freeListingEligible: false,
      establishedYear: Math.min(2030, Math.max(1900, Math.round(Number(bizData.establishedYear) || 2020))),
      rating: 0,
      reviewCount: 0,
      verified: isAdminCreator,
      verificationBadge: bizData.verificationBadge || 'Local Merchant Verified',
      imageUrl: clampStr(bizData.imageUrl, 800),
      gallery: safeGallery,
      description: clampStr(bizData.description, 3000),
      keyOfferings: safeOfferings,
      manufacturingCapacity: bizData.manufacturingCapacity
        ? clampStr(bizData.manufacturingCapacity, 250)
        : undefined,
      businessHours: clampStr(bizData.businessHours || '09:00 AM - 08:00 PM', 200),
      appointmentSlots:
        bizData.appointmentSlots && bizData.appointmentSlots.length > 0
          ? bizData.appointmentSlots.slice(0, 20)
          : ['10:00 AM - 11:00 AM', '11:30 AM - 12:30 PM', '03:00 PM - 04:00 PM', '05:00 PM - 06:00 PM'],
      isRetail: Boolean(bizData.isRetail),
      isWholesale: Boolean(bizData.isWholesale),
      isManufacturer: Boolean(bizData.isManufacturer),
      contactPerson: clampStr(bizData.contactPerson || currentUser?.name || 'Business Owner', 100),
      contactDesignation: clampStr(bizData.contactDesignation || 'Proprietor', 100),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'businesses', businessId), payload);
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        isBusinessOwner: true,
        businessId,
        businessName: clampStr(bizData.name, 150),
        updatedAt: serverTimestamp(),
      });
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              isBusinessOwner: true,
              businessId,
              businessName: clampStr(bizData.name, 150),
            }
          : prev
      );

      if (isAdminCreator) {
        await approveBusinessListing(businessId);
      } else {
        showToast(
          `Submitted "${bizData.name}" for verification! You can manage products & hours in Owner Portal.`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, businessPath);
    }
  };

  const updateBusinessListing = async (id: string, updates: Partial<BusinessListing>) => {
    const businessPath = `businesses/${id}`;
    const cleanUpdates = stripUndefined({
      ...updates,
      updatedAt: serverTimestamp(),
    });

    try {
      await updateDoc(doc(db, 'businesses', id), cleanUpdates);
      showToast('Business details updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, businessPath);
    }
  };

  const deleteBusinessListing = async (id: string) => {
    const businessPath = `businesses/${id}`;
    try {
      await deleteDoc(doc(db, 'businesses', id));
      showToast('Listing removed from directory');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, businessPath);
    }
  };

  const ownerBusinessId = currentUser?.businessId;
  const ownerBusiness =
    (ownerBusinessId ? businesses.find((b) => b.id === ownerBusinessId) : null) ||
    businesses.find((b) => b.ownerId && b.ownerId === firebaseUser?.uid) ||
    null;

  // Auth Actions
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
      showToast(`Welcome, ${result.user.displayName || 'Vizag Citizen'}!`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Google Sign-In failed';
      if (!msg.includes('popup-closed-by-user')) {
        showToast(msg);
      }
      throw error;
    }
  };

  const updateUserProfile = async (updates: { name: string; area: string }) => {
    if (!firebaseUser) return;
    const userPath = `users/${firebaseUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        name: clampStr(updates.name, 100),
        area: clampStr(updates.area, 100),
        updatedAt: serverTimestamp(),
      });
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              name: clampStr(updates.name, 100),
              area: clampStr(updates.area, 100),
            }
          : prev
      );
      showToast('Profile updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  };

  const logout = async () => {
    await signOut(auth);
    if (activeTab === 'owner' || activeTab === 'admin') {
      setActiveTab('home');
    }
    showToast('Signed out of VizagConnect');
  };

  const deleteAccount = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    const uid = auth.currentUser.uid;
    try {
      try {
        await deleteDoc(doc(db, 'users', uid, 'private', 'info'));
      } catch {}
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch {}
      await deleteUser(auth.currentUser);
      setActiveTab('home');
      showToast('Your VizagConnect account has been permanently deleted.');
      return true;
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        showToast('For security, please sign out and sign back in right before deleting your account.');
      } else {
        showToast('Unable to delete account right now. Please try again.');
      }
      return false;
    }
  };

  const openBusinessModal = (biz: BusinessListing) => {
    setSelectedBusinessIdForModal(biz.id);
    void loadBusinessReviews(biz.id);
    void loadBusinessProducts(biz.id);
    void recordRecentlyViewed(biz.id);
  };

  const closeBusinessModal = () => setSelectedBusinessIdForModal(null);

  const openInquiryModal = (biz: BusinessListing) => setInquiryModalBusiness(biz);
  const closeInquiryModal = () => setInquiryModalBusiness(null);

  const openAppointmentModal = (biz: BusinessListing) => setAppointmentModalBusiness(biz);
  const closeAppointmentModal = () => setAppointmentModalBusiness(null);

  const openReportModal = (target?: { businessId?: string; businessName?: string }) =>
    setReportModalTarget(target || {});
  const closeReportModal = () => setReportModalTarget(null);

  const triggerAiPrompt = (prompt: string) => {
    setAiPrefillPrompt(prompt);
    if (prompt) {
      setActiveTab('ai');
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedArea,
        setSelectedArea,
        selectedScale,
        setSelectedScale,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        language,
        setLanguage,
        userRoleMode,
        setUserRoleMode,
        customerLocation,
        isLocatingCustomer,
        requestCustomerLocation,
        getBusinessDistanceKm,
        businesses,
        approvedBusinesses,
        isLoadingBusinesses,
        listingQuota,
        addBusinessListing,
        updateBusinessListing,
        deleteBusinessListing,
        approveBusinessListing,
        rejectBusinessListing,
        suspendBusinessListing,
        reactivateBusinessListing,
        moderateReview,
        publishPublicAnnouncement,
        productsByBusiness,
        allApprovedProducts,
        loadBusinessProducts,
        addBusinessProduct,
        updateBusinessProduct,
        deleteBusinessProduct,
        saveBusinessOffers,
        saveBusinessAppointmentSlots,
        appointments,
        loadBookedSlotsForBusiness,
        bookAppointment,
        updateAppointmentStatus,
        savedBusinesses,
        toggleSaveBusiness,
        isBusinessSaved,
        recentlyViewedIds,
        addReview,
        loadBusinessReviews,
        inquiries,
        submitInquiry,
        updateInquiryStatus,
        reports,
        submitReport,
        updateReportStatus,
        events,
        submitCommunityEvent,
        moderateCommunityEvent,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        isNotificationsModalOpen,
        setIsNotificationsModalOpen,
        enablePushNotifications,
        updateUserPreferences,
        currentUser,
        firebaseUser,
        isAuthReady,
        isLoggedIn: !!currentUser,
        loginWithGoogle,
        updateUserProfile,
        logout,
        deleteAccount,
        setPendingPhoneProfile,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        isRegisterModalOpen,
        setIsRegisterModalOpen,
        isSupportModalOpen,
        setIsSupportModalOpen,
        selectedBusinessForModal,
        openBusinessModal,
        closeBusinessModal,
        inquiryModalBusiness,
        openInquiryModal,
        closeInquiryModal,
        appointmentModalBusiness,
        openAppointmentModal,
        closeAppointmentModal,
        reportModalTarget,
        openReportModal,
        closeReportModal,
        ownerBusiness,
        toastMessage,
        showToast,
        aiPrefillPrompt,
        triggerAiPrompt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
