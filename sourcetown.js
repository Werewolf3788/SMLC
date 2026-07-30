/* ==========================================================================
   Active Version: 2026-07-30_19:30
   File: sourcetown.js / script.js
   Description: SMLC Community Portal Network - Universal Title-First SPA Master Engine
   Upgrades:
   - Full-Page HTML Fetch Router for #/town SPA Navigation
   - High-Contrast Subscription & Calendar Export Buttons (Fixed Blue-on-Blue contrast issue)
   - Sections 6 & 8 Advertising Engine: Full-Pool Fixed-Card Rotator with Offset Seed
   - Section Pause Control: Continuously slides, pauses ONLY on mouse hover or mobile touch-hold
   - Controlled High-Density Scrolling: Calendar, News, History & Links auto-scroll if > 5 items
   - Calendar Image Extraction: Auto-detects image URLs/tags inside description text
   - Universal Calendar & Directory: Displays ALL county events & Global links across all town portals
   ========================================================================== */

/* === SECTION 1: Geographically Correct Town Alignment Matrix === */
const TOWN_ALIAS_MAP = {
    "HOME": { primaryName: "Clay County", file: "index.html", dbTownKey: "Global", jsonKey: "all", gasKey: ["louisville", "flora", "clay-city", "xenia"], historyKey: "all", keywords: [], zipCodes: [], isHome: true, scorestreamId: "68601" },
    "CLAY COUNTY": { primaryName: "Clay County", file: "index.html", dbTownKey: "Global", jsonKey: "all", gasKey: ["louisville", "flora", "clay-city", "xenia"], historyKey: "all", keywords: [], zipCodes: [], isHome: true, scorestreamId: "68601" },
    "LOUISVILLE": { primaryName: "Louisville", file: "louisville.html", dbTownKey: "Louisville", jsonKey: "louisville", gasKey: ["louisville"], historyKey: "louisville", keywords: ["LOUISVILLE", "NORTH CLAY", "NC", "HOOSIER"], zipCodes: ["62858"], scorestreamId: "68601" },
    "FLORA": { primaryName: "Flora", file: "flora.html", dbTownKey: "Flora", jsonKey: "flora", gasKey: ["flora"], historyKey: "flora", keywords: ["FLORA", "FLO", "WOLVES"], zipCodes: ["62839"], scorestreamId: "68602" },
    "CLAY CITY": { primaryName: "Clay City", file: "clay-city.html", dbTownKey: "Clay City", jsonKey: "clay_city", gasKey: ["clay-city"], historyKey: "clay_city", keywords: ["CLAY CITY", "CC"], zipCodes: ["62824"], scorestreamId: "64422" },
    "XENIA": { primaryName: "Xenia", file: "xenia.html", dbTownKey: "Xenia", jsonKey: "clay_county_teams", gasKey: ["xenia"], historyKey: "xenia", keywords: ["XENIA"], zipCodes: ["62899"], scorestreamId: "68988" },
    "IOLA": { primaryName: "Iola", file: "louisville.html", dbTownKey: "Iola", jsonKey: "iola", gasKey: ["louisville"], historyKey: "iola", keywords: ["IOLA"], zipCodes: ["62849"], scorestreamId: "68601" },
    "SAILOR SPRINGS": { primaryName: "Sailor Springs", file: "sailor-springs.html", dbTownKey: "Sailor Springs", jsonKey: "sailor_springs", gasKey: ["louisville", "clay-city"], historyKey: "sailor_springs", keywords: ["SAILOR SPRINGS"], zipCodes: ["62879"], scorestreamId: "68988" },
    "INGRAHAM": { primaryName: "Ingraham", file: "louisville.html", dbTownKey: "Ingraham", jsonKey: "louisville", gasKey: ["louisville", "clay-city"], historyKey: "ingraham", keywords: ["INGRAHAM"], zipCodes: ["62434"], scorestreamId: "68601" }
};

function getActiveTownConfig() {
    // 1. Hash Navigation Priority (#/clay-city, #/flora)
    const hashRoute = (window.location.hash || "").replace("#/", "").replace("#", "").replace(/-/g, " ").toUpperCase();
    if (hashRoute && TOWN_ALIAS_MAP[hashRoute]) return TOWN_ALIAS_MAP[hashRoute];

    // 2. Document Title Priority
    const pageTitle = (document.title || "").toUpperCase();
    for (const key in TOWN_ALIAS_MAP) {
        if (pageTitle.includes(key)) return TOWN_ALIAS_MAP[key];
    }

    // 3. Body/HTML Attribute Priority
    const htmlTownAttr = (document.documentElement.getAttribute('data-town') || document.body?.getAttribute('data-town') || "").toUpperCase();
    if (htmlTownAttr) {
        for (const key in TOWN_ALIAS_MAP) {
            if (key === htmlTownAttr || TOWN_ALIAS_MAP[key].primaryName.toUpperCase() === htmlTownAttr) {
                return TOWN_ALIAS_MAP[key];
            }
        }
    }

    // 4. Default Aggregator Hub
    return TOWN_ALIAS_MAP["HOME"];
}

let ACTIVE_TOWN = getActiveTownConfig();

/* === SECTION 2: Global State Tracking & Timer Purger === */
let globalSlideshowTicker = null;
let gasMonitorRotator = null;
let section6PartnerTimer = null;
let section8PartnerTimer = null;
window.calendarCachedEvents = [];
window.newsCacheBlock = [];
window.globalAppConfig = null;

function resetAllActiveTimers() {
    if (globalSlideshowTicker) { clearInterval(globalSlideshowTicker); globalSlideshowTicker = null; }
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
    if (section6PartnerTimer) { clearInterval(section6PartnerTimer); section6PartnerTimer = null; }
    if (section8PartnerTimer) { clearInterval(section8PartnerTimer); section8PartnerTimer = null; }
}

/* === SECTION 3: Helper & Utility Functions === */
function getSmartCacheBuster() { return "v=" + Math.floor(Date.now() / 3600000); }

function cleanRawUrl(urlStr) {
    if (!urlStr) return "";
    return urlStr.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").replace("/edit/", "/");
}

function matchesActiveTown(text, location) {
    if (ACTIVE_TOWN.isHome) return true;
    const combinedStr = ((text || "") + " " + (location || "")).toUpperCase();
    return ACTIVE_TOWN.keywords.some(kw => combinedStr.includes(kw)) || ACTIVE_TOWN.zipCodes.some(zip => combinedStr.includes(zip));
}

