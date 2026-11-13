# Google Play Data Safety & Permissions Declarations — VizagConnect

## 1. Android Permissions & Play Justification

| Permission (`AndroidManifest.xml`) | Runtime Usage in App | User Control |
| :--- | :--- | :--- |
| `INTERNET` | Required for Firebase Auth/Firestore/Storage, Google Maps, and Vizag AI proxy API. | Core connectivity |
| `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION` | Optional GPS "Near Me" distance calculation, Map centering, and Owner address pinning. | Prompted only on explicit tap (`requestCustomerLocation`) |
| `CAMERA` | Used only when a signed-in business owner taps "Camera" to photograph a storefront or product. | Prompted on Camera tap (`@capacitor/camera`) |
| `POST_NOTIFICATIONS` (Android 13+) | Optional push alerts for inquiry/booking updates and Vizag announcements. | Opt-in via Profile -> Enable Push Notifications |

## 2. Play Console Data Safety Form Mapping

- **Does your app collect or share any required user data types?** Yes (Collects user-provided data; does NOT sell data or share with third-party data brokers).
- **Data Encrypted in Transit:** Yes (HTTPS / TLS for all Firebase, Google Maps, and backend API requests).
- **Account Deletion Mechanism:** Yes, in-app deletion path available (`Profile -> Account & Privacy -> Delete My Account`), plus support channel at `+91 8466947304`.
- **Data Types Collected:**
  1. **Personal Info -> Name & User ID:** Account creation, reviews, inquiries, appointments (Required for account features).
  2. **Personal Info -> Phone number / Email address:** Firebase Phone OTP / Google Sign-In, business contact & booking routing. Stored privately under `users/{uid}/private/info`.
  3. **Location -> Approximate / Precise location:** Optional, user-initiated only for distance sorting and map centering; not tracked in the background.
  4. **Photos & Videos -> Photos:** Optional storefront/product uploads initiated by business owners.
  5. **App Interactions / UGC:** Submitted reviews, inquiries, reports, and community event proposals.

## 3. Target Audience & Content Policy
- **Target Age:** 18+ / General public (not specifically directed at children).
- **UGC Moderation:** All public reviews support automated spam flagging (`flagged` status) + Admin moderation; every business card includes a **Report Issue** button linked to the `reports` collection and Admin moderation queue.
