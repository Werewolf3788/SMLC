/* ==========================================================================
   Active Version: v3.7.0
   File: universaltown.js
   Project: SMLC County Portal Semantic Master Script
   Description: Complete multi-town engine connecting 100% to Firebase (RTDB & Firestore).
                - Zero GitHub endpoints (all data, news, telemetry, and assets pull from Firebase)
                - Direct Cloud Firestore query for /local_news with auto REST API fallback
                - Integer-based AREA_IDS tag filtering:
                    * Tag 0 = Clay County Global (visible on Home & all towns)
                    * Individual town IDs match integer array tags (e.g., Flora = 2)
                    * Multi-town stories appear seamlessly across all matching town portals
                - WNOI Copyright & Link suppression fully removed (original sources preserved)
                - Layout swap: Point of Interest in Discover spotlight; Slideshow above History
                - Guaranteed POI image rendering with interactive lightbox hooks
                - Merged POI & History text in About section; removed "[Town] Discover History" header
                - Partner ad carousel strip positioned immediately above the Thank You section
                - Weather widget docked to navigation bar row with responsive mobile breakdown
                - 5-Day Forecast Lightbox Modal triggered on desktop & mobile click
                - Central Time (America/Chicago) default for all event, alert, and weather dates/times
                - Turn-by-turn navigation links on event addresses (Apple Maps on iOS, Google Maps on Android/PC)
                - Dynamic GA4 Tag Injection (G-FHJNXDB9BB) with SPA Hash Route Pageview Tracking
                - Town-specific & countywide Sports Scoreboard Engine
                - Persistent 24-hour New York timestamp & version in footer
                - v3.7.0: Accessibility: dialogs (focus, Esc, Tab trap), keyboard-reachable pictures/cards,
                  pills as tabs, announcements, decorations hidden from screen readers, heading order,
                  text sizes in rem, device contrast/forced colors, Accessibility panel
                - v3.6.0: Events read from Firestore /smlc_events (2 months ahead) with attachment thumbnails,
                  attachment links + lightbox; every picture opens the lightbox; alt text only shown there
                - v3.5.0: Partner strips show only whole cards (5+ on desktop), refit on resize, no scrollbars
                - v3.5.0: Header #0C5E75 in light view; Quick Answers styling; Event structured data (SEO/AEO)
                - v3.4.0: Weather & holiday background effects matching Clay County weather (rain, storm,
                  snow, clouds, stars), fall leaves, holidays; snow builds up on cards; on/off switch
                - v3.3.0: App-style bottom nav (Home / Towns / More) on phones + portrait tablets
                - v3.3.0: Calendar countdown (1 hr), LIVE NOW, Ending Soon (30 min), ended events hidden
                - v3.3.0: Everything in Central time + "your time" note when the device isn't on Central
                - v3.3.0: News filtered by town NAMES (towns/tagNames), number tags as backup
                - v3.3.0: Gas stations per town from sections/gas_widget; ScoreStream sports per town
                - v3.2.0: Fuel widget reads /fuel_prices (not /billboard_network); no fake default prices
                - v3.2.0: Sections engine targets pill-layout IDs (point-of-interest-*, article-*)
                  with legacy ID fallback; failed/missing images show an
                  "Image isn't available right now" notice instead of a broken icon
   Timestamp: 2026-10-25 05:25 EDT (New York)
   ========================================================================== */

// Line 31: Dynamic Google Analytics 4 Injection & Initialization Engine
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

// Line 54: Google Translate Global Callback & Dynamic Mutation Scanner
window.googleTranslateElementInit = function() {
    try {
        if (window.google && window.google.translate) {
            new window.google.translate.TranslateElement({
                pageLanguage: 'en',
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
            }, 'google_translate_element');
        }
    } catch(e) {
        console.warn("Google Translate initialization notice:", e.message);
    }
};

function triggerGoogleTranslateUpdate(targetNode) {
    if (!targetNode) return;
    try {
        if (window.google && window.google.translate && window.google.translate.TranslateElement) {
            const fontTags = document.querySelectorAll('font[color]');
            if (fontTags.length > 0) {
                targetNode.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    } catch(e) {
        // Soft fail if translate script is still loading
    }
}

// Line 82: Master Town Alias & Numeric Area ID Map (Strict Integer Matching)
const TOWN_ALIAS_MAP = {
    "HOME": { 
        primaryName: "Clay County", 
        dbTownKey: "Global", 
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
        dbTownKey: "Global", 
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
        themeAccent: "#0C2890" 
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
        linkedAreaIds: [1, 7, 9], // Louisville, Bible Grove, Hoosier (Shared 62858 ZIP Area)
        linkedTownNames: ["Louisville", "Bible Grove", "Hoosier"],
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
        themeAccent: "#4A154B" 
    }
};

// Line 185: Active Town Config Resolver
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

// Global Timers and Subscriptions
let globalSlideshowTicker = null;
let gasMonitorRotator = null;
let topCarouselInterval = null;
let bottomCarouselInterval = null;

let activeFbRefSections = null;
let activeFbRefGlobalSections = null;
let activeFbRefLinksTown = null;
let activeFbRefLinksGlobal = null;
let activeFbRefMenu = null;
let activeFbRefFooter = null;
let activeFbRefPartnersTown = null;
let activeFbRefPartnersGlobal = null;
let activeFbRefWeather = null;
let activeFbRefForecast = null;
let activeFbRefSports = null;

window.calendarCachedEvents = [];
window.historyCachedTimeline = [];
window.newsCacheBlock = [];
window.townPartnersPool = [];
window.globalPartnersPool = [];
window.fiveDayForecastCache = [];

// Line 246: Reset Intervals
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

function normalizeImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let url = rawUrl.trim();
    if (!url || url === 'null' || url === 'undefined') return null;

    if (url.includes('drive.google.com')) {
        const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/) || url.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `//lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
        }
    }
    // github.com/.../blob/... page links -> raw file links
    if (/^(https?:)?\/\/(www\.)?github\.com\/.+\/blob\//.test(url)) {
        url = url.replace(/(www\.)?github\.com/, 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    // Dropbox share links -> direct file
    if (url.includes('dropbox.com')) {
        url = /[?&]dl=0/.test(url) ? url.replace(/([?&])dl=0/, '$1raw=1') : (url.includes('raw=1') ? url : url + (url.includes('?') ? '&' : '?') + 'raw=1');
    }
    return url.replace(/^https?:/, '');
}

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
    const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    const linkify = (chunk) => chunk.replace(urlPattern, (match) => {
        let cleanHref = match;
        if (!cleanHref.match(/^https?:\/\//i)) {
            cleanHref = '//' + cleanHref;
        }
        return `<a href="${attachUtmParameters(cleanHref)}" target="_blank" rel="noopener" style="color:var(--link-bright-blue); text-decoration:underline; word-break:break-all;">${match}</a>`;
    });
    // Only turn plain-text URLs into links: leave existing HTML tags (and text inside links) alone
    let insideLink = 0;
    return String(text).split(/(<[^>]+>)/g).map(part => {
        if (part.startsWith('<')) {
            if (/^<a[\s>]/i.test(part)) insideLink++;
            else if (/^<\/a>/i.test(part)) insideLink = Math.max(0, insideLink - 1);
            return part;
        }
        return insideLink ? part : linkify(part);
    }).join('');
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

// Global Default: Format timestamps into Central Time (America/Chicago)
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
        // A plain "2026-10-30" is a calendar day, not midnight UTC (which is the day before in Central)
        const plainDay = String(rawDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (plainDay) {
            return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                .format(new Date(Date.UTC(+plainDay[1], +plainDay[2] - 1, +plainDay[3], 12)));
        }
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

// ============================================================================
// CENTRAL TIME ENGINE
// SMLC runs on Central time (America/Chicago). Every event/clock is computed as a
// real moment in time, so countdowns are correct no matter where the viewer is.
// When the viewer's device is NOT on Central time, a small "your time" note is shown.
// ============================================================================
const SMLC_TZ = 'America/Chicago';
const SMLC_TZ_LABEL = 'CT';
const SMLC_DEFAULT_EVENT_HOURS = 2;      // events with no end time are treated as 2 hours long
const SMLC_COUNTDOWN_LEAD_MIN = 60;      // "Starts in..." shows 1 hour before start
const SMLC_ENDING_SOON_MIN = 30;         // "Ending soon" shows in the last 30 minutes

function getViewerTimeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || SMLC_TZ; } catch (e) { return SMLC_TZ; }
}

function tzOffsetMs(date, tz) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date);
    const m = {};
    parts.forEach(p => { m[p.type] = p.value; });
    const asUtc = Date.UTC(+m.year, +m.month - 1, +m.day, (+m.hour) % 24, +m.minute, +m.second);
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Central wall-clock time -> real Date (DST-safe). */
function centralWallTimeToDate(y, mo, d, h = 0, mi = 0) {
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    const off1 = tzOffsetMs(new Date(guess), SMLC_TZ);
    let t = guess - off1;
    const off2 = tzOffsetMs(new Date(t), SMLC_TZ);
    if (off2 !== off1) t = guess - off2;
    return new Date(t);
}

/** Calendar day (in Central) for a date string. "2026-10-30" is taken as-is. */
function centralYmd(rawDate) {
    if (!rawDate) return null;
    const str = String(rawDate).trim();
    const plain = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (plain) return { y: +plain[1], m: +plain[2], d: +plain[3] };
    const dt = new Date(str);
    if (isNaN(dt.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: SMLC_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(dt);
    const m = {};
    parts.forEach(p => { m[p.type] = p.value; });
    return { y: +m.year, m: +m.month, d: +m.day };
}

/** "7:00 PM", "7pm", "19:00" -> { h, mi, hasMeridiem } */
function parseClockText(txt) {
    if (!txt) return null;
    const t = String(txt).trim().toLowerCase().replace(/\./g, '');
    const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\b/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const mi = m[2] ? parseInt(m[2], 10) : 0;
    const mer = m[3] ? m[3][0] : null;
    if (h > 23 || mi > 59) return null;
    if (mer === 'p' && h < 12) h += 12;
    if (mer === 'a' && h === 12) h = 0;
    return { h, mi, hasMeridiem: !!mer, rawHour: parseInt(m[1], 10) };
}

/**
 * Works out the real start/end of a calendar item.
 * Supports: ISO start/end fields, or date + time text like "7:00 PM - 10:00 PM" (Central).
 * Returns { start: Date, end: Date, allDay: bool } or null.
 */
function getEventWindow(item) {
    if (!item) return null;
    const HOUR = 3600000;

    if (item.start && !isNaN(new Date(item.start).getTime())) {
        let start = new Date(item.start);
        let end = item.end && !isNaN(new Date(item.end).getTime()) ? new Date(item.end) : null;
        const allDay = item.isAllDay === true;
        if (allDay) {
            const ymd = centralYmd(item.start);
            start = centralWallTimeToDate(ymd.y, ymd.m, ymd.d);
            if (!end || end <= start) end = new Date(start.getTime() + 24 * HOUR);
        }
        if (!end || end <= start) end = new Date(start.getTime() + SMLC_DEFAULT_EVENT_HOURS * HOUR);
        return { start, end, allDay };
    }

    const rawDate = item.date || item.displayDate;
    const rawTime = String(item.time || item.displayTime || '').trim();

    if (rawTime && /\d{4}-\d{2}-\d{2}T/.test(rawTime)) {
        const start = new Date(rawTime);
        if (!isNaN(start.getTime())) return { start, end: new Date(start.getTime() + SMLC_DEFAULT_EVENT_HOURS * HOUR), allDay: false };
    }

    const ymd = centralYmd(rawDate);
    if (!ymd) return null;

    const pieces = rawTime.split(/\s*(?:-|–|—|\bto\b|\buntil\b)\s*/i).filter(Boolean);
    let p1 = parseClockText(pieces[0]);
    const p2 = pieces.length > 1 ? parseClockText(pieces[1]) : null;

    if (!p1) {
        const start = centralWallTimeToDate(ymd.y, ymd.m, ymd.d);
        return { start, end: new Date(start.getTime() + 24 * HOUR), allDay: true };
    }
    // "7 - 10 PM": borrow the end's AM/PM for the start
    if (p2 && !p1.hasMeridiem && p2.hasMeridiem) {
        const isPm = p2.h >= 12;
        let h = (p1.rawHour % 12) + (isPm ? 12 : 0);
        if (h > p2.h) h -= 12; // e.g. "11 - 1 PM" -> 11 AM
        p1 = { ...p1, h: Math.max(0, h) };
    }

    const start = centralWallTimeToDate(ymd.y, ymd.m, ymd.d, p1.h, p1.mi);
    let end = p2 ? centralWallTimeToDate(ymd.y, ymd.m, ymd.d, p2.h, p2.mi) : new Date(start.getTime() + SMLC_DEFAULT_EVENT_HOURS * HOUR);
    if (end <= start) end = new Date(end.getTime() + 24 * HOUR); // runs past midnight
    return { start, end, allDay: false };
}

function formatClockIn(date, tz, withZone = true) {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true, ...(withZone ? { timeZoneName: 'short' } : {}) }).format(date);
}

/** True when the viewer's clock reads differently from Central at that moment. */
function viewerDiffersFromCentral(atDate = new Date()) {
    const viewerTz = getViewerTimeZone();
    if (viewerTz === SMLC_TZ) return false;
    try { return tzOffsetMs(atDate, viewerTz) !== tzOffsetMs(atDate, SMLC_TZ); } catch (e) { return false; }
}

/** "Your time: 8:00 PM – 11:00 PM EDT" (adds the day if it differs from the Central day) */
function buildViewerTimeNote(win) {
    if (!win || win.allDay || !viewerDiffersFromCentral(win.start)) return '';
    const viewerTz = getViewerTimeZone();
    const dayFmt = (tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(win.start);
    const dayNote = dayFmt(viewerTz) !== dayFmt(SMLC_TZ) ? `${dayFmt(viewerTz)}, ` : '';
    return `Your time: ${dayNote}${formatClockIn(win.start, viewerTz, false)} &ndash; ${formatClockIn(win.end, viewerTz)}`;
}

function minutesLeftText(ms) {
    const mins = Math.ceil(ms / 60000);
    if (mins >= 60) return '1 HR';
    if (mins <= 1) return '1 MIN';
    return `${mins} MIN`;
}

/** Status for an event right now: ended | upcoming | starting | live | ending */
function getEventStatus(win, now = Date.now()) {
    if (!win) return { state: 'upcoming', text: '' };
    const s = win.start.getTime(), e = win.end.getTime();
    if (now >= e) return { state: 'ended', text: '' };
    if (win.allDay) return now >= s ? { state: 'live', text: 'Happening Today' } : { state: 'upcoming', text: '' };
    if (now >= s) {
        if (e - now <= SMLC_ENDING_SOON_MIN * 60000) return { state: 'ending', text: `Ending Soon &middot; ${minutesLeftText(e - now)} left` };
        return { state: 'live', text: 'Live Now' };
    }
    if (s - now <= SMLC_COUNTDOWN_LEAD_MIN * 60000) return { state: 'starting', text: `Starts in ${minutesLeftText(s - now)}` };
    return { state: 'upcoming', text: '' };
}

let smlcEventStatusTicker = null;
function refreshEventStatuses() {
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller) return;
    const now = Date.now();
    let visible = 0;
    scroller.querySelectorAll('.divi-event-item').forEach(el => {
        if (!el.dataset.start) { visible++; return; }
        const win = { start: new Date(+el.dataset.start), end: new Date(+el.dataset.end), allDay: el.dataset.allday === '1' };
        const st = getEventStatus(win, now);
        if (st.state === 'ended') { el.style.display = 'none'; return; }
        el.style.display = '';
        visible++;
        const badge = el.querySelector('.smlc-event-status');
        if (!badge) return;
        if (!st.text) { badge.style.display = 'none'; badge.className = 'smlc-event-status'; return; }
        badge.className = `smlc-event-status smlc-status-${st.state}`;
        badge.innerHTML = (st.state === 'live' ? '<span class="smlc-live-dot" aria-hidden="true"></span>' : '') + st.text;
        badge.style.display = 'inline-flex';
    });
    let empty = scroller.querySelector('.smlc-no-events');
    if (visible === 0) {
        if (!empty) {
            empty = document.createElement('div');
            empty.className = 'smlc-no-events feed-loading-placeholder';
            empty.textContent = 'No upcoming events right now. Check back soon!';
            const firstBanner = scroller.firstElementChild;
            if (firstBanner && firstBanner.nextSibling) scroller.insertBefore(empty, firstBanner.nextSibling); else scroller.appendChild(empty);
        }
        empty.style.display = '';
    } else if (empty) {
        empty.style.display = 'none';
    }
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
    if (!urlStr || urlStr === "#" || urlStr.startsWith("javascript:") || urlStr.startsWith("tel:") || urlStr.startsWith("mailto:")) return urlStr;
    try {
        const pageTitle = encodeURIComponent((document.title || "smlc_portal").trim());
        const urlObj = new URL(urlStr, window.location.origin);
        urlObj.searchParams.set("utm_source", "smlc_portal");
        urlObj.searchParams.set("utm_medium", "town_portal");
        urlObj.searchParams.set("utm_campaign", pageTitle);
        return urlObj.toString();
    } catch(e) {
        const connector = urlStr.includes("?") ? "&" : "?";
        const pageTitle = encodeURIComponent((document.title || "smlc_portal").trim());
        return `${urlStr}${connector}utm_source=smlc_portal&utm_medium=town_portal&utm_campaign=${pageTitle}`;
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

// Global Outbound and Contact Click Tracking
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

// Image Loading & Lightbox Handlers
// === IMAGE UNAVAILABLE NOTICE ENGINE ===
// Any content image that is missing or fails to load is hidden and replaced with a
// visible "Image isn't available right now" notice (never a broken-image icon).
const SMLC_IMG_NOTICE_TEXT = "Image isn't available right now";
// Tiny icons/logos: just hide them on failure (a text notice wouldn't fit).
const SMLC_IMG_SKIP_SELECTOR = '.menu-thumb-icon, .weather-icon-img, .weather-pill-icon img, #weather-fiveday-forecast-modal img, .header-billboard-img, .station-logo-frame img';

(function injectImageNoticeStyles() {
    if (document.getElementById('smlc-img-notice-styles')) return;
    const style = document.createElement('style');
    style.id = 'smlc-img-notice-styles';
    style.textContent = `
        .smlc-img-unavailable { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
            width: 100%; min-height: 140px; height: 100%; padding: 14px; box-sizing: border-box; text-align: center;
            background: repeating-linear-gradient(45deg, #1b1b1d, #1b1b1d 10px, #222225 10px, #222225 20px);
            color: #e8e8e8; border: 2px dashed #6b6b70; border-radius: 6px;
            font: 700 0.875rem/1.3 'Oswald', 'Arial Narrow', sans-serif; letter-spacing: .5px; text-transform: uppercase; }
        .smlc-img-unavailable-icon { font-size: 1.625rem; line-height: 1; }
        .point-of-interest-img-wrap .smlc-img-unavailable { aspect-ratio: 4 / 3; height: auto; }
        .slider-slide .smlc-img-unavailable { position: absolute; inset: 0; border-radius: 0; }
        .partner-logo-container .smlc-img-unavailable { min-height: 0; font-size: 0.6875rem; padding: 6px; border-width: 1px; }
        .partner-logo-container .smlc-img-unavailable-icon { font-size: 1rem; }
        #lightbox-img-wrapper .smlc-img-unavailable { min-height: 180px; }
    `;
    (document.head || document.documentElement).appendChild(style);
})();

function showImageUnavailable(imgElement) {
    if (!imgElement) return;
    if (imgElement.matches(SMLC_IMG_SKIP_SELECTOR)) { imgElement.style.display = 'none'; return; }
    imgElement.dataset.smlcImgFailed = '1';
    imgElement.style.display = 'none';
    let notice = imgElement.nextElementSibling;
    if (!(notice && notice.classList.contains('smlc-img-unavailable'))) {
        notice = document.createElement('div');
        notice.className = 'smlc-img-unavailable';
        notice.setAttribute('role', 'img');
        notice.setAttribute('aria-label', SMLC_IMG_NOTICE_TEXT);
        notice.innerHTML = `<span class="smlc-img-unavailable-icon" aria-hidden="true">&#9888;</span><span>${SMLC_IMG_NOTICE_TEXT}</span>`;
        imgElement.insertAdjacentElement('afterend', notice);
    }
    notice.style.display = 'flex';
    const wrap = imgElement.closest('figure, .spotlight-image-wrap, .history-img-box, .polaroid-wrap, .article-media-frame, #lightbox-img-wrapper');
    if (wrap) wrap.style.display = '';
}

function clearImageUnavailable(imgElement) {
    if (!imgElement || imgElement.dataset.smlcImgFailed !== '1') return;
    imgElement.dataset.smlcImgFailed = '';
    imgElement.style.display = 'block';
    const notice = imgElement.nextElementSibling;
    if (notice && notice.classList.contains('smlc-img-unavailable')) notice.style.display = 'none';
}

// Catch every image error/load on the page (capture phase, since these events don't bubble).
window.addEventListener('error', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    if (t.getAttribute('src') === '' || t.getAttribute('src') === null) return; // not attempted yet
    showImageUnavailable(t);
}, true);
window.addEventListener('load', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG') clearImageUnavailable(t);
}, true);

