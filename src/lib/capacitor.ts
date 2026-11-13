import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Share } from '@capacitor/share';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function initCapacitorNativeShell(onAndroidBackPress: () => boolean): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f2b48' });
  } catch {
    // Ignore when unsupported on webview variant
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Ignore
  }

  const listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
    const handled = onAndroidBackPress();
    if (!handled && !canGoBack) {
      void CapApp.exitApp();
    }
  });

  return () => {
    void listener.remove();
  };
}

export async function shareContentCrossPlatform(options: {
  title: string;
  text: string;
  url: string;
}): Promise<'shared' | 'copied'> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.title,
      });
      return 'shared';
    } catch {
      // Fallback below
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return 'shared';
    } catch {
      // Cancelled or unsupported; fallback to clipboard
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(`${options.title}\n${options.text}\n${options.url}`);
  }
  return 'copied';
}

export async function getCurrentCoordinatesCrossPlatform(): Promise<{ lat: number; lng: number }> {
  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      throw new Error('Location permission denied on device.');
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
  }

  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Location permission denied or unavailable.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export async function captureNativePhotoFile(): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,
  });

  if (!photo.base64String) return null;
  const format = photo.format || 'jpeg';
  const byteChars = atob(photo.base64String);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([new Uint8Array(byteNums)], { type: `image/${format}` });
  return new File([blob], `vizagconnect_${Date.now()}.${format}`, { type: `image/${format}` });
}