function formatHumanTimestamp(rawString) {
    if (!rawString || rawString === "undefined" || rawString === "null") return "Date TBA";
    try {
        const dateObj = new Date(rawString);
        if (isNaN(dateObj.getTime())) return rawString;
        return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch(e) { return rawString; }
}

/* Helper: Apply Max-Height Scroll Constraint to Containers with > 5 Items */
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

/* Helper: Extracts Image URLs from Text & Cleans Description Text */
function extractImageFromText(rawText) {
    if (!rawText) return { imageUrl: null, cleanText: "" };

    let imageUrl = null;
    let cleanText = rawText;

    const imgTagMatch = cleanText.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgTagMatch && imgTagMatch[1]) {
        imageUrl = imgTagMatch[1];
        cleanText = cleanText.replace(/<img[^>]*>/gi, '');
    } else {
        const directUrlMatch = cleanText.match(/(https?:\/\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s<>"']*)?)/i);
        if (directUrlMatch && directUrlMatch[1]) {
            imageUrl = directUrlMatch[1];
            cleanText = cleanText.replace(directUrlMatch[1], '');
        }
    }

    return { imageUrl: imageUrl ? imageUrl.trim() : null, cleanText: cleanText.trim() };
}

function parseInteractiveContent(rawText) {
    if (!rawText) return "";
    let parsed = rawText;

    parsed = parsed.replace(/(\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b)/g, (match) => {
        const clean = match.replace(/[^\d]/g, '');
        const isWhatsApp = clean.includes("6187084450");
        return `<a href="javascript:void(0)" onclick="handlePhoneClick('${clean}', ${isWhatsApp})" style="color:#0258A3; font-weight:bold; text-decoration:underline;">${match}</a>`;
    });

    parsed = parsed.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match) => {
        return `<a href="mailto:${match}" style="color:#0258A3; font-weight:bold; text-decoration:underline;">${match}</a>`;
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

function isIOSDevice() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function buildOSMapUrl(addressText) {
    if (!addressText) return "#";
    const encoded = encodeURIComponent(addressText);
    if (isIOSDevice()) return `maps://maps.apple.com/?daddr=${encoded}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

function handlePhoneClick(number, isWhatsAppEligible) {
    const cleanNum = number.replace(/[^\d]/g, '');
    if (isWhatsAppEligible) {
        const wantWhatsApp = confirm("Click 'OK' to open WhatsApp Chat, or 'Cancel' to place a direct Phone Call.");
        if (wantWhatsApp) {
            window.open(`https://wa.me/1${cleanNum}`, '_blank');
            return;
        }
    }
    window.location.href = `tel:+1${cleanNum}`;
}

/* Dynamic Auto-Hide Safeguard for Empty/Broken Image Containers */
function safeSetImageSource(imgElement, srcUrl, fallbackWrapper = null) {
    if (!imgElement) return;
    const parentContainer = fallbackWrapper || imgElement.closest('figure, .spotlight-image-wrap, .section3-landmark-img-wrap, .polaroid-wrap, .article-media-frame') || imgElement.parentElement;

    if (!srcUrl || srcUrl.trim() === "" || srcUrl === "null" || srcUrl === "undefined") {
        if (parentContainer) parentContainer.style.display = "none";
        imgElement.style.display = "none";
        return;
    }

    imgElement.onerror = () => {
        if (parentContainer) parentContainer.style.display = "none";
        imgElement.style.display = "none";
    };

    imgElement.onload = () => {
        imgElement.style.display = "block";
        if (parentContainer) parentContainer.style.display = "block";
    };

    imgElement.src = srcUrl;
}

/* === SECTION 3B: Calendar Export Utilities === */
function generateGoogleCalendarUrl(event) {
    const title = encodeURIComponent(event.name || event.title || "Community Event");
    const rawDetails = event.details || event.description || "Community Event in Clay County, IL";
    const { cleanText } = extractImageFromText(rawDetails);
    const details = encodeURIComponent(cleanText);
    const location = encodeURIComponent(event.location || "Clay County, IL");
    
    let startIso = "";
    let endIso = "";

    try {
        const rawDate = event.date || event.displayDate || event.event_date || Date.now();
        const startDate = new Date(rawDate);
        if (!isNaN(startDate.getTime())) {
            startIso = startDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
            const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
            endIso = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
        }
    } catch(e) {}

    const datesParam = (startIso && endIso) ? `&dates=${startIso}/${endIso}` : '';
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}${datesParam}`;
}

function downloadIcsCalendarFile(idx) {
    const event = window.calendarCachedEvents[idx];
    if (!event) return;

    const title = event.name || event.title || "Community Event";
    const rawDetails = event.details || event.description || "";
    const { cleanText } = extractImageFromText(rawDetails);
    const details = cleanText.replace(/\n/g, "\\n");
    const location = event.location || "Clay County, IL";
    
    let startIso = new Date().toISOString().replace(/-|:|\.\d\d\d/g, "");
    let endIso = new Date(Date.now() + 7200000).toISOString().replace(/-|:|\.\d\d\d/g, "");

    try {
        const rawDate = event.date || event.displayDate || event.event_date;
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
            startIso = d.toISOString().replace(/-|:|\.\d\d\d/g, "");
            endIso = new Date(d.getTime() + 7200000).toISOString().replace(/-|:|\.\d\d\d/g, "");
        }
    } catch(e) {}

    const icsData = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SMLC Community Portal//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
SUMMARY:${title}
DESCRIPTION:${details}
LOCATION:${location}
DTSTART:${startIso}
DTEND:${endIso}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* === SECTION 4: Lightbox Modal & Universal Click Handler === */
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
    
    if(imgSrc && targetImg) {
        safeSetImageSource(targetImg, imgSrc);
        targetImg.alt = altText || title || "Expanded Media View";
        if (targetImg.parentElement) targetImg.parentElement.style.display = 'block';
    } else if (targetImg && targetImg.parentElement) {
        targetImg.parentElement.style.display = 'none';
    }
    
    const dateEl = document.getElementById('lightbox-target-date'); if (dateEl) dateEl.innerHTML = dateText || '';
    const titleEl = document.getElementById('lightbox-target-title'); if (titleEl) titleEl.innerText = title || '';
    const storyEl = document.getElementById('lightbox-target-story'); if (storyEl) storyEl.innerHTML = parseInteractiveContent(bodyText) || '';
    
    if (targetUrl && actionLink && actionRow) {
        actionLink.href = attachUtmParameters(targetUrl);
        actionRow.style.display = 'block';
    } else if (actionRow) {
        actionRow.style.display = 'none';
    }
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.onclick = closeLightbox;
    }
}

function openCalendarLightboxModal(idx) {
    const targetItem = window.calendarCachedEvents[idx];
    if(!targetItem) return;

    const title = targetItem.name || targetItem.title || "Community Event";
    const rawDate = targetItem.date || targetItem.displayDate || targetItem.event_date || targetItem.pubDate;
    const dateText = formatHumanTimestamp(rawDate);
    const timeText = targetItem.time || targetItem.displayTime || "Time TBA";
    const rawLoc = targetItem.location || ACTIVE_TOWN.primaryName + ", IL";
    const mapUrl = buildOSMapUrl(rawLoc);
    
    const rawDetails = targetItem.details || targetItem.description || "No details provided.";
    const explicitImg = targetItem.imageUrl || targetItem.image || targetItem.img;
    const { imageUrl: textImgUrl, cleanText } = extractImageFromText(rawDetails);
    
    const finalEventImg = explicitImg || textImgUrl || '';
    const metaHeader = `${dateText} @ ${timeText} | Location: <a href="${mapUrl}" target="_blank" style="color:#d9534f; text-decoration:underline;">${rawLoc}</a>`;
    
    const googleCalUrl = generateGoogleCalendarUrl(targetItem);
    const calActionHtml = `
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="${googleCalUrl}" target="_blank" style="background:#1a73e8; color:#ffffff !important; padding:6px 12px; border-radius:4px; text-decoration:none; font-size:13px; font-weight:bold;">+ Add to Google Calendar</a>
            <button onclick="downloadIcsCalendarFile(${idx})" style="background:#1e7e34; color:#ffffff !important; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold;">+ Download iCal / Outlook (.ics)</button>
        </div>
    `;

    const lightboxImageHtml = finalEventImg ? `<div style="margin-bottom:15px; text-align:center;"><img src="${finalEventImg}" alt="${title}" style="max-width:100%; max-height:350px; border-radius:6px; object-fit:contain; box-shadow:0 2px 8px rgba(0,0,0,0.15);" /></div>` : '';

    fireLightbox(finalEventImg, title, metaHeader, lightboxImageHtml + cleanText + calActionHtml, '', title);
}

function openNewsLightboxModal(idx) {
    const story = window.newsCacheBlock[idx];
    if (!story) return;
    fireLightbox(
        story.image || '',
        story.title || 'Local News Dispatch',
        formatHumanTimestamp(story.date || story.pubDate) + (story.location ? ` | ${story.location}` : ''),
        story.full_story || story.description || '',
        story.link || story.url || '',
        story.title || 'Local News Dispatch'
    );
}

/* === SECTION 5: Dynamic Section 3 Slideshow Engine === */
async function initializeSection3Slideshow(cb) {
    const viewport = document.getElementById('louisville-slideshow') || document.getElementById('flora-slideshow') || document.getElementById('clay-city-slideshow') || document.getElementById('xenia-slideshow') || document.getElementById('sailor-springs-slideshow') || document.querySelector('.slider-viewport');
    if (!viewport) return;

    try {
        const slideshowEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.slideshow) || "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/town-images.json";
        const res = await fetch(slideshowEndpoint + '?' + cb);
        const data = await res.json();
        
        let slidesList = [];

        if (data.network_towns) {
            if (ACTIVE_TOWN.isHome) {
                Object.keys(data.network_towns).forEach(townKey => {
                    const townObj = data.network_towns[townKey];
                    if (townObj && townObj.categories) {
                        townObj.categories.forEach(cat => {
                            if (Array.isArray(cat.images)) slidesList.push(...cat.images);
                        });
                    }
                });
            } else {
                const matchedTownKey = Object.keys(data.network_towns).find(
                    key => key.toLowerCase() === ACTIVE_TOWN.primaryName.toLowerCase()
                );

                if (matchedTownKey && data.network_towns[matchedTownKey].categories) {
                    data.network_towns[matchedTownKey].categories.forEach(cat => {
                        if (Array.isArray(cat.images)) slidesList.push(...cat.images);
                    });
                }
            }
        } else {
            const townKey = ACTIVE_TOWN.jsonKey || "louisville";
            slidesList = data[townKey] || data.images || (Array.isArray(data) ? data : []);
        }

        if (slidesList.length > 0) {
            viewport.innerHTML = slidesList.map((item, idx) => {
                const imgUrl = item.imageurl || item.src || item.url || item.image;
                const captionTitle = item.name || item.title || item.alt || 'Town View';
                const altText = (item.alt || captionTitle).replace(/'/g, "\\'");
                const safeCaption = (captionTitle).replace(/'/g, "\\'");

                return `
                    <div class="slider-slide ${idx === 0 ? 'active' : ''}" style="position: absolute; inset: 0; opacity: ${idx === 0 ? 1 : 0}; transition: opacity 0.8s ease-in-out; z-index: ${idx === 0 ? 2 : 1};">
                        <img src="${imgUrl}" alt="${altText}" onclick="fireLightbox('${imgUrl}', '${safeCaption}', 'SLIDESHOW VIEW', '${altText}', '${item.source_url || ''}', '${altText}')" style="width:100%; height:100%; object-fit:cover; cursor:pointer;">
                        ${captionTitle ? `<div class="slider-caption">${captionTitle}</div>` : ''}
                    </div>
                `;
            }).join('');
        }
    } catch(e) {
        console.error("Slideshow JSON fetch error, keeping existing HTML slides:", e);
    }

    const slides = viewport.querySelectorAll('.slider-slide');
    if (slides.length <= 1) return;

    let currentSlideIdx = 0;
    if (globalSlideshowTicker) clearInterval(globalSlideshowTicker);

    globalSlideshowTicker = setInterval(() => {
        slides[currentSlideIdx].style.opacity = "0";
        slides[currentSlideIdx].style.zIndex = "1";
        currentSlideIdx = (currentSlideIdx + 1) % slides.length;
        slides[currentSlideIdx].style.opacity = "1";
        slides[currentSlideIdx].style.zIndex = "2";
    }, 4000);
}

/* === SECTION 6: ScoreStream Integration === */
function loadScorestreamSportsWidget() {
    const container = document.querySelector('.scorestream-widget-container');
    if (!container) return;

    container.setAttribute('data-user-widget-id', ACTIVE_TOWN.scorestreamId);
    const parent = container.parentElement;
    if (parent) {
        const oldScript = parent.querySelector('script[src*="scorestream.com"]');
        if (oldScript) oldScript.remove();

        const newScript = document.createElement('script');
        newScript.type = 'text/javascript';
        newScript.async = true;
        newScript.src = "https://scorestream.com/apiJsCdn/widgets/embed.js";
        parent.appendChild(newScript);
    }
}

/* === SECTION 7: Section 4.2.2 Firebase Realtime Pipeline Engine === */
function initializeFirebaseGasMonitor() {
    const gasContainer = document.getElementById('fuel-monitor-target-box') || document.querySelector('.fuel-monitor-billboard-card');

    const stationConfigs = {
        "48100": { town: "flora", display: "Flora", name: "CASEY'S", logo: "Casey's.png" },      
        "48101": { town: "flora", display: "Flora", name: "HUCK'S", logo: "Hucks.png" },      
        "128128": { town: "flora", display: "Flora", name: "MACH 1", logo: "Mach 1.png" },    
        "120226": { town: "flora", display: "Flora", name: "FAST STOP", logo: "Fast stop.png" },  
        "48026": { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" }, 
        "171711": { town: "clay-city", display: "Clay City", name: "CASEY'S", logo: "Casey's.png" },
        "181818": { town: "xenia", display: "Xenia", name: "KNAPP'S", logo: "Knapps.png" }  
    };

    if (typeof firebase === 'undefined') {
        const fbAppScript = document.createElement('script');
        fbAppScript.src = "https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js";
        document.head.appendChild(fbAppScript);

        const fbDbScript = document.createElement('script');
        fbDbScript.src = "https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js";
        document.head.appendChild(fbDbScript);

        fbDbScript.onload = () => bindFirebaseServices(stationConfigs, gasContainer);
    } else {
        bindFirebaseServices(stationConfigs, gasContainer);
    }
}

function bindFirebaseServices(stationConfigs, gasContainer) {
    const firebaseConfig = {
        apiKey: "AIzaSyBYPbGWDNPUmCSnFWDPPWtiXe2F6MPinXg",
        authDomain: "smlc-fuel-monitor.firebaseapp.com",
        databaseURL: "https://smlc-fuel-monitor-default-rtdb.firebaseio.com",
        projectId: "smlc-fuel-monitor",
        storageBucket: "smlc-fuel-monitor.firebasestorage.app",
        messagingSenderId: "22397440085",
        appId: "1:22397440085:web:c88e71688ed58896bc4dc"
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    
    if (gasContainer) {
        db.ref('fuel_prices').on('value', (snap) => {
            const val = snap.val();
            if (val) renderGasBillboardUI(val, stationConfigs, ACTIVE_TOWN.gasKey, gasContainer);
        });
    }

    bindFirebaseArticleImage(db);
    bindFirebaseMenuEngine(db);
}

function bindFirebaseArticleImage(db) {
    const articleImgTarget = document.getElementById('sec-4-1-article-img');
    if (!articleImgTarget) return;

    const townName = ACTIVE_TOWN.dbTownKey || "Louisville";
    const townPath = `master_county_data/towns/${townName}/sections/sec_4_1/image1/image1`;
    const globalPath = `master_county_data/global/sections/sec_4_1/image1/image1`;

    db.ref(townPath).on('value', (snapshot) => {
        const townImgUrl = snapshot.val();
        if (townImgUrl && townImgUrl.trim() !== "") {
            safeSetImageSource(articleImgTarget, townImgUrl);
        } else {
            db.ref(globalPath).on('value', (globalSnap) => {
                const globalImgUrl = globalSnap.val();
                safeSetImageSource(articleImgTarget, globalImgUrl);
            });
        }
    });
}

function bindFirebaseMenuEngine(db) {
    const menuContainer = document.getElementById('dynamic-menu-links');
    if (!menuContainer) return;

    db.ref('master_county_data/global/menu').on('value', (snapshot) => {
        const menuData = snapshot.val();
        if (menuData) {
            const menuArray = Array.isArray(menuData) ? menuData : Object.values(menuData);
            
            menuContainer.innerHTML = menuArray.map(item => {
                const label = item.name || item.label || item.title || "Town";
                const targetUrl = attachUtmParameters(item.url || item.link || '#');
                const imgIcon = item.imageUrl || item.image || '';
                const isActive = (label.toUpperCase() === ACTIVE_TOWN.primaryName.toUpperCase()) ? 'class="active" style="color: #ffff00; font-weight: bold;"' : 'style="color: #ffffff;"';

                return `
                    <li>
                        <a href="${targetUrl}" ${isActive}>
                            ${imgIcon ? `<img src="${imgIcon}" alt="${label}" style="height:20px; vertical-align:middle; margin-right:6px;" onerror="this.style.display='none'" />` : ''}
                            ${label}
                        </a>
                    </li>
                `;
            }).join('');
        }
    });
}

function renderGasBillboardUI(data, stationConfigs, activeGasTowns, container) {
    const gasTownsArray = Array.isArray(activeGasTowns) ? activeGasTowns : [activeGasTowns];
    const stationIds = Object.keys(stationConfigs).filter(id => gasTownsArray.includes(stationConfigs[id].town));
    if (stationIds.length === 0) return;

    if (gasMonitorRotator) {
        clearInterval(gasMonitorRotator);
        gasMonitorRotator = null;
    }

    const updatePortalUrl = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.gas_widget) 
        || cleanRawUrl(window.globalAppConfig?.regional_endpoints?.update_gas_github_source) 
        || "https://werewolf3788.github.io/SMLC/update-gas.html";

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
        container.onclick = () => window.open(attachUtmParameters(updatePortalUrl), '_blank');

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
            <div class="sync-timestamp-label">Updated: ${updateDate} &bull; Click to Update</div>
        `;
        currentIdx = (currentIdx + 1) % stationIds.length;
    };

    renderCurrentStation();

    if (stationIds.length > 1) {
        gasMonitorRotator = setInterval(renderCurrentStation, 5000);
    }
}

