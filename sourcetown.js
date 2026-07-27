/* ==========================================================================
   Active Version: 2026-07-26_22:00
   File: sourcetown.js
   Description: Louisville IL Community Portal - Fully Synchronized Master Engine
   Features:
   - Dynamic Section 3 Slideshow Auto-Rotator
   - Clickable Gas Monitor redirecting to config.json update_gas_portal_url
   - Partners Strip pipeline (Section 6 & 8) bound to partners_json_manifest
   ========================================================================== */

/* === SECTION 1: Town Alignment Matrix === */
const TOWN_ALIAS_MAP = {
    "LOUISVILLE": {
        primaryName: "Louisville",
        jsonKey: "louisville",
        gasKey: "louisville",
        historyKey: "louisville",
        keywords: ["LOUISVILLE", "NORTH CLAY", "NC", "HOOSIER"],
        zipCodes: ["62858"]
    },
    "FLORA": {
        primaryName: "Flora",
        jsonKey: "flora",
        gasKey: "flora",
        historyKey: "flora",
        keywords: ["FLORA", "FLO", "WOLVES"],
        zipCodes: ["62839"]
    },
    "CLAY CITY": {
        primaryName: "Clay City",
        jsonKey: "clay_city",
        gasKey: "clay-city",
        historyKey: "clay_city",
        keywords: ["CLAY CITY", "CC"],
        zipCodes: ["62824"]
    },
    "XENIA": {
        primaryName: "Xenia",
        jsonKey: "xenia",
        gasKey: "xenia",
        historyKey: "xenia",
        keywords: ["XENIA"],
        zipCodes: ["62899"]
    },
    "IOLA": {
        primaryName: "Iola",
        jsonKey: "iola",
        gasKey: "louisville",
        historyKey: "iola",
        keywords: ["IOLA"],
        zipCodes: ["62849"]
    },
    "SAILOR SPRINGS": {
        primaryName: "Sailor Springs",
        jsonKey: "sailor_springs",
        gasKey: "louisville",
        historyKey: "sailor_springs",
        keywords: ["SAILOR SPRINGS"],
        zipCodes: ["62879"]
    },
    "INGRAHAM": {
        primaryName: "Ingraham",
        jsonKey: "louisville",
        gasKey: "louisville",
        historyKey: "ingraham",
        keywords: ["INGRAHAM"],
        zipCodes: ["62434"]
    }
};