function safeSetImageSource(imgElement, srcUrl, fallbackWrapper = null, altText = "") {
    if (!imgElement) return;
    if (altText) imgElement.alt = altText;

    if (!srcUrl || String(srcUrl).trim() === "" || srcUrl === "null" || srcUrl === "undefined") {
        imgElement.removeAttribute('src');
        showImageUnavailable(imgElement);
        return;
    }

    clearImageUnavailable(imgElement);
    imgElement.style.display = "block";
    const wrap = fallbackWrapper || imgElement.closest('figure, .spotlight-image-wrap, .polaroid-wrap, .article-media-frame');
    if (wrap) wrap.style.display = "";
    imgElement.onerror = () => showImageUnavailable(imgElement);
    imgElement.src = srcUrl;
}

/** Fill-or-notice for images that live in static HTML but whose data never arrived. */
function markImageMissingIfEmpty(imgElement) {
    if (imgElement && !imgElement.getAttribute('src')) showImageUnavailable(imgElement);
}

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
    const cleanAlt = altText || '';
    const cleanTargetUrl = targetUrl || '';

    if (imgSrc && targetImg) {
        safeSetImageSource(targetImg, normalizeImageUrl(imgSrc) || imgSrc, null, cleanAlt || cleanTitle);
        if (targetImg.parentElement) targetImg.parentElement.style.display = 'block';
    } else if (targetImg && targetImg.parentElement) {
        targetImg.parentElement.style.display = 'none';
    }

    const dateEl = document.getElementById('lightbox-target-date'); 
    if (dateEl) dateEl.innerHTML = linkifyRawUrls(cleanDate || '');

    const titleEl = document.getElementById('lightbox-target-title'); 
    if (titleEl) titleEl.innerText = cleanTitle || '';

    const parsedBody = linkifyRawUrls(cleanBody || '');
    const parsedAlt = linkifyRawUrls(cleanAlt || '');

    const displayStory = (cleanAlt && cleanAlt !== cleanTitle) 
        ? `<div class="smlc-lightbox-alt" style="font-style:italic; font-size:0.875rem; color:var(--card-text-secondary, #444); margin-bottom:12px; border-left:3px solid var(--primary); padding-left:10px;">Image description: ${parsedAlt}</div>${parsedBody}`
        : parsedBody;

    const storyEl = document.getElementById('lightbox-target-story'); 
    if (storyEl) storyEl.innerHTML = displayStory;

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
        item.imageUrl || item.image || '',
        item.title || 'Historical Landmark',
        `YEAR ${item.year}`,
        item.description || '',
        item.link || '',
        item.alt || item.title || ''
    );
}

function openCalendarLightboxModal(idx) {
    const targetItem = window.calendarCachedEvents[idx];
    if (!targetItem) return;

    const title = targetItem.name || targetItem.title || "Community Event";
    const dateText = cleanCalendarDate(targetItem.date || targetItem.displayDate || targetItem.event_date);
    const timeText = cleanCalendarTime(targetItem.time || targetItem.displayTime, targetItem.date || targetItem.displayDate);
    const rawLoc = targetItem.location || ACTIVE_TOWN.primaryName + ", IL";
    let rawDetails = targetItem.details || targetItem.description || targetItem.desc || "No additional event details provided.";
    const finalEventImg = targetItem.imageUrl || targetItem.image || null;
    const atts = toPlainArray(targetItem.attachments).filter(a => a && a.fileUrl);
    if (atts.length) rawDetails += ' <br><br><strong>Attachments:</strong><br>' + atts.map(a => `&#128206; ${escapeHtmlText(a.title)}: ${a.fileUrl} `).join('<br>');
    const navUrl = buildTurnByTurnNavigationUrl(rawLoc);
    const winLb = getEventWindow(targetItem);
    const tzNote = winLb && !winLb.allDay ? ` ${SMLC_TZ_LABEL}` : '';
    const yourTime = buildViewerTimeNote(winLb);
    const metaHeader = `${dateText} &bull; ${timeText}${tzNote}${yourTime ? `<br><em>${yourTime}</em>` : ''}<br>Location: <a href="${navUrl}" target="_blank" rel="noopener" style="color:var(--primary); font-weight:bold; text-decoration:underline;">${rawLoc} (Directions &rarr;)</a>`;

    fireLightbox(finalEventImg, title, metaHeader, rawDetails, '', `${title} flyer`);
}

function openNewsLightboxModal(idx) {
    const story = window.newsCacheBlock[idx];
    if (!story) return;

    fireLightbox(
        story.image || '',
        story.title || 'Local News Dispatch',
        cleanCalendarDate(story.date || story.pubDate) + (story.location ? ` | ${story.location}` : ''),
        story.full_story || story.excerpt || story.description || '',
        story.link || '',
        story.title || 'Local News Dispatch'
    );
}

function formatIcalTimestamp(rawDate, rawTime) {
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) {
            const now = new Date();
            return now.toISOString().replace(/-|:|\.\d+/g, '');
        }
        return d.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';
    } catch(e) {
        return new Date().toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';
    }
}

function generateGoogleCalendarEventUrl(title, dateStr, timeStr, location, details) {
    const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    const stamp = formatIcalTimestamp(dateStr, timeStr);
    const startStr = stamp.substring(0, 8);
    
    const params = new URLSearchParams({
        text: title || "Community Event",
        dates: `${startStr}/${startStr}`,
        details: details || "Community Event hosted in Clay County, IL",
        location: location || "Clay County, IL"
    });
    return `${baseUrl}&${params.toString()}`;
}

function generateIcalDataBlob(title, dateStr, timeStr, location, details) {
    const stamp = formatIcalTimestamp(dateStr, timeStr);
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//SMLC Community Network//EN",
        "BEGIN:VEVENT",
        `SUMMARY:${title || "Community Event"}`,
        `DESCRIPTION:${details || "Event in Clay County, IL"}`,
        `LOCATION:${location || "Clay County, IL"}`,
        `DTSTART:${stamp.substring(0, 8)}`,
        `DTEND:${stamp.substring(0, 8)}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
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
// WEATHER ALERTS ENGINE: Alert Bar & Urgent Dismissible Popup Modal Card
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
                <span style="font-size:0.75rem; font-weight:bold; color:${themeColor}; text-transform:uppercase; letter-spacing:0.5px;">EMERGENCY BULLETIN &bull; ${severity}</span>
                <button type="button" onclick="hideWeatherAlertModalPopup()" style="background:none; border:none; font-size:1.375rem; line-height:1; cursor:pointer; color:#666;">&times;</button>
            </div>
            <div style="padding:20px; max-height:65vh; overflow-y:auto;">
                <h3 style="margin:0 0 10px 0; font-size:1.125rem; color:#111; font-weight:bold;">${headline}</h3>
                <div style="font-size:0.6875rem; color:#777; margin-bottom:12px; font-weight:bold;">Issued: ${updatedCdt}</div>
                <div style="font-size:0.875rem; line-height:1.6; color:#333; white-space:pre-line;">${linkifyRawUrls(instruction || 'Please monitor local emergency weather dispatches and take safety precautions.')}</div>
            </div>
            <div style="background:#f1f3f5; padding:12px 20px; text-align:right;">
                <button type="button" onclick="hideWeatherAlertModalPopup()" style="background:${themeColor}; color:#fff; border:none; padding:8px 18px; border-radius:4px; font-weight:bold; font-size:0.8125rem; cursor:pointer;">Acknowledge & Close</button>
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
// GLOBAL WEATHER FORECAST ENGINE: Navbar-Docked Responsive Pill & 5-Day Lightbox
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
            window.fiveDayForecastCache = Array.isArray(rawFiveDay) ? rawFiveDay : Object.values(rawFiveDay);

            renderNavbarWeatherWidget(current);
        });
    } catch(err) {
        console.warn("Weather forecast engine notice:", err.message);
    }
}

function renderNavbarWeatherWidget(current) {
    let widgetEl = document.getElementById('portal-weather-current-badge');
    const navBarTarget = document.getElementById('dynamic-menu-links')?.parentElement 
        || document.querySelector('.header-nav, .nav-container, nav, header');

    if (!widgetEl) {
        widgetEl = document.createElement('div');
        widgetEl.id = 'portal-weather-current-badge';
        widgetEl.style.cssText = "display:inline-flex; align-items:center; gap:8px; cursor:pointer; background:#181818; color:#fff; padding:5px 12px; border-radius:18px; border:1px solid #333; margin-left:auto; vertical-align:middle; transition:background 0.2s ease;";
        widgetEl.onmouseenter = () => widgetEl.style.background = '#252525';
        widgetEl.onmouseleave = () => widgetEl.style.background = '#181818';
        widgetEl.onclick = openFiveDayForecastModal;

        // Put the badge in the menu row itself (not inside the collapsible menu panel,
        // which must stay hidden until the Menu button is pressed on narrow screens)
        const menuRow = document.querySelector('.menu-bar .menu-inner');
        const translateBox = menuRow ? menuRow.querySelector('#google_translate_element') : null;
        if (menuRow) {
            menuRow.insertBefore(widgetEl, translateBox || null);
        } else if (navBarTarget) {
            navBarTarget.style.display = "flex";
            navBarTarget.style.alignItems = "center";
            navBarTarget.appendChild(widgetEl);
        } else {
            document.body.appendChild(widgetEl);
        }
    }

    const temp = current.temp ? `${Math.round(current.temp)}°F` : '--°F';
    const condition = current.condition || 'Clear';
    const iconUrl = normalizeImageUrl(current.icon);
    const updatedCdt = formatToCentralTime(current.updatedAt);

    widgetEl.innerHTML = `
        <style>
            #portal-weather-current-badge .weather-desk-text { display: inline-block; font-size: 0.8125rem; font-weight: bold; }
            #portal-weather-current-badge .weather-icon-img { width: 26px; height: 26px; object-fit: contain; display: block; }
            #portal-weather-current-badge .weather-temp-num { font-size: 0.8125rem; font-weight: bold; }
            @media (max-width: 1023px) {
                #portal-weather-current-badge .weather-desk-text { display: none !important; }
                #portal-weather-current-badge { padding: 4px 10px !important; min-height: 44px; min-width: 44px; justify-content: center; }
            }
        </style>
        ${iconUrl ? `<img src="${iconUrl}" alt="" class="weather-icon-img" onerror="this.style.display='none';">` : ''}
        <span class="weather-temp-num">${temp}</span>
        <span class="weather-desk-text">&bull; ${condition}</span>
        <span class="weather-desk-text" style="font-size:0.6875rem; color:var(--town-accent, var(--flora-orange, #ff9800)); margin-left:2px;">(5-Day &rarr;)</span>
    `;
    widgetEl.title = `Current Weather | Updated: ${updatedCdt} | Click to view 5-day forecast`;

    // Also fill the Weather pill on the page and the phone "More" menu
    window.smlcCurrentWeather = { temp, condition };
    const pillTemp = document.getElementById('weather-pill-temp');
    const pillIcon = document.getElementById('weather-pill-icon');
    const pillDetail = document.getElementById('weather-pill-detail');
    if (pillTemp) pillTemp.textContent = `${temp} • ${condition}`;
    if (pillIcon) pillIcon.innerHTML = iconUrl ? `<img src="${iconUrl}" alt="" onerror="this.style.display='none';">` : '';
    if (pillDetail) pillDetail.textContent = '5-Day Forecast';
    updateBottomNavWeather();
    if (typeof window.smlcWeatherChanged === 'function') window.smlcWeatherChanged();
    triggerGoogleTranslateUpdate(widgetEl);
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
                <div style="font-size:0.75rem; font-weight:bold; text-transform:uppercase; color:#bbb; margin-bottom:6px;">${dayName}</div>
                ${iconUrl ? `<img src="${iconUrl}" alt="" style="width:38px; height:38px; margin:0 auto 6px auto; display:block;" onerror="this.style.display='none';">` : ''}
                <div style="font-size:0.75rem; color:#ddd; font-weight:bold; min-height:30px; display:flex; align-items:center; justify-content:center;">${condition}</div>
                <div style="font-size:0.9375rem; font-weight:bold; margin:6px 0;">
                    <span style="color:#ff8a65;">${high}</span> / <span style="color:#90caf9;">${low}</span>
                </div>
                <div style="font-size:0.6875rem; color:#aaa; border-top:1px dashed #333; padding-top:6px; margin-top:6px;">
                    Rain: ${precipChance} (${precipInches})
                </div>
            </div>
        `;
    }).join('');

    modalEl.innerHTML = `
        <div style="background:#141414; border:1px solid #333; border-radius:10px; max-width:760px; width:100%; box-shadow:0 12px 32px rgba(0,0,0,0.5); overflow:hidden; font-family:sans-serif;">
            <div style="background:#222; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333;">
                <span style="font-size:0.875rem; font-weight:bold; color:#fff; text-transform:uppercase; letter-spacing:0.5px;">Clay County 5-Day Extended Weather Outlook</span>
                <button type="button" onclick="document.getElementById('weather-fiveday-forecast-modal').style.display='none';" style="background:none; border:none; font-size:1.5rem; color:#aaa; cursor:pointer;">&times;</button>
            </div>
            <div style="padding:20px; display:flex; gap:10px; flex-wrap:wrap; justify-content:center; max-height:75vh; overflow-y:auto;">
                ${cardsHtml || '<div style="color:#aaa; padding:20px;">No forecast telemetry available.</div>'}
            </div>
            <div style="background:#1c1c1c; padding:10px 20px; text-align:right;">
                <button type="button" onclick="document.getElementById('weather-fiveday-forecast-modal').style.display='none';" style="background:#0258A3; color:#fff; border:none; padding:6px 16px; border-radius:4px; font-weight:bold; font-size:0.75rem; cursor:pointer;">Close</button>
            </div>
        </div>
    `;
    modalEl.style.display = 'flex';
    triggerGoogleTranslateUpdate(modalEl);
};

// ============================================================================
// SPORTS SCOREBOARD ENGINE (ScoreStream widgets)
// Reads: /master_county_data/towns/{Town}/sections/sports/[n]
//   { school_grade, scorestream_code (widget id), score_widget_script, website }
// Builds the ScoreStream container itself (only the widget id comes from the database)
// and then (re)loads ScoreStream's embed script so it finds the new containers.
// Home page shows every town's widgets.
// ============================================================================
const SCORESTREAM_EMBED_SRC = 'https://scorestream.com/apiJsCdn/widgets/embed.js';

