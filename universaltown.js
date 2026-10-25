/* ==========================================================================
   Active Version: v3.4.1
   File: universaltown.js
   Project: SMLC County Portal Semantic Master Script
   Description: Complete multi-town engine connecting 100% to Firebase (RTDB & Firestore).
                - Direct binding to Firebase nodes:
                    * /master_county_data/towns/[Town]/sections/article (title, category, deck, body, imageUrl, alt)
                    * /master_county_data/towns/[Town]/sections/history (year, title, description, imageUrl, alt)
                    * /master_county_data/towns/[Town]/sections/point_of_interest (header1, header2, image1, image2, alt1, alt2, about_text, landmark_description)
                    * /master_county_data/towns/[Town]/sections/slideshow/items (title, category, imageUrl, alt, website)
                    * /master_county_data/towns/[Town]/sections/town_links/links (title, website)
                    * /master_county_data/global/sections/partners (name, imageUrl, alt, website)
                    * /master_county_data/global/sections/spotlight (name, description, imageUrl, alt, website)
                    * /master_county_data/weather_forecast (current, fiveDay)
                    * /master_county_data/weather_alerts
                    * /master_county_data/sports
                    * /fuel_prices & /billboard_network (includes real station 87817, 48100, 48101, 120226, 128128, etc.)
                    * Firestore smlc_events & local_news
                - Never hides elements when Firebase has live data
                - Preserves side-by-side Spotlight & Gas monitor on desktop
                - Live weather pill injection
                - Central Time timestamps; persistent New York clock in footer
   Changes in v3.4.1:
                - normalizeImageUrl now handles =IMAGE() formulas, Drive, GitHub, Dropbox links
                - Article image block rebuilt (creates <img> if missing, logs to console)
                - parseFuelDate uses the real Central offset (CST/CDT) instead of the label
                - Removed escapeJsString from direct (non-inline) lightbox handlers
   ========================================================================== */

(function initDynamicGa4Engine() {
    const GA4_MEASUREMENT_ID = 'G-FHJNXDB9BB';

    if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}"]`)) {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
        document.head.appendChild(gaScript);
    }

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
        window.gtag = function() {
            window.dataLayer.push(arguments);
        };
        window.gtag('js', new Date());
        window.gtag('config', GA4_MEASUREMENT_ID, {
            send_page_view: false
        });
    }
})();

// Google Translate setup (auto-detect by phone language) lives in the page HTML.

function triggerGoogleTranslateUpdate(targetNode) {
    if (!targetNode) return;
    try {
        if (window.google && window.google.translate && window.google.translate.TranslateElement) {
            const fontTags = document.querySelectorAll('font[color]');
            if (fontTags.length > 0) {
                targetNode.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    } catch(e) {}
}

const TOWN_ALIAS_MAP = {
    "HOME": {
        primaryName: "Clay County",
        dbTownKey: "Flora",
        jsonKey: "all",
        gasKey: ["louisville", "flora", "clay-city", "xenia"],
        historyKey: "all",
        areaId: 0,
        linkedAreaIds: [0],
        keywords: ["CLAY COUNTY", "CLAY COUNTY HOSPITAL", "CLAY COUNTY COURTHOUSE"],
        isHome: true,
        seatBadge: "Clay County Seat",
        estMeta: "Est. 1824 | Zip Code 62824",
        riverMarquee: "COMMUNITY DIGITAL NETWORK MAP",
        themeAccent: "#0258A3"
    },
    "CLAY COUNTY": {
        primaryName: "Clay County",
        dbTownKey: "Flora",
        jsonKey: "all",
        gasKey: ["louisville", "flora", "clay-city", "xenia"],
        historyKey: "all",
        areaId: 0,
        linkedAreaIds: [0],
        keywords: ["CLAY COUNTY", "CLAY COUNTY HOSPITAL", "CLAY COUNTY COURTHOUSE"],
        isHome: true,
        seatBadge: "Clay County Seat",
        estMeta: "Est. 1824 | Zip Code 62824",
        riverMarquee: "COMMUNITY DIGITAL NETWORK MAP",
        themeAccent: "#0258A3"
    },
    "CLAY CITY": {
        primaryName: "Clay City",
        dbTownKey: "Clay City",
        jsonKey: "clay_city",
        gasKey: ["clay-city"],
        historyKey: "clay_city",
        areaId: 3,
        linkedAreaIds: [3],
        keywords: ["CLAY CITY", "CC", "CUBIES", "BULLDOGS"],
        isHome: false,
        seatBadge: "Clay County Hub",
        estMeta: "Est. 1868 | Zip Code 62824",
        riverMarquee: "HOME OF THE CLAY CITY BULLDOGS & CUBIES",
        themeAccent: "#4A154B"
    },
    "FLORA": {
        primaryName: "Flora",
        dbTownKey: "Flora",
        jsonKey: "flora",
        gasKey: ["flora"],
        historyKey: "flora",
        areaId: 2,
        linkedAreaIds: [2],
        keywords: [
            "FLORA",
            "WOLVES",
            "FLORA WOLVES",
            "WOLVES FOOTBALL",
            "WOLF PUP",
            "FLOYD HENSON",
            "FLOYD HENSON JR HIGH",
            "FHJH",
            "FLO"
        ],
        isHome: false,
        seatBadge: "Clay County Commerce Center",
        estMeta: "Est. 1854 | Zip Code 62839",
        riverMarquee: "HOME OF THE FLORA WOLVES • COMMERCE CENTER",
        themeAccent: "#0258A3"
    },
    "LOUISVILLE": {
        primaryName: "Louisville",
        dbTownKey: "Louisville",
        jsonKey: "louisville",
        gasKey: ["louisville"],
        historyKey: "louisville",
        areaId: 1,
        linkedAreaIds: [1, 7, 9],
        keywords: ["LOUISVILLE", "NORTH CLAY", "NC", "INDIANS", "NC CARDINALS"],
        isHome: false,
        seatBadge: "Clay County Seat",
        estMeta: "Est. 1836 | Zip Code 62858",
        riverMarquee: "HOME OF THE NORTH CLAY CARDINALS",
        themeAccent: "#EB1C24"
    },
    "XENIA": {
        primaryName: "Xenia",
        dbTownKey: "Xenia",
        jsonKey: "xenia",
        gasKey: ["xenia"],
        historyKey: "xenia",
        areaId: 4,
        linkedAreaIds: [4],
        keywords: ["XENIA"],
        isHome: false,
        seatBadge: "Clay County Gateway",
        estMeta: "Est. 1834 | Zip Code 62899",
        riverMarquee: "HISTORIC PRIDE & RURAL HERITAGE",
        themeAccent: "#1C5640"
    },
    "SAILOR SPRINGS": {
        primaryName: "Sailor Springs",
        dbTownKey: "Sailor Springs",
        jsonKey: "sailor_springs",
        gasKey: ["louisville", "clay-city"],
        historyKey: "sailor_springs",
        areaId: 5,
        linkedAreaIds: [5],
        keywords: ["SAILOR SPRINGS"],
        isHome: false,
        seatBadge: "Clay County Village",
        estMeta: "Est. 1879 | Zip Code 62879",
        riverMarquee: "HISTORIC MINERAL SPRINGS HAVEN",
        themeAccent: "#00695C"
    }
};

function getActiveTownConfig() {
    try {
        const hashRoute = (window.location.hash || "").replace("#/", "").replace("#", "").replace(/-/g, " ").toUpperCase();
        if (hashRoute && TOWN_ALIAS_MAP[hashRoute]) return TOWN_ALIAS_MAP[hashRoute];

        const pageTitle = (document.title || "").toUpperCase();
        for (const key in TOWN_ALIAS_MAP) {
            if (pageTitle.includes(key)) return TOWN_ALIAS_MAP[key];
        }

        const htmlTownAttr = (document.documentElement.getAttribute('data-town') || document.body?.getAttribute('data-town') || "").toUpperCase();
        if (htmlTownAttr) {
            for (const key in TOWN_ALIAS_MAP) {
                if (key === htmlTownAttr || TOWN_ALIAS_MAP[key].primaryName.toUpperCase() === htmlTownAttr) {
                    return TOWN_ALIAS_MAP[key];
                }
            }
        }
    } catch(e) {
        console.warn("Town resolution notice:", e.message);
    }

    return TOWN_ALIAS_MAP["FLORA"];
}

let ACTIVE_TOWN = getActiveTownConfig();

const DEFAULT_APP_CONFIG = {
    regional_endpoints: {
        apps_script_bulletin_url: "//script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec",
        gas_widget: "//werewolf3788.github.io/SMLC/update-gas.html"
    }
};

let globalSlideshowTicker = null;
let gasMonitorRotator = null;
let topCarouselInterval = null;
let bottomCarouselInterval = null;

let activeFbRefSections = null;
let activeFbRefGlobalSections = null;
let activeFbRefLinksTown = null;
let activeFbRefLinksGlobal = null;
let activeFbRefMenu = null;
let activeFbRefPartnersTown = null;
let activeFbRefPartnersGlobal = null;
let activeFbRefWeather = null;
let activeFbRefForecast = null;
let activeFbRefSports = null;

let unsubscribeFirestoreEvents = null;
let unsubscribeFirestoreNews = null;

window.calendarCachedEvents = [];
window.historyCachedTimeline = [];
window.newsCacheBlock = [];
window.townPartnersPool = [];
window.globalPartnersPool = [];
window.fiveDayForecastCache = [];

const MAX_AGE_DAYS = 7;

function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isWithinMaxAge(raw) {
    const t = new Date(raw).getTime();
    return isNaN(t) ? true : (Date.now() - t) <= MAX_AGE_DAYS * 86400000;
}

// Parses "10/25/2026 @ 3:38 AM CST" as Central time. The CST/CDT label is ignored
// and the real America/Chicago offset for that date is used instead.
function parseFuelDate(raw) {
    const m = String(raw || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*@?\s*(\d{1,2}):(\d{2})\s*([AP]M)?/i);
    if (!m) return null;
    let h = +m[4];
    const ap = (m[6] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    const asUtc = Date.UTC(+m[3], +m[1] - 1, +m[2], h, +m[5]);
    let offsetHours = -6;
    try {
        const tzPart = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'shortOffset' })
            .formatToParts(new Date(asUtc)).find(p => p.type === 'timeZoneName');
        const parsed = parseInt((tzPart ? tzPart.value : 'GMT-6').replace('GMT', ''), 10);
        if (!isNaN(parsed)) offsetHours = parsed;
    } catch (e) {}
    return new Date(asUtc - offsetHours * 3600000);
}

function unwrapFs(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return parseInt(v.integerValue, 10);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if (v.arrayValue) return (v.arrayValue.values || []).map(unwrapFs);
    if (v.mapValue) { const o = {}; for (const k in (v.mapValue.fields || {})) o[k] = unwrapFs(v.mapValue.fields[k]); return o; }
    return null;
}

async function fetchCollectionRest(name) {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/smlc-fuel-monitor/databases/(default)/documents/${name}?pageSize=300`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || []).map(d => { const o = {}; for (const k in (d.fields || {})) o[k] = unwrapFs(d.fields[k]); return o; });
}

function eventCalStamp(iso, allDay) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    if (allDay) return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(d).replace(/-/g, '');
    return d.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

function googleCalUrlForEvent(ev, loc) {
    const p = new URLSearchParams({ text: ev.title || 'Community Event', dates: `${eventCalStamp(ev.start, ev.isAllDay)}/${eventCalStamp(ev.end || ev.start, ev.isAllDay)}`, details: ev.desc || '', location: loc });
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&${p.toString()}`;
}

function icsDataForEvent(ev, loc) {
    const s = eventCalStamp(ev.start, ev.isAllDay), e = eventCalStamp(ev.end || ev.start, ev.isAllDay);
    const dt = ev.isAllDay ? ';VALUE=DATE' : '';
    const esc = t => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SMLC Community Network//EN', 'BEGIN:VEVENT',
        `UID:${s}-${String(ev.title || '').replace(/[^a-z0-9]/gi, '').slice(0, 20)}@smlc`,
        `DTSTAMP:${eventCalStamp(new Date().toISOString(), false)}`, `DTSTART${dt}:${s}`, `DTEND${dt}:${e}`,
        `SUMMARY:${esc(ev.title)}`, `LOCATION:${esc(loc)}`, `DESCRIPTION:${esc(ev.desc)}`, 'END:VEVENT', 'END:VCALENDAR'];
    return 'data:text/calendar;charset=utf8,' + encodeURIComponent(lines.join('\r\n'));
}

