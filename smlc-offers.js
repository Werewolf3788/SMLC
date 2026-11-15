/* ==========================================================================
   File: smlc-offers.js  |  v1.1  |  2026-11-15 (Premium listings only)
   "Offer" pop-up for every SMLC page (not the directory itself).

   When a PREMIUM business in the Clay County Business Directory has an offer (Master
   Data columns "offer" + optional "validuntil"), a small card slides in at the
   bottom corner: OFFER badge, logo, business name and the offer. Tapping it
   opens directory.html at that business. Several offers rotate every 8 seconds.
   The X hides it for the rest of the visit. Offers past their "valid until"
   date (Central Time) never show.

   Data: Firestore directory/public (written by BusinessFinder.gs), cached for
   15 minutes per visit; falls back to data/directory.json on this site.
   Load with:  <script defer src="smlc-offers.js"></script>  before </body>.
   ========================================================================== */
(function () {
    'use strict';
    if (window.smlcOffersLoaded) return;
    window.smlcOffersLoaded = true;
    if (/\/directory\.html$/i.test(location.pathname)) return;   // the directory shows offers itself

    var FS_DOC = 'https://firestore.googleapis.com/v1/projects/smlc-fuel-monitor/databases/(default)/documents/directory/public?key=AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg';
    var CACHE_KEY = 'smlc_offers_v2', HIDE_KEY = 'smlc_offers_hidden', CACHE_MS = 15 * 60 * 1000, ROTATE_MS = 8000;
    var script = document.currentScript;
    var BASE = script && script.src ? script.src.replace(/[^\/]*$/, '') : '';      // works on the test copy (/SMLC/) and the real domain

    function store(kind) { try { return window[kind]; } catch (e) { return null; } }
    var session = store('sessionStorage');
    if (session && session.getItem(HIDE_KEY) === '1') return;

    function todayCentral() {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    }
    function fromFs(v) {
        if (!v || typeof v !== 'object') return v;
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return Number(v.integerValue);
        if ('booleanValue' in v) return v.booleanValue;
        if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFs);
        if ('mapValue' in v) { var o = {}, f = v.mapValue.fields || {}; Object.keys(f).forEach(function (k) { o[k] = fromFs(f[k]); }); return o; }
        return null;
    }
    function pickOffers(businesses) {
        var today = todayCentral();
        return (businesses || []).filter(function (b) {
            return b && b.tier === 'Premium' && b.offer && String(b.offer).trim() && (!b.validUntil || b.validUntil >= today);
        }).map(function (b) { return { id: b.id, name: b.name, image: b.image, offer: b.offer, validUntil: b.validUntil || '' }; });
    }

    function load() {
        if (session) {
            try {
                var c = JSON.parse(session.getItem(CACHE_KEY) || 'null');
                if (c && Date.now() - c.t < CACHE_MS) return Promise.resolve(pickOffers(c.b));
            } catch (e) {}
        }
        function save(list) {
            var slim = (list || []).filter(function (b) { return b && b.offer; })
                .map(function (b) { return { id: b.id, name: b.name, image: b.image, offer: b.offer, validUntil: b.validUntil, tier: b.tier }; });
            if (session) try { session.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), b: slim })); } catch (e) {}
            return pickOffers(slim);
        }
        return fetch(FS_DOC).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (doc) { var b = fromFs((doc.fields || {}).businesses); if (!b || !b.length) throw new Error('empty'); return save(b); })
            .catch(function () {
                return fetch(BASE + 'data/directory.json').then(function (r) { return r.ok ? r.json() : { businesses: [] }; })
                    .then(function (pub) { return save(pub.businesses); });
            });
    }

    function nice(iso) {
        var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2] - 1] + ' ' + (+m[3]) : '';
    }

    function show(offers) {
        if (!offers.length || !document.body) return;
        var css = document.createElement('style');
        css.textContent =
            '.smlc-offer{position:fixed;left:14px;bottom:14px;z-index:900;width:min(340px,calc(100vw - 28px));' +
            'background:#fff;color:#14171c;border:2px solid #FFC10E;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);' +
            'font:15px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;transform:translateY(140%);transition:transform .45s ease}' +
            '.smlc-offer.in{transform:none}' +
            '.smlc-offer a.smlc-offer-go{display:grid;grid-template-columns:58px 1fr;gap:3px 12px;padding:12px 40px 12px 12px;color:inherit;text-decoration:none}' +
            '.smlc-offer img{grid-row:span 3;width:58px;height:58px;object-fit:contain;border-radius:8px;background:#fff;border:1px solid #e3e7ec}' +
            '.smlc-offer .b{justify-self:start;font-size:.66rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:#FFC10E;color:#111;border-radius:4px;padding:1px 7px}' +
            '.smlc-offer strong{font-size:.98rem}' +
            '.smlc-offer .t{font-size:.88rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
            '.smlc-offer .m{grid-column:2;font-size:.78rem;color:#0b4f9c;font-weight:700}' +
            '.smlc-offer .x{position:absolute;top:6px;right:6px;width:30px;height:30px;border:0;border-radius:50%;background:rgba(0,0,0,.06);color:inherit;font-size:18px;line-height:1;cursor:pointer}' +
            '.smlc-offer .fade{transition:opacity .35s}.smlc-offer .fade.out{opacity:0}' +
            '@media (prefers-color-scheme: dark){.smlc-offer{background:#1b1e23;color:#eceef2}.smlc-offer .m{color:#8cb8ff}.smlc-offer .x{background:rgba(255,255,255,.1)}}' +
            '@media (prefers-reduced-motion: reduce){.smlc-offer,.smlc-offer .fade{transition:none}}' +
            '@media print{.smlc-offer{display:none}}';
        document.head.appendChild(css);

        var box = document.createElement('aside');
        box.className = 'smlc-offer';
        box.setAttribute('aria-label', 'Local business offer');
        box.innerHTML = '<a class="smlc-offer-go fade" href="#"></a><button class="x" type="button" aria-label="Close offers">&times;</button>';
        document.body.appendChild(box);
        var link = box.querySelector('a'), i = 0, timer = null;

        function paint() {
            var o = offers[i % offers.length];
            link.href = BASE + 'directory.html#' + encodeURIComponent(o.id);
            link.setAttribute('data-name', o.name);
            link.innerHTML = '<img src="' + esc(o.image) + '" alt="" width="58" height="58" onerror="this.style.visibility=\'hidden\'">' +
                '<span class="b">Offer' + (offers.length > 1 ? ' ' + ((i % offers.length) + 1) + '/' + offers.length : '') + '</span>' +
                '<strong>' + esc(o.name) + '</strong>' +
                '<span class="t">' + esc(o.offer) + '</span>' +
                '<span class="m">See the offer &rarr;' + (o.validUntil ? ' &middot; through ' + esc(nice(o.validUntil)) : '') + '</span>';
        }
        function next() {
            link.classList.add('out');
            setTimeout(function () { i++; paint(); link.classList.remove('out'); }, 350);
        }
        // Sit above any bar fixed to the bottom of the screen (e.g. the town pages' phone menu)
        function lift() {
            var h = 0, vh = window.innerHeight;
            document.querySelectorAll('body *').forEach(function (el) {
                if (el === box || box.contains(el)) return;
                var cs = getComputedStyle(el);
                if ((cs.position !== 'fixed' && cs.position !== 'sticky') || cs.display === 'none' || cs.visibility === 'hidden') return;
                var r = el.getBoundingClientRect();
                if (r.height > 0 && r.height < vh * 0.3 && r.width > window.innerWidth * 0.6 && Math.abs(r.bottom - vh) < 4) h = Math.max(h, r.height);
            });
            box.style.bottom = (14 + h) + 'px';
        }
        lift();
        window.addEventListener('resize', function () { clearTimeout(lift.t); lift.t = setTimeout(lift, 200); });
        paint();
        requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('in'); }); });
        if (offers.length > 1) {
            timer = setInterval(next, ROTATE_MS);
            box.addEventListener('mouseenter', function () { clearInterval(timer); });
            box.addEventListener('mouseleave', function () { clearInterval(timer); timer = setInterval(next, ROTATE_MS); });
        }
        link.addEventListener('click', function () {
            if (typeof window.gtag === 'function') window.gtag('event', 'offer_popup_click', { business_name: link.getAttribute('data-name') });
        });
        box.querySelector('.x').addEventListener('click', function () {
            clearInterval(timer);
            box.classList.remove('in');
            setTimeout(function () { box.remove(); }, 450);
            if (session) try { session.setItem(HIDE_KEY, '1'); } catch (e) {}
        });
    }

    function start() { load().then(function (offers) { setTimeout(function () { show(offers); }, 2500); }).catch(function () {}); }
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
