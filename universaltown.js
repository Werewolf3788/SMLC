/* ==========================================================================
   Active Version: v1.5.0
   File: universaltown.js
   Project: SMLC County Portal Semantic Master Script
   Description: Complete multi-town engine connecting to Firebase RTDB.
                - AdBlock-immune naming for community partners
                - Smooth touch/hover-pausing partner & photo carousels
                - Dual individual & global Google/iCal calendar subscription hooks
                - Zero "TBA" strings (defaults to "All Day Event")
                - Strict town-specific & global news parsing
                - Automatic suppression & scrubbing of WNOI copyrights & links
                - Turn-by-turn navigation (Apple Maps on iOS, Google Maps on Android/PC)
                - Dynamic plain-text URL linkification in modals
                - Deep GA4 engagement, impression, outbound, & contact event tracking
                - Dynamic DOM translation re-triggering for Google Translate
   Timestamp: 2026-10-10 18:40 EDT (New York)
   ========================================================================== */

// Line 23: Google Translate Global Callback & Dynamic Mutation Scanner
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

// Re-notify Google Translate when dynamic Firebase content renders into DOM
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

// Line 52: Master Town Alias & Keyword Filter Definitions
const TOWN_ALIAS_MAP = {
    "HOME": { 
        primaryName: "Clay County", 
        dbTownKey: "Global", 
        jsonKey: "all", 
        gasKey: ["louisville", "flora", "clay-city", "xenia"], 
        historyKey: "all", 
        keywords: [], 
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
        keywords: [], 
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
        keywords: ["CLAY CITY", "CC", "CUBIES"], 
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
        keywords: ["FLORA", "WOLVES", "WOLVES FOOTBALL", "WOLF PUP", "FLO"], 
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
        keywords: ["SAILOR SPRINGS"], 
        isHome: false, 
        seatBadge: "Clay County Village", 
        estMeta: "Est. 1879 | Zip Code 62879", 
        riverMarquee: "HISTORIC MINERAL SPRINGS HAVEN", 
        themeAccent: "#00695C" 
    }
};

// Line 148: Active Town Config Resolver
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
        smlc_local_news_json: "//raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json",
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

window.calendarCachedEvents = [];
window.historyCachedTimeline = [];
window.newsCacheBlock = [];
window.townPartnersPool = [];
window.globalPartnersPool = [];

// Line 208: Reset Intervals
function resetAllActiveTimers() {
    if (globalSlideshowTicker) { clearInterval(globalSlideshowTicker); globalSlideshowTicker = null; }
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
    if (topCarouselInterval) { clearInterval(topCarouselInterval); topCarouselInterval = null; }
    if (bottomCarouselInterval) { clearInterval(bottomCarouselInterval); bottomCarouselInterval = null; }
}