function extractScoreStreamWidget(entry) {
    if (!entry) return null;
    const code = String(entry.scorestream_code ?? '').trim();
    const script = String(entry.score_widget_script ?? '');
    let id = null;
    let type = 'horzScoreboard';
    if (/^\d+$/.test(code)) id = code;
    const fromHtml = (code + ' ' + script).match(/data-user-widget-id\s*=\s*["']?(\d+)/i);
    if (!id && fromHtml) id = fromHtml[1];
    const typeMatch = (code + ' ' + script).match(/data-ss_widget_type\s*=\s*["']?([A-Za-z]+)/);
    if (typeMatch) type = typeMatch[1];
    if (!id) return null;
    return { id, type, label: String(entry.school_grade || '').trim(), website: String(entry.website || '').trim() };
}

function loadScoreStreamEmbed() {
    document.querySelectorAll('script[data-smlc-scorestream]').forEach(el => el.remove());
    const tag = document.createElement('script');
    tag.async = true;
    tag.type = 'text/javascript';
    tag.src = SCORESTREAM_EMBED_SRC + '?v=' + Date.now();   // fresh run so it scans the new containers
    tag.setAttribute('data-smlc-scorestream', '1');
    document.body.appendChild(tag);
}

let lastScoreStreamSignature = '';
function renderScoreStreamWidgets(container, widgets) {
    if (!widgets.length) {
        container.innerHTML = '';
        container.style.display = 'none';
        lastScoreStreamSignature = '';
        return;
    }
    const signature = widgets.map(w => `${w.townLabel || ''}|${w.id}|${w.type}|${w.label}|${w.website}`).join(',');
    if (signature === lastScoreStreamSignature && container.querySelector('.scorestream-widget-container')) return;
    lastScoreStreamSignature = signature;

    container.innerHTML = widgets.map(w => {
        const heading = [w.townLabel, w.label].filter(Boolean).join(' • ') || 'Local Scores';
        const link = w.website ? `<a class="smlc-sports-link" href="${attachUtmParameters(w.website)}" target="${resolveLinkTarget(w.website)}" rel="noopener" data-ga-label="sports_team_site">Team site &rarr;</a>` : '';
        return `
            <div class="smlc-sports-block">
                <div class="smlc-sports-head"><span class="smlc-sports-label">${heading}</span>${link}</div>
                <div class="scorestream-widget-container" data-ss_widget_type="${w.type}" data-user-widget-id="${w.id}"></div>
            </div>`;
    }).join('');
    container.style.display = 'block';
    loadScoreStreamEmbed();
}

function bindFirebaseSportsEngine(db) {
    if (!db) return;
    const sportsContainer = document.getElementById('town-sports-scoreboard-target');
    if (!sportsContainer) return;

    try {
        if (activeFbRefSports) activeFbRefSports.off();
        lastScoreStreamSignature = '';

        if (ACTIVE_TOWN.isHome) {
            activeFbRefSports = db.ref('master_county_data/towns');
            activeFbRefSports.on('value', (snap) => {
                const towns = snap.val() || {};
                const widgets = [];
                Object.keys(towns).forEach(townName => {
                    toPlainArray(towns[townName]?.sections?.sports).forEach(entry => {
                        const w = extractScoreStreamWidget(entry);
                        if (w) widgets.push({ ...w, townLabel: townName });
                    });
                });
                renderScoreStreamWidgets(sportsContainer, widgets);
            });
            return;
        }

        activeFbRefSports = db.ref(`master_county_data/towns/${ACTIVE_TOWN.dbTownKey}/sections/sports`);
        activeFbRefSports.on('value', (snap) => {
            const widgets = toPlainArray(snap.val()).map(extractScoreStreamWidget).filter(Boolean);
            renderScoreStreamWidgets(sportsContainer, widgets);
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

// === MENU ENGINE ===
function smlcMenuChildren(item) {
    if (!item) return [];
    const raw = item.children || item.items || item.links || item.submenu || item.sub_menu || null;
    return toPlainArray(raw).filter(k => k && k.name);
}

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

                const imgTag = normImageUrl ? `<img src="${normImageUrl}" alt="" class="menu-thumb-icon" onclick="event.preventDefault(); event.stopPropagation(); fireLightbox('${escapeJsString(normImageUrl)}', '${escapeJsString(name)}', 'MENU ASSET', '${escapeJsString(altText)}', '${escapeJsString(targetUrl)}', '${escapeJsString(altText)}')" onerror="this.style.display='none';" />` : '';

                // A menu entry with sub-links (e.g. "More") becomes a dropdown
                const kids = smlcMenuChildren(item);
                if (kids.length) {
                    return `
                    <li class="smlc-menu-dropdown">
                        <details>
                            <summary data-ga-label="Nav_${name.replace(/\s+/g, '')}">${imgTag}<span>${name}</span><span class="smlc-dd-caret" aria-hidden="true">&#9662;</span></summary>
                            <ul class="smlc-submenu">${kids.map(k => `<li><a href="${attachUtmParameters(k.website || '#')}" target="${resolveLinkTarget(k.website)}" ${resolveLinkTarget(k.website) === '_blank' ? 'rel="noopener"' : ''} data-ga-label="Nav_${String(k.name).replace(/\s+/g, '')}" onclick="window.closeMobileMenu();"><span>${k.name}</span></a></li>`).join('')}</ul>
                        </details>
                    </li>`;
                }

                return `
                    <li>
                        <a href="${targetUrl}" ${isActive} data-ga-label="Nav_${name.replace(/\s+/g, '')}" target="${linkTarget}" onclick="window.closeMobileMenu();">
                            ${imgTag}
                            <span>${name}</span>
                        </a>
                    </li>
                `;
            }).join('');
            // Phone menu: sub-links of a dropdown (e.g. "More") are listed on their own
            const flat = [];
            rawItems.filter(Boolean).forEach(item => {
                const kids = smlcMenuChildren(item);
                if (kids.length) kids.forEach(k => flat.push(k));
                else if (!(normalizeTownName(item.name) === 'more' && !item.website)) flat.push(item);
            });
            window.smlcMenuItems = flat.map(item => ({
                name: item.name || 'Link',
                href: attachUtmParameters(item.website || '#'),
                target: resolveLinkTarget(item.website),
                img: normalizeImageUrl(item.imageUrl) || ''
            }));
            renderBottomNav();
            triggerGoogleTranslateUpdate(menuContainer);
        });
    } catch(err) {
        console.warn("Firebase Menu Engine error:", err.message);
    }
}

// === LOCAL LINKS ENGINE ===
function bindFirebaseLocalLinksEngine(db) {
    if (!db) return;
    const linkTarget = document.getElementById('local-links-target-container');
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
                            <a href="${targetUrl}" target="${linkTargetAttr}" ${linkTargetAttr === '_blank' ? 'rel="noopener"' : ''} class="local-link-title-anchor" data-ga-label="local_link" style="font-weight: bold; font-size: 0.9375rem; color: var(--link-bright-blue); text-decoration: underline;">
                                ${name}
                            </a>
                            <span style="font-size: 0.6875rem; color: var(--card-muted, #555); margin-left: 6px;">(${displayLoc})</span>
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
        activeFbRefGlobalSections = db.ref(`master_county_data/global/sections/town_links/links`);

        activeFbRefLinksTown.on('value', (snap) => {
            const val = snap.val();
            townLinks = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
            renderCombinedLinks();
        });

        activeFbRefGlobalSections.on('value', (snap) => {
            const val = snap.val();
            globalLinks = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
            renderCombinedLinks();
        });
    } catch(e) {
        console.warn("Local links subscription notice:", e.message);
    }
}

// ============================================================================
// SEMANTIC SECTIONS ENGINE (Swaps POI into Spotlight & Slideshow above History)
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
            // --- 1. POINT OF INTEREST IN DISCOVER SPOTLIGHT (Guaranteed Image Rendering) ---
            const poi = townSectionsData.point_of_interest || {};
            const poiTitleEl = document.getElementById('point-of-interest-title') || document.getElementById('right-card-meta-title') || document.getElementById('discover-spotlight-title');
            const poiAboutEl = document.getElementById('point-of-interest-about') || document.getElementById('desc2-target-1');
            const poiDescEl = document.getElementById('point-of-interest-landmark-desc') || document.getElementById('right-card-meta-desc1');

            if (poiTitleEl && poi.title) poiTitleEl.innerText = poi.title;
            if (poiAboutEl && poi.about_text) poiAboutEl.innerText = poi.about_text;
            if (poiDescEl) {
                if (poi.landmark_description) poiDescEl.innerHTML = linkifyRawUrls(poi.landmark_description);
                else if (/^\s*Loading/i.test(poiDescEl.textContent)) poiDescEl.style.display = 'none';
            }

            const i1 = document.getElementById('point-of-interest-img-1') || document.getElementById('dual-img-1');
            const h1 = document.getElementById('point-of-interest-header-1') || document.getElementById('dual-header-1');
            const rawImg1 = poi.image1 || poi.imageUrl || poi.image;
            const img1Url = normalizeImageUrl(rawImg1);
            const alt1Text = poi.alt1 || poi.header1 || poi.title || "Point of Interest";
            if (i1 && !img1Url) safeSetImageSource(i1, null, null, alt1Text);
            if (i1 && img1Url) {
                safeSetImageSource(i1, img1Url, null, alt1Text);
                i1.style.display = "block";
                i1.style.cursor = "pointer";
                i1.onclick = () => fireLightbox(escapeJsString(img1Url), escapeJsString(poi.header1 || poi.title || 'Point of Interest'), 'POINT OF INTEREST', escapeJsString(alt1Text), '', escapeJsString(alt1Text));
            }
            if (h1 && (poi.header1 || poi.title)) h1.innerText = poi.header1 || poi.title;

            const i2 = document.getElementById('point-of-interest-img-2') || document.getElementById('dual-img-2');
            const h2 = document.getElementById('point-of-interest-header-2') || document.getElementById('dual-header-2');
            const img2Url = normalizeImageUrl(poi.image2);
            const alt2Text = poi.alt2 || poi.header2 || "Landmark 2";
            if (i2 && !img2Url) safeSetImageSource(i2, null, null, alt2Text);
            if (i2 && img2Url) {
                safeSetImageSource(i2, img2Url, null, alt2Text);
                i2.style.display = "block";
                i2.style.cursor = "pointer";
                i2.onclick = () => fireLightbox(escapeJsString(img2Url), escapeJsString(poi.header2 || 'Landmark 2'), 'HISTORIC LANDMARK', escapeJsString(alt2Text), '', escapeJsString(alt2Text));
            }
            if (h2 && poi.header2) h2.innerText = poi.header2;

            // --- 2. SLIDESHOW (Positioned directly above Historical Timeline) ---
            const townSlides = (townSectionsData.slideshow?.items) 
                ? (Array.isArray(townSectionsData.slideshow.items) ? townSectionsData.slideshow.items : Object.values(townSectionsData.slideshow.items))
                : [];
            const globalSlides = (globalSectionsData.slideshow?.items)
                ? (Array.isArray(globalSectionsData.slideshow.items) ? globalSectionsData.slideshow.items : Object.values(globalSectionsData.slideshow.items))
                : [];

            const blendedSlides = [];
            const maxLen = Math.max(townSlides.length, globalSlides.length);
            for (let i = 0; i < maxLen; i++) {
                if (townSlides[i]) blendedSlides.push(townSlides[i]);
                if (globalSlides[i]) blendedSlides.push(globalSlides[i]);
            }

            const viewport = document.getElementById('flora-slideshow') || document.getElementById('xenia-slideshow') || document.querySelector('.slider-viewport');
            if (viewport && blendedSlides.length > 0) {
                viewport.innerHTML = blendedSlides.map((item, idx) => {
                    const imgUrl = normalizeImageUrl(item.imageUrl || item.image);
                    const captionTitle = extractText(item.title || 'Town View');
                    const altText = item.alt || captionTitle;
                    const safeImg = escapeJsString(imgUrl);
                    const safeCaption = escapeJsString(captionTitle);
                    const safeAlt = escapeJsString(altText);
                    const safeWeb = escapeJsString(item.website || '');

                    return `
                        <div class="slider-slide ${idx === 0 ? 'active' : ''}" style="position: absolute; inset: 0; opacity: ${idx === 0 ? 1 : 0}; transition: opacity 0.8s ease-in-out; z-index: ${idx === 0 ? 2 : 1};">
                            ${imgUrl ? `<img src="${imgUrl}" alt="${safeAlt}" onclick="fireLightbox('${safeImg}', '${safeCaption}', 'COMMUNITY VIEW', '${safeAlt}', '${safeWeb}', '${safeAlt}')" style="width:100%; height:100%; object-fit:contain; background-color:#0a0a0a; cursor:pointer;">` : `<div class="smlc-img-unavailable" role="img" aria-label="${SMLC_IMG_NOTICE_TEXT}"><span class="smlc-img-unavailable-icon" aria-hidden="true">&#9888;</span><span>${SMLC_IMG_NOTICE_TEXT}</span></div>`}
                            ${captionTitle ? `<div class="slider-caption">${captionTitle}</div>` : ''}
                        </div>
                    `;
                }).join('');

                const slides = viewport.querySelectorAll('.slider-slide');
                if (slides.length > 1) {
                    let currentSlideIdx = 0;
                    let isSlideshowPaused = false;

                    viewport.addEventListener('mouseenter', () => { isSlideshowPaused = true; });
                    viewport.addEventListener('mouseleave', () => { isSlideshowPaused = false; });
                    viewport.addEventListener('touchstart', () => { isSlideshowPaused = true; }, { passive: true });
                    viewport.addEventListener('touchend', () => { isSlideshowPaused = false; });

                    if (globalSlideshowTicker) clearInterval(globalSlideshowTicker);
                    globalSlideshowTicker = setInterval(() => {
                        if (isSlideshowPaused) return;
                        slides[currentSlideIdx].style.opacity = "0";
                        slides[currentSlideIdx].style.zIndex = "1";
                        currentSlideIdx = (currentSlideIdx + 1) % slides.length;
                        slides[currentSlideIdx].style.opacity = "1";
                        slides[currentSlideIdx].style.zIndex = "2";
                    }, 4000);
                }
            }

            // --- 3. FEATURED ARTICLE ---
            const art = townSectionsData.article || {};
            const artTitleEl = document.getElementById('article-title') || document.getElementById('sec4-article-title');
            const artCatEl = document.getElementById('article-category') || document.getElementById('sec4-category-tag');
            const artDeckEl = document.getElementById('article-deck') || document.getElementById('sec4-article-deck');
            const artBodyEl = document.getElementById('article-body') || document.getElementById('sec4-article-body');
            const artImgEl = document.getElementById('article-img') || document.getElementById('sec-4-1-article-img');
            const artCapEl = document.getElementById('article-img-caption') || document.getElementById('sec4-img-caption');
            const artFigureEl = document.getElementById('article-figure-frame') || (artImgEl ? artImgEl.closest('figure') : null);

            if (artTitleEl && art.title) artTitleEl.innerText = art.title;
            if (artCatEl && art.category) artCatEl.innerText = art.category;
            if (artDeckEl && art.deck) artDeckEl.innerText = art.deck;
            if (artBodyEl && art.body) {
                // Split body into paragraphs and keep the image figure after the first one
                const paras = String(art.body).split(/\n\s*\n|\r\n\s*\r\n/).map(t => t.trim()).filter(Boolean)
                    .map(t => `<p>${linkifyRawUrls(t).replace(/\n/g, '<br>')}</p>`);
                const keepFigure = artFigureEl && artBodyEl.contains(artFigureEl) ? artFigureEl : null;
                if (keepFigure) keepFigure.remove();
                artBodyEl.innerHTML = paras.join('');
                if (keepFigure) {
                    const first = artBodyEl.querySelector('p');
                    if (first) first.insertAdjacentElement('afterend', keepFigure); else artBodyEl.appendChild(keepFigure);
                }
            }

            const rawArtUrl = art.imageUrl || art.image || art.image1;
            const artImgUrl = normalizeImageUrl(rawArtUrl);
            const artAltText = art.alt || art.title || "Featured Article Image";

            if (artImgEl) {
                if (artFigureEl) artFigureEl.style.display = '';
                safeSetImageSource(artImgEl, artImgUrl, null, artAltText);
                artImgEl.onclick = () => fireLightbox(
                    escapeJsString(artImgEl.src), 
                    escapeJsString(art.title || 'Feature'), 
                    escapeJsString(art.category || 'Commerce & Heritage'), 
                    escapeJsString(artAltText), 
                    '', 
                    escapeJsString(artAltText)
                );
                if (artCapEl) artCapEl.innerText = art.caption || artAltText;
            }

            // --- 4. BUSINESS SPOTLIGHT ---
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
            if (spotImgEl && !spotImgUrl) safeSetImageSource(spotImgEl, null, null, spotAltText);
            if (spotImgEl && spotImgUrl) {
                safeSetImageSource(spotImgEl, spotImgUrl, null, spotAltText);
                spotImgEl.onclick = () => fireLightbox(escapeJsString(spotImgUrl), escapeJsString(spot.name || 'Merchant'), ACTIVE_TOWN.primaryName + ', IL', escapeJsString(spot.description || ''), escapeJsString(spot.website || ''), escapeJsString(spotAltText));
            }

            // --- 5. TOWN HISTORY TIMELINE & MERGED ABOUT SECTION ---
            const historyTarget = document.getElementById('history-row-target');
            const historyRaw = townSectionsData.history || [];
            const historyList = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);

            const historyTitleHeader = document.querySelector('.discover-history-title, #history-header-title');
            if (historyTitleHeader) historyTitleHeader.style.display = 'none';

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
                    const imgUrl = normalizeImageUrl(evt.imageUrl || evt.image);

                    return `
                        <div class="history-card" onclick="openHistoryLightboxModal(${idx})">
                            <h2>${evt.year || '----'}</h2>
                            <h3>${evt.title || 'Historical Landmark'}</h3>
                            <p>${displayDesc}</p>
                            ${isLong ? `<span class="read-more-trigger">Read Details &rarr;</span>` : ''}
                            ${imgUrl ? `<div class="history-img-box"><img src="${imgUrl}" alt="${escapeJsString(evt.title || 'Historical image')}"></div>` : ''}
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

// === PARTNER SHOWCASE ENGINE (Positioned directly above Thank You) ===
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
            window.townPartnersPool = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
            renderCombinedPartners();
        });

        activeFbRefPartnersGlobal.on('value', (snap) => {
            const val = snap.val();
            window.globalPartnersPool = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
            renderCombinedPartners();
        });
    } catch(err) {
        console.warn("Partners engine error:", err.message);
    }
}

// Partner strips show only WHOLE cards: as many as fit the width (5+ on desktop),
// re-fitting when the window is resized. No scrollbars, logos never stretched.
const SMLC_PARTNER_CARD_MIN = 176;   // px a card needs to look right (5 fit at 1024px+)
const SMLC_PARTNER_GAP = 16;
const SMLC_PARTNER_MAX = 7;
const smlcPartnerStripObservers = {};
const smlcPartnerRefitters = {};
window.smlcRefitPartnerStrips = () => Object.values(smlcPartnerRefitters).forEach(fn => { try { fn(); } catch (e) {} });

function partnerCardsThatFit(containerElement, poolSize) {
    const width = containerElement.clientWidth || (containerElement.parentElement && containerElement.parentElement.clientWidth) || window.innerWidth;
    if (window.innerWidth < 768) return 1;
    const textScale = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;   // bigger text = wider cards
    const fit = Math.floor((width + SMLC_PARTNER_GAP) / (SMLC_PARTNER_CARD_MIN * textScale + SMLC_PARTNER_GAP));
    return Math.max(1, Math.min(fit, poolSize, SMLC_PARTNER_MAX));
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

    const isMobileOrTablet = window.innerWidth < 768;
    let poolIndex = seedOffset % partnerPool.length;
    let isCarouselPaused = false;
    let hoverStartTime = 0;

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
                    <img class="partner-logo-asset" src="${imgUrl}" alt="${escapeJsString(altText)} logo" loading="lazy" onclick="fireLightbox('${escapeJsString(imgUrl)}', '${escapeJsString(name)}', 'COMMUNITY DIRECTORY', 'Local Sponsor', '${escapeJsString(link)}', '${escapeJsString(altText)}')" style="cursor:pointer;">
                </div>
                <h3 class="partner-title">${name}</h3>
                <a class="directory-tile-link" href="${link}" target="${linkTargetAttr}" ${linkTargetAttr === '_blank' ? 'rel="noopener"' : ''} data-ga-label="partner_cta">Visit Partner &rarr;</a>
            </div>
        `;
    };

    let visibleCount = partnerCardsThatFit(containerElement, partnerPool.length);
    const drawCards = () => {
        const cards = [];
        for (let i = 0; i < visibleCount; i++) {
            const p = partnerPool[(poolIndex + i) % partnerPool.length];
            cards.push(createPartnerMarkup(p, i));
        }
        containerElement.innerHTML = cards.join('');
    };
    drawCards();

    // Re-fit when the strip changes width (window resize, rotate, sidebar, zoom)
    if (smlcPartnerStripObservers[stripKey]) smlcPartnerStripObservers[stripKey].disconnect();
    smlcPartnerRefitters[stripKey] = () => {
        const next = partnerCardsThatFit(containerElement, partnerPool.length);
        if (next !== visibleCount) { visibleCount = next; drawCards(); }
    };
    if (typeof ResizeObserver === 'function') {
        let fitTimer = null;
        const ro = new ResizeObserver(() => {
            clearTimeout(fitTimer);
            fitTimer = setTimeout(() => {
                const next = partnerCardsThatFit(containerElement, partnerPool.length);
                if (next !== visibleCount) { visibleCount = next; drawCards(); }
            }, 120);
        });
        ro.observe(containerElement.parentElement || containerElement);
        smlcPartnerStripObservers[stripKey] = ro;
    }

    const onPauseEnter = () => {
        isCarouselPaused = true;
        hoverStartTime = Date.now();
    };

    const onPauseLeave = () => {
        isCarouselPaused = false;
        if (hoverStartTime > 0) {
            const durationSec = Math.round((Date.now() - hoverStartTime) / 1000);
            const activeCard = containerElement.querySelector('.community-partner-card');
            const pName = activeCard ? activeCard.getAttribute('data-partner-name') : 'Unknown';
            if (durationSec >= 1) {
                trackGa4Event('partner_engagement_time', {
                    partner_name: pName,
                    seconds_viewed: durationSec
                });
            }
            hoverStartTime = 0;
        }
    };

    containerElement.addEventListener('mouseenter', onPauseEnter);
    containerElement.addEventListener('mouseleave', onPauseLeave);
    containerElement.addEventListener('touchstart', onPauseEnter, { passive: true });
    containerElement.addEventListener('touchend', onPauseLeave);

    containerElement.querySelectorAll('.community-partner-card').forEach(card => {
        const pName = card.getAttribute('data-partner-name');
        trackGa4Event('partner_card_impression', { partner_name: pName, strip: stripKey });
    });

    const slideDuration = isMobileOrTablet ? 3800 : 5000;
    const intervalId = setInterval(() => {
        if (isCarouselPaused) return;

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

// === FUEL MONITOR BILLBOARD ===
function initializeFirebaseGasMonitor(db) {
    const gasContainer = document.getElementById('fuel-monitor-target-box') || document.querySelector('.fuel-monitor-billboard-card');
    if (!gasContainer) return;

    const stationConfigs = {
        "48100": { town: "flora", display: "Flora", name: "CASEY'S", logo: "Casey's.png" },      
        "48101": { town: "flora", display: "Flora", name: "HUCK'S", logo: "Hucks.png" },      
        "128128": { town: "flora", display: "Flora", name: "MACH 1", logo: "Mach 1.png" },    
        "120226": { town: "flora", display: "Flora", name: "FAST STOP", logo: "Fast stop.png" },  
        "48026": { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" }, 
        "171711": { town: "clay-city", display: "Clay City", name: "CASEY'S", logo: "Casey's.png" }, 
        "181818": { town: "xenia", display: "Xenia", name: "KNAPP'S", logo: "Knapps.png" }   
    };

    // Which stations to show for this town:
    //   1st choice: /master_county_data/towns/{Town}/sections/gas_widget/[n] { station_id, title }
    //   fallback:   the built-in list above (by ACTIVE_TOWN.gasKey)
    const targetTowns = ACTIVE_TOWN.gasKey || ["flora"];
    const fallbackIds = Object.keys(stationConfigs).filter(id => targetTowns.includes(stationConfigs[id].town));
    const townKey = ACTIVE_TOWN.dbTownKey;
    const notAvailable = (msg) => {
        gasContainer.innerHTML = `<div class="sidebar-widget-title">${(ACTIVE_TOWN.isHome ? 'Clay County' : ACTIVE_TOWN.primaryName).toUpperCase()} FUEL INDEX MONITOR</div><div class="fuel-note">${msg}</div>`;
    };

    let townStations = null;   // [{ id, title }] from Firebase, or null while loading
    let priceData = null;

    const render = () => {
        if (townStations === null || priceData === null) return;
        const list = townStations.length > 0 ? townStations : fallbackIds.map(id => ({ id, title: '' }));
        if (list.length === 0) { notAvailable("Fuel prices aren't available for this town yet."); return; }
        const configs = {};
        list.forEach(st => {
            const known = stationConfigs[st.id] || {};
            configs[st.id] = {
                town: known.town || '',
                display: ACTIVE_TOWN.isHome ? (known.display || 'Clay County') : (ACTIVE_TOWN.primaryName || known.display || ''),
                name: st.title || known.name || `Station ${st.id}`,
                stationTown: known.display || '',
                logo: known.logo || ''
            };
        });
        startGasRotator(priceData || {}, configs, list.map(st => st.id), gasContainer);
    };

    try {
        if (townKey && townKey !== 'Global') {
            db.ref(`master_county_data/towns/${townKey}/sections/gas_widget`).on('value', (snap) => {
                townStations = toPlainArray(snap.val())
                    .filter(e => e && (e.station_id !== undefined && e.station_id !== null && String(e.station_id).trim() !== ''))
                    .map(e => ({ id: String(e.station_id).trim(), title: e.title ? String(e.title).trim() : '' }));
                render();
            }, () => { townStations = []; render(); });
        } else {
            townStations = [];
        }

        // SMLC fuel data lives at /fuel_prices/{stationId} = { reg, dsl, date } (written by update-gas.html).
        // NOTE: /billboard_network is a separate project and must not be read here.
        db.ref('fuel_prices').on('value', (snap) => {
            priceData = snap.val() || {};
            render();
        }, (err) => {
            console.warn("Gas monitor read notice:", err && err.message);
            notAvailable("Fuel prices aren't available right now.");
        });
    } catch(e) {
        console.warn("Gas monitor notice:", e.message);
    }
}

function startGasRotator(data, stationConfigs, stationIds, container) {
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
    let currentIdx = 0;

    const updatePortalUrl = cleanRawUrl(DEFAULT_APP_CONFIG.regional_endpoints.gas_widget);

    const renderStation = () => {
        const id = stationIds[currentIdx];
        const config = stationConfigs[id];
        const info = data[id] || {};

        const regPrice = info.reg || info.regular || info.price || "---";
        let dslPrice = info.dsl || info.diesel || "---";
        if (dslPrice === "0" || !dslPrice) dslPrice = "---";

        const updateDate = info.date || info.updated || "Pending";
        const safeLogo = config.logo ? encodeURIComponent(config.logo) : '';

        container.style.cursor = "pointer";
        container.onclick = () => window.open(attachUtmParameters(updatePortalUrl), '_blank');

        container.innerHTML = `
            <div class="sidebar-widget-title">${config.display.toUpperCase()} FUEL INDEX MONITOR</div>
            <div class="fuel-station-header">
                ${safeLogo ? `<div class="station-logo-frame"><img src="//raw.githubusercontent.com/skventuresigns-design/smlc/main/gas-prices/image/${safeLogo}" alt="" onerror="this.parentElement.style.display='none';"></div>` : ''}
                <div class="station-meta-title">${config.name}${config.stationTown && !String(config.name).toUpperCase().includes(String(config.stationTown).toUpperCase()) ? ` (${config.stationTown})` : ''}</div>
            </div>
            <div class="fuel-pricing-grid">
                <div class="price-box"><span class="price-type-label">REGULAR</span><span class="price-value-regular">${regPrice}</span></div>
                <div class="price-box"><span class="price-type-label">DIESEL</span><span class="price-value-diesel">${dslPrice}</span></div>
            </div>
            <div class="sync-timestamp-label">Updated: ${updateDate} &bull; Click to Update</div>
        `;
        currentIdx = (currentIdx + 1) % stationIds.length;
    };

    renderStation();
    if (stationIds.length > 1) {
        gasMonitorRotator = setInterval(renderStation, 5000);
    }
}

// === COMMUNITY BULLETIN ===
// Upcoming events as schema.org Event data, so search engines / AI answers can cite them
function publishEventStructuredData(items) {
    try {
        const events = (items || []).map(item => {
            const win = getEventWindow(item);
            if (!win || getEventStatus(win).state === 'ended') return null;
            const name = item.name || item.title;
            if (!name) return null;
            const place = item.location || item.addr || `${ACTIVE_TOWN.primaryName}, IL`;
            const ev = {
                '@type': 'Event', name,
                startDate: win.start.toISOString(), endDate: win.end.toISOString(),
                eventStatus: 'https://schema.org/EventScheduled',
                eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                location: { '@type': 'Place', name: place, address: place },
                organizer: { '@type': 'Organization', name: 'Support My Local Community', url: 'https://werewolf3788.github.io/SMLC/' }
            };
            const desc = item.details || item.description || item.descShort || item.desc;
            if (desc) ev.description = String(desc).slice(0, 300);
            const img = normalizeImageUrl(item.imageUrl || item.image);
            if (img) ev.image = img.startsWith('//') ? 'https:' + img : img;
            return ev;
        }).filter(Boolean).slice(0, 25);
        let tag = document.getElementById('smlc-events-ld');
        if (!events.length) { if (tag) tag.remove(); return; }
        if (!tag) { tag = document.createElement('script'); tag.type = 'application/ld+json'; tag.id = 'smlc-events-ld'; document.head.appendChild(tag); }
        tag.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': events });
    } catch (e) { console.warn('Event data notice:', e.message); }
}

// ============================================================================
// EVENTS SOURCE: Firestore /smlc_events (written by the Calendar sync, 2 months ahead)
// Each doc: { title, start, end, isAllDay, desc, addr, googleLink, icalData,
//             attachments: [{ title, fileUrl, mimeType, iconLink }], attachmentUrl, image? }
// ============================================================================
function smlcIsImageAttachment(att) {
    if (!att) return false;
    const mime = String(att.mimeType || '').toLowerCase();
    const url = String(att.fileUrl || att.url || '');
    if (mime) return mime.startsWith('image/');
    return /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(url) || /googleusercontent\.com/i.test(url);
}

function smlcCentralClock(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', { timeZone: SMLC_TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
}

function smlcNormalizeEventDoc(d) {
    if (!d || !(d.title || d.name)) return null;
    const attachments = toPlainArray(d.attachments).filter(a => a && (a.fileUrl || a.url)).map(a => ({
        title: a.title || 'Attachment', fileUrl: a.fileUrl || a.url, mimeType: a.mimeType || '', isImage: smlcIsImageAttachment(a)
    }));
    if (!attachments.length && d.attachmentUrl) attachments.push({ title: 'Attachment', fileUrl: d.attachmentUrl, mimeType: '', isImage: smlcIsImageAttachment({ fileUrl: d.attachmentUrl }) });
    const firstImage = attachments.find(a => a.isImage);
    const hasStart = d.start && !isNaN(new Date(d.start).getTime());
    return {
        ...d,
        name: d.title || d.name,
        location: d.addr || d.location || '',
        details: d.desc || d.details || d.description || '',
        imageUrl: d.imageUrl || d.image || (firstImage ? firstImage.fileUrl : ''),
        attachments,
        date: hasStart ? d.start : (d.date || d.displayDate),
        time: hasStart ? (d.isAllDay ? '' : `${smlcCentralClock(d.start)} - ${smlcCentralClock(d.end || d.start)}`) : (d.time || d.displayTime || '')
    };
}

async function smlcLoadFirestoreEvents() {
    let docs = [];
    try {
        if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
            const snap = await firebase.firestore().collection('smlc_events').get();
            snap.forEach(ds => docs.push(ds.data()));
        }
    } catch (e) { console.warn('Events (Firestore SDK) notice:', e.message); }

    if (!docs.length) {
        try {
            const unwrap = (v) => {
                if (!v) return null;
                if (v.stringValue !== undefined) return v.stringValue;
                if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
                if (v.doubleValue !== undefined) return v.doubleValue;
                if (v.booleanValue !== undefined) return v.booleanValue;
                if (v.timestampValue !== undefined) return v.timestampValue;
                if (v.arrayValue) return (v.arrayValue.values || []).map(unwrap);
                if (v.mapValue) { const o = {}; Object.entries(v.mapValue.fields || {}).forEach(([k, x]) => { o[k] = unwrap(x); }); return o; }
                return null;
            };
            let token = null;
            do {
                const url = 'https://firestore.googleapis.com/v1/projects/smlc-fuel-monitor/databases/(default)/documents/smlc_events?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : '');
                const res = await fetch(url);
                if (!res.ok) break;
                const body = await res.json();
                (body.documents || []).forEach(doc => { const o = {}; Object.entries(doc.fields || {}).forEach(([k, x]) => { o[k] = unwrap(x); }); docs.push(o); });
                token = body.nextPageToken || null;
            } while (token);
        } catch (e) { console.warn('Events (Firestore REST) notice:', e.message); }
    }

    return docs.map(smlcNormalizeEventDoc).filter(Boolean)
        .sort((a, b) => (new Date(a.start || a.date).getTime() || 0) - (new Date(b.start || b.date).getTime() || 0));
}

// ============================================================================
// ADD-TO-CALENDAR (Google Calendar + Apple/Outlook .ics), built from the real
// start/end times so the event lands at the right time in any time zone.
// Attachments (flyers) are added to the event: as links in Google's details,
// and as ATTACH lines + links in the .ics file.
// ============================================================================
const SMLC_PUBLIC_CALENDAR_ID = '09907fc6fff214b9dad96172ef13e7b80d62ea80cf22b504d096a47f277a9d2b@group.calendar.google.com';
const SMLC_SUBSCRIBE_GOOGLE = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(SMLC_PUBLIC_CALENDAR_ID)}`;
const SMLC_SUBSCRIBE_ICAL = `webcal://calendar.google.com/calendar/ical/${encodeURIComponent(SMLC_PUBLIC_CALENDAR_ID)}/public/basic.ics`;

function smlcEventForCalendar(item) {
    const win = getEventWindow(item);
    if (!win) return null;
    const attachments = toPlainArray(item.attachments).filter(a => a && a.fileUrl);
    const title = item.name || item.title || 'Community Event';
    const location = item.location || item.addr || `${ACTIVE_TOWN.primaryName}, IL`;
    const plainDetails = String(item.details || item.description || item.desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+\n/g, '\n').trim();
    return { title, location, details: plainDetails, attachments, ...win };
}

function smlcUtcStamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function smlcCentralDateStamp(d) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: SMLC_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
    const m = {}; p.forEach(x => { m[x.type] = x.value; });
    return `${m.year}${m.month}${m.day}`;
}

