// 離線快取：網絡優先（Claude 改完 code 上載後，手機有網就會攞到新版）
const CACHE_VERSION = 'fc-v9';
const FILES = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/app.js', 'js/library.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'].concat(
  // 動作示範相：預先下載，喺 gym 冇網都睇到
  ['img/ex/backExt-0.jpg','img/ex/backExt-1.jpg','img/ex/birdDog-0.jpg','img/ex/birdDog-1.jpg','img/ex/chestStretch-0.jpg','img/ex/chestStretch-1.jpg','img/ex/neckStretch-0.jpg','img/ex/neckStretch-1.jpg','img/ex/bike-0.jpg','img/ex/bike-1.jpg','img/ex/bwSquat-0.jpg','img/ex/bwSquat-1.jpg','img/ex/cableCurl-0.jpg','img/ex/cableCurl-1.jpg','img/ex/catCow-0.jpg','img/ex/catCow-1.jpg','img/ex/chestFly-0.jpg','img/ex/chestFly-1.jpg','img/ex/chestPress-0.jpg','img/ex/chestPress-1.jpg','img/ex/childPose-0.jpg','img/ex/childPose-1.jpg','img/ex/crunch-0.jpg','img/ex/crunch-1.jpg','img/ex/dbBench-0.jpg','img/ex/dbBench-1.jpg','img/ex/dbCurl-0.jpg','img/ex/dbCurl-1.jpg','img/ex/dbRow-0.jpg','img/ex/dbRow-1.jpg','img/ex/dbShoulderPress-0.jpg','img/ex/dbShoulderPress-1.jpg','img/ex/deadBug-0.jpg','img/ex/deadBug-1.jpg','img/ex/facePull-0.jpg','img/ex/facePull-1.jpg','img/ex/gluteBridge-0.jpg','img/ex/gluteBridge-1.jpg','img/ex/gobletSquat-0.jpg','img/ex/gobletSquat-1.jpg','img/ex/hamstringStretch-0.jpg','img/ex/hamstringStretch-1.jpg','img/ex/hipFlexor-0.jpg','img/ex/hipFlexor-1.jpg','img/ex/hipThrust-0.jpg','img/ex/hipThrust-1.jpg','img/ex/latPulldown-0.jpg','img/ex/latPulldown-1.jpg','img/ex/latRaise-0.jpg','img/ex/latRaise-1.jpg','img/ex/legCurl-0.jpg','img/ex/legCurl-1.jpg','img/ex/legExt-0.jpg','img/ex/legExt-1.jpg','img/ex/legPress-0.jpg','img/ex/legPress-1.jpg','img/ex/ohTriceps-0.jpg','img/ex/ohTriceps-1.jpg','img/ex/plank-0.jpg','img/ex/plank-1.jpg','img/ex/pushdown-0.jpg','img/ex/pushdown-1.jpg','img/ex/pushup-0.jpg','img/ex/pushup-1.jpg','img/ex/reverseFly-0.jpg','img/ex/reverseFly-1.jpg','img/ex/row-0.jpg','img/ex/row-1.jpg','img/ex/shoulderPress-0.jpg','img/ex/shoulderPress-1.jpg','img/ex/splitSquat-0.jpg','img/ex/splitSquat-1.jpg','img/ex/treadmill-0.jpg','img/ex/treadmill-1.jpg']);
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE_VERSION).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
