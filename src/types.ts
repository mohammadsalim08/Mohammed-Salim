export type BusinessScale =
  | 'Small Business'
  | 'Medium Enterprise'
  | 'Large Manufacturing Factory'
  | 'Artisan / Cottage Industry';

export type AppLanguage = 'en' | 'te';

export interface BusinessReview {
  id: string;
  businessId: string;
  userId?: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  status: 'approved' | 'pending' | 'flagged';
  moderationNotes?: string;
}

export interface BusinessOffer {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  discountBadge?: string;
  validTill: string;
  tag: string;
}

export interface BusinessProduct {
  id: string;
  businessId: string;
  ownerId: string;
  businessStatus: 'approved' | 'pending' | 'rejected' | 'suspended';
  name: string;
  category: string;
  price: number;
  unit?: string;
  availability: 'In Stock' | 'Out of Stock' | 'Made to Order' | 'By Appointment';
  description?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessListing {
  id: string;
  ownerId?: string;
  name: string;
  teluguName?: string;
  tagline: string;
  scale: BusinessScale;
  category: string;
  categoryLabel: string;
  area: string;
  address: string;
  landmark?: string;
  phone: string;
  alternatePhone?: string;
  whatsapp: string;
  email: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  status: 'approved' | 'pending' | 'rejected' | 'suspended';
  rejectionReason?: string;
  suspensionReason?: string;
  freeListingEligible?: boolean;
  freeListingNumber?: number;
  establishedYear: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  verificationBadge: 'Govt / MSME Verified' | 'Industrial License' | 'Local Merchant Verified';
  imageUrl: string;
  gallery: string[];
  description: string;
  keyOfferings: string[];
  manufacturingCapacity?: string;
  businessHours: string;
  appointmentSlots?: string[];
  isRetail: boolean;
  isWholesale: boolean;
  isManufacturer: boolean;
  certifications?: string[];
  contactPerson: string;
  contactDesignation: string;
  reviews?: BusinessReview[];
  offers?: BusinessOffer[];
  products?: BusinessProduct[];
  createdAtMs?: number;
}

export interface BusinessCategory {
  id: string;
  name: string;
  teluguName: string;
  icon: string;
  description: string;
  count: number;
  scaleTypes: BusinessScale[];
}

export interface BusinessInquiry {
  id: string;
  businessId: string;
  businessOwnerId?: string;
  businessName: string;
  senderId?: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  inquiryType: 'Wholesale / Bulk Order' | 'Retail Purchase' | 'Manufacturing & Supply' | 'General Query';
  message: string;
  date: string;
  status: 'Pending' | 'Contacted' | 'Closed';
}

export interface AppointmentBooking {
  id: string;
  businessId: string;
  businessOwnerId: string;
  businessName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  slotDate: string; // YYYY-MM-DD
  slotTime: string;
  serviceOrProduct: string;
  notes?: string;
  status: 'Requested' | 'Confirmed' | 'Cancelled' | 'Completed';
  date: string;
}

export interface BookedSlot {
  id: string;
  businessId: string;
  slotDate: string;
  slotTime: string;
  appointmentId: string;
  customerId: string;
  status: 'booked' | 'cancelled';
}

export interface PlatformReport {
  id: string;
  type: 'business_report' | 'incorrect_info' | 'complaint';
  targetBusinessId?: string;
  targetBusinessName?: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  details: string;
  status: 'Open' | 'Reviewed' | 'Resolved';
  adminNotes?: string;
  date: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  category: 'Event' | 'Exhibition' | 'Cultural Program' | 'Public Announcement';
  area: string;
  venue: string;
  eventDate: string;
  eventTime?: string;
  organizerName: string;
  organizerId: string;
  description: string;
  status: 'approved' | 'pending' | 'rejected';
  date: string;
}

export interface ListingQuotaState {
  approvedFreeCount: number;
  maxFreeListings: number;
  remainingFreeSlots: number;
}

export interface NotificationPreferences {
  offers: boolean;
  bookings: boolean;
  inquiries: boolean;
  events: boolean;
  pushEnabled: boolean;
}

export interface PrivacySettings {
  shareLocationForNearby: boolean;
  showProfileNameInReviews: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'offer' | 'update' | 'inquiry' | 'review' | 'booking';
  read: boolean;
  businessId?: string;
  audience?: 'public' | 'user';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  area: string;
  isBusinessOwner?: boolean;
  isAdmin?: boolean;
  authProvider?: 'phone' | 'google';
  businessId?: string;
  businessName?: string;
  fcmToken?: string;
  notificationPreferences?: NotificationPreferences;
  privacySettings?: PrivacySettings;
}

export interface TourismDestination {
  id: string;
  name: string;
  teluguName: string;
  category: 'Beach' | 'Heritage & Museum' | 'Hill Station & Nature' | 'Temple & Spiritual' | 'Park & Viewpoint';
  area: string;
  shortTagline: string;
  description: string;
  timings: string;
  entryInfo: string;
  bestTime: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  photoSource: string;
  photoArtist: string;
  photoLicense: string;
  photoAttributionUrl: string;
  officialReferenceUrl: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sources?: Array<{
    web: {
      title: string;
      uri: string;
    };
  }>;
  recommendedBusinessIds?: string[];
}
