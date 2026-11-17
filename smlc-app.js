/* ==========================================================================
   File: smlc-app.js  |  v1.0  |  2026-11-15
   Load in the <head> of every SMLC page, right after smlc-device-prefs.js.

   1. MAPS BY DEVICE: any Google Maps link on the site opens Apple Maps on
      iPhone / iPad / Mac, and Google Maps everywhere else. Works for links
      added later too (directory cards, events, gas stations...).
   2. APP: registers sw.js so SMLC can be installed like an app and keeps
      working with no internet (Wi-Fi, cell data, hotspot or Bluetooth
      tethering all count as "connected").
   3. OFFLINE DATA: window.smlcEnableOffline() makes Firebase remember the last
      data it showed (on this device). With no connection, pages show that
      saved copy; as soon as any connection is back, live data replaces it.
   4. A slim "You're offline" bar, and a gentle "Install the app" prompt
      (Android/computer: one tap; iPhone: shows the Share -> Add to Home
      Screen steps). It appears from the 2nd visit on, and "Not now" hides it
      for 30 days. install.html has the full instructions.
   ========================================================================== */
(function () {
    'use strict';
    if (window.smlcAppLoaded) return;
    window.smlcAppLoaded = true;

    var script = document.currentScript;
    var BASE = script && script.src ? script.src.replace(/[^\/]*$/, '') : '';
    // Inside WordPress (SMLC Connect plugin): the app files come from the WordPress site itself
    var WP = window.SMLC_WP || null;
    var SW_URL = WP && WP.sw ? WP.sw : BASE + 'sw.js';
    var MANIFEST_URL = WP && WP.manifest ? WP.manifest : BASE + 'manifest.webmanifest';
    var INSTALL_URL = WP && WP.pages && WP.pages['install.html'] ? WP.pages['install.html'] : BASE + 'install.html';
    var UA = navigator.userAgent || '';
    var IS_APPLE = /iPhone|iPad|iPod|Macintosh/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var IS_ANDROID = /Android/i.test(UA);
    function ls() { try { return window.localStorage; } catch (e) { return null; } }
    window.smlcDevice = { apple: IS_APPLE, ios: IS_IOS, android: IS_ANDROID };

    // ---------------------------------------------------------------- 1. MAPS
    // "Where to" from a Google Maps link (?q= / ?query= / ?destination= / ?daddr= / /maps/place/...)
    function mapsQuery(href) {
        try {
            var u = new URL(href, location.href);
            if (!/(^|\.)google\.[a-z.]+$/i.test(u.hostname) && !/^maps\.google\./i.test(u.hostname)) return null;
            if (!/\/maps|^maps\./i.test(u.pathname + ' ' + u.hostname)) return null;
            var p = u.searchParams;
            var dest = p.get('destination') || p.get('daddr');
            if (dest) return { q: dest, directions: true };
            var q = p.get('query') || p.get('q');
            if (q) return { q: q };
            var m = u.pathname.match(/\/maps\/(?:place|search)\/([^\/@]+)/);
            if (m) return { q: decodeURIComponent(m[1].replace(/\+/g, ' ')) };
        } catch (e) {}
        return null;
    }
    // Apple Maps link for a place or for directions
    window.smlcAppleMapsUrl = function (q, directions) {
        return 'https://maps.apple.com/?' + (directions ? 'daddr=' : 'q=') + encodeURIComponent(q);
    };
    // Best maps link for this device, from an address (used by new code; old links are fixed on click)
    window.smlcMapsLink = function (address, directions) {
        if (!address) return '';
        if (IS_APPLE) return window.smlcAppleMapsUrl(address, directions);
        return directions ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address)
                          : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
    };
    if (IS_APPLE) {
        document.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            var href = a.getAttribute('href') || '';
            var addr = a.getAttribute('data-address');            // set on links whose href is a Maps share link
            var info = addr ? { q: addr } : mapsQuery(href);
            if (!info) return;
            e.preventDefault();
            window.open(window.smlcAppleMapsUrl(info.q, info.directions), '_blank', 'noopener');
        }, true);
    }

    // ---------------------------------------------------------------- 2. APP (service worker)
    if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.href)) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register(SW_URL).catch(function () {});
        });
    }
    function addHeadLink(rel, href, extra) {
        if (document.querySelector('link[rel="' + rel + '"]')) return;
        var l = document.createElement('link'); l.rel = rel; l.href = href;
        if (extra) Object.keys(extra).forEach(function (k) { l.setAttribute(k, extra[k]); });
        document.head.appendChild(l);
    }
    if (document.head) {
        addHeadLink('manifest', MANIFEST_URL);
        addHeadLink('apple-touch-icon', BASE + 'icons/apple-touch-icon.png');
        if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
            [['apple-mobile-web-app-capable', 'yes'], ['mobile-web-app-capable', 'yes'],
             ['apple-mobile-web-app-title', 'SMLC'], ['apple-mobile-web-app-status-bar-style', 'black-translucent']].forEach(function (m) {
                var t = document.createElement('meta'); t.name = m[0]; t.content = m[1]; document.head.appendChild(t);
            });
        }
    }

    // ---------------------------------------------------------------- 3. OFFLINE DATA
    // Tiny key/value store in IndexedDB (room for much more than localStorage)
    var idbP = null;
    function idb() {
        if (idbP) return idbP;
        idbP = new Promise(function (res, rej) {
            try {
                var r = indexedDB.open('smlc-offline', 1);
                r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
                r.onsuccess = function () { res(r.result); };
                r.onerror = function () { rej(r.error); };
            } catch (e) { rej(e); }
        });
        return idbP;
    }
    function idbSet(k, v) {
        return idb().then(function (db) {
            return new Promise(function (res) {
                var tx = db.transaction('kv', 'readwrite');
                tx.objectStore('kv').put({ v: v, t: Date.now() }, k);
                tx.oncomplete = res; tx.onerror = res;
            });
        }).catch(function () {});
    }
    function idbGet(k) {
        return idb().then(function (db) {
            return new Promise(function (res) {
                var r = db.transaction('kv').objectStore('kv').get(k);
                r.onsuccess = function () { res(r.result); };
                r.onerror = function () { res(undefined); };
            });
        }).catch(function () { return undefined; });
    }
    window.smlcSaved = { get: idbGet, set: idbSet };

    var savedShownAt = 0;   // newest "saved at" time shown while offline (for the offline bar)
    window.smlcEnableOffline = function () {
        var fb = window.firebase;
        if (!fb) return;
        // Realtime Database: remember every "value" the page receives; replay it when offline
        var Ref = fb.database && fb.database.Reference;
        if (Ref && !Ref.prototype.__smlcOffline) {
            Ref.prototype.__smlcOffline = true;
            var on = Ref.prototype.on, off = Ref.prototype.off;
            Ref.prototype.on = function (event, cb) {
                if (event !== 'value' || typeof cb !== 'function') return on.apply(this, arguments);
                var ref = this, got = false;
                var key = 'rtdb:' + String(ref.toString()).replace(/^https?:\/\/[^\/]+/, '');
                var wrapped = function (snap) {
                    got = true;
                    try { idbSet(key, snap.val()); } catch (e) {}
                    return cb.apply(this, arguments);
                };
                cb.__smlcWrapped = wrapped;
                var useSaved = function () {
                    if (got) return;
                    idbGet(key).then(function (rec) {
                        if (got || !rec) return;
                        if (rec.t > savedShownAt) savedShownAt = rec.t;
                        updateOfflineBar();
                        var v = rec.v;
                        cb({ val: function () { return v; }, exists: function () { return v !== null && v !== undefined; }, key: ref.key, ref: ref });
                    });
                };
                if (!navigator.onLine) useSaved(); else setTimeout(useSaved, 4000);   // slow / no data connection: saved copy
                var args = Array.prototype.slice.call(arguments);
                args[1] = wrapped;
                return on.apply(this, args);
            };
            Ref.prototype.off = function (event, cb) {
                if (typeof cb === 'function' && cb.__smlcWrapped) {
                    var args = Array.prototype.slice.call(arguments); args[1] = cb.__smlcWrapped;
                    return off.apply(this, args);
                }
                return off.apply(this, arguments);
            };
        }
        // Firestore (news, events): its own offline copy on this device
        try {
            if (fb.firestore && !window.__smlcFsPersist) {
                window.__smlcFsPersist = true;
                fb.firestore().enablePersistence({ synchronizeTabs: true }).catch(function () {});
            }
        } catch (e) {}
    };

    // ---------------------------------------------------------------- 4a. OFFLINE BAR
    function updateOfflineBar() {
        if (!document.body) return;
        var bar = document.getElementById('smlc-offline-bar');
        if (navigator.onLine) { if (bar) bar.remove(); return; }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'smlc-offline-bar';
            bar.setAttribute('role', 'status');
            bar.style.cssText = 'position:sticky;top:0;z-index:100001;background:#3a3f48;color:#fff;font:600 13px/1.4 system-ui,sans-serif;text-align:center;padding:6px 12px';
            document.body.insertBefore(bar, document.body.firstChild);
        }
        var when = savedShownAt ? new Date(savedShownAt).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
        bar.textContent = '\u26a0\ufe0f You\u2019re offline \u2014 showing saved info' + (when ? ' from ' + when + ' Central' : '') + '. It updates as soon as you\u2019re connected.';
    }
    window.addEventListener('offline', updateOfflineBar);
    window.addEventListener('online', function () {
        updateOfflineBar();
        // Back online: refresh so every section shows live data again (Firebase also reconnects by itself)
        if (savedShownAt) setTimeout(function () { location.reload(); }, 1500);
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateOfflineBar); else updateOfflineBar();

    // ---------------------------------------------------------------- 4b. INSTALL PROMPT
    var installed = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    var deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; maybeShowInstall(); });
    window.addEventListener('appinstalled', function () { var s = ls(); if (s) s.setItem('smlc_app_installed', '1'); hideInstall(); });
    window.smlcInstallApp = function () {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function () { deferredPrompt = null; hideInstall(); });
            return true;
        }
        location.href = INSTALL_URL;
        return false;
    };
    window.smlcCanPromptInstall = function () { return !!deferredPrompt; };

    function hideInstall() { var b = document.getElementById('smlc-install'); if (b) b.remove(); }
    function maybeShowInstall() {
        var s = ls();
        if (installed || !s || !document.body || document.getElementById('smlc-install')) return;
        if (/\/install\.html$/i.test(location.pathname)) return;
        if (s.getItem('smlc_app_installed') === '1') return;
        var snooze = +s.getItem('smlc_install_snooze') || 0;
        if (Date.now() < snooze) return;
        var visits = +s.getItem('smlc_visits') || 0;
        if (visits < 2) return;                                   // first visit: never pester
        if (!deferredPrompt && !IS_IOS) return;                   // only offer where install works
        var box = document.createElement('div');
        box.id = 'smlc-install';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-label', 'Install the SMLC app');
        box.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:950;width:min(330px,calc(100vw - 28px));background:#001B37;color:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.3);padding:14px 14px 12px;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
        var how = IS_IOS
            ? 'Tap <strong>Share</strong> <span aria-hidden="true">&#x2B06;&#xFE0E;</span> then <strong>Add to Home Screen</strong>.'
            : 'Get Clay County news, events, gas prices and the directory in one tap \u2014 even with no signal.';
        box.innerHTML = '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">' +
            '<img src="' + BASE + 'icons/icon-192.png" alt="" width="40" height="40" style="border-radius:9px">' +
            '<strong style="font-size:1rem">Install the SMLC app</strong></div>' +
            '<div style="font-size:.9rem;opacity:.95">' + how + '</div>' +
            '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
            (IS_IOS ? '<a href="' + INSTALL_URL + '" style="background:#FFC10E;color:#111;font-weight:800;border-radius:8px;padding:7px 12px;text-decoration:none">Show me how</a>'
                    : '<button type="button" data-act="install" style="background:#FFC10E;color:#111;font-weight:800;border:0;border-radius:8px;padding:7px 12px;cursor:pointer;font:inherit">Install</button>') +
            '<button type="button" data-act="later" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;padding:7px 12px;cursor:pointer;font:inherit">Not now</button></div>';
        box.addEventListener('click', function (e) {
            var act = e.target.getAttribute && e.target.getAttribute('data-act');
            if (act === 'install') window.smlcInstallApp();
            if (act === 'later') { s.setItem('smlc_install_snooze', String(Date.now() + 30 * 864e5)); hideInstall(); }
        });
        // keep clear of the offer pop-up (bottom-left) and any phone menu bar at the bottom
        document.body.appendChild(box);
        var bars = 0, vh = window.innerHeight;
        document.querySelectorAll('body *').forEach(function (el) {
            if (el === box || box.contains(el)) return;
            var cs = getComputedStyle(el);
            if (cs.position !== 'fixed' || cs.display === 'none') return;
            var r = el.getBoundingClientRect();
            if (r.height > 0 && r.height < vh * 0.3 && r.width > window.innerWidth * 0.6 && Math.abs(r.bottom - vh) < 4) bars = Math.max(bars, r.height);
        });
        box.style.bottom = (14 + bars) + 'px';
        if (window.innerWidth < 700 && document.querySelector('.smlc-offer')) box.style.bottom = (14 + bars + 150) + 'px';
    }
    (function countVisit() {
        var s = ls(); if (!s) return;
        try {
            if (!sessionStorage.getItem('smlc_counted')) {
                sessionStorage.setItem('smlc_counted', '1');
                s.setItem('smlc_visits', String((+s.getItem('smlc_visits') || 0) + 1));
            }
        } catch (e) {}
    })();
    window.addEventListener('load', function () { setTimeout(maybeShowInstall, 6000); });
})();