function cleanRawUrl(urlStr) {
    if (!urlStr) return "";
    return urlStr.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").replace("/edit/", "/");
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

// Convert any plain text URLs inside descriptions or strings into active, clickable links
function linkifyRawUrls(text) {
    if (!text) return "";
    const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    return String(text).replace(urlPattern, (match) => {
        let cleanHref = match;
        if (!cleanHref.match(/^https?:\/\//i)) {
            cleanHref = '//' + cleanHref;
        }
        return `<a href="${cleanHref}" target="_blank" rel="noopener" style="color:var(--link-bright-blue); text-decoration:underline; word-break:break-all;">${match}</a>`;
    });
}

// Line 255: WNOI Text & Link Sanitizer
function sanitizeWnoiContent(rawText) {
    if (!rawText) return "";
    return String(rawText)
        .replace(/©\s*wnoi(\.com)?/gi, '')
        .replace(/copyright\s*wnoi(\.com)?/gi, '')
        .replace(/\bwnoi(\.com)?\b/gi, 'SMLC Wire')
        .replace(/\s{2,}/g, ' ')
        .trim();
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

// Line 293: GA4 Event Tracking Wrappers
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

// Bind Global Outbound and Contact Click Tracking
document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor || !anchor.href) return;

    const href = anchor.href.toLowerCase();

    // 1. Phone Tracking
    if (href.startsWith('tel:')) {
        trackGa4Event('contact_phone_click', {
            phone_number: anchor.href.replace('tel:', ''),
            page_location: window.location.href
        });
        return;
    }

    // 2. WhatsApp Tracking
    if (href.includes('wa.me') || href.includes('whatsapp.com')) {
        trackGa4Event('contact_whatsapp_click', {
            target_url: anchor.href,
            page_location: window.location.href
        });
        return;
    }

    // 3. Email Tracking
    if (href.startsWith('mailto:')) {
        trackGa4Event('contact_email_click', {
            email_address: anchor.href.replace('mailto:', ''),
            page_location: window.location.href
        });
        return;
    }

    // 4. Map Directions Tracking
    if (href.includes('maps.google.com') || href.includes('maps.apple.com')) {
        trackGa4Event('navigation_directions_click', {
            map_service: href.includes('apple.com') ? 'apple_maps' : 'google_maps',
            destination: anchor.href
        });
        return;
    }

    // 5. Outbound Domain Exit Tracking
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

// Line 392: Image Loading & Lightbox Modal Handlers
function safeSetImageSource(imgElement, srcUrl, fallbackWrapper = null, altText = "") {
    if (!imgElement) return;
    const parentContainer = fallbackWrapper || imgElement.closest('figure, .spotlight-image-wrap, .section3-landmark-img-wrap, .polaroid-wrap, .article-media-frame') || imgElement.parentElement;

    if (altText) imgElement.alt = altText;

    if (!srcUrl || srcUrl.trim() === "" || srcUrl === "null" || srcUrl === "undefined") {
        if (parentContainer) parentContainer.style.display = "none";
        imgElement.style.display = "none";
        return;
    }

    imgElement.style.display = "block";
    if (parentContainer) parentContainer.style.display = "block";

    imgElement.onerror = () => {
        if (parentContainer) parentContainer.style.display = "none";
        imgElement.style.display = "none";
    };

    imgElement.src = srcUrl;
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

    // Scrub any WNOI occurrences from modals
    const cleanTitle = sanitizeWnoiContent(title);
    const cleanDate = sanitizeWnoiContent(dateText);
    const cleanBody = sanitizeWnoiContent(bodyText);
    const cleanAlt = sanitizeWnoiContent(altText);

    // Suppress external linking if it targets WNOI
    const cleanTargetUrl = (targetUrl && !targetUrl.toLowerCase().includes('wnoi')) ? targetUrl : '';

    if (imgSrc && targetImg) {
        safeSetImageSource(targetImg, imgSrc, null, cleanAlt || cleanTitle);
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
        ? `<div style="font-style:italic; font-size:14px; color:#444; margin-bottom:12px; border-left:3px solid var(--primary); padding-left:10px;">Details: ${parsedAlt}</div>${parsedBody}`
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
    const timeText = cleanCalendarTime(targetItem.time || targetItem.displayTime);
    const rawLoc = targetItem.location || ACTIVE_TOWN.primaryName + ", IL";
    const rawDetails = targetItem.details || targetItem.description || "No additional event details provided.";
    const finalEventImg = targetItem.imageUrl || targetItem.image || null;
    const metaHeader = `${dateText} &bull; ${timeText}<br>Location: ${rawLoc}`;

    fireLightbox(finalEventImg, title, metaHeader, rawDetails, '', title);
}

function openNewsLightboxModal(idx) {
    const story = window.newsCacheBlock[idx];
    if (!story) return;

    // Suppress external link if origin is WNOI
    const cleanLink = (story.link && !story.link.toLowerCase().includes('wnoi')) ? story.link : '';

    fireLightbox(
        story.image || '',
        sanitizeWnoiContent(story.title || 'Local News Dispatch'),
        cleanCalendarDate(story.date || story.pubDate) + (story.location ? ` | ${story.location}` : ''),
        sanitizeWnoiContent(story.full_story || story.description || ''),
        cleanLink,
        sanitizeWnoiContent(story.title || 'Local News Dispatch')
    );
}

// Line 516: Clean Calendar Parsers (No "TBA" or Raw Strings)
function cleanCalendarTime(rawTime) {
    if (!rawTime || typeof rawTime !== 'string') return "All Day Event";
    const t = rawTime.trim().toUpperCase();
    if (!t || t === "TBA" || t === "TIME TBA" || t === "00:00" || t === "NULL" || t === "UNDEFINED") {
        return "All Day Event";
    }
    return rawTime.trim();
}

function cleanCalendarDate(rawDate) {
    if (!rawDate || rawDate === "undefined" || rawDate === "null") return "Date to be Announced";
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return String(rawDate);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch(e) {
        return String(rawDate);
    }
}

// Format UTC Dates for Google & iCal Subscription Links
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

// Line 587: Mobile Hamburger Drawer Handlers
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
        measurementId: "G-687D605K75"
    };

    try {
        if (typeof firebase === 'undefined' || typeof firebase.database !== 'function') return;
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        initializeFirebaseGasMonitor(db);
        bindFirebaseMenuEngine(db);
        bindFirebaseFooterEngine(db);
        bindFirebaseLocalLinksEngine(db);
        bindFirebaseSemanticSectionsEngine(db);
        bindFirebasePartnersEngine(db);
    } catch(e) {
        console.warn("Firebase initialization notice:", e.message);
    }
}

// === MENU ENGINE (Strict Sandwich Drawer on Mobile/Tablet) ===
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

// === FOOTER ENGINE (Directions Routing, Dual Phone Lines, & Complete Fields) ===
function bindFirebaseFooterEngine(db) {
    if (!db) return;
    try {
        if (activeFbRefFooter) activeFbRefFooter.off();
        activeFbRefFooter = db.ref(`master_county_data/global/footer`);

        activeFbRefFooter.on('value', (snapshot) => {
            const contact = snapshot.val();
            if (!contact) return;

            // 1. Phone Numbers & WhatsApp Trigger
            const phoneTarget = document.getElementById('footer-phone-target');
            if (phoneTarget) {
                let phoneHtml = '';

                if (contact.phone1) {
                    const cleanP1 = String(contact.phone1).replace(/[^\d]/g, '');
                    phoneHtml += `
                        <div style="margin-bottom: 8px;">
                            <strong>Direct:</strong> <a href="tel:${cleanP1}" style="color:#ffffff !important; text-decoration:none;">${contact.phone1}</a>
                            <a href="https://wa.me/1${cleanP1}" target="_blank" rel="noopener" style="display:inline-block; margin-left:8px; padding:3px 8px; background:#25D366; color:#ffffff !important; font-size:11px; font-weight:bold; border-radius:4px; text-decoration:none;">
                                WhatsApp
                            </a>
                        </div>
                    `;
                }

                if (contact.phone2) {
                    const cleanP2 = String(contact.phone2).replace(/[^\d]/g, '');
                    phoneHtml += `
                        <div style="margin-bottom: 8px;">
                            <strong>Alt:</strong> <a href="tel:${cleanP2}" style="color:#ffffff !important; text-decoration:none;">${contact.phone2}</a>
                        </div>
                    `;
                }

                if (phoneHtml) phoneTarget.innerHTML = phoneHtml;
            }

            // 2. Email Address
            const emailTarget = document.getElementById('footer-email-target');
            if (emailTarget && contact.email) {
                emailTarget.href = `mailto:${contact.email}`;
                emailTarget.innerText = contact.email;
            }

            // 3. Physical Address with Device-Aware Turn-by-Turn Routing
            const street = contact.street ? String(contact.street).trim() : '';
            const city = contact.city ? String(contact.city).trim() : ACTIVE_TOWN.primaryName;
            const state = contact.state ? String(contact.state).trim() : 'IL';
            const zip = contact.zip ? String(contact.zip).trim() : '';

            const fullDestination = [street, city, state, zip].filter(Boolean).join(', ');
            const isIOS = /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent) && !window.MSStream;
            const directionsUrl = isIOS 
                ? `//maps.apple.com/?daddr=${encodeURIComponent(fullDestination)}` 
                : `//www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullDestination)}`;

            const addressTarget = document.getElementById('footer-address-target');
            if (addressTarget) {
                addressTarget.innerHTML = `
                    <a href="${directionsUrl}" target="_blank" rel="noopener" style="color:#ffffff !important; text-decoration:none; display:block;" title="Click for turn-by-turn directions">
                        ${street ? `<div>${street}</div>` : ''}
                        <div>${city}, ${state} ${zip}</div>
                        <span style="display:inline-block; margin-top:6px; font-size:11px; color:var(--cc-gold); font-weight:bold; text-decoration:underline;">
                            [Open Turn-By-Turn Directions &rarr;]
                        </span>
                    </a>
                `;
            }

            // 4. Copyright
            const copyTarget = document.getElementById('footer-copy-target');
            if (copyTarget && contact.copyright) {
                copyTarget.innerHTML = contact.copyright;
            }
            triggerGoogleTranslateUpdate(document.getElementById('global-footer-container'));
        });
    } catch(err) {
        console.warn("Firebase Footer Engine error:", err.message);
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

// === SEMANTIC SECTIONS ENGINE (Slideshow, Point of Interest, Article, Spotlight, History) ===
function bindFirebaseSemanticSectionsEngine(db) {
    if (!db) return;
    const townName = ACTIVE_TOWN.dbTownKey || "Flora";

    try {
        if (activeFbRefSections) activeFbRefSections.off();
        if (activeFbRefGlobalSections) activeFbRefGlobalSections.off();

        let townSectionsData = {};
        let globalSectionsData = {};

        const renderResolvedSections = () => {
            // --- 1. SLIDESHOW BLENDING (With Hover/Touch Pause) ---
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
                    const imgUrl = normalizeImageUrl(item.imageUrl);
                    const captionTitle = extractText(item.title || 'Town View');
                    const altText = item.alt || captionTitle;
                    const safeImg = escapeJsString(imgUrl);
                    const safeCaption = escapeJsString(captionTitle);
                    const safeAlt = escapeJsString(altText);
                    const safeWeb = escapeJsString(item.website || '');

                    return `
                        <div class="slider-slide ${idx === 0 ? 'active' : ''}" style="position: absolute; inset: 0; opacity: ${idx === 0 ? 1 : 0}; transition: opacity 0.8s ease-in-out; z-index: ${idx === 0 ? 2 : 1};">
                            <img src="${imgUrl}" alt="" onclick="fireLightbox('${safeImg}', '${safeCaption}', 'COMMUNITY VIEW', '${safeAlt}', '${safeWeb}', '${safeAlt}')" style="width:100%; height:100%; object-fit:contain; background-color:#0a0a0a; cursor:pointer;">
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

            // --- 2. POINT OF INTEREST & LANDMARKS ---
            const poi = townSectionsData.point_of_interest || {};
            const poiTitleEl = document.getElementById('right-card-meta-title');
            const poiAboutEl = document.getElementById('desc2-target-1');
            const poiDescEl = document.getElementById('right-card-meta-desc1');

            if (poiTitleEl && poi.title) poiTitleEl.innerText = poi.title;
            if (poiAboutEl && poi.about_text) poiAboutEl.innerText = poi.about_text;
            if (poiDescEl && poi.landmark_description) poiDescEl.innerHTML = linkifyRawUrls(poi.landmark_description);

            const i1 = document.getElementById('dual-img-1');
            const h1 = document.getElementById('dual-header-1');
            const img1Url = normalizeImageUrl(poi.image1);
            const alt1Text = poi.alt1 || poi.header1 || "Landmark 1";
            if (i1 && img1Url) {
                safeSetImageSource(i1, img1Url, null, '');
                i1.onclick = () => fireLightbox(escapeJsString(img1Url), escapeJsString(poi.header1 || 'Landmark 1'), 'HISTORIC LANDMARK', escapeJsString(alt1Text), '', escapeJsString(alt1Text));
            }
            if (h1 && poi.header1) h1.innerText = poi.header1;

            const i2 = document.getElementById('dual-img-2');
            const h2 = document.getElementById('dual-header-2');
            const img2Url = normalizeImageUrl(poi.image2);
            const alt2Text = poi.alt2 || poi.header2 || "Landmark 2";
            if (i2 && img2Url) {
                safeSetImageSource(i2, img2Url, null, '');
                i2.onclick = () => fireLightbox(escapeJsString(img2Url), escapeJsString(poi.header2 || 'Landmark 2'), 'HISTORIC LANDMARK', escapeJsString(alt2Text), '', escapeJsString(alt2Text));
            }
            if (h2 && poi.header2) h2.innerText = poi.header2;

            // --- 3. FEATURED ARTICLE ---
            const art = townSectionsData.article || {};
            const artTitleEl = document.getElementById('sec4-article-title');
            const artCatEl = document.getElementById('sec4-category-tag');
            const artDeckEl = document.getElementById('sec4-article-deck');
            const artBodyEl = document.getElementById('sec4-article-body');
            const artImgEl = document.getElementById('sec-4-1-article-img');
            const artCapEl = document.getElementById('sec4-img-caption');

            if (artTitleEl && art.title) artTitleEl.innerText = art.title;
            if (artCatEl && art.category) artCatEl.innerText = art.category;
            if (artDeckEl && art.deck) artDeckEl.innerText = art.deck;
            if (artBodyEl && art.body) {
                artBodyEl.innerHTML = `<p style="margin-bottom:1.5em; text-align:justify; line-height:1.8;">${linkifyRawUrls(art.body)}</p>`;
            }
            const artImgUrl = normalizeImageUrl(art.imageUrl);
            const artAltText = art.alt || art.title || "Featured Article Image";
            if (artImgEl && artImgUrl) {
                safeSetImageSource(artImgEl, artImgUrl, null, '');
                artImgEl.onclick = () => fireLightbox(escapeJsString(artImgUrl), escapeJsString(art.title || 'Feature'), escapeJsString(art.category || 'Article'), escapeJsString(artAltText), '', escapeJsString(artAltText));
                if (artCapEl) artCapEl.innerText = artAltText;
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
            if (spotImgEl && spotImgUrl) {
                safeSetImageSource(spotImgEl, spotImgUrl, null, '');
                spotImgEl.onclick = () => fireLightbox(escapeJsString(spotImgUrl), escapeJsString(spot.name || 'Merchant'), ACTIVE_TOWN.primaryName + ', IL', escapeJsString(spot.description || ''), escapeJsString(spot.website || ''), escapeJsString(spotAltText));
            }

            // --- 5. TOWN HISTORY TIMELINE ---
            const historyTarget = document.getElementById('history-row-target');
            const historyRaw = townSectionsData.history || [];
            const historyList = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);

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

// === PARTNER SHOWCASE ENGINE (AdBlock Safe Naming, True Sliding Carousel, Touch/Hover Pause) ===
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
    let isCarouselPaused = false;
    let hoverStartTime = 0;

    // Helper to render individual card markup using AdBlock-safe naming
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

    // Desktop: Renders multi-slot display; Mobile/Tablet: Renders dedicated sliding container
    const visibleCount = isMobileOrTablet ? 1 : Math.min(5, partnerPool.length);
    const initialCards = [];
    for (let i = 0; i < visibleCount; i++) {
        const p = partnerPool[(poolIndex + i) % partner