/* === SECTION 8: Sections 6 & 8 Advertising Partners Full-Pool Offset Engine === */
async function loadPartnersStrips(cacheBuster) {
    const topGrid = document.getElementById('partners-grid-top') 
        || document.querySelector('.scotts-partners-top') 
        || document.querySelectorAll('.partner-card-container')[0];
        
    const bottomGrid = document.getElementById('partners-grid-bottom') 
        || document.querySelector('.scotts-partners-bottom') 
        || document.querySelectorAll('.partner-card-container')[1];

    try {
        const partnersEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.partners_json_manifest) 
            || "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/partners.json";
            
        const res = await fetch(partnersEndpoint + '?' + cacheBuster);
        const data = await res.json();
        const partnersList = Array.isArray(data) ? data : (data.partners || []);

        if (partnersList.length > 0) {
            if (topGrid) renderFixedCardSlideshow(topGrid, partnersList, 0, 'section6');

            if (bottomGrid) {
                const offsetSeed = Math.floor(partnersList.length / 2) || 1;
                renderFixedCardSlideshow(bottomGrid, partnersList, offsetSeed, 'section8');
            }
        } else {
            console.warn("Partners manifest loaded but contained no items.");
        }
    } catch(e) { 
        console.error("Partners manifest error:", e); 
    }
}

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

        return `
            <div class="partner-card fixed-slide-card" data-slot-index="${idx}" style="flex: 1 1 180px; max-width: 260px; transition: opacity 0.4s ease;">
                <div class="partner-logo-box">
                    <img class="partner-card-img" src="${initialImg}" alt="${initialName}" onclick="fireLightbox('${initialImg}', '${initialName.replace(/'/g, "\\'")}', 'PARTNER DIRECTORY', 'Local Sponsor', '${initialUrl}', '${initialName.replace(/'/g, "\\'")}')" style="cursor:pointer;" onerror="this.closest('.fixed-slide-card').style.display='none';">
                </div>
                <h4><a class="partner-card-link" href="${initialUrl}" target="_blank" data-ga-label="partner_link">${initialName}</a></h4>
            </div>
        `;
    }).join('');

    let isSectionPaused = false;
    containerElement.addEventListener('mouseenter', () => { isSectionPaused = true; });
    containerElement.addEventListener('mouseleave', () => { isSectionPaused = false; });
    containerElement.addEventListener('touchstart', () => { isSectionPaused = true; }, { passive: true });
    containerElement.addEventListener('touchend', () => { isSectionPaused = false; });
    containerElement.addEventListener('touchcancel', () => { isSectionPaused = false; });

    const cardNodes = containerElement.querySelectorAll('.fixed-slide-card');

    cardNodes.forEach((cardNode) => {
        const slotIdx = parseInt(cardNode.getAttribute('data-slot-index'), 10);
        const slotRotationItems = cardSlotsData[slotIdx];

        if (slotRotationItems && slotRotationItems.length > 1) {
            let currentItemIdx = 0;

            const timerInstance = setInterval(() => {
                if (isSectionPaused) return;

                currentItemIdx = (currentItemIdx + 1) % slotRotationItems.length;
                const nextItem = slotRotationItems[currentItemIdx];
                const nextUrl = attachUtmParameters(nextItem.websiteUrl || nextItem.url || '#');
                const nextImg = nextItem.image || nextItem.logo || '';
                const nextName = nextItem.name || 'Local Partner';

                cardNode.style.opacity = '0';

                setTimeout(() => {
                    const imgEl = cardNode.querySelector('.partner-card-img');
                    const linkEl = cardNode.querySelector('.partner-card-link');

                    if (imgEl) {
                        safeSetImageSource(imgEl, nextImg, cardNode);
                        imgEl.alt = nextName;
                        imgEl.onclick = () => fireLightbox(nextImg, nextName, 'PARTNER DIRECTORY', 'Local Sponsor', nextUrl, nextName);
                    }

                    if (linkEl) {
                        linkEl.href = nextUrl;
                        linkEl.innerText = nextName;
                    }

                    cardNode.style.opacity = '1';
                }, 400);
            }, 4000 + (slotIdx * 850));

            if (sectionId === 'section6') section6PartnerTimer = timerInstance;
            if (sectionId === 'section8') section8PartnerTimer = timerInstance;
        }
    });
}

