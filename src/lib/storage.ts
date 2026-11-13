import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const storage = getStorage(app);

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadResult {
  url: string;
  storagePath: string;
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, or WEBP photographs are supported.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image exceeds the 5 MB size limit. Please choose a compressed photo.';
  }
  return null;
}

/**
 * Uploads a verified business or product photo to Firebase Cloud Storage
 * under /businesses/{ownerUid}/{folder}/{timestamp}_{filename}.
 */
export async function uploadBusinessImage(
  file: File,
  ownerUid: string,
  folder: 'listings' | 'products' = 'listings',
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const safeExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  const cleanName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const storagePath = `businesses/${ownerUid}/${folder}/${cleanName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        const msg =
          error.code === 'storage/unauthorized'
            ? 'Firebase Storage rules denied this upload. Enable Firebase Storage & allow authenticated writes under /businesses/{uid}/** in Firebase Console, or paste a verified HTTPS image URL.'
            : error.code === 'storage/bucket-not-found' || error.code === 'storage/unknown'
            ? 'Firebase Storage bucket is not initialized in Firebase Console yet. Enable Storage in Firebase Console or paste a valid HTTPS image URL.'
            : error.message || 'Image upload failed.';
        reject(new Error(msg));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadUrl, storagePath });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}
