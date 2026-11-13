/* VizagConnect Service Worker placeholder for Firebase Cloud Messaging background notifications */
self.addEventListener('push', function (event) {
  let payload = { title: 'VizagConnect', body: 'New Visakhapatnam update' };
  try {
    if (event.data) {
      const json = event.data.json();
      payload = {
        title: json.notification?.title || json.title || 'VizagConnect',
        body: json.notification?.body || json.body || '',
      };
    }
  } catch {
    // Fallback text payload
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_6.03.22_PM_cdf1fa93.jpeg',
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
