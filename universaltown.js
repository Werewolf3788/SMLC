/* ==========================================================================
   Active Version: 2026-10-01_15:15
   File: universaltown.js
   Project: SMLC County Portal Semantic Master Script
   Description: Complete multi-town client engine connecting to Firebase RTDB.
                Maps semantic nodes (slideshow, point_of_interest, article, 
                spotlight, history, town_links, partners, menu, footer),
                blends town + global slideshows, executes distinct alternating
                full-pool partner rotations with visual flash animations,
                and locks image alt descriptions into the global lightbox modal.
   Timestamp: 2026-10-01 15:15 EDT (New York)
   ========================================================================== */

// Line 14: Master Town Alias Map
const TOWN_ALIAS_MAP = {
    "HOME": { primaryName: "Clay County", dbTownKey: "Global", jsonKey: "all", gasKey: ["louisville", "flora", "clay-city", "xenia"], historyKey: "all", keywords: [], zipCodes: [], isHome: true, scorestreamId: "68601", seatBadge: "Clay County Seat", estMeta: "Est. 1824 | Zip Code 62824", riverMarquee: "COMMUNITY DIGITAL NETWORK MAP", themeAccent: "#0258A3" },
    "CLAY COUNTY": { primaryName: "Clay County", dbTownKey: "Global", jsonKey: "all", gasKey: ["louisville", "flora", "clay-city", "xenia"], historyKey: "all", keywords: [], zipCodes: [], isHome: true, scorestreamId: "68601", seatBadge: "Clay County Seat", estMeta: "Est. 1824 | Zip Code 62824", riverMarquee: "COMMUNITY DIGITAL NETWORK MAP", themeAccent: "#0258A3" },
    "CLAY CITY": { primaryName: "Clay City", dbTownKey: "Clay City", jsonKey: "clay_city", gasKey: ["clay-city"], historyKey: "clay_city", keywords: ["CLAY CITY", "CC"], zipCodes: ["62824"], scorestreamId: "64422", seatBadge: "Clay County Hub", estMeta: "Est. 1868 | Zip Code 62824", riverMarquee: "HOME OF THE CLAY CITY BULLDOGS & CUBIES", themeAccent: "#4A154B" },
    "FLORA": { primaryName: "Flora", dbTownKey: "Flora", jsonKey: "flora", gasKey: ["flora"], historyKey: "flora", keywords: ["FLORA", "FLO", "WOLVES"], zipCodes: ["62839"], scorestreamId: "68602", seatBadge: "Clay County Hub", estMeta: "Est. 1854 | Zip Code 62839", riverMarquee: "HOME OF THE FLORA WOLVES • COMMERCE CENTER", themeAccent: "#0258A3" },
    "LOUISVILLE": { primaryName: "Louisville", dbTownKey: "Louisville", jsonKey: "louisville", gasKey: ["louisville"], historyKey: "louisville", keywords: ["LOUISVILLE", "NORTH CLAY", "NC", "HOOSIER"], zipCodes: ["62858"], scorestreamId: "68601", seatBadge: "Clay County Seat", estMeta: "Est. 1836 | Zip Code 62858", riverMarquee: "ON THE LITTLE WABASH RIVER", themeAccent: "#EB1C24" },
    "XENIA": { primaryName: "Xenia", dbTownKey: "Xenia", jsonKey: "clay_county_teams", gasKey: ["xenia"], historyKey: "xenia", keywords: ["XENIA"], zipCodes: ["62899"], scorestreamId: "68988", seatBadge: "Clay County Gateway", estMeta: "Est. 1834 | Zip Code 62899", riverMarquee: "HISTORIC PRIDE & RURAL HERITAGE", themeAccent: "#1C5640" },
    "SAILOR SPRINGS": { primaryName: "Sailor Springs", dbTownKey: "Sailor Springs", jsonKey: "sailor_springs", gasKey: ["louisville", "clay-city"], historyKey: "sailor_springs", keywords: ["SAILOR SPRINGS"], zipCodes: ["62879"], scorestreamId: "68988", seatBadge: "Clay County Village", estMeta: "Est. 1879 | Zip Code 62879", riverMarquee: "HISTORIC MINERAL SPRINGS HAVEN", themeAccent: "#00695C" },
    "IOLA": { primaryName: "Iola", dbTownKey: "Iola", jsonKey: "iola", gasKey: ["louisville"], historyKey: "iola", keywords: ["IOLA"], zipCodes: ["62849"], scorestreamId: "68601", seatBadge: "Clay County Village", estMeta: "Est. 1860 | Zip Code 62849", riverMarquee: "NORTHWEST CLAY COUNTY COMMUNITY", themeAccent: "#E65100" },
    "INGRAHAM": { primaryName: "Ingraham", dbTownKey: "Ingraham", jsonKey: "louisville", gasKey: ["louisville", "clay-city"], historyKey: "ingraham", keywords: ["INGRAHAM"], zipCodes: ["62434"], scorestreamId: "68601", seatBadge: "Clay County Village", estMeta: "Est. 1858 | Zip Code 62434", riverMarquee: "NORTHEAST CLAY COUNTY COMMUNITY", themeAccent: "#4E342E" }
};

