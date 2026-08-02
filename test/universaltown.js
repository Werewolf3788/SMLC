/* ==========================================================================
   SMLC Digital Town Square Portal - Master Universal Script
   Backend Engine: Dual Sync (Firebase Realtime DB + Cloud Firestore)
   Analytics: Firebase Analytics, Section Duration, Tab Detection, & Lightbox Tracking
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your Firebase Web App Configuration
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

// Initialize Firebase Core & Analytics
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

/* ==========================================================================
   1. ANALYTICS: SECTION TRACKING, DURATION, MULTI-TAB, & NATIVE MAPS
   ========================================================================== */
let sectionStartTime = Date.now();
let currentSectionName = window.location.hash || "#/clay-city";

function trackSectionChange(newSection) {
    const durationSeconds = Math.round((Date.now() - sectionStartTime) / 1000);
    
    if (durationSeconds > 0) {
        logEvent(analytics, 'section_time_spent', {
            section_name: currentSectionName,
            duration_seconds: durationSeconds,
            town_context: document.body.getAttribute('data-town') || 'UNKNOWN'
        });
    }

    currentSectionName = newSection;
    sectionStartTime = Date.now();

    logEvent(analytics, 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: newSection
    });
}

// Track duration when navigating or closing tab
window.addEventListener('beforeunload', () => {
    const durationSeconds = Math.round((Date.now() - sectionStartTime) / 1000);
    logEvent(analytics, 'section_time_spent', {
        section_name: currentSectionName,
        duration_seconds: durationSeconds,
        town_context: document.body.getAttribute('data-town') || 'UNKNOWN'
    });
});

// Detect Multiple Open Tabs
if ('BroadcastChannel' in window) {
    const tabChannel = new BroadcastChannel('smlc_portal_tabs');
    tabChannel.postMessage({ type: 'NEW_TAB_OPENED' });

    tabChannel.onmessage = (event) => {
        if (event.data.type === 'NEW_TAB_OPENED') {
            tabChannel.postMessage({ type: 'EXISTING_TAB_ACTIVE' });
        }
        if (event.data.type === 'EXISTING_TAB_ACTIVE') {
            logEvent(analytics, 'multiple_tabs_open', {
                active_route: window.location.hash
            });
        }
    };
}

// Track Clicks from Lightbox to External URLs
window.trackLightboxLinkClick = function(targetUrl, itemTitle) {
    logEvent(analytics, 'lightbox_external_click', {
        target_url: targetUrl,
        item_title: itemTitle,
        town_context: document.body.getAttribute('data-town') || 'UNKNOWN'
    });
};

// Open Native Map App from Footer Address
window.openNativeMapApp = function(addressString) {
    if (!addressString) return;
    const encodedAddress = encodeURIComponent(addressString);
    const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && !window.MSStream;
    
    const mapUrl = isApple 
        ? `https://maps.apple.com/?q=${encodedAddress}`
        : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      
    logEvent(analytics, 'footer_address_clicked', {
        address: addressString,
        platform: isApple ? 'apple_maps' : 'google_maps'
    });

    window.open(mapUrl, '_blank');
};


/* ==========================================================================
   2. TOWN ALIAS MAP & PORTAL CONFIGURATION
   ========================================================================== */
const TOWN_ALIAS_MAP = {
    "HOME": { primaryName: "Clay County", dbTownKey: "Global", jsonKey: "all", gasKey: ["louisville", "flora", "clay-city", "xenia"], historyKey: "all", keywords: [], zipCodes: [], isHome: true, scorestreamId: "68601", seatBadge: "Clay County Seat", estMeta: "Est. 1824 | Zip Code 62824", riverMarquee: "COMMUNITY DIGITAL NETWORK MAP", themeAccent: "#0258A3" },
    "CLAY COUNTY": { primaryName: "Clay County", dbTownKey: "Global", jsonKey: "all", gasKey: ["louisville", "flora", "clay-city", "xenia"], historyKey: "all", keywords: [], zipCodes: [], isHome: true, scorestreamId: "68601", seatBadge: "Clay County Seat", estMeta: "Est. 1824 | Zip Code 62824", riverMarquee: "COMMUNITY DIGITAL NETWORK MAP", themeAccent: "#0258A3" },
    "CLAY CITY": { primaryName: "Clay City", dbTownKey: "Clay City", jsonKey: "clay_city", gasKey: ["clay-city"], historyKey: "clay_city", keywords: ["CLAY CITY", "CC"], zipCodes: ["62824"], scorestreamId: "64422", seatBadge: "Clay County Hub", estMeta: "Est. 1868 | Zip Code 62824", riverMarquee: "HOME OF THE CLAY CITY BULLDOGS & CUBIES", themeAccent: "#4A154B" },
    "FLORA": { primaryName: "Flora", dbTownKey: "Flora", jsonKey: "flora", gasKey: ["flora"], historyKey: "flora", keywords: ["FLORA", "FLO", "WOLVES"], zipCodes: ["62839"], scorestreamId: "68602", seatBadge: "Clay County Hub", estMeta: "Est. 1854 | Zip Code 62839", riverMarquee: "HOME OF THE FLORA WOLVES • COMMERCE CENTER", themeAccent: "#0258A3" },
    "LOUISVILLE": { primaryName: "Louisville", dbTownKey: "Louisville", jsonKey: "louisville", gasKey: ["louisville"], historyKey: "louisville", keywords: ["LOUISVILLE", "NORTH CLAY", "NC", "HOOSIER"], zipCodes: ["62858"], scorestreamId: "68601", seatBadge: "Clay County Seat", estMeta: "Est. 1836 | Zip Code 62858", riverMarquee: "ON THE LITTLE WABASH RIVER", themeAccent: "#EB1C24" },
    "XENIA": { primaryName: "Xenia", dbTownKey: "Xenia", jsonKey: "clay_county_teams", gasKey: ["xenia"], historyKey: "xenia", keywords: ["XENIA"], zipCodes: ["62899"], scorestreamId: "68988", seatBadge: "Clay County Hub", estMeta: "Est. 1834 | Zip Code 62899", riverMarquee: "GATEWAY TO WESTERN CLAY COUNTY", themeAccent: "#1B5E20" },
    "SAILOR SPRINGS": { primaryName: "Sailor Springs", dbTownKey: "Sailor Springs", jsonKey: "sailor_springs", gasKey: ["louisville", "clay-city"], historyKey: "sailor_springs", keywords: ["SAILOR SPRINGS"], zipCodes: ["62879"], scorestreamId: "68988", seatBadge: "Clay County Village", estMeta: "Est. 1879 | Zip Code 62879", riverMarquee: "HISTORIC MINERAL SPRINGS HAVEN", themeAccent: "#00695C" },
    "IOLA": { primaryName: "Iola", dbTownKey: "Iola", jsonKey: "iola", gasKey: ["louisville"], historyKey: "iola", keywords: ["IOLA"], zipCodes: ["62849"], scorestreamId: "68601", seatBadge: "Clay County Village", estMeta: "Est. 1860 | Zip Code 62849", riverMarquee: "NORTHWEST CLAY COUNTY COMMUNITY", themeAccent: "#E65100" },
    "INGRAHAM": { primaryName: "Ingraham", dbTownKey: "Ingraham", jsonKey: "louisville", gasKey: ["louisville", "clay-city"], historyKey: "ingraham", keywords: ["INGRAHAM"], zipCodes: ["62434"], scorestreamId: "68601", seatBadge: "Clay County Village", estMeta: "Est. 1858 | Zip Code 62434", riverMarquee: "NORTHEAST CLAY COUNTY COMMUNITY", themeAccent: "#4E342E" }
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
    } catch(e) { console.warn("Town config resolution warning:", e); }

    return TOWN_ALIAS_MAP["CLAY CITY"];
}

