import React, { useState, useEffect, useRef, useId } from 'react';
import {
  X,
  Phone,
  User as UserIcon,
  MapPin,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { RecaptchaVerifier as FirebaseRecaptchaVerifier } from 'firebase/auth';
import { useApp } from '../context/AppContext';
import { VIZAG_AREAS } from '../data/mockData';
import {
  auth,
  signInWithPhoneNumber,
  ConfirmationResult,
} from '../lib/firebase';
import {
  RecaptchaLifecycleManager,
  validateIndianMobile,
  isRecoverableRecaptchaError,
  mapPhoneAuthError,
} from '../lib/phoneAuth';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    loginWithGoogle,
    setPendingPhoneProfile,
    showToast,
  } = useApp();

  const reactUniqueId = useId();
  const recaptchaHostId = `vizag-recaptcha-${reactUniqueId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('Siripuram & VIP Road');
  const [otpStep, setOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpExpired, setOtpExpired] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaHostRef = useRef<HTMLDivElement | null>(null);
  const recaptchaManagerRef = useRef<RecaptchaLifecycleManager | null>(null);
  const isSendingRef = useRef(false);
  const isVerifyingRef = useRef(false);
  const isMountedRef = useRef(true);

  if (!recaptchaManagerRef.current) {
    recaptchaManagerRef.current = RecaptchaLifecycleManager.fromFirebaseAuth(auth);
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      recaptchaManagerRef.current?.destroy();
    };
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  // Lifecycle management for invisible reCAPTCHA when modal opens/closes
  useEffect(() => {
    const manager = recaptchaManagerRef.current;
    if (!manager) return;

    if (!isAuthModalOpen) {
      manager.reset();
      isSendingRef.current = false;
      isVerifyingRef.current = false;
      return;
    }

    let cancelled = false;
    const hostEl = recaptchaHostRef.current;
    if (hostEl && !manager.hasActiveVerifier()) {
      void manager
        .ensureVerifier(hostEl, recaptchaHostId, {
          onExpired: () => {
            if (!isMountedRef.current || cancelled) return;
            isSendingRef.current = false;
            setIsSendingOtp(false);
            setErrorMessage(
              'Security verification (reCAPTCHA) expired. Please tap Send OTP again.'
            );
          },
          onError: () => {
            if (!isMountedRef.current || cancelled) return;
            isSendingRef.current = false;
            setIsSendingOtp(false);
            setErrorMessage(
              'reCAPTCHA challenge could not initialize. Please check network/domain settings or use Google Sign-In.'
            );
          },
        })
        .catch(() => {
          // Handled safely on explicit Send OTP submit if pre-render failed
        });
    }

    return () => {
      cancelled = true;
      manager.reset();
    };
  }, [isAuthModalOpen, recaptchaHostId]);

  if (!isAuthModalOpen) return null;

  const resetFormState = () => {
    setOtpStep(false);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpExpired(false);
    setErrorMessage(null);
    setResendSeconds(0);
    confirmationResultRef.current = null;
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
    resetFormState();
    recaptchaManagerRef.current?.reset();
  };

  const obtainVerifier = async () => {
    const manager = recaptchaManagerRef.current!;
    const hostEl = recaptchaHostRef.current;
    if (!hostEl) {
      throw new Error('Verification container is unavailable. Please reopen the sign-in dialog.');
    }

    return manager.ensureVerifier(hostEl, recaptchaHostId, {
      onExpired: () => {
        if (!isMountedRef.current) return;
        isSendingRef.current = false;
        setIsSendingOtp(false);
        setErrorMessage(
          'Security verification (reCAPTCHA) expired. Please tap Send OTP again.'
        );
      },
      onError: () => {
        if (!isMountedRef.current) return;
        isSendingRef.current = false;
        setIsSendingOtp(false);
        setErrorMessage(
          'reCAPTCHA encountered an error. Please retry or continue with Google Sign-In.'
        );
      },
    });
  };

  const sendOtpRequest = async () => {
    // Synchronous single-flight guard prevents duplicate requests from rapid clicks
    if (isSendingRef.current || isVerifyingRef.current) return;

    const cleanDigits = phoneNumber.replace(/\D/g, '');
    const phoneValidationErr = validateIndianMobile(cleanDigits);
    if (phoneValidationErr) {
      setErrorMessage(phoneValidationErr);
      return;
    }
    if (authModalMode === 'register' && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    isSendingRef.current = true;
    setErrorMessage(null);
    setOtpExpired(false);
    setIsSendingOtp(true);

    try {
      setPendingPhoneProfile(
        authModalMode === 'register'
          ? { name: name.trim(), area: selectedLocality }
          : { area: selectedLocality }
      );

      const fullPhone = `+91${cleanDigits}`;
      let verifier = await obtainVerifier();

      let result: ConfirmationResult;
      try {
        result = await signInWithPhoneNumber(
          auth,
          fullPhone,
          verifier as unknown as FirebaseRecaptchaVerifier
        );
      } catch (firstErr) {
        // If existing verifier expired or hit a stale DOM/credential state, reset once and retry cleanly
        if (isRecoverableRecaptchaError(firstErr)) {
          recaptchaManagerRef.current?.reset();
          verifier = await obtainVerifier();
          result = await signInWithPhoneNumber(
            auth,
            fullPhone,
            verifier as unknown as FirebaseRecaptchaVerifier
          );
        } else {
          throw firstErr;
        }
      }

      if (!isMountedRef.current) return;
      confirmationResultRef.current = result;
      setOtpStep(true);
      setOtpDigits(['', '', '', '', '', '']);
      setResendSeconds(30);
      showToast(`SMS OTP sent to +91 ${cleanDigits}`);
    } catch (err) {
      if (!isMountedRef.current) return;
      // Clear verifier after failed OTP dispatch so next attempt starts cleanly
      recaptchaManagerRef.current?.reset();
      if (!(err instanceof Error && err.message === 'RECAPTCHA_LIFECYCLE_ABORTED')) {
        setErrorMessage(mapPhoneAuthError(err));
      }
    } finally {
      isSendingRef.current = false;
      if (isMountedRef.current) {
        setIsSendingOtp(false);
      }
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOtpRequest();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifyingRef.current || isSendingRef.current) return;

    const code = otpDigits.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the SMS OTP.');
      return;
    }
    if (!confirmationResultRef.current) {
      setOtpExpired(true);
      setErrorMessage('OTP session has expired. Please tap "Resend OTP" for a new SMS code.');
      return;
    }

    isVerifyingRef.current = true;
    setErrorMessage(null);
    setIsVerifyingOtp(true);

    try {
      await confirmationResultRef.current.confirm(code);
      if (!isMountedRef.current) return;
      showToast('Mobile number verified! Welcome to VizagConnect.');
      recaptchaManagerRef.current?.reset();
      setIsAuthModalOpen(false);
      resetFormState();
      setPhoneNumber('');
      setName('');
    } catch (err) {
      if (!isMountedRef.current) return;
      const errCode = (err as { code?: string })?.code || '';
      if (errCode === 'auth/code-expired' || errCode === 'auth/session-expired') {
        setOtpExpired(true);
        confirmationResultRef.current = null;
        setOtpDigits(['', '', '', '', '', '']);
        setResendSeconds(0);
      }
      setErrorMessage(mapPhoneAuthError(err));
    } finally {
      isVerifyingRef.current = false;
      if (isMountedRef.current) {
        setIsVerifyingOtp(false);
      }
    }
  };

  const handleOtpChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (clean.length > 1) {
      const sliced = clean.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        next[i] = sliced[i] || otpDigits[i] || '';
      }
      setOtpDigits(next);
      const focusIdx = Math.min(sliced.length, 5);
      document.getElementById(`otp-input-${focusIdx}`)?.focus();
      return;
    }

    const updated = [...otpDigits];
    updated[index] = clean;
    setOtpDigits(updated);

    if (clean && index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading || isSendingRef.current || isVerifyingRef.current) return;
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      if (!isMountedRef.current) return;
      recaptchaManagerRef.current?.reset();
      resetFormState();
    } catch (err) {
      if (!isMountedRef.current) return;
      const code = (err as { code?: string })?.code;
      if (code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err instanceof Error ? err.message : 'Google Sign-In failed.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsGoogleLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={handleCloseModal} />

      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={handleCloseModal}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          aria-label="Close sign in dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Branding header */}
        <div className="text-center space-y-1.5 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-sm border border-slate-200/90 flex items-center justify-center mx-auto overflow-hidden">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_6.03.22_PM_cdf1fa93.jpeg"
              alt="VizagConnect"
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="font-extrabold text-xl text-[#0f2b48]">
            {authModalMode === 'login' ? 'Sign In to VizagConnect' : 'Create Your Account'}
          </h3>
          <p className="text-xs font-semibold text-teal-700">Discover Local. Support Local.</p>
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Secured by Firebase Authentication</span>
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('login');
              resetFormState();
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              authModalMode === 'login'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('register');
              resetFormState();
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              authModalMode === 'register'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {errorMessage && (
          <div className="mb-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Phone OTP Form */}
        {!otpStep ? (
          <form onSubmit={handleSendOtp} className="space-y-3.5 text-xs">
            {authModalMode === 'register' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Varma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-slate-800 focus:outline-hidden focus:border-teal-500"
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile Number (+91) *
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-700 font-bold text-xs">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="98480 12345"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-r-xl py-2.5 px-3 text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            {authModalMode === 'register' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Locality in Visakhapatnam *
                </label>
                <div className="relative">
                  <select
                    value={selectedLocality}
                    onChange={(e) => setSelectedLocality(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-slate-800 focus:outline-hidden focus:border-teal-500"
                  >
                    {VIZAG_AREAS.filter((l: string) => l !== 'All Areas in Vizag').map(
                      (loc: string) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      )
                    )}
                  </select>
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingOtp}
              className="w-full min-h-[44px] bg-gradient-to-r from-blue-700 to-teal-600 hover:from-blue-800 hover:to-teal-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending SMS OTP...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Send 6-Digit OTP via SMS</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* 6-Digit OTP Verification Step */
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs text-center">
            <p className="text-slate-600">
              Enter the 6-digit SMS code sent to <strong>+91 {phoneNumber}</strong>
            </p>

            <div className="flex justify-center gap-1.5 sm:gap-2">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={otpExpired || isVerifyingOtp}
                  value={otpDigits[idx]}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-10 h-12 sm:w-11 text-center text-base sm:text-lg font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-500 focus:bg-white disabled:opacity-50"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] px-1">
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setOtpExpired(false);
                  setErrorMessage(null);
                  confirmationResultRef.current = null;
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold"
              >
                Change Number
              </button>

              <button
                type="button"
                disabled={resendSeconds > 0 || isSendingOtp || isVerifyingOtp}
                onClick={() => void sendOtpRequest()}
                className="text-teal-700 font-bold hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                <span>
                  {isSendingOtp
                    ? 'Sending OTP...'
                    : resendSeconds > 0
                    ? `Resend OTP in ${resendSeconds}s`
                    : 'Resend OTP'}
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp || isSendingOtp || otpExpired}
              className="w-full min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isVerifyingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying OTP...</span>
                </>
              ) : otpExpired ? (
                <span>OTP Expired — Tap Resend OTP</span>
              ) : (
                <span>Verify &amp; Sign In</span>
              )}
            </button>
          </form>
        )}

        {/* Stable, uniquely-IDed invisible reCAPTCHA host managed by RecaptchaLifecycleManager */}
        <div id={recaptchaHostId} ref={recaptchaHostRef} className="sr-only" aria-hidden="true" />

        {/* Real Google Sign-In Divider */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Or continue with Google
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSendingOtp || isVerifyingOtp}
            className="w-full min-h-[44px] bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold py-2.5 px-4 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2.5 text-xs disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
