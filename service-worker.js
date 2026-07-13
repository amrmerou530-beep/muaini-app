'use strict';

/*
 * مُعيني — Service Worker
 * الإصدار 32: تحديث إجباري لملفات الدخول مع الحفاظ على العمل دون إنترنت.
 */
const CACHE_NAME = 'muaini-v32-auth-persist';
const CACHE_PREFIX = 'muaini-';

const APP_SHELL = [
  './',
  './index.html',
  './config.js',
  './advanced-features.css',
  './advanced-features.js',
  './muaini-layout-v6.css',
  './muaini-layout-v6.js',
  './manifest.json',
  './logo-placeholder.png',
  './logo-placeholder-192.png',
  './logo-placeholder-512.png',
  './profile-placeholder.png',
  './audio/adhan-cairo-mohamed-ali-albanna.mp3',
  './audio/adhan-fajr-mishary-alafasy.mp3',
  './audio/adhan-georgia.mp3',
  './audio/adhan-turkey-2.mp3',
  './audio/iqama-mishary-rashid.mp3'
];

const NETWORK_FIRST_FILES = /\/(index\.html|config\.js|service-worker\.js|advanced-features\.css|advanced-features\.js|muaini-layout-v6\.css|muaini-layout-v6\.js)$/;

async function fetchFresh(requestOrUrl) {
  const request = requestOrUrl instanceof Request
    ? new Request(requestOrUrl, { cache: 'no-store' })
    : new Request(requestOrUrl, { cache: 'reload' });
  return fetch(request);
}

async function warmCache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(APP_SHELL.map(async url => {
    try {
      const response = await fetchFresh(url);
      if (response.ok) await cache.put(url, response.clone());
    } catch (_) {
      // لا نوقف تثبيت التطبيق إذا تعذر ملف اختياري مثل ملف صوت.
    }
  }));
}

async function clearOldMuainiCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  );
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await warmCache();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await clearOldMuainiCaches();
    await self.clients.claim();
    await notifyClients({ type: 'MUAINI_SW_ACTIVATED', cacheName: CACHE_NAME });
  })());
});

async function navigationResponse(request) {
  try {
    const response = await fetchFresh(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('./index.html', response.clone()).catch(() => {});
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_) {
    return (await caches.match(request))
      || (await caches.match('./index.html'))
      || new Response('التطبيق غير متاح دون إنترنت حاليًا.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
  }
}

async function networkFirstResponse(request) {
  try {
    const response = await fetchFresh(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_) {
    return (await caches.match(request))
      || new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function cacheFirstWithRefresh(event) {
  const cached = await caches.match(event.request);
  if (cached) {
    event.waitUntil((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
      } catch (_) {}
    })());
    return cached;
  }

  try {
    const response = await fetch(event.request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(event.request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(navigationResponse(event.request));
    return;
  }

  if (NETWORK_FIRST_FILES.test(url.pathname)) {
    event.respondWith(networkFirstResponse(event.request));
    return;
  }

  event.respondWith(cacheFirstWithRefresh(event));
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data?.text() || 'لديك تنبيه جديد من منصة مُعيني.' };
  }

  const title = payload.title || 'منصة مُعيني';
  const options = {
    body: payload.body || 'تذكير جديد بالعبادة.',
    icon: payload.icon || './logo-placeholder-192.png',
    badge: payload.badge || './logo-placeholder-192.png',
    tag: payload.tag || `muaini-${Date.now()}`,
    renotify: true,
    data: { url: payload.url || './index.html#page-prayers' },
    actions: [
      { action: 'open', title: 'فتح المنصة' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = new URL(
    event.notification.data?.url || './index.html',
    self.location.origin
  ).href;

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of clients) {
      if ('focus' in client) {
        await client.navigate(targetUrl).catch(() => {});
        return client.focus();
      }
    }

    return self.clients.openWindow(targetUrl);
  })());
});

/* ===== طابور المزامنة المؤجلة ===== */
const SYNC_DB = 'muaini-sync-db';
const SYNC_STORE = 'requests';

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putQueuedRequest(request) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE, 'readwrite');
    transaction.objectStore(SYNC_STORE).put(request);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getQueuedRequests() {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE, 'readonly');
    const request = transaction.objectStore(SYNC_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteQueuedRequest(id) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE, 'readwrite');
    transaction.objectStore(SYNC_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function notifyClients(message) {
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  windows.forEach(client => client.postMessage(message));
}

async function flushSyncQueue() {
  const items = await getQueuedRequests();
  let sent = 0;

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method || 'POST',
        headers: item.headers || {},
        body: item.body
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await deleteQueuedRequest(item.id);
      sent += 1;
    } catch (error) {
      item.lastError = error.message;
      item.attempts = Number(item.attempts || 0) + 1;
      item.updatedAt = new Date().toISOString();
      await putQueuedRequest(item);
    }
  }

  const remaining = (await getQueuedRequests()).length;
  await notifyClients({ type: 'SYNC_QUEUE_DONE', sent, remaining });
  return sent;
}

self.addEventListener('sync', event => {
  if (event.tag === 'muaini-sync-queue') {
    event.waitUntil(flushSyncQueue());
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || 'منصة مُعيني', options || {})
    );
  }

  if (event.data?.type === 'MUAINI_REFRESH_CACHE') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX)).map(key => caches.delete(key))
      );
      await warmCache();
      await notifyClients({ type: 'MUAINI_CACHE_REFRESHED', cacheName: CACHE_NAME });
    })());
  }

  if (event.data?.type === 'QUEUE_REQUEST' && event.data.request) {
    event.waitUntil(putQueuedRequest({
      ...event.data.request,
      attempts: 0,
      createdAt: new Date().toISOString()
    }));
  }

  if (event.data?.type === 'FLUSH_SYNC_QUEUE') {
    event.waitUntil(flushSyncQueue());
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
