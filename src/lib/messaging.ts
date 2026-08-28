import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { firebaseConfigured } from '@/lib/firebase';

/**
 * Web push (FCM). Optional layer over the in-app notification centre: it lets a
 * journey alert reach the phone lock screen. Everything degrades gracefully —
 * if the browser has no push support, or the VAPID key / project is not set, the
 * app simply relies on the in-app centre (master prompt §9).
 */

export async function pushSupported(): Promise<boolean> {
  if (!firebaseConfigured) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Ask for notification permission and register the token. Returns the FCM token
 * on success, or null if the user declined or push is unavailable. A real
 * deployment stores the token against the user so a Cloud Function can target it.
 */
export async function enablePush(): Promise<string | null> {
  if (!(await pushSupported())) return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Foreground push handler. When the tab is focused, FCM does not show a system
 * notification, so the caller surfaces it in the in-app centre instead.
 */
export async function onForegroundPush(
  cb: (n: { title: string; body: string; data?: Record<string, string> }) => void,
): Promise<() => void> {
  if (!(await pushSupported())) return () => undefined;
  try {
    const messaging = getMessaging(getApp());
    return onMessage(messaging, (payload) => {
      cb({
        title: payload.notification?.title || 'IRCTC RI',
        body: payload.notification?.body || '',
        data: payload.data,
      });
    });
  } catch {
    return () => undefined;
  }
}
