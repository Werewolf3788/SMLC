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

const DEFAULT_APP_CONFIG = {
    regional_endpoints: {
        Business_Spotlight: "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/spotlight.json",
        Section_3: "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/section3.json",
        slideshow: "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/town-images.json",
        town_artical: "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/artical.json",
        local_links: "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/local_links.json",
        partners_json_manifest: "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/partners.json",
        footer_json: "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/footer.json",
        apps_script_bulletin_url: "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec",
        smlc_local_news_json: "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json",
        gas_widget: "https://werewolf3788.github.io/SMLC/update-gas.html"
    },
    town_history_tree: {
        louisville: "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/louisville.json",
        flora: "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/flora.json",
        clay_city: "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/clay-city.json",
        xenia: "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/xenia.json",
        sailor_springs: "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/sailor-springs.json",
        iola: "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/iola.json",
        ingraham: "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/ingraham.json"
    }
};

let globalSlideshowTicker = null;
let gasMonitorRotator = null;
let section6PartnerTimers = [];
let section8PartnerTimers = [];

let activeFbRef34 = null;
let activeFbRefLinksTown = null;
let activeFbRefLinksGlobal = null;
let activeFbRefMenu = null;

window.calendarCachedEvents = [];
window.historyCachedTimeline = [];
window.newsCacheBlock = [];
window.globalAppConfig = null;

function resetAllActiveTimers() {
    if (globalSlideshowTicker) { clearInterval(globalSlideshowTicker); globalSlideshowTicker = null; }
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
    
    section6PartnerTimers.forEach(t => clearInterval(t));
    section6PartnerTimers = [];
    section8PartnerTimers.forEach(t => clearInterval(t));
    section8PartnerTimers = [];
}

function getSmartCacheBuster() { 
    return "v=" + Math.floor(Date.now() / 3600000); 
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
            return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
        }
    }
    return url;
}

function findEventImage(event) {
    if (!event || typeof event !== 'object') return null;

    const possibleKeys = [
        'imageUrl', 'imageurl', 'image_url', 'image', 'img', 'imgUrl', 
        'photo', 'picture', 'flyer', 'media', 'attachment', 'Image URL'
    ];

    for (const key of possibleKeys) {
        if (event[key]) {
            const norm = normalizeImageUrl(event[key]);
            if (norm) return norm;
        }
    }

    for (const key in event) {
        if (key.toLowerCase().includes('image') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('img')) {
            const norm = normalizeImageUrl(event[key]);
            if (norm) return norm;
        }
    }

    const rawDetails = event.details || event.description || '';
    const { imageUrl: textImgUrl } = extractImageFromText(rawDetails);
    return textImgUrl ? normalizeImageUrl(textImgUrl) : null;
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

function safeFetchJson(url) {
    return fetch(url).then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.text();
    }).then(text => {
        const sanitizedText = text
            .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*/g, '$1')
            .replace(/,(\s*[\}\]])/g, '$1')
            .trim();
        return JSON.parse(sanitizedText);
    }).catch(err => {
        console.warn(`Fetch failure for ${url}:`, err.message);
        return null;
    });
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