// Line 27: Active Town Config Resolver
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

    return TOWN_ALIAS_MAP["XENIA"];
}

let ACTIVE_TOWN = getActiveTownConfig();

const DEFAULT_APP_CONFIG = {
    regional_endpoints: {
        apps_script_bulletin_url: "//script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec",
        smlc_local_news_json: "//raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json",
        gas_widget: "//werewolf3788.github.io/SMLC/update-gas.html"
    }
};

let globalSlideshowTicker = null;
let gasMonitorRotator = null;
let topPartnerTimer = null;
let bottomPartnerTimer = null;

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

// Line 78: Clear Active Intervals on Route Changes
function resetAllActiveTimers() {
    if (globalSlideshowTicker) { clearInterval(globalSlideshowTicker); globalSlideshowTicker = null; }
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
    if (topPartnerTimer) { clearInterval(topPartnerTimer); topPartnerTimer = null; }
    if (bottomPartnerTimer) { clearInterval(bottomPartnerTimer); bottomPartnerTimer = null; }
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

function formatHumanTimestamp(rawString) {
    if (!rawString || rawString === "undefined" || rawString === "null") return "Date TBA";
    try {
        const dateObj = new Date(rawString);
        if (isNaN(dateObj.getTime())) return rawString;
        return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch(e) { return rawString; }
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

// Line 157: Target Link URL Decoration
function attachUtmParameters(urlStr) {
    if (!urlStr || urlStr === "#" || urlStr.startsWith("javascript:")) return urlStr;
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

// Line 206: Global Lightbox Launcher Locking Alt Descriptions
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

    const displayStory = (altText && altText !== title) 
        ? `<div style="font-style:italic; font-size:14px; color:#444; margin-bottom:12px; border-left:3px solid var(--primary); padding-left:10px;">Description: ${altText}</div>${bodyText || ''}`
        : (bodyText || '');

    const storyEl = document.getElementById('lightbox-target-story'); if (storyEl) storyEl.innerHTML = displayStory;

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
    const rawDate = targetItem.date || targetItem.displayDate || targetItem.event_date || targetItem.pubDate;
    const dateText = formatHumanTimestamp(rawDate);
    const timeText = targetItem.time || targetItem.displayTime || "Time TBA";
    const rawLoc = targetItem.location || ACTIVE_TOWN.primaryName + ", IL";
    const rawDetails = targetItem.details || targetItem.description || "No details provided.";
    const finalEventImg = targetItem.imageUrl || targetItem.image || null;
    const metaHeader = `${dateText} @ ${timeText} | Location: ${rawLoc}`;

    fireLightbox(finalEventImg, title, metaHeader, rawDetails, '', title);
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
        console.warn("Firebase initialization warning:", e.message);
    }
}

// === MENU ENGINE (Global Navigation) ===
function bindFirebaseMenuEngine(db) {
    if (!db) return;
    const menuContainer = document.getElementById('dynamic-menu-links');
    if (!menuContainer) return;

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

            const activeTownName = (ACTIVE_TOWN.primaryName || "").toUpperCase();
            const itemNameUpper = name.toUpperCase();
            const isActive = (activeTownName === itemNameUpper || (ACTIVE_TOWN.isHome && itemNameUpper === "HOME") || (window.location.hash || "").toUpperCase().includes(itemNameUpper.replace(/\s+/g, '-'))) ? 'class="active"' : '';

            const imgTag = normImageUrl ? `<img src="${normImageUrl}" alt="" class="menu-thumb-icon" onclick="event.preventDefault(); event.stopPropagation(); fireLightbox('${escapeJsString(normImageUrl)}', '${escapeJsString(name)}', 'MENU ASSET', '${escapeJsString(altText)}', '${escapeJsString(targetUrl)}', '${escapeJsString(altText)}')" onerror="this.style.display='none';" />` : '';

            return `
                <li>
                    <a href="${targetUrl}" ${isActive} data-ga-label="Nav_${name.replace(/\s+/g, '')}">
                        ${imgTag}
                        <span>${name}</span>
                    </a>
                </li>
            `;
        }).join('');
    }, (err) => console.warn("Firebase Menu Listener warning:", err.message));
}