const FUEL_STATIONS = {
    "48100":  { town: "flora", display: "Flora", name: "CASEY'S", logo: "Casey's.png" },
    "48101":  { town: "flora", display: "Flora", name: "HUCK'S", logo: "Hucks.png" },
    "87817":  { town: "flora", display: "Flora", name: "FLORA STATION", logo: "smlc-default.png" },
    "120226": { town: "flora", display: "Flora", name: "FAST STOP", logo: "Fast stop.png" },
    "128128": { town: "flora", display: "Flora", name: "MACH 1", logo: "Mach 1.png" },
    "48026":  { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" },
    "171711": { town: "clay-city", display: "Clay City", name: "CASEY'S", logo: "Casey's.png" },
    "181818": { town: "xenia", display: "Xenia", name: "KNAPP'S", logo: "Knapps.png" }
};

function resetAllActiveTimers() {
    if (globalSlideshowTicker) { clearInterval(globalSlideshowTicker); globalSlideshowTicker = null; }
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
    if (topCarouselInterval) { clearInterval(topCarouselInterval); topCarouselInterval = null; }
    if (bottomCarouselInterval) { clearInterval(bottomCarouselInterval); bottomCarouselInterval = null; }
}

function cleanRawUrl(urlStr) {
    if (!urlStr) return "";
    return urlStr
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/")
        .replace("/edit/", "/");
}

// Cleans whatever the Google Sheet sync sends into a displayable image URL.
function normalizeImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let url = rawUrl.trim()
        .replace(/^=IMAGE\(\s*/i, '').replace(/\s*\)\s*$/, '')   // =IMAGE("...") formula
        .replace(/^["']+|["']+$/g, '')                            // stray quotes
        .trim();
    if (!url || url === 'null' || url === 'undefined') return null;

    // Google Drive -> thumbnail endpoint (works for "Anyone with the link" files)
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        const m = url.match(/\/file\/d\/([^\/?#]+)/) || url.match(/[?&]id=([^&#]+)/) || url.match(/\/d\/([^\/?#]+)/);
        if (m && m[1]) return `//drive.google.com/thumbnail?id=${m[1]}&sz=w1600`;
    }
    // lh3 Drive links pass through as-is
    // GitHub page link -> raw image
    if (/^(https?:)?\/\/github\.com\//i.test(url)) {
        url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    // Dropbox share link -> direct
    if (/dropbox\.com/i.test(url)) {
        url = url.replace(/www\.dropbox\.com/i, 'dl.dropboxusercontent.com').replace(/[?&]dl=0/i, '');
    }
    return url.replace(/^https?:/, '');
}

// Only for values placed inside inline onclick="..." HTML strings.
function escapeJsString(str) {
    if (!str && str !== 0) return "";
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');
}

function extractText(val) {
    if (!val && val !== 0) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        const inner = val.content || val.text || val.title || val.name || val.header1 || val.header2 || val.paragraph1 || val.paragraph2 || val.description || val.value || "";
        if (typeof inner === 'object') return extractText(inner);
        if (typeof inner === 'string' || typeof inner === 'number') return String(inner);
        for (const k in val) {
            if (typeof val[k] === 'string' && val[k].trim()) return val[k];
            if (typeof val[k] === 'object') {
                const res = extractText(val[k]);
                if (res) return res;
            }
        }
    }
    return "";
}

function linkifyRawUrls(text) {
    if (!text) return "";
    const plain = String(text).replace(/<\s*br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ');
    return escapeHtml(plain).replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi, (match) => {
        const url = match.replace(/[.,;:!?\)]+$/, '');
        const tail = match.slice(url.length);
        const href = /^https?:/i.test(url) ? url : '//' + url;
        return `<a href="${href}" target="_blank" rel="noopener" style="color:var(--link-bright-blue); text-decoration:underline; word-break:break-all;">${url}</a>${tail}`;
    }).replace(/\n/g, '<br>');
}

function buildTurnByTurnNavigationUrl(rawAddress) {
    if (!rawAddress) return "#";
    const cleanAddress = encodeURIComponent(rawAddress.trim());
    const isAppleDevice = /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent) && !window.MSStream;

    if (isAppleDevice) {
        return `maps://?daddr=${cleanAddress}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${cleanAddress}`;
}

function formatToCentralTime(rawTimestamp) {
    if (!rawTimestamp) return "Live Update";
    try {
        const d = new Date(rawTimestamp);
        if (isNaN(d.getTime())) return String(rawTimestamp);
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago',
            timeZoneName: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(d);
    } catch(e) {
        return String(rawTimestamp);
    }
}

function cleanCalendarDate(rawDate) {
    if (!rawDate || rawDate === "undefined" || rawDate === "null") return "Date to be Announced";
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return String(rawDate);
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(d);
    } catch(e) {
        return String(rawDate);
    }
}

function cleanCalendarTime(rawTime, rawDateFallback = null) {
    if (!rawTime || typeof rawTime !== 'string') return "All Day Event";
    const t = rawTime.trim().toUpperCase();
    if (!t || t === "TBA" || t === "TIME TBA" || t === "00:00" || t === "NULL" || t === "UNDEFINED") {
        return "All Day Event";
    }

    if (rawTime.includes('T') || rawTime.endsWith('Z')) {
        try {
            const d = new Date(rawTime);
            if (!isNaN(d.getTime())) {
                return new Intl.DateTimeFormat('en-US', {
                    timeZone: 'America/Chicago',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }).format(d);
            }
        } catch(e) {}
    }

    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(rawTime.trim())) {
        try {
            const baseDate = rawDateFallback ? new Date(rawDateFallback) : new Date();
            const [hours, minutes] = rawTime.trim().split(':');
            baseDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
            return new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Chicago',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }).format(baseDate);
        } catch(e) {}
    }

    return rawTime.trim();
}

function applyHighDensityScrollLimits(containerElement, itemCount, maxHeightPx = 480) {
    if (!containerElement) return;
    if (itemCount > 5) {
        containerElement.style.maxHeight = `${maxHeightPx}px`;
        containerElement.style.overflowY = "auto";
        containerElement.style.paddingRight = "6px";
    } else {
        containerElement.style.maxHeight = "none";
        containerElement.style.overflowY = "visible";
        containerElement.style.paddingRight = "0px";
    }
}

function trackGa4Event(eventName, eventParams = {}) {
    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, eventParams);
        }
    } catch(e) {
        console.warn("GA4 event dispatch notice:", e.message);
    }
}

function attachUtmParameters(urlStr) {
    if (!urlStr || urlStr.startsWith('#') || /^(javascript:|tel:|mailto:|maps:|webcal:|data:)/i.test(urlStr)) return urlStr;
    try {
        const u = new URL(urlStr, window.location.href);
        if (!/^https?:$/.test(u.protocol) || u.hostname === window.location.hostname) return urlStr;
        if (u.searchParams.has('utm_source')) return u.toString();
        u.searchParams.set('utm_source', 'smlc_portal');
        u.searchParams.set('utm_medium', 'town_portal');
        u.searchParams.set('utm_campaign', (document.title || 'smlc_portal').trim());
        return u.toString();
    } catch (e) {
        return urlStr;
    }
}

function resolveLinkTarget(urlStr) {
    if (!urlStr || urlStr === "#" || urlStr.startsWith("javascript:") || urlStr.startsWith("#")) {
        return '_self';
    }
    try {
        const targetUrlObj = new URL(urlStr, window.location.origin);
        return targetUrlObj.hostname === window.location.hostname ? '_self' : '_blank';
    } catch(e) {
        return '_blank';
    }
}

document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor || !anchor.href) return;

    const href = anchor.href.toLowerCase();

    if (href.startsWith('tel:')) {
        trackGa4Event('contact_phone_click', {
            phone_number: anchor.href.replace('tel:', ''),
            page_location: window.location.href
        });
        return;
    }

    if (href.includes('wa.me') || href.includes('whatsapp.com')) {
        trackGa4Event('contact_whatsapp_click', {
            target_url: anchor.href,
            page_location: window.location.href
        });
        return;
    }

    if (href.startsWith('mailto:')) {
        trackGa4Event('contact_email_click', {
            email_address: anchor.href.replace('mailto:', ''),
            page_location: window.location.href
        });
        return;
    }

    if (href.includes('maps.google.com') || href.includes('maps.apple.com') || href.startsWith('maps:')) {
        trackGa4Event('navigation_directions_click', {
            map_service: (href.includes('apple.com') || href.startsWith('maps:')) ? 'apple_maps' : 'google_maps',
            destination: anchor.href
        });
        return;
    }

    try {
        const targetUrlObj = new URL(anchor.href, window.location.origin);
        if (targetUrlObj.hostname !== window.location.hostname) {
            trackGa4Event('outbound_click', {
                destination_domain: targetUrlObj.hostname,
                target_url: anchor.href,
                link_text: (anchor.innerText || "").trim().substring(0, 100)
            });
        }
    } catch(err) {}
}, true);

