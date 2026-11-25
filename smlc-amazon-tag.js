/* ==========================================================================
   File: smlc-amazon-tag.js  |  2026-11-25
   Load this in the <head> of every SMLC page.

   AMAZON TAG: every Amazon link on SMLC carries the SMLC Associates tag
   (supportmylocalcommunity-20). window.smlcAmazonTag(url) adds it, or swaps
   anyone else's tag for it. Links are fixed again when they are tapped, so
   links added later by Firebase, the Sheet, the directory or the inventory
   app are covered too. Amazon short links (amzn.to, a.co, link.amazon) can't
   carry a tag and are left alone, because Amazon does the redirect.
   ========================================================================== */
(function () {
    'use strict';
    if (window.smlcAmazonTag) return;          // already loaded on this page
    window.SMLC_AMAZON_TAG = 'supportmylocalcommunity-20';
    window.smlcAmazonTag = function (url) {
        try {
            var u = new URL(url, location.href);
            if (!/(^|\.)amazon\.(com|ca|co\.uk|de|fr|it|es|com\.mx|co\.jp|in|com\.au)$/i.test(u.hostname)) return url;
            if (u.searchParams.get('tag') === window.SMLC_AMAZON_TAG) return url;
            u.searchParams.set('tag', window.SMLC_AMAZON_TAG);
            return u.toString();
        } catch (e) { return url; }
    };
    var fix = function (ev) {
        var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
        if (a && /amazon\./i.test(a.href)) {
            a.href = window.smlcAmazonTag(a.href);
            if (!/sponsored/.test(a.rel || '')) a.rel = ((a.rel || '') + ' sponsored noopener').trim();
        }
    };
    document.addEventListener('click', fix, true);
    document.addEventListener('auxclick', fix, true);
    // Amazon requires a short notice wherever its links appear.
    var note = function () {
        if (document.getElementById('smlc-amazon-note') || !document.querySelector('a[href*="amazon."]')) return;
        var p = document.createElement('p');
        p.id = 'smlc-amazon-note';
        p.style.cssText = 'font-size:.75rem;opacity:.75;text-align:center;margin:10px auto;max-width:900px;padding:0 12px';
        p.textContent = 'As an Amazon Associate, Support My Local Community earns from qualifying purchases.';
        (document.querySelector('footer') || document.body).appendChild(p);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(note, 3000); });
    else setTimeout(note, 3000);
})();