// === FOOTER ENGINE (Global Contact with WhatsApp on Phone 1) ===
function bindFirebaseFooterEngine(db) {
    if (!db) return;
    if (activeFbRefFooter) activeFbRefFooter.off();
    activeFbRefFooter = db.ref(`master_county_data/global/footer`);

    activeFbRefFooter.on('value', (snapshot) => {
        const contact = snapshot.val();
        if (!contact) return;

        const phoneTarget = document.getElementById('footer-phone-target');
        if (phoneTarget) {
            let phoneHtml = '';
            if (contact.phone1) {
                const cleanP1 = contact.phone1.replace(/[^\d]/g, '');
                phoneHtml += `<div><a href="tel:${cleanP1}" style="color:#fff; text-decoration:none;">${contact.phone1}</a> <a href="https://wa.me/1${cleanP1}" target="_blank" rel="noopener" style="color:#25D366; font-size:12px; margin-left:6px; font-weight:bold;">[WhatsApp]</a></div>`;
            }
            if (contact.phone2) {
                const cleanP2 = contact.phone2.replace(/[^\d]/g, '');
                phoneHtml += `<div><a href="tel:${cleanP2}" style="color:#fff; text-decoration:none;">${contact.phone2}</a></div>`;
            }
            if (phoneHtml) phoneTarget.innerHTML = phoneHtml;
        }

        const emailTarget = document.getElementById('footer-email-target');
        if (emailTarget && contact.email) {
            emailTarget.href = `mailto:${contact.email}`;
            emailTarget.innerText = contact.email;
        }

        const addressTarget = document.getElementById('footer-address-target');
        if (addressTarget) {
            const street = contact.street || '';
            const city = contact.city || ACTIVE_TOWN.primaryName;
            const state = contact.state || 'IL';
            const zip = contact.zip || '';
            addressTarget.innerHTML = `<span style="color:#fff;">${street ? street + '<br>' : ''}${city}, ${state} ${zip}</span>`;
        }
    }, (err) => console.warn("Firebase Footer Listener warning:", err.message));
}

// === LOCAL LINKS ENGINE (Town + Global Merged) ===
function bindFirebaseLocalLinksEngine(db) {
    if (!db) return;
    const linkTarget = document.getElementById('local-links-target-container');
    if (!linkTarget) return;

    const townName = ACTIVE_TOWN.dbTownKey || "Xenia";
    let townLinks = [];
    let globalLinks = [];

    const renderCombinedLinks = () => {
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
                const targetUrl = attachUtmParameters(link.website || link.url || "#");
                const displayLoc = link.location || link.town || ACTIVE_TOWN.primaryName;

                return `
                    <div class="local-link-node" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; text-align: left;">
                        <a href="${targetUrl}" target="_blank" rel="noopener" class="local-link-title-anchor" data-ga-label="local_link" style="font-weight: bold; font-size: 15px; color: var(--link-bright-blue); text-decoration: underline;">
                            ${name}
                        </a>
                        <span style="font-size: 11px; color: #666; margin-left: 6px;">(${displayLoc})</span>
                    </div>
                `;
            }).join('');
        }
    };

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
}

