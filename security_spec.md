# VizagConnect Firestore Security Specification (Phases 1–6)

## 1. Data Invariants

1. **Public Discovery vs Owner / Admin Access (`/businesses/{businessId}`):**
   - Only listings with `status == 'approved'` are readable (get/list) by unauthenticated visitors or general users.
   - Pending, rejected, or suspended listings are readable only by their `ownerId` or an `admin`.
   - Non-admin creators MUST set `ownerId == request.auth.uid`, `verified == false`, and `status == 'pending'` (requiring Admin approval), with `freeListingEligible == false` (no client self-granting free quota).
   - Only `isAdmin()` may transition `status` (`approved`, `rejected`, `suspended`), set `verified`, `rejectionReason`, `freeListingEligible`, or `freeListingNumber`.
   - Document IDs must match `^[a-zA-Z0-9_\-]+$` (max 128 chars). Timestamps (`createdAt`, `updatedAt`) must equal `request.time`.
2. **First-100 Free Listings Atomic Ledger (`/platformConfig/listingQuota` & `/freeListingClaims/{businessId}`):**
   - Public `get` is permitted on `/platformConfig/listingQuota` to show live remaining free spots out of 100.
   - Only `isAdmin()` can update `listingQuota` (`approvedFreeCount` integer `0..100`, `maxFreeListings == 100`) and create immutable `/freeListingClaims/{businessId}` records inside a Firestore `runTransaction`.
   - `/freeListingClaims/{businessId}` forbids `update` and `delete` (`if false`) so a business can never claim a slot twice.
3. **Products & Services Subcollection (`/businesses/{businessId}/products/{productId}`):**
   - `allow list` inspects ONLY `resource.data.businessStatus == 'approved'` or `resource.data.ownerId == request.auth.uid` or `isAdmin()` (O(1) per-doc, zero `get()` cost explosion).
   - Create/update/delete requires parent business ownership (`get(.../businesses/$(businessId)).data.ownerId == request.auth.uid`) or `isAdmin()`.
4. **PII Isolation (`/users/{userId}` vs `/users/{userId}/private/info`):**
   - User profile docs and `/users/{userId}/private/info` (personal email, phone, FCM token, notification & privacy preferences) are strictly readable and writable ONLY by `request.auth.uid == userId` or `isAdmin()`.
   - Users cannot escalate privileges (`role`, `isAdmin`, or ghost fields are rejected by strict `hasAll` / `hasOnly`).
   - Only `admins/{uid}` documents or verified bootstrapped admin (`mohamnedsalim21493@gmail.com` with `email_verified == true`) hold admin authority.
5. **Master Gate on Subcollections (`/businesses/{businessId}/reviews/{reviewId}` & `/users/{userId}/recentlyViewed/{businessId}`):**
   - Reviews cannot be created for a non-existent parent business.
   - Review `userId` must equal `request.auth.uid`, `businessId` must equal path `businessId`, and `rating` must be an integer between `1` and `5`.
   - Reviews are immutable once created except by `isAdmin()` moderation or author deletion.
6. **Relational Integrity on Inquiries & Appointments (`/inquiries/{inquiryId}`, `/appointments/{appointmentId}`):**
   - Inquiries require `senderId == request.auth.uid`, existing `businessId`, and matching `businessOwnerId`. Closed inquiries cannot be reopened by non-admins.
   - Appointments require `customerId == request.auth.uid`, existing **approved** `businessId`, matching `businessOwnerId`, and initial `status == 'Requested'`.
   - Only `businessOwnerId`, `customerId` (cancellation only), or `isAdmin()` can read/update an appointment; terminal states (`Completed`, `Cancelled`) are locked for non-admins.
7. **Reports & Community Events (`/reports/{reportId}`, `/events/{eventId}`):**
   - Reports are writable by verified users (`reporterId == request.auth.uid`, initial `status == 'Open'`) and readable only by `reporterId` or `isAdmin()`; only `isAdmin()` can moderate or resolve reports.
   - Events with `status == 'approved'` are publicly browsable; non-admin submissions must start as `status == 'pending'`.

---

## 2. Adversarial Security Contract ("Dirty Dozen+")

All payloads below MUST evaluate to `PERMISSION_DENIED`:

1. **Identity Spoofing on Business Creation:** Unprivileged user attempts `create` on `/businesses/biz_001` with `{ ownerId: "usr_victim", ... }`.
2. **Self-Verification & Free Quota Escalation:** Business owner attempts `create` or `update` setting `verified: true`, `status: 'approved'`, or `freeListingEligible: true` without admin role.
3. **Ghost Field Injection on User Profile:** User attempts `create` on `/users/usr_1` with `{ ..., isAdmin: true }`.
4. **Admin Email Spoofing without Verification:** Caller with `token.email == "mohamnedsalim21493@gmail.com"` and `token.email_verified == false` attempts admin write.
5. **Cross-User PII Read:** Authenticated user `usr_2` attempts `get` on `/users/usr_1/private/info`.
6. **Private Listing Scraping (`list` without filter):** Non-owner runs `list` matching `status in ['pending', 'rejected', 'suspended']`.
7. **Orphaned Review Write:** Authenticated user attempts `create` on `/businesses/missing_biz/reviews/rev_1`.
8. **ID Poisoning Attack:** User attempts `create` with invalid chars (`bad$id!@#`) or length > 128.
9. **Inquiry Target Owner Spoofing:** User creates `/inquiries/inq_1` setting wrong `businessOwnerId`.
10. **Closed Inquiry Reopening (Terminal State Violation):** Owner tries changing `Closed` inquiry back to `Pending`.
11. **Timestamp Forgery:** User attempts `create` with `createdAt != request.time`.
12. **Unbounded/Oversized Array & String Resource Poisoning:** `keyOfferings.size() > 20` or `appointmentSlots.size() > 20`.
13. **Appointment Double-Identity Spoofing / Auto-Confirm:** Customer creates `/appointments/apt_1` with `status: 'Confirmed'` directly instead of `'Requested'`.
14. **Duplicate Free Listing Claim Overwrite:** Even an admin cannot `update` `/freeListingClaims/{businessId}` once claimed, preventing duplicate counter inflation.
15. **Non-AdminQuota Counter Tampering:** Non-admin attempts `update` on `/platformConfig/listingQuota`.