function extractImageFromText(rawText) {
    if (!rawText) return { imageUrl: null, cleanText: "" };

    let imageUrl = null;
    let cleanText = rawText;

    const imgTagMatch = cleanText.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgTagMatch && imgTagMatch[1]) {
        imageUrl = imgTagMatch[1];
        cleanText = cleanText.replace(/<img[^>]*>/gi, '');
    } else {
        const directUrlMatch = cleanText.match(/(https?:\/\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s<>"']*)?)/i) ||
                               cleanText.match(/(https?:\/\/drive\.google\.com\/[^\s<>"']+)/i) ||
                               cleanText.match(/(https?:\/\/lh3\.googleusercontent\.com\/[^\s<>"']+)/i);
        if (directUrlMatch && directUrlMatch[1]) {
            imageUrl = directUrlMatch[1];
            cleanText = cleanText.replace(directUrlMatch[1], '');
        }
    }

    return { imageUrl: imageUrl ? imageUrl.trim() : null, cleanText: cleanText.trim() };
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
    const targetItem = window.calendarCachedEvents[idx];
    if (!targetItem) return;

    const title = targetItem.name || targetItem.title || "Community Event";
    const rawDate = targetItem.date || targetItem.displayDate || targetItem.event_date || targetItem.pubDate;
    const dateText = formatHumanTimestamp(rawDate);
    const timeText = targetItem.time || targetItem.displayTime || "Time TBA";
    const rawLoc = targetItem.location || ACTIVE_TOWN.primaryName + ", IL";
    
    const rawDetails = targetItem.details || targetItem.description || "No details provided.";
    const { cleanText } = extractImageFromText(rawDetails);
    const finalEventImg = targetItem.imageUrl || targetItem.image || null;
    const metaHeader = `${dateText} @ ${timeText} | Location: ${rawLoc}`;
    
    const lightboxImageHtml = finalEventImg ? `<div style="margin-bottom:15px; text-align:center;"><img src="${finalEventImg}" alt="${title}" style="max-width:100%; max-height:60vh; border-radius:6px; object-fit:contain; box-shadow:0 2px 8px rgba(0,0,0,0.15);" /></div>` : '';

    fireLightbox(finalEventImg, title, metaHeader, lightboxImageHtml + cleanText, '', title);
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

    if (typeof firebase !== 'undefined' && typeof firebase.database === 'function') {
        bindFirebaseServices(stationConfigs, gasContainer);
    } else {
        setTimeout(() => {
            if (typeof firebase !== 'undefined' && typeof firebase.database === 'function') {
                bindFirebaseServices(stationConfigs, gasContainer);
            }
        }, 800);
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

    try {
        if (typeof firebase === 'undefined' || typeof firebase.database !== 'function') return;
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const db = firebase.database();
        
        if (gasContainer) {
            db.ref('fuel_prices').on('value', (snap) => {
                const val = snap.val();
                if (val) renderGasBillboardUI(val, stationConfigs, ACTIVE_TOWN.gasKey, gasContainer);
            }, (err) => console.warn("Firebase fuel_prices warning:", err.message));
        }

        bindFirebaseLocalLinksEngine(db);
        bindFirebaseSection3And4Engine(db);
        bindFirebaseMenuEngine(db);
    } catch(e) {
        console.warn("Firebase initialization warning:", e.message);
    }
}

function bindFirebaseMenuEngine(db) {
    if (!db) return;
    const menuContainer = document.getElementById('dynamic-menu-links');
    if (!menuContainer) return;

    const menuPath = `master_county_data/global/menu`;

    if (activeFbRefMenu) activeFbRefMenu.off();
    activeFbRefMenu = db.ref(menuPath);

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

            const imgTag = normImageUrl ? `<img src="${normImageUrl}" alt="${name}" class="menu-thumb-icon" onerror="this.style.display='none';" />` : '';

            return `
                <li>
                    <a href="${taggedUrl}" ${isActive} data-ga-label="Nav_${name.replace(/\s+/g, '')}">
                        ${imgTag}
                        <span>${name}</span>
                    </a>
                </li>
            `;
        }).join('');
    }, (err) => console.warn("Firebase Menu Listener warning:", err.message));
}

function bindFirebaseSection3And4Engine(db) {
    if (!db) return;
    const townName = ACTIVE_TOWN.dbTownKey || "Clay City";
    const townPath = `master_county_data/towns/${townName}/sections`;

    if (activeFbRef34) { activeFbRef34.off(); }
    activeFbRef34 = db.ref(townPath);

    activeFbRef34.on('value', (snapshot) => {
        const sections = snapshot.val();
        if (!sections) return;

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
                                <img src="${imgUrl}" alt="${safeAlt}" onclick="fireLightbox('${safeImg}', '${safeCaption}', 'SLIDESHOW VIEW', '${safeAlt}', '${safeSrc}', '${safeAlt}')" style="width:100%; height:100%; object-fit:cover; cursor:pointer;">
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
            }
        }

        /* SECTION 3.1.2 (About Box) */
        if (sections.sec_3_1_2) {
            const s312 = sections.sec_3_1_2;
            const aboutTagEl = document.getElementById('sec3-about-tag');
            const aboutTextEl = document.getElementById('desc2-target-1');
            if (aboutTagEl) aboutTagEl.innerText = extractText(s312.title || s312.tag) || "About Clay City";
            if (aboutTextEl) aboutTextEl.innerText = extractText(s312);
        }

        /* SECTION 3.2 (Landmarks) */
        const s321 = sections.sec_3_2_1 || {};
        const s322 = sections.sec_3_2_2 || {};
        const s323 = sections.sec_3_2_3 || {};
        const s324 = sections.sec_3_2_4 || {};

        const rTitle = document.getElementById('right-card-meta-title');
        if (rTitle) {
            rTitle.innerText = extractText(s321.title || s321.Header || s322.title) || "Historic Clay City Landmark";
        }

        // Landmark Image 1
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

        // Landmark Image 2 ("Klins" / alt2)
        const i2 = document.getElementById('dual-img-2');
        const h2 = document.getElementById('dual-header-2');
        const { url: img2Url, alt: alt2TextRaw } = extractImageAndAlt(s322.image2 || s323.image2 || s323.image1 || s323);
        const h2Text = extractText(s322.header2 || s322.caption2 || s323.header2 || s323.header1 || s323.caption) || "Klins";
        const alt2Text = alt2TextRaw || s322.alt2 || s323.alt2 || h2Text;

        if (i2 && img2Url) {
            safeSetImageSource(i2, img2Url, null, alt2Text);
            i2.onclick = () => fireLightbox(escapeJsString(img2Url), escapeJsString(h2Text), 'LANDMARK ARCHIVE', escapeJsString(alt2Text), escapeJsString(s322.source_url2 || s323.source_url || s333.link || ''), escapeJsString(alt2Text));
        }
        if (h2) h2.innerText = h2Text;

        // Landmark Description
        const descTarget = document.getElementById('right-card-meta-desc1');
        if (descTarget) {
            const parsedDesc = extractText(s324) || extractText(s322.description);
            if (parsedDesc) {
                descTarget.innerHTML = parsedDesc;
                descTarget.style.display = "block";
            }
        }

        /* SECTION 4.1 / 4.1.1 (Featured Article Column 1) */
        let targetS41 = {};
        if (sections.sec_4_1 && typeof sections.sec_4_1 === 'object') {
            targetS41 = { ...sections.sec_4_1 };
            if (sections.sec_4_1.sec_4_1_1 && typeof sections.sec_4_1.sec_4_1_1 === 'object') {
                targetS41 = { ...targetS41, ...sections.sec_4_1.sec_4_1_1 };
            }
        }
        if (sections.sec_4_1_1 && typeof sections.sec_4_1_1 === 'object') {
            targetS41 = { ...targetS41, ...sections.sec_4_1_1 };
        }

        let imgObj = targetS41.image1 || targetS41.image || targetS41.imageUrl || targetS41.image_url;
        if (!imgObj && targetS41.sec_4_1_1) {
            imgObj = targetS41.sec_4_1_1.image1 || targetS41.sec_4_1_1.image;
        }

        const { url: imgUrl, alt: imgAltRaw } = extractImageAndAlt(imgObj);

        const catTagEl = document.getElementById('sec4-category-tag');
        const artTitleEl = document.getElementById('sec4-article-title');
        const artDeckEl = document.getElementById('sec4-article-deck');
        const artBodyEl = document.getElementById('sec4-article-body');

        const categoryText = extractText(targetS41.header1) || extractText(targetS41.category) || extractText(targetS41.tag) || "Community & Commerce";
        const titleText = extractText(targetS41.title) || "Clay City's Historic & Cultural Heritage";
        const deckText = extractText(targetS41.header2) || extractText(targetS41.subtitle) || extractText(targetS41.deck) || "";
        const finalAlt = imgAltRaw || titleText || "Clay City Community Feature";

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
                         style="width:100%; max-width:100%; height:auto; max-height:380px; object-fit:cover; display:block; margin:16px auto; border-radius:6px; border:2px solid #222; box-shadow:4px 4px 0px #000; cursor:pointer;"
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

        /* SECTION 4.2 (Business Spotlight) */
        if (sections.sec_4_2) {
            const s42 = sections.sec_4_2;
            const spotlightTarget = document.querySelector('.clay-county-news-box.spotlight-clipping');
            if (spotlightTarget) {
                const nameText = extractText(s42.name || s42.title) || "Local Merchant";
                const descText = extractText(s42.description) || "Supporting local commerce across Clay County.";
                const { url: imgUrl, alt: altTextRaw } = extractImageAndAlt(s42.image1 || s42);
                const altText = altTextRaw || nameText;
                const websiteUrl = attachUtmParameters(s42.website?.url || s42.website_url || "#");
                const locText = ACTIVE_TOWN.primaryName + ", IL";

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
        }

        /* SECTION 5 (Historical Timeline with 150 Char Limit) */
        if (sections.sec_5) {
            const historyRowTarget = document.getElementById('history-row-target');
            const rawTimeline = Array.isArray(sections.sec_5) ? sections.sec_5 : Object.values(sections.sec_5);
            
            const validTimelineCards = rawTimeline.filter(item => item && (item.year || item.title)).map(item => {
                const yearVal = extractText(item.year) || "----";
                const titleVal = extractText(item.title || item.event) || "Historical Landmark";
                const descVal = extractText(item.description);
                const { url: imgVal, alt: altValRaw } = extractImageAndAlt(item.image1 || item);
                const altVal = altValRaw || titleVal;
                const linkVal = item.source_url || item.link || "";

                return { year: String(yearVal), title: titleVal, description: descVal, image: imgVal, alt: altVal, link: linkVal };
            });

            validTimelineCards.sort((a, b) => {
                const numA = parseInt(a.year.replace(/[^\d]/g, '')) || 0;
                const numB = parseInt(b.year.replace(/[^\d]/g, '')) || 0;
                return numA - numB;
            });

            window.historyCachedTimeline = validTimelineCards;

            if (validTimelineCards.length > 0 && historyRowTarget) {
                applyHighDensityScrollLimits(historyRowTarget, validTimelineCards.length, 520);

                historyRowTarget.innerHTML = validTimelineCards.map((evt, idx) => {
                    const desc = evt.description || "";
                    const isLong = desc.length > 150;
                    const displayDesc = isLong ? desc.substring(0, 140) + "..." : desc;

                    return `
                        <div class="history-card" onclick="openHistoryLightboxModal(${idx})">
                            <h2>${evt.year}</h2>
                            <h3>${evt.title}</h3>
                            <p>${parseInteractiveContent(displayDesc)}</p>
                            ${isLong ? `<span class="read-more-trigger">Read Details &rarr;</span>` : ''}
                            ${evt.image ? `<div class="history-img-box"><img src="${evt.image}" alt="${escapeJsString(evt.alt)}" onerror="this.parentElement.style.display='none';"></div>` : ''}
                        </div>
                    `;
                }).join('');
            }
        }
    }, (err) => console.warn("Firebase Section 3/4 warning:", err.message));
}

function bindFirebaseLocalLinksEngine(db) {
    if (!db) return;
    const linkTarget = document.getElementById('local-links-target-container');
    if (!linkTarget) return;

    const townName = ACTIVE_TOWN.dbTownKey || "Clay City";
    const townPath = `master_county_data/towns/${townName}/sections/sec_7_3_2`;
    const globalPath = `master_county_data/global/sections/sec_7_3_2`;

    let townLinks = [];
    let globalLinks = [];

    const renderCombinedLinks = () => {
        const rawCombined = [...townLinks, ...globalLinks];
        const filteredLinks = rawCombined.filter(item => {
            if (!item) return false;
            const title = extractText(item.title || item.name || item.label);
            const url = item.website || item.url || item.link || item.href || "";
            if (!title || !url) return false;

            const urlLower = url.toLowerCase();
            const titleLower = title.toLowerCase();

            if (urlLower.startsWith('mailto:') || urlLower.includes('@') || titleLower.includes('@')) return false;
            if (urlLower.startsWith('#') || urlLower.includes('.html') || titleLower.includes('menu') || titleLower === 'home') return false;

            return true;
        });

        if (filteredLinks.length > 0) {
            applyHighDensityScrollLimits(linkTarget, filteredLinks.length, 360);
            linkTarget.innerHTML = filteredLinks.map(link => {
                const name = extractText(link.title || link.name || link.label) || "Local Resource";
                const targetRawUrl = link.website || link.url || link.link || link.href || "#";
                const taggedUrl = attachUtmParameters(targetRawUrl);
                const displayLoc = link.location || link.town || ACTIVE_TOWN.primaryName;
                const isImgUrl = /\.(jpg|png|jpeg|gif|webp|svg)(\?.*)?$/i.test(targetRawUrl) || targetRawUrl.includes('lh3.googleusercontent.com');

                if (isImgUrl) {
                    const safeImg = escapeJsString(targetRawUrl);
                    return `
                        <div class="local-link-node" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; text-align: left;">
                            <a href="${taggedUrl}" target="_blank" class="local-link-title-anchor" data-ga-label="local_link" style="font-weight: bold; font-size: 16px; color: var(--link-bright-blue); text-decoration: underline;">
                                ${name}
                            </a>
                            <span style="font-size: 12px; color: #666; margin-left: 6px;">(${displayLoc})</span>
                            <div style="margin-top: 8px;">
                                <img src="${targetRawUrl}" alt="${escapeJsString(name)}" onclick="fireLightbox('${safeImg}', '${escapeJsString(name)}', '${escapeJsString(displayLoc)}', '', '${escapeJsString(taggedUrl)}')" style="max-width:100%; max-height:180px; border-radius:6px; border:2px solid #222; cursor:pointer;" onerror="this.style.display='none';" />
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="local-link-node" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; text-align: left;">
                        <a href="${taggedUrl}" target="_blank" class="local-link-title-anchor" data-ga-label="local_link" style="font-weight: bold; font-size: 16px; color: var(--link-bright-blue); text-decoration: underline;">
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

    activeFbRefLinksTown = db.ref(townPath);
    activeFbRefLinksGlobal = db.ref(globalPath);

    activeFbRefLinksTown.on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
            const linksData = val.links || val;
            townLinks = Array.isArray(linksData) ? linksData : Object.values(linksData);
        } else {
            townLinks = [];
        }
        renderCombinedLinks();
    }, (err) => console.warn("Firebase local links town warning:", err.message));

    activeFbRefLinksGlobal.on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
            const linksData = val.links || val;
            globalLinks = Array.isArray(linksData) ? linksData : Object.values(linksData);
        } else {
            globalLinks = [];
        }
        renderCombinedLinks();
    }, (err) => console.warn("Firebase local links global warning:", err.message));
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

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const partnersList = Array.isArray(data) ? data : (data.partners || []);

        if (partnersList.length > 0) {
            const shuffledPoolSec6 = shuffleArray([...partnersList]);

            // Section 8 offset permutation pattern: [2, 4, 3, 5, 1]
            const patternIndices = [1, 3, 2, 4, 0]; 
            const shuffledPoolSec8 = [];
            
            for (let i = 0; i < Math.max(5, partnersList.length); i++) {
                const targetIdx = patternIndices[i % patternIndices.length];
                shuffledPoolSec8.push(shuffledPoolSec6[targetIdx % shuffledPoolSec6.length]);
            }

            if (topGrid) renderFixedCardSlideshow(topGrid, shuffledPoolSec6, 'section6', 5);
            if (bottomGrid) renderFixedCardSlideshow(bottomGrid, shuffledPoolSec8, 'section8', 5);
        }
    } catch(e) { 
        console.warn("Partners manifest warning handled:", e.message); 
    }
}

function renderFixedCardSlideshow(containerElement, partnerPool, sectionId = 'section6', cardsToShow = 5) {
    if (!containerElement || !partnerPool.length) return;

    if (sectionId === 'section6') {
        section6PartnerTimers.forEach(t => clearInterval(t));
        section6PartnerTimers = [];
    } else if (sectionId === 'section8') {
        section8PartnerTimers.forEach(t => clearInterval(t));
        section8PartnerTimers = [];
    }

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
            const partnerIndex = (slotIndex + (step * totalCards)) % poolSize;
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

    let isSectionPaused = false;
    containerElement.addEventListener('mouseenter', () => { isSectionPaused = true; });
    containerElement.addEventListener('mouseleave', () => { isSectionPaused = false; });
    containerElement.addEventListener('touchstart', () => { isSectionPaused = true; }, { passive: true });
    containerElement.addEventListener('touchend', () => { isSectionPaused = false; });

    const cardNodes = containerElement.querySelectorAll('.fixed-slide-card');

    cardNodes.forEach((cardNode) => {
        const slotIdx = parseInt(cardNode.getAttribute('data-slot-index'), 10);
        const slotRotationItems = cardSlotsData[slotIdx];

        if (slotRotationItems && slotRotationItems.length > 5) {
            let currentItemIdx = 0;

            const timerInstance = setInterval(() => {
                if (isSectionPaused) return;

                currentItemIdx = (currentItemIdx + 1) % slotRotationItems.length;
                const nextItem = slotRotationItems[currentItemIdx];
                const nextUrl = attachUtmParameters(nextItem.websiteUrl || nextItem.url || '#');
                const nextImg = nextItem.image || nextItem.logo || '';
                const nextName = nextItem.name || 'Local Partner';

                const safeImg = escapeJsString(nextImg);
                const safeName = escapeJsString(nextName);
                const safeUrl = escapeJsString(nextUrl);

                cardNode.style.opacity = '0';

                setTimeout(() => {
                    const imgEl = cardNode.querySelector('.partner-card-img');
                    const linkEl = cardNode.querySelector('.partner-card-link');

                    if (imgEl) {
                        safeSetImageSource(imgEl, nextImg, cardNode, nextName);
                        imgEl.onclick = () => fireLightbox(safeImg, safeName, 'PARTNER DIRECTORY', 'Local Sponsor', safeUrl, safeName);
                    }

                    if (linkEl) {
                        linkEl.href = nextUrl;
                        linkEl.innerText = nextName;
                    }

                    cardNode.style.opacity = '1';
                }, 400);
            }, 4000 + (slotIdx * 850));

            if (sectionId === 'section6') section6PartnerTimers.push(timerInstance);
            if (sectionId === 'section8') section8PartnerTimers.push(timerInstance);
        }
    });
}

async function initializeSection3Slideshow(cb) {
    const viewport = document.getElementById('clay-city-slideshow') || document.querySelector('.slider-viewport');
    if (!viewport) return;

    try {
        const slideshowEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.slideshow) || "https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/town-images.json";
        const res = await fetch(slideshowEndpoint + '?' + cb);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
            const townKey = ACTIVE_TOWN.jsonKey || "clay_city";
            slidesList = data[townKey] || data.images || (Array.isArray(data) ? data : []);
        }

        if (slidesList.length > 0) {
            viewport.innerHTML = slidesList.map((item, idx) => {
                const { url: imgUrl, alt: altTextRaw } = extractImageAndAlt(item);
                const captionTitle = extractText(item.name || item.title || item.caption || item.header1 || 'Town View');
                const altText = altTextRaw || captionTitle;

                const safeImg = escapeJsString(imgUrl);
                const safeCaption = escapeJsString(captionTitle);
                const safeAlt = escapeJsString(altText);
                const safeSrc = escapeJsString(item.source_url || '');

                return `
                    <div class="slider-slide ${idx === 0 ? 'active' : ''}" style="position: absolute; inset: 0; opacity: ${idx === 0 ? 1 : 0}; transition: opacity 0.8s ease-in-out; z-index: ${idx === 0 ? 2 : 1};">
                        <img src="${imgUrl}" alt="${safeAlt}" onclick="fireLightbox('${safeImg}', '${safeCaption}', 'SLIDESHOW VIEW', '${safeAlt}', '${safeSrc}', '${safeAlt}')" style="width:100%; height:100%; object-fit:cover; cursor:pointer;">
                        ${captionTitle ? `<div class="slider-caption">${captionTitle}</div>` : ''}
                    </div>
                `;
            }).join('');
        }
    } catch(e) {
        console.warn("Slideshow fallback handled:", e.message);
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

async function loadFooterDataPipeline(cacheBuster) {
    try {
        const footerEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.footer_json) || 'https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/footer.json';
        const res = await fetch(footerEndpoint + '?' + cacheBuster);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const contact = data?.footer_data?.contact_info;

        if (contact) {
            const phoneTarget = document.getElementById('footer-phone-target');
            if (phoneTarget && Array.isArray(contact.phone)) {
                phoneTarget.innerHTML = contact.phone.map(p => {
                    const cleanNum = (p.number || "").replace(/[^\d]/g, '');
                    const displayLabel = p.label ? `<strong>${p.label}:</strong> ` : '';
                    return `<div><a href="tel:${cleanNum}" style="color:#fff; text-decoration:none;">${displayLabel}${p.number}</a></div>`;
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
                const mapQuery = encodeURIComponent(addrText);
                addressTarget.innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${mapQuery}" target="_blank" style="color:#fff; text-decoration:underline;">${addrText}</a>`;
            }

            const copyTarget = document.getElementById('footer-copy-target');
            if (copyTarget && data.footer_data.copyright) {
                copyTarget.innerHTML = data.footer_data.copyright;
            }
        }
    } catch(e) { console.warn("Footer JSON warning handled:", e.message); }
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
            link.style.color = "var(--cc-gold)";
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

    await processDataPipelines();
}

async function processDataPipelines() {
    const cb = getSmartCacheBuster();

    try {
        const configUrl = 'https://raw.githubusercontent.com/Werewolf3788/SMLC/main/json/config.json?' + cb;
        window.globalAppConfig = await safeFetchJson(configUrl);
    } catch(e) { 
        console.warn("Config fetch fault handled - applying defaults:", e.message); 
    }

    if (!window.globalAppConfig || typeof window.globalAppConfig !== 'object') {
        window.globalAppConfig = DEFAULT_APP_CONFIG;
    }

    const endpoints = window.globalAppConfig?.regional_endpoints || DEFAULT_APP_CONFIG.regional_endpoints;

    try {
        const spotlightEndpoint = cleanRawUrl(endpoints.Business_Spotlight) || DEFAULT_APP_CONFIG.regional_endpoints.Business_Spotlight;
        const spotlightData = await safeFetchJson(spotlightEndpoint + '?' + cb);
        const spotlightTarget = document.querySelector('.clay-county-news-box.spotlight-clipping');
        
        if (spotlightData && spotlightTarget) {
            const townKey = ACTIVE_TOWN.jsonKey || "clay_city";
            const spotlights = spotlightData.business_spotlights || {};
            const townsMap = spotlights.cities_towns_villages || {};
            const townshipsMap = spotlights.civil_townships || {};

            const activeSpotlight = townsMap[townKey] 
                || townshipsMap[townKey] 
                || townshipsMap[`${townKey}_township`]
                || spotlightData[townKey]
                || (Array.isArray(spotlightData) ? spotlightData[0] : null);

            if (activeSpotlight) {
                const { url: img, alt: descAlt } = extractImageAndAlt(activeSpotlight);
                const title = extractText(activeSpotlight.title || activeSpotlight.name) || "Local Merchant";
                const loc = activeSpotlight.location || ACTIVE_TOWN.primaryName + ", IL";
                const desc = extractText(activeSpotlight.description) || descAlt || "Supporting local commerce across Clay County.";
                const link = attachUtmParameters(activeSpotlight.website_url || activeSpotlight.url || activeSpotlight.link || "#");

                const safeImg = escapeJsString(img);
                const safeTitle = escapeJsString(title);
                const safeLoc = escapeJsString(loc);
                const safeDesc = escapeJsString(desc);
                const safeLink = escapeJsString(link);

                spotlightTarget.innerHTML = `
                    <div class="sidebar-widget-title">BUSINESS SPOTLIGHT</div>
                    <div class="spotlight-image-wrap"><img src="${img}" alt="${safeTitle}" onclick="fireLightbox('${safeImg}', '${safeTitle}', '${safeLoc}', '${safeDesc}', '${safeLink}', '${safeTitle}')" onerror="this.parentElement.style.display='none';"></div>
                    <span class="biz-title">${title}</span>
                    <span class="biz-location">${loc}</span>
                    <p class="biz-description">"${desc}"</p>
                    <a href="${link}" target="_blank" class="spotlight-btn" data-ga-label="business_spotlight">Visit Business &rarr;</a>
                `;
            }
        }
    } catch(e) { console.warn("Spotlight warning handled:", e.message); }

    await initializeSection3Slideshow(cb);

    const historyRowTarget = document.getElementById('history-row-target');
    try {
        const historyTree = window.globalAppConfig?.town_history_tree || {};
        const activeHistoryKey = ACTIVE_TOWN.historyKey || "clay_city";
        
        let historyEndpoint = historyTree[activeHistoryKey] 
            || `https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/${activeHistoryKey.replace(/_/g, '-')}.json`;
            
        const res = await fetch(cleanRawUrl(historyEndpoint) + '?' + cb);
        if (res.ok) {
            const payload = await res.json();
            let historyList = Array.isArray(payload) ? payload : (payload.history || payload.timeline || []);

            if (historyList.length > 0 && historyRowTarget) {
                historyList.sort((a, b) => {
                    const numA = parseInt(String(a.year).replace(/[^\d]/g, '')) || 0;
                    const numB = parseInt(String(b.year).replace(/[^\d]/g, '')) || 0;
                    return numA - numB;
                });

                window.historyCachedTimeline = historyList.map(item => {
                    const { url: imgVal, alt: altValRaw } = extractImageAndAlt(item);
                    return {
                        year: String(extractText(item.year) || "----"),
                        title: extractText(item.event || item.title) || "Historical Landmark",
                        description: extractText(item.description),
                        image: imgVal,
                        alt: altValRaw || extractText(item.event || item.title) || "Historical Image",
                        link: item.source_url || item.link || ""
                    };
                });

                applyHighDensityScrollLimits(historyRowTarget, window.historyCachedTimeline.length, 520);

                historyRowTarget.innerHTML = window.historyCachedTimeline.map((evt, idx) => {
                    const desc = evt.description || "";
                    const isLong = desc.length > 150;
                    const displayDesc = isLong ? desc.substring(0, 140) + "..." : desc;

                    return `
                        <div class="history-card" onclick="openHistoryLightboxModal(${idx})">
                            <h2>${evt.year}</h2>
                            <h3>${evt.title}</h3>
                            <p>${parseInteractiveContent(displayDesc)}</p>
                            ${isLong ? `<span class="read-more-trigger">Read Details &rarr;</span>` : ''}
                            ${evt.image ? `<div class="history-img-box"><img src="${evt.image}" alt="${escapeJsString(evt.alt)}" onerror="this.parentElement.style.display='none';"></div>` : ''}
                        </div>
                    `;
                }).join('');
            }
        }
    } catch(e) { 
        console.warn("Timeline fetch warning handled:", e.message);
    }

    try {
        const bulletinEndpoint = endpoints.apps_script_bulletin_url || "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec";
        const res = await fetch(bulletinEndpoint + '?feed=true&' + cb);
        if (res.ok) {
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
                        const rawDetails = item.details || item.description || "";
                        const { cleanText } = extractImageFromText(rawDetails);
                        const finalEventImg = item.imageUrl || item.image || null;

                        const parsedDetails = parseInteractiveContent(cleanText.substring(0, 110));
                        const rawDate = item.date || item.displayDate || item.event_date || item.pubDate;
                        const dateText = formatHumanTimestamp(rawDate);

                        const thumbnailHtml = finalEventImg ? `
                            <div style="float: right; margin: 0 0 10px 12px;">
                                <img src="${finalEventImg}" alt="${escapeJsString(item.name || item.title || 'Event Image')}" onclick="openCalendarLightboxModal(${idx})" style="width:85px; height:85px; object-fit:cover; border-radius:6px; border:2px solid #222; cursor:pointer; display:block; transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" onerror="this.parentElement.style.display='none';" />
                            </div>
                        ` : '';

                        return `
                            <div class="divi-event-item" style="margin-bottom:15px; padding-bottom:10px; border-bottom:1px dashed #ccc; overflow:hidden;">
                                ${thumbnailHtml}
                                <div class="divi-event-date" style="font-size:12px; color:var(--primary); font-weight:bold;">${dateText} &bull; ${item.time || item.displayTime || 'TBA'}</div>
                                <div class="divi-event-title" style="font-size:16px; font-weight:bold;">${item.name || item.title}</div>
                                <div class="event-info-text" style="font-size:13px; color:#333;">
                                    <strong>Where:</strong> ${eventLoc}
                                </div>
                                <div style="font-size:13px; color:#555; margin-top:4px;">${parsedDetails}...</div>
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; flex-wrap:wrap; gap:6px; clear:both;">
                                    <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})" style="color:var(--primary); font-weight:bold; cursor:pointer; font-size:13px;">Read Details &rarr;</div>
                                </div>
                            </div>
                        `;
                    }).join('');

                    scroller.innerHTML = subscriptionHeaderHtml + eventsHtml;
                }
            }
        }
    } catch(err) { console.warn("Calendar Wire warning handled:", err.message); }

    try {
        const newsEndpoint = cleanRawUrl(endpoints.smlc_local_news_json) || "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json";
        const res = await fetch(newsEndpoint + '?' + cb);
        if (res.ok) {
            const newsArray = await res.json();
            const targetGrid = document.getElementById('news-matrix-target');
            
            if (Array.isArray(newsArray) && targetGrid) {
                window.newsCacheBlock = newsArray.filter(item => matchesActiveTown(item.title + " " + item.full_story, item.location));
                
                if (window.newsCacheBlock.length > 0) {
                    applyHighDensityScrollLimits(targetGrid, window.newsCacheBlock.length, 520);

                    targetGrid.innerHTML = window.newsCacheBlock.map((story, idx) => {
                        const storyText = story.full_story || story.description || '';
                        const isLong = storyText.length > 150;
                        const displayStory = isLong ? storyText.substring(0, 140) + "..." : storyText;

                        return `
                            <div class="news-matrix-card" style="background:#fff; border:1px solid #ddd; padding:18px; border-radius:6px; margin-bottom:16px;">
                                ${story.image ? `<img src="${story.image}" alt="${escapeJsString(story.title || 'News image')}" style="width:100%; height:160px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="openNewsLightboxModal(${idx})" onerror="this.style.display='none';">` : ''}
                                <div style="font-size:12px; color:var(--primary); font-weight:bold; margin-top:10px;">${formatHumanTimestamp(story.date)}</div>
                                <div style="font-weight:bold; font-size:16px; margin:6px 0; color:#1a1a1a;">${story.title}</div>
                                <div style="font-size:14px; color:#444;">${parseInteractiveContent(displayStory)}</div>
                                ${isLong ? `<div class="read-more-btn" onclick="openNewsLightboxModal(${idx})" style="color: var(--primary); font-weight: bold; cursor: pointer; margin-top: 10px;">Read Full Dispatch &rarr;</div>` : ''}
                            </div>
                        `;
                    }).join('');
                }
            }
        }
    } catch(e) { console.warn("Local news warning handled:", e.message); }

    await loadPartnersStrips(cb);
    await loadFooterDataPipeline(cb);
    initializeFirebaseGasMonitor();
}

window.addEventListener('hashchange', () => {
    handleSPAHashNavigation();
});

window.addEventListener('DOMContentLoaded', () => {
    handleSPAHashNavigation();
    console.log(`Master Engine running smoothly for ${ACTIVE_TOWN.primaryName}. Build: 2026-07-31_13:40`);
});
