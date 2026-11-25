/* ==========================================================================
   File: smlc-coffee.js  |  2026-11-25
   Load this in the <head> of every SMLC public page.

   COFFEE LINK: shows a small "Buy me a coffee" button in the bottom-left
   corner of the page. It opens https://buymeacoffee.com/raykevin71b in a new
   tab. The button sits on the left because the "back to top" button already
   lives in the bottom-right corner of the town pages.
   ========================================================================== */
(function () {
    'use strict';
    if (window.smlcCoffee) return;             // already loaded on this page
    window.smlcCoffee = true;

    var COFFEE_URL = 'https://buymeacoffee.com/raykevin71b';

    function build() {
        if (document.getElementById('smlc-coffee-link') || !document.body) return;
        var a = document.createElement('a');
        a.id = 'smlc-coffee-link';
        a.href = COFFEE_URL;
        a.target = '_blank';
        a.rel = 'noopener';
        a.title = 'Buy me a coffee';
        a.setAttribute('aria-label', 'Buy me a coffee - opens Buy Me a Coffee in a new tab');
        a.style.cssText = [
            'position:fixed',
            'left:14px',
            'bottom:calc(14px + env(safe-area-inset-bottom, 0px))',
            'z-index:800',
            'display:inline-flex',
            'align-items:center',
            'gap:7px',
            'padding:9px 14px',
            'border-radius:999px',
            'background:#ffffff',
            'color:#222222',
            'border:1px solid rgba(0,0,0,.15)',
            'box-shadow:0 3px 12px rgba(0,0,0,.18)',
            'font:600 13px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
            'text-decoration:none',
            'white-space:nowrap'
        ].join(';');

        var cup = document.createElement('span');
        cup.setAttribute('aria-hidden', 'true');
        cup.textContent = '\u2615';
        cup.style.cssText = 'font-size:16px;line-height:1';

        var label = document.createElement('span');
        label.textContent = 'Buy me a coffee';

        a.appendChild(cup);
        a.appendChild(label);
        document.body.appendChild(a);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