let ACTIVE_TOWN = getActiveTownConfig();
const FIREBASE_BASE_URL = "https://smlc-fuel-monitor-default-rtdb.firebaseio.com";

let globalSlideshowTicker = null;
let gasMonitorRotator = null;

let activeFbRef34 = null;
let activeFbRefLinksTown = null;
let activeFbRefLinksGlobal = null;
let activeFbRefMenu = null;
let activeFbRefFooter = null;
let activeFbRefPartners = null;
let activeFbRefSpotlightGlobal = null;

let unsubscribeFirestoreNews = null;
let unsubscribeFirestoreEvents = null;

window.calendarCachedEvents = [];
window.historyCachedTimeline = [];
window.newsCacheBlock = [];

function resetAllActiveTimers() {
    if (globalSlideshowTicker) { clearInterval(globalSlideshowTicker); globalSlideshowTicker = null; }
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
}

function normalizeImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let url = rawUrl.trim();
    if (!url || url === 'null' || url === 'undefined') return null;

    if (url.includes('drive.google.com')) {
        const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/) || url.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
        }
    }
    return url;
}

function escapeJsString(str) {
    if (!str) return "";
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');
}

function extractText(val) {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        const inner = val.content || val.text || val.title || val.header1 || val.header2 || val.paragraph1 || val.paragraph2 || val.description || val.value || val.p1 || val.p2 || "";
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

function extractImageAndAlt(node) {
    if (!node) return { url: null, alt: null };
    
    if (typeof node === 'string') {
        return { url: normalizeImageUrl(node), alt: null };
    }
    
    if (typeof node === 'object') {
        let rawUrl = node.image1 || node.image2 || node.imageUrl || node.image_url || node.url || node.src || node.image || node.href || null;
        
        if (rawUrl && typeof rawUrl === 'object') {
            const nested = extractImageAndAlt(rawUrl);
            rawUrl = nested.url || rawUrl.image1 || rawUrl.url || rawUrl.src;
            if (typeof rawUrl === 'object') rawUrl = extractText(rawUrl);
        }
        
        let rawAlt = node.alt || node.alt1 || node.alt2 || node.caption || node.description || node.title || node.header1 || null;
        if (rawAlt && typeof rawAlt === 'object') {
            rawAlt = extractText(rawAlt);
        }
        
        if (typeof rawAlt === 'string') {
            rawAlt = rawAlt.replace(/^#+\s*/g, '').replace(/\*\*/g, '').trim();
        }

        return {
            url: normalizeImageUrl(rawUrl),
            alt: rawAlt
        };
    }
    
    return { url: null, alt: null };
}

function parseInteractiveContent(rawText) {
    if (!rawText) return "";
    let parsed = String(rawText);

    const imgUrlRegex = /(https?:\/\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s<>"']*)?|https?:\/\/lh3\.googleusercontent\.com\/[^\s<>"']+|https?:\/\/drive\.google\.com\/[^\s<>"']+)/gi;
    parsed = parsed.replace(imgUrlRegex, (match) => {
        const normUrl = normalizeImageUrl(match);
        if (!normUrl) return match;
        const safeUrl = escapeJsString(normUrl);
        return `<img src="${normUrl}" alt="Media Content" onclick="event.stopPropagation(); fireLightbox('${safeUrl}', 'Media Content', '', '', '${safeUrl}')" style="max-width:100%; height:auto; max-height:280px; display:block; margin:10px auto; border-radius:6px; border:2px solid #222; box-shadow:2px 2px 6px rgba(0,0,0,0.3); cursor:pointer;" onerror="this.style.display='none';" />`;
    });

    parsed = parsed.replace(/(\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b)/g, (match) => {
        const clean = match.replace(/[^\d]/g, '');
        return `<a href="tel:${clean}" style="color:var(--primary); font-weight:bold; text-decoration:underline;">${match}</a>`;
    });

    parsed = parsed.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match) => {
        return `<a href="mailto:${match}" style="color:var(--primary); font-weight:bold; text-decoration:underline;">${match}</a>`;
    });

    return parsed;
}