// === SEMANTIC SECTIONS ENGINE (Slideshow, Point of Interest, Article, Spotlight, History) ===
function bindFirebaseSemanticSectionsEngine(db) {
    if (!db) return;
    const townName = ACTIVE_TOWN.dbTownKey || "Xenia";

    if (activeFbRefSections) activeFbRefSections.off();
    if (activeFbRefGlobalSections) activeFbRefGlobalSections.off();

    let townSectionsData = {};
    let globalSectionsData = {};

    const renderResolvedSections = () => {
        // --- 1. SLIDESHOW BLENDING (Town Slides + Global Slides Interleaved) ---
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

        const viewport = document.getElementById('xenia-slideshow') || document.querySelector('.slider-viewport');
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
                if (globalSlideshowTicker) clearInterval(globalSlideshowTicker);
                globalSlideshowTicker = setInterval(() => {
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
        if (poiDescEl && poi.landmark_description) poiDescEl.innerHTML = poi.landmark_description;

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
            artBodyEl.innerHTML = `<p style="margin-bottom:1.5em; text-align:justify; line-height:1.8;">${art.body}</p>`;
        }
        const artImgUrl = normalizeImageUrl(art.imageUrl);
        const artAltText = art.alt || art.title || "Featured Article Image";
        if (artImgEl && artImgUrl) {
            safeSetImageSource(artImgEl, artImgUrl, null, '');
            artImgEl.onclick = () => fireLightbox(escapeJsString(artImgUrl), escapeJsString(art.title || 'Feature'), escapeJsString(art.category || 'Article'), escapeJsString(artAltText), '', escapeJsString(artAltText));
            if (artCapEl) artCapEl.innerText = artAltText;
        }

        // --- 4. BUSINESS SPOTLIGHT (Town Spotlight falling back to Global) ---
        const spot = townSectionsData.spotlight || globalSectionsData.spotlight || {};
        const spotNameEl = document.getElementById('spotlight-asset-name');
        const spotDescEl = document.getElementById('spotlight-asset-desc');
        const spotLinkEl = document.getElementById('spotlight-asset-link');
        const spotImgEl = document.getElementById('spotlight-asset-img');

        if (spotNameEl && spot.name) spotNameEl.innerText = spot.name;
        if (spotDescEl && spot.description) spotDescEl.innerText = `"${spot.description}"`;
        if (spotLinkEl && spot.website) spotLinkEl.href = attachUtmParameters(spot.website);

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
                const altText = evt.alt || evt.title || "Historical Image";

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
}

// === PARTNERS ENGINE (Town + Global Blended, Alternating Sets, Card Flashing) ===
function bindFirebasePartnersEngine(db) {
    if (!db) return;
    const townName = ACTIVE_TOWN.dbTownKey || "Xenia";

    if (activeFbRefPartnersTown) activeFbRefPartnersTown.off();
    if (activeFbRefPartnersGlobal) activeFbRefPartnersGlobal.off();

    const topGrid = document.getElementById('partners-grid-bottom'); // Section 8 moved under hero
    const bottomGrid = document.getElementById('partners-grid-top');  // Section 6 strip above landmarks

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

        // Sequence 1: Standard forward order for the Upper Strip
        const upperPool = [...uniquePartners];

        // Sequence 2: Distinctly reversed & phase-shifted order for the Lower Strip
        const lowerPool = [...uniquePartners].reverse();
        if (lowerPool.length > 2) {
            const shiftCount = Math.floor(lowerPool.length / 2);
            for (let i = 0; i < shiftCount; i++) {
                lowerPool.push(lowerPool.shift());
            }
        }

        if (topGrid) renderFlashingPartnerRotator(topGrid, upperPool, 'top_strip', 0);
        if (bottomGrid) renderFlashingPartnerRotator(bottomGrid, lowerPool, 'bottom_strip', 2);
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
}

function renderFlashingPartnerRotator(containerElement, partnerPool, stripKey, seedOffset = 0, maxVisibleCards = 5) {
    if (!containerElement || !partnerPool.length) return;

    if (stripKey === 'top_strip' && topPartnerTimer) {
        clearInterval(topPartnerTimer);
        topPartnerTimer = null;
    }
    if (stripKey === 'bottom_strip' && bottomPartnerTimer) {
        clearInterval(bottomPartnerTimer);
        bottomPartnerTimer = null;
    }

    const poolLength = partnerPool.length;
    const totalSlots = Math.min(maxVisibleCards, poolLength);

    const slotQueues = [];
    for (let slot = 0; slot < totalSlots; slot++) {
        const queue = [];
        for (let step = 0; step < poolLength; step++) {
            const partnerIndex = (slot + seedOffset + (step * totalSlots)) % poolLength;
            const candidate = partnerPool[partnerIndex];
            if (!queue.includes(candidate)) {
                queue.push(candidate);
            }
        }
        slotQueues.push(queue);
    }

    containerElement.innerHTML = slotQueues.map((queue, sIdx) => {
        const initial = queue[0];
        const imgUrl = normalizeImageUrl(initial.imageUrl || initial.image1);
        const name = initial.name || 'Local Partner';
        const link = attachUtmParameters(initial.website || '#');
        const altText = initial.alt || name;

        return `
            <div class="partner-card flashing-slide-card" data-slot="${sIdx}" style="flex: 1 1 180px; max-width: 260px; transition: transform 0.35s ease, box-shadow 0.35s ease, opacity 0.35s ease;">
                <div class="partner-logo-box">
                    <img class="partner-card-img" src="${imgUrl}" alt="" onclick="fireLightbox('${escapeJsString(imgUrl)}', '${escapeJsString(name)}', 'PARTNER DIRECTORY', 'Community Sponsor', '${escapeJsString(link)}', '${escapeJsString(altText)}')" style="cursor:pointer;" onerror="this.closest('.flashing-slide-card').style.display='none';">
                </div>
                <h4><a class="partner-card-link" href="${link}" target="_blank" rel="noopener" data-ga-label="partner_link">${name}</a></h4>
            </div>
        `;
    }).join('');

    let isPaused = false;
    containerElement.addEventListener('mouseenter', () => { isPaused = true; });
    containerElement.addEventListener('mouseleave', () => { isPaused = false; });
    containerElement.addEventListener('touchstart', () => { isPaused = true; }, { passive: true });
    containerElement.addEventListener('touchend', () => { isPaused = false; });

    const cardElements = containerElement.querySelectorAll('.flashing-slide-card');
    const activeTimers = [];

    cardElements.forEach((cardEl) => {
        const sIdx = parseInt(cardEl.getAttribute('data-slot'), 10);
        const queue = slotQueues[sIdx];

        if (queue && queue.length > 1) {
            let currentIndex = 0;
            const slotInterval = 4200 + (sIdx * 850);

            const timer = setInterval(() => {
                if (isPaused) return;

                currentIndex = (currentIndex + 1) % queue.length;
                const nextPartner = queue[currentIndex];
                const nextImg = normalizeImageUrl(nextPartner.imageUrl || nextPartner.image1);
                const nextName = nextPartner.name || 'Local Partner';
                const nextLink = attachUtmParameters(nextPartner.website || '#');
                const nextAlt = nextPartner.alt || nextName;

                // Eye-catching flash animation transition
                cardEl.style.boxShadow = "0 0 18px var(--xenia-gold)";
                cardEl.style.transform = "scale(1.04)";
                cardEl.style.opacity = "0.2";

                setTimeout(() => {
                    const imgEl = cardEl.querySelector('.partner-card-img');
                    const linkEl = cardEl.querySelector('.partner-card-link');

                    if (imgEl && nextImg) {
                        safeSetImageSource(imgEl, nextImg, cardEl, '');
                        imgEl.onclick = () => fireLightbox(escapeJsString(nextImg), escapeJsString(nextName), 'PARTNER DIRECTORY', 'Community Sponsor', escapeJsString(nextLink), escapeJsString(nextAlt));
                    }
                    if (linkEl) {
                        linkEl.href = nextLink;
                        linkEl.innerText = nextName;
                    }

                    // Reset card visual state
                    cardEl.style.opacity = "1";
                    cardEl.style.transform = "scale(1)";
                    setTimeout(() => {
                        cardEl.style.boxShadow = "4px 4px 0px #000000";
                    }, 250);
                }, 320);
            }, slotInterval);

            activeTimers.push(timer);
        }
    });

    if (stripKey === 'top_strip') topPartnerTimer = activeTimers[0];
    if (stripKey === 'bottom_strip') bottomPartnerTimer = activeTimers[0];
}

// === FUEL MONITOR (Realtime Billboard Network Listener) ===
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

    const targetTowns = ACTIVE_TOWN.gasKey || ["xenia"];
    const stationIds = Object.keys(stationConfigs).filter(id => targetTowns.includes(stationConfigs[id].town));
    if (stationIds.length === 0) return;

    db.ref('billboard_network').on('value', (snap) => {
        let val = snap.val();
        if (!val) {
            db.ref('fuel_prices').once('value', (fallbackSnap) => {
                val = fallbackSnap.val();
                if (val) startGasRotator(val, stationConfigs, stationIds, gasContainer);
            });
        } else {
            startGasRotator(val, stationConfigs, stationIds, gasContainer);
        }
    });
}

function startGasRotator(data, stationConfigs, stationIds, container) {
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
    let currentIdx = 0;

    const updatePortalUrl = cleanRawUrl(DEFAULT_APP_CONFIG.regional_endpoints.gas_widget);

    const renderStation = () => {
        const id = stationIds[currentIdx];
        const config = stationConfigs[id];
        const info = data[id] || {};

        const regPrice = info.reg || info.regular || info.price || "$3.29";
        let dslPrice = info.dsl || info.diesel || "$3.89";
        if (dslPrice === "0" || !dslPrice) dslPrice = "---";

        const updateDate = info.date || info.updated || "Live Sync";
        const safeLogo = encodeURIComponent(config.logo);

        container.style.cursor = "pointer";
        container.onclick = () => window.open(attachUtmParameters(updatePortalUrl), '_blank');

        container.innerHTML = `
            <div class="sidebar-widget-title">${config.display.toUpperCase()} FUEL INDEX MONITOR</div>
            <div class="fuel-station-header">
                <div class="station-logo-frame"><img src="//raw.githubusercontent.com/skventuresigns-design/smlc/main/gas-prices/image/${safeLogo}" alt=""></div>
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

    renderStation();
    if (stationIds.length > 1) {
        gasMonitorRotator = setInterval(renderStation, 5000);
    }
}

// === COMMUNITY BULLETIN (Google Apps Script Feed) ===
async function loadCommunityBulletinFeed() {
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller) return;

    try {
        const endpoint = DEFAULT_APP_CONFIG.regional_endpoints.apps_script_bulletin_url;
        const res = await fetch(endpoint + '?feed=true');
        if (res.ok) {
            const elements = await res.json();
            if (Array.isArray(elements) && elements.length > 0) {
                window.calendarCachedEvents = elements;
                applyHighDensityScrollLimits(scroller, elements.length, 500);

                const webcalFeedUrl = "script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec?feed=ics";
                const googleSubUrl = `https://www.google.com/calendar/render?cid=webcal://${encodeURIComponent(webcalFeedUrl)}`;

                const subscriptionHeaderHtml = `
                    <div style="background:#f8f9fa; border:1px solid #e2e8f0; padding:10px; border-radius:6px; margin-bottom:15px; text-align:center;">
                        <span style="font-size:12px; font-weight:bold; color:#333; display:block; margin-bottom:6px;">SUBSCRIBE TO FULL COUNTY CALENDAR</span>
                        <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
                            <a href="${googleSubUrl}" target="_blank" rel="noopener" style="font-size:11px; font-weight:bold; color:#ffffff !important; background:#1a73e8; padding:6px 12px; border-radius:4px; text-decoration:none; display:inline-block;">Google Calendar</a>
                            <a href="webcal://${webcalFeedUrl}" style="font-size:11px; font-weight:bold; color:#ffffff !important; background:#1e7e34; padding:6px 12px; border-radius:4px; text-decoration:none; display:inline-block;">Apple / iCal</a>
                        </div>
                    </div>
                `;

                const eventsHtml = elements.map((item, idx) => {
                    const eventLoc = item.location || ACTIVE_TOWN.primaryName + ", IL";
                    const rawDetails = item.details || item.description || "";
                    const dateText = formatHumanTimestamp(item.date || item.displayDate);
                    const finalEventImg = normalizeImageUrl(item.imageUrl || item.image);

                    const thumbnailHtml = finalEventImg ? `
                        <div style="float: right; margin: 0 0 10px 12px;">
                            <img src="${finalEventImg}" alt="" onclick="openCalendarLightboxModal(${idx})" style="width:85px; height:85px; object-fit:cover; border-radius:6px; border:2px solid #222; cursor:pointer; display:block;" onerror="this.parentElement.style.display='none';" />
                        </div>
                    ` : '';

                    return `
                        <div class="divi-event-item" style="margin-bottom:15px; padding-bottom:10px; border-bottom:1px dashed #ccc; overflow:hidden;">
                            ${thumbnailHtml}
                            <div class="divi-event-date" style="font-size:12px; color:var(--primary); font-weight:bold;">${dateText} &bull; ${item.time || 'TBA'}</div>
                            <div class="divi-event-title" style="font-size:16px; font-weight:bold;">${item.name || item.title}</div>
                            <div class="event-info-text" style="font-size:13px; color:#333;">
                                <strong>Where:</strong> ${eventLoc}
                            </div>
                            <div style="font-size:13px; color:#555; margin-top:4px;">${rawDetails.substring(0, 110)}...</div>
                            <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})" style="color:var(--primary); font-weight:bold; cursor:pointer; font-size:13px; margin-top:8px;">Read Details &rarr;</div>
                        </div>
                    `;
                }).join('');

                scroller.innerHTML = subscriptionHeaderHtml + eventsHtml;
            }
        }
    } catch(err) { console.warn("Bulletin Wire warning:", err.message); }
}

