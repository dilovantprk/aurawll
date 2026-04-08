importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyDyKkPP2VD0iipS2Q7LU525KuhhLdaVoV4",
  authDomain: "aura-65c3a.firebaseapp.com",
  projectId: "aura-65c3a",
  storageBucket: "aura-65c3a.firebasestorage.app",
  messagingSenderId: "333658445431",
  appId: "1:333658445431:web:ea25c21a0dcb74a7d29872",
  measurementId: "G-DGS6X2DXMG"
};

// Initialize Firebase in SW
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received notification in background:', payload);

  const title = payload.notification.title || "Aura.";
  const options = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: '/' }
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        client.focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});
