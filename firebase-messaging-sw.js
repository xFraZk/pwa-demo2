// -----------------------------------------------------------------
// PARTE 1: LÓGICA DE FIREBASE MESSAGING
// -----------------------------------------------------------------

// Importar scripts de Firebase (¡OJO! usamos 'compat' que es más fácil en SW)
importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-messaging-compat.js');

// Configuración de Firebase (LA MISMA que en tu index.html)
const firebaseConfig = {
  apiKey: "AIzaSyAsXGq7D0jlXKUywesedniS0L0dV_8nWkY",
  authDomain: "hoho3d-pwa.firebaseapp.com",
  projectId: "hoho3d-pwa",
  storageBucket: "hoho3d-pwa.firebasestorage.app",
  messagingSenderId: "950865642151",
  appId: "1:9508651d706e5f5182"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener Messaging
const messaging = firebase.messaging();

// Manejador de mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensaje en segundo plano recibido:', payload);
  
  const notificationTitle = payload.notification.title || 'Hoho3D';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192.png' // Asegúrate que esta ruta exista
  };

  // self.registration.showNotification es la función que muestra la push
  return self.registration.showNotification(notificationTitle, notificationOptions);
});


// -----------------------------------------------------------------
// PARTE 2: LÓGICA DE CACHÉ DE LA PWA
// -----------------------------------------------------------------

// ¡Importante! Cambia este nombre (ej: 'v2', 'v3') CADA VEZ que subas cambios
// Esto forzará al Service Worker a actualizarse y borrar el caché viejo.
const CACHE_NAME = 'hoho3d-pwa-cache-v1'; 

// Archivos base para que tu app cargue offline
const FILES_TO_CACHE = [
  '/', // La página principal
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
  // Si tenés un style.css o un app.js, agrégalos aquí
];

// Evento 'install': Se dispara cuando el SW se instala
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker y cacheando archivos base...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Forza al nuevo SW a activarse
  );
});

// Evento 'activate': Se dispara cuando el SW se activa (después de 'install')
// Aquí limpiamos los cachés viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Si el nombre del caché no es el actual, lo borramos
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Borrando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma control de todas las pestañas
  );
});

// Evento 'fetch': Se dispara CADA VEZ que la página pide un recurso (CSS, JS, img, etc.)
self.addEventListener('fetch', (event) => {
  // Estrategia: "Network First" (Primero intenta buscar en internet)
  // Esto soluciona tu problema de no ver los cambios.
  
  if (event.request.method !== 'GET') {
    return; // No cachear peticiones que no sean GET
  }

  event.respondWith(
    // 1. Intenta ir a la red
    fetch(event.request)
      .then((networkResponse) => {
        // Si la red responde, guardamos esa respuesta nueva en el caché
        // y la devolvemos
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return networkResponse;
      })
      .catch(() => {
        // 2. Si la red falla (offline), busca en el caché
        return caches.match(event.request)
          .then((cachedResponse) => {
            // Devuelve el archivo del caché o, si no está, la pág principal
            return cachedResponse || caches.match('/index.html'); 
          });
      })
  );
});