function attachUtmParameters(urlStr) {
    if (!urlStr || urlStr === "#" || urlStr.startsWith("javascript:")) return urlStr;
    try {
        const pageTitle = encodeURIComponent((document.title || "smlc_portal").trim());
        const urlObj = new URL(urlStr, window.location.origin);
        urlObj.searchParams.set("utm_source", "smlc_portal");
        urlObj.searchParams.set("utm_medium", "town_article");
        urlObj.searchParams.set("utm_campaign", pageTitle);
        return urlObj.toString();
    } catch(e) {
        const connector = urlStr.includes("?") ? "&" : "?";
        const pageTitle = encodeURIComponent((document.title || "smlc_portal").trim());
        return `${urlStr}${connector}utm_source=smlc_portal&utm_medium=town_article&utm_campaign=${pageTitle}`;
    }
}

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
    
    if (imgSrc && targetImg) {
        safeSetImageSource(targetImg, imgSrc, null, altText || title);
        if (targetImg.parentElement) targetImg.parentElement.style.display = 'block';
    } else if (targetImg && targetImg.parentElement) {
        targetImg.parentElement.style.display = 'none';
    }
    
    const dateEl = document.getElementById('lightbox-target-date'); if (dateEl) dateEl.innerHTML = dateText || '';
    const titleEl = document.getElementById('lightbox-target-title'); if (titleEl) titleEl.innerText = title || '';
    
    // NOTE: Alt description is passed to bodyText/storyEl so it ONLY renders in the Lightbox view
    const storyEl = document.getElementById('lightbox-target-story'); 
    if (storyEl) storyEl.innerHTML = parseInteractiveContent(bodyText) || '';
    
    if (targetUrl && actionLink && actionRow) {
        actionLink.href = attachUtmParameters(targetUrl);
        actionLink.onclick = function() {
            if (window.trackLightboxLinkClick) {
                window.trackLightboxLinkClick(targetUrl, title);
            }
        };
        actionRow.style.display = 'block';
    } else if (actionRow) {
        actionRow.style.display = 'none';
    }

    if (overlay) {
        overlay.style.display = 'flex';
        overlay.onclick = closeLightbox;
    }
}

