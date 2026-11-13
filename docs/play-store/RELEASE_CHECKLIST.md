# VizagConnect Production & Google Play Release Checklist

This guide documents every external console configuration, API key restriction, and local Android build step required to ship VizagConnect (`in.vizagconnect.app`) to production and Google Play Store.

---

## 1. Web & Server Environment Variables (`.env` / Hosting)
- `GEMINI_API_KEY`: Server-side only (never `VITE_` prefixed). Powers `/api/ai/chat`.
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps JavaScript API key. Restrict in Google Cloud Console:
  - **Web key:** HTTP referrer restriction (`https://your-domain/*`).
  - **Enable APIs:** Maps JavaScript API, Places API (optional autocomplete), Geocoding API (optional).
- `VITE_FIREBASE_VAPID_KEY`: Generated in **Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates** (`Generate key pair`) so Web browsers can subscribe to `getToken()` via `/firebase-messaging-sw.js`.

---

## 2. Firebase Console Configurations Required for Full Live Operation

### A. Firebase Blaze Plan + Phone Authentication (Real `+91` SMS OTP)
1. Open **Firebase Console** (`vizagconnect-9814f`) -> Upgrade project from Spark to **Blaze (Pay-as-you-go)** (Firebase Phone Auth provides free monthly tier, but SMS delivery to Indian `+91` numbers requires Blaze billing + India SMS regions enabled).
2. Go to **Authentication -> Sign-in method -> Phone** -> Enable Phone provider.
3. Under **Authentication -> Settings -> SMS region policy**, allow **India (+91)**.
4. Under **Authentication -> Settings -> Authorized domains**, add your production web domain (e.g., `vizagconnect.in`) alongside `localhost`.
5. **Indian Telecom DLT Compliance:** For custom branded SMS headers (`THE LOGIN OTP {OTP} FOR VIZAGCONNECT`) instead of Google's default shared sender, register Entity ID & Template ID on an Indian DLT portal (e.g., Jio/Airtel/Vodafone) or integrate a DLT-approved Indian SMS gateway (MSG91 / Kaleyra / Gupshup / Twilio Verify India) via Firebase Auth blocking/custom SMS trigger or backend OTP relay.

### B. Firebase Cloud Storage Rules
1. Open **Firebase Console -> Storage -> Get Started** to initialize bucket `vizagconnect-9814f.firebasestorage.app`.
2. Deploy rules allowing authenticated owners to upload JPG/PNG/WEBP images under `/businesses/{uid}/**` (max 5 MB) and public read access:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /businesses/{ownerUid}/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null
                      && request.auth.uid == ownerUid
                      && request.resource.size < 5 * 1024 * 1024
                      && request.resource.contentType.matches('image/(jpeg|png|webp)');
       }
     }
   }
   ```

### C. Cloud Firestore Rules (Already Deployed via `DeployRules`)
- Rules live in `/firestore.rules` and schema in `/firebase-blueprint.json`.

---

## 3. Android Studio & Signed `.aab` Release Build (Local Workstation with JDK 21 + Android SDK)
*(Note: JDK/Gradle/Android SDK are not installed in this cloud build container, so `.aab` signing and compilation must be executed locally after pulling the repo.)*

1. **Pull latest repo & sync web bundle into `android/`:**
   ```bash
   npm install
   npm run cap:sync
   ```
2. **Register Android App in Firebase Console:**
   - Package Name: `in.vizagconnect.app`
   - Add both **Debug SHA-1 / SHA-256** and **Play App Signing Release SHA-1 / SHA-256** fingerprints in Firebase Console (required for Google Sign-In & Phone Auth Play Integrity verification on Android).
   - Download `google-services.json` and place it at:
     `android/app/google-services.json`
3. **Create Upload Keystore (Keep Safe Outside Git):**
   ```bash
   keytool -genkey -v -keystore vizagconnect-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias vizagconnect
   ```
4. **Configure `android/keystore.properties` (never commit secrets) & build Release AAB:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   Output bundle will be at: `android/app/build/outputs/bundle/release/app-release.aab`.
5. **Upload to Google Play Console:**
   - Complete Store Listing (`STORE_LISTING.md`), Data Safety (`DATA_SAFETY_AND_DECLARATIONS.md`), Privacy Policy URL (`PRIVACY_POLICY.md`), and App Access notes for Play reviewers.
   - Run **Internal Testing** track first to verify Phone OTP + Google Maps + Push Notifications on physical Android devices before promoting to Production.