function closeLightbox(event) {
    const overlay = document.getElementById('portal-global-lightbox');
    if (!overlay) return;
    if (!event || event.target === overlay || event.target.classList.contains('lightbox-close-btn') || event.target.tagName === 'BUTTON') {
        overlay.style.display = 'none';
    }
}

function fireLightbox(imgSrc, title, dateText, bodyText, targetUrl, altText = "") {
    const overlay = document.getElementById('portal-global-lightbox');
    const targetImg = document.getElementById('lightbox-target-img');
    const actionRow = document.getElementById('lightbox-action-row');
    const actionLink = document.getElementById('lightbox-target-link');

    const cleanTitle = title || '';
    const cleanDate = dateText || '';
    const cleanBody = bodyText || '';
    const cleanAlt = String(altText || '').replace(/^#+\s*/gm, '').replace(/[*_`]/g, '');
    const cleanTargetUrl = targetUrl || '';

    if (imgSrc && targetImg) {
        targetImg.src = imgSrc;
        targetImg.alt = cleanAlt || cleanTitle;
        targetImg.style.display = 'block';
        if (targetImg.parentElement) targetImg.parentElement.style.display = 'block';
    } else if (targetImg && targetImg.parentElement) {
        targetImg.parentElement.style.display = 'none';
    }

    const dateEl = document.getElementById('lightbox-target-date');
    if (dateEl) dateEl.innerHTML = cleanDate || '';

    const titleEl = document.getElementById('lightbox-target-title');
    if (titleEl) titleEl.innerText = cleanTitle || '';

    const bodyAsPlain = String(cleanBody || '').replace(/^#+\s*/gm, '').replace(/[*_`]/g, '').trim();
    const parsedBody = (bodyAsPlain && bodyAsPlain === cleanAlt.trim()) ? '' : linkifyRawUrls(cleanBody || '');
    const parsedAlt = linkifyRawUrls(cleanAlt || '');

    const showAlt = !!cleanAlt.trim() && cleanAlt.trim() !== cleanTitle.trim() && cleanAlt.trim() !== bodyAsPlain;

    const storyEl = document.getElementById('lightbox-target-story');
    const altEl = document.getElementById('lightbox-target-alt');
    if (altEl) {
        // Newer lightbox markup: description and alt details are separate blocks
        if (storyEl) {
            storyEl.innerHTML = parsedBody;
            storyEl.style.display = parsedBody ? 'block' : 'none';
        }
        altEl.innerHTML = showAlt ? `<strong>Details:</strong> ${parsedAlt}` : '';
        altEl.style.display = showAlt ? 'block' : 'none';
    } else if (storyEl) {
        // Older markup fallback: one combined block
        storyEl.innerHTML = showAlt
            ? `<div style="font-style:italic; font-size:14px; margin-bottom:12px; border-left:3px solid var(--primary); padding-left:10px;">Details: ${parsedAlt}</div>${parsedBody}`
            : parsedBody;
    }

    if (cleanTargetUrl && actionLink && actionRow) {
        actionLink.href = attachUtmParameters(cleanTargetUrl);
        actionLink.target = resolveLinkTarget(cleanTargetUrl);
        actionRow.style.display = 'block';
    } else if (actionRow) {
        actionRow.style.display = 'none';
    }

    if (overlay) {
        overlay.style.display = 'flex';
        overlay.onclick = closeLightbox;
    }

    trackGa4Event('modal_lightbox_open', {
        title: cleanTitle || 'Asset Lightbox',
        target_url: cleanTargetUrl || ''
    });
}

function openHistoryLightboxModal(idx) {
    const item = window.historyCachedTimeline[idx];
    if (!item) return;

    fireLightbox(
        normalizeImageUrl(item.imageUrl || item.image || '') || '',
        item.title || 'Historical Landmark',
        `YEAR ${item.year}`,
        item.description || '',
        item.link || '',
        item.alt || item.title || ''
    );
}

function openCalendarLightboxModal(idx) {
    const ev = window.calendarCachedEvents[idx];
    if (!ev) return;
    const loc = ev.addr || ev.location || (ACTIVE_TOWN.primaryName + ', IL');
    const nav = buildTurnByTurnNavigationUrl(loc);
    const meta = `${escapeHtml(ev.displayDate || cleanCalendarDate(ev.start))}<br>Location: <a href="${escapeHtml(nav)}" target="_blank" rel="noopener" style="color:var(--on-card-accent); font-weight:bold; text-decoration:underline;">${escapeHtml(loc)} (Directions &rarr;)</a>`;
    const links = Array.isArray(ev.links) ? ev.links.filter(l => l && l.url) : [];
    const extra = links.slice(1).map(l => `${l.label || 'Link'}: ${l.url}`).join('\n');
    fireLightbox(normalizeImageUrl(ev.image), ev.title, meta,
        (ev.desc || 'No additional details provided.') + (extra ? '\n\n' + extra : ''),
        links[0] ? links[0].url : '', ev.title);
}

function openNewsLightboxModal(idx) {
    const story = window.newsCacheBlock[idx];
    if (!story) return;

    fireLightbox(
        normalizeImageUrl(story.image || '') || '',
        story.title || 'Local News Dispatch',
        cleanCalendarDate(story.date || story.pubDate) + (story.location ? ` | ${story.location}` : ''),
        story.full_story || story.excerpt || story.description || '',
        story.link || '',
        story.title || 'Local News Dispatch'
    );
}

window.toggleMobileMenu = function() {
    const nav = document.getElementById('site-navigation-drawer');
    const toggleBtn = document.getElementById('mobile-menu-toggle-btn');
    if (!nav) return;

    const isOpen = nav.classList.contains('drawer-open');
    if (isOpen) {
        nav.classList.remove('drawer-open');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    } else {
        nav.classList.add('drawer-open');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }
};

window.closeMobileMenu = function() {
    const nav = document.getElementById('site-navigation-drawer');
    const toggleBtn = document.getElementById('mobile-menu-toggle-btn');
    if (nav) nav.classList.remove('drawer-open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
};

// ============================================================================
// WEATHER ALERTS ENGINE: Alert Bar & Dismissible Popup Modal Card (LIVE RTDB)
// Listens to: /master_county_data/weather_alerts
// ============================================================================
function bindFirebaseWeatherAlertsEngine(db) {
    if (!db) return;
    const alertBar = document.getElementById('county-weather-alert-bar');
    const alertHeadline = document.getElementById('weather-alert-headline');
    const alertInstruction = document.getElementById('weather-alert-instruction');

    try {
        if (activeFbRefWeather) activeFbRefWeather.off();
        activeFbRefWeather = db.ref('master_county_data/weather_alerts');

        activeFbRefWeather.on('value', (snapshot) => {
            const data = snapshot.val();

            if (data && (data.hasActiveAlert === true || data.hasActiveAlert === 'true')) {
                const severity = (data.severity || 'WARNING').toUpperCase();
                const headlineText = data.headline || 'Active Weather Alert for Clay County';
                const instructionText = data.instruction || '';
                const updatedCdt = formatToCentralTime(data.updatedAt);

                let themeColor = '#f57f17';
                if (severity.includes('EXTREME') || severity.includes('TORNADO')) {
                    themeColor = '#d32f2f';
                } else if (severity.includes('SEVERE')) {
                    themeColor = '#e65100';
                }

                if (alertBar) {
                    if (alertHeadline) alertHeadline.innerText = headlineText;
                    if (alertInstruction) {
                        alertInstruction.innerText = instructionText ? `${instructionText} (Updated: ${updatedCdt})` : `Updated: ${updatedCdt}`;
                        alertInstruction.style.display = 'block';
                    }
                    alertBar.style.backgroundColor = themeColor;
                    alertBar.style.display = 'block';
                    triggerGoogleTranslateUpdate(alertBar);
                }

                showWeatherAlertModalPopup(headlineText, instructionText, severity, updatedCdt, themeColor);
            } else {
                if (alertBar) alertBar.style.display = 'none';
                hideWeatherAlertModalPopup();
            }
        });
    } catch (err) {
        console.warn("Weather alert engine notice:", err.message);
    }
}

function showWeatherAlertModalPopup(headline, instruction, severity, updatedCdt, themeColor) {
    let popupOverlay = document.getElementById('weather-alert-popup-modal');
    if (!popupOverlay) {
        popupOverlay = document.createElement('div');
        popupOverlay.id = 'weather-alert-popup-modal';
        popupOverlay.style.cssText = "position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; padding:16px;";
        document.body.appendChild(popupOverlay);
    }

    popupOverlay.innerHTML = `
        <div style="background:#fff; border-top:6px solid ${themeColor}; border-radius:8px; max-width:550px; width:100%; box-shadow:0 12px 32px rgba(0,0,0,0.4); overflow:hidden; font-family:sans-serif; text-align:left;">
            <div style="background:#f8f9fa; padding:14px 20px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; font-weight:bold; color:${themeColor}; text-transform:uppercase; letter-spacing:0.5px;">EMERGENCY BULLETIN &bull; ${escapeHtml(severity)}</span>
                <button type="button" onclick="hideWeatherAlertModalPopup()" style="background:none; border:none; font-size:22px; line-height:1; cursor:pointer; color:#666;">&times;</button>
            </div>
            <div style="padding:20px; max-height:65vh; overflow-y:auto;">
                <h3 style="margin:0 0 10px 0; font-size:18px; color:#111; font-weight:bold;">${escapeHtml(headline)}</h3>
                <div style="font-size:11px; color:#777; margin-bottom:12px; font-weight:bold;">Issued: ${escapeHtml(updatedCdt)}</div>
                <div style="font-size:14px; line-height:1.6; color:#333; white-space:pre-line;">${linkifyRawUrls(instruction || 'Please monitor local emergency weather dispatches and take safety precautions.')}</div>
            </div>
            <div style="background:#f1f3f5; padding:12px 20px; text-align:right;">
                <button type="button" onclick="hideWeatherAlertModalPopup()" style="background:${themeColor}; color:#fff; border:none; padding:8px 18px; border-radius:4px; font-weight:bold; font-size:13px; cursor:pointer;">Acknowledge &amp; Close</button>
            </div>
        </div>
    `;
    popupOverlay.style.display = 'flex';
    triggerGoogleTranslateUpdate(popupOverlay);
}

window.hideWeatherAlertModalPopup = function() {
    const popupOverlay = document.getElementById('weather-alert-popup-modal');
    if (popupOverlay) popupOverlay.style.display = 'none';
};

// ============================================================================
// GLOBAL WEATHER FORECAST ENGINE: Dynamic Update of Sub-Bar Pill
// Listens to: /master_county_data/weather_forecast
// ============================================================================
function bindFirebaseWeatherForecastEngine(db) {
    if (!db) return;
    try {
        if (activeFbRefForecast) activeFbRefForecast.off();
        activeFbRefForecast = db.ref('master_county_data/weather_forecast');

        activeFbRefForecast.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const current = data.current || {};
            const rawFiveDay = data.fiveDay || [];
            window.fiveDayForecastCache = (Array.isArray(rawFiveDay) ? rawFiveDay : Object.values(rawFiveDay)).filter(Boolean);

            renderNavbarWeatherWidget(current);
        });
    } catch(err) {
        console.warn("Weather forecast engine notice:", err.message);
    }
}

function renderNavbarWeatherWidget(current) {
    const pill = document.getElementById('portal-weather-pill');
    if (!pill) return;

    const iconSpan = document.getElementById('weather-pill-icon');
    const tempSpan = document.getElementById('weather-pill-temp');
    const detailSpan = document.getElementById('weather-pill-detail');

    const tempNum = Number(current.temp);
    const temp = (current.temp !== undefined && current.temp !== null && current.temp !== '' && !isNaN(tempNum)) ? `${Math.round(tempNum)}°F` : '--°F';
    const condition = current.condition || 'Clear';
    const iconUrl = normalizeImageUrl(current.icon);
    const updatedCdt = formatToCentralTime(current.updatedAt);

    if (iconSpan) {
        iconSpan.innerHTML = iconUrl ? `<img src="${iconUrl}" alt="" onerror="this.style.display='none';">` : '';
    }
    if (tempSpan) {
        tempSpan.innerText = temp;
    }
    if (detailSpan) {
        detailSpan.innerText = `${condition} • 5-Day Forecast`;
    }

    pill.title = `Current Weather: ${condition} | Updated: ${updatedCdt} | Click to view 5-day forecast`;
    pill.onclick = () => {
        if (typeof window.openFiveDayForecastModal === 'function') {
            window.openFiveDayForecastModal();
        }
    };
    triggerGoogleTranslateUpdate(pill);
}

window.openFiveDayForecastModal = function() {
    let modalEl = document.getElementById('weather-fiveday-forecast-modal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'weather-fiveday-forecast-modal';
        modalEl.style.cssText = "position:fixed; inset:0; z-index:99998; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; padding:16px;";
        modalEl.onclick = (e) => {
            if (e.target === modalEl) modalEl.style.display = 'none';
        };
        document.body.appendChild(modalEl);
    }

    const forecastDays = window.fiveDayForecastCache || [];
    const cardsHtml = forecastDays.map(day => {
        if (!day) return '';
        const dayName = day.dayOfWeek || cleanCalendarDate(day.date);
        const iconUrl = normalizeImageUrl(day.icon);
        const condition = day.condition || 'Variable';
        const high = day.high !== undefined ? `${Math.round(day.high)}°` : '--°';
        const low = day.low !== undefined ? `${Math.round(day.low)}°` : '--°';
        const precipChance = day.precipProbability !== undefined ? `${day.precipProbability}%` : '0%';
        const precipInches = day.precipExpectedInches ? `${day.precipExpectedInches}"` : '0"';

        return `
            <div style="flex:1 1 120px; min-width:120px; background:#1e1e1e; border:1px solid #333; border-radius:8px; padding:12px; text-align:center; color:#fff;">
                <div style="font-size:12px; font-weight:bold; text-transform:uppercase; color:#bbb; margin-bottom:6px;">${dayName}</div>
                ${iconUrl ? `<img src="${iconUrl}" alt="" style="width:38px; height:38px; margin:0 auto 6px auto; display:block;" onerror="this.style.display='none';">` : ''}
                <div style="font-size:12px; color:#ddd; font-weight:bold; min-height:30px; display:flex; align-items:center; justify-content:center;">${condition}</div>
                <div style="font-size:15px; font-weight:bold; margin:6px 0;">
                    <span style="color:#ff8a65;">${high}</span> / <span style="color:#90caf9;">${low}</span>
                </div>
                <div style="font-size:11px; color:#aaa; border-top:1px dashed #333; padding-top:6px; margin-top:6px;">
                    Rain: ${precipChance} (${precipInches})
                </div>
            </div>
        `;
    }).join('');

    modalEl.innerHTML = `
        <div style="background:#141414; border:1px solid #333; border-radius:10px; max-width:760px; width:100%; box-shadow:0 12px 32px rgba(0,0,0,0.5); overflow:hidden; font-family:sans-serif;">
            <div style="background:#222; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333;">
                <span style="font-size:14px; font-weight:bold; color:#fff; text-transform:uppercase; letter-spacing:0.5px;">Clay County 5-Day Extended Weather Outlook</span>
                <button type="button" onclick="document.getElementById('weather-fiveday-forecast-modal').style.display='none';" style="background:none; border:none; font-size:24px; color:#aaa; cursor:pointer;">&times;</button>
            </div>
            <div style="padding:20px; display:flex; gap:10px; flex-wrap:wrap; justify-content:center; max-height:75vh; overflow-y:auto;">
                ${cardsHtml || '<div style="color:#aaa; padding:20px;">No forecast telemetry available.</div>'}
            </div>
            <div style="background:#1c1c1c; padding:10px 20px; text-align:right;">
                <button type="button" onclick="document.getElementById('weather-fiveday-forecast-modal').style.display='none';" style="background:#0258A3; color:#fff; border:none; padding:6px 16px; border-radius:4px; font-weight:bold; font-size:12px; cursor:pointer;">Close</button>
            </div>
        </div>
    `;
    modalEl.style.display = 'flex';
    triggerGoogleTranslateUpdate(modalEl);
};

// ============================================================================
// SPORTS SCOREBOARD ENGINE: Live Multi-Level Feeder (LIVE RTDB)
// Listens to: /master_county_data/sports
// ============================================================================
function bindFirebaseSportsEngine(db) {
    if (!db) return;
    const sportsContainer = document.getElementById('town-sports-scoreboard-target');
    if (!sportsContainer) return;

    try {
        if (activeFbRefSports) activeFbRefSports.off();
        activeFbRefSports = db.ref('master_county_data/sports');

        activeFbRefSports.on('value', (snapshot) => {
            const sports = snapshot.val();
            if (!sports) {
                sportsContainer.style.display = 'none';
                return;
            }

            const activeTownKey = (ACTIVE_TOWN.jsonKey || ACTIVE_TOWN.primaryName || "").toLowerCase().replace(/\s+/g, '_');
            let displayHtml = '';

            const formatGameCard = (game, label) => {
                if (!game || !game.homeTeam) return '';
                const isFinal = (game.status || '').toUpperCase() === 'FINAL';
                const badgeColor = isFinal ? '#2e7d32' : 'var(--flora-orange)';

                return `
                    <div class="sports-score-card" style="background:#111; border:1px solid #333; border-radius:6px; padding:12px; margin-bottom:10px; color:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <span style="font-size:11px; font-weight:bold; text-transform:uppercase; color:#bbb;">${label} &bull; ${game.sport || 'Athletics'}</span>
                            <span style="background:${badgeColor}; font-size:10px; font-weight:bold; padding:2px 8px; border-radius:3px; text-transform:uppercase;">${game.status || 'UPCOMING'}</span>
                        </div>
                        <div style="font-size:15px; font-weight:bold; margin-bottom:4px;">
                            ${game.homeTeam} ${isFinal ? `(${game.homeScore})` : ''} vs ${game.awayTeam} ${isFinal ? `(${game.awayScore})` : ''}
                        </div>
                        <div style="font-size:12px; color:#ddd; font-style:italic;">
                            ${game.summary || ''}
                        </div>
                    </div>
                `;
            };

            if (ACTIVE_TOWN.isHome) {
                let allCards = '';
                if (sports.flora) {
                    allCards += formatGameCard(sports.flora.high_school, 'Flora HS');
                    allCards += formatGameCard(sports.flora.junior_high, 'Floyd Henson JH');
                }
                if (sports.louisville) {
                    allCards += formatGameCard(sports.louisville.high_school, 'North Clay HS');
                    allCards += formatGameCard(sports.louisville.junior_high, 'North Clay JH');
                }
                if (sports.clay_city) {
                    allCards += formatGameCard(sports.clay_city.high_school, 'Clay City HS');
                    allCards += formatGameCard(sports.clay_city.junior_high, 'Clay City JH');
                }
                displayHtml = allCards;
            } else if (sports[activeTownKey]) {
                const townData = sports[activeTownKey];
                displayHtml += formatGameCard(townData.high_school, `${ACTIVE_TOWN.primaryName} High School`);
                displayHtml += formatGameCard(townData.junior_high, `${ACTIVE_TOWN.primaryName} Junior High`);
            }

            if (displayHtml.trim() !== '') {
                sportsContainer.innerHTML = displayHtml;
                sportsContainer.style.display = 'block';
                triggerGoogleTranslateUpdate(sportsContainer);
            } else {
                sportsContainer.style.display = 'none';
            }
        });
    } catch (err) {
        console.warn("Sports engine notice:", err.message);
    }
}

// === FIREBASE DATABASE INITIALIZATION ===
function bindFirebaseServices() {
    const firebaseConfig = {
        apiKey: "AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg",
        authDomain: "smlc-fuel-monitor.firebaseapp.com",
        databaseURL: "https://smlc-fuel-monitor-default-rtdb.firebaseio.com",
        projectId: "smlc-fuel-monitor",
        storageBucket: "smlc-fuel-monitor.firebasestorage.app",
        messagingSenderId: "22397440085",
        appId: "1:22397440085:web:c00e716858ed58895bc4dc",
        measurementId: "G-FHJNXDB9BB"
    };

    try {
        if (typeof firebase === 'undefined') return;
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

        const db = firebase.database();

        initializeFirebaseGasMonitor(db);
        bindFirebaseMenuEngine(db);
        bindFirebaseLocalLinksEngine(db);
        bindFirebaseSemanticSectionsEngine(db);
        bindFirebasePartnersEngine(db);
        bindFirebaseWeatherAlertsEngine(db);
        bindFirebaseWeatherForecastEngine(db);
        bindFirebaseSportsEngine(db);
    } catch(e) {
        console.warn("Firebase initialization notice:", e.message);
    }
}

// === MENU ENGINE (LIVE RTDB) ===
function bindFirebaseMenuEngine(db) {
    if (!db) return;
    const menuContainer = document.getElementById('dynamic-menu-links');
    if (!menuContainer) return;

    try {
        if (activeFbRefMenu) activeFbRefMenu.off();
        activeFbRefMenu = db.ref(`master_county_data/global/menu`);

        activeFbRefMenu.on('value', (snapshot) => {
            const val = snapshot.val();
            if (!val) return;

            const rawItems = Array.isArray(val) ? val : Object.values(val);
            if (rawItems.length === 0) return;

            menuContainer.innerHTML = rawItems.map(item => {
                if (!item) return '';
                const name = item.name || 'Link';
                const targetUrl = attachUtmParameters(item.website || '#');
                const normImageUrl = normalizeImageUrl(item.imageUrl);
                const altText = item.alt || name;
                const linkTarget = resolveLinkTarget(item.website);

                const activeTownName = (ACTIVE_TOWN.primaryName || "").toUpperCase();
                const itemNameUpper = name.toUpperCase();
                const isActive = (activeTownName === itemNameUpper || (ACTIVE_TOWN.isHome && itemNameUpper === "HOME") || (window.location.hash || "").toUpperCase().includes(itemNameUpper.replace(/\s+/g, '-'))) ? 'class="active"' : '';

                const imgTag = normImageUrl ? `<img src="${normImageUrl}" alt="" class="menu-thumb-icon" onclick="event.preventDefault(); event.stopPropagation(); fireLightbox('${escapeJsString(normImageUrl)}', '${escapeJsString(name)}', 'MENU ASSET', '', '${escapeJsString(targetUrl)}', '${escapeJsString(altText)}')" onerror="this.style.display='none';" />` : '';

                return `
                    <li>
                        <a href="${targetUrl}" ${isActive} data-ga-label="Nav_${name.replace(/\s+/g, '')}" target="${linkTarget}" onclick="window.closeMobileMenu();">
                            ${imgTag}
                            <span>${name}</span>
                        </a>
                    </li>
                `;
            }).join('');
            triggerGoogleTranslateUpdate(menuContainer);
        });
    } catch(err) {
        console.warn("Firebase Menu Engine error:", err.message);
    }
}

// === LOCAL LINKS ENGINE (LIVE RTDB: /town_links/links) ===
function bindFirebaseLocalLinksEngine(db) {
    if (!db) return;
    const linkTarget = document.getElementById('town-links-target-container');
    if (!linkTarget) return;

    const townName = ACTIVE_TOWN.dbTownKey || "Flora";
    let townLinks = [];
    let globalLinks = [];

    const renderCombinedLinks = () => {
        try {
            const rawCombined = [...townLinks, ...globalLinks];
            const filteredLinks = rawCombined.filter(item => {
                if (!item) return false;
                const title = extractText(item.title || item.name);
                const url = item.website || item.url || "";
                return (title && url && !url.toLowerCase().startsWith('mailto:'));
            });

            if (filteredLinks.length > 0) {
                applyHighDensityScrollLimits(linkTarget, filteredLinks.length, 360);
                linkTarget.innerHTML = filteredLinks.map(link => {
                    const name = extractText(link.title || link.name) || "Local Resource";
                    const rawUrl = link.website || link.url || "#";
                    const targetUrl = attachUtmParameters(rawUrl);
                    const linkTargetAttr = resolveLinkTarget(rawUrl);
                    const displayLoc = link.location || link.town || ACTIVE_TOWN.primaryName;

                    return `
                        <div class="local-link-node" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; text-align: left;">
                            <a href="${targetUrl}" target="${linkTargetAttr}" ${linkTargetAttr === '_blank' ? 'rel="noopener"' : ''} class="local-link-title-anchor" data-ga-label="local_link" style="font-weight: bold; font-size: 15px; color: var(--link-bright-blue); text-decoration: underline;">
                                ${name}
                            </a>
                            <span style="font-size: 11px; color: #666; margin-left: 6px;">(${displayLoc})</span>
                        </div>
                    `;
                }).join('');
                triggerGoogleTranslateUpdate(linkTarget);
            }
        } catch(e) {
            console.warn("Render combined links notice:", e.message);
        }
    };

    try {
        if (activeFbRefLinksTown) activeFbRefLinksTown.off();
        if (activeFbRefLinksGlobal) activeFbRefLinksGlobal.off();

        activeFbRefLinksTown = db.ref(`master_county_data/towns/${townName}/sections/town_links/links`);
        activeFbRefLinksGlobal = db.ref(`master_county_data/global/sections/town_links/links`);

        activeFbRefLinksTown.on('value', (snap) => {
            const val = snap.val();
            townLinks = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
            renderCombinedLinks();
        });

        activeFbRefLinksGlobal.on('value', (snap) => {
            const val = snap.val();
            globalLinks = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
            renderCombinedLinks();
        });
    } catch(e) {
        console.warn("Local links subscription notice:", e.message);
    }
}

// ============================================================================
// SEMANTIC SECTIONS ENGINE (LIVE RTDB: point_of_interest, article, history, slideshow)
// Strictly displays content when data exists in Firebase
// ============================================================================
function bindFirebaseSemanticSectionsEngine(db) {
    if (!db) return;
    const townName = ACTIVE_TOWN.dbTownKey || "Flora";

    try {
        if (activeFbRefSections) activeFbRefSections.off();
        if (activeFbRefGlobalSections) activeFbRefGlobalSections.off();

        let townSectionsData = {};
        let globalSectionsData = {};

        const renderResolvedSections = () => {
            // 1. POINT OF INTEREST
            const poi = townSectionsData.point_of_interest || {};
            const poiTitleEl = document.getElementById('point-of-interest-title');
            const poiAboutEl = document.getElementById('point-of-interest-about');
            const poiDescEl = document.getElementById('point-of-interest-landmark-desc');

            if (poiTitleEl && poi.title) poiTitleEl.innerText = poi.title;
            if (poiAboutEl && poi.about_text) poiAboutEl.innerText = poi.about_text;
            if (poiDescEl && poi.landmark_description) poiDescEl.innerHTML = linkifyRawUrls(poi.landmark_description);

            const i1 = document.getElementById('point-of-interest-img-1');
            const h1 = document.getElementById('point-of-interest-header-1');
            const f1 = document.getElementById('point-of-interest-figure-1');
            const rawImg1 = poi.image1 || poi.imageUrl || poi.image;
            const img1Url = normalizeImageUrl(rawImg1);
            const alt1Text = poi.alt1 || poi.header1 || poi.title || "Point of Interest";
            if (i1 && img1Url) {
                i1.src = img1Url;
                i1.alt = '';
                i1.style.display = "block";
                if (f1) f1.style.display = "block";
                i1.onclick = () => fireLightbox(img1Url, poi.header1 || poi.title || 'Point of Interest', 'POINT OF INTEREST', poi.landmark_description || poi.about_text || '', '', alt1Text);
            } else if (i1 && !img1Url) {
                i1.style.display = "none";
                if (f1) f1.style.display = "none";
            }
            if (h1 && (poi.header1 || poi.title)) h1.innerText = poi.header1 || poi.title;

            const i2 = document.getElementById('point-of-interest-img-2');
            const h2 = document.getElementById('point-of-interest-header-2');
            const f2 = document.getElementById('point-of-interest-figure-2');
            const img2Url = normalizeImageUrl(poi.image2);
            const alt2Text = poi.alt2 || poi.header2 || "Landmark 2";
            if (i2 && img2Url) {
                i2.src = img2Url;
                i2.alt = '';
                i2.style.display = "block";
                if (f2) f2.style.display = "block";
                i2.onclick = () => fireLightbox(img2Url, poi.header2 || 'Landmark 2', 'HISTORIC LANDMARK', poi.landmark_description || poi.about_text || '', '', alt2Text);
            } else if (i2 && !img2Url) {
                i2.style.display = "none";
                if (f2) f2.style.display = "none";
            }
            if (h2 && poi.header2) h2.innerText = poi.header2;

            // 2. ARTICLE: binds /sections/article/imageUrl from Firebase to <img id="article-img">
            const art = townSectionsData.article || {};
            const artTitleEl = document.getElementById('article-title');
            const artCatEl = document.getElementById('article-category');
            const artDeckEl = document.getElementById('article-deck');
            const artBodyEl = document.getElementById('article-body');
            const artCapEl = document.getElementById('article-img-caption');

            if (artTitleEl && art.title) artTitleEl.innerText = art.title;
            if (artCatEl && art.category) artCatEl.innerText = art.category;
            if (artDeckEl && art.deck) artDeckEl.innerText = art.deck;
            if (artBodyEl && art.body) {
                artBodyEl.innerHTML = `<p style="margin-bottom:1.5em; text-align:justify; line-height:1.8;">${linkifyRawUrls(art.body)}</p>`;
            }

            // Look these up AFTER the body rewrite above, because rewriting #article-body
            // destroys any image that was sitting inside it
            let artImgEl = document.getElementById('article-img');
            let artFigure = document.getElementById('article-figure-frame');

            const rawArtUrl = String(art.imageUrl || art.image || art.image1 || '').trim();
            const artImgUrl = normalizeImageUrl(rawArtUrl);
            const artAltText = art.alt || art.title || "Featured Article Image";
            console.log('[article image]', { town: townName, raw: rawArtUrl, resolved: artImgUrl, imgElementInHtml: !!artImgEl });

            // If the HTML has no <img id="article-img">, build one above the article body
            if (!artImgEl && artImgUrl && artBodyEl && artBodyEl.parentNode) {
                artFigure = document.createElement('figure');
                artFigure.id = 'article-figure-frame';
                artFigure.style.cssText = 'margin:0 0 16px 0;';
                artImgEl = document.createElement('img');
                artImgEl.id = 'article-img';
                artFigure.appendChild(artImgEl);
                artBodyEl.parentNode.insertBefore(artFigure, artBodyEl);
            }

            if (artImgEl) {
                if (artImgUrl) {
                    artImgEl.onerror = () => {
                        console.warn('[article image] FAILED to load:', artImgUrl);
                        artImgEl.style.display = 'none';
                        if (artFigure) artFigure.style.display = 'none';
                    };
                    artImgEl.src = artImgUrl;
                    artImgEl.alt = '';
                    artImgEl.style.cssText = 'display:block; width:100%; height:auto; max-height:420px; object-fit:cover; border-radius:6px; cursor:pointer;';
                    if (artFigure) artFigure.style.display = 'block';
                    // Alt text is for the lightbox only, so the main-screen caption stays empty
                    if (artCapEl) artCapEl.innerText = '';
                    artImgEl.onclick = () => fireLightbox(artImgUrl, art.title || 'Feature', art.category || '', art.deck || art.body || '', '', artAltText);
                } else {
                    artImgEl.style.display = 'none';
                    if (artFigure) artFigure.style.display = 'none';
                }
            }

            // 3. SLIDESHOW
            const townSlides = townSectionsData.slideshow?.items ? Object.values(townSectionsData.slideshow.items).filter(Boolean) : [];
            const globalSlides = globalSectionsData.slideshow?.items ? Object.values(globalSectionsData.slideshow.items).filter(Boolean) : [];

            const blendedSlides = [];
            const maxLen = Math.max(townSlides.length, globalSlides.length);
            for (let i = 0; i < maxLen; i++) {
                if (townSlides[i]) blendedSlides.push(townSlides[i]);
                if (globalSlides[i]) blendedSlides.push(globalSlides[i]);
            }

            const viewport = document.getElementById('slideshow-viewport');
            if (viewport && blendedSlides.length > 0) {
                viewport.innerHTML = blendedSlides.map((item, idx) => {
                    const imgUrl = normalizeImageUrl(item.imageUrl);
                    const captionTitle = extractText(item.title || 'Town View');
                    const altText = item.alt || captionTitle;
                    const safeImg = escapeJsString(imgUrl);
                    const safeCaption = escapeJsString(captionTitle);
                    const safeAlt = escapeJsString(altText);
                    const safeWeb = escapeJsString(item.website || '');

                    return `
                        <div class="slider-slide ${idx === 0 ? 'active' : ''}" style="position: absolute; inset: 0; opacity: ${idx === 0 ? 1 : 0}; transition: opacity 0.8s ease-in-out; z-index: ${idx === 0 ? 2 : 1};">
                            <img src="${imgUrl}" alt="" onclick="fireLightbox('${safeImg}', '${safeCaption}', 'COMMUNITY VIEW', '', '${safeWeb}', '${safeAlt}')" style="width:100%; height:100%; object-fit:contain; background-color:#0a0a0a; cursor:pointer;" onerror="this.parentElement.style.display='none';">
                            ${captionTitle ? `<div class="slider-caption">${captionTitle}</div>` : ''}
                        </div>
                    `;
                }).join('');

                const slides = viewport.querySelectorAll('.slider-slide');
                if (slides.length > 1) {
                    let currentSlideIdx = 0;
                    viewport.__slidePaused = false;

                    if (!viewport.__slideListenersBound) {
                        viewport.__slideListenersBound = true;
                        viewport.addEventListener('mouseenter', () => { viewport.__slidePaused = true; });
                        viewport.addEventListener('mouseleave', () => { viewport.__slidePaused = false; });
                        viewport.addEventListener('touchstart', () => { viewport.__slidePaused = true; }, { passive: true });
                        viewport.addEventListener('touchend', () => { viewport.__slidePaused = false; });
                    }

                    if (globalSlideshowTicker) clearInterval(globalSlideshowTicker);
                    globalSlideshowTicker = setInterval(() => {
                        if (viewport.__slidePaused) return;
                        slides[currentSlideIdx].style.opacity = "0";
                        slides[currentSlideIdx].style.zIndex = "1";
                        currentSlideIdx = (currentSlideIdx + 1) % slides.length;
                        slides[currentSlideIdx].style.opacity = "1";
                        slides[currentSlideIdx].style.zIndex = "2";
                    }, 4000);
                }
            }

            // 4. BUSINESS SPOTLIGHT
            const spot = townSectionsData.spotlight || globalSectionsData.spotlight || {};
            const spotNameEl = document.getElementById('spotlight-asset-name');
            const spotDescEl = document.getElementById('spotlight-asset-desc');
            const spotLinkEl = document.getElementById('spotlight-asset-link');
            const spotImgEl = document.getElementById('spotlight-asset-img');

            if (spotNameEl && spot.name) spotNameEl.innerText = spot.name;
            if (spotDescEl && spot.description) spotDescEl.innerText = `"${spot.description}"`;
            if (spotLinkEl && spot.website) {
                spotLinkEl.href = attachUtmParameters(spot.website);
                spotLinkEl.target = resolveLinkTarget(spot.website);
            }

            const spotImgUrl = normalizeImageUrl(spot.imageUrl);
            const spotAltText = spot.alt || spot.name || "Business Spotlight";
            if (spotImgEl && spotImgUrl) {
                spotImgEl.src = spotImgUrl;
                spotImgEl.alt = '';
                spotImgEl.style.display = "block";
                spotImgEl.onclick = () => fireLightbox(spotImgUrl, spot.name || 'Merchant', ACTIVE_TOWN.primaryName + ', IL', spot.description || '', spot.website || '', spotAltText);
            } else if (spotImgEl && !spotImgUrl) {
                spotImgEl.style.display = "none";
            }

            // 5. TOWN HISTORY TIMELINE
            const historyTarget = document.getElementById('history-row-target');
            const historyRaw = townSectionsData.history || [];
            const historyList = (Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw)).filter(Boolean);

            if (historyTarget && historyList.length > 0) {
                historyList.sort((a, b) => {
                    const numA = parseInt(String(a.year).replace(/[^\d]/g, '')) || 0;
                    const numB = parseInt(String(b.year).replace(/[^\d]/g, '')) || 0;
                    return numA - numB;
                });

                window.historyCachedTimeline = historyList;
                applyHighDensityScrollLimits(historyTarget, historyList.length, 520);

                historyTarget.innerHTML = historyList.map((evt, idx) => {
                    const desc = evt.description || "";
                    const isLong = desc.length > 150;
                    const displayDesc = isLong ? desc.substring(0, 140) + "..." : desc;
                    const imgUrl = normalizeImageUrl(evt.imageUrl);

                    return `
                        <div class="history-card" onclick="openHistoryLightboxModal(${idx})">
                            <h2>${evt.year || '----'}</h2>
                            <h3>${evt.title || 'Historical Landmark'}</h3>
                            <p>${displayDesc}</p>
                            ${isLong ? `<span class="read-more-trigger">Read Details &rarr;</span>` : ''}
                            ${imgUrl ? `<div class="history-img-box"><img src="${imgUrl}" alt="" onerror="this.parentElement.style.display='none';"></div>` : ''}
                        </div>
                    `;
                }).join('');
            }
            triggerGoogleTranslateUpdate(document.getElementById('adaptive-time-portal-chassis'));
        };

        activeFbRefSections = db.ref(`master_county_data/towns/${townName}/sections`);
        activeFbRefGlobalSections = db.ref(`master_county_data/global/sections`);

        activeFbRefSections.on('value', (snap) => {
            townSectionsData = snap.val() || {};
            renderResolvedSections();
        });

        activeFbRefGlobalSections.on('value', (snap) => {
            globalSectionsData = snap.val() || {};
            renderResolvedSections();
        });
    } catch(err) {
        console.warn("Semantic sections engine error:", err.message);
    }
}