/* INITIALIZE FIREBASE & FIRESTORE CORE ENGINES */
function initializeFirebasePortalEngine() {
    const stationConfigs = {
        "48100": { town: "flora", display: "Flora", name: "CASEY'S", logo: "Casey's.png" },     
        "48101": { town: "flora", display: "Flora", name: "HUCK'S", logo: "Hucks.png" },     
        "128128": { town: "flora", display: "Flora", name: "MACH 1", logo: "Mach 1.png" },    
        "120226": { town: "flora", display: "Flora", name: "FAST STOP", logo: "Fast stop.png" },  
        "48026": { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" }, 
        "171711": { town: "clay-city", display: "Clay City", name: "CASEY'S", logo: "Casey's.png" },
        "181818": { town: "xenia", display: "Xenia", name: "KNAPP'S", logo: "Knapps.png" }  
    };

    try {
        if (typeof firebase === 'undefined') return;
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        
        const db = firebase.database();
        const fs = typeof firebase.firestore === 'function' ? firebase.firestore() : null;

        // 1. Realtime DB Listeners
        const gasContainer = document.getElementById('fuel-monitor-target-box') || document.querySelector('.fuel-monitor-billboard-card');
        if (gasContainer) {
            db.ref('fuel_prices').on('value', (snap) => {
                const val = snap.val();
                if (val) renderGasBillboardUI(val, stationConfigs, ACTIVE_TOWN.gasKey, gasContainer);
            }, (err) => console.warn("Firebase fuel_prices warning:", err.message));
        }

        bindFirebaseMenuEngine(db);
        bindFirebaseSection3And4Engine(db);
        bindFirebaseLocalLinksEngine(db);
        bindFirebaseFooterEngine(db);
        bindFirebasePartnersEngine(db);

        // 2. Cloud Firestore Listeners (News Feeds & Events)
        if (fs) {
            bindFirestoreLocalNewsEngine(fs);
            bindFirestoreEventsEngine(fs);
        }
    } catch(e) {
        console.warn("Firebase initialization warning:", e.message);
    }
}

/* CLOUD FIRESTORE: LOCAL NEWS ENGINE (RSS / OUTSIDE FEEDS) */
function bindFirestoreLocalNewsEngine(fs) {
    if (!fs) return;
    const targetGrid = document.getElementById('news-matrix-target');
    if (!targetGrid) return;

    if (unsubscribeFirestoreNews) unsubscribeFirestoreNews();

    const activeTownName = ACTIVE_TOWN.primaryName;

    unsubscribeFirestoreNews = fs.collection('local_news').onSnapshot((snapshot) => {
        const newsItems = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            data.id = doc.id;
            
            const tags = Array.isArray(data.tags) ? data.tags.map(t => String(t).toLowerCase()) : [];
            const matchesTown = ACTIVE_TOWN.isHome || 
                                tags.includes(activeTownName.toLowerCase()) || 
                                tags.includes("clay county") ||
                                (data.location && data.location.toLowerCase().includes(activeTownName.toLowerCase()));

            if (matchesTown) {
                newsItems.push(data);
            }
        });

        newsItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        window.newsCacheBlock = newsItems;

        if (newsItems.length > 0) {
            targetGrid.innerHTML = newsItems.map((story, idx) => {
                const storyText = story.full_story || story.description || '';
                const isLong = storyText.length > 150;
                const displayStory = isLong ? storyText.substring(0, 140) + "..." : storyText;
                const normImg = normalizeImageUrl(story.image);

                return `
                    <div class="news-matrix-card" style="background:#fff; border:1px solid #ddd; padding:18px; border-radius:6px; margin-bottom:16px;">
                        ${normImg ? `<img src="${normImg}" alt="${escapeJsString(story.title || 'News image')}" style="width:100%; height:160px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="openNewsLightboxModal(${idx})" onerror="this.style.display='none';">` : ''}
                        <div style="font-size:12px; color:var(--primary); font-weight:bold; margin-top:10px;">${story.date || 'Recent Dispatch'}</div>
                        <div style="font-weight:bold; font-size:16px; margin:6px 0; color:#1a1a1a;">${story.title || 'Local Update'}</div>
                        <div style="font-size:14px; color:#444;">${parseInteractiveContent(displayStory)}</div>
                        ${isLong ? `<div class="read-more-btn" onclick="openNewsLightboxModal(${idx})" style="color: var(--primary); font-weight: bold; cursor: pointer; margin-top: 10px;">Read Full Dispatch &rarr;</div>` : ''}
                    </div>
                `;
            }).join('');
        }
    }, (err) => console.warn("Firestore local_news warning:", err.message));
}

/* CLOUD FIRESTORE: SMLC EVENTS ENGINE */
function bindFirestoreEventsEngine(fs) {
    if (!fs) return;
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller) return;

    if (unsubscribeFirestoreEvents) unsubscribeFirestoreEvents();

    unsubscribeFirestoreEvents = fs.collection('smlc_events').onSnapshot((snapshot) => {
        const events = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            data.id = doc.id;
            events.push(data);
        });

        window.calendarCachedEvents = events;

        if (events.length > 0) {
            scroller.innerHTML = events.map((item, idx) => {
                const eventTitle = item.title || item.name || "Community Event";
                const dateText = item.date || item.displayDate || "Upcoming";
                const normImg = normalizeImageUrl(item.image || item.imageUrl);

                return `
                    <div class="divi-event-item" style="margin-bottom:15px; padding-bottom:10px; border-bottom:1px dashed #ccc; overflow:hidden;">
                        ${normImg ? `<img src="${normImg}" alt="${escapeJsString(eventTitle)}" onclick="openCalendarLightboxModal(${idx})" style="width:85px; height:85px; object-fit:cover; float:right; border-radius:6px; cursor:pointer; margin-left:12px;">` : ''}
                        <div class="divi-event-date" style="font-size:12px; color:var(--primary); font-weight:bold;">${dateText}</div>
                        <div class="divi-event-title" style="font-size:16px; font-weight:bold;">${eventTitle}</div>
                        <div style="font-size:13px; color:#555; margin-top:4px;">${parseInteractiveContent((item.details || item.description || "").substring(0, 110))}...</div>
                        <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})" style="color:var(--primary); font-weight:bold; cursor:pointer; font-size:13px; margin-top:8px;">Read Details &rarr;</div>
                    </div>
                `;
            }).join('');
        }
    }, (err) => console.warn("Firestore smlc_events warning:", err.message));
}

/* REALTIME DB: MENU NAVIGATION ENGINE */
function bindFirebaseMenuEngine(db) {
    if (!db) return;
    const menuContainer = document.getElementById('dynamic-menu-links');
    if (!menuContainer) return;

    if (activeFbRefMenu) activeFbRefMenu.off();
    activeFbRefMenu = db.ref('master_county_data/global/menu');

    activeFbRefMenu.on('value', (snapshot) => {
        const val = snapshot.val();
        if (!val) return;

        const rawItems = Array.isArray(val) ? val : Object.values(val);
        if (rawItems.length === 0) return;

        menuContainer.innerHTML = rawItems.map(item => {
            if (!item) return '';
            const name = item.name || item.title || item.label || 'Link';
            const targetRawUrl = item.website || item.url || item.link || item.href || '#';
            const taggedUrl = attachUtmParameters(targetRawUrl);
            
            const rawImageUrl = item.imageUrl || item.image || item.icon || item.src || item.img || null;
            const normImageUrl = normalizeImageUrl(rawImageUrl);

            const activeTownName = (ACTIVE_TOWN.primaryName || "").toUpperCase();
            const itemNameUpper = name.toUpperCase();
            const isActive = (activeTownName === itemNameUpper || (ACTIVE_TOWN.isHome && itemNameUpper === "HOME") || (window.location.hash || "").toUpperCase().includes(itemNameUpper.replace(/\s+/g, '-'))) ? 'class="active"' : '';

            const safeImg = escapeJsString(normImageUrl);
            const safeName = escapeJsString(name);

            const imgTag = normImageUrl ? `<img src="${normImageUrl}" alt="${safeName}" class="menu-thumb-icon" onclick="event.stopPropagation(); fireLightbox('${safeImg}', '${safeName}', 'MENU ICON', '', '${safeImg}', '${safeName}')" onerror="this.style.display='none';" />` : '';

            return `
                <li>
                    <a href="${taggedUrl}" ${isActive} data-ga-label="Nav_${name.replace(/\s+/g, '')}">
                        ${imgTag}
                        <span>${name}</span>
                    </a>
                </li>
            `;
        }).join('');
    }, (err) => console.warn("Firebase Menu warning:", err.message));
}

/* REALTIME DB: TOWN SECTIONS & SPOTLIGHT PRIORITY ENGINE */
function bindFirebaseSection3And4Engine(db) {
    if (!db) return;
    const townName = ACTIVE_TOWN.dbTownKey || "Clay City";
    const townPath = `master_county_data/towns/${townName}/sections`;

    if (activeFbRef34) activeFbRef34.off();
    if (activeFbRefSpotlightGlobal) activeFbRefSpotlightGlobal.off();

    activeFbRef34 = db.ref(townPath);

    activeFbRef34.on('value', (snapshot) => {
        const sections = snapshot.val() || {};

        /* SECTION 3.1.1 (Slideshow) */
        if (sections.sec_3_1_1) {
            const s311 = sections.sec_3_1_1;
            const mainTitleEl = document.getElementById('sec3-main-title');
            const introTextEl = document.getElementById('sec3-intro-text');
            if (mainTitleEl && (s311.title || s311.Header)) mainTitleEl.innerText = extractText(s311.title || s311.Header);
            if (introTextEl && (s311.subtitle || s311.description)) introTextEl.innerText = extractText(s311.subtitle || s311.description);

            const viewport = document.getElementById('clay-city-slideshow') || document.querySelector('.slider-viewport');
            const slideshowItemsRaw = s311.items || s311.slides || s311.grid;
            if (viewport && slideshowItemsRaw) {
                const slideItems = Array.isArray(slideshowItemsRaw) ? slideshowItemsRaw : Object.values(slideshowItemsRaw);
                if (slideItems.length > 0) {
                    viewport.innerHTML = slideItems.map((item, idx) => {
                        const { url: imgUrl, alt: altTextRaw } = extractImageAndAlt(item);
                        const captionTitle = extractText(item.caption || item.header1 || item.title || item.name || 'Town View');
                        const altText = altTextRaw || captionTitle;

                        const safeImg = escapeJsString(imgUrl);
                        const safeCaption = escapeJsString(captionTitle);
                        const safeAlt = escapeJsString(altText);
                        const safeSrc = escapeJsString(item.source_url || item.link || '');

                        return `
                            <div class="slider-slide ${idx === 0 ? 'active' : ''}" style="position: absolute; inset: 0; opacity: ${idx === 0 ? 1 : 0}; transition: opacity 0.8s ease-in-out; z-index: ${idx === 0 ? 2 : 1};">
                                <img src="${imgUrl}" alt="${safeAlt}" onclick="fireLightbox('${safeImg}', '${safeCaption}', 'SLIDESHOW VIEW', '${safeAlt}', '${safeSrc}', '${safeAlt}')" style="width:100%; height:100%; object-fit:contain; background:#0a0a0a; cursor:pointer;">
                                ${captionTitle ? `<div class="slider-caption">${captionTitle}</div>` : ''}
                            </div>
                        `;
                    }).join('');
                }
            }
        }

        /* SECTION 3.1.2 (About Box) */
        if (sections.sec_3_1_2) {
            const s312 = sections.sec_3_1_2;
            const aboutTagEl = document.getElementById('sec3-about-tag');
            const aboutTextEl = document.getElementById('desc2-target-1');
            if (aboutTagEl) aboutTagEl.innerText = extractText(s312.title || s312.tag) || `About ${ACTIVE_TOWN.primaryName}`;
            if (aboutTextEl) aboutTextEl.innerText = extractText(s312);
        }

        /* SECTION 3.2 (Landmarks) */
        const s321 = sections.sec_3_2_1 || {};
        const s322 = sections.sec_3_2_2 || {};
        const s323 = sections.sec_3_2_3 || {};
        const s324 = sections.sec_3_2_4 || {};

        const rTitle = document.getElementById('right-card-meta-title');
        if (rTitle) {
            rTitle.innerText = extractText(s321.title || s321.Header || s322.title) || `Historic ${ACTIVE_TOWN.primaryName} Landmark`;
        }

        const i1 = document.getElementById('dual-img-1');
        const h1 = document.getElementById('dual-header-1');
        const { url: img1Url, alt: alt1TextRaw } = extractImageAndAlt(s322.image1 || s322);
        const h1Text = extractText(s322.header1 || s322.caption1 || s322.caption || s322.title) || "Community Landmark";
        const alt1Text = alt1TextRaw || s322.alt1 || h1Text;

        if (i1 && img1Url) {
            safeSetImageSource(i1, img1Url, null, alt1Text);
            i1.onclick = () => fireLightbox(escapeJsString(img1Url), escapeJsString(h1Text), 'LANDMARK ARCHIVE', escapeJsString(alt1Text), escapeJsString(s322.source_url || s322.link || ''), escapeJsString(alt1Text));
        }
        if (h1) h1.innerText = h1Text;

        const i2 = document.getElementById('dual-img-2');
        const h2 = document.getElementById('dual-header-2');
        const { url: img2Url, alt: alt2TextRaw } = extractImageAndAlt(s322.image2 || s323.image2 || s323.image1 || s323);
        const h2Text = extractText(s322.header2 || s322.caption2 || s323.header2 || s323.header1 || s323.caption) || "Historic Landmark";
        const alt2Text = alt2TextRaw || s322.alt2 || s323.alt2 || h2Text;

        if (i2 && img2Url) {
            safeSetImageSource(i2, img2Url, null, alt2Text);
            i2.onclick = () => fireLightbox(escapeJsString(img2Url), escapeJsString(h2Text), 'LANDMARK ARCHIVE', escapeJsString(alt2Text), escapeJsString(s322.source_url2 || s323.source_url || s323.link || ''), escapeJsString(alt2Text));
        }
        if (h2) h2.innerText = h2Text;

        const descTarget = document.getElementById('right-card-meta-desc1');
        if (descTarget) {
            const parsedDesc = extractText(s324) || extractText(s322.description);
            if (parsedDesc) {
                descTarget.innerHTML = parsedDesc;
                descTarget.style.display = "block";
            }
        }

        /* SECTION 4.1 (Featured Article) */
        let targetS41 = sections.sec_4_1 || {};
        if (targetS41.sec_4_1_1) targetS41 = { ...targetS41, ...targetS41.sec_4_1_1 };

        const { url: imgUrl, alt: imgAltRaw } = extractImageAndAlt(targetS41.image1 || targetS41.image);

        const catTagEl = document.getElementById('sec4-category-tag');
        const artTitleEl = document.getElementById('sec4-article-title');
        const artDeckEl = document.getElementById('sec4-article-deck');
        const artBodyEl = document.getElementById('sec4-article-body');

        const categoryText = extractText(targetS41.header1) || extractText(targetS41.category) || extractText(targetS41.tag) || "Community & Commerce";
        const titleText = extractText(targetS41.title) || `${ACTIVE_TOWN.primaryName}'s Historic & Cultural Heritage`;
        const deckText = extractText(targetS41.header2) || extractText(targetS41.subtitle) || extractText(targetS41.deck) || "";
        const finalAlt = imgAltRaw || titleText || `${ACTIVE_TOWN.primaryName} Community Feature`;

        if (catTagEl) catTagEl.innerText = categoryText;
        if (artTitleEl) artTitleEl.innerText = titleText;
        if (artDeckEl) artDeckEl.innerText = deckText;

        if (artBodyEl) {
            let paragraphsList = [];
            const pushParagraph = (pNode) => {
                if (!pNode) return;
                const text = extractText(pNode);
                if (text && text.trim()) paragraphsList.push(text.trim());
            };

            pushParagraph(targetS41.paragraph1);
            pushParagraph(targetS41.paragraph2);

            if (targetS41.paragraphs) {
                const rawP = Array.isArray(targetS41.paragraphs) ? targetS41.paragraphs : Object.values(targetS41.paragraphs);
                rawP.forEach(p => pushParagraph(p));
            }

            let bodyHtml = '';
            const safeImg = escapeJsString(imgUrl);
            const safeTitle = escapeJsString(titleText);
            const safeCategory = escapeJsString(categoryText);
            const safeAlt = escapeJsString(finalAlt);
            const safeSource = escapeJsString(targetS41.source_url || targetS41.website?.url || targetS41.link || '');

            const figureHtml = imgUrl ? `
                <figure class="article-media-frame" style="margin:24px 0; padding:0; width:100%;">
                    <img id="sec-4-1-article-img" 
                         src="${imgUrl}" 
                         alt="${safeAlt}" 
                         class="lightbox-triggerable-element" 
                         onclick="fireLightbox('${safeImg}', '${safeTitle}', '${safeCategory}', '${safeAlt}', '${safeSource}', '${safeAlt}')" 
                         style="width:100%; max-width:100%; height:auto; max-height:420px; object-fit:contain; background-color:#111111; display:block; margin:16px auto; border-radius:6px; border:2px solid #222; box-shadow:4px 4px 0px #000; cursor:pointer;"
                         onerror="this.parentElement.style.display='none';" />
                    <figcaption id="sec4-img-caption" style="font-size:0.95rem; font-style:italic; text-align:center; color:#555; margin-top:8px;">${finalAlt}</figcaption>
                </figure>
            ` : '';

            if (paragraphsList.length > 0) {
                bodyHtml += `<p style="margin-bottom:1.5em; text-align:justify; line-height:1.8;">${parseInteractiveContent(paragraphsList[0])}</p>`;
                bodyHtml += figureHtml;
                for (let pIdx = 1; pIdx < paragraphsList.length; pIdx++) {
                    bodyHtml += `<p style="margin-bottom:1.5em; text-align:justify; line-height:1.8;">${parseInteractiveContent(paragraphsList[pIdx])}</p>`;
                }
            } else {
                bodyHtml = figureHtml;
            }

            artBodyEl.innerHTML = bodyHtml;
        }

        /* SECTION 4.2 (BUSINESS SPOTLIGHT: TOWN PRIORITY, GLOBAL FALLBACK) */
        const spotlightTarget = document.querySelector('.clay-county-news-box.spotlight-clipping');
        if (spotlightTarget) {
            const hasSpotlightData = (dataObj) => {
                if (!dataObj || typeof dataObj !== 'object') return false;
                return !!(dataObj.name || dataObj.title || dataObj.description || dataObj.image1 || dataObj.image || dataObj.url);
            };

            if (hasSpotlightData(sections.sec_4_2)) {
                renderSpotlightCard(sections.sec_4_2, spotlightTarget);
            } else {
                activeFbRefSpotlightGlobal = db.ref('master_county_data/global/sections/sec_4_2');
                activeFbRefSpotlightGlobal.on('value', (gSnap) => {
                    const globalSpotlight = gSnap.val();
                    if (hasSpotlightData(globalSpotlight)) {
                        renderSpotlightCard(globalSpotlight, spotlightTarget);
                    } else {
                        spotlightTarget.style.display = 'none';
                    }
                });
            }
        }
    }, (err) => console.warn("Firebase Section 3/4 warning:", err.message));
}

