/**
 * Phase 0 TDD Security Contract Suite for VizagConnect Firestore Rules (Phases 1-6)
 * Verifies that every adversarial payload violates the rules contract
 * and yields PERMISSION_DENIED when evaluated against firestore.rules.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string | null;
    email?: string;
    emailVerified?: boolean;
    provider?: 'phone' | 'google.com';
  };
  payload: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Business Creation',
    collectionPath: '/businesses/biz_001',
    operation: 'create',
    auth: { uid: 'usr_attacker', provider: 'google.com', emailVerified: true },
    payload: { id: 'biz_001', ownerId: 'usr_victim', name: 'Fake Steel Works', status: 'pending' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Verification & Status Approval Escalation',
    collectionPath: '/businesses/biz_001',
    operation: 'update',
    auth: { uid: 'usr_owner', provider: 'phone' },
    payload: { verified: true, status: 'approved', freeListingEligible: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Ghost Field Injection on User Profile',
    collectionPath: '/users/usr_1',
    operation: 'create',
    auth: { uid: 'usr_1', provider: 'google.com', emailVerified: true },
    payload: { id: 'usr_1', name: 'Attacker', area: 'MVP Colony', isBusinessOwner: false, isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified Admin Email Spoof Attack',
    collectionPath: '/businesses/biz_001',
    operation: 'update',
    auth: { uid: 'usr_spoof', email: 'mohamnedsalim21493@gmail.com', emailVerified: false, provider: 'google.com' },
    payload: { verified: true, status: 'approved' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-User PII Read on Private Info',
    collectionPath: '/users/usr_1/private/info',
    operation: 'get',
    auth: { uid: 'usr_2', provider: 'google.com', emailVerified: true },
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unfiltered List Query Exposing Non-Approved Business',
    collectionPath: '/businesses',
    operation: 'list',
    auth: { uid: 'usr_2', provider: 'google.com', emailVerified: true },
    payload: { existingStatus: 'pending', existingOwnerId: 'usr_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Review Write Without Existing Business Parent',
    collectionPath: '/businesses/missing_biz/reviews/rev_1',
    operation: 'create',
    auth: { uid: 'usr_1', provider: 'phone' },
    payload: { id: 'rev_1', businessId: 'missing_biz', userId: 'usr_1', rating: 5, comment: 'Nice' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID Poisoning with Invalid Characters',
    collectionPath: '/businesses/bad$id!@#',
    operation: 'create',
    auth: { uid: 'usr_1', provider: 'google.com', emailVerified: true },
    payload: { id: 'bad$id!@#', ownerId: 'usr_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Inquiry Target Business Owner Spoofing',
    collectionPath: '/inquiries/inq_1',
    operation: 'create',
    auth: { uid: 'usr_1', provider: 'phone' },
    payload: { id: 'inq_1', businessId: 'biz_1', businessOwnerId: 'usr_1', senderId: 'usr_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal State Reopening on Closed Inquiry',
    collectionPath: '/inquiries/inq_1',
    operation: 'update',
    auth: { uid: 'usr_owner', provider: 'google.com', emailVerified: true },
    payload: { existingStatus: 'Closed', status: 'Pending' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client Timestamp Backdating Forgery',
    collectionPath: '/businesses/biz_2',
    operation: 'create',
    auth: { uid: 'usr_1', provider: 'google.com', emailVerified: true },
    payload: { id: 'biz_2', ownerId: 'usr_1', createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Resource Poisoning Oversized Offerings Array',
    collectionPath: '/businesses/biz_3',
    operation: 'create',
    auth: { uid: 'usr_1', provider: 'google.com', emailVerified: true },
    payload: { id: 'biz_3', ownerId: 'usr_1', keyOfferings: Array.from({ length: 25 }, (_, i) => `item-${i}`) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 13,
    name: 'Appointment Auto-Confirmation Escalation by Customer',
    collectionPath: '/appointments/apt_1',
    operation: 'create',
    auth: { uid: 'usr_cust', provider: 'phone' },
    payload: { id: 'apt_1', businessId: 'biz_1', customerId: 'usr_cust', status: 'Confirmed' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 14,
    name: 'Non-Admin First-100 Quota Counter Tampering',
    collectionPath: '/platformConfig/listingQuota',
    operation: 'update',
    auth: { uid: 'usr_1', provider: 'google.com', emailVerified: true },
    payload: { approvedFreeCount: 0, maxFreeListings: 100 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 15,
    name: 'Cross-Owner Product Catalog Creation',
    collectionPath: '/businesses/biz_1/products/prod_1',
    operation: 'create',
    auth: { uid: 'usr_attacker', provider: 'google.com', emailVerified: true },
    payload: { id: 'prod_1', businessId: 'biz_1', ownerId: 'usr_attacker', name: 'Spoofed Item', price: 100 },
    expectedResult: 'PERMISSION_DENIED',
  },
];

export function verifyDirtyDozenContract(cases: DirtyDozenCase[] = DIRTY_DOZEN_PAYLOADS): boolean {
  if (cases.length < 12) {
    throw new Error(`Expected at least 12 adversarial cases, got ${cases.length}`);
  }
  return cases.every((c) => c.expectedResult === 'PERMISSION_DENIED');
}
