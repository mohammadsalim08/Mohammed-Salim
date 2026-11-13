import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const VAPID_KEY = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined) || '';

export interface PushSetupResult {
  status: 'enabled' | 'permission_denied' | 'missing_vapid' | 'unsupported';
  token?: string;
  message: string;
}

/**
 * Capability-checked Firebase Cloud Messaging (Web) & Capacitor Push (Android) registration.
 */
export async function requestPushToken(): Promise<PushSetupResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive !== 'granted') {
        return {
          status: 'permission_denied',
          message: 'Android push notification permission was denied in system settings.',
        };
      }

      return await new Promise<PushSetupResult>((resolve) => {
        let resolved = false;
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({
              status: 'missing_vapid',
              message:
                'Android notification permission granted. Ensure google-services.json is placed in android/app/ for live FCM device tokens.',
            });
          }
        }, 4000);

        void PushNotifications.addListener('registration', (token) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              status: 'enabled',
              token: token.value,
              message: 'Android FCM push notifications enabled.',
            });
          }
        });

        void PushNotifications.addListener('registrationError', (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              status: 'missing_vapid',
              message: `Native FCM registration requires google-services.json in android/app/: ${err.error}`,
            });
          }
        });

        void PushNotifications.register();
      });
    } catch (err) {
      return {
        status: 'unsupported',
        message: err instanceof Error ? err.message : 'Unable to initialize native push notifications.',
      };
    }
  }

  // Web FCM flow
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      status: 'unsupported',
      message: 'Browser notifications are not supported in this browser.',
    };
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return {
      status: 'unsupported',
      message: 'Firebase Cloud Messaging is not supported in this browser context.',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      status: 'permission_denied',
      message: 'Notification permission was declined in your browser.',
    };
  }

  if (!VAPID_KEY) {
    return {
      status: 'missing_vapid',
      message:
        'Browser notification permission granted, but VITE_FIREBASE_VAPID_KEY is not configured yet for Web Push delivery.',
    };
  }

  try {
    const registration =
      'serviceWorker' in navigator
        ? await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        : undefined;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) {
      return {
        status: 'missing_vapid',
        message: 'Unable to retrieve FCM registration token.',
      };
    }
    return {
      status: 'enabled',
      token,
      message: 'Push notifications active via Firebase Cloud Messaging.',
    };
  } catch (err) {
    return {
      status: 'unsupported',
      message: err instanceof Error ? err.message : 'Failed to register FCM token.',
    };
  }
}

export async function subscribeForegroundPush(
  onNotify: (title: string, body: string) => void
): Promise<() => void> {
  if (Capacitor.isNativePlatform()) {
    const handle = await PushNotifications.addListener('pushNotificationReceived', (notif) => {
      onNotify(notif.title || 'VizagConnect', notif.body || '');
    });
    return () => {
      void handle.remove();
    };
  }

  const supported = await isSupported().catch(() => false);
  if (!supported || !VAPID_KEY) {
    return () => {};
  }

  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'VizagConnect Update';
    const body = payload.notification?.body || '';
    onNotify(title, body);
  });
}
