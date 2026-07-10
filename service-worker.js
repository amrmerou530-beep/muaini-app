'use strict';

const CACHE_NAME = 'muaini-v31-google-auth';
const APP_SHELL = [
  './', './index.html', './config.js', './advanced-features.css', './advanced-features.js', './muaini-layout-v6.css', './muaini-layout-v6.js', './manifest.json',
  './logo-placeholder.png', './logo-placeholder-192.png', './logo-placeholder-512.png',
  './profile-placeholder.png',
  './audio/adhan-cairo-mohamed-ali-albanna.mp3',
  './audio/adhan-fajr-mishary-alafasy.mp3',
  './audio/adhan-georgia.mp3',
  './audio/adhan-turkey-2.mp3',
  './audio/iqama-mishary-rashid.mp3'
];

async function warmCache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null)));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await warmCache();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // صفحات HTML وملفات الإعدادات: الشبكة أولًا ثم الكاش.
  const networkFirst = event.request.mode === 'navigate' || /\/(index\.html|config\.js|service-worker\.js|advanced-features\.css|advanced-features\.js|muaini-layout-v6\.css|muaini-layout-v6\.js)$/.test(url.pathname);
  event.respondWith((async () => {
    if (networkFirst) {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone()).catch(() => {});
        return response;
      } catch (error) {
        return (await caches.match(event.request)) || (await caches.match('./index.html'));
      }
    }

    const cached = await caches.match(event.request);
    if (cached) {
      event.waitUntil(fetch(event.request).then(async response => {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }).catch(() => {}));
      return cached;
    }

    try {
      const response = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      return caches.match('./index.html');
    }
  })());
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (error) { payload = { body: event.data?.text() || 'لديك تنبيه جديد من منصة مُعيني.' }; }

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
  const targetUrl = new URL(event.notification.data?.url || './index.html', self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
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
    const req = indexedDB.open(SYNC_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) db.createObjectStore(SYNC_STORE, { keyPath:'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function putQueuedRequest(request) {
  const db = await openSyncDB();
  return new Promise((resolve,reject)=>{const tx=db.transaction(SYNC_STORE,'readwrite');tx.objectStore(SYNC_STORE).put(request);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
}
async function getQueuedRequests() {
  const db = await openSyncDB();
  return new Promise((resolve,reject)=>{const tx=db.transaction(SYNC_STORE,'readonly');const req=tx.objectStore(SYNC_STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});
}
async function deleteQueuedRequest(id) {
  const db = await openSyncDB();
  return new Promise((resolve,reject)=>{const tx=db.transaction(SYNC_STORE,'readwrite');tx.objectStore(SYNC_STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
}
async function notifyClients(message) {
  const windows = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
  windows.forEach(client => client.postMessage(message));
}
async function flushSyncQueue() {
  const items = await getQueuedRequests();
  let sent = 0;
  for (const item of items) {
    try {
      const response = await fetch(item.url, { method:item.method||'POST', headers:item.headers||{}, body:item.body });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await deleteQueuedRequest(item.id);
      sent++;
    } catch (error) {
      item.lastError = error.message;
      item.attempts = Number(item.attempts||0)+1;
      item.updatedAt = new Date().toISOString();
      await putQueuedRequest(item);
    }
  }
  await notifyClients({ type:'SYNC_QUEUE_DONE', sent, remaining:(await getQueuedRequests()).length });
  return sent;
}
self.addEventListener('sync', event => {
  if (event.tag === 'muaini-sync-queue') event.waitUntil(flushSyncQueue());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(self.registration.showNotification(title || 'منصة مُعيني', options || {}));
  }
  if (event.data?.type === 'MUAINI_REFRESH_CACHE') {
    event.waitUntil((async () => {
      await caches.delete(CACHE_NAME);
      await warmCache();
    })());
  }
  if (event.data?.type === 'QUEUE_REQUEST' && event.data.request) {
    event.waitUntil(putQueuedRequest({ ...event.data.request, attempts:0, createdAt:new Date().toISOString() }));
  }
  if (event.data?.type === 'FLUSH_SYNC_QUEUE') event.waitUntil(flushSyncQueue());
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
