// StudyFlow Service Worker v1.0
const CACHE_NAME = 'studyflow-v1';
const STATIC_CACHE = 'studyflow-static-v1';
const DYNAMIC_CACHE = 'studyflow-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/frontend/css/main.css',
    '/frontend/js/app.js',
    '/frontend/js/modules/database.js',
    '/frontend/js/modules/settings.js',
    '/frontend/js/modules/ai.js',
    '/frontend/js/modules/transcription.js',
    '/frontend/js/modules/document-processor.js',
    '/manifest.json'
];

// External CDN assets (cache with network-first strategy)
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js',
    'https://cdn.jsdelivr.net/npm/idb@8.0.0/build/umd.js',
    'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js',
    'https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Cache CDN assets
                return caches.open(DYNAMIC_CACHE);
            })
            .then(cache => {
                console.log('[SW] Caching CDN assets');
                return Promise.all(
                    CDN_ASSETS.map(url => 
                        fetch(url)
                            .then(response => {
                                if (response.ok) {
                                    return cache.put(url, response);
                                }
                            })
                            .catch(err => console.warn('[SW] Failed to cache:', url, err))
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys
                        .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map(key => {
                            console.log('[SW] Removing old cache:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API calls to backend
    if (url.pathname.startsWith('/api') || url.port === '3001') return;

    // For navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Stale-while-revalidate for static assets
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                const fetchPromise = fetch(request)
                    .then(networkResponse => {
                        // Update cache with fresh response
                        if (networkResponse.ok) {
                            const responseClone = networkResponse.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => cache.put(request, responseClone));
                        }
                        return networkResponse;
                    })
                    .catch(() => cachedResponse);

                return cachedResponse || fetchPromise;
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    if (event.tag === 'sync-flashcards') {
        event.waitUntil(syncFlashcards());
    }
});

async function syncFlashcards() {
    // Sync logic for when user goes back online
    console.log('[SW] Syncing flashcards...');
}

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Czas na powtórkę fiszek!',
        icon: '/frontend/assets/icons/icon-192.png',
        badge: '/frontend/assets/icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            url: '/index.html?action=study'
        },
        actions: [
            { action: 'study', title: '🎯 Ucz się' },
            { action: 'close', title: 'Zamknij' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('StudyFlow', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'study' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});
