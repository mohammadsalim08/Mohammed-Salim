# Privacy Policy — VizagConnect

**Effective Date:** November 2026  
**Application Name:** VizagConnect (`in.vizagconnect.app`)  
**Coverage Region:** Visakhapatnam & Andhra Pradesh, India  
**Official Support WhatsApp:** +91 8466947304 (`https://wa.me/918466947304`)

---

## 1. Information We Collect

1. **Account Information:** Full name, Visakhapatnam area/locality, verified `+91` mobile phone number (via Firebase Phone Authentication), or verified email/profile information (via Google Sign-In).
2. **Business Owner Submissions:** Business name, category, scale, street address, latitude/longitude coordinates, business contact number/WhatsApp, opening hours, product catalogs, prices, special offers, and storefront photographs uploaded to Firebase Cloud Storage.
3. **Customer Interactions:** Business inquiries, appointment bookings, saved favourites, recently viewed business IDs, verified customer reviews, and submitted platform/business reports.
4. **Location Information (Optional & Permission-Based):** Precise or coarse GPS coordinates requested only when you tap "Near Me" / GPS centering or drop a location pin on the map.
5. **Push Notification Tokens (Optional):** Firebase Cloud Messaging (FCM) device/browser tokens saved only when you explicitly enable push notifications in Profile -> Preferences & Push.

## 2. How We Use Information

- To connect Visakhapatnam residents and visitors with verified local businesses, services, and manufacturing units.
- To prevent double-booking of appointment slots using atomic database transactions.
- To moderate business applications, community events, flagged reviews, and user reports.
- To power local context in Vizag AI without inventing businesses or exposing private user fields.
- To deliver requested updates and booking status notifications when permitted.

## 3. Data Isolation & Security

- Private personal contact details (`phone`, `email`, `fcmToken`, `notificationPreferences`, `privacySettings`) are stored under private user sub-documents (`users/{uid}/private/info`) protected by strict Cloud Firestore Security Rules.
- Public profiles never expose private customer contact numbers to unrelated users.
- Inquiries and appointment details are accessible only to the submitting customer, the owning business account, and authorized platform administrators.

## 4. Account Deletion & Data Rights

You may update your profile, adjust location/review privacy preferences, or permanently delete your account at any time from **Profile -> Account & Privacy -> Delete My Account**, or contact official platform support via WhatsApp at **+91 8466947304**.

## 5. Third-Party Services

- **Firebase (Google LLC):** Authentication, Cloud Firestore, Cloud Storage, Cloud Messaging.
- **Google Maps Platform:** Interactive maps, geolocation pinning, and directions.
- **Google Gemini API (Server-Side Proxy):** Vizag AI natural-language responses and web grounding.
