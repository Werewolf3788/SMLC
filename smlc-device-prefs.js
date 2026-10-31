/* ==========================================================================
   File: smlc-device-prefs.js  |  2026-10-31
   Load this in the <head> of every SMLC page, BEFORE Google Translate's script.

   1. Automatic translation: reads the language the visitor's device is set to
      and tells Google Translate to show the page in that language.
      English devices see the original page. There is no language picker.
   2. Hides all Google Translate menus, banners and pop-ups.
   (Light/dark mode is handled in each page's CSS with prefers-color-scheme,
    so it simply follows the device setting.)
   ========================================================================== */
(function () {
    var PAGE_LANGUAGE = 'en';

    // Device language -> the code Google Translate expects
    function googleLangFromDevice() {
        var raw = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage || PAGE_LANGUAGE;
        raw = String(raw).toLowerCase();
        var base = raw.split('-')[0];
        if (base === 'zh') return /(tw|hk|mo|hant)/.test(raw) ? 'zh-TW' : 'zh-CN';
        var special = { he: 'iw', fil: 'tl', nb: 'no', nn: 'no', jv: 'jw' };
        return special[base] || base;
    }

    // Google Translate reads a "googtrans" cookie. Old copies can sit on several
    // paths/domains (from the old language picker), so write/clear them all.
    function cookiePaths() {
        var paths = ['/'];
        var segs = location.pathname.split('/').filter(Boolean);
        var acc = '';
        for (var i = 0; i < segs.length; i++) {
            acc += '/' + segs[i];
            paths.push(acc, acc + '/');
        }
        return paths;
    }
    function cookieDomains() {
        var host = location.hostname;
        var list = [''];
        if (host && host.indexOf('.') !== -1 && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) list.push(host, '.' + host);
        return list;
    }
    function setCookie(value, expires) {
        var paths = expires ? cookiePaths() : ['/'];
        paths.forEach(function (path) {
            cookieDomains().forEach(function (domain) {
                var parts = ['googtrans=' + value, 'path=' + path];
                if (expires) parts.push('expires=' + expires);
                if (domain) parts.push('domain=' + domain);
                document.cookie = parts.join('; ');
            });
        });
    }

    var target = googleLangFromDevice();
    var current = (document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/) || [])[1] || '';

    var EXPIRED = 'Thu, 01 Jan 1970 00:00:00 GMT';
    if (target === PAGE_LANGUAGE) {
        // English device: wipe every old translation cookie so nothing sticks around
        if (current) setCookie('', EXPIRED);
    } else {
        var wanted = '/' + PAGE_LANGUAGE + '/' + target;
        if (decodeURIComponent(current) !== wanted) {
            setCookie('', EXPIRED);   // clear stale copies on other paths first
            setCookie(wanted);
        }
    }
    window.SMLC_DEVICE_LANGUAGE = target;

    // Make sure Google Translate has somewhere to attach, even on pages without the box
    window.smlcEnsureTranslateElement = function () {
        if (!document.getElementById('google_translate_element') && document.body) {
            var el = document.createElement('div');
            el.id = 'google_translate_element';
            document.body.appendChild(el);
        }
    };
    // Only start Google Translate when the device is NOT English.
    // English devices never load the translator, so a page can't come up in
    // another language. Pages call window.smlcStartTranslate() from their
    // googleTranslateElementInit; it does nothing on English devices.
    window.SMLC_TRANSLATE_WANTED = (target !== PAGE_LANGUAGE);
    window.smlcStartTranslate = function () {
        if (!window.SMLC_TRANSLATE_WANTED) return;
        if (!(window.google && window.google.translate && window.google.translate.TranslateElement)) return;
        window.smlcEnsureTranslateElement();
        new window.google.translate.TranslateElement({ pageLanguage: PAGE_LANGUAGE, autoDisplay: false }, 'google_translate_element');
    };
    window.googleTranslateElementInit = window.smlcStartTranslate;

    // Hide every Google Translate control, banner and tooltip
    var css = '' +
        '#google_translate_element, .translate-box-header, .smlc-bn-translate-slot,' +
        ' .goog-te-gadget, .goog-te-combo, .goog-logo-link {' +
        '  position: absolute !important; left: -9999px !important; top: auto !important;' +
        '  width: 1px !important; height: 1px !important; overflow: hidden !important; }' +
        ' .goog-te-banner-frame, iframe.skiptranslate, .skiptranslate > iframe, #goog-gt-tt,' +
        ' .goog-te-balloon-frame, .goog-tooltip, .goog-te-menu-frame,' +
        ' .VIpgJd-ZVi9od-ORHb-OEVmcd, .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-yAWNEb-L7lbkb { display: none !important; }' +
        ' html, body { top: 0 !important; }' +
        ' .goog-text-highlight { background: none !important; box-shadow: none !important; }';
    var style = document.createElement('style');
    style.id = 'smlc-hide-translate-ui';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
})();
