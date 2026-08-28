/* global importScripts, firebase */
/**
 * Firebase Cloud Messaging service worker.
 *
 * Receives background push while the app is closed and shows the notification.
 * The config below is Firebase PUBLIC config (safe in the browser); it is filled
 * in at deploy time from the same VITE_FIREBASE_* values. If left blank, the
 * worker no-ops gracefully — the in-app notification centre still works.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Replace these with your project's public config for background push, or inject
// at build time. Leaving them blank simply disables background notifications.
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  messagingSenderId: '',
  appId: '',
};

if (firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    self.registration.showNotification(title || 'IRCTC RI', {
      body: body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      // Priority-based: never buzz for marketing during an active journey.
      tag: payload.data?.type || 'irctc-ri',
      data: payload.data || {},
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.journey_id ? `/trips?journey=${event.notification.data.journey_id}` : '/';
  event.waitUntil(clients.openWindow(url));
});