function renderSpotlightCard(s42, spotlightTarget) {
    if (!s42 || !spotlightTarget) return;

    spotlightTarget.style.display = 'flex';

    const nameText = extractText(s42.name || s42.title) || "Local Merchant";
    const descText = extractText(s42.description) || "Supporting local commerce across Clay County.";
    const { url: imgUrl, alt: altTextRaw } = extractImageAndAlt(s42.image1 || s42);
    const altText = altTextRaw || nameText;
    const websiteUrl = attachUtmParameters(s42.website?.url || s42.website_url || s42.url || s42.link || "#");
    const locText = s42.location || (ACTIVE_TOWN.primaryName + ", IL");

    const safeImg = escapeJsString(imgUrl);
    const safeName = escapeJsString(nameText);
    const safeLoc = escapeJsString(locText);
    const safeDesc = escapeJsString(descText);
    const safeWeb = escapeJsString(websiteUrl);
    const safeAlt = escapeJsString(altText);

    spotlightTarget.innerHTML = `
        <div class="sidebar-widget-title">BUSINESS SPOTLIGHT</div>
        <div class="spotlight-image-wrap"><img src="${imgUrl}" alt="${safeAlt}" onclick="fireLightbox('${safeImg}', '${safeName}', '${safeLoc}', '${safeDesc}', '${safeWeb}', '${safeAlt}')" onerror="this.parentElement.style.display='none';"></div>
        <span class="biz-title">${nameText}</span>
        <span class="biz-location">${locText}</span>
        <p class="biz-description">"${descText}"</p>
        <a href="${websiteUrl}" target="_blank" class="spotlight-btn" data-ga-label="business_spotlight">Visit Business &rarr;</a>
    `;
}