// === PARTNER SHOWCASE ENGINE (LIVE RTDB) ===
function bindFirebasePartnersEngine(db) {
    if (!db) return;
    const townName = ACTIVE_TOWN.dbTownKey || "Flora";

    try {
        if (activeFbRefPartnersTown) activeFbRefPartnersTown.off();
        if (activeFbRefPartnersGlobal) activeFbRefPartnersGlobal.off();

        const topGrid = document.getElementById('partners-grid-bottom');
        const bottomGrid = document.getElementById('partners-grid-top');

        const renderCombinedPartners = () => {
            const rawPool = [...window.townPartnersPool, ...window.globalPartnersPool];
            const uniquePartners = [];
            const seenNames = new Set();

            rawPool.forEach(p => {
                if (p && (p.name || p.imageUrl || p.image1)) {
                    const key = (p.name || '').trim().toLowerCase();
                    if (!seenNames.has(key)) {
                        seenNames.add(key);
                        uniquePartners.push(p);
                    }
                }
            });

            if (uniquePartners.length === 0) return;

            const upperPool = [...uniquePartners];
            const lowerPool = [...uniquePartners].reverse();
            if (lowerPool.length > 2) {
                const shiftCount = Math.floor(lowerPool.length / 2);
                for (let i = 0; i < shiftCount; i++) {
                    lowerPool.push(lowerPool.shift());
                }
            }

            if (topGrid) renderCarouselPartnerRotator(topGrid, upperPool, 'top_strip', 0);
            if (bottomGrid) renderCarouselPartnerRotator(bottomGrid, lowerPool, 'bottom_strip', 2);
        };

        activeFbRefPartnersTown = db.ref(`master_county_data/towns/${townName}/sections/partners`);
        activeFbRefPartnersGlobal = db.ref(`master_county_data/global/sections/partners`);

        activeFbRefPartnersTown.on('value', (snap) => {
            const val = snap.val();
            window.townPartnersPool = val ? (Array.isArray(val) ? val : Object.values(val)).filter(Boolean) : [];
            renderCombinedPartners();
        });

        activeFbRefPartnersGlobal.on('value', (snap) => {
            const val = snap.val();
            window.globalPartnersPool = val ? (Array.isArray(val) ? val : Object.values(val)).filter(Boolean) : [];
            renderCombinedPartners();
        });
    } catch(err) {
        console.warn("Partners engine error:", err.message);
    }
}