/* === SECTION 9: Footer Data Pipeline Engine === */
async function loadFooterDataPipeline(cacheBuster) {
    try {
        const footerEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.footer_json) || 'https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/footer.json';
        const res = await fetch(footerEndpoint + '?' + cacheBuster);
        const data = await res.json();
        const contact = data?.footer_data?.contact_info;

        if (contact) {
            const phoneTarget = document.getElementById('footer-phone-target');
            if (phoneTarget && Array.isArray(contact.phone)) {
                phoneTarget.innerHTML = contact.phone.map(p => {
                    const cleanNum = (p.number || "").replace(/[^\d]/g, '');
                    const isWhatsApp = (p.whatsapp_url || p.number.includes("618-708-4450")) ? true : false;
                    const displayLabel = p.label ? `<strong>${p.label}:</strong> ` : '';
                    
                    return `<div><a href="javascript:void(0)" onclick="handlePhoneClick('${cleanNum}', ${isWhatsApp})" style="color:#fff; text-decoration:none;">${displayLabel}${p.number}</a></div>`;
                }).join('');
            }

            const emailTarget = document.getElementById('footer-email-target');
            if (emailTarget && contact.email) {
                const mailAddr = contact.email.address || contact.email;
                emailTarget.href = `mailto:${mailAddr}`;
                emailTarget.innerText = mailAddr;
            }

            const addressTarget = document.getElementById('footer-address-target');
            if (addressTarget && contact.address) {
                const addrText = contact.address.text || contact.address;
                const mapUrl = contact.address.directions_links?.google_maps_directions 
                    || contact.address.view_links?.google_map 
                    || buildOSMapUrl(addrText);
                    
                addressTarget.innerHTML = `<a href="${mapUrl}" target="_blank" style="color:#fff; text-decoration:underline;">${addrText}</a>`;
            }

            const copyTarget = document.getElementById('footer-copy-target');
            if (copyTarget && data.footer_data.copyright) {
                copyTarget.innerHTML = data.footer_data.copyright;
            }
        }
    } catch(e) { console.error("Footer JSON error:", e); }
}