function smlcAttachmentLines(ev) {
    return ev.attachments.map(a => `${a.title || 'Attachment'}: ${String(a.fileUrl).startsWith('//') ? 'https:' + a.fileUrl : a.fileUrl}`);
}

function smlcGoogleCalendarUrl(ev) {
    const dates = ev.allDay
        ? `${smlcCentralDateStamp(ev.start)}/${smlcCentralDateStamp(ev.end)}`
        : `${smlcUtcStamp(ev.start)}/${smlcUtcStamp(ev.end)}`;
    const extra = smlcAttachmentLines(ev);
    const details = [ev.details, extra.length ? 'Attachments:\n' + extra.join('\n') : '', 'From Support My Local Community: https://werewolf3788.github.io/SMLC/']
        .filter(Boolean).join('\n\n').slice(0, 1800);
    const params = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates, details, location: ev.location, ctz: SMLC_TZ });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function smlcIcsEscape(t) { return String(t || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function smlcIcsFold(line) {
    const out = []; let rest = line;
    while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); }
    out.push(rest); return out.join('\r\n');
}

function smlcBuildIcs(ev) {
    const uid = `${smlcUtcStamp(ev.start)}-${ev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}@supportmylocalcommunity`;
    const extra = smlcAttachmentLines(ev);
    const description = [ev.details, extra.length ? 'Attachments:\n' + extra.join('\n') : ''].filter(Boolean).join('\n\n');
    const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Support My Local Community//Clay County IL//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${smlcUtcStamp(new Date())}`,
        ev.allDay ? `DTSTART;VALUE=DATE:${smlcCentralDateStamp(ev.start)}` : `DTSTART:${smlcUtcStamp(ev.start)}`,
        ev.allDay ? `DTEND;VALUE=DATE:${smlcCentralDateStamp(ev.end)}` : `DTEND:${smlcUtcStamp(ev.end)}`,
        `SUMMARY:${smlcIcsEscape(ev.title)}`,
        `LOCATION:${smlcIcsEscape(ev.location)}`,
        `DESCRIPTION:${smlcIcsEscape(description)}`,
        'URL:https://werewolf3788.github.io/SMLC/',
        ...ev.attachments.map(a => `ATTACH${a.mimeType ? ';FMTTYPE=' + a.mimeType : ''}:${String(a.fileUrl).startsWith('//') ? 'https:' + a.fileUrl : a.fileUrl}`),
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${smlcIcsEscape(ev.title)}`, 'TRIGGER:-PT1H', 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR'
    ];
    return lines.map(smlcIcsFold).join('\r\n') + '\r\n';
}

/** Adds one event to Apple Calendar / Outlook / any calendar app (.ics). */
window.smlcAddEventToIcs = function (idx) {
    const item = (window.calendarCachedEvents || [])[idx];
    const ev = item && smlcEventForCalendar(item);
    if (!ev) return false;
    const ics = smlcBuildIcs(ev);
    const fileName = `${ev.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'event'}.ics`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    try {
        if (isIOS) {
            // iPhone/iPad: opening the calendar data shows the "Add to Calendar" screen
            window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
        } else {
            const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = fileName; a.rel = 'noopener';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
        }
        trackGa4Event('add_to_calendar', { method: 'ics', event_title: ev.title });
    } catch (e) { console.warn('Add to calendar notice:', e.message); }
    return false;
};

async function loadCommunityBulletinFeed() {
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller) return;

    try {
        let elements = await smlcLoadFirestoreEvents();
        if (!elements.length) {
            try {
                const endpoint = DEFAULT_APP_CONFIG.regional_endpoints.apps_script_bulletin_url;
                const res = await fetch(endpoint + '?feed=true');
                if (res.ok) { const feed = await res.json(); if (Array.isArray(feed)) elements = feed; }
            } catch (feedErr) { console.warn("Bulletin feed notice:", feedErr.message); }
        }
        {
            if (Array.isArray(elements) && elements.length > 0) {
                window.calendarCachedEvents = elements;
                applyHighDensityScrollLimits(scroller, elements.length, 500);

                const googleSubUrl = SMLC_SUBSCRIBE_GOOGLE;
                const appleSubUrl = SMLC_SUBSCRIBE_ICAL;

                const createGlobalSubscriptionBanner = (headerText) => `
                    <div style="background:#f8f9fa; border:1px solid #e2e8f0; padding:10px; border-radius:6px; margin: 12px 0; text-align:center;">
                        <span style="font-size:0.75rem; font-weight:bold; color:#222; display:block; margin-bottom:6px; text-transform:uppercase;">${headerText}</span>
                        <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
                            <a href="${googleSubUrl}" target="_blank" rel="noopener" style="font-size:0.6875rem; font-weight:bold; color:#ffffff !important; background:#1a73e8; padding:6px 12px; border-radius:4px; text-decoration:none; display:inline-block;" data-ga-label="global_cal_google">Google Calendar</a>
                            <a href="${appleSubUrl}" style="font-size:0.6875rem; font-weight:bold; color:#ffffff !important; background:#1e7e34; padding:6px 12px; border-radius:4px; text-decoration:none; display:inline-block;" data-ga-label="global_cal_ical">Apple / iCal</a>
                        </div>
                    </div>
                `;

                const topBannerHtml = createGlobalSubscriptionBanner("Subscribe to Full County Calendar");
                const bottomBannerHtml = createGlobalSubscriptionBanner("County-Wide Calendar Subscriptions");

                const eventsHtml = elements.map((item, idx) => {
                    const win = getEventWindow(item);
                    if (win && getEventStatus(win).state === 'ended') return ''; // already over -> hide
                    const eventTitle = item.name || item.title || "Community Gathering";
                    const eventLoc = item.location || ACTIVE_TOWN.primaryName + ", IL";
                    const rawDetails = item.details || item.description || item.descShort || item.desc || "";
                    const dateText = cleanCalendarDate(item.date || item.displayDate);
                    let timeText = cleanCalendarTime(item.time || item.displayTime, item.date || item.displayDate);
                    if (win && !win.allDay && /\d/.test(timeText) && !/\b(CT|CST|CDT)\b/.test(timeText)) timeText += ` ${SMLC_TZ_LABEL}`;
                    const viewerNote = buildViewerTimeNote(win);
                    const winAttrs = win ? `data-start="${win.start.getTime()}" data-end="${win.end.getTime()}" data-allday="${win.allDay ? 1 : 0}"` : '';
                    const finalEventImg = normalizeImageUrl(item.imageUrl || item.image);

                    const calEv = smlcEventForCalendar(item);
                    const singleGoogleUrl = calEv ? smlcGoogleCalendarUrl(calEv) : generateGoogleCalendarEventUrl(eventTitle, item.date || item.displayDate, item.time || item.displayTime, eventLoc, rawDetails);
                    const singleIcalBlob = item.icalData ? `data:text/calendar;charset=utf8;base64,${item.icalData}` : generateIcalDataBlob(eventTitle, item.date || item.displayDate, item.time || item.displayTime, eventLoc, rawDetails);
                    const fileAttachments = toPlainArray(item.attachments).filter(a => a && !a.isImage && a.fileUrl);
                    const attachmentChips = fileAttachments.length ? `<div class="smlc-event-attachments">${fileAttachments.map(a => `<a href="${escapeHtmlText(a.fileUrl)}" target="_blank" rel="noopener" class="smlc-attachment-chip" data-ga-label="event_attachment">&#128206; ${escapeHtmlText(a.title)}</a>`).join('')}</div>` : '';
                    const turnByTurnNavUrl = buildTurnByTurnNavigationUrl(eventLoc);

                    const thumbnailHtml = finalEventImg ? `
                        <div style="float: right; margin: 0 0 10px 12px;">
                            <img src="${finalEventImg}" alt="${escapeHtmlText(eventTitle)} flyer" title="View flyer" onclick="openCalendarLightboxModal(${idx})" style="width:85px; height:85px; object-fit:cover; border-radius:6px; border:2px solid var(--card-border-color, #222); cursor:zoom-in; display:block;" onerror="this.parentElement.style.display='none';" />
                        </div>
                    ` : '';

                    return `
                        <div class="divi-event-item" ${winAttrs} style="margin-bottom:15px; padding-bottom:12px; border-bottom:1px dashed var(--card-muted, #ccc); overflow:hidden;">
                            ${thumbnailHtml}
                            <span class="smlc-event-status" style="display:none;"></span>
                            <div class="divi-event-date" style="font-size:0.75rem; color:var(--primary); font-weight:bold;">${dateText} &bull; ${timeText}</div>
                            ${viewerNote ? `<div class="smlc-viewer-time">${viewerNote}</div>` : ''}
                            <div class="divi-event-title" style="font-size:1rem; font-weight:bold; margin: 4px 0;">${eventTitle}</div>
                            <div class="event-info-text" style="font-size:0.8125rem; color:var(--card-text-secondary, #333);">
                                <strong>Where:</strong> 
                                <a href="${turnByTurnNavUrl}" target="_blank" rel="noopener" class="event-nav-link" style="color:var(--primary); font-weight:bold; text-decoration:underline;">
                                    ${eventLoc} &rarr; Directions
                                </a>
                            </div>
                            ${attachmentChips}
                            <div class="smlc-event-desc" style="font-size:0.8125rem; color:var(--card-text-secondary, #444); margin-top:4px;">${linkifyRawUrls(rawDetails.substring(0, 110))}${rawDetails.length > 110 ? '...' : ''}</div>
                            
                            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                                <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})" style="color:var(--primary); font-weight:bold; cursor:pointer; font-size:0.75rem; text-decoration:underline;">Read Details &rarr;</div>
                                <span style="color:var(--card-muted, #999); font-size:0.6875rem;">|</span>
                                <a href="${singleGoogleUrl}" target="_blank" rel="noopener" style="font-size:0.6875rem; color:#1a73e8; font-weight:bold; text-decoration:none;" data-ga-label="single_cal_google" aria-label="Add ${escapeHtmlText(eventTitle)} to Google Calendar">+ Google Cal</a>
                                <span style="color:var(--card-muted, #999); font-size:0.6875rem;">|</span>
                                <a href="#" role="button" onclick="return smlcAddEventToIcs(${idx});" style="font-size:0.6875rem; color:#1e7e34; font-weight:bold; text-decoration:none;" data-ga-label="single_cal_ical" aria-label="Add ${escapeHtmlText(eventTitle)} to Apple or Outlook calendar">+ Apple / Outlook</a>
                            </div>
                        </div>
                    `;
                }).join('');

                scroller.innerHTML = topBannerHtml + eventsHtml + bottomBannerHtml;
                publishEventStructuredData(elements);
                refreshEventStatuses();
                if (smlcEventStatusTicker) clearInterval(smlcEventStatusTicker);
                smlcEventStatusTicker = setInterval(refreshEventStatuses, 15000);
                triggerGoogleTranslateUpdate(scroller);
            }
        }
    } catch(err) { 
        console.warn("Bulletin Wire notice:", err.message); 
    }
}

// ============================================================================
// LOCAL NEWS DISPATCHES: 100% Direct Live Cloud Firestore Ingestion
// Strict Integer Matching via AREA_IDS tags (Tag 0 = Global, Tag 2 = Flora, etc.)
// ============================================================================
const SMLC_NO_NEWS_HTML = `<div class="feed-loading-placeholder" style="text-align:center; padding:20px; font-style:italic; color:var(--card-text-secondary, #444);">No News for this town, check out other towns for local news</div>`;
const SMLC_COUNTY_WIDE_NAMES = ['claycounty', 'claycountyil', 'claycountyillinois', 'county', 'global', 'all'];

function normalizeTownName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z]/g, '');
}

function toPlainArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return Object.values(val);
    return [val];
}

/**
 * Who sees a news story:
 *  - Lists town names (towns / tagNames)  -> ONLY those towns.
 *  - Says "Clay County" with no town names -> every town (county-wide).
 *  - No names at all                        -> falls back to the number tags (0 = county-wide).
 *  - Home page shows everything.
 */
function newsItemBelongsToActiveTown(item) {
    if (!item) return false;
    if (ACTIVE_TOWN.isHome) return true;

    const names = [...toPlainArray(item.towns), ...toPlainArray(item.tagNames)].map(normalizeTownName).filter(Boolean);
    const townNames = names.filter(n => !SMLC_COUNTY_WIDE_NAMES.includes(n));
    const allowedNames = (ACTIVE_TOWN.linkedTownNames || [ACTIVE_TOWN.primaryName]).map(normalizeTownName);

    if (townNames.length > 0) return townNames.some(n => allowedNames.includes(n));
    if (names.length > 0) return true; // only "Clay County" listed -> county-wide

    const numericTags = toPlainArray(item.tags).map(t => Number(t)).filter(n => !isNaN(n));
    if (numericTags.includes(0)) return true;
    const allowedAreaIds = ACTIVE_TOWN.linkedAreaIds || [ACTIVE_TOWN.areaId];
    return numericTags.some(id => allowedAreaIds.includes(id));
}

async function loadLocalNewsDispatches() {
    const targetGrid = document.getElementById('news-matrix-target');
    if (!targetGrid) return;

    try {
        let rawNewsList = [];

        // 1. Primary: Native Firestore SDK Connection
        if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
            const firestoreDb = firebase.firestore();
            const snap = await firestoreDb.collection("local_news").get();
            snap.forEach(docSnap => {
                const d = docSnap.data() || {};
                if (d.updatedAt && typeof d.updatedAt.toDate === 'function') d.updatedAt = d.updatedAt.toDate().toISOString();
                rawNewsList.push(d);
            });
        }

        // 2. Fallback: Direct Firestore REST API (Runs if client lacks firestore.js)
        if (rawNewsList.length === 0) {
            const restUrl = "https://firestore.googleapis.com/v1/projects/smlc-fuel-monitor/databases/(default)/documents/local_news";
            const res = await fetch(restUrl);
            if (res.ok) {
                const restData = await res.json();
                if (restData.documents && Array.isArray(restData.documents)) {
                    rawNewsList = restData.documents.map(d => {
                        const f = d.fields || {};
                        const unwrapVal = (v) => {
                            if (!v) return null;
                            if (v.stringValue !== undefined) return v.stringValue;
                            if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
                            if (v.booleanValue !== undefined) return v.booleanValue;
                            if (v.arrayValue && v.arrayValue.values) {
                                return v.arrayValue.values.map(unwrapVal);
                            }
                            return null;
                        };

                        return {
                            title: unwrapVal(f.title) || '',
                            date: unwrapVal(f.date) || '',
                            excerpt: unwrapVal(f.excerpt) || '',
                            full_story: unwrapVal(f.full_story) || '',
                            image: unwrapVal(f.image) || '',
                            link: unwrapVal(f.link) || '',
                            location: unwrapVal(f.location) || '',
                            source_name: unwrapVal(f.source_name) || '',
                            source_url: unwrapVal(f.source_url) || '',
                            tags: unwrapVal(f.tags) || [],
                            tagNames: unwrapVal(f.tagNames) || [],
                            towns: unwrapVal(f.towns) || [],
                            updatedAt: (f.updatedAt && (f.updatedAt.timestampValue || f.updatedAt.stringValue)) || ''
                        };
                    });
                }
            }
        }

        if (Array.isArray(rawNewsList) && rawNewsList.length > 0) {
            window.newsCacheBlock = rawNewsList.filter(item => newsItemBelongsToActiveTown(item));
            // Newest first
            window.newsCacheBlock.sort((a, b) => (new Date(b.updatedAt || b.date).getTime() || 0) - (new Date(a.updatedAt || a.date).getTime() || 0));

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
                            ${imgUrl ? `<img src="${imgUrl}" alt="" style="width:100%; height:160px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="openNewsLightboxModal(${idx})">` : ''}
                            <div style="font-size:0.75rem; color:var(--primary); font-weight:bold; margin-top:10px;">${cleanCalendarDate(story.date)}</div>
                            <div style="font-weight:bold; font-size:1rem; margin:6px 0; color:#1a1a1a;">${cleanTitle}</div>
                            <div style="font-size:0.875rem; color:var(--card-text-secondary, #444);">${linkifyRawUrls(displayStory)}</div>
                            ${isLong ? `<div class="read-more-btn" onclick="openNewsLightboxModal(${idx})" style="color: var(--primary); font-weight: bold; cursor: pointer; margin-top: 10px;">Read Full Dispatch &rarr;</div>` : ''}
                        </div>
                    `;
                }).join('');
                triggerGoogleTranslateUpdate(targetGrid);
            } else {
                targetGrid.innerHTML = SMLC_NO_NEWS_HTML;
            }
        } else {
            targetGrid.innerHTML = SMLC_NO_NEWS_HTML;
        }
    } catch(e) {
        console.warn("Firestore live news notice:", e.message);
        if (/Loading/i.test(targetGrid.textContent || '')) targetGrid.innerHTML = SMLC_NO_NEWS_HTML;
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
    const currentHash = (window.location.hash || ("#/" + (ACTIVE_TOWN.isHome ? "home" : ACTIVE_TOWN.primaryName.toLowerCase().replace(/\s+/g, "-")))).toLowerCase();
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
    document.title = ACTIVE_TOWN.isHome
        ? 'Clay County, IL Events, News, Gas Prices & Businesses | Support My Local Community'
        : `${ACTIVE_TOWN.primaryName}, IL Events, News, Gas Prices & Local Businesses | Support My Local Community`;

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
    if (typeof closeBottomNavSheets === 'function') closeBottomNavSheets();
    renderBottomNav();
}

// ============================================================================
// SHARED UI STYLES (injected once so every town page gets them)
//  - App-style bottom navigation (phones + portrait tablets)
//  - Calendar status badges (Starts in / LIVE NOW / Ending soon)
//  - Readable text on dark cards, ScoreStream blocks, desktop menu fitting
// ============================================================================
(function injectSharedUiStyles() {
    if (document.getElementById('smlc-shared-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'smlc-shared-ui-styles';
    style.textContent = `
        :root {
            --smlc-bar-bg: var(--town-primary, var(--flora-blue, var(--primary, #0258A3)));
            --smlc-bar-accent: var(--town-accent, var(--flora-orange, #FFC10E));
            --smlc-bar-on-accent: var(--town-on-accent, #fff);
            --smlc-bn-height: 68px;
        }

        /* ---------- Calendar status badges (colors used nowhere else on the site) ---------- */
        .smlc-event-status { align-items: center; gap: 7px; margin: 0 0 6px; padding: 4px 10px; border-radius: 999px;
            font: 700 0.6875rem/1.2 'Oswald', 'Arial Narrow', sans-serif; letter-spacing: 1px; text-transform: uppercase; }
        .smlc-status-starting { background: #00E5FF; color: #00262B; box-shadow: 0 0 10px rgba(0,229,255,.6); }
        .smlc-status-live { background: #FF1F8E; color: #fff; box-shadow: 0 0 14px rgba(255,31,142,.75); animation: smlcLivePulse 1.6s ease-in-out infinite; }
        .smlc-status-ending { background: #B026FF; color: #fff; box-shadow: 0 0 12px rgba(176,38,255,.7); }
        .smlc-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; display: inline-block; animation: smlcLiveDot 1s ease-in-out infinite; }
        @keyframes smlcLivePulse { 0%,100% { box-shadow: 0 0 8px rgba(255,31,142,.55); } 50% { box-shadow: 0 0 18px rgba(255,31,142,.95); } }
        @keyframes smlcLiveDot { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
        @media (prefers-reduced-motion: reduce) { .smlc-status-live, .smlc-live-dot { animation: none; } }
        .smlc-viewer-time { margin: 2px 0 4px; font: italic 600 0.7188rem/1.3 'Libre Baskerville', Georgia, serif; color: var(--card-text-secondary, #444); }

        /* ---------- Readable text on cards in dark mode ---------- */
        @media (prefers-color-scheme: dark) {
            .divi-event-item, .divi-event-item .event-info-text, .smlc-event-desc, .clipping-footer, .clipping-tagline,
            .sub-header-text, .community-voice-footer, .event-clipping-sub, .feed-loading-placeholder,
            .fuel-note, .sync-timestamp-label, .lightbox-footer-bar, .biz-description, .invitation-body-text {
                color: var(--card-text-secondary, #d4d4d8) !important;
            }
            .divi-event-title { color: var(--card-text-primary, #f4f4f5) !important; }
            .divi-event-item .event-nav-link, .divi-event-item .read-more-btn, .divi-event-date { color: var(--on-card-accent, #9ccfff) !important; }
        }

        /* ---------- Partner strips: whole cards in one row, no scrollbars, logos never stretched ---------- */
        html .partners-horizontal-strip { display: flex; flex-wrap: nowrap; justify-content: center; align-items: stretch;
            gap: 16px; overflow: hidden !important; padding: 4px 8px 10px; scrollbar-width: none; }
        html .partners-horizontal-strip::-webkit-scrollbar { display: none; }
        html .partners-horizontal-strip .community-partner-card { flex: 1 1 0; min-width: 0; max-width: 260px; margin: 0; box-sizing: border-box; }
        html .partners-horizontal-strip .partner-logo-container { height: 90px; width: 100%; box-sizing: border-box; }
        html .partners-horizontal-strip .partner-logo-container img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
        html .partners-horizontal-strip .partner-title { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        @media (max-width: 767px) {
            html .partners-horizontal-strip .community-partner-card { flex: 0 1 88%; max-width: 340px; }
            html .partners-horizontal-strip .partner-logo-container { height: 105px; }
        }

        /* ---------- Alt text is for screen readers, search engines and the lightbox only:
                      never shown as text on the page (e.g. while a picture is loading or broken) ---------- */
        img { color: transparent; font-size: 0; }
        #lightbox-target-img { font-size: 0; }

        /* ---------- Event attachments ---------- */
        .smlc-event-attachments { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 2px; }
        .smlc-attachment-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font: 700 0.75rem 'Oswald', 'Arial Narrow', sans-serif;
            letter-spacing: .4px; background: rgba(var(--town-primary-rgb, 2,88,163), .12); color: var(--on-card-accent, #0258A3) !important; border: 1px solid currentColor; text-decoration: none; }
        .smlc-attachment-chip:hover { background: rgba(var(--town-primary-rgb, 2,88,163), .25); }

        /* ---------- Menu dropdowns (Firebase menu entries with sub-links) ---------- */
        .smlc-menu-dropdown { position: relative; }
        .smlc-menu-dropdown > details > summary { list-style: none; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 8px 14px; cursor: pointer;
            color: #fff; font: 700 0.9375rem var(--font-label, 'Oswald', sans-serif); text-transform: uppercase; letter-spacing: 1px; border: 2px solid transparent; border-radius: 8px; }
        .smlc-menu-dropdown > details > summary::-webkit-details-marker { display: none; }
        .smlc-menu-dropdown > details[open] > summary, .smlc-menu-dropdown > details > summary:hover { border-color: var(--town-accent, var(--flora-orange, #FFC10E)); background: rgba(0,0,0,.6); }
        .smlc-dd-caret { font-size: 0.6875rem; }
        .smlc-submenu { list-style: none; margin: 6px 0 0; padding: 6px; background: #141416; border: 2px solid var(--town-accent, var(--flora-orange, #FFC10E)); border-radius: 10px; min-width: 200px; }
        @media (min-width: 1024px) { .smlc-submenu { position: absolute; right: 0; top: 100%; z-index: 1100; box-shadow: 0 10px 24px rgba(0,0,0,.7); } }
        .smlc-submenu a { display: flex !important; width: 100%; box-sizing: border-box; }
        @media (min-width: 1024px) and (max-width: 1439px) { .smlc-menu-dropdown > details > summary { padding: 6px 9px; font-size: 0.8125rem; letter-spacing: .6px; } }

        /* leave room so snow on top / decorations in the corners of partner cards aren't cut off */
        html.smlc-fx-on .partners-horizontal-strip { padding: 24px 12px 16px; }

        /* ---------- Header: #0C5E75 behind the header image in daytime (light) view ---------- */
        @media (prefers-color-scheme: light) {
            .site-brand-header, body.home-bg > header.header { background: #0C5E75 !important; }
        }

        /* ---------- Quick Answers (SEO / AEO) ---------- */
        .smlc-answers { width: var(--container-width, 96%); max-width: var(--content-max, 1680px); margin: 28px auto 36px; padding: 0 clamp(4px, 2vw, 24px); box-sizing: border-box; position: relative; z-index: 1; }
        .smlc-answers-inner { background: var(--card-surface-bg, #fffdf5); color: var(--card-text-primary, #1a1a1a); border: 2px solid var(--card-border-color, #222);
            box-shadow: 6px 6px 0 var(--card-shadow-color, #000); border-radius: 8px; padding: clamp(18px, 3vw, 34px); }
        .smlc-answers-title { margin: 0 0 10px; font: 900 clamp(1.5rem, 3vw, 2.2rem)/1.15 'Playfair Display', Georgia, serif; color: var(--on-card-accent, var(--primary, #0258A3)); }
        .smlc-answers-lead { margin: 0 0 22px; max-width: 75ch; font-size: clamp(1rem, 1.3vw, 1.12rem); line-height: 1.65; color: var(--card-text-secondary, #333); }
        .smlc-answers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 14px 28px; }
        .smlc-answer { padding: 14px 0 0; border-top: 2px solid var(--card-border-color, #222); }
        .smlc-answer-q { margin: 0 0 6px; font: 700 clamp(1.02rem, 1.3vw, 1.15rem)/1.3 'Playfair Display', Georgia, serif; color: var(--card-text-primary, #1a1a1a); }
        .smlc-answer-a { margin: 0; font-size: 0.9375rem; line-height: 1.6; color: var(--card-text-secondary, #333); }
        .smlc-answer-a a, .smlc-answers-lead a { color: var(--on-card-accent, #0258A3); text-decoration: underline; word-break: break-word; }

        /* ---------- ScoreStream sports widgets ---------- */
        .smlc-sports-block { margin: 0 0 16px; }
        .smlc-sports-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px;
            font: 700 0.8125rem 'Oswald', 'Arial Narrow', sans-serif; letter-spacing: 1px; text-transform: uppercase; color: var(--card-text-primary, #1a1a1a); }
        .smlc-sports-link { font-size: 0.75rem; color: var(--on-card-accent, #0258A3) !important; text-decoration: underline; white-space: nowrap; }
        .smlc-sports-block .scorestream-widget-container { min-height: 60px; max-width: 100%; overflow-x: auto; }

        /* ---------- Desktop: keep the top menu on one tidy row at every width ---------- */
        @media (min-width: 1024px) {
            .menu-bar .menu-inner { flex-wrap: nowrap; gap: 12px; }
            .menu-bar .translate-box-header { position: static; flex: 0 0 auto; margin-left: auto; }
            .menu-bar .navigation-drawer-panel { flex: 1 1 auto; min-width: 0; justify-content: center; flex-wrap: wrap; gap: 8px; }
            #portal-weather-current-badge { margin-left: 8px !important; flex: 0 0 auto; }
        }
        @media (max-width: 1023px) {
            .menu-bar .menu-inner { gap: 10px; }
            .menu-bar #portal-weather-current-badge { margin-left: auto !important; }
            .menu-bar .navigation-drawer-panel.drawer-open .menu-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; width: 92%; margin: 0 auto; }
            .menu-bar .navigation-drawer-panel.drawer-open .menu-links li { width: auto; margin: 0; }
        }
        html .partners-horizontal-strip .directory-tile-link { font-size: 0.75rem; letter-spacing: .3px; padding: 8px 6px; white-space: nowrap; }
        @media (min-width: 1024px) and (max-width: 1439px) {
            .menu-bar .menu-links { gap: 4px 6px; }
            .menu-bar .menu-links a { padding: 6px 9px; font-size: 0.8125rem; letter-spacing: .6px; min-height: 44px; gap: 6px; }
            .menu-bar .menu-thumb-icon { width: 20px; height: 20px; }
        }

        /* ---------- Bottom navigation (phones + portrait tablets) ---------- */
        #smlc-bottom-nav, .smlc-bn-sheet, #smlc-bn-backdrop { display: none; }
        html.smlc-bn-mode .smlc-top-nav { display: none !important; }
        html.smlc-bn-mode body { padding-bottom: calc(var(--smlc-bn-height) + env(safe-area-inset-bottom, 0px)); }
        html.smlc-bn-mode .weather-alert-bar { top: 0; }
        html.smlc-bn-mode #back-to-top-anchor { bottom: calc(var(--smlc-bn-height) + 14px + env(safe-area-inset-bottom, 0px)); }
        html.smlc-bn-mode #smlc-bottom-nav {
            display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 9000;
            height: calc(var(--smlc-bn-height) + env(safe-area-inset-bottom, 0px)); padding-bottom: env(safe-area-inset-bottom, 0px);
            background: var(--smlc-bar-bg); border-top: 3px solid var(--smlc-bar-accent); box-shadow: 0 -6px 18px rgba(0,0,0,.55);
        }
        .smlc-bn-btn { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; line-height: 1.15;
            min-height: 48px; padding: 6px 4px; background: none; border: 0; color: #fff; cursor: pointer; text-decoration: none;
            font: 700 0.75rem 'Oswald', 'Arial Narrow', sans-serif; letter-spacing: 1px; text-transform: uppercase; -webkit-tap-highlight-color: transparent; }
        .smlc-bn-btn > svg { width: 24px; height: 24px; margin-bottom: 2px; }
        .smlc-bn-btn svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .smlc-bn-btn .smlc-bn-sub { font: 500 0.625rem 'Oswald', sans-serif; letter-spacing: .5px; opacity: .85; text-transform: none; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .smlc-bn-btn.is-active, .smlc-bn-btn[aria-expanded="true"] { color: var(--smlc-bar-accent); }
        .smlc-bn-btn:focus-visible { outline: 3px solid var(--smlc-bar-accent); outline-offset: -3px; }
        .smlc-bn-btn .smlc-bn-caret { transition: transform .2s; }
        .smlc-bn-btn[aria-expanded="true"] .smlc-bn-caret { transform: rotate(180deg); }

        html.smlc-bn-mode #smlc-bn-backdrop.is-open { display: block; position: fixed; inset: 0; z-index: 8990; background: rgba(0,0,0,.55); }
        html.smlc-bn-mode .smlc-bn-sheet.is-open {
            display: block; position: fixed; left: 8px; right: 8px; z-index: 8995;
            bottom: calc(var(--smlc-bn-height) + 8px + env(safe-area-inset-bottom, 0px));
            max-height: 70vh; overflow-y: auto; padding: 10px; border-radius: 16px;
            background: #141416; border: 2px solid var(--smlc-bar-accent); box-shadow: 0 -10px 32px rgba(0,0,0,.8);
            animation: smlcSheetUp .22s ease-out;
        }
        @keyframes smlcSheetUp { from { transform: translateY(18px); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (min-width: 600px) { html.smlc-bn-mode .smlc-bn-sheet.is-open { left: auto; right: auto; width: 420px; }
            html.smlc-bn-mode #smlc-bn-sheet-towns.is-open { left: calc(50% - 210px); } html.smlc-bn-mode #smlc-bn-sheet-more.is-open { right: 8px; } }
        .smlc-bn-sheet-title { margin: 2px 6px 8px; font: 700 0.75rem 'Oswald', sans-serif; letter-spacing: 1.5px; text-transform: uppercase; color: #bdbdc4; }
        .smlc-bn-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .smlc-bn-list a, .smlc-bn-row { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px; padding: 10px 14px; box-sizing: border-box;
            background: #1f1f23; border: 1px solid #333; border-radius: 10px; color: #fff; text-decoration: none; cursor: pointer;
            font: 700 1rem 'Oswald', 'Arial Narrow', sans-serif; letter-spacing: 1px; text-transform: uppercase; text-align: left; }
        .smlc-bn-list a:hover, .smlc-bn-row:hover { border-color: var(--smlc-bar-accent); }
        .smlc-bn-list a.is-active { background: var(--smlc-bar-bg); border-color: var(--smlc-bar-accent); }
        .smlc-bn-list a.is-active::after { content: 'You are here'; margin-left: auto; font: 500 0.6875rem 'Oswald', sans-serif; letter-spacing: .5px; text-transform: none; color: var(--smlc-bar-accent); }
        .smlc-bn-list img { width: 28px; height: 28px; object-fit: contain; border-radius: 4px; background: rgba(255,255,255,.1); }
        .smlc-bn-row .smlc-bn-row-detail { margin-left: auto; font: 500 0.8125rem 'Oswald', sans-serif; text-transform: none; color: #cfcfd6; }
        .smlc-bn-translate-slot { margin-top: 8px; padding: 10px 14px; background: #1f1f23; border: 1px solid #333; border-radius: 10px; color: #fff; }
        .smlc-bn-translate-slot .smlc-bn-sheet-title { margin: 0 0 6px; }
        .smlc-bn-translate-slot .translate-box-header { position: static !important; display: inline-flex; }
        .smlc-bn-empty { padding: 10px 6px; color: #bdbdc4; font: italic 0.875rem Georgia, serif; }
    `;
    (document.head || document.documentElement).appendChild(style);
})();

// ============================================================================
// APP-STYLE BOTTOM NAVIGATION
//   Phones (any orientation) + tablets in portrait:  [ Home ] [ Towns ▴ ] [ More ▴ ]
//   Tablets in landscape + desktop:                   normal top menu
// Menu items come from /master_county_data/global/menu (or the page's built-in links).
//   - "Home"                     -> Home button
//   - one of the 5 town names    -> Towns sheet
//   - anything else (e.g. Amazon)-> More sheet (with Weather + Translate)
// ============================================================================
const SMLC_BOTTOM_NAV_QUERY = '(max-width: 767px), (pointer: coarse) and (orientation: portrait) and (max-width: 1366px), (pointer: coarse) and (max-height: 500px)';
const SMLC_TOWN_NAMES = ['Clay City', 'Flora', 'Louisville', 'Sailor Springs', 'Xenia'];
window.smlcMenuItems = null;      // filled by the Firebase menu engine
window.smlcCurrentWeather = null; // filled by the weather engine

const SMLC_ICONS = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
    towns: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    caret: '<svg class="smlc-bn-caret" viewBox="0 0 24 24" aria-hidden="true" style="width:14px;height:14px"><path d="M6 15l6-6 6 6"/></svg>',
    weather: '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2"><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z"/></svg>'
};

function escapeHtmlText(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function collectNavItems() {
    if (Array.isArray(window.smlcMenuItems) && window.smlcMenuItems.length) return window.smlcMenuItems;
    const links = Array.from(document.querySelectorAll('#dynamic-menu-links a'));
    return links.map(a => ({ name: (a.textContent || '').trim(), href: a.getAttribute('href') || '#', target: a.getAttribute('target') || '_self', img: '' }));
}

function classifyNavItems(items) {
    const townKeys = SMLC_TOWN_NAMES.map(normalizeTownName);
    const out = { home: null, towns: [], more: [] };
    items.forEach(it => {
        if (!it || !it.name) return;
        const key = normalizeTownName(it.name);
        if (key === 'home') { if (!out.home) out.home = it; }
        else if (townKeys.includes(key)) out.towns.push(it);
        else out.more.push(it);
    });
    // keep towns in the standard order
    out.towns.sort((a, b) => townKeys.indexOf(normalizeTownName(a.name)) - townKeys.indexOf(normalizeTownName(b.name)));
    return out;
}

function closeBottomNavSheets() {
    document.querySelectorAll('.smlc-bn-sheet.is-open').forEach(el => el.classList.remove('is-open'));
    document.querySelectorAll('#smlc-bottom-nav [aria-expanded]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    const bd = document.getElementById('smlc-bn-backdrop');
    if (bd) bd.classList.remove('is-open');
}

function toggleBottomNavSheet(which) {
    const sheet = document.getElementById(`smlc-bn-sheet-${which}`);
    const btn = document.querySelector(`#smlc-bottom-nav [data-sheet="${which}"]`);
    if (!sheet || !btn) return;
    const opening = !sheet.classList.contains('is-open');
    closeBottomNavSheets();
    if (opening) {
        sheet.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        document.getElementById('smlc-bn-backdrop')?.classList.add('is-open');
        const first = sheet.querySelector('a, button');
        if (first) first.focus({ preventScroll: true });
    }
}
window.closeBottomNavSheets = closeBottomNavSheets;

function ensureBottomNavShell() {
    if (document.getElementById('smlc-bottom-nav')) return;
    const nav = document.createElement('nav');
    nav.id = 'smlc-bottom-nav';
    nav.setAttribute('aria-label', 'Site navigation');
    document.body.appendChild(nav);

    const backdrop = document.createElement('div');
    backdrop.id = 'smlc-bn-backdrop';
    backdrop.addEventListener('click', closeBottomNavSheets);
    document.body.appendChild(backdrop);

    ['towns', 'more'].forEach(which => {
        const sheet = document.createElement('div');
        sheet.id = `smlc-bn-sheet-${which}`;
        sheet.className = 'smlc-bn-sheet';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-label', which === 'towns' ? 'Choose a town' : 'More options');
        document.body.appendChild(sheet);
    });

    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sheet]');
        if (btn) { e.preventDefault(); toggleBottomNavSheet(btn.dataset.sheet); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBottomNavSheets(); });
    document.addEventListener('click', (e) => {
        if (e.target.closest('.smlc-bn-sheet a')) closeBottomNavSheets();
    });
}

function renderBottomNav() {
    if (!document.body) return;
    ensureBottomNavShell();
    const groups = classifyNavItems(collectNavItems());
    const activeKey = ACTIVE_TOWN.isHome ? 'home' : normalizeTownName(ACTIVE_TOWN.primaryName);
    const homeHref = groups.home ? groups.home.href : 'index.html';
    const linkHtml = (it) => {
        const isActive = normalizeTownName(it.name) === activeKey;
        const img = it.img ? `<img src="${escapeHtmlText(it.img)}" alt="" class="menu-thumb-icon">` : '';
        return `<li><a href="${escapeHtmlText(it.href)}" target="${escapeHtmlText(it.target || '_self')}" ${it.target === '_blank' ? 'rel="noopener"' : ''} class="${isActive ? 'is-active' : ''}" ${isActive ? 'aria-current="page"' : ''} data-ga-label="BottomNav_${escapeHtmlText(String(it.name).replace(/\s+/g, ''))}">${img}<span>${escapeHtmlText(it.name)}</span></a></li>`;
    };

    const currentTownLabel = ACTIVE_TOWN.isHome ? 'Pick a town' : ACTIVE_TOWN.primaryName;
    document.getElementById('smlc-bottom-nav').innerHTML = `
        <a class="smlc-bn-btn ${ACTIVE_TOWN.isHome ? 'is-active' : ''}" href="${escapeHtmlText(homeHref)}" target="_self" data-ga-label="BottomNav_Home">${SMLC_ICONS.home}<span>Home</span><span class="smlc-bn-sub">Clay County</span></a>
        <button type="button" class="smlc-bn-btn" data-sheet="towns" aria-expanded="false" aria-controls="smlc-bn-sheet-towns">${SMLC_ICONS.towns}<span>Towns ${SMLC_ICONS.caret}</span><span class="smlc-bn-sub">${escapeHtmlText(currentTownLabel)}</span></button>
        <button type="button" class="smlc-bn-btn" data-sheet="more" aria-expanded="false" aria-controls="smlc-bn-sheet-more">${SMLC_ICONS.more}<span>More ${SMLC_ICONS.caret}</span><span class="smlc-bn-sub">Weather &amp; more</span></button>
    `;

    document.getElementById('smlc-bn-sheet-towns').innerHTML = `
        <div class="smlc-bn-sheet-title">Choose a town</div>
        <ul class="smlc-bn-list">${groups.towns.map(linkHtml).join('') || '<li class="smlc-bn-empty">Loading towns...</li>'}</ul>`;

    const moreSheet = document.getElementById('smlc-bn-sheet-more');
    const keepTranslate = moreSheet.querySelector('#google_translate_element');
    moreSheet.innerHTML = `
        <div class="smlc-bn-sheet-title">More</div>
        <ul class="smlc-bn-list">
            <li><button type="button" class="smlc-bn-row" id="smlc-bn-weather-row">${SMLC_ICONS.weather}<span>Weather</span><span class="smlc-bn-row-detail" id="smlc-bn-weather-detail">5-Day Forecast</span></button></li>
            ${groups.more.map(linkHtml).join('')}
            <li><button type="button" class="smlc-bn-row" onclick="openSmlcAccessibilityPanel()"><span aria-hidden="true">&#9855;</span><span>Accessibility</span></button></li>
            <li><button type="button" class="smlc-bn-row smlc-fx-toggle" onclick="toggleSmlcEffects()" aria-pressed="true"><span aria-hidden="true">&#10052;</span><span>Weather Effects</span><span class="smlc-bn-row-detail smlc-fx-toggle-state">On</span></button></li>
        </ul>
        <div class="smlc-bn-translate-slot"><div class="smlc-bn-sheet-title">Language</div><div id="smlc-bn-translate-target"></div></div>`;
    if (keepTranslate) moreSheet.querySelector('#smlc-bn-translate-target').appendChild(keepTranslate);
    document.getElementById('smlc-bn-weather-row').addEventListener('click', () => {
        closeBottomNavSheets();
        if (typeof window.openFiveDayForecastModal === 'function') window.openFiveDayForecastModal();
    });
    updateBottomNavWeather();
    if (typeof smlcUpdateFxToggleLabels === 'function') smlcUpdateFxToggleLabels();
    applyBottomNavMode();
}

function updateBottomNavWeather() {
    const el = document.getElementById('smlc-bn-weather-detail');
    const cw = window.smlcCurrentWeather;
    if (el && cw) el.textContent = `${cw.temp} • ${cw.condition}`;
}

// Move the Google Translate box into the More sheet on phones, and back on desktop.
let smlcTranslateHome = null;
function applyBottomNavMode() {
    const mq = window.matchMedia(SMLC_BOTTOM_NAV_QUERY);
    const on = mq.matches;
    document.documentElement.classList.toggle('smlc-bn-mode', on);
    const topHeader = document.getElementById('dynamic-menu-links')?.closest('header');
    if (topHeader) topHeader.classList.add('smlc-top-nav');
    if (!on) closeBottomNavSheets();

    const tr = document.getElementById('google_translate_element');
    const slot = document.getElementById('smlc-bn-translate-target');
    if (!tr) return;
    if (!smlcTranslateHome && !tr.closest('.smlc-bn-sheet')) smlcTranslateHome = { parent: tr.parentElement, next: tr.nextSibling };
    if (on && slot && tr.parentElement !== slot) slot.appendChild(tr);
    if (!on && smlcTranslateHome && tr.parentElement !== smlcTranslateHome.parent) smlcTranslateHome.parent.insertBefore(tr, smlcTranslateHome.next);
}

(function watchBottomNavMode() {
    try {
        const mq = window.matchMedia(SMLC_BOTTOM_NAV_QUERY);
        const handler = () => applyBottomNavMode();
        if (mq.addEventListener) mq.addEventListener('change', handler); else mq.addListener(handler);
        window.addEventListener('orientationchange', handler);
    } catch (e) { /* older browsers: top menu stays */ }
})();

// ============================================================================
// FOOTER CLOCK: Central time, plus the viewer's own time when it's different
// ============================================================================
let smlcFooterClockTimer = null;
function startCentralFooterClock() {
    const tick = () => {
        const el = document.getElementById('footer-ny-clock') || document.getElementById('footer-central-clock');
        if (!el) return;
        const now = new Date();
        const fmt = (tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }).format(now);
        let text = fmt(SMLC_TZ);
        if (viewerDiffersFromCentral(now)) text += `  •  Your time: ${fmt(getViewerTimeZone())}`;
        el.textContent = text;
        const label = el.previousElementSibling;
        if (label && /New York|Central/i.test(label.textContent)) label.textContent = 'Central:';
    };
    tick();
    if (smlcFooterClockTimer) clearInterval(smlcFooterClockTimer);
    smlcFooterClockTimer = setInterval(tick, 15000);
}

// ============================================================================
// WEATHER & HOLIDAY BACKGROUND EFFECTS
// - Matches Clay County, IL weather from /master_county_data/weather_forecast/current
//   rain / storm (lightning) / snow / clouds / clear (no sun; stars after dark, Central time)
// - Seasons & holidays (Central dates): fall leaves, Halloween, Thanksgiving, Christmas,
//   New Year's, Valentine's, St. Patrick's, 4th of July
// - Effects stay BEHIND the cards. Cards act like buildings: snow piles on top while it
//   snows, leaves / holiday decorations collect in the corners.
// - Visitors can switch effects off (saved on their device). Reduced-motion = still scene.
// - Preview any effect:  ?fx=snow&holiday=christmas   or   #fx-snow-christmas
//   fx: rain | storm | snow | clouds | clear | night     holiday: halloween | thanksgiving |
//   christmas | newyear | valentine | stpatrick | july4 | fall | none
// ============================================================================
const SMLC_FX = {
    weather: 'clear',        // from Firebase (or preview override)
    holiday: null,           // halloween | christmas | ...
    fall: false,             // leaf season
    night: false,
    enabled: true,
    reducedMotion: false,
    preview: null,           // { weather, holiday, night }
    canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
    particles: [], clouds: [], stars: [], bursts: [],
    raf: null, lastT: 0, flash: 0, nextFlash: 0,
    snowDepth: 0, snowTimer: null
};

function smlcCentralParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: SMLC_TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(date);
    const m = {};
    parts.forEach(p => { m[p.type] = p.value; });
    return { y: +m.year, mo: +m.month, d: +m.day, h: +m.hour % 24, wd: m.weekday };
}

function smlcThanksgivingDay(year) {
    const first = new Date(Date.UTC(year, 10, 1)).getUTCDay();          // 0=Sun
    const firstThu = 1 + ((4 - first + 7) % 7);
    return firstThu + 21;                                                  // 4th Thursday
}

function smlcDetectHoliday(cp) {
    const md = cp.mo * 100 + cp.d;
    if (md >= 1015 && md <= 1031) return 'halloween';
    if (cp.mo === 11) {
        const tg = smlcThanksgivingDay(cp.y);
        if (cp.d >= tg - 3 && cp.d <= tg + 3) return 'thanksgiving';
    }
    if (md >= 1201 && md <= 1226) return 'christmas';
    if (md === 1231 || md === 101) return 'newyear';
    if (md >= 207 && md <= 214) return 'valentine';
    if (md >= 314 && md <= 317) return 'stpatrick';
    if (md >= 701 && md <= 704) return 'july4';
    return null;
}

function smlcIsFallSeason(cp) {
    const md = cp.mo * 100 + cp.d;
    return md >= 922 && md <= 1130;
}

function smlcIsNight(cp) {
    // simple Central-time night window that follows the seasons
    const darkFrom = [17, 18, 19, 20, 20, 21, 21, 20, 19, 19, 17, 17][cp.mo - 1];
    const lightAt = [7, 7, 7, 6, 6, 5, 5, 6, 6, 7, 7, 7][cp.mo - 1];
    return cp.h >= darkFrom || cp.h < lightAt;
}

function smlcWeatherFromCondition(condition) {
    const c = String(condition || '').toLowerCase();
    if (!c) return 'clear';
    if (/thunder|t-?storm|storm/.test(c)) return 'storm';
    if (/snow|flurr|sleet|blizzard|wintry|ice pellet/.test(c)) return 'snow';
    if (/rain|shower|drizzle/.test(c)) return 'rain';
    if (/cloud|overcast|fog|mist|haze|smoke/.test(c)) return 'clouds';
    return 'clear';
}

function smlcReadPreview() {
    const out = {};
    try {
        const q = new URLSearchParams(window.location.search);
        if (q.get('fx')) out.weather = q.get('fx').toLowerCase();
        if (q.get('holiday')) out.holiday = q.get('holiday').toLowerCase();
    } catch (e) {}
    const hm = (window.location.hash || '').toLowerCase().match(/^#fx-([a-z0-9-]+)/);
    if (hm) {
        hm[1].split('-').forEach(tok => {
            if (['rain', 'storm', 'snow', 'clouds', 'clear', 'night'].includes(tok)) out.weather = tok;
            else out.holiday = tok;
        });
    }
    if (out.weather === 'night') { out.weather = 'clear'; out.night = true; }
    return Object.keys(out).length ? out : null;
}

function smlcResolveScene() {
    const cp = smlcCentralParts();
    SMLC_FX.preview = smlcReadPreview();
    const pv = SMLC_FX.preview || {};
    SMLC_FX.weather = pv.weather || smlcWeatherFromCondition(window.smlcCurrentWeather && window.smlcCurrentWeather.condition);
    let hol = pv.holiday !== undefined ? pv.holiday : smlcDetectHoliday(cp);
    SMLC_FX.fall = pv.holiday !== undefined ? ['fall', 'halloween', 'thanksgiving'].includes(pv.holiday) : smlcIsFallSeason(cp);
    if (hol === 'fall' || hol === 'none') hol = null;
    SMLC_FX.holiday = hol;
    SMLC_FX.night = pv.night || smlcIsNight(cp);

    const root = document.documentElement;
    root.classList.toggle('smlc-fx-on', SMLC_FX.enabled);
    ['rain', 'storm', 'snow', 'clouds', 'clear'].forEach(w => root.classList.toggle(`smlc-wx-${w}`, SMLC_FX.enabled && SMLC_FX.weather === w));
    ['halloween', 'thanksgiving', 'christmas', 'newyear', 'valentine', 'stpatrick', 'july4'].forEach(hh => root.classList.toggle(`smlc-hol-${hh}`, SMLC_FX.enabled && SMLC_FX.holiday === hh));
    root.classList.toggle('smlc-fx-fall', SMLC_FX.enabled && SMLC_FX.fall);
    smlcUpdateSnowBuildUp();
    smlcBuildParticles();
    smlcUpdateFxToggleLabels();
}

// ---------- snow that builds up on the cards (and melts when it stops) ----------
function smlcUpdateSnowBuildUp() {
    const MAX = 18, MIN_START = 4;
    if (SMLC_FX.snowTimer) clearInterval(SMLC_FX.snowTimer);
    let saved = 0;
    try { saved = parseFloat(sessionStorage.getItem('smlc-snow-depth')) || 0; } catch (e) {}
    SMLC_FX.snowDepth = saved;
    const snowing = SMLC_FX.enabled && SMLC_FX.weather === 'snow';
    if (snowing && SMLC_FX.snowDepth < MIN_START) SMLC_FX.snowDepth = MIN_START;
    if (snowing && (SMLC_FX.reducedMotion || SMLC_FX.preview)) SMLC_FX.snowDepth = MAX;
    const apply = () => {
        document.documentElement.style.setProperty('--smlc-snow-depth', `${SMLC_FX.snowDepth.toFixed(1)}px`);
        document.documentElement.classList.toggle('smlc-snow-cap', SMLC_FX.snowDepth > 0.5);
        try { sessionStorage.setItem('smlc-snow-depth', String(SMLC_FX.snowDepth)); } catch (e) {}
    };
    apply();
    SMLC_FX.snowTimer = setInterval(() => {
        const step = 0.25;                                    // ~4 min to fully cover, then melts the same way
        SMLC_FX.snowDepth = snowing ? Math.min(MAX, SMLC_FX.snowDepth + step) : Math.max(0, SMLC_FX.snowDepth - step);
        apply();
    }, 4000);
}

// ---------- canvas + particles ----------
function smlcEnsureCanvas() {
    if (SMLC_FX.canvas) return;
    const c = document.createElement('canvas');
    c.id = 'smlc-fx-canvas';
    c.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(c, document.body.firstChild);
    SMLC_FX.canvas = c;
    SMLC_FX.ctx = c.getContext('2d');
    smlcResizeCanvas();
    window.addEventListener('resize', () => { smlcResizeCanvas(); smlcBuildParticles(); });
}

function smlcResizeCanvas() {
    const c = SMLC_FX.canvas;
    if (!c) return;
    SMLC_FX.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    SMLC_FX.w = window.innerWidth;
    SMLC_FX.h = window.innerHeight;
    c.width = Math.round(SMLC_FX.w * SMLC_FX.dpr);
    c.height = Math.round(SMLC_FX.h * SMLC_FX.dpr);
    SMLC_FX.ctx.setTransform(SMLC_FX.dpr, 0, 0, SMLC_FX.dpr, 0, 0);
}

const rnd = (a, b) => a + Math.random() * (b - a);

function smlcBuildParticles() {
    if (!SMLC_FX.canvas) return;
    const { w, h, weather, holiday, fall, night } = SMLC_FX;
    const scale = Math.max(0.45, Math.min(1, (w * h) / (1440 * 900)));   // fewer on phones
    const P = [];
    const add = (n, make) => { for (let i = 0; i < Math.round(n * scale); i++) P.push(make(true)); };

    // clouds: drifting soft shapes (heavier/darker when it rains or snows)
    SMLC_FX.clouds = [];
    const cloudCount = { clouds: 7, rain: 6, storm: 7, snow: 5 }[weather] || (night ? 0 : 2);
    for (let i = 0; i < cloudCount; i++) {
        SMLC_FX.clouds.push({ x: rnd(-200, w), y: rnd(-20, h * 0.55), r: rnd(90, 220), vx: rnd(4, 12), a: weather === 'clear' ? 0.05 : rnd(0.07, 0.13), dark: weather === 'storm' || weather === 'rain' });
    }

    // stars on clear nights
    SMLC_FX.stars = [];
    if (weather === 'clear' && night) {
        for (let i = 0; i < Math.round(120 * scale); i++) SMLC_FX.stars.push({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.4, 1.4), p: rnd(0, Math.PI * 2), s: rnd(0.6, 2) });
    }

    if (weather === 'rain' || weather === 'storm') add(weather === 'storm' ? 220 : 160, (init) => ({ t: 'rain', x: rnd(-50, w + 50), y: init ? rnd(-h, h) : rnd(-60, -10), len: rnd(12, 26), vy: rnd(620, 900), vx: -60, a: rnd(0.32, 0.6) }));
    if (weather === 'snow') add(170, (init) => ({ t: 'snow', x: rnd(0, w), y: init ? rnd(-h, h) : rnd(-20, -5), r: rnd(1.2, 3.6), vy: rnd(28, 70), sway: rnd(10, 35), ph: rnd(0, 6.28), a: rnd(0.55, 0.95) }));

    const leafColors = ['#C2410C', '#B45309', '#9A3412', '#A16207', '#7C2D12', '#DC2626'];
    const leafCount = (weather === 'snow') ? 0 : (weather === 'rain' || weather === 'storm') ? 10 : 26;
    if (fall || holiday === 'thanksgiving') add(leafCount, (init) => ({ t: 'leaf', x: rnd(0, w), y: init ? rnd(-h, h) : rnd(-40, -10), s: rnd(9, 16), vy: rnd(30, 60), vx: rnd(-15, 25), rot: rnd(0, 6.28), vr: rnd(-1.5, 1.5), sway: rnd(20, 50), ph: rnd(0, 6.28), c: leafColors[Math.floor(Math.random() * leafColors.length)] }));

    if (holiday === 'halloween') add(9, (init) => ({ t: 'bat', x: init ? rnd(0, w) : -40, y: rnd(h * 0.05, h * 0.6), s: rnd(16, 26), vx: rnd(35, 80), ph: rnd(0, 6.28), bob: rnd(10, 30) }));
    if (holiday === 'valentine') add(22, (init) => ({ t: 'heart', x: rnd(0, w), y: init ? rnd(0, h * 1.2) : h + 20, s: rnd(6, 13), vy: -rnd(20, 45), sway: rnd(10, 30), ph: rnd(0, 6.28), a: rnd(0.35, 0.7) }));
    if (holiday === 'stpatrick') add(20, (init) => ({ t: 'shamrock', x: rnd(0, w), y: init ? rnd(-h, h) : -20, s: rnd(7, 12), vy: rnd(25, 50), rot: rnd(0, 6.28), vr: rnd(-1, 1), sway: rnd(15, 35), ph: rnd(0, 6.28) }));
    if (holiday === 'christmas') add(40, () => ({ t: 'sparkle', x: rnd(0, w), y: rnd(0, h), r: rnd(1, 2.4), p: rnd(0, 6.28), c: ['#ff4d4d', '#4dff88', '#ffd24d', '#4dc3ff'][Math.floor(Math.random() * 4)] }));
    SMLC_FX.particles = P;
    SMLC_FX.bursts = [];

    if (SMLC_FX.reducedMotion) smlcDrawFrame(0, true);
}

function smlcRespawn(p) {
    const { w, h } = SMLC_FX;
    if (p.t === 'rain') { p.x = rnd(-50, w + 50); p.y = rnd(-60, -10); }
    else if (p.t === 'snow' || p.t === 'leaf' || p.t === 'shamrock') { p.x = rnd(0, w); p.y = rnd(-40, -8); }
    else if (p.t === 'heart') { p.x = rnd(0, w); p.y = h + 20; }
    else if (p.t === 'bat') { p.x = -40; p.y = rnd(h * 0.05, h * 0.6); }
}

function smlcDrawLeaf(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.c; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(0, -p.s);
    ctx.quadraticCurveTo(p.s * 0.9, -p.s * 0.2, 0, p.s);
    ctx.quadraticCurveTo(-p.s * 0.9, -p.s * 0.2, 0, -p.s); ctx.fill();
    ctx.strokeStyle = 'rgba(60,20,0,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(0, p.s * 1.2); ctx.stroke();
    ctx.restore();
}

function smlcDrawBat(ctx, p, t) {
    const flap = Math.sin(t * 9 + p.ph) * 0.6;
    ctx.save(); ctx.translate(p.x, p.y + Math.sin(t * 1.5 + p.ph) * p.bob); ctx.scale(p.s / 12, p.s / 12);
    ctx.fillStyle = 'rgba(18,12,24,.95)'; ctx.strokeStyle = 'rgba(255,150,50,.75)'; ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(255,140,40,.55)'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, -8 * flap - 4, -18, -6 * flap);
    ctx.quadraticCurveTo(-13, -1, -10, 2); ctx.quadraticCurveTo(-6, 0, -3, 3);
    ctx.lineTo(0, 1); ctx.lineTo(3, 3);
    ctx.quadraticCurveTo(6, 0, 10, 2); ctx.quadraticCurveTo(13, -1, 18, -6 * flap);
    ctx.quadraticCurveTo(8, -8 * flap - 4, 0, 0);
    ctx.fill(); ctx.stroke();
    ctx.restore();
}

function smlcDrawHeart(ctx, p) {
    const s = p.s;
    ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = p.a; ctx.fillStyle = '#ff4d8d';
    ctx.beginPath(); ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s, -s * 0.35, -s * 0.45, -s, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.45, -s, s, -s * 0.35, 0, s * 0.35); ctx.fill(); ctx.restore();
}

function smlcDrawShamrock(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = 'rgba(34,197,94,.75)';
    const r = p.s * 0.42;
    [[0, -r], [-r * 0.95, r * 0.35], [r * 0.95, r * 0.35]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.28); ctx.fill(); });
    ctx.strokeStyle = 'rgba(34,197,94,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.6, p.s * 1.1); ctx.stroke();
    ctx.restore();
}

function smlcSpawnFirework() {
    const { w, h } = SMLC_FX;
    const colors = SMLC_FX.holiday === 'july4' ? ['#ff3b3b', '#ffffff', '#3b82ff'] : ['#ffd24d', '#ff4dd2', '#4dffd2', '#ffffff', '#ff8a3d'];
    const cx = rnd(w * 0.1, w * 0.9), cy = rnd(h * 0.08, h * 0.45), col = colors[Math.floor(Math.random() * colors.length)];
    const sparks = [];
    for (let i = 0; i < 46; i++) { const ang = (i / 46) * 6.28, sp = rnd(60, 150); sparks.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp }); }
    SMLC_FX.bursts.push({ sparks, life: 1.6, max: 1.6, col });
}

function smlcDrawFrame(dt, still = false) {
    const ctx = SMLC_FX.ctx; if (!ctx) return;
    const { w, h } = SMLC_FX;
    const t = performance.now() / 1000;
    ctx.clearRect(0, 0, w, h);

    // clouds
    SMLC_FX.clouds.forEach(c => {
        if (!still) { c.x += c.vx * dt; if (c.x - c.r > w) c.x = -c.r * 2; }
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        const base = c.dark ? '120,130,150' : '220,225,235';
        g.addColorStop(0, `rgba(${base},${c.a})`); g.addColorStop(1, `rgba(${base},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r * 1.6, c.r * 0.7, 0, 0, 6.28); ctx.fill();
    });

    // stars
    SMLC_FX.stars.forEach(s => {
        const a = 0.35 + 0.35 * Math.sin(t * s.s + s.p);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill();
    });

    // particles
    for (const p of SMLC_FX.particles) {
        if (!still) {
            if (p.t === 'rain') { p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > h + 30) smlcRespawn(p); }
            else if (p.t === 'snow') { p.y += p.vy * dt; p.x += Math.sin(t * 0.8 + p.ph) * p.sway * dt; if (p.y > h + 10) smlcRespawn(p); }
            else if (p.t === 'leaf' || p.t === 'shamrock') { p.y += p.vy * dt; p.x += ((p.vx || 0) + Math.sin(t + p.ph) * p.sway) * dt; p.rot += p.vr * dt; if (p.y > h + 20 || p.x > w + 40) smlcRespawn(p); }
            else if (p.t === 'heart') { p.y += p.vy * dt; p.x += Math.sin(t + p.ph) * p.sway * dt; if (p.y < -30) smlcRespawn(p); }
            else if (p.t === 'bat') { p.x += p.vx * dt; if (p.x > w + 40) smlcRespawn(p); }
        }
        if (p.t === 'rain') { ctx.strokeStyle = `rgba(205,225,255,${p.a})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.02, p.y + p.len); ctx.stroke(); }
        else if (p.t === 'snow') { ctx.fillStyle = `rgba(255,255,255,${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); }
        else if (p.t === 'leaf') smlcDrawLeaf(ctx, p);
        else if (p.t === 'bat') smlcDrawBat(ctx, p, t);
        else if (p.t === 'heart') smlcDrawHeart(ctx, p);
        else if (p.t === 'shamrock') smlcDrawShamrock(ctx, p);
        else if (p.t === 'sparkle') { const a = 0.25 + 0.45 * Math.max(0, Math.sin(t * 1.7 + p.p)); ctx.fillStyle = p.c; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
    }

    // fireworks (New Year's / 4th of July)
    if (!still && (SMLC_FX.holiday === 'newyear' || SMLC_FX.holiday === 'july4') && Math.random() < dt * 0.9) smlcSpawnFirework();
    if (still && (SMLC_FX.holiday === 'newyear' || SMLC_FX.holiday === 'july4') && SMLC_FX.bursts.length === 0) { smlcSpawnFirework(); SMLC_FX.bursts.forEach(b => { b.sparks.forEach(s => { s.x += s.vx * 0.5; s.y += s.vy * 0.5; }); b.life = 1.2; }); }
    SMLC_FX.bursts = SMLC_FX.bursts.filter(b => b.life > 0);
    SMLC_FX.bursts.forEach(b => {
        if (!still) b.life -= dt;
        ctx.fillStyle = b.col; ctx.globalAlpha = Math.max(0, b.life / b.max) * 0.85;
        b.sparks.forEach(s => { if (!still) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt; } ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, 6.28); ctx.fill(); });
        ctx.globalAlpha = 1;
    });

    // lightning
    if (SMLC_FX.weather === 'storm' && !still) {
        if (t > SMLC_FX.nextFlash) { SMLC_FX.flash = 0.35; SMLC_FX.nextFlash = t + rnd(6, 14); }
        if (SMLC_FX.flash > 0) { ctx.fillStyle = `rgba(220,230,255,${SMLC_FX.flash})`; ctx.fillRect(0, 0, w, h); SMLC_FX.flash -= dt * 1.4; }
    }
}

function smlcLoop(ts) {
    const dt = Math.min(0.05, (ts - (SMLC_FX.lastT || ts)) / 1000);
    SMLC_FX.lastT = ts;
    smlcDrawFrame(dt);
    SMLC_FX.raf = requestAnimationFrame(smlcLoop);
}

function smlcStartFx() {
    smlcEnsureCanvas();
    if (SMLC_FX.raf) cancelAnimationFrame(SMLC_FX.raf);
    SMLC_FX.raf = null;
    if (!SMLC_FX.enabled) { SMLC_FX.ctx.clearRect(0, 0, SMLC_FX.w, SMLC_FX.h); return; }
    if (SMLC_FX.reducedMotion) { smlcDrawFrame(0, true); return; }
    SMLC_FX.lastT = 0;
    SMLC_FX.raf = requestAnimationFrame(smlcLoop);
}

// ---------- on/off switch ----------
function smlcUpdateFxToggleLabels() {
    document.querySelectorAll('.smlc-fx-toggle').forEach(btn => {
        btn.setAttribute('aria-pressed', SMLC_FX.enabled ? 'true' : 'false');
        const lbl = btn.querySelector('.smlc-fx-toggle-state');
        if (lbl) lbl.textContent = SMLC_FX.enabled ? 'On' : 'Off';
    });
}

window.toggleSmlcEffects = function () {
    SMLC_FX.enabled = !SMLC_FX.enabled;
    try { localStorage.setItem('smlc-fx', SMLC_FX.enabled ? 'on' : 'off'); } catch (e) {}
    smlcResolveScene();
    smlcStartFx();
};

function smlcAddFooterToggle() {
    const footer = document.querySelector('#global-footer-container .footer-simple-inner') || document.querySelector('footer');
    if (!footer || footer.querySelector('.smlc-fx-toggle')) return;
    const p = document.createElement('p');
    p.innerHTML = `<button type="button" class="smlc-fx-toggle smlc-fx-toggle-footer" onclick="toggleSmlcEffects()" aria-pressed="true"><span aria-hidden="true">&#10052;</span> Weather &amp; holiday effects: <span class="smlc-fx-toggle-state">On</span></button>`;
    footer.appendChild(p);
}

function initWeatherHolidayEffects() {
    try { SMLC_FX.enabled = localStorage.getItem('smlc-fx') !== 'off'; } catch (e) { SMLC_FX.enabled = true; }
    try {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        SMLC_FX.reducedMotion = mq.matches;
        const onMq = () => { SMLC_FX.reducedMotion = mq.matches; smlcBuildParticles(); smlcStartFx(); };
        if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
    } catch (e) {}
    smlcAddFooterToggle();
    smlcEnsureCanvas();
    smlcResolveScene();
    smlcStartFx();
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { if (SMLC_FX.raf) cancelAnimationFrame(SMLC_FX.raf); SMLC_FX.raf = null; }
        else smlcStartFx();
    });
    setInterval(() => { smlcResolveScene(); }, 10 * 60 * 1000);   // re-check holiday / night every 10 min
}

window.smlcWeatherChanged = function () {
    if (SMLC_FX.preview && SMLC_FX.preview.weather) return;
    const next = smlcWeatherFromCondition(window.smlcCurrentWeather && window.smlcCurrentWeather.condition);
    if (next !== SMLC_FX.weather) { smlcResolveScene(); smlcStartFx(); }
};

(function injectFxStyles() {
    if (document.getElementById('smlc-fx-styles')) return;
    const style = document.createElement('style');
    style.id = 'smlc-fx-styles';
    const CARDS = '.smlc-answers-inner, .clay-county-news-box, .news-clipping-wrapper, .newspaper-feed-chassis, .fuel-monitor-billboard-card, .point-of-interest-card, .article-card-chassis, .history-card, .proclamation-card-box, .et_pb_module_heading, .community-partner-card, .slideshow-box';
    const cardList = (suffix) => CARDS.split(',').map(s => s.trim())
        .filter(sel => !(suffix === '::after' && sel === '.et_pb_module_heading'))
        .map(sel => `html.smlc-fx-on ${sel}${suffix}`).join(',\n');
    style.textContent = `
        #smlc-fx-canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: -1; pointer-events: none; display: block; }
        html:not(.smlc-fx-on) #smlc-fx-canvas { display: none; }

        /* let the effects show through the big background bands (cards stay solid) */
        html.smlc-fx-on .smlc-three-column-portal-wrapper,
        html.smlc-fx-on .discover-split-layout,
        html.smlc-fx-on .historical-timeline-chassis-wrapper,
        html.smlc-fx-on .widescreen-strip-container,
        html.smlc-fx-on .proclamation-wrapper {
            background: linear-gradient(180deg, rgba(var(--town-primary-rgb, 2,88,163), .30), rgba(0,0,0,.42)) !important;
        }

        /* text that sits right on the background gets a 50% see-through panel */
        html.smlc-fx-on .discover-header-block,
        html.smlc-fx-on .timeline-header-block,
        html.smlc-fx-on .partners-horizontal-strip > .feed-loading-placeholder {
            background: rgba(0,0,0,.5); border-radius: 14px; padding: 14px 20px; width: fit-content; max-width: 100%;
            margin-left: auto; margin-right: auto; -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
        }

        /* cards behave like buildings: something can sit on the roof / in the corners */
        ${cardList('')} { position: relative; }

        /* SNOW piling up on top of every card */
        ${cardList('::before').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-snow-cap')} {
            content: ''; position: absolute; left: -5px; right: -5px; z-index: 3; pointer-events: none;
            top: calc(-1 * var(--smlc-snow-depth, 0px) + 3px); height: var(--smlc-snow-depth, 0px);
            border-radius: 10px 12px 3px 3px;
            background:
                radial-gradient(ellipse 15px 8px at 50% 100%, #fff 96%, transparent 100%) 0 0 / 26px 60% repeat-x,
                linear-gradient(#ffffff, #e9f1fb) bottom / 100% 62% no-repeat;
            filter: drop-shadow(0 2px 2px rgba(0,0,0,.35));
            transition: height 3.5s linear, top 3.5s linear;
        }

        /* RAIN beading along the roofline */
        ${cardList('::before').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on:not(.smlc-snow-cap).smlc-wx-rain')},
        ${cardList('::before').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on:not(.smlc-snow-cap).smlc-wx-storm')} {
            content: ''; position: absolute; left: 6px; right: 6px; top: -3px; height: 6px; z-index: 3; pointer-events: none;
            background: radial-gradient(circle at 50% 30%, rgba(210,230,255,.9) 0 1.6px, rgba(150,190,240,.5) 2.2px, transparent 2.8px) 0 0 / 17px 6px repeat-x;
        }

        /* CHRISTMAS string lights along the top (when it isn't snowing) */
        ${cardList('::before').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on:not(.smlc-snow-cap):not(.smlc-wx-rain):not(.smlc-wx-storm).smlc-hol-christmas')} {
            content: ''; position: absolute; left: 4px; right: 4px; top: -7px; height: 12px; z-index: 3; pointer-events: none;
            background:
                radial-gradient(circle at 6px 8px, #ff3b3b 0 3px, transparent 3.5px) 0 0 / 44px 12px repeat-x,
                radial-gradient(circle at 17px 9px, #34d058 0 3px, transparent 3.5px) 0 0 / 44px 12px repeat-x,
                radial-gradient(circle at 28px 8px, #ffd23b 0 3px, transparent 3.5px) 0 0 / 44px 12px repeat-x,
                radial-gradient(circle at 39px 9px, #3bb4ff 0 3px, transparent 3.5px) 0 0 / 44px 12px repeat-x,
                linear-gradient(#2b2b2b, #2b2b2b) 0 4px / 100% 1.5px no-repeat;
            animation: smlcLightsTwinkle 2.4s ease-in-out infinite;
        }
        @keyframes smlcLightsTwinkle { 0%,100% { filter: brightness(1) drop-shadow(0 0 3px rgba(255,255,255,.5)); } 50% { filter: brightness(1.45) drop-shadow(0 0 6px rgba(255,240,180,.8)); } }

        /* corner decorations (leaves pile up in fall, holiday items) */
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-fx-fall')},
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-halloween')},
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-thanksgiving')},
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-christmas')},
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-valentine')},
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-stpatrick')},
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-july4')},
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-newyear')} {
            position: absolute; right: -6px; bottom: -10px; z-index: 3; pointer-events: none; line-height: 1;
            font-size: 1.25rem; letter-spacing: -6px; filter: drop-shadow(0 2px 2px rgba(0,0,0,.5));
            content: '\\1F342\\1F341\\1F342'; content: '\\1F342\\1F341\\1F342' / '';
        }
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-halloween')} { content: '\\1F342\\1F383'; content: '\\1F342\\1F383' / ''; font-size: 1.375rem; letter-spacing: -4px; }
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-thanksgiving')} { content: '\\1F342\\1F33D\\1F383'; content: '\\1F342\\1F33D\\1F383' / ''; letter-spacing: -4px; }
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-christmas')} { content: '\\1F384'; content: '\\1F384' / ''; font-size: 1.625rem; letter-spacing: 0; bottom: -6px; }
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-valentine')} { content: '\\1F495'; content: '\\1F495' / ''; letter-spacing: 0; }
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-stpatrick')} { content: '\\2618\\FE0F'; content: '\\2618\\FE0F' / ''; letter-spacing: 0; }
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-july4')} { content: '\\1F1FA\\1F1F8'; content: '\\1F1FA\\1F1F8' / ''; letter-spacing: 0; }
        ${cardList('::after').replace(/html\.smlc-fx-on/g, 'html.smlc-fx-on.smlc-hol-newyear')} { content: '\\1F389'; content: '\\1F389' / ''; letter-spacing: 0; }

        html.smlc-fx-on .clipping-tag, html.smlc-fx-on .notice-tag-red { z-index: 4; }
        .smlc-fx-toggle-footer { background: transparent; border: 1px solid rgba(255,255,255,.35); color: #fff; border-radius: 999px; padding: 8px 16px; min-height: 40px;
            font: 700 0.8125rem 'Oswald', 'Arial Narrow', sans-serif; letter-spacing: .8px; text-transform: uppercase; cursor: pointer; }
        .smlc-fx-toggle-footer:hover { border-color: var(--town-accent, var(--flora-orange, #FFC10E)); }
        .smlc-fx-toggle[aria-pressed="false"] .smlc-fx-toggle-state { color: #ff8a8a; }
        .smlc-fx-toggle[aria-pressed="true"] .smlc-fx-toggle-state { color: #8affb0; }
        @media (prefers-reduced-motion: reduce) { html.smlc-fx-on * { transition: none !important; } html.smlc-fx-on .smlc-hol-christmas *::before { animation: none !important; } }
    `;
    (document.head || document.documentElement).appendChild(style);
})();

// ============================================================================
// EVERY PICTURE OPENS IN THE LIGHTBOX
// Pictures with their own click action keep it; any other picture on the page opens
// the lightbox with its title, description, link and its alt text (the alt text is
// only ever shown there, never on the page itself).
// ============================================================================
document.addEventListener('click', (e) => {
    const img = e.target.closest ? e.target.closest('img') : null;
    if (!img || typeof fireLightbox !== 'function') return;
    if (img.onclick || img.getAttribute('onclick') || img.classList.contains('lightbox-triggerable-element')) return;
    if (img.closest('a, button, [onclick], .menu-bar, .smlc-top-nav, #smlc-bottom-nav, .smlc-bn-sheet, #portal-global-lightbox, #weather-fiveday-forecast-modal, .weather-pill, #portal-weather-current-badge, .scorestream-widget-container, .site-brand-header')) return;
    if (img.dataset.smlcImgFailed === '1' || !img.currentSrc) return;
    const card = img.closest('.history-card, .clay-county-news-box, .point-of-interest-card, .article-inner-box, .community-partner-card, .news-matrix-card, section, .main-container');
    const heading = card ? card.querySelector('h1, h2, h3, h4, .biz-title, .partner-title') : null;
    const d = img.dataset || {};
    fireLightbox(img.currentSrc || img.src, d.title || (heading ? heading.textContent.trim() : ''), d.date || '', d.desc || '', d.link || '', img.getAttribute('alt') || d.alt || '');
});

// ============================================================================
// ACCESSIBILITY (screen readers, keyboard, low vision)
// Invisible to mouse/touch users. Adds:
//  - popups (lightbox, forecast, alerts, phone menus) announced as dialogs, focus moved in,
//    Tab kept inside, Esc closes, focus returned afterwards
//  - every clickable picture / card reachable with Tab and opened with Enter or Space
//  - the two pills announced as tabs ("Local Events & News, tab, selected")
//  - polite announcements when sections change or content finishes loading
//  - matches device settings: increased contrast, forced colors, larger text
//  - optional Accessibility panel: bigger text, high contrast, underlined links,
//    easy-to-read font, background effects off (saved on the device)
// ============================================================================
const SMLC_A11Y_KEY = 'smlc-a11y';
let smlcA11yPrefs = { text: 0, contrast: false, underline: false, readable: false };

// ---------- polite screen-reader announcements ----------
function smlcAnnounce(message) {
    let region = document.getElementById('smlc-live-region');
    if (!region) {
        region = document.createElement('div');
        region.id = 'smlc-live-region';
        region.className = 'smlc-sr-only';
        region.setAttribute('aria-live', 'polite');
        region.setAttribute('aria-atomic', 'true');
        document.body.appendChild(region);
    }
    region.textContent = '';
    setTimeout(() => { region.textContent = message; }, 60);
}
window.smlcAnnounce = smlcAnnounce;

// ---------- dialogs: focus in, Tab trapped, Esc closes, focus returned ----------
const SMLC_FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
const smlcOpenDialogs = [];

function smlcDialogIsOpen(overlay) {
    return overlay && overlay.isConnected && getComputedStyle(overlay).display !== 'none' && getComputedStyle(overlay).visibility !== 'hidden';
}

function smlcRegisterDialog(overlay, panel, labelEl, closeFn) {
    if (!overlay || overlay.dataset.smlcDialog === '1') return;
    overlay.dataset.smlcDialog = '1';
    const target = panel || overlay;
    target.setAttribute('role', 'dialog');
    target.setAttribute('aria-modal', 'true');
    if (labelEl) { if (!labelEl.id) labelEl.id = 'smlc-dlg-' + Math.random().toString(36).slice(2, 8); target.setAttribute('aria-labelledby', labelEl.id); }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    let wasOpen = smlcDialogIsOpen(overlay);
    const onChange = () => {
        const open = smlcDialogIsOpen(overlay);
        if (open && !wasOpen) {
            const entry = { overlay, target, closeFn, returnTo: document.activeElement };
            smlcOpenDialogs.push(entry);
            setTimeout(() => {
                const closeBtn = target.querySelector('.lightbox-close-btn, button[aria-label="Close"], button');
                (closeBtn || target).focus({ preventScroll: true });
            }, 30);
        } else if (!open && wasOpen) {
            const idx = smlcOpenDialogs.findIndex(d => d.overlay === overlay);
            if (idx > -1) {
                const entry = smlcOpenDialogs.splice(idx, 1)[0];
                if (entry.returnTo && entry.returnTo.isConnected && typeof entry.returnTo.focus === 'function') entry.returnTo.focus({ preventScroll: true });
            }
        }
        wasOpen = open;
    };
    new MutationObserver(onChange).observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
}

document.addEventListener('keydown', (e) => {
    const top = smlcOpenDialogs[smlcOpenDialogs.length - 1];
    if (!top || !smlcDialogIsOpen(top.overlay)) return;
    if (e.key === 'Escape') { e.preventDefault(); top.closeFn(); return; }
    if (e.key === 'Tab') {
        const items = Array.from(top.target.querySelectorAll(SMLC_FOCUSABLE)).filter(el => el.offsetParent !== null || el === document.activeElement);
        if (!items.length) { e.preventDefault(); return; }
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !top.target.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !top.target.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
});

function smlcWireKnownDialogs() {
    const lb = document.getElementById('portal-global-lightbox');
    if (lb) {
        const closeBtn = lb.querySelector('.lightbox-close-btn');
        if (closeBtn && !closeBtn.getAttribute('aria-label')) closeBtn.setAttribute('aria-label', 'Close');
        smlcRegisterDialog(lb, lb.querySelector('.lightbox-modal-window'), document.getElementById('lightbox-target-title'), () => { lb.style.display = 'none'; });
    }
    const fc = document.getElementById('weather-fiveday-forecast-modal');
    if (fc) smlcRegisterDialog(fc, fc.firstElementChild, fc.querySelector('span'), () => { fc.style.display = 'none'; });
    const wa = document.getElementById('weather-alert-popup-modal');
    if (wa) smlcRegisterDialog(wa, wa.firstElementChild, wa.querySelector('h2, h3, strong'), () => { if (typeof window.hideWeatherAlertModalPopup === 'function') window.hideWeatherAlertModalPopup(); else wa.style.display = 'none'; });
    ['towns', 'more'].forEach(w => {
        const sh = document.getElementById(`smlc-bn-sheet-${w}`);
        if (sh) smlcRegisterDialog(sh, sh, sh.querySelector('.smlc-bn-sheet-title'), () => closeBottomNavSheets());
    });
    const ap = document.getElementById('smlc-a11y-panel');
    if (ap) smlcRegisterDialog(ap, ap.querySelector('.smlc-a11y-card'), ap.querySelector('h2'), () => { ap.hidden = true; ap.style.display = 'none'; });
}

// ---------- make mouse-only click targets work with the keyboard ----------
const SMLC_CLICKABLE_SELECTOR = [
    'img[onclick]', 'img.lightbox-triggerable-element', '#point-of-interest-img-1', '#point-of-interest-img-2',
    '#spotlight-asset-img', '#article-img', '.slider-slide img', '.partner-logo-asset', '.history-card',
    '.read-more-btn', '.read-more-trigger', '#fuel-monitor-target-box', '#portal-weather-current-badge',
    'div[onclick]', 'span[onclick]', 'main img'
].join(', ');

function smlcEnhanceClickables(root = document) {
    root.querySelectorAll(SMLC_CLICKABLE_SELECTOR).forEach(el => {
        if (el.dataset.smlcKb === '1') return;
        if (el.closest('a, button, summary, .scorestream-widget-container, .site-brand-header, #portal-global-lightbox')) return;
        if (el.matches('.lightbox-overlay-mask, .slider-viewport')) return;
        if (el.tagName === 'IMG' && (el.dataset.smlcImgFailed === '1' || el.closest('.menu-bar, .weather-pill, #fuel-monitor-target-box, .history-card, .station-logo-frame'))) return;
        el.dataset.smlcKb = '1';
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        if (el.tagName === 'IMG') {
            const alt = (el.getAttribute('alt') || '').trim();
            el.setAttribute('aria-label', alt ? `Open picture: ${alt}` : 'Open picture');
        } else if (el.id === 'fuel-monitor-target-box') {
            el.setAttribute('aria-label', 'Fuel prices. Open the fuel price page');
        } else if (el.id === 'portal-weather-current-badge') {
            el.setAttribute('aria-label', 'Current weather. Open the 5-day forecast');
        } else if (el.classList.contains('history-card')) {
            const t = el.querySelector('h3'); const y = el.querySelector('h2');
            el.setAttribute('aria-label', `Read more: ${(y ? y.textContent + ', ' : '')}${t ? t.textContent : 'history'}`);
        }
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
        });
    });
}

// ---------- pills as tabs ----------
function smlcSetupPillTabs() {
    const nav = document.querySelector('.portal-pill-tabs-nav');
    if (!nav || nav.dataset.smlcTabs === '1') return;
    const tabs = Array.from(nav.querySelectorAll('.portal-pill-btn'));
    if (!tabs.length) return;
    nav.dataset.smlcTabs = '1';
    const list = document.createElement('div');
    list.className = 'smlc-pill-tablist';
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', 'Page sections');
    nav.insertBefore(list, tabs[0]);
    tabs.forEach((btn, i) => {
        list.appendChild(btn);
        const m = (btn.getAttribute('onclick') || '').match(/'(pill-panel-[\w-]+)'/);
        const panel = m ? document.getElementById(m[1]) : null;
        if (!btn.id) btn.id = `smlc-pill-tab-${i}`;
        btn.setAttribute('role', 'tab');
        if (panel) {
            btn.setAttribute('aria-controls', panel.id);
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', btn.id);
        }
        btn.addEventListener('keydown', (e) => {
            if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
            e.preventDefault();
            let n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[n].focus(); tabs[n].click();
        });
    });
    const sync = () => tabs.forEach(b => {
        const sel = b.classList.contains('active');
        b.setAttribute('aria-selected', sel ? 'true' : 'false');
        b.setAttribute('tabindex', sel ? '0' : '-1');
    });
    sync();
    const original = window.switchPortalPill;
    window.switchPortalPill = function (btn, panelId) {
        if (typeof original === 'function') original(btn, panelId);
        sync();
        if (btn) smlcAnnounce(`Showing ${btn.textContent.trim()}`);
    };
}

// ---------- headings in order + regions named ----------
function smlcFixStructure() {
    document.querySelectorAll('.widescreen-strip-container').forEach((strip, i) => {
        if (strip.querySelector('.smlc-sr-heading')) return;
        const h = document.createElement('h2');
        h.className = 'smlc-sr-only smlc-sr-heading';
        h.textContent = i === 0 ? 'Local partners' : 'More local partners';
        strip.insertBefore(h, strip.firstChild);
        strip.setAttribute('role', 'region');
        strip.setAttribute('aria-label', h.textContent);
    });
    const billboard = document.querySelector('.header-billboard-link');
    if (billboard && !billboard.getAttribute('aria-label')) billboard.setAttribute('aria-label', 'Support My Local Community home');
    ['bulletin-scroller-target', 'news-matrix-target'].forEach(id => {
        const el = document.getElementById(id);
        if (el && /Loading/i.test(el.textContent)) el.setAttribute('aria-busy', 'true');
    });
}

// partner names / event titles: real heading levels (h3 under the section h2)
function smlcFixPartnerHeadings(root) {
    root.querySelectorAll('h4.partner-title').forEach(h4 => {
        const h3 = document.createElement('h3');
        h3.className = h4.className; h3.innerHTML = h4.innerHTML;
        h4.replaceWith(h3);
    });
}

// ---------- preferences ----------
function smlcLoadA11yPrefs() {
    try { Object.assign(smlcA11yPrefs, JSON.parse(localStorage.getItem(SMLC_A11Y_KEY) || '{}')); } catch (e) {}
}
function smlcSaveA11yPrefs() {
    try { localStorage.setItem(SMLC_A11Y_KEY, JSON.stringify(smlcA11yPrefs)); } catch (e) {}
}
function smlcApplyA11yPrefs() {
    const root = document.documentElement;
    let deviceContrast = false;
    try { deviceContrast = window.matchMedia('(prefers-contrast: more)').matches; } catch (e) {}
    root.classList.toggle('smlc-a11y-text-1', smlcA11yPrefs.text === 1);
    root.classList.toggle('smlc-a11y-text-2', smlcA11yPrefs.text === 2);
    root.classList.toggle('smlc-hc', !!smlcA11yPrefs.contrast || deviceContrast);
    root.classList.toggle('smlc-underline', !!smlcA11yPrefs.underline);
    root.classList.toggle('smlc-readable', !!smlcA11yPrefs.readable);
    if (smlcA11yPrefs.readable && !document.getElementById('smlc-readable-font')) {
        const l = document.createElement('link');
        l.id = 'smlc-readable-font'; l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap';
        document.head.appendChild(l);
    }
    smlcSyncA11yPanel();
    if (typeof window.smlcRefitPartnerStrips === 'function') setTimeout(window.smlcRefitPartnerStrips, 50);
}

function smlcSyncA11yPanel() {
    const panel = document.getElementById('smlc-a11y-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-a11y-text]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.a11yText === smlcA11yPrefs.text)));
    const set = (key, val) => { const el = panel.querySelector(`[data-a11y="${key}"]`); if (el) el.checked = !!val; };
    set('contrast', smlcA11yPrefs.contrast); set('underline', smlcA11yPrefs.underline); set('readable', smlcA11yPrefs.readable);
    set('effects', typeof SMLC_FX !== 'undefined' ? SMLC_FX.enabled : true);
}

window.openSmlcAccessibilityPanel = function () {
    let panel = document.getElementById('smlc-a11y-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'smlc-a11y-panel';
        panel.className = 'smlc-a11y-overlay';
        panel.innerHTML = `
            <div class="smlc-a11y-card">
                <div class="smlc-a11y-head"><h2>Accessibility</h2><button type="button" class="smlc-a11y-close" aria-label="Close">&times;</button></div>
                <p class="smlc-a11y-intro">Adjust the site to make it easier to read. Your choices are saved on this device.</p>
                <fieldset class="smlc-a11y-group"><legend>Text size</legend>
                    <div class="smlc-a11y-seg">
                        <button type="button" data-a11y-text="0" aria-pressed="true">Normal</button>
                        <button type="button" data-a11y-text="1" aria-pressed="false">Large</button>
                        <button type="button" data-a11y-text="2" aria-pressed="false">Larger</button>
                    </div>
                </fieldset>
                <label class="smlc-a11y-switch"><input type="checkbox" data-a11y="contrast"><span>High contrast</span></label>
                <label class="smlc-a11y-switch"><input type="checkbox" data-a11y="underline"><span>Underline all links</span></label>
                <label class="smlc-a11y-switch"><input type="checkbox" data-a11y="readable"><span>Easy-to-read font</span></label>
                <label class="smlc-a11y-switch"><input type="checkbox" data-a11y="effects"><span>Weather &amp; holiday effects</span></label>
                <div class="smlc-a11y-actions"><button type="button" class="smlc-a11y-reset">Reset to default</button><button type="button" class="smlc-a11y-done">Done</button></div>
            </div>`;
        document.body.appendChild(panel);
        const close = () => { panel.style.display = 'none'; };
        panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
        panel.querySelector('.smlc-a11y-close').addEventListener('click', close);
        panel.querySelector('.smlc-a11y-done').addEventListener('click', close);
        panel.querySelectorAll('[data-a11y-text]').forEach(b => b.addEventListener('click', () => {
            smlcA11yPrefs.text = +b.dataset.a11yText; smlcSaveA11yPrefs(); smlcApplyA11yPrefs();
            smlcAnnounce(`Text size ${b.textContent}`);
        }));
        panel.querySelectorAll('input[data-a11y]').forEach(inp => inp.addEventListener('change', () => {
            const key = inp.dataset.a11y;
            if (key === 'effects') {
                if (typeof SMLC_FX !== 'undefined' && SMLC_FX.enabled !== inp.checked) window.toggleSmlcEffects();
            } else {
                smlcA11yPrefs[key] = inp.checked; smlcSaveA11yPrefs(); smlcApplyA11yPrefs();
            }
            smlcAnnounce(`${inp.nextElementSibling.textContent} ${inp.checked ? 'on' : 'off'}`);
        }));
        panel.querySelector('.smlc-a11y-reset').addEventListener('click', () => {
            smlcA11yPrefs = { text: 0, contrast: false, underline: false, readable: false };
            smlcSaveA11yPrefs(); smlcApplyA11yPrefs();
            if (typeof SMLC_FX !== 'undefined' && !SMLC_FX.enabled) window.toggleSmlcEffects();
            smlcSyncA11yPanel();
            smlcAnnounce('Accessibility settings reset');
        });
        smlcWireKnownDialogs();
    }
    if (typeof closeBottomNavSheets === 'function') closeBottomNavSheets();
    smlcSyncA11yPanel();
    panel.style.display = 'flex';
};

function smlcAddA11yEntryPoints() {
    const footer = document.querySelector('#global-footer-container .footer-simple-inner') || document.querySelector('footer');
    if (footer && !footer.querySelector('.smlc-a11y-open')) {
        const p = document.createElement('p');
        p.innerHTML = `<button type="button" class="smlc-a11y-open smlc-fx-toggle-footer" onclick="openSmlcAccessibilityPanel()"><span aria-hidden="true">&#9855;</span> Accessibility options</button>`;
        footer.appendChild(p);
    }
}

function initAccessibility() {
    smlcLoadA11yPrefs();
    smlcApplyA11yPrefs();
    smlcAddA11yEntryPoints();
    smlcSetupPillTabs();
    smlcFixStructure();
    smlcWireKnownDialogs();
    smlcEnhanceClickables();
    smlcFixPartnerHeadings(document);
    try {
        const mq = window.matchMedia('(prefers-contrast: more)');
        const h = () => smlcApplyA11yPrefs();
        if (mq.addEventListener) mq.addEventListener('change', h); else mq.addListener(h);
    } catch (e) {}

    // content arrives later from Firebase: keep enhancing + announce finished loads
    let pending = null;
    new MutationObserver((muts) => {
        clearTimeout(pending);
        pending = setTimeout(() => {
            smlcEnhanceClickables();
            smlcFixPartnerHeadings(document);
            smlcWireKnownDialogs();
            ['bulletin-scroller-target', 'news-matrix-target'].forEach(id => {
                const el = document.getElementById(id);
                if (el && el.getAttribute('aria-busy') === 'true' && !/Loading/i.test(el.textContent)) {
                    el.setAttribute('aria-busy', 'false');
                }
            });
        }, 150);
    }).observe(document.body, { childList: true, subtree: true });
}

(function injectA11yStyles() {
    if (document.getElementById('smlc-a11y-styles')) return;
    const style = document.createElement('style');
    style.id = 'smlc-a11y-styles';
    style.textContent = `
        .smlc-sr-only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important;
            overflow: hidden !important; clip: rect(0 0 0 0) !important; white-space: nowrap !important; border: 0 !important; }
        .smlc-pill-tablist { display: contents; }

        /* a clear focus ring that shows on light AND dark backgrounds (keyboard only) */
        :focus-visible { outline: 3px solid var(--town-accent, var(--flora-orange, #FFC10E)) !important; outline-offset: 2px !important; box-shadow: 0 0 0 6px rgba(0,0,0,.85) !important; }
        [role="button"][tabindex="0"] { cursor: pointer; }

        /* accent text on dark cards in night view stays readable */
        @media (prefers-color-scheme: dark) {
            .biz-location, .read-more-trigger { color: var(--on-card-accent, #9ccfff) !important; }
        }

        /* text size: the whole site scales from the root size */
        html.smlc-a11y-text-1 { font-size: 118.75%; }
        html.smlc-a11y-text-2 { font-size: 137.5%; }

        /* underline links */
        html.smlc-underline a { text-decoration: underline !important; text-underline-offset: 2px; }

        /* easy-to-read font */
        html.smlc-readable body, html.smlc-readable body *:not(.smlc-sr-only) { font-family: 'Atkinson Hyperlegible', Verdana, Tahoma, Arial, sans-serif !important; letter-spacing: .01em !important; }

        /* high contrast (device "Increase contrast" or the Accessibility panel) */
        html.smlc-hc body { background: #000 !important; }
        html.smlc-hc #smlc-fx-canvas { display: none !important; }
        html.smlc-hc body :is(main, section, article, header, footer, nav, div, p, span, li, h1, h2, h3, h4, h5, h6, figure, figcaption, strong, em, label, legend, fieldset):not(.smlc-event-status):not(.smlc-event-status *):not(.price-box *):not(.smlc-img-unavailable) {
            background-color: #000 !important; background-image: none !important; color: #fff !important; text-shadow: none !important; box-shadow: none !important; filter: none !important; }
        html.smlc-hc body :is(a, a *) { color: #ffeb3b !important; text-decoration: underline !important; }
        html.smlc-hc body :is(button, summary, .portal-pill-btn, .weather-pill, .directory-tile-link, .event-clipping-btn, .fb-action-btn, .spotlight-btn, .town-directory-interactive-btn, .smlc-bn-btn, .smlc-bn-row) {
            background: #000 !important; color: #fff !important; border: 2px solid #fff !important; text-shadow: none !important; box-shadow: none !important; }
        html.smlc-hc body .portal-pill-btn.active, html.smlc-hc body .portal-pill-btn[aria-selected="true"] { background: #fff !important; color: #000 !important; }
        html.smlc-hc body :is(.clay-county-news-box, .news-clipping-wrapper, .newspaper-feed-chassis, .news-matrix-card, .fuel-monitor-billboard-card, .point-of-interest-card, .article-inner-box, .history-card, .proclamation-card-box, .community-partner-card, .smlc-answers-inner, .et_pb_module_heading, .lightbox-modal-window, .smlc-bn-sheet, .smlc-a11y-card) {
            border: 2px solid #fff !important; outline: none !important; }
        html.smlc-hc body .smlc-event-status { background: #fff !important; color: #000 !important; box-shadow: none !important; animation: none !important; }
        html.smlc-hc body *::before, html.smlc-hc body *::after { text-shadow: none; }
        html.smlc-hc.smlc-fx-on .clay-county-news-box::after, html.smlc-hc.smlc-fx-on *::after { content: none !important; }

        /* Windows High Contrast / forced colors */
        @media (forced-colors: active) {
            #smlc-fx-canvas { display: none !important; }
            html.smlc-fx-on *::before, html.smlc-fx-on *::after { content: none !important; }
            .portal-pill-btn, .weather-pill, .smlc-bn-btn, .directory-tile-link { border: 2px solid ButtonText !important; }
            .smlc-event-status { border: 2px solid CanvasText; }
        }

        /* Accessibility panel */
        .smlc-a11y-overlay { position: fixed; inset: 0; z-index: 10050; display: none; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.75); }
        .smlc-a11y-card { width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; background: #141416; color: #fff; border: 2px solid var(--town-accent, #FFC10E); border-radius: 14px; padding: 18px 20px; box-sizing: border-box; }
        .smlc-a11y-head { display: flex; justify-content: space-between; align-items: center; }
        .smlc-a11y-head h2 { margin: 0; font: 700 1.4rem 'Oswald', 'Arial Narrow', sans-serif; letter-spacing: 1px; text-transform: uppercase; }
        .smlc-a11y-close { min-width: 44px; min-height: 44px; background: none; border: 0; color: #fff; font-size: 1.8rem; cursor: pointer; }
        .smlc-a11y-intro { margin: 6px 0 14px; color: #d4d4d8; font-size: .95rem; line-height: 1.5; }
        .smlc-a11y-group { border: 0; margin: 0 0 12px; padding: 0; }
        .smlc-a11y-group legend { font: 700 .85rem 'Oswald', sans-serif; letter-spacing: 1px; text-transform: uppercase; color: #bdbdc4; margin-bottom: 6px; }
        .smlc-a11y-seg { display: flex; gap: 6px; }
        .smlc-a11y-seg button { flex: 1; min-height: 44px; background: #1f1f23; color: #fff; border: 1px solid #444; border-radius: 8px; font: 700 .95rem 'Oswald', sans-serif; cursor: pointer; }
        .smlc-a11y-seg button[aria-pressed="true"] { background: var(--town-accent, #FFC10E); color: var(--town-on-accent, #000); border-color: var(--town-accent, #FFC10E); }
        .smlc-a11y-switch { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 6px 12px; margin: 0 0 8px; background: #1f1f23; border: 1px solid #333; border-radius: 10px; cursor: pointer; font-size: 1rem; }
        .smlc-a11y-switch input { width: 22px; height: 22px; accent-color: var(--town-accent, #FFC10E); }
        .smlc-a11y-actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 14px; }
        .smlc-a11y-actions button { min-height: 44px; padding: 8px 16px; border-radius: 8px; font: 700 .95rem 'Oswald', sans-serif; letter-spacing: .5px; cursor: pointer; }
        .smlc-a11y-reset { background: none; color: #fff; border: 1px solid #666; }
        .smlc-a11y-done { background: var(--town-accent, #FFC10E); color: var(--town-on-accent, #000); border: 0; }
    `;
    (document.head || document.documentElement).appendChild(style);
})();

// === DOM EVENT LISTENERS ===
window.addEventListener('hashchange', () => {
    handleSPAHashNavigation();
    if (SMLC_FX.canvas) { smlcResolveScene(); smlcStartFx(); }
});

window.addEventListener('DOMContentLoaded', () => {
    handleSPAHashNavigation();
    startCentralFooterClock();
    initWeatherHolidayEffects();
    initAccessibility();
});