function renderCarouselPartnerRotator(containerElement, partnerPool, stripKey, seedOffset = 0) {
    if (!containerElement || !partnerPool.length) return;

    if (stripKey === 'top_strip' && topCarouselInterval) {
        clearInterval(topCarouselInterval);
        topCarouselInterval = null;
    }
    if (stripKey === 'bottom_strip' && bottomCarouselInterval) {
        clearInterval(bottomCarouselInterval);
        bottomCarouselInterval = null;
    }

    const isMobileOrTablet = window.innerWidth < 1024;
    let poolIndex = seedOffset % partnerPool.length;

    // Pause state lives on the element so re-renders don't stack listeners
    containerElement.__carouselPaused = false;
    containerElement.__hoverStartTime = 0;

    const createPartnerMarkup = (partner, slotIdx) => {
        const imgUrl = normalizeImageUrl(partner.imageUrl || partner.image1);
        const name = partner.name || 'Local Community Partner';
        const rawUrl = partner.website || '#';
        const link = attachUtmParameters(rawUrl);
        const linkTargetAttr = resolveLinkTarget(rawUrl);
        const altText = partner.alt || name;

        return `
            <div class="community-partner-card" data-partner-name="${escapeJsString(name)}" style="transition: transform 0.35s ease, opacity 0.35s ease;">
                <div class="partner-logo-container">
                    <img class="partner-logo-asset" src="${imgUrl}" alt="" onclick="fireLightbox('${escapeJsString(imgUrl)}', '${escapeJsString(name)}', 'COMMUNITY DIRECTORY', 'Local Sponsor', '${escapeJsString(link)}', '${escapeJsString(altText)}')" style="cursor:pointer;" onerror="this.closest('.community-partner-card').style.display='none';">
                </div>
                <h4 class="partner-title">${name}</h4>
                <a class="directory-tile-link" href="${link}" target="${linkTargetAttr}" ${linkTargetAttr === '_blank' ? 'rel="noopener"' : ''} data-ga-label="partner_cta">Visit Partner &rarr;</a>
            </div>
        `;
    };

    const visibleCount = isMobileOrTablet ? 1 : Math.min(5, partnerPool.length);
    const initialCards = [];
    for (let i = 0; i < visibleCount; i++) {
        const p = partnerPool[(poolIndex + i) % partnerPool.length];
        initialCards.push(createPartnerMarkup(p, i));
    }
    containerElement.innerHTML = initialCards.join('');

    if (!containerElement.__carouselListenersBound) {
        containerElement.__carouselListenersBound = true;

        const onPauseEnter = () => {
            containerElement.__carouselPaused = true;
            containerElement.__hoverStartTime = Date.now();
        };

        const onPauseLeave = () => {
            containerElement.__carouselPaused = false;
            if (containerElement.__hoverStartTime > 0) {
                const durationSec = Math.round((Date.now() - containerElement.__hoverStartTime) / 1000);
                const activeCard = containerElement.querySelector('.community-partner-card');
                const pName = activeCard ? activeCard.getAttribute('data-partner-name') : 'Unknown';
                if (durationSec >= 1) {
                    trackGa4Event('partner_engagement_time', {
                        partner_name: pName,
                        seconds_viewed: durationSec
                    });
                }
                containerElement.__hoverStartTime = 0;
            }
        };

        containerElement.addEventListener('mouseenter', onPauseEnter);
        containerElement.addEventListener('mouseleave', onPauseLeave);
        containerElement.addEventListener('touchstart', onPauseEnter, { passive: true });
        containerElement.addEventListener('touchend', onPauseLeave);
    }

    containerElement.querySelectorAll('.community-partner-card').forEach(card => {
        const pName = card.getAttribute('data-partner-name');
        trackGa4Event('partner_card_impression', { partner_name: pName, strip: stripKey });
    });

    const slideDuration = isMobileOrTablet ? 3800 : 5000;
    const intervalId = setInterval(() => {
        if (containerElement.__carouselPaused) return;

        poolIndex = (poolIndex + 1) % partnerPool.length;
        const nextPartner = partnerPool[poolIndex];

        const cards = containerElement.querySelectorAll('.community-partner-card');
        if (cards.length > 0) {
            cards.forEach(c => {
                c.style.opacity = '0.3';
                c.style.transform = 'scale(0.96)';
            });

            setTimeout(() => {
                if (isMobileOrTablet) {
                    containerElement.innerHTML = createPartnerMarkup(nextPartner, 0);
                } else {
                    const newCards = [];
                    for (let i = 0; i < visibleCount; i++) {
                        const p = partnerPool[(poolIndex + i) % partnerPool.length];
                        newCards.push(createPartnerMarkup(p, i));
                    }
                    containerElement.innerHTML = newCards.join('');
                }

                const updatedCards = containerElement.querySelectorAll('.community-partner-card');
                updatedCards.forEach(c => {
                    c.style.opacity = '1';
                    c.style.transform = 'scale(1)';
                    const pName = c.getAttribute('data-partner-name');
                    trackGa4Event('partner_card_impression', { partner_name: pName, strip: stripKey });
                });
            }, 300);
        }
    }, slideDuration);

    if (stripKey === 'top_strip') topCarouselInterval = intervalId;
    if (stripKey === 'bottom_strip') bottomCarouselInterval = intervalId;
}