/* REALTIME DB: LOCAL LINKS ENGINE */
function bindFirebaseLocalLinksEngine(db) {
    if (!db) return;
    const linkTarget = document.getElementById('local-links-target-container');
    if (!linkTarget) return;

    const townName = ACTIVE_TOWN.dbTownKey || "Clay City";
    let townLinks = [];
    let globalLinks = [];

    const renderCombinedLinks = () => {
        const rawCombined = [...townLinks, ...globalLinks];
        if (rawCombined.length > 0) {
            linkTarget.innerHTML = rawCombined.map(link => {
                const name = extractText(link.title || link.name || link.label) || "Local Resource";
                const targetRawUrl = link.website || link.url || link.link || link.href || "#";
                const taggedUrl = attachUtmParameters(targetRawUrl);
                const displayLoc = link.location || link.town || ACTIVE_TOWN.primaryName;

                return `
                    <div class="local-link-node" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; text-align: left;">
                        <a href="${taggedUrl}" target="_blank" class="local-link-title-anchor" style="font-weight: bold; font-size: 16px; color: var(--link-bright-blue); text-decoration: underline;">
                            ${name}
                        </a>
                        <span style="font-size: 12px; color: #666; margin-left: 6px;">(${displayLoc})</span>
                    </div>
                `;
            }).join('');
        }
    };

    if (activeFbRefLinksTown) activeFbRefLinksTown.off();
    if (activeFbRefLinksGlobal) activeFbRefLinksGlobal.off();

    activeFbRefLinksTown = db.ref(`master_county_data/towns/${townName}/sections/sec_7_3_2`);
    activeFbRefLinksGlobal = db.ref(`master_county_data/global/sections/sec_7_3_2`);

    activeFbRefLinksTown.on('value', (snap) => {
        townLinks = snap.val() ? Object.values(snap.val()) : [];
        renderCombinedLinks();
    });

    activeFbRefLinksGlobal.on('value', (snap) => {
        globalLinks = snap.val() ? Object.values(snap.val()) : [];
        renderCombinedLinks();
    });
}

