/* ==========================================================================
   Active Version: 2026-07-26_23:59
   File: sourcetown.js / script.js
   Description: Louisville IL Community Portal - Master Engine
   Features:
   - Dynamic Section 3 Slideshow Engine (network_towns -> categories -> images)
   - ScoreStream Horizontal Sports Scoreboard bound via setAttribute('data-user-widget-id', ...)
   - Firebase Real-Time Fuel Price Monitor with full property fallbacks
   - Section 4 Business Spotlight Loader (cities_towns_villages & townships)
   - Historical Timeline Engine bound to config.json town_history_tree
   - Lightbox with Click-Outside-to-Close and HTML map link rendering
   - Calendar Bulletin Engine with robust date parsing
   - Advertising Partners Strips and Footer Contacts Pipeline
   ========================================================================== */

/* === SECTION 1: Geographically Correct Town Alignment Matrix === */
const TOWN_ALIAS_MAP = {
    "LOUISVILLE": { primaryName: "Louisville", jsonKey: "louisville", gasKey: ["louisville"], historyKey: "louisville", keywords: ["LOUISVILLE", "NORTH CLAY", "NC", "HOOSIER"], zipCodes: ["62858"], scorestreamId: "68601" },
    "FLORA": { primaryName: "Flora", jsonKey: "flora", gasKey: ["flora"], historyKey: "flora", keywords: ["FLORA", "FLO", "WOLVES"], zipCodes: ["62839"], scorestreamId: "68602" },
    "CLAY CITY": { primaryName: "Clay City", jsonKey: "clay_city", gasKey: ["clay-city"], historyKey: "clay_city", keywords: ["CLAY CITY", "CC"], zipCodes: ["62824"], scorestreamId: "64422" },
    "XENIA": { primaryName: "Xenia", jsonKey: "clay_county_teams", gasKey: ["xenia"], historyKey: "xenia", keywords: ["XENIA"], zipCodes: ["62899"], scorestreamId: "68988" },
    "IOLA": { primaryName: "Iola", jsonKey: "iola", gasKey: ["louisville"], historyKey: "iola", keywords: ["IOLA"], zipCodes: ["62849"], scorestreamId: "68601" },
    "SAILOR SPRINGS": { primaryName: "Sailor Springs", jsonKey: "sailor_springs", gasKey: ["louisville", "clay-city"], historyKey: "sailor_springs", keywords: ["SAILOR SPRINGS"], zipCodes: ["62879"], scorestreamId: "68988" },
    "INGRAHAM": { primaryName: "Ingraham", jsonKey: "louisville", gasKey: ["louisville", "clay-city"], historyKey: "ingraham", keywords: ["INGRAHAM"], zipCodes: ["62434"], scorestreamId: "68601" }
};

function getActiveTownConfig() {
    const htmlTownAttr = (document.documentElement.getAttribute('data-town') || document.body?.getAttribute('data-town') || "").toUpperCase();
    if (htmlTownAttr && TOWN_ALIAS_MAP[htmlTownAttr]) return TOWN_ALIAS_MAP[htmlTownAttr];
    const pageTitle = document.title.toUpperCase();
    for (const key in TOWN_ALIAS_MAP) {
        if (pageTitle.includes(key)) return TOWN_ALIAS_MAP[key];
    }
    return TOWN_ALIAS_MAP["LOUISVILLE"];
}

const ACTIVE_TOWN = getActiveTownConfig();

/* === SECTION 2: Global State Tracking === */
let globalSlideshowTicker = null;
let gasMonitorRotator = null;
window.calendarCachedEvents = [];
window.newsCacheBlock = [];
window.globalAppConfig = null;

/* === SECTION 3: Helper & Utility Functions === */
function getSmartCacheBuster() { return "v=" + Math.floor(Date.now() / 3600000); }

function cleanRawUrl(urlStr) {
    if (!urlStr) return "";
    return urlStr.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").replace("/edit/", "/");
}