// === FUEL MONITOR BILLBOARD (LIVE RTDB) ===
function initializeFirebaseGasMonitor(db) {
    const box = document.getElementById('fuel-monitor-target-box') || document.querySelector('.fuel-monitor-billboard-card');
    if (!box || !db) return;
    const targetTowns = ACTIVE_TOWN.gasKey || ["flora"];
    const ids = Object.keys(FUEL_STATIONS).filter(id => targetTowns.includes(FUEL_STATIONS[id].town));
    if (!ids.length) return;

    let prices = {}, network = {};
    const refresh = () => startGasRotator(Object.assign({}, network, prices), FUEL_STATIONS, ids, box);
    try {
        if (window.__fuelRefs) window.__fuelRefs.forEach(r => r.off());
        const r1 = db.ref('fuel_prices'), r2 = db.ref('billboard_network');
        window.__fuelRefs = [r1, r2];
        r1.on('value', s => { prices = s.val() || {}; refresh(); });
        r2.on('value', s => { network = s.val() || {}; refresh(); });
    } catch (e) {
        console.warn('Gas monitor notice:', e.message);
    }
}

function startGasRotator(data, stationConfigs, stationIds, container) {
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
    const updateUrl = cleanRawUrl(DEFAULT_APP_CONFIG.regional_endpoints.gas_widget);
    container.style.cursor = 'pointer';
    container.onclick = () => window.open(attachUtmParameters(updateUrl), '_blank', 'noopener');

    const money = v => { const n = parseFloat(String(v === undefined || v === null ? '' : v).replace(/[^0-9.]/g, '')); return n > 0 ? `$${n.toFixed(2)}` : null; };
    const live = stationIds.map(id => {
        const info = data[id] || {};
        const reg = money(info.reg !== undefined ? info.reg : (info.regular !== undefined ? info.regular : info.price));
        const dsl = money(info.dsl !== undefined ? info.dsl : info.diesel);
        const when = parseFuelDate(info.date || info.updated);
        const fresh = !when || (Date.now() - when.getTime()) <= MAX_AGE_DAYS * 86400000;
        return (reg || dsl) && fresh ? { cfg: stationConfigs[id], info: info, reg: reg, dsl: dsl, when: when } : null;
    }).filter(Boolean);

    const heading = `<div class="sidebar-widget-title">${escapeHtml(ACTIVE_TOWN.isHome ? 'CLAY COUNTY' : ACTIVE_TOWN.primaryName.toUpperCase())} FUEL INDEX MONITOR</div>`;
    if (!live.length) {
        container.innerHTML = heading + `<div class="fuel-note">To show prices, update.<br>Click here to open the price update page.</div>`;
        return;
    }

    const block = s => `
        <div class="fuel-station-block">
            <div class="fuel-station-header">
                <div class="station-logo-frame"><img src="//raw.githubusercontent.com/skventuresigns-design/smlc/main/gas-prices/image/${encodeURIComponent(s.cfg.logo)}" alt="" onerror="this.onerror=null; this.src='//raw.githubusercontent.com/skventuresigns-design/media/main/smlc-web.png';"></div>
                <div class="station-meta-title">${escapeHtml(s.info.name || s.cfg.name)} (${escapeHtml(s.cfg.display)})</div>
            </div>
            <div class="fuel-pricing-grid">
                <div class="price-box"><span class="price-type-label">REGULAR</span><span class="price-value-regular">${s.reg || '---'}</span></div>
                <div class="price-box"><span class="price-type-label">DIESEL</span><span class="price-value-diesel">${s.dsl || '---'}</span></div>
            </div>
            <div class="sync-timestamp-label">Updated: ${escapeHtml(s.when ? formatToCentralTime(s.when.toISOString()) : (s.info.date || 'Live'))}</div>
        </div>`;

    let start = 0;
    const draw = () => {
        const count = Math.min(2, live.length - start);
        const shown = live.slice(start, start + count);
        container.innerHTML = heading + shown.map(block).join('') + `<div class="sync-timestamp-label">Click to update prices</div>`;

        start += 2;
        if (start >= live.length) {
            start = 0;
        }
    };
    draw();
    if (live.length > 2) gasMonitorRotator = setInterval(draw, 6000);
}

