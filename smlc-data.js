/* ==========================================================================
   File: smlc-data.js  |  v1  |  2026-11-11 12:00 PM ET  (Test-2)
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

    var promise = fetch(url, { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { return d && (d.global || d.towns) ? d : null; })
        .catch(function () { return null; });

    window.SMLC_DATA = {
        promise: promise,
        /** get('towns/Flora/sections/history') -> value or undefined */
        get: function (data, path) {
            return String(path).split('/').filter(Boolean).reduce(function (o, k) { return o == null ? undefined : o[k]; }, data);
        }
    };
})();