function matchesActiveTown(text, location) {
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

/* === SECTION 4: Lightbox Modal & Click Outside to Close === */
function closeLightbox(event) {
    const overlay = document.getElementById('portal-global-lightbox');
    if (!overlay) return;
    if (!event || event.target === overlay || event.target.classList.contains('lightbox-close-btn') || event.target.tagName === 'BUTTON') {
        overlay.style.display = 'none';
    }
}

function fireLightbox(imgSrc, title, dateText, bodyText, targetUrl) {
    const overlay = document.getElementById('portal-global-lightbox');
    const targetImg = document.getElementById('lightbox-target-img');
    const actionRow = document.getElementById('lightbox-action-row');
    const actionLink = document.getElementById('lightbox-target-link');
    
    if(imgSrc && targetImg) {
        targetImg.src = imgSrc;
        if (targetImg.parentElement) targetImg.parentElement.style.display = 'block';
    } else if (targetImg && targetImg.parentElement) {
        targetImg.parentElement.style.display = 'none';
    }
    
    const dateEl = document.getElementById('lightbox-target-date'); if (dateEl) dateEl.innerHTML = dateText || '';
    const titleEl = document.getElementById('lightbox-target-title'); if (titleEl) titleEl.innerText = title || '';
    const storyEl = document.getElementById('lightbox-target-story'); if (storyEl) storyEl.innerHTML = parseInteractiveContent(bodyText) || '';
    
    if (targetUrl && actionLink && actionRow) {
        actionLink.href = targetUrl;
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
    
    let details = targetItem.details || targetItem.description || "No details provided.";
    const metaHeader = `${dateText} @ ${timeText} | Location: <a href="${mapUrl}" target="_blank" style="color:#d9534f; text-decoration:underline;">${rawLoc}</a>`;
    fireLightbox('', title, metaHeader, details, '');
}

function openNewsLightboxModal(idx) {
    const story = window.newsCacheBlock[idx];
    if (!story) return;
    fireLightbox(
        story.image || '',
        story.title || 'Local News Dispatch',
        formatHumanTimestamp(story.date || story.pubDate) + (story.location ? ` | ${story.location}` : ''),
        story.full_story || story.description || '',
        story.link || story.url || ''
    );
}

/* === SECTION 5: Dynamic Section 3 Slideshow Engine === */
async function initializeSection3Slideshow(cb) {
    const viewport = document.getElementById('louisville-slideshow') || document.querySelector('.slider-viewport');
    if (!viewport) return;

    try {
        const slideshowEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.slideshow) || "https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/town-images.json";
        const res = await fetch(slideshowEndpoint + '?' + cb);
        const data = await res.json();
        
        let slidesList = [];

        if (data.network_towns) {
            const matchedTownKey = Object.keys(data.network_towns).find(
                key => key.toLowerCase() === ACTIVE_TOWN.primaryName.toLowerCase()
            );

            if (matchedTownKey && data.network_towns[matchedTownKey].categories) {
                data.network_towns[matchedTownKey].categories.forEach(cat => {
                    if (Array.isArray(cat.images)) {
                        slidesList.push(...cat.images);
                    }
                });
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
                        <img src="${imgUrl}" alt="${altText}" onclick="fireLightbox('${imgUrl}', '${safeCaption}', 'SLIDESHOW VIEW', '${altText}', '${item.source_url || ''}')" style="width:100%; height:100%; object-fit:cover; cursor:pointer;">
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

    // 1. Update data-user-widget-id attribute on container in HTML
    container.setAttribute('data-user-widget-id', ACTIVE_TOWN.scorestreamId);

    // 2. Refresh embed.js script so ScoreStream renders the new town ID
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

/* === SECTION 7: Firebase Fuel Price Monitor Engine === */
function initializeFirebaseGasMonitor() {
    const gasContainer = document.getElementById('fuel-monitor-target-box') || document.querySelector('.fuel-monitor-billboard-card');
    if (!gasContainer) return;

    const stationConfigs = {
        "48100": { town: "flora", display: "Flora", name: "CASEY'S", logo: "Casey's.png" },     
        "48101": { town: "flora", display: "Flora", name: "HUCK'S", logo: "Hucks.png" },      
        "128128": { town: "flora", display: "Flora", name: "MACH 1", logo: "Mach 1.png" },    
        "120226": { town: "flora", display: "Flora", name: "FAST STOP", logo: "Fast stop.png" },  
        "48026": { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" }, 
        "87817": { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" },      
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

        fbDbScript.onload = () => bindFirebaseFuelDatabase(stationConfigs, gasContainer);
    } else {
        bindFirebaseFuelDatabase(stationConfigs, gasContainer);
    }
}

function bindFirebaseFuelDatabase(stationConfigs, container) {
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
    
    db.ref('fuel_prices').on('value', (snap) => {
        const val = snap.val();
        if (val) renderGasBillboardUI(val, stationConfigs, ACTIVE_TOWN.gasKey, container);
    });
}

function renderGasBillboardUI(data, stationConfigs, activeGasTowns, container) {
    const gasTownsArray = Array.isArray(activeGasTowns) ? activeGasTowns : [activeGasTowns];
    const stationIds = Object.keys(stationConfigs).filter(id => gasTownsArray.includes(stationConfigs[id].town));
    if (stationIds.length === 0) return;

    const updatePortalUrl = window.globalAppConfig?.regional_endpoints?.update_gas_portal_url || "https://www.supportmylocalcommunity.com/update-gas";
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
        container.onclick = () => window.open(updatePortalUrl, '_blank');

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
    if (gasMonitorRotator) clearInterval(gasMonitorRotator);
    if (stationIds.length > 1) gasMonitorRotator = setInterval(renderCurrentStation, 5000);
}

/* === SECTION 8: Advertising Partners Strip Engine === */
async function loadPartnersStrips(cacheBuster) {
    const topGrid = document.getElementById('partners-grid-top');
    const bottomGrid = document.getElementById('partners-grid-bottom');
    if (!topGrid && !bottomGrid) return;

    try {
        const partnersEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.partners_json_manifest) || "https://raw.githubusercontent.com/Werewolf3788/Testpages/main/partners.json";
        const res = await fetch(partnersEndpoint + '?' + cacheBuster);
        const data = await res.json();
        const partnersList = Array.isArray(data) ? data : (data.partners || []);

        if (partnersList.length > 0) {
            const partnerCardsHtml = partnersList.map(p => `
                <div class="partner-card">
                    <div class="partner-logo-box"><img src="${p.logo || p.image}" alt="${p.name}" onclick="window.open('${p.url || '#'}', '_blank')"></div>
                    <h4><a href="${p.url || '#'}" target="_blank">${p.name || 'Local Partner'}</a></h4>
                </div>
            `).join('');
            if (topGrid) topGrid.innerHTML = partnerCardsHtml;
            if (bottomGrid) bottomGrid.innerHTML = partnerCardsHtml;
        }
    } catch(e) { console.error("Partners manifest error:", e); }
}

/* === SECTION 9: Footer Data Pipeline Engine === */
async function loadFooterDataPipeline(cacheBuster) {
    try {
        const footerEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.footer_json) || 'https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/footer.json';
        const res = await fetch(footerEndpoint + '?' + cacheBuster);
        const data = await res.json();
        const contact = data?.footer_data?.contact_info;

        if (contact) {
            const phoneTarget = document.getElementById('footer-phone-target');
            if (phoneTarget && Array.isArray(contact.phone)) {
                phoneTarget.innerHTML = contact.phone.map(p => {
                    const isWhatsApp = p.number.includes("618-708-4450");
                    return `<div><a href="javascript:void(0)" onclick="handlePhoneClick('${p.number}', ${isWhatsApp})" style="color:#fff; text-decoration:none;"><strong>${p.label}:</strong> ${p.number}</a></div>`;
                }).join('');
            }

            const emailTarget = document.getElementById('footer-email-target');
            if (emailTarget && contact.email) {
                const mailAddr = contact.email.address;
                emailTarget.href = `mailto:${mailAddr}`;
                emailTarget.innerText = mailAddr;
            }

            const addressTarget = document.getElementById('footer-address-target');
            if (addressTarget && contact.address) {
                const mapUrl = buildOSMapUrl(contact.address.text);
                addressTarget.innerHTML = `<a href="${mapUrl}" target="_blank" style="color:#fff; text-decoration:underline;">${contact.address.text}</a>`;
            }

            const copyTarget = document.getElementById('footer-copy-target');
            if (copyTarget && data.footer_data.copyright) copyTarget.innerHTML = data.footer_data.copyright;
        }
    } catch(e) { console.error("Footer JSON error:", e); }
}

/* === SECTION 10: Local Links Directory & Master Pipeline Orchestrator === */
async function loadLocalLinksDirectory(cacheBuster) {
    const linkTarget = document.getElementById('local-links-target-container');
    if(!linkTarget) return;
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/local_links.json?' + cacheBuster);
        const data = await res.json();
        if(Array.isArray(data)) {
            const filteredLinks = data.filter(link => matchesActiveTown(link.name, link.location));
            if(filteredLinks.length > 0) {
                linkTarget.innerHTML = filteredLinks.map(link => `
                    <div class="local-link-node" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ddd;">
                        <span style="font-weight: bold; font-size: 15px; color: #1a1a1a;">${link.name}</span> &mdash; 
                        <a href="${link.url}" target="_blank" class="local-link-anchor-btn" style="font-weight: bold; color: var(--link-bright-blue);">Visit Site &rarr;</a>
                    </div>
                `).join('');
            } else {
                linkTarget.innerHTML = `<div style="font-style:italic; font-size:14px; color:#666;">No institutional links available for ${ACTIVE_TOWN.primaryName}.</div>`;
            }
        }
    } catch(e) {
        console.error("Local links error", e);
        linkTarget.innerHTML = `<div style="font-size:14px; color:#cc0000;">Directory segment offline.</div>`;
    }
}

async function processDataPipelines() {
    const cb = getSmartCacheBuster();

    try {
        const configUrl = 'https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/config.json?' + cb;
        const configRes = await fetch(configUrl);
        window.globalAppConfig = await configRes.json();
    } catch(e) { console.error("Config fetch fault", e); }

    const endpoints = window.globalAppConfig?.regional_endpoints || {};

    // 1. Business Spotlight Loader
    try {
        const spotlightEndpoint = cleanRawUrl(endpoints.Business_Spotlight) || "https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/spotlight.json";
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
                const link = activeSpotlight.website_url || activeSpotlight.url || activeSpotlight.link || "#";

                spotlightTarget.innerHTML = `
                    <div class="sidebar-widget-title">BUSINESS SPOTLIGHT</div>
                    <div class="spotlight-image-wrap"><img src="${img}" alt="${title}" onclick="fireLightbox('${img}', '${title.replace(/'/g, "\\'")}', '${loc}', '${desc.replace(/'/g, "\\'")}', '${link}')"></div>
                    <span class="biz-title">${title}</span>
                    <span class="biz-location">${loc}</span>
                    <p class="biz-description">"${desc}"</p>
                    <a href="${link}" target="_blank" class="spotlight-btn">Visit Business &rarr;</a>
                `;
            }
        }
    } catch(e) { console.error("Spotlight error", e); }

    // 2. Section 3 Landmark Data
    try {
        const section3Endpoint = cleanRawUrl(endpoints.Section_3) || "https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/section3.json";
        const res = await fetch(section3Endpoint + '?' + cb);
        const rows = await res.json();
        if (Array.isArray(rows)) {
            const targetRow = rows.find(r => (r.Town || "").toUpperCase() === ACTIVE_TOWN.primaryName.toUpperCase());
            if (targetRow) {
                const rTitle = document.getElementById('right-card-meta-title'); if (rTitle) rTitle.innerText = targetRow.Title;
                const i1 = document.getElementById('dual-img-1'); if (i1) { i1.src = targetRow.ImageUrl1; i1.onclick = () => fireLightbox(targetRow.ImageUrl1, targetRow.Header1, "ARCHIVE VIEW", targetRow.Description1, ''); }
                const h1 = document.getElementById('dual-header-1'); if (h1) h1.innerText = targetRow.Header1;
                const i2 = document.getElementById('dual-img-2'); if (i2) { i2.src = targetRow.ImageUrl2; i2.onclick = () => fireLightbox(targetRow.ImageUrl2, targetRow.Header2, "ARCHIVE VIEW", targetRow.Description1, ''); }
                const h2 = document.getElementById('dual-header-2'); if (h2) h2.innerText = targetRow.Header2;
                const desc1 = document.getElementById('right-card-meta-desc1'); if (desc1) desc1.innerText = targetRow.Description1;
                const desc2 = document.getElementById('desc2-target-1'); if (desc2) desc2.innerText = targetRow.Description2;
            }
        }
    } catch(e) { console.error("Section 3 error", e); }

    await initializeSection3Slideshow(cb);

    // 3. Historical Timeline Engine
    try {
        const historyTree = window.globalAppConfig?.town_history_tree || {};
        const activeHistoryKey = ACTIVE_TOWN.historyKey || "louisville";
        const historyEndpoint = historyTree[activeHistoryKey] || `https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/${activeHistoryKey.replace(/_/g, '-')}.json`;
        
        const res = await fetch(cleanRawUrl(historyEndpoint) + '?' + cb);
        const payload = await res.json();
        const historyRowTarget = document.getElementById('history-row-target');
        const historyList = Array.isArray(payload) ? payload : (payload.history || payload.timeline || []);

        if(historyList.length > 0 && historyRowTarget) {
            historyRowTarget.innerHTML = historyList.map(evt => `
                <div class="history-card" onclick="fireLightbox('${evt.image_url || evt.image || ''}', '${(evt.event || evt.title || '').replace(/'/g, "\\'")}', 'YEAR ${evt.year}', '${(evt.description || '').replace(/'/g, "\\'")}', '${evt.source_url || evt.link || ''}')">
                    <h2>${evt.year}</h2>
                    <h3>${evt.event || evt.title}</h3>
                    <p>${evt.description || ''}</p>
                    ${(evt.image_url || evt.image) ? `<div class="history-img-box"><img src="${evt.image_url || evt.image}" alt="${evt.event}"></div>` : ''}
                </div>
            `).join('');
        }
    } catch(e) { console.error("Timeline data error", e); }

    // 4. Calendar Bulletin Engine
    try {
        const bulletinEndpoint = endpoints.apps_script_bulletin_url || "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec";
        const res = await fetch(bulletinEndpoint + '?feed=true&' + cb);
        const elements = await res.json();
        const scroller = document.getElementById('bulletin-scroller-target');

        if (Array.isArray(elements) && elements.length > 0) {
            window.calendarCachedEvents = elements.filter(item => matchesActiveTown((item.name || item.title || "") + " " + (item.details || item.description || ""), item.location));
            if (scroller && window.calendarCachedEvents.length > 0) {
                scroller.innerHTML = window.calendarCachedEvents.map((item, idx) => {
                    const mapUrl = buildOSMapUrl(item.location || ACTIVE_TOWN.primaryName);
                    const parsedDetails = parseInteractiveContent((item.details || item.description || "").substring(0, 90));
                    const rawDate = item.date || item.displayDate || item.event_date || item.pubDate;
                    const dateText = formatHumanTimestamp(rawDate);

                    return `
                        <div class="divi-event-item" style="margin-bottom:15px; padding-bottom:10px; border-bottom:1px dashed #ccc;">
                            <div class="divi-event-date" style="font-size:12px; color:#d9534f; font-weight:bold;">${dateText} &bull; ${item.time || item.displayTime || 'TBA'}</div>
                            <div class="divi-event-title" style="font-size:16px; font-weight:bold;">${item.name || item.title}</div>
                            <div class="event-info-text" style="font-size:13px; color:#333;">
                                <strong>Where:</strong> <a href="${mapUrl}" target="_blank" style="color:#0258A3; text-decoration:underline;">${item.location || ACTIVE_TOWN.primaryName}</a>
                            </div>
                            <div style="font-size:13px; color:#555; margin-top:4px;">${parsedDetails}...</div>
                            <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})" style="color:#0258A3; font-weight:bold; cursor:pointer; margin-top:6px;">Read More &rarr;</div>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch(err) { console.error("Calendar Wire fault", err); }

    // 5. Local News Matrix Pipeline
    try {
        const newsEndpoint = cleanRawUrl(endpoints.smlc_local_news_json) || "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json";
        const res = await fetch(newsEndpoint + '?' + cb);
        const newsArray = await res.json();
        const targetGrid = document.getElementById('news-matrix-target');
        
        if (Array.isArray(newsArray) && targetGrid) {
            window.newsCacheBlock = newsArray.filter(item => matchesActiveTown(item.title + " " + item.full_story, item.location));
            if (window.newsCacheBlock.length > 0) {
                targetGrid.innerHTML = window.newsCacheBlock.map((story, idx) => `
                    <div class="news-matrix-card" style="background:#fff; border:1px solid #ddd; padding:18px; border-radius:6px; margin-bottom:16px;">
                        ${story.image ? `<img src="${story.image}" style="width:100%; height:160px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="openNewsLightboxModal(${idx})">` : ''}
                        <div style="font-size:12px; color:#d9534f; font-weight:bold; margin-top:10px;">${formatHumanTimestamp(story.date)}</div>
                        <div style="font-weight:bold; font-size:16px; margin:6px 0; color:#1a1a1a;">${story.title}</div>
                        <div style="font-size:14px; color:#444;">"${(story.full_story || story.description || '').substring(0, 110)}..."</div>
                        <div class="read-more-btn" onclick="openNewsLightboxModal(${idx})" style="color: #0258A3; font-weight: bold; cursor: pointer; margin-top: 10px;">Read Full Dispatch &rarr;</div>
                    </div>
                `).join('');
            }
        }
    } catch(e) { console.error("Local news error", e); }

    // 6. Integrations
    await loadLocalLinksDirectory(cb);
    await loadPartnersStrips(cb);
    await loadFooterDataPipeline(cb);
    loadScorestreamSportsWidget();
    initializeFirebaseGasMonitor();
}

/* === SECTION Initialization === */
window.addEventListener('DOMContentLoaded', () => {
    processDataPipelines();
    console.log(`Master Engine initialized for ${ACTIVE_TOWN.primaryName}. Build: 2026-07-26_23:59`);
});