/* === SECTION 10: Local Links Directory Engine === */
async function loadLocalLinksDirectory(cacheBuster) {
    const linkTarget = document.getElementById('local-links-target-container');
    if (!linkTarget) return;

    try {
        const linksEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.local_links) 
            || "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/local_links.json";

        const res = await fetch(linksEndpoint + '?' + cacheBuster);
        if (!res.ok) throw new Error(`HTTP ${res.status} when fetching local_links.json`);

        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data.links || data.local_links || []);

        if (rawList.length > 0) {
            const filteredLinks = rawList.filter(link => {
                const displayName = link.name || link.title || link.label || "";
                const displayLoc = link.location || link.town || link.city || link.category || "";
                const isGlobal = (displayLoc.toUpperCase() === "GLOBAL" || displayLoc.toUpperCase() === "ALL" || displayLoc.toUpperCase() === "CLAY COUNTY");
                
                return matchesActiveTown(displayName, displayLoc) || isGlobal;
            });

            applyHighDensityScrollLimits(linkTarget, filteredLinks.length, 360);

            if (filteredLinks.length > 0) {
                linkTarget.innerHTML = filteredLinks.map(link => {
                    const name = link.name || link.title || link.label || "Local Resource";
                    const targetRawUrl = link.url || link.link || link.href || "#";
                    const taggedUrl = attachUtmParameters(targetRawUrl);
                    const displayLoc = link.location || link.town || "County Wide";

                    return `
                        <div class="local-link-node" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; text-align: left;">
                            <span style="font-weight: bold; font-size: 15px; color: #1a1a1a;">${name}</span>
                            <span style="font-size: 12px; color: #666; margin-left: 6px;">(${displayLoc})</span> &mdash; 
                            <a href="${taggedUrl}" target="_blank" class="local-link-anchor-btn" data-ga-label="local_link" style="font-weight: bold; color: var(--link-bright-blue); text-decoration: underline;">Visit Site &rarr;</a>
                        </div>
                    `;
                }).join('');
            } else {
                linkTarget.innerHTML = `<div style="font-style:italic; font-size:14px; color:#666; padding:10px 0;">No institutional links listed for ${ACTIVE_TOWN.primaryName}.</div>`;
            }
        } else {
            linkTarget.innerHTML = `<div style="font-style:italic; font-size:14px; color:#666; padding:10px 0;">Directory currently empty.</div>`;
        }
    } catch(e) {
        console.error("Local links directory fetch error:", e);
        linkTarget.innerHTML = `<div style="font-size:13px; color:#cc0000; font-weight:bold; padding:10px 0;">Directory segment temporarily offline.</div>`;
    }
}

