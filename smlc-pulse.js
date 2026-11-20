/* ==========================================================================
   File: smlc-pulse.js  |  v1.0  |  2026-11-20 2:15 PM ET
   SMLC's own visit counter ("Community Pulse"), alongside Google Analytics.

   WHY: Google Analytics is blocked by most ad blockers and Brave, so it misses
   visitors. This counts on SMLC's own Firebase, which ad blockers leave alone.
   (The file and database names avoid words like "stats", "track" and
   "analytics" on purpose; blocker lists match those.)

   WHAT IT COUNTS (totals only: no names, emails, IP addresses or cookies):
     community_pulse/days/<YYYY-MM-DD>/
        views/<page>          page views
        visitors              different browsers that day
        newVisitors           browsers seen for the first time
        devices/<type>        mobile / tablet / desktop
        sources/<site>        where visitors came from ("direct" = typed/bookmark/app)
        hosts/<host>          which address served the page (live site vs. test)
        ga/<loaded|blocked>   did Google Analytics load? (shows how much GA misses)
        events/<name>         every gtag('event', ...) the site already sends
        partners/<name>/<views|clicks>
        businesses/<name>/<clicks>
        towns/<town>          town views on the town pages (they switch towns without reloading)

   Every page's gtag('event', ...) call is copied here automatically, so new
   events the site adds later are counted with no extra code.
   Counts are batched and sent every 15 seconds and when the page is closed.

   Dashboard: admin/site-pulse.html (team sign-in).
   Firebase rules needed: see the comment at the top of admin/site-pulse.html.
   ========================================================================== */
(function () {
    'use strict';
    if (window.smlcPulse) return;                                   // loaded twice: do nothing
    if (/^(localhost|127\.|192\.168\.)/.test(location.hostname)) return; // don't count local testing
    if (navigator.webdriver) return;                               // don't count robots

    var DB = 'https://smlc-fuel-monitor-default-rtdb.firebaseio.com/community_pulse.json';
    var queue = {};
    var queued = 0;

    function day() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    // Firebase keys can't contain . # $ [ ] /
    function key(s) {
        s = String(s == null ? '' : s).trim().replace(/[.#$\[\]\/]/g, '_').replace(/\s+/g, ' ').slice(0, 80);
        return s || 'unknown';
    }
    function add(path, n) {
        var p = 'days/' + day() + '/' + path;
        queue[p] = (queue[p] || 0) + (n || 1);
        queued++;
    }
    function flush(closing) {
        if (!queued) return;
        var body = {};
        Object.keys(queue).forEach(function (p) { body[p] = { '.sv': { increment: queue[p] } }; });
        queue = {}; queued = 0;
        try {
            // POST + method override = a "simple" request (no CORS pre-check), so it also
            // gets through when the page is closing.
            fetch(DB + '?x-http-method-override=PATCH', { method: 'POST', body: JSON.stringify(body), keepalive: !!closing,
                        headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
        } catch (e) { /* never break the page */ }
    }
    function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

    /* ---------- Page view ---------- */
    var page = location.pathname.replace(/^\/+/, '').replace(/\.html?$/i, '').replace(/\/$/, '') || 'home';
    page = page.replace(/^smlc\//i, '');                            // GitHub Pages sub-folder
    if (page === 'index') page = 'home';
    add('views/' + key(page.replace(/\//g, ' › ')));
    add('hosts/' + key(location.hostname));

    var today = day();
    if (store('smlcPulseDay') !== today) { store('smlcPulseDay', today); add('visitors'); }
    if (!store('smlcPulseFirst')) { store('smlcPulseFirst', today); add('newVisitors'); }

    var ua = navigator.userAgent || '';
    var device = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet'
               : /Mobi|iPhone|iPod|Android/i.test(ua) ? 'mobile' : 'desktop';
    add('devices/' + device);

    var source = 'direct';
    try {
        if (document.referrer) {
            var r = new URL(document.referrer).hostname.replace(/^www\./, '');
            source = r === location.hostname.replace(/^www\./, '') ? '' : r;   // moving between our own pages isn't a source
        }
    } catch (e) {}
    if (window.matchMedia && matchMedia('(display-mode: standalone)').matches) source = 'installed app';
    if (source) add('sources/' + key(source));

    // Did Google Analytics actually load? Checked after 6 seconds.
    setTimeout(function () {
        add('ga/' + (window.google_tag_manager ? 'loaded' : 'blocked'));
    }, 6000);

    /* ---------- Copy every gtag('event', ...) ---------- */
    function countEvent(name, params) {
        name = key(name); params = params || {};
        add('events/' + name);
        if (params.partner_name && name === 'partner_card_impression') add('partners/' + key(params.partner_name) + '/views');
        if (name === 'page_view' && params.page_title) add('towns/' + key(params.page_title));   // town pages switch towns without reloading
        if (params.business_name) add('businesses/' + key(params.business_name) + '/clicks');
    }
    function hookGtag() {
        window.dataLayer = window.dataLayer || [];
        var orig = typeof window.gtag === 'function' ? window.gtag : function () { window.dataLayer.push(arguments); };
        if (orig.smlcPulse) return;
        var wrapped = function () {
            try { if (arguments[0] === 'event') countEvent(arguments[1], arguments[2]); } catch (e) {}
            return orig.apply(this, arguments);
        };
        wrapped.smlcPulse = true;
        window.gtag = wrapped;
    }
    hookGtag();
    document.addEventListener('DOMContentLoaded', hookGtag);   // a page that sets up gtag later still gets copied

    /* ---------- Partner clicks (cards, image lightbox opens) ---------- */
    document.addEventListener('click', function (e) {
        var card = e.target && e.target.closest ? e.target.closest('.community-partner-card') : null;
        if (card) add('partners/' + key(card.getAttribute('data-partner-name')) + '/clicks');
    }, true);

    /* ---------- Send ---------- */
    setTimeout(function () { flush(); }, 3000);
    setInterval(function () { flush(); }, 15000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
    window.addEventListener('pagehide', function () { flush(true); });

    window.smlcPulse = { add: add, flush: flush, event: countEvent };
})();