function getActiveTownConfig() {
    const htmlTownAttr = (document.documentElement.getAttribute('data-town') || document.body?.getAttribute('data-town') || "").toUpperCase();
    if (htmlTownAttr && TOWN_ALIAS_MAP[htmlTownAttr]) {
        return TOWN_ALIAS_MAP[htmlTownAttr];
    }
    const pageTitle = document.title.toUpperCase();
    for (const key in TOWN_ALIAS_MAP) {
        if (pageTitle.includes(key)) {
            return TOWN_ALIAS_MAP[key];
        }
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
function getSmartCacheBuster() {
    return "v=" + Math.floor(Date.now() / 3600000);
}

function cleanRawUrl(urlStr) {
    if (!urlStr) return "";
    return urlStr
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/")
        .replace("/edit/", "/");
}

function matchesActiveTown(text, location) {
    const combinedStr = ((text || "") + " " + (location || "")).toUpperCase();
    const matchedKeyword = ACTIVE_TOWN.keywords.some(kw => combinedStr.includes(kw));
    const matchedZip = ACTIVE_TOWN.zipCodes.some(zip => combinedStr.includes(zip));
    return matchedKeyword || matchedZip;
}

function formatHumanTimestamp(rawString) {
    if (!rawString) return "Date TBA";
    try {
        const dateObj = new Date(rawString);
        if (isNaN(dateObj.getTime())) return rawString;
        return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch(e) { return rawString; }
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
    const storyEl = document.getElementById('lightbox-target-story'); if (storyEl) storyEl.innerText = bodyText || '';
    
    if (targetUrl && actionLink && actionRow) {
        actionLink.href = targetUrl;
        actionRow.style.display = 'block';
    } else if (actionRow) {
        actionRow.style.display = 'none';
    }
    if (overlay) overlay.style.display = 'flex';
}

function openCalendarLightboxModal(idx) {
    const targetItem = window.calendarCachedEvents[idx];
    if(!targetItem) return;
    const title = targetItem.name || "Community Event";
    const dateText = formatHumanTimestamp(targetItem.date || targetItem.displayDate);
    const timeText = targetItem.time || targetItem.displayTime || "Time TBA";
    const location = targetItem.location || ACTIVE_TOWN.primaryName + ", IL";
    let details = targetItem.details || "No details provided.";
    details = details.replace(/<\/?[^>]+(>|$)/g, ""); 
    
    fireLightbox('', title, `${dateText} @ ${timeText} | Location: ${location}`, details, '');
}

function openNewsLightboxModal(idx) {
    const story = window.newsCacheBlock[idx];
    if (!story) return;
    fireLightbox(
        story.image || '',
        story.title || 'Local News Dispatch',
        formatHumanTimestamp(story.date) + (story.location ? ` | ${story.location}` : ''),
        story.full_story || story.description || '',
        story.link || story.url || ''
    );
}

/* === SECTION 4: Section 3 Slideshow Auto-Rotator === */
function initializeSection3Slideshow() {
    const viewport = document.getElementById('louisville-slideshow') || document.querySelector('.slider-viewport');
    if (!viewport) return;

    const slides = viewport.querySelectorAll('.slider-slide');
    if (slides.length <= 1) return;

    let currentSlideIdx = 0;
    if (globalSlideshowTicker) clearInterval(globalSlideshowTicker);

    globalSlideshowTicker = setInterval(() => {
        slides[currentSlideIdx].classList.remove('active');
        currentSlideIdx = (currentSlideIdx + 1) % slides.length;
        slides[currentSlideIdx].classList.add('active');
    }, 4000);
}

/* === SECTION 5: ScoreStream Sports Integration === */
async function loadScorestreamSportsWidget(cb) {
    const widgetContainer = document.querySelector('.scorestream-widget-container');
    if (!widgetContainer) return;

    let targetBannerId = "68601";

    try {
        const sportsUrl = 'https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/sports.json?' + cb;
        const res = await fetch(sportsUrl);
        const sportsData = await res.json();

        const activeKey = ACTIVE_TOWN.jsonKey || "louisville";
        if (sportsData && sportsData.widgets && sportsData.widgets[activeKey]) {
            targetBannerId = sportsData.widgets[activeKey].banner_id;
        } else if (sportsData && sportsData.widgets && sportsData.widgets["clay_county_teams"]) {
            targetBannerId = sportsData.widgets["clay_county_teams"].banner_id;
        }
    } catch(e) {
        console.error("Sports JSON configuration error, using town default:", e);
    }

    widgetContainer.setAttribute('data-user-widget-id', targetBannerId);

    const existingScript = document.querySelector('script[src*="scorestream.com"]');
    if (existingScript) existingScript.remove();

    const sportsScript = document.createElement('script');
    sportsScript.type = 'text/javascript';
    sportsScript.src = "https://scorestream.com/apiJsCdn/widgets/embed.js";
    sportsScript.async = true;
    document.body.appendChild(sportsScript);
}

/* === SECTION 6: Firebase Fuel Price Monitor Engine (Clickable Widget) === */
function initializeFirebaseGasMonitor() {
    const gasContainer = document.getElementById('fuel-monitor-target-box') || document.querySelector('.fuel-monitor-billboard-card');
    if (!gasContainer) return;

    const stationConfigs = {
        "48100": { town: "flora", display: "Flora", name: "CASEY'S", logo: "Casey's.png" },     
        "48101": { town: "flora", display: "Flora", name: "HUCK'S", logo: "Hucks.png" },      
        "128128": { town: "flora", display: "Flora", name: "MACH 1", logo: "Mach 1.png" },    
        "120226": { town: "flora", display: "Flora", name: "FAST STOP", logo: "Fast stop.png" },  
        "48026": { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" }, 
        "87817": { town: "xenia", display: "Xenia", name: "KNAPP'S", logo: "Knapps.png" },      
        "171711": { town: "clay-city", display: "Clay City", name: "CASEY'S", logo: "Casey's.png" }  
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

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.database();
    const activeGasTown = ACTIVE_TOWN.gasKey || "louisville";

    db.ref('fuel_prices').on('value', (snap) => {
        const val = snap.val();
        if (val) {
            renderGasBillboardUI(val, stationConfigs, activeGasTown, container);
        } else {
            container.innerHTML = `<div style="text-align:center; padding:20px; font-weight:bold; color:var(--louis-gold);">Gas Monitor Offline</div>`;
        }
    });
}

function renderGasBillboardUI(data, stationConfigs, activeGasTown, container) {
    const stationIds = Object.keys(stationConfigs).filter(id => stationConfigs[id].town === activeGasTown);
    if (stationIds.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; font-weight:bold; color:#222;">No Gas Stations Listed for ${ACTIVE_TOWN.primaryName}.</div>`;
        return;
    }

    const updatePortalUrl = window.globalAppConfig?.regional_endpoints?.update_gas_portal_url || "https://www.supportmylocalcommunity.com/update-gas";

    let currentIdx = 0;
    const renderCurrentStation = () => {
        const id = stationIds[currentIdx];
        const config = stationConfigs[id];
        const info = data[id] || { reg: "---", dsl: "---", date: "PENDING" };
        const safeLogo = encodeURIComponent(config.logo);

        container.style.cursor = "pointer";
        container.title = "Click to update gas prices";
        container.onclick = () => window.open(updatePortalUrl, '_blank');

        container.innerHTML = `
            <div class="sidebar-widget-title">${config.display.toUpperCase()} FUEL INDEX MONITOR</div>
            <div class="fuel-station-header">
                <div class="station-logo-frame">
                    <img src="https://raw.githubusercontent.com/skventuresigns-design/smlc/main/gas-prices/image/${safeLogo}" alt="${config.name}">
                </div>
                <div class="station-meta-title">${config.name}</div>
            </div>
            <div class="fuel-pricing-grid">
                <div class="price-box">
                    <span class="price-type-label">REGULAR</span>
                    <span class="price-value-regular">${info.reg}</span>
                </div>
                <div class="price-box">
                    <span class="price-type-label">DIESEL</span>
                    <span class="price-value-diesel">${(info.dsl === "0" || !info.dsl) ? "---" : info.dsl}</span>
                </div>
            </div>
            <div class="sync-timestamp-label">Updated: ${info.date} &bull; Click to Update</div>
        `;
        currentIdx = (currentIdx + 1) % stationIds.length;
    };

    renderCurrentStation();
    if (gasMonitorRotator) clearInterval(gasMonitorRotator);
    if (stationIds.length > 1) {
        gasMonitorRotator = setInterval(renderCurrentStation, 5000);
    }
}

/* === SECTION 7: Advertising Partners Pipeline (Section 6 & Section 8) === */
async function loadPartnersStrips(cacheBuster) {
    const topGrid = document.getElementById('partners-grid-top');
    const bottomGrid = document.getElementById('partners-grid-bottom');
    if (!topGrid && !bottomGrid) return;

    try {
        const partnersEndpoint = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.partners_json_manifest) || "https://raw.githubusercontent.com/skventuresigns-design/smlc/main/partners/partners.json";
        const res = await fetch(partnersEndpoint + '?' + cacheBuster);
        const data = await res.json();
        
        const partnersList = Array.isArray(data) ? data : (data.partners || data.sponsors || []);

        if (partnersList.length > 0) {
            const partnerCardsHtml = partnersList.map(p => `
                <div class="partner-card">
                    <div class="partner-logo-box">
                        <img src="${p.logo || p.image || p.img}" alt="${p.name || 'SMLC Partner'}" onclick="window.open('${p.url || p.link || '#'}', '_blank')">
                    </div>
                    <h4><a href="${p.url || p.link || '#'}" target="_blank">${p.name || 'Local Partner'}</a></h4>
                </div>
            `).join('');

            if (topGrid) topGrid.innerHTML = partnerCardsHtml;
            if (bottomGrid) bottomGrid.innerHTML = partnerCardsHtml;
        }
    } catch(e) {
        console.error("Partners manifest load error:", e);
    }
}

/* === SECTION 8: Local Directory Links & Footer Pipeline === */
async function loadLocalLinksDirectory(cacheBuster) {
    const linkTarget = document.getElementById('local-links-target-container');
    if(!linkTarget) return;
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/refs/heads/main/json/local_links.json?' + cacheBuster);
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

async function loadFooterDataPipeline(cacheBuster) {
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/footer.json?' + cacheBuster);
        const data = await res.json();
        const contact = data?.footer_data?.contact_info;

        if (contact) {
            const phoneTarget = document.getElementById('footer-phone-target');
            if (phoneTarget && Array.isArray(contact.phone)) {
                phoneTarget.innerHTML = contact.phone.map(p => `
                    <div><a href="${p.url}" style="color:#fff;">${p.label}: ${p.number}</a></div>
                `).join('');
            }

            const emailTarget = document.getElementById('footer-email-target');
            if (emailTarget && contact.email) {
                emailTarget.href = contact.email.url || `mailto:${contact.email.address}`;
                emailTarget.innerText = contact.email.address;
            }

            const addressTarget = document.getElementById('footer-address-target');
            if (addressTarget && contact.address) {
                addressTarget.innerHTML = `<a href="${contact.address.map_url}" target="_blank" style="color:#fff; text-decoration:underline;">${contact.address.text}</a>`;
            }

            const copyTarget = document.getElementById('footer-copy-target');
            if (copyTarget && data.footer_data.copyright) {
                copyTarget.innerHTML = data.footer_data.copyright;
            }
        }
    } catch(e) {
        console.error("Footer JSON error:", e);
    }
}

/* === SECTION 9: Master Data Pipeline Orchestrator === */
async function processDataPipelines() {
    const cb = getSmartCacheBuster();

    // 0. Primary Master Config Pipeline (config.json)
    try {
        const configUrl = 'https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/config.json?' + cb;
        const configRes = await fetch(configUrl);
        window.globalAppConfig = await configRes.json();
    } catch(e) {
        console.error("Master config.json fetch fault, using fallbacks", e);
    }

    const endpoints = window.globalAppConfig?.regional_endpoints || {};

    // 1. Business Spotlight Loader
    try {
        const spotlightEndpoint = cleanRawUrl(endpoints.Business_Spotlight) || "https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/business_spotlight.json";
        const spotlightRes = await fetch(spotlightEndpoint + '?' + cb);
        const spotlightData = await spotlightRes.json();
        
        const spotlightTarget = document.querySelector('.clay-county-news-box.spotlight-clipping');
        if (spotlightData && spotlightTarget) {
            const townKey = ACTIVE_TOWN.jsonKey || "louisville";
            const cities = spotlightData.business_spotlights?.cities_towns_villages || spotlightData.maps || spotlightData;
            const townships = spotlightData.business_spotlights?.civil_townships || {};
            
            const activeSpotlight = cities[townKey] || townships[townKey] || (Array.isArray(spotlightData) ? spotlightData[0] : spotlightData);

            if (activeSpotlight) {
                const img = activeSpotlight.image_url || activeSpotlight.imageurl || activeSpotlight.src || activeSpotlight.image;
                const title = activeSpotlight.title || activeSpotlight.name || "Local Merchant";
                const loc = activeSpotlight.location || ACTIVE_TOWN.primaryName + ", IL";
                const desc = activeSpotlight.description || activeSpotlight.alt || "Supporting local commerce across Clay County.";
                const link = activeSpotlight.website_url || activeSpotlight.websiteurl || activeSpotlight.url || activeSpotlight.link || "#";

                spotlightTarget.innerHTML = `
                    <div class="sidebar-widget-title">BUSINESS SPOTLIGHT</div>
                    <div class="spotlight-image-wrap">
                        <img src="${img}" alt="${title}" class="lightbox-triggerable-element" onclick="fireLightbox('${img}', '${title.replace(/'/g, "\\'")}', '${loc}', '${desc.replace(/'/g, "\\'")}', '${link}')">
                    </div>
                    <span class="biz-title">${title}</span>
                    <span class="biz-location">${loc}</span>
                    <p class="biz-description">"${desc}"</p>
                    <a href="${link}" target="_blank" class="spotlight-btn">Visit Business &rarr;</a>
                `;
            }
        }
    } catch(e) { console.error("Business Spotlight Pipeline Fault", e); }

    // 2. Section 3 Landmark Data Loader & Slideshow Init
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
    } catch(e) { console.error("Section 3 JSON data error", e); }

    initializeSection3Slideshow();

    // 3. Section 5 Timeline Loader
    try {
        const historyTree = window.globalAppConfig?.town_history_tree || {};
        const activeHistoryKey = ACTIVE_TOWN.historyKey || "louisville";
        const historyEndpoint = historyTree[activeHistoryKey] || `https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/${activeHistoryKey.replace(/_/g, '-')}.json`;
        
        const res = await fetch(historyEndpoint + '?' + cb);
        const payload = await res.json();
        const historyRowTarget = document.getElementById('history-row-target');
        if(payload && payload.history && historyRowTarget) {
            historyRowTarget.innerHTML = payload.history.map(evt => `
                <div class="history-card" onclick="fireLightbox('${evt.image_url || ''}', '${(evt.event || '').replace(/'/g, "\\'")}', 'YEAR ${evt.year}', '${(evt.description || '').replace(/'/g, "\\'")}', '${evt.source_url || ''}')">
                    <h2>${evt.year}</h2>
                    <h3>${evt.event}</h3>
                    <p>${evt.description || ''}</p>
                    ${evt.image_url ? `<div class="history-img-box"><img src="${evt.image_url}" alt="${evt.event}"></div>` : ''}
                </div>
            `).join('');
        }
    } catch(e) { console.error("Timeline data error", e); }

    // 4. Calendar Bulletin Engine
    try {
        const bulletinEndpoint = endpoints.apps_script_bulletin_url || "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec";
        const res = await fetch(bulletinEndpoint + '?feed=true&' + cb);
        const elements = await res.json();
        const scroller = document.getElementById('bulletin-scroller-target') || document.getElementById('divi-event-list');
        
        if (Array.isArray(elements) && elements.length > 0) {
            window.calendarCachedEvents = elements.filter(item => matchesActiveTown(item.name + " " + item.details, item.location));
            if (scroller && window.calendarCachedEvents.length > 0) {
                scroller.innerHTML = window.calendarCachedEvents.map((item, idx) => `
                    <div class="divi-event-item">
                        <div class="divi-event-date">${formatHumanTimestamp(item.date)} &bull; ${item.time || 'TBA'}</div>
                        <div class="divi-event-title">${item.name}</div>
                        <div class="event-info-text"><strong>Where:</strong> ${item.location || ACTIVE_TOWN.primaryName}</div>
                        <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})">Read More &rarr;</div>
                    </div>
                `).join('');
            } else if (scroller) {
                scroller.innerHTML = `<div style="text-align:center; padding:1.5rem; font-style:italic;">No events scheduled for ${ACTIVE_TOWN.primaryName}.</div>`;
            }
        }
    } catch(err) { console.error("Calendar Wire fault", err); }

    // 5. Local News Matrix Pipeline
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
            } else {
                targetGrid.innerHTML = `<div style="text-align:center; grid-column:1/-1; font-style:italic; padding:20px;">No news found for ${ACTIVE_TOWN.primaryName}.</div>`;
            }
        }
    } catch(e) { console.error("Local news error", e); }

    // 6. Directory Links, Partners Strips, and Footer Data
    await loadLocalLinksDirectory(cb);
    await loadPartnersStrips(cb);
    await loadFooterDataPipeline(cb);

    // 7. ScoreStream Sports & Firebase Gas Monitor
    await loadScorestreamSportsWidget(cb);
    initializeFirebaseGasMonitor();
}

/* === SECTION 10: App Initialization === */
window.addEventListener('DOMContentLoaded', () => {
    processDataPipelines();
    console.log(`Master Engine initialized for ${ACTIVE_TOWN.primaryName}. Build: 2026-07-26_22:00`);
});