/* === SECTION 11: Town Article Engine (Coordinate 4.1.0) === */
async function loadTownArticleData(cacheBuster) {
    const articleTarget = document.getElementById('town-article-target') || document.querySelector('.town-article-container');
    if (!articleTarget) return;

    try {
        const articleEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.town_artical) 
            || "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/artical.json";
            
        const res = await fetch(articleEndpoint + '?' + cacheBuster);
        const data = await res.json();

        if (data) {
            const title = data.title || "Town Article";
            const subtitle = data.subtitle ? `<h3 class="town-article-subtitle" style="font-size: 1.1rem; color: #555; margin-bottom: 15px;">${data.subtitle}</h3>` : "";
            
            let paragraphsHtml = "";
            if (Array.isArray(data.content)) {
                paragraphsHtml = data.content.map(paragraph => `<p style="margin-bottom: 1rem; line-height: 1.6;">${parseInteractiveContent(paragraph)}</p>`).join('');
            } else if (typeof data.content === 'string') {
                paragraphsHtml = `<p style="margin-bottom: 1rem; line-height: 1.6; white-space: pre-line;">${parseInteractiveContent(data.content)}</p>`;
            }

            let sourceLinkHtml = "";
            if (data.source_url) {
                const taggedUrl = attachUtmParameters(data.source_url);
                sourceLinkHtml = `<div style="margin-top: 15px;"><a href="${taggedUrl}" target="_blank" data-ga-label="town_article_source" style="color: #0258A3; font-weight: bold; text-decoration: underline;">Read Full Source &rarr;</a></div>`;
            }

            articleTarget.innerHTML = `
                <div class="town-article-wrapper" data-ga-label="town_article_block">
                    <h2 class="town-article-title" style="font-size: 1.5rem; font-weight: bold; margin-bottom: 5px;">${title}</h2>
                    ${subtitle}
                    <div class="town-article-body">
                        ${paragraphsHtml}
                    </div>
                    ${sourceLinkHtml}
                </div>
            `;
        }
    } catch(e) {
        console.error("Town Article JSON error:", e);
    }
}