/* REALTIME DB: FOOTER ENGINE (WITH MAPS APP CLICK HANDLER) */
function bindFirebaseFooterEngine(db) {
    if (!db) return;
    if (activeFbRefFooter) activeFbRefFooter.off();
    
    activeFbRefFooter = db.ref('master_county_data/global/footer');
    activeFbRefFooter.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const contact = data.contact_info || data;
        if (contact) {
            const phoneTarget = document.getElementById('footer-phone-target');
            if (phoneTarget && Array.isArray(contact.phone)) {
                phoneTarget.innerHTML = contact.phone.map(p => `<div><a href="tel:${(p.number || '').replace(/[^\d]/g, '')}" style="color:#fff;">${p.number}</a></div>`).join('');
            }

            const emailTarget = document.getElementById('footer-email-target');
            if (emailTarget && (contact.email?.address || contact.email)) {
                const mail = contact.email.address || contact.email;
                emailTarget.href = `mailto:${mail}`;
                emailTarget.innerText = mail;
            }

            const addressTarget = document.getElementById('footer-address-target');
            if (addressTarget && (contact.address?.text || contact.address)) {
                const addrText = contact.address.text || contact.address;
                const safeAddr = escapeJsString(addrText);
                addressTarget.innerHTML = `<span onclick="openNativeMapApp('${safeAddr}')" style="color:#fff; cursor:pointer; text-decoration:underline;">${addrText}</span>`;
            }
        }
    });
}

/* REALTIME DB: PARTNERS (ADS) ENGINE */
function bindFirebasePartnersEngine(db) {
    if (!db) return;
    if (activeFbRefPartners) activeFbRefPartners.off();

    activeFbRefPartners = db.ref('master_county_data/global/sections/sec_6');
    activeFbRefPartners.on('value', (snapshot) => {
        const val = snapshot.val();
        if (!val) return;

        const partnersList = Array.isArray(val) ? val : Object.values(val);
        const topGrid = document.getElementById('partners-grid-top') || document.querySelector('.scotts-partners-top');
        const bottomGrid = document.getElementById('partners-grid-bottom') || document.querySelector('.scotts-partners-bottom');

        if (partnersList.length > 0) {
            if (topGrid) renderFixedCardSlideshow(topGrid, partnersList, 0, 'section6', 5);
            if (bottomGrid) renderFixedCardSlideshow(bottomGrid, partnersList, 3, 'section8', 5);
        }
    });
}

/* RENDER FUEL BILLBOARD INDEX */
function renderGasBillboardUI(data, stationConfigs, activeGasTowns, container) {
    const gasTownsArray = Array.isArray(activeGasTowns) ? activeGasTowns : [activeGasTowns];
    const stationIds = Object.keys(stationConfigs).filter(id => gasTownsArray.includes(stationConfigs[id].town));
    if (stationIds.length === 0) return;

    if (gasMonitorRotator) clearInterval(gasMonitorRotator);

    let currentIdx = 0;

    const renderCurrentStation = () => {
        const id = stationIds[currentIdx];
        const config = stationConfigs[id];
        const info = data[id] || {};
        
        const regPrice = info.reg || info.regular || info.price || "---";
        let dslPrice = info.dsl || info.diesel || "---";
        if (dslPrice === "0" || !dslPrice) dslPrice = "---";

        const updateDate = info.date || info.updated || "PENDING";
        const safeLogo = encodeURIComponent(config.logo);

        container.style.cursor = "pointer";
        container.innerHTML = `
            <div class="sidebar-widget-title">${config.display.toUpperCase()} FUEL INDEX MONITOR</div>
            <div class="fuel-station-header">
                <div class="station-logo-frame"><img src="https://raw.githubusercontent.com/skventuresigns-design/smlc/main/gas-prices/image/${safeLogo}" alt="${config.name}"></div>
                <div class="station-meta-title">${config.name} (${config.display})</div>
            </div>
            <div class="fuel-pricing-grid">
                <div class="price-box"><span class="price-type-label">REGULAR</span><span class="price-value-regular">${regPrice}</span></div>
                <div class="price-box"><span class="price-type-label">DIESEL</span><span class="price-value-diesel">${dslPrice}</span></div>
            </div>
            <div class="sync-timestamp-label">Updated: ${updateDate}</div>
        `;
        currentIdx = (currentIdx + 1) % stationIds.length;
    };

    renderCurrentStation();
    if (stationIds.length > 1) gasMonitorRotator = setInterval(renderCurrentStation, 5000);
}

