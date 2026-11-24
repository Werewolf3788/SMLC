/* ==========================================================================
   File: sw.js  |  SMLC app service worker  |  v1  (bump SMLC_SW_VERSION to refresh everyone's saved copy)
   Lets SMLC be installed as an app and keep working with no internet.

   - Pages: always try the internet first (so they're up to date); with no
     connection, the last saved copy opens instead.
   - Site files (scripts, styles, icons, the directory data): internet first too,
     saved copy when offline, so updates show up right away.
   - Outside images and scripts (logos, photos, Firebase's scripts): shown from
     the saved copy right away and quietly refreshed whenever there is a connection.
   - Firestore directory data: internet first, saved copy when offline.
   - Never saved: ads, analytics, Google Translate, Apps Script, anything that
     isn't a plain GET request.
   Any connection counts: Wi-Fi, cell data, a hotspot or Bluetooth tethering.
   ========================================================================== */
var SMLC_SW_VERSION = 'smlc-v2';
var PAGES = 'smlc-pages-' + SMLC_SW_VERSION;
var FILES = 'smlc-files-' + SMLC_SW_VERSION;
var EXT = 'smlc-ext-' + SMLC_SW_VERSION;
var EXT_MAX = 250;

// Saved on install so the app opens offline even before these pages were visited
var CORE = [
    './', 'index.html', 'flora.html', 'louisville.html', 'clay-city.html', 'sailor-springs.html', 'xenia.html',
    'directory.html', 'gallery.html', 'update-gas.html', 'share-photos.html', 'install.html',
    'universaltown.js', 'smlc-device-prefs.js', 'smlc-app.js', 'smlc-stations.js', 'smlc-community.js',
    'smlc-bookmarks.js', 'smlc-photos-config.js', 'smlc-offers.js', 'smlc-directory-render.js',
    'home.css', 'index.css', 'flora.css', 'louisville.css', 'clay-city.css', 'sailor-springs.css', 'xenia.css',
    'data/directory.json', 'manifest.webmanifest',
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

// Inside WordPress the SMLC Connect plugin sets these before this file: the WordPress page
// addresses to save, and the GitHub address the scripts/styles come from.
if (self.SMLC_CORE && self.SMLC_CORE.length) CORE = self.SMLC_CORE;
var EXTRA_HOSTS = self.SMLC_ASSET_HOST ? new RegExp(self.SMLC_ASSET_HOST.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

var SKIP = /googletagmanager|google-analytics|googlesyndication|doubleclick|adservice|pagead|translate\.google|translate\.googleapis|gstatic\.com\/_\/translate|script\.google\.com|script\.googleusercontent|identitytoolkit|securetoken|firebaseio\.com|\/Listen\/channel|\/Write\/channel/i;
var EXT_OK = /raw\.githubusercontent\.com|githubusercontent\.com|github\.com\/.*\/raw|drive\.google\.com\/thumbnail|lh3\.googleusercontent\.com|www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|skventuresigns\.com|scorestream\.com\/.*\.(png|jpg|svg)/i;

self.addEventListener('install', function (event) {
    event.waitUntil(caches.open(PAGES).then(function (cache) {
        // one missing file must not stop the app from installing
        return Promise.all(CORE.map(function (u) { return cache.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
    event.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return /^smlc-/.test(k) && k.indexOf(SMLC_SW_VERSION) < 0; })
            .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }));
});

function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); }); }

// Internet first (with a time limit), saved copy when offline
function networkFirst(req, cacheName, ms) {
    return Promise.race([fetch(req), timeout(ms)]).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(cacheName).then(function (c) { c.put(req, copy); });
        }
        return res;
    }).catch(function () {
        return caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (hit) {
            if (hit) return hit;
            if (req.mode === 'navigate') return caches.match('index.html');   // never a blank screen
            return Response.error();
        });
    });
}

// Saved copy right away, refreshed in the background
function staleWhileRevalidate(req, cacheName, trim) {
    return caches.open(cacheName).then(function (cache) {
        return cache.match(req).then(function (hit) {
            var net = fetch(req).then(function (res) {
                if (res && (res.ok || res.type === 'opaque')) {
                    cache.put(req, res.clone());
                    if (trim) cache.keys().then(function (keys) { if (keys.length > EXT_MAX) cache.delete(keys[0]); });
                }
                return res;
            }).catch(function () { return hit || Response.error(); });
            return hit || net;
        });
    });
}

self.addEventListener('fetch', function (event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = req.url;
    if (SKIP.test(url)) return;                                         // ads, analytics, translate, live database: leave alone
    var sameOrigin = url.indexOf(self.location.origin) === 0;

    if (req.mode === 'navigate') { event.respondWith(networkFirst(req, PAGES, 6000)); return; }
    if (/firestore\.googleapis\.com\/v1\/projects\/[^\/]+\/databases\/[^\/]+\/documents\/directory\//.test(url)) {
        event.respondWith(networkFirst(req, FILES, 6000)); return;
    }
    if (sameOrigin) {                                                   // our own files: always the newest when connected
        event.respondWith(networkFirst(req, /\.(html?)(\?|$)/.test(url) ? PAGES : FILES, 5000)); return;
    }
    if (EXTRA_HOSTS && EXTRA_HOSTS.test(url)) { event.respondWith(networkFirst(req, FILES, 5000)); return; }   // SMLC files on GitHub (WordPress)
    if (EXT_OK.test(url)) { event.respondWith(staleWhileRevalidate(req, EXT, true)); return; }
});