// === COMMUNITY BULLETIN (LIVE FIRESTORE onSnapshot) ===
function loadCommunityBulletinFeed() {
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller) return;

    if (unsubscribeFirestoreEvents) {
        unsubscribeFirestoreEvents();
        unsubscribeFirestoreEvents = null;
    }

    const renderEvents = (events) => {
        const now = Date.now();
        window.calendarCachedEvents = events
            .filter(e => e && e.title && (!e.end || new Date(e.end).getTime() > now))
            .sort((a, b) => new Date(a.start) - new Date(b.start));
        const list = window.calendarCachedEvents;
        if (!list.length) { scroller.innerHTML = '<div class="feed-loading-placeholder">No upcoming events right now.</div>'; return; }

        applyHighDensityScrollLimits(scroller, list.length, 500);
        const subG = list[0].subscribeGoogle || '';
        const subI = (list[0].subscribeICal || '').replace(/^https?:/i, 'webcal:');
        const banner = (txt) => (!subG && !subI) ? '' : `
            <div style="background:#f8f9fa; border:1px solid #e2e8f0; padding:10px; border-radius:6px; margin:12px 0; text-align:center;">
                <span style="font-size:12px; font-weight:bold; color:#222; display:block; margin-bottom:6px; text-transform:uppercase;">${txt}</span>
                <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
                    ${subG ? `<a href="${escapeHtml(subG)}" target="_blank" rel="noopener" style="font-size:11px; font-weight:bold; color:#fff !important; background:#1a73e8; padding:8px 12px; border-radius:4px; text-decoration:none;" data-ga-label="global_cal_google">Google Calendar</a>` : ''}
                    ${subI ? `<a href="${escapeHtml(subI)}" style="font-size:11px; font-weight:bold; color:#fff !important; background:#1e7e34; padding:8px 12px; border-radius:4px; text-decoration:none;" data-ga-label="global_cal_ical">Apple / iCal</a>` : ''}
                </div>
            </div>`;

        const items = list.map((ev, idx) => {
            const loc = ev.addr || ev.location || (ACTIVE_TOWN.primaryName + ', IL');
            const img = normalizeImageUrl(ev.image);
            const nav = buildTurnByTurnNavigationUrl(loc);
            const when = ev.displayDate || cleanCalendarDate(ev.start);
            return `
                <div class="divi-event-item" style="margin-bottom:15px; padding-bottom:12px; border-bottom:1px dashed #888; overflow:hidden;">
                    ${img ? `<div style="float:right; margin:0 0 10px 12px;"><img src="${escapeHtml(img)}" alt="" onclick="openCalendarLightboxModal(${idx})" style="width:85px; height:85px; object-fit:cover; border-radius:6px; border:2px solid #222; cursor:pointer; display:block;" onerror="this.parentElement.style.display='none';"></div>` : ''}
                    <div class="divi-event-date" style="font-weight:bold;">${escapeHtml(when)}</div>
                    <div class="divi-event-title" style="font-size:16px; font-weight:bold; margin:4px 0;">${escapeHtml(ev.title)}</div>
                    <div class="event-info-text" style="font-size:13px;"><strong>Where:</strong> <a href="${escapeHtml(nav)}" target="_blank" rel="noopener" class="event-nav-link" style="font-weight:bold; text-decoration:underline;">${escapeHtml(loc)} &rarr; Directions</a></div>
                    <div style="font-size:13px; margin-top:4px;">${escapeHtml(ev.descShort || ev.desc || '')}</div>
                    <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                        <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})" style="font-weight:bold; cursor:pointer; font-size:12px; text-decoration:underline;">Read Details &rarr;</div>
                        <span style="opacity:.5; font-size:11px;">|</span>
                        <a href="${escapeHtml(googleCalUrlForEvent(ev, loc))}" target="_blank" rel="noopener" style="font-size:11px; color:#4f9df5 !important; font-weight:bold;" data-ga-label="single_cal_google">+ Google Cal</a>
                        <span style="opacity:.5; font-size:11px;">|</span>
                        <a href="${icsDataForEvent(ev, loc)}" download="${escapeHtml(String(ev.title).replace(/\s+/g, '_'))}.ics" style="font-size:11px; color:#5ac47a !important; font-weight:bold;" data-ga-label="single_cal_ical">+ iCal (.ics)</a>
                    </div>
                </div>`;
        }).join('');

        scroller.innerHTML = banner('Subscribe to Full County Calendar') + items + banner('County-Wide Calendar Subscriptions');
        triggerGoogleTranslateUpdate(scroller);
    };

    try {
        if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
            unsubscribeFirestoreEvents = firebase.firestore().collection('smlc_events').onSnapshot((snap) => {
                const events = [];
                snap.forEach(d => events.push(d.data()));
                renderEvents(events);
            }, async (err) => {
                console.warn('Firestore real-time events failed, using REST fallback:', err.message);
                const restEvents = await fetchCollectionRest('smlc_events');
                renderEvents(restEvents);
            });
        } else {
            fetchCollectionRest('smlc_events').then(renderEvents);
        }
    } catch (err) {
        console.warn('Bulletin feed notice:', err.message);
    }
}