/* RENDER PARTNER SLIDESHOW CAROUSELS */
function renderFixedCardSlideshow(containerElement, partnerPool, offsetSeed = 0, sectionId = 'section6', cardsToShow = 5) {
    if (!containerElement || !partnerPool.length) return;

    containerElement.style.display = "flex";
    containerElement.style.justifyContent = "space-between";
    containerElement.style.alignItems = "center";
    containerElement.style.gap = "20px";
    containerElement.style.width = "100%";
    containerElement.style.flexWrap = "wrap";

    const poolSize = partnerPool.length;
    const totalCards = Math.min(cardsToShow, poolSize);
    const cardSlotsData = [];

    for (let slotIndex = 0; slotIndex < totalCards; slotIndex++) {
        const slotRotationQueue = [];
        for (let step = 0; step < poolSize; step++) {
            const partnerIndex = (slotIndex + offsetSeed + (step * totalCards)) % poolSize;
            if (!slotRotationQueue.includes(partnerPool[partnerIndex])) {
                slotRotationQueue.push(partnerPool[partnerIndex]);
            }
        }
        cardSlotsData.push(slotRotationQueue);
    }

    containerElement.innerHTML = cardSlotsData.map((slot, idx) => {
        const initialPartner = slot[0];
        const initialUrl = attachUtmParameters(initialPartner.websiteUrl || initialPartner.url || '#');
        const initialImg = initialPartner.image || initialPartner.logo || '';
        const initialName = initialPartner.name || 'Local Partner';

        const safeImg = escapeJsString(initialImg);
        const safeName = escapeJsString(initialName);
        const safeUrl = escapeJsString(initialUrl);

        return `
            <div class="partner-card fixed-slide-card" data-slot-index="${idx}" style="flex: 1 1 180px; max-width: 260px; transition: opacity 0.4s ease;">
                <div class="partner-logo-box">
                    <img class="partner-card-img" src="${initialImg}" alt="${safeName}" onclick="fireLightbox('${safeImg}', '${safeName}', 'PARTNER DIRECTORY', 'Local Sponsor', '${safeUrl}', '${safeName}')" style="cursor:pointer;" onerror="this.closest('.fixed-slide-card').style.display='none';">
                </div>
                <h4><a class="partner-card-link" href="${initialUrl}" target="_blank" data-ga-label="partner_link">${initialName}</a></h4>
            </div>
        `;
    }).join('');
}

function openHistoryLightboxModal(idx) {
    const item = window.historyCachedTimeline[idx];
    if (!item) return;

    fireLightbox(
        item.image || '',
        item.title || 'Historical Landmark',
        `YEAR ${item.year}`,
        item.description || item.alt || '',
        item.link || '',
        item.alt || item.title || ''
    );
}

function openCalendarLightboxModal(idx) {
    const item = window.calendarCachedEvents[idx];
    if (!item) return;

    fireLightbox(
        item.image || item.imageUrl || '',
        item.title || item.name || 'Community Event',
        item.date || 'Upcoming Event',
        item.details || item.description || '',
        item.link || '',
        item.title || 'Community Event'
    );
}

function openNewsLightboxModal(idx) {
    const story = window.newsCacheBlock[idx];
    if (!story) return;

    fireLightbox(
        story.image || '',
        story.title || 'Local News Dispatch',
        story.date || 'Recent Update',
        story.full_story || story.description || '',
        story.link || '',
        story.title || 'Local News Dispatch'
    );
}

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
    const currentHash = (window.location.hash || "#/clay-city").toLowerCase();
    document.querySelectorAll('#dynamic-menu-links a, .menu-links a').forEach(link => {
        const href = (link.getAttribute("href") || "").toLowerCase();
        if (href === currentHash || (currentHash.includes("clay-city") && href.includes("clay-city"))) {
            link.classList.add("active");
            link.style.color = "var(--louis-gold)";
            link.style.fontWeight = "bold";
        } else {
            link.classList.remove("active");
            link.style.color = "#ffffff";
            link.style.fontWeight = "normal";
        }
    });
}

async function handleSPAHashNavigation() {
    resetAllActiveTimers();
    ACTIVE_TOWN = getActiveTownConfig();
    document.body.setAttribute("data-town", ACTIVE_TOWN.primaryName.toUpperCase());
    document.title = `${ACTIVE_TOWN.primaryName}, IL - SMLC Digital Town Square Portal`;
    
    hydrateTownHeroUI();
    updateNavigationActiveState();
    initializeFirebasePortalEngine();

    // Trigger Analytics Section Track
    const newRoute = window.location.hash || "#/clay-city";
    trackSectionChange(newRoute);
}

window.addEventListener('hashchange', () => {
    handleSPAHashNavigation();
});

window.addEventListener('DOMContentLoaded', () => {
    handleSPAHashNavigation();
    console.log(`Master Dual-Engine (RTDB + Firestore) running with Analytics for ${ACTIVE_TOWN.primaryName}.`);
});
