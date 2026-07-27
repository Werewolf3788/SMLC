/* ==========================================================================
   Active Version: 2026-07-26_23:00
   File: sourcetown.js
   Description: Louisville IL Community Portal - Fully Fixed Master Engine
   Fixes Included:
   - Click outside Lightbox overlay to close
   - Fixed Date TBA calendar formatting bug (checks date, displayDate, event_date)
   - Section 3 Slideshow Auto-Fader
   - ScoreStream dynamic banner ID preserving ScoreStream API script
   - Fixed Business Spotlight parsing for spotlight.json
   ========================================================================== */

/* === SECTION 1: Geographically Correct Town Alignment Matrix === */
const TOWN_ALIAS_MAP = {
    "LOUISVILLE": { primaryName: "Louisville", jsonKey: "louisville", gasKey: ["louisville"], historyKey: "louisville", keywords: ["LOUISVILLE", "NORTH CLAY", "NC", "HOOSIER"], zipCodes: ["62858"] },
    "FLORA": { primaryName: "Flora", jsonKey: "flora", gasKey: ["flora"], historyKey: "flora", keywords: ["FLORA", "FLO", "WOLVES"], zipCodes: ["62839"] },
    "CLAY CITY": { primaryName: "Clay City", jsonKey: "clay_city", gasKey: ["clay-city"], historyKey: "clay_city", keywords: ["CLAY CITY", "CC"], zipCodes: ["62824"] },
    "XENIA": { primaryName: "Xenia", jsonKey: "xenia", gasKey: ["xenia"], historyKey: "xenia", keywords: ["XENIA"], zipCodes: ["62899"] },
    "IOLA": { primaryName: "Iola", jsonKey: "iola", gasKey: ["louisville"], historyKey: "iola", keywords: ["IOLA"], zipCodes: ["62849"] },
    "SAILOR SPRINGS": { primaryName: "Sailor Springs", jsonKey: "sailor_springs", gasKey: ["louisville", "clay-city"], historyKey: "sailor_springs", keywords: ["SAILOR SPRINGS"], zipCodes: ["62879"] },
    "INGRAHAM": { primaryName: "Ingraham", jsonKey: "louisville", gasKey: ["louisville", "clay-city"], historyKey: "ingraham", keywords: ["INGRAHAM"], zipCodes: ["62434"] }
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

/* === SECTION 2: Global State & OS Handlers === */
let globalSlideshowTicker = null;
let gasMonitorRotator = null;
window.calendarCachedEvents = [];
window.newsCacheBlock = [];
window.globalAppConfig = null;

function isIOSDevice() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function buildOSMapUrl(addressText) {
    if (!addressText) return "#";
    const encoded = encodeURIComponent(addressText);
    if (isIOSDevice()) {
        return `maps://maps.apple.com/?daddr=${encoded}`;
    }
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

/* === SECTION 3: Lightbox & Modal Click-Outside Logic === */
function closeLightbox(event) {
    const overlay = document.getElementById('portal-global-lightbox');
    if (!overlay) return;
    // Close if user clicked directly on background overlay or close button
    if (!event || event.target === overlay || event.target.classList.contains('lightbox-close-btn')) {
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
    
    const dateEl = document.getElementById('lightbox-target-date'); if (dateEl) dateEl.innerText = dateText || '';
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
        // Ensure click outside closes the lightbox
        overlay.onclick = closeLightbox;
    }
}

/* === SECTION 4: Helper & Date Formatter === */
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
        if (isNaN(dateObj.getTime())) return rawString; // Return raw string if it's already pre-formatted text
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

function openCalendarLightboxModal(idx) {
    const targetItem = window.calendarCachedEvents[idx];
    if(!targetItem) return;
    const title = targetItem.name || targetItem.title || "Community Event";
    
    // Robust date resolver fixes "Date TBA" bug
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

/* === SECTION 5: Section 3 Slideshow Auto-Rotator === */
function initializeSection3Slideshow() {
    const viewport = document.getElementById('louisville-slideshow') || document.querySelector('.slider-viewport') || document.getElementById('louisville-town-slideshow-matrix');
    if (!viewport) return;
    
    const slides = viewport.querySelectorAll('.slider-slide, img');
    if (slides.length <= 1) return;

    let currentSlideIdx = 0;
    if (globalSlideshowTicker) clearInterval(globalSlideshowTicker);

    // Apply slideshow CSS styles dynamically
    slides.forEach((slide, idx) => {
        slide.style.transition = "opacity 0.8s ease-in-out";
        slide.style.position = idx === 0 ? "relative" : "absolute";
        slide.style.top = "0";
        slide.style.left = "0";
        slide.style.width = "100%";
        slide.style.opacity = idx === 0 ? "1" : "0";
    });

    globalSlideshowTicker = setInterval(() => {
        slides[currentSlideIdx].style.opacity = "0";
        currentSlideIdx = (currentSlideIdx + 1) % slides.length;
        slides[currentSlideIdx].style.opacity = "1";
    }, 4000);
}

/* === SECTION 6: ScoreStream Integration (Uses sports.json / spotlight.json IDs) === */
async function loadScorestreamSportsWidget(cb) {
    const widgetContainer = document.querySelector('.scorestream-widget-container');
    if (!widgetContainer) return;

    let targetBannerId = "68601"; // Louisville Default

    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/sports.json?' + cb);
        const sportsData = await res.json();
        const activeKey = ACTIVE_TOWN.jsonKey || "louisville";
        
        if (sportsData?.widgets?.[activeKey]?.banner_id) {
            targetBannerId = sportsData.widgets[activeKey].banner_id;
        } else if (sportsData?.widgets?.clay_county_teams?.banner_id) {
            targetBannerId = sportsData.widgets.clay_county_teams.banner_id;
        }
    } catch(e) { 
        console.error("Sports JSON fetch fallback:", e); 
    }

    widgetContainer.setAttribute('data-user-widget-id', targetBannerId);

    // Inject ScoreStream Embed JS if not already running
    if (!window.ScorestreamLoaded) {
        window.ScorestreamLoaded = true;
        const sportsScript = document.createElement('script');
        sportsScript.src = "https://scorestream.com/apiJsCdn/widgets/embed.js";
        sportsScript.async = true;
        document.body.appendChild(sportsScript);
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
        "48026": { town: "clay-city", display: "Clay City", name: "CASEY'S", logo: "Casey's.png" }, 
        "87817": { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" },      
        "171711": { town: "xenia", display: "Xenia", name: "KNAPP'S", logo: "Knapps.png" }  
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
        const info = data[id] || { reg: "---", dsl: "---", date: "PENDING" };
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
                <div class="price-box"><span class="price-type-label">REGULAR</span><span class="price-value-regular">${info.reg}</span></div>
                <div class="price-box"><span class="price-type-label">DIESEL</span><span class="price-value-diesel">${(info.dsl === "0" || !info.dsl) ? "---" : info.dsl}</span></div>
            </div>
            <div class="sync-timestamp-label">Updated: ${info.date} &bull; Click to Update</div>
        `;
        currentIdx = (currentIdx + 1) % stationIds.length;
    };

    renderCurrentStation();
    if (gasMonitorRotator) clearInterval(gasMonitorRotator);
    if (stationIds.length > 1) gasMonitorRotator = setInterval(renderCurrentStation, 5000);
}

/* === SECTION 8: Advertising Partners Pipeline === */
async function loadPartnersStrips(cacheBuster) {
    const topGrid = document.getElementById('partners-grid-top');
    const bottomGrid = document.getElementById('partners-grid-bottom');
    if (!topGrid && !bottomGrid) return;

    try {
        const partnersEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.partners_json_manifest) || "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/partners/partners.json";
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

/* === SECTION 9: Footer Data Pipeline === */
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

/* === SECTION 10: Master Data Pipeline Orchestrator === */
async function processDataPipelines() {
    const cb = getSmartCacheBuster();

    try {
        const configRes = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/config.json?' + cb);
        window.globalAppConfig = await configRes.json();
    } catch(e) { console.error("Config fetch fault", e); }

    const endpoints = window.globalAppConfig?.regional_endpoints || {};

    // 1. Business Spotlight (Reads spotlight.json / business_spotlight.json)
    try {
        const spotlightEndpoint = cleanRawUrl(endpoints.Business_Spotlight) || "https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/spotlight.json";
        const spotlightRes = await fetch(spotlightEndpoint + '?' + cb);
        const spotlightData = await spotlightRes.json();
        const spotlightTarget = document.querySelector('.clay-county-news-box.spotlight-clipping');
        
        if (spotlightData && spotlightTarget) {
            const townKey = ACTIVE_TOWN.jsonKey || "louisville";
            const maps = spotlightData.maps || spotlightData.business_spotlights?.cities_towns_villages || spotlightData;
            const activeSpotlight = maps[townKey] || (Array.isArray(spotlightData) ? spotlightData[0] : spotlightData);

            if (activeSpotlight) {
                const img = activeSpotlight.src || activeSpotlight.image_url || activeSpotlight.imageurl || activeSpotlight.image;
                const title = activeSpotlight.name || activeSpotlight.title || "Local Merchant";
                const loc = activeSpotlight.location || ACTIVE_TOWN.primaryName + ", IL";
                const desc = activeSpotlight.alt || activeSpotlight.description || "Supporting local commerce across Clay County.";
                const link = activeSpotlight.url || activeSpotlight.website_url || activeSpotlight.link || "#";

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
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/section3.json?' + cb);
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

    initializeSection3Slideshow();

    // 3. Calendar Bulletin Engine (With Robust Date Parser)
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

    // 4. Local News Matrix Pipeline
    try {
        const newsEndpoint = endpoints.smlc_local_news_json || "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json";
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

    // 5. Integrations: Partners, Footer, ScoreStream & Gas Monitor
    await loadPartnersStrips(cb);
    await loadFooterDataPipeline(cb);
    await loadScorestreamSportsWidget(cb);
    initializeFirebaseGasMonitor();
}

/* === SECTION 11: App Initialization === */
window.addEventListener('DOMContentLoaded', () => {
    processDataPipelines();
    console.log(`Master Engine initialized for ${ACTIVE_TOWN.primaryName}. Build: 2026-07-26_23:00`);
});
