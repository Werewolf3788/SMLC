/* ==========================================================================
   File: smlc-bookmarks.js  |  v1  |  2026-10-31 11:40 PM ET
   Short links straight to a section, on every SMLC page:

     flora.html#gas        index.html#events       clay-city.html#history

   #events #news #gas #partners #spotlight #sports #links #landmarks
   #article #history #slideshow #weather #answers #community

   Opens the right tab ("Local Events & News" / "Discover") first, then
   scrolls to the section (and again once Firebase has filled it in).
   Unknown names are ignored, so town links like #/flora keep working.
   ========================================================================== */
(function () {
    // name -> list of places to look (first one found on the page wins)
    var SMLC_BOOKMARKS = {
        events:    ['#bulletin-scroller-target', '#direct-event-list'],
        calendar:  ['#bulletin-scroller-target', '#direct-event-list'],
        news:      ['#news-matrix-target', '#town-summaries'],
        gas:       ['#fuel-monitor-target-box', '#gas-screen'],
        partners:  ['#partners-grid-top', '#partners-grid-bottom'],
        spotlight: ['#spotlight-asset-name', '#spotlight-name'],
        sports:    ['#town-sports-scoreboard-target'],
        scores:    ['#town-sports-scoreboard-target'],
        links:     ['#town-links-target-container'],
        landmarks: ['#point-of-interest-main-title'],
        discover:  ['#point-of-interest-main-title'],
        article:   ['#article-title'],
        history:   ['#history-timeline-title'],
        slideshow: ['#slideshow-container-box'],
        weather:   ['#portal-weather-pill', '#county-weather-alert-bar'],
        answers:   ['#quick-answers'],
        faq:       ['#quick-answers'],
        community: ['#smlc-community-corner'],
        subscribe: ['#newsletter-form-container']
    };

    function bookmarkName(hash) {
        var h = String(hash || '').replace(/^#\/?/, '').toLowerCase().trim();
        return Object.prototype.hasOwnProperty.call(SMLC_BOOKMARKS, h) ? h : '';
    }
    // universaltown.js asks this before treating a #hash as a town switch
    window.smlcIsBookmarkHash = function (hash) { return !!bookmarkName(hash); };

    function findTarget(name) {
        var list = SMLC_BOOKMARKS[name] || [];
        for (var i = 0; i < list.length; i++) {
            var el = document.querySelector(list[i]);
            if (el) return el;
        }
        return null;
    }

    // If the section sits in a hidden tab, click that tab first
    function openTabFor(el) {
        var panel = el.closest ? el.closest('.portal-tab-panel') : null;
        if (!panel || panel.classList.contains('active')) return;
        var btn = Array.prototype.find.call(document.querySelectorAll('.portal-pill-btn'), function (b) {
            return (b.getAttribute('onclick') || '').indexOf(panel.id) !== -1 || b.getAttribute('aria-controls') === panel.id;
        });
        if (btn) {
            if (typeof window.switchPortalPill === 'function') window.switchPortalPill(btn, panel.id);
            else btn.click();
        }
    }

    // Scroll to the card/box the section lives in, not just its first line
    function scrollBlock(el) {
        return el.closest('.event-clipping, .spotlight-clipping, .clay-county-news-box, .invitation-card, .newspaper-card, section, .index-col') || el;
    }

    function goTo(name, smooth) {
        var el = findTarget(name);
        if (!el) return false;
        openTabFor(el);
        var block = scrollBlock(el);
        var top = block.getBoundingClientRect().top + window.pageYOffset - 90;   // leave room for the sticky menu
        window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
        if (!block.hasAttribute('tabindex')) block.setAttribute('tabindex', '-1');
        try { block.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
        return true;
    }

    function handle(smooth) {
        var name = bookmarkName(location.hash);
        if (!name) return;
        // Sections fill in from Firebase after load, so settle again a few times
        // (stops as soon as the visitor scrolls or taps on their own)
        var userMoved = false;
        var stop = function () { userMoved = true; };
        ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { window.addEventListener(ev, stop, { once: true, passive: true }); });
        var tries = [0, 400, 1200, 2500];
        tries.forEach(function (ms) { setTimeout(function () { if (ms === 0 || !userMoved) goTo(name, smooth && ms === 0); }, ms); });
    }

    window.addEventListener('hashchange', function () { handle(true); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { handle(false); });
    else handle(false);
})();
