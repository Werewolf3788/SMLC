/* ==========================================================================
   File: smlc-data.js  |  v1.1  |  2026-11-11 12:30 PM ET  (Test-2, keeps a copy on the device)
   Loads data/smlc.json - the Menu, Article, Point of Interest, Spotlight,
   Town History and Town Links tabs of the SMLC Google Sheet, saved into
   GitHub by Code.gs. Pages use it first and only ask Firebase for those
   parts if this file can't be loaded.
   (Slideshow, partners, gas prices and sports still come from Firebase.)
   ========================================================================== */
(function () {
    if (window.SMLC_DATA) return;
    // A new copy at most every 5 minutes, so Sheet edits show up without a hard refresh
    var bust = Math.floor(Date.now() / 300000);
    var here = document.currentScript && document.currentScript.src;
    var url = here ? new URL('data/smlc.json?v=' + bust, here).href : 'data/smlc.json?v=' + bust;

    // Last good copy kept on this device, so the menu and sections can show instantly
    // when the network is slow (or briefly down). A fresh copy always replaces it.
    var CACHE_KEY = 'smlc-data-cache-v1';
    function readCache() { try { var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return c && (c.global || c.towns) ? c : null; } catch (e) { return null; } }
    function saveCache(d) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) { /* full or private mode */ } }

    var network = fetch(url, { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { if (d && (d.global || d.towns)) { saveCache(d); return d; } return null; })
        .catch(function () { return null; });

    var cached = readCache();
    var promise = !cached ? network : Promise.race([
        network.then(function (d) { return d || cached; }),
        new Promise(function (resolve) { setTimeout(function () { resolve(cached); }, 700); })   // slow network: use this device's copy
    ]);

    window.SMLC_DATA = {
        promise: promise,
        /** get('towns/Flora/sections/history') -> value or undefined */
        get: function (data, path) {
            return String(path).split('/').filter(Boolean).reduce(function (o, k) { return o == null ? undefined : o[k]; }, data);
        }
    };
})();