// === LOCAL NEWS DISPATCHES ===
async function loadLocalNewsDispatches() {
    const targetGrid = document.getElementById('news-matrix-target');
    if (!targetGrid) return;

    try {
        const endpoint = DEFAULT_APP_CONFIG.regional_endpoints.smlc_local_news_json;
        const res = await fetch(endpoint);
        if (res.ok) {
            const newsArray = await res.json();
            if (Array.isArray(newsArray)) {
                window.newsCacheBlock = newsArray.filter(item => {
                    const text = ((item.title || '') + ' ' + (item.full_story || '') + ' ' + (item.location || '')).toUpperCase();
                    return ACTIVE_TOWN.keywords.some(kw => text.includes(kw)) || ACTIVE_TOWN.isHome;
                });

                if (window.newsCacheBlock.length > 0) {
                    applyHighDensityScrollLimits(targetGrid, window.newsCacheBlock.length, 520);
                    targetGrid.innerHTML = window.newsCacheBlock.map((story, idx) => {
                        const storyText = story.full_story || story.description || '';
                        const isLong = storyText.length > 150;
                        const displayStory = isLong ? storyText.substring(0, 140) + "..." : storyText;
                        const imgUrl = normalizeImageUrl(story.image);

                        return `
                            <div class="news-matrix-card" style="background:#fff; border:1px solid #ddd; padding:18px; border-radius:6px; margin-bottom:16px;">
                                ${imgUrl ? `<img src="${imgUrl}" alt="" style="width:100\%; height:160px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="openNewsLightboxModal(${idx})" onerror="this.style.display='none';">` : ''}
                                <div style="font-size:12px; color:var(--primary); font-weight:bold; margin-top:10px;">${formatHumanTimestamp(story.date)}</div>
                                <div style="font-weight:bold; font-size:16px; margin:6px 0; color:#1a1a1a;">${story.title}</div>
                                <div style="font-size:14px; color:#444;">${displayStory}</div>
                                ${isLong ? `<div class="read-more-btn" onclick="openNewsLightboxModal(${idx})" style="color: var(--primary); font-weight: bold; cursor: pointer; margin-top: 10px;">Read Full Dispatch &rarr;</div>` : ''}
                            </div>
                        `;
                    }).join('');
                }
            }
        }
    } catch(e) { console.warn("Local news warning:", e.message); }
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
    const currentHash = (window.location.hash || "#/xenia").toLowerCase();
    document.querySelectorAll('#dynamic-menu-links a, .menu-links a').forEach(link => {
        const href = (link.getAttribute("href") || "").toLowerCase();
        if (href === currentHash || (currentHash.includes("xenia") && href.includes("xenia"))) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

function handleSPAHashNavigation() {
    resetAllActiveTimers();
    ACTIVE_TOWN = getActiveTownConfig();
    document.body.setAttribute("data-town", ACTIVE_TOWN.primaryName.toUpperCase());
    document.title = `${ACTIVE_TOWN.primaryName}, IL - SMLC Digital Town Square Portal`;

    hydrateTownHeroUI();
    updateNavigationActiveState();

    bindFirebaseServices();
    loadCommunityBulletinFeed();
    loadLocalNewsDispatches();
}

// === DOM EVENT LISTENERS ===
window.addEventListener('hashchange', () => {
    handleSPAHashNavigation();
});

window.addEventListener('DOMContentLoaded', () => {
    handleSPAHashNavigation();
});
