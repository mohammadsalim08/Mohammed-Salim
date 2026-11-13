import { Auth, RecaptchaVerifier, RecaptchaParameters } from 'firebase/auth';

export interface RecaptchaVerifierInstance {
  render: () => Promise<number>;
  clear: () => void;
}

export type RecaptchaVerifierFactory = (
  container: HTMLElement,
  params: RecaptchaParameters
) => RecaptchaVerifierInstance;

export interface RecaptchaCallbacks {
  onExpired?: () => void;
  onError?: () => void;
}

/**
 * Lifecycle manager for Firebase invisible RecaptchaVerifier.
 * Prevents "reCAPTCHA has already been rendered in this element." by:
 * 1. Reusing an active, rendered verifier whenever healthy.
 * 2. Deduping concurrent initialization calls via an in-flight renderPromise.
 * 3. Mounting each fresh verifier into a newly created child slot inside the
 *    stable host container and clearing DOM residue on reset/unmount.
 */
export class RecaptchaLifecycleManager {
  private verifier: RecaptchaVerifierInstance | null = null;
  private renderPromise: Promise<number> | null = null;
  private slotEl: HTMLElement | null = null;
  private hostEl: HTMLElement | null = null;
  private slotSequence = 0;
  private destroyed = false;

  constructor(private readonly createVerifier: RecaptchaVerifierFactory) {}

  static fromFirebaseAuth(auth: Auth): RecaptchaLifecycleManager {
    return new RecaptchaLifecycleManager(
      (container, params) => new RecaptchaVerifier(auth, container, params)
    );
  }

  hasActiveVerifier(): boolean {
    return this.verifier !== null && !this.destroyed;
  }

  async ensureVerifier(
    hostEl: HTMLElement,
    hostId: string,
    callbacks?: RecaptchaCallbacks
  ): Promise<RecaptchaVerifierInstance> {
    if (this.destroyed) {
      this.destroyed = false;
    }

    // Reuse active healthy verifier (dedupes concurrent calls too)
    if (this.verifier && this.renderPromise) {
      await this.renderPromise;
      if (this.verifier && !this.destroyed) {
        return this.verifier;
      }
    }

    this.hostEl = hostEl;
    // Clear any stale widget nodes before mounting a fresh child slot
    hostEl.replaceChildren();

    const doc = hostEl.ownerDocument;
    const slot = doc.createElement('div');
    this.slotSequence += 1;
    slot.id = `${hostId}-slot-${this.slotSequence}`;
    hostEl.appendChild(slot);
    this.slotEl = slot;

    const params: RecaptchaParameters = {
      size: 'invisible',
      'expired-callback': () => {
        this.reset();
        callbacks?.onExpired?.();
      },
      'error-callback': () => {
        this.reset();
        callbacks?.onError?.();
      },
    };

    const instance = this.createVerifier(slot, params);
    this.verifier = instance;
    const pendingRender = Promise.resolve(instance.render());
    this.renderPromise = pendingRender;

    try {
      await pendingRender;
      // Guard against unmount or reset during async render()
      if (this.destroyed || this.verifier !== instance) {
        try {
          instance.clear();
        } catch {
          // Ignore cleanup errors on unmounted widgets
        }
        slot.remove();
        throw new Error('RECAPTCHA_LIFECYCLE_ABORTED');
      }
      return instance;
    } catch (err) {
      if (this.verifier === instance) {
        this.reset();
      }
      throw err;
    }
  }

  reset(): void {
    const current = this.verifier;
    this.verifier = null;
    this.renderPromise = null;

    if (current) {
      try {
        current.clear();
      } catch {
        // Ignore clear errors if widget DOM was already detached
      }
    }

    if (this.slotEl) {
      try {
        this.slotEl.remove();
      } catch {
        // Ignore
      }
      this.slotEl = null;
    }

    if (this.hostEl) {
      try {
        this.hostEl.replaceChildren();
      } catch {
        // Ignore
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.reset();
    this.hostEl = null;
  }
}

export function validateIndianMobile(digits: string): string | null {
  const clean = digits.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(clean)) {
    return 'Enter a valid 10-digit Indian mobile number starting with 6-9.';
  }
  return null;
}

export function isRecoverableRecaptchaError(err: unknown): boolean {
  const code = (err as { code?: string })?.code || '';
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    code === 'auth/captcha-check-failed' ||
    code === 'auth/invalid-app-credential' ||
    code === 'auth/network-request-failed' ||
    msg.includes('already been rendered') ||
    msg.includes('recaptcha') ||
    msg.includes('timeout')
  );
}

export function mapPhoneAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err);

  if (code === 'auth/operation-not-allowed') {
    return 'Phone OTP sign-in is not yet enabled in Firebase Console (Authentication > Sign-in method > Phone). Enable it or use Continue with Google below.';
  }
  if (code === 'auth/billing-not-enabled') {
    return 'Live SMS OTP requires Firebase Blaze billing in Firebase Console. You can configure Firebase test phone numbers for free testing or use Continue with Google.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many OTP requests from this device or number. Please wait a few minutes and try again.';
  }
  if (code === 'auth/invalid-phone-number') {
    return 'Invalid Indian mobile number. Enter a valid 10-digit +91 mobile number.';
  }
  if (code === 'auth/invalid-verification-code') {
    return 'Incorrect 6-digit OTP. Please check your Messages app and re-enter the code.';
  }
  if (code === 'auth/code-expired' || code === 'auth/session-expired') {
    return 'This OTP has expired. Tap "Resend OTP" to request a fresh 6-digit SMS code.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This app domain is not yet authorized in Firebase Console (Authentication > Settings > Authorized domains).';
  }
  if (code === 'auth/captcha-check-failed' || code === 'auth/invalid-app-credential') {
    return 'reCAPTCHA security check failed or expired. Tap "Send 6-Digit OTP via SMS" again, or check Authorized Domains in Firebase Console.';
  }
  if (msg.toLowerCase().includes('already been rendered')) {
    return 'Security verification widget was reset. Please tap Send OTP again.';
  }
  return msg || 'Phone verification failed. Please try again.';
}