// ============================================================================
// LOCAL NEWS DISPATCHES: Direct Realtime Listener (LIVE FIRESTORE onSnapshot)
// ============================================================================
function loadLocalNewsDispatches() {
    const targetGrid = document.getElementById('news-matrix-target');
    if (!targetGrid) return;

    if (unsubscribeFirestoreNews) {
        unsubscribeFirestoreNews();
        unsubscribeFirestoreNews = null;
    }

    const renderNews = (rawNewsList) => {
        if (!Array.isArray(rawNewsList) || rawNewsList.length === 0) {
            targetGrid.innerHTML = `<div style="text-align:center; padding:20px; font-style:italic; color:#666;">No localized dispatches found for ${ACTIVE_TOWN.primaryName}.</div>`;
            return;
        }

        window.newsCacheBlock = rawNewsList.filter(item => {
            if (!item) return false;
            if (ACTIVE_TOWN.isHome) return true;

            const itemNumericTags = Array.isArray(item.tags)
                ? item.tags.map(t => Number(t)).filter(n => !isNaN(n))
                : [];

            if (itemNumericTags.includes(0)) return true;

            const allowedAreaIds = ACTIVE_TOWN.linkedAreaIds || [ACTIVE_TOWN.areaId];
            return itemNumericTags.some(id => allowedAreaIds.includes(id));
        });

        window.newsCacheBlock = window.newsCacheBlock
            .filter(s => isWithinMaxAge(s.date))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (window.newsCacheBlock.length > 0) {
            applyHighDensityScrollLimits(targetGrid, window.newsCacheBlock.length, 520);
            targetGrid.innerHTML = window.newsCacheBlock.map((story, idx) => {
                const rawStory = story.full_story || story.excerpt || story.description || '';
                const isLong = rawStory.length > 150;
                const displayStory = isLong ? rawStory.substring(0, 140) + "..." : rawStory;
                const cleanTitle = story.title || 'Local News Dispatch';
                const imgUrl = normalizeImageUrl(story.image);

                return `
                    <div class="news-matrix-card" style="background:#fff; border:1px solid #ddd; padding:18px; border-radius:6px; margin-bottom:16px;">
                        ${imgUrl ? `<img src="${imgUrl}" alt="" style="width:100%; height:160px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="openNewsLightboxModal(${idx})" onerror="this.style.display='none';">` : ''}
                        <div style="font-size:12px; color:var(--primary); font-weight:bold; margin-top:10px;">${cleanCalendarDate(story.date)}${story.source_name ? ' • ' + escapeHtml(story.source_name) : ''}</div>
                        <div style="font-weight:bold; font-size:16px; margin:6px 0; color:#1a1a1a;">${escapeHtml(cleanTitle)}</div>
                        <div style="font-size:14px; color:#444;">${linkifyRawUrls(displayStory)}</div>
                        ${isLong ? `<div class="read-more-btn" onclick="openNewsLightboxModal(${idx})" style="color: var(--primary); font-weight: bold; cursor: pointer; margin-top: 10px;">Read Full Dispatch &rarr;</div>` : ''}
                    </div>
                `;
            }).join('');
            triggerGoogleTranslateUpdate(targetGrid);
        } else {
            targetGrid.innerHTML = `<div style="text-align:center; padding:20px; font-style:italic; color:#666;">No localized dispatches found for ${ACTIVE_TOWN.primaryName}.</div>`;
        }
    };

    const runRestFallback = async () => {
        const restUrl = "https://firestore.googleapis.com/v1/projects/smlc-fuel-monitor/databases/(default)/documents/local_news";
        const res = await fetch(restUrl);
        if (res.ok) {
            const restData = await res.json();
            if (restData.documents && Array.isArray(restData.documents)) {
                const rawList = restData.documents.map(d => {
                    const f = d.fields || {};
                    return {
                        title: unwrapFs(f.title) || '',
                        date: unwrapFs(f.date) || '',
                        excerpt: unwrapFs(f.excerpt) || '',
                        full_story: unwrapFs(f.full_story) || '',
                        image: unwrapFs(f.image) || '',
                        link: unwrapFs(f.link) || '',
                        location: unwrapFs(f.location) || '',
                        source_name: unwrapFs(f.source_name) || '',
                        source_url: unwrapFs(f.source_url) || '',
                        tags: unwrapFs(f.tags) || [],
                        tagNames: unwrapFs(f.tagNames) || [],
                        towns: unwrapFs(f.towns) || []
                    };
                });
                renderNews(rawList);
            }
        }
    };

    try {
        if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
            unsubscribeFirestoreNews = firebase.firestore().collection("local_news").onSnapshot((snap) => {
                const news = [];
                snap.forEach(d => news.push(d.data()));
                renderNews(news);
            }, (err) => {
                console.warn("Firestore real-time news failed, using REST fallback:", err.message);
                runRestFallback();
            });
        } else {
            runRestFallback();
        }
    } catch(e) {
        console.warn("Firestore live news notice:", e.message);
    }
}

// === TOWN HERO UI ENGINE ===
function hydrateTownHeroUI() {
    const badgeEl = document.getElementById('hero-seat-badge');
    const titleEl = document.getElementById('hero-town-title');
    const metaEl = document.getElementById('hero-established-meta');
    const marqueeEl = document.getElementById('hero-river-marquee');

    if (badgeEl && ACTIVE_TOWN.seatBadge) badgeEl.innerText = ACTIVE_TOWN.seatBadge;
    if (titleEl) titleEl.innerText = `${ACTIVE_TOWN.primaryName}, Illinois`;
    if (metaEl && ACTIVE_TOWN.estMeta) metaEl.innerText = ACTIVE_TOWN.estMeta;
    if (marqueeEl && ACTIVE_TOWN.riverMarquee) marqueeEl.innerText = ACTIVE_TOWN.riverMarquee;

    if (ACTIVE_TOWN.themeAccent) {
        document.documentElement.style.setProperty('--primary', ACTIVE_TOWN.themeAccent);
    }
}

function updateNavigationActiveState() {
    const currentHash = (window.location.hash || "#/flora").toLowerCase();
    document.querySelectorAll('#dynamic-menu-links a, .menu-links a').forEach(link => {
        const href = (link.getAttribute("href") || "").toLowerCase();
        if (currentHash && href === currentHash) {
            link.classList.add("active");
        } else if (!currentHash && href.includes(ACTIVE_TOWN.primaryName.toLowerCase().replace(/\s+/g, '-'))) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

function handleSPAHashNavigation() {
    resetAllActiveTimers();
    window.closeMobileMenu();
    ACTIVE_TOWN = getActiveTownConfig();
    document.body.setAttribute("data-town", ACTIVE_TOWN.primaryName.toUpperCase());
    document.title = `${ACTIVE_TOWN.primaryName}, IL - SMLC Digital Town Square Portal`;

    hydrateTownHeroUI();
    updateNavigationActiveState();

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
            page_title: ACTIVE_TOWN.primaryName,
            page_location: window.location.href,
            page_path: window.location.pathname + (window.location.hash || '')
        });
    }

    bindFirebaseServices();
    loadCommunityBulletinFeed();
    loadLocalNewsDispatches();
}

window.addEventListener('hashchange', () => {
    handleSPAHashNavigation();
});

window.addEventListener('DOMContentLoaded', () => {
    handleSPAHashNavigation();
});