/* === SECTION 12: SPA Pipeline Router & Dynamic HTML Fetcher === */
function updateNavigationActiveState() {
    const currentHash = (window.location.hash || "#/home").toLowerCase();
    document.querySelectorAll('#dynamic-menu-links a, .menu-links a').forEach(link => {
        const href = (link.getAttribute("href") || "").toLowerCase();
        if (href === currentHash || (currentHash === "#/home" && href.includes("home"))) {
            link.classList.add("active");
            link.style.color = "#ffff00";
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
    updateNavigationActiveState();

    const targetHtmlFile = ACTIVE_TOWN.file;

    // Check if current page HTML already matches target town or attempt SPA page fetch
    if (targetHtmlFile && !window.location.pathname.endsWith(targetHtmlFile)) {
        try {
            const cb = getSmartCacheBuster();
            const fetchUrl = `./${targetHtmlFile}?${cb}`;
            const response = await fetch(fetchUrl);

            if (response.ok) {
                const htmlText = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, "text/html");

                // Extract main portal content (ignoring header and footer duplicates)
                const newContent = doc.querySelector('.main-container') || doc.body;
                const currentContainer = document.querySelector('.main-container') || document.body;

                if (newContent && currentContainer && currentContainer !== document.body) {
                    currentContainer.innerHTML = newContent.innerHTML;
                }
            }
        } catch (e) {
            console.warn(`SPA HTML Fetch for ${targetHtmlFile} failed; using inline page state:`, e);
        }
    }

    // Hydrate dynamic JS data pipelines
    await processDataPipelines();
}

async function processDataPipelines() {
    const cb = getSmartCacheBuster();

    try {
        const configUrl = 'https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/config.json?' + cb;
        const configRes = await fetch(configUrl);
        window.globalAppConfig = await configRes.json();
    } catch(e) { console.error("Config fetch fault", e); }

    const endpoints = window.globalAppConfig?.regional_endpoints || {};

    // 1. Business Spotlight Loader (Section 4.2.1)
    try {
        const spotlightEndpoint = cleanRawUrl(endpoints.Business_Spotlight) || "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/spotlight.json";
        const spotlightRes = await fetch(spotlightEndpoint + '?' + cb);
        const spotlightData = await spotlightRes.json();
        const spotlightTarget = document.querySelector('.clay-county-news-box.spotlight-clipping');
        
        if (spotlightData && spotlightTarget) {
            const townKey = ACTIVE_TOWN.jsonKey || "louisville";
            const spotlights = spotlightData.business_spotlights || {};
            const townsMap = spotlights.cities_towns_villages || {};
            const townshipsMap = spotlights.civil_townships || {};

            const activeSpotlight = townsMap[townKey] 
                || townshipsMap[townKey] 
                || townshipsMap[`${townKey}_township`]
                || spotlightData[townKey]
                || (Array.isArray(spotlightData) ? spotlightData[0] : null);

            if (activeSpotlight) {
                const img = activeSpotlight.image_url || activeSpotlight.src || activeSpotlight.imageurl || activeSpotlight.image;
                const title = activeSpotlight.title || activeSpotlight.name || "Local Merchant";
                const loc = activeSpotlight.location || ACTIVE_TOWN.primaryName + ", IL";
                const desc = activeSpotlight.description || activeSpotlight.alt || "Supporting local commerce across Clay County.";
                const link = attachUtmParameters(activeSpotlight.website_url || activeSpotlight.url || activeSpotlight.link || "#");

                spotlightTarget.innerHTML = `
                    <div class="sidebar-widget-title">BUSINESS SPOTLIGHT</div>
                    <div class="spotlight-image-wrap"><img src="${img}" alt="${title}" onclick="fireLightbox('${img}', '${title.replace(/'/g, "\\'")}', '${loc}', '${desc.replace(/'/g, "\\'")}', '${link}', '${title.replace(/'/g, "\\'")}')" onerror="this.parentElement.style.display='none';"></div>
                    <span class="biz-title">${title}</span>
                    <span class="biz-location">${loc}</span>
                    <p class="biz-description">"${desc}"</p>
                    <a href="${link}" target="_blank" class="spotlight-btn" data-ga-label="business_spotlight">Visit Business &rarr;</a>
                `;
            }
        }
    } catch(e) { console.error("Spotlight error", e); }

    // 2. Section 3 Landmark Data
    try {
        const section3Endpoint = cleanRawUrl(endpoints.Section_3) || "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/section3.json";
        const res = await fetch(section3Endpoint + '?' + cb);
        const rows = await res.json();
        if (Array.isArray(rows)) {
            const targetRow = rows.find(r => (r.Town || "").toUpperCase() === ACTIVE_TOWN.primaryName.toUpperCase());
            if (targetRow) {
                const rTitle = document.getElementById('right-card-meta-title'); if (rTitle) rTitle.innerText = targetRow.Title;
                const i1 = document.getElementById('dual-img-1'); if (i1) { safeSetImageSource(i1, targetRow.ImageUrl1); i1.onclick = () => fireLightbox(targetRow.ImageUrl1, targetRow.Header1, "ARCHIVE VIEW", targetRow.Description1, '', targetRow.Header1); }
                const h1 = document.getElementById('dual-header-1'); if (h1) h1.innerText = targetRow.Header1;
                const i2 = document.getElementById('dual-img-2'); if (i2) { safeSetImageSource(i2, targetRow.ImageUrl2); i2.onclick = () => fireLightbox(targetRow.ImageUrl2, targetRow.Header2, "ARCHIVE VIEW", targetRow.Description1, '', targetRow.Header2); }
                const h2 = document.getElementById('dual-header-2'); if (h2) h2.innerText = targetRow.Header2;
                const desc1 = document.getElementById('right-card-meta-desc1'); if (desc1) desc1.innerText = targetRow.Description1;
                const desc2 = document.getElementById('desc2-target-1'); if (desc2) desc2.innerText = targetRow.Description2;
            }
        }
    } catch(e) { console.error("Section 3 error", e); }

    await initializeSection3Slideshow(cb);

    // 3. Historical Timeline Engine (High Density Controlled Scroll > 5 Items)
    const historyRowTarget = document.getElementById('history-row-target');
    try {
        const historyTree = window.globalAppConfig?.town_history_tree || {};
        const activeHistoryKey = ACTIVE_TOWN.historyKey || "louisville";
        
        let historyEndpoint = historyTree[activeHistoryKey] 
            || `https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/${activeHistoryKey.replace(/_/g, '-')}.json`;
            
        const res = await fetch(cleanRawUrl(historyEndpoint) + '?' + cb);
        if (!res.ok) throw new Error(`HTTP ${res.status} when fetching history for ${activeHistoryKey}`);

        const payload = await res.json();
        const historyList = Array.isArray(payload) ? payload : (payload.history || payload.timeline || []);

        if (historyList.length > 0 && historyRowTarget) {
            applyHighDensityScrollLimits(historyRowTarget, historyList.length, 520);

            historyRowTarget.innerHTML = historyList.map(evt => `
                <div class="history-card" onclick="fireLightbox('${evt.image_url || evt.image || ''}', '${(evt.event || evt.title || '').replace(/'/g, "\\'")}', 'YEAR ${evt.year}', '${(evt.description || '').replace(/'/g, "\\'")}', '${evt.source_url || evt.link || ''}', '${(evt.event || evt.title || '').replace(/'/g, "\\'")}')">
                    <h2>${evt.year}</h2>
                    <h3>${evt.event || evt.title}</h3>
                    <p>${evt.description || ''}</p>
                    ${(evt.image_url || evt.image) ? `<div class="history-img-box"><img src="${evt.image_url || evt.image}" alt="${evt.event}" onerror="this.parentElement.style.display='none';"></div>` : ''}
                </div>
            `).join('');
        } else if (historyRowTarget) {
            historyRowTarget.innerHTML = `<div style="color:#ffffff; font-style:italic; text-align:center; width:100%; padding: 20px;">No historical milestones recorded yet for ${ACTIVE_TOWN.primaryName}.</div>`;
        }
    } catch(e) { 
        console.error("Timeline data fetch/parse error:", e);
        if (historyRowTarget) {
            historyRowTarget.innerHTML = `<div style="color:#ffffff; font-style:italic; text-align:center; width:100%; padding: 20px;">Historical records archive temporarily updating.</div>`;
        }
    }

    // 4. Universal Calendar Bulletin Engine (High Density Controlled Scroll > 5 Items)
    try {
        const bulletinEndpoint = endpoints.apps_script_bulletin_url || "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec";
        const res = await fetch(bulletinEndpoint + '?feed=true&' + cb);
        const elements = await res.json();
        const scroller = document.getElementById('bulletin-scroller-target');

        if (Array.isArray(elements) && elements.length > 0) {
            window.calendarCachedEvents = elements;
            
            if (scroller && window.calendarCachedEvents.length > 0) {
                applyHighDensityScrollLimits(scroller, window.calendarCachedEvents.length, 500);

                const webcalFeedUrl = "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec?feed=ics";
                const googleSubUrl = `https://www.google.com/calendar/render?cid=webcal://${encodeURIComponent(webcalFeedUrl.replace(/^https?:\/\//, ''))}`;

                const subscriptionHeaderHtml = `
                    <div style="background:#f8f9fa; border:1px solid #e2e8f0; padding:10px; border-radius:6px; margin-bottom:15px; text-align:center;">
                        <span style="font-size:12px; font-weight:bold; color:#333; display:block; margin-bottom:6px;">SUBSCRIBE TO FULL COUNTY CALENDAR</span>
                        <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
                            <a href="${googleSubUrl}" target="_blank" style="font-size:11px; font-weight:bold; color:#ffffff !important; background:#1a73e8; padding:6px 12px; border-radius:4px; text-decoration:none; display:inline-block;">Subscribe in Google Calendar</a>
                            <a href="webcal://${webcalFeedUrl.replace(/^https?:\/\//, '')}" style="font-size:11px; font-weight:bold; color:#ffffff !important; background:#1e7e34; padding:6px 12px; border-radius:4px; text-decoration:none; display:inline-block;">Subscribe in Apple / iCal</a>
                        </div>
                    </div>
                `;

                const eventsHtml = window.calendarCachedEvents.map((item, idx) => {
                    const eventLoc = item.location || "Clay County, IL";
                    const mapUrl = buildOSMapUrl(eventLoc);
                    
                    const rawDetails = item.details || item.description || "";
                    const explicitImg = item.imageUrl || item.image || item.img;
                    const { imageUrl: textImgUrl, cleanText } = extractImageFromText(rawDetails);
                    
                    const finalEventImg = explicitImg || textImgUrl || '';
                    const parsedDetails = parseInteractiveContent(cleanText.substring(0, 90));
                    const rawDate = item.date || item.displayDate || item.event_date || item.pubDate;
                    const dateText = formatHumanTimestamp(rawDate);
                    const googleCalUrl = generateGoogleCalendarUrl(item);

                    const thumbnailHtml = finalEventImg ? `
                        <div style="margin-top:8px; margin-bottom:8px; text-align:left;">
                            <img src="${finalEventImg}" alt="${item.name || item.title}" onclick="openCalendarLightboxModal(${idx})" style="width:70px; height:70px; object-fit:cover; border-radius:4px; cursor:pointer; border:1px solid #ddd;" onerror="this.parentElement.style.display='none';" />
                        </div>
                    ` : '';

                    return `
                        <div class="divi-event-item" style="margin-bottom:15px; padding-bottom:10px; border-bottom:1px dashed #ccc;">
                            <div class="divi-event-date" style="font-size:12px; color:#d9534f; font-weight:bold;">${dateText} &bull; ${item.time || item.displayTime || 'TBA'}</div>
                            <div class="divi-event-title" style="font-size:16px; font-weight:bold;">${item.name || item.title}</div>
                            <div class="event-info-text" style="font-size:13px; color:#333;">
                                <strong>Where:</strong> <a href="${mapUrl}" target="_blank" style="color:#0258A3; text-decoration:underline;">${eventLoc}</a>
                            </div>
                            ${thumbnailHtml}
                            <div style="font-size:13px; color:#555; margin-top:4px;">${parsedDetails}...</div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; flex-wrap:wrap; gap:6px;">
                                <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})" style="color:#0258A3; font-weight:bold; cursor:pointer; font-size:13px;">Read Details &rarr;</div>
                                <div style="display:flex; gap:6px;">
                                    <a href="${googleCalUrl}" target="_blank" title="Add to Google Calendar" style="font-size:11px; background:#e8f0fe; color:#1a73e8; padding:3px 6px; border-radius:3px; text-decoration:none; font-weight:bold;">+ Google Cal</a>
                                    <a href="javascript:void(0)" onclick="downloadIcsCalendarFile(${idx})" title="Download iCal Event" style="font-size:11px; background:#e6f4ea; color:#137333; padding:3px 6px; border-radius:3px; text-decoration:none; font-weight:bold;">+ iCal</a>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                scroller.innerHTML = subscriptionHeaderHtml + eventsHtml;
            } else if (scroller) {
                scroller.innerHTML = `<div style="text-align:center; padding: 20px; font-style:italic;">No upcoming events currently scheduled in Clay County.</div>`;
            }
        }
    } catch(err) { console.error("Calendar Wire fault", err); }

    // 5. Local News Matrix Pipeline (High Density Controlled Scroll > 5 Items)
    try {
        const newsEndpoint = cleanRawUrl(endpoints.smlc_local_news_json) || "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json";
        const res = await fetch(newsEndpoint + '?' + cb);
        const newsArray = await res.json();
        const targetGrid = document.getElementById('news-matrix-target');
        
        if (Array.isArray(newsArray) && targetGrid) {
            window.newsCacheBlock = newsArray.filter(item => matchesActiveTown(item.title + " " + item.full_story, item.location));
            
            if (window.newsCacheBlock.length > 0) {
                applyHighDensityScrollLimits(targetGrid, window.newsCacheBlock.length, 520);

                targetGrid.innerHTML = window.newsCacheBlock.map((story, idx) => `
                    <div class="news-matrix-card" style="background:#fff; border:1px solid #ddd; padding:18px; border-radius:6px; margin-bottom:16px;">
                        ${story.image ? `<img src="${story.image}" style="width:100%; height:160px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="openNewsLightboxModal(${idx})" onerror="this.style.display='none';">` : ''}
                        <div style="font-size:12px; color:#d9534f; font-weight:bold; margin-top:10px;">${formatHumanTimestamp(story.date)}</div>
                        <div style="font-weight:bold; font-size:16px; margin:6px 0; color:#1a1a1a;">${story.title}</div>
                        <div style="font-size:14px; color:#444;">"${(story.full_story || story.description || '').substring(0, 110)}..."</div>
                        <div class="read-more-btn" onclick="openNewsLightboxModal(${idx})" style="color: #0258A3; font-weight: bold; cursor: pointer; margin-top: 10px;">Read Full Dispatch &rarr;</div>
                    </div>
                `).join('');
            } else {
                targetGrid.innerHTML = `<div style="text-align:center; padding: 20px; font-style:italic;">No recent dispatches found for ${ACTIVE_TOWN.primaryName}.</div>`;
            }
        }
    } catch(e) { console.error("Local news error", e); }

    // 6. Integrations & Dynamic Modules
    await loadTownArticleData(cb);
    await loadLocalLinksDirectory(cb);
    await loadPartnersStrips(cb);
    await loadFooterDataPipeline(cb);
    loadScorestreamSportsWidget();
    initializeFirebaseGasMonitor();
}

/* === SPA Router Listener (#/route Navigation) === */
window.addEventListener('hashchange', () => {
    handleSPAHashNavigation();
});

/* Initial Application Hydration */
window.addEventListener('DOMContentLoaded', () => {
    handleSPAHashNavigation();
    console.log(`Master Engine initialized for ${ACTIVE_TOWN.primaryName}. Build: 2026-07-30_19:30`);
});
