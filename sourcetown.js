/* ==========================================================================
   Active Version: 2026-07-29_22:00_SMART_GLOBAL
   File: sourcetown.js / script.js
   Description: SMLC Community Portal Network - Master Dynamic Engine
   Architecture: Pure Real-Time WebSockets & Smart Global Combiner
   Updates:
   - Smart Global Combiner: Automatically merges /global/sections and /towns/{Town}/sections.
   - Business Spotlight Fix: Safely parses single objects vs numerical arrays for sec_4_2.
   - 100% Live Sync: Persistent real-time listeners for instant Firebase updates.
   - Deep Node Extraction: Auto-drills into sec_7_3_2/links/0/website seamlessly.
   - Section 4.1 Image Fix: Extracts and renders image1/image1 nested Firebase node into article.
   ========================================================================== */

/* === SECTION 1: Geographically Correct Town Alignment Matrix === */
const TOWN_ALIAS_MAP = {
    "HOME": { primaryName: "Clay County", jsonKey: "Clay County", gasKey: ["louisville", "flora", "clay-city", "xenia"], historyKey: "all", keywords: [], zipCodes: [], isHome: true },
    "CLAY COUNTY": { primaryName: "Clay County", jsonKey: "Clay County", gasKey: ["louisville", "flora", "clay-city", "xenia"], historyKey: "all", keywords: [], zipCodes: [], isHome: true },
    "LOUISVILLE": { primaryName: "Louisville", jsonKey: "Louisville", gasKey: ["louisville"], historyKey: "louisville", keywords: ["LOUISVILLE", "NORTH CLAY", "NC", "HOOSIER"], zipCodes: ["62858"] },
    "FLORA": { primaryName: "Flora", jsonKey: "Flora", gasKey: ["flora"], historyKey: "flora", keywords: ["FLORA", "FLO", "WOLVES"], zipCodes: ["62839"] },
    "CLAY CITY": { primaryName: "Clay City", jsonKey: "Clay City", gasKey: ["clay-city"], historyKey: "clay_city", keywords: ["CLAY CITY", "CC"], zipCodes: ["62824"] },
    "XENIA": { primaryName: "Xenia", jsonKey: "Xenia", gasKey: ["xenia"], historyKey: "xenia", keywords: ["XENIA"], zipCodes: ["62899"] },
    "IOLA": { primaryName: "Iola", jsonKey: "Iola", gasKey: ["louisville"], historyKey: "iola", keywords: ["IOLA"], zipCodes: ["62849"] },
    "SAILOR SPRINGS": { primaryName: "Sailor Springs", jsonKey: "Sailor Springs", gasKey: ["louisville", "clay-city"], historyKey: "sailor_springs", keywords: ["SAILOR SPRINGS"], zipCodes: ["62879"] },
    "INGRAHAM": { primaryName: "Ingraham", jsonKey: "Ingraham", gasKey: ["louisville", "clay-city"], historyKey: "ingraham", keywords: ["INGRAHAM"] }
};

function getActiveTownConfig() {
    const pageTitle = (document.title || "").toUpperCase();
    for (const key in TOWN_ALIAS_MAP) {
        if (pageTitle.includes(key)) return TOWN_ALIAS_MAP[key];
    }

    const htmlTownAttr = (document.documentElement.getAttribute('data-town') || document.body?.getAttribute('data-town') || "").toUpperCase();
    if (htmlTownAttr && TOWN_ALIAS_MAP[htmlTownAttr]) return TOWN_ALIAS_MAP[htmlTownAttr];

    return TOWN_ALIAS_MAP["HOME"];
}

const ACTIVE_TOWN = getActiveTownConfig();

/* === SECTION 2: Global State Tracking & Firebase References === */
let globalSlideshowTicker = null;
let gasMonitorRotator = null;
window.calendarCachedEvents = [];
window.newsCacheBlock = [];
window.menuCachedItems = [];
window.masterCountyData = null;
window.firebaseApp = null;
window.firebaseDatabase = null;
window.firebaseFirestore = null;

/* === SECTION 3: SmartJS Core Utilities (Upgraded for Global Single Objects) === */
function cleanRawUrl(urlStr) {
    if (!urlStr) return "";
    return urlStr.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").replace("/edit/", "/");
}

/* SMARTJS NORMALIZER: Now handles both lists and single spotlight objects perfectly */
function smartNormalizeList(dataNode) {
    if (!dataNode) return [];
    if (Array.isArray(dataNode)) return dataNode.filter(item => item && typeof item === 'object');
    
    if (typeof dataNode === 'object') {
        // Auto-drill past wrapper keys from Firebase structure
        if (dataNode.items) return smartNormalizeList(dataNode.items);
        if (dataNode.links) return smartNormalizeList(dataNode.links);
        if (dataNode.spotlight) return smartNormalizeList(dataNode.spotlight);
        
        const keys = Object.keys(dataNode);
        
        // If keys are purely numerical ("0", "1", "2"), it's an array built as an object
        const isNumerical = keys.length > 0 && keys.every(k => !isNaN(parseInt(k, 10)));
        
        if (isNumerical) {
            return keys
                .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                .map(k => dataNode[k])
                .filter(item => item && typeof item === 'object');
        } else {
            // It's a single item (like a direct Business Spotlight object) -> Wrap in array
            return [dataNode];
        }
    }
    return [];
}

/* SMARTJS RECURSIVE VALUE EXTRACTOR */
function smartExtractValue(field) {
    if (field === null || field === undefined) return "";
    if (typeof field === 'object') {
        return smartExtractValue(
            field.content || field.grid || field.year || field.title || 
            field.description || field.desc || field.image || field.image1 || field.imageUrl ||
            field.url || field.website || field.full_story || field.details || field.name || field.category || field.tag
        );
    }
    return String(field).trim();
}

/* SMARTJS ALT TEXT PARSER */
function getSafeAltText(primaryAlt, fallbackAlt, titleFallback, defaultText = "Portal Image") {
    const pAlt = smartExtractValue(primaryAlt);
    const fAlt = smartExtractValue(fallbackAlt);
    const tFallback = smartExtractValue(titleFallback);

    if (pAlt) return pAlt;
    if (fAlt) return fAlt;
    if (tFallback) return tFallback;
    return defaultText;
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
        const pageTitle = encodeURIComponent((document.title || "smlc_page").trim());
        const urlObj = new URL(urlStr, window.location.origin);
        urlObj.searchParams.set("utm_source", "smlc_portal");
        urlObj.searchParams.set("utm_medium", "town_article");
        urlObj.searchParams.set("utm_campaign", pageTitle);
        return urlObj.toString();
    } catch(e) {
        const connector = urlStr.includes("?") ? "&" : "?";
        const pageTitle = encodeURIComponent((document.title || "smlc_page").trim());
        return `${urlStr}${connector}utm_source=smlc_portal&utm_medium=town_article&utm_campaign=${pageTitle}`;
    }
}

function buildOSMapUrl(addressText) {
    if (!addressText) return "#";
    const encoded = encodeURIComponent(addressText);
    const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOSDevice) return `maps://maps.apple.com/?daddr=${encoded}`;
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

/* === SECTION 4: Navigation Menu Pipeline === */
function renderNavigationMenuPipeline(globalMenuNode, townMenuNode) {
    const menuTarget = document.getElementById('dynamic-menu-links') || document.getElementById('main-nav-menu-target') || document.querySelector('.menu-links');
    if (!menuTarget) return;

    window.menuCachedItems = [...smartNormalizeList(globalMenuNode), ...smartNormalizeList(townMenuNode)];
    
    const existingLinks = menuTarget.querySelectorAll('a');
    const activePageTitle = (document.title || "").toUpperCase();
    const activeTownAttr = (document.documentElement.getAttribute('data-town') || document.body?.getAttribute('data-town') || "").toUpperCase();

    if (existingLinks.length > 0) {
        existingLinks.forEach(anchor => {
            const linkText = (anchor.innerText || "").toUpperCase();
            if (activePageTitle.includes(linkText) || (activeTownAttr && linkText.includes(activeTownAttr))) {
                anchor.classList.add('active');
                anchor.style.color = "var(--louis-gold)";
            } else {
                anchor.classList.remove('active');
            }
        });
    }

    if (window.menuCachedItems.length === 0) return;

    menuTarget.innerHTML = window.menuCachedItems.map((item, idx) => {
        const name = smartExtractValue(item.name) || "Nav Link";
        const img = smartExtractValue(item.imageUrl || item.image || item.logo);
        const altText = getSafeAltText(item.alt, null, name, `${name} thumbnail`).replace(/'/g, "\\'");
        const isActive = activePageTitle.includes(name.toUpperCase()) || (activeTownAttr && name.toUpperCase().includes(activeTownAttr));

        return `
            <li>
                <a href="javascript:void(0)" onclick="openMenuLightboxModal(${idx})" class="${isActive ? 'active' : ''}" style="color: ${isActive ? 'var(--louis-gold)' : '#ffffff'} !important; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    ${img ? `<img src="${img}" alt="${altText}" style="height: 24px; width: 24px; object-fit: cover; border-radius: 4px; border: 1px solid var(--louis-gold);">` : ''}
                    <span>${name}</span>
                </a>
            </li>
        `;
    }).join('');
}

function openMenuLightboxModal(idx) {
    const menuItem = window.menuCachedItems[idx];
    if (!menuItem) return;

    const title = smartExtractValue(menuItem.name) || "Portal Resource";
    const imgUrl = smartExtractValue(menuItem.imageUrl || menuItem.image || menuItem.logo);
    const targetUrl = smartExtractValue(menuItem.website || menuItem.url) || "#";
    const desc = smartExtractValue(menuItem.description || menuItem.desc) || `Access official digital services and information for ${title}.`;

    fireLightbox(imgUrl, title, 'NAVIGATION DESTINATION', desc, targetUrl);
}

/* === SECTION 5: Universal Lightbox Modal Engine === */
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
    const title = smartExtractValue(targetItem.title || targetItem.name || "Community Event");
    const displayDateStr = smartExtractValue(targetItem.displayDate) || formatHumanTimestamp(targetItem.start || targetItem.date);
    const rawLoc = smartExtractValue(targetItem.addr || targetItem.location) || ACTIVE_TOWN.primaryName + ", IL";
    const mapUrl = buildOSMapUrl(rawLoc);
    
    let details = smartExtractValue(targetItem.desc || targetItem.details || targetItem.description) || "No details provided.";
    const metaHeader = `${displayDateStr} | Location: <a href="${mapUrl}" target="_blank" style="color:#d9534f; text-decoration:underline;">${rawLoc}</a>`;
    fireLightbox('', title, metaHeader, details, smartExtractValue(targetItem.subscribeGoogle || targetItem.subscribeICal));
}

function openNewsLightboxModal(idx) {
    const story = window.newsCacheBlock[idx];
    if (!story) return;
    const storyTitle = smartExtractValue(story.title) || 'Local News Dispatch';
    const altText = getSafeAltText(story.alt || story.alt1, null, storyTitle, "Local News Dispatch");
    
    fireLightbox(
        smartExtractValue(story.image || story.image1 || story.image_url) || '',
        storyTitle,
        formatHumanTimestamp(story.date || story.pubDate) + (story.location ? ` | ${story.location}` : ''),
        smartExtractValue(story.full_story || story.description) || altText,
        smartExtractValue(story.link || story.url) || ''
    );
}

/* === SECTION 6: Dynamic Section 3.1.1 Slideshow Engine === */
function initializeSection3Slideshow(slidesList) {
    const viewport = document.getElementById('louisville-slideshow') || document.getElementById('flora-slideshow') || document.querySelector('.slider-viewport');
    if (!viewport) return;

    if (slidesList.length > 0) {
        viewport.innerHTML = slidesList.map((item, idx) => {
            const imgUrl = smartExtractValue(item.imageUrl || item.image || item.image1 || item.src);
            const captionTitle = smartExtractValue(item.title || item.name || 'Town View');
            const altText = getSafeAltText(item.alt || item.alt1, null, captionTitle, "Slideshow Banner").replace(/'/g, "\\'");
            const safeCaption = captionTitle.replace(/'/g, "\\'");

            return `
                <div class="slider-slide ${idx === 0 ? 'active' : ''}" style="position: absolute; inset: 0; opacity: ${idx === 0 ? 1 : 0}; transition: opacity 0.8s ease-in-out; z-index: ${idx === 0 ? 2 : 1};">
                    <img src="${imgUrl}" alt="${altText}" onclick="fireLightbox('${imgUrl}', '${safeCaption}', 'SLIDESHOW VIEW', '${altText}', '${item.website || ''}')" style="width:100%; height:100%; object-fit:cover; cursor:pointer;">
                    ${captionTitle ? `<div class="slider-caption">${captionTitle}</div>` : ''}
                </div>
            `;
        }).join('');
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

/* === SECTION 7: Live Gas Index Monitor === */
function renderGasBillboardUI(data, stationConfigs, activeGasTowns, container) {
    const gasTownsArray = Array.isArray(activeGasTowns) ? activeGasTowns : [activeGasTowns];
    const stationIds = Object.keys(stationConfigs).filter(id => gasTownsArray.includes(stationConfigs[id].town));
    if (stationIds.length === 0) return;

    if (gasMonitorRotator) {
        clearInterval(gasMonitorRotator);
        gasMonitorRotator = null;
    }

    const updatePortalUrl = cleanRawUrl(window.globalAppConfig?.regional_endpoints?.gas_widget) || "https://werewolf3788.github.io/SMLC/update-gas.html";
    let currentIdx = 0;

    const renderCurrentStation = () => {
        const id = stationIds[currentIdx];
        const config = stationConfigs[id];
        const info = data[id] || {};
        
        const regPrice = info.reg || info.regular || info.price || "---";
        let dslPrice = info.dsl || info.diesel || "---";
        if (dslPrice === "0" || !dslPrice) dslPrice = "---";

        const updateDate = info.date || info.updated || "LIVE";
        const safeLogo = encodeURIComponent(config.logo);

        container.style.cursor = "pointer";
        container.onclick = () => window.open(attachUtmParameters(updatePortalUrl), '_blank');

        container.innerHTML = `
            <div class="sidebar-widget-title">${config.display.toUpperCase()} FUEL INDEX MONITOR</div>
            <div class="fuel-station-header">
                <div class="station-logo-frame"><img src="https://raw.githubusercontent.com/skventuresigns-design/smlc/main/gas-prices/image/${safeLogo}" alt="${config.name} Official Logo"></div>
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

/* === SECTION 8: Section 4.2 Business Spotlight Engine === */
function loadBusinessSpotlight(spotlightList) {
    const nameTarget = document.getElementById('spotlight-asset-name');
    const imgTarget = document.getElementById('spotlight-asset-img');
    const locTarget = document.getElementById('spotlight-asset-loc');
    const descTarget = document.getElementById('spotlight-asset-desc');
    const linkTarget = document.getElementById('spotlight-asset-link');
    
    let activeSpotlight = spotlightList.length > 0 ? spotlightList[0] : null;
    if (!activeSpotlight) return;

    const img = smartExtractValue(activeSpotlight.image1?.image1 || activeSpotlight.image || activeSpotlight.image1 || activeSpotlight.image_url);
    const title = smartExtractValue(activeSpotlight.name?.content || activeSpotlight.name || activeSpotlight.title) || "Local Merchant";
    const altText = getSafeAltText(activeSpotlight.image1?.alt || activeSpotlight.alt, null, title, "Business Spotlight Image");
    const loc = smartExtractValue(activeSpotlight.location) || ACTIVE_TOWN.primaryName + ", IL";
    const desc = smartExtractValue(activeSpotlight.description?.content || activeSpotlight.description) || altText || "Supporting local commerce across Clay County.";
    const rawLink = smartExtractValue(activeSpotlight.website?.url || activeSpotlight.website || activeSpotlight.url) || "#";
    const link = attachUtmParameters(rawLink);

    if (nameTarget) nameTarget.innerText = title;
    if (imgTarget) {
        imgTarget.src = img;
        imgTarget.alt = altText;
        imgTarget.style.cursor = "pointer";
        imgTarget.onclick = () => fireLightbox(img, title, loc, desc, link);
    }
    if (locTarget) locTarget.innerText = loc;
    if (descTarget) descTarget.innerText = `"${desc}"`;
    if (linkTarget) {
        linkTarget.onclick = () => fireLightbox(img, title, loc, desc, link);
        linkTarget.innerText = "Read More \u2192";
    }
}

/* === SECTION 9: Section 5 Historical Timeline Engine === */
function loadTownHistoryTimeline(historyList) {
    const historyRowTarget = document.getElementById('history-row-target');
    if (!historyRowTarget) return;

    if (historyList.length > 0) {
        historyList.sort((a, b) => {
            const yearA = parseInt(smartExtractValue(a.year?.content || a.year || a.Year), 10) || 0;
            const yearB = parseInt(smartExtractValue(b.year?.content || b.year || b.Year), 10) || 0;
            return yearA - yearB;
        });

        historyRowTarget.innerHTML = historyList.map(evt => {
            const yearVal = smartExtractValue(evt.year?.content || evt.year || evt.Year) || "TBA";
            const titleVal = smartExtractValue(evt.title?.content || evt.title || evt.Title || evt.event) || `Historical Milestone (${yearVal})`;
            const descVal = smartExtractValue(evt.description?.content || evt.description || evt.Description);
            const imgVal = smartExtractValue(evt.image1?.image1 || evt.image || evt.image1 || evt.image_url);
            const altText = getSafeAltText(evt.image1?.alt || evt.alt, null, titleVal, `Historical photo from ${yearVal}`).replace(/'/g, "\\'");

            return `
                <div class="history-card" onclick="fireLightbox('${imgVal}', '${titleVal.replace(/'/g, "\\'")}', 'YEAR ${yearVal}', '${(descVal || altText).replace(/'/g, "\\'")}', '${evt.source_url || evt.website || ''}')">
                    <h2>${yearVal}</h2>
                    <h3>${titleVal}</h3>
                    <p>${descVal}</p>
                    ${imgVal ? `<div class="history-img-box"><img src="${imgVal}" alt="${altText}"></div>` : ''}
                </div>
            `;
        }).join('');
    } else {
        historyRowTarget.innerHTML = `<div style="color:#ffffff; font-style:italic; text-align:center; width:100%; padding: 20px;">No historical milestones recorded yet for ${ACTIVE_TOWN.primaryName}.</div>`;
    }
}

/* === SECTION 10: Calendar Bulletin Engine === */
function renderCalendarBulletinUI(eventsArray) {
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller) return;

    scroller.style.maxHeight = "480px";
    scroller.style.overflowY = "auto";
    scroller.style.paddingRight = "5px";

    if (eventsArray.length > 0) {
        window.calendarCachedEvents = eventsArray.filter(item => {
            const nameStr = smartExtractValue(item.title || item.name);
            const descStr = smartExtractValue(item.desc || item.details || item.description);
            const locStr = smartExtractValue(item.addr || item.location);
            return matchesActiveTown(nameStr + " " + descStr, locStr);
        });

        if (window.calendarCachedEvents.length > 0) {
            scroller.innerHTML = window.calendarCachedEvents.map((item, idx) => {
                const eventTitle = smartExtractValue(item.title || item.name) || "Community Event";
                const rawLocation = smartExtractValue(item.addr || item.location) || ACTIVE_TOWN.primaryName + ", IL";
                const mapUrl = buildOSMapUrl(rawLocation);
                const rawDetails = smartExtractValue(item.desc || item.details || item.description);
                const parsedDetails = parseInteractiveContent(rawDetails.substring(0, 95));
                const displayDateStr = smartExtractValue(item.displayDate) || formatHumanTimestamp(item.start || item.date);

                return `
                    <div class="divi-event-item" style="margin-bottom:15px; padding-bottom:10px; border-bottom:1px dashed #ccc;">
                        <div class="divi-event-date" style="font-size:12px; color:#d9534f; font-weight:bold;">${displayDateStr}</div>
                        <div class="divi-event-title" style="font-size:16px; font-weight:bold;">${eventTitle}</div>
                        <div class="event-info-text" style="font-size:13px; color:#333;">
                            <strong>Where:</strong> <a href="${mapUrl}" target="_blank" style="color:#0258A3; text-decoration:underline;">${rawLocation}</a>
                        </div>
                        <div style="font-size:13px; color:#555; margin-top:4px;">${parsedDetails}...</div>
                        <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})" style="color:#0258A3; font-weight:bold; cursor:pointer; margin-top:6px;">Read More &rarr;</div>
                    </div>
                `;
            }).join('');
        } else {
            scroller.innerHTML = `<div style="text-align:center; padding: 20px; font-style:italic;">No upcoming events currently scheduled for ${ACTIVE_TOWN.primaryName}.</div>`;
        }
    }
}

/* === SECTION 11: Local News Pipeline Engine === */
function renderLocalNewsMatrixUI(newsArray) {
    const targetGrid = document.getElementById('news-matrix-target');
    if (!targetGrid) return;

    targetGrid.style.maxHeight = "520px";
    targetGrid.style.overflowY = "auto";
    targetGrid.style.paddingRight = "5px";

    if (newsArray.length > 0) {
        window.newsCacheBlock = newsArray.filter(item => {
            const titleStr = smartExtractValue(item.title);
            const storyStr = smartExtractValue(item.full_story || item.description);
            const locStr = smartExtractValue(item.location);
            return matchesActiveTown(titleStr + " " + storyStr, locStr);
        });

        if (window.newsCacheBlock.length > 0) {
            targetGrid.innerHTML = window.newsCacheBlock.map((story, idx) => {
                const storyTitle = smartExtractValue(story.title) || "Local News Dispatch";
                const storyImg = smartExtractValue(story.image || story.image1 || story.image_url);
                const storyDesc = smartExtractValue(story.full_story || story.description);
                const altText = getSafeAltText(story.alt || story.alt1, null, storyTitle, "Local News Photo");

                return `
                    <div class="news-matrix-card" style="background:#fff; border:1px solid #ddd; padding:18px; border-radius:6px; margin-bottom:16px;">
                        ${storyImg ? `<img src="${storyImg}" alt="${altText}" style="width:100%; height:160px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="openNewsLightboxModal(${idx})">` : ''}
                        <div style="font-size:12px; color:#d9534f; font-weight:bold; margin-top:10px;">${formatHumanTimestamp(story.date || story.pubDate)}</div>
                        <div style="font-weight:bold; font-size:16px; margin:6px 0; color:#1a1a1a;">${storyTitle}</div>
                        <div style="font-size:14px; color:#444;">"${storyDesc.substring(0, 110)}..."</div>
                        <div class="read-more-btn" onclick="openNewsLightboxModal(${idx})" style="color: #0258A3; font-weight: bold; cursor: pointer; margin-top: 10px;">Read More &rarr;</div>
                    </div>
                `;
            }).join('');
        } else {
            targetGrid.innerHTML = `<div style="text-align:center; padding: 20px; font-style:italic;">No recent dispatches found for ${ACTIVE_TOWN.primaryName}.</div>`;
        }
    }
}

/* === SECTION 12: Local Links Directory Engine === */
function loadLocalLinksDirectory(rawList) {
    const linkTarget = document.getElementById('local-links-target-container');
    if (!linkTarget) return;

    linkTarget.style.maxHeight = "250px";
    linkTarget.style.overflowY = "auto";
    linkTarget.style.paddingRight = "5px";

    if (rawList.length > 0) {
        rawList.sort((a, b) => {
            const nameA = smartExtractValue(a.title || a.name).toLowerCase();
            const nameB = smartExtractValue(b.title || b.name).toLowerCase();
            return nameA.localeCompare(nameB);
        });

        linkTarget.innerHTML = rawList.map(link => {
            const name = smartExtractValue(link.title || link.name) || "Local Resource";
            const targetRawUrl = smartExtractValue(link.website?.url || link.website || link.url) || "#";
            const taggedUrl = attachUtmParameters(targetRawUrl);

            return `
                <div class="local-link-node" style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; text-align: left;">
                    <span style="font-weight: bold; font-size: 15px; color: #1a1a1a;">${name}</span> &mdash; 
                    <a href="${taggedUrl}" target="_blank" class="local-link-anchor-btn" data-ga-label="local_link" style="font-weight: bold; color: var(--link-bright-blue); text-decoration: underline;">Visit Site &rarr;</a>
                </div>
            `;
        }).join('');
    } else {
        linkTarget.innerHTML = `<div style="font-style:italic; font-size:14px; color:#666; padding:10px 0;">No institutional links listed for ${ACTIVE_TOWN.primaryName}.</div>`;
    }
}

/* === SECTION 13: Advertising Partners Strip Engine === */
function loadPartnersStrips(partnersList) {
    const topGrid = document.getElementById('partners-grid-top') 
        || document.querySelector('.scotts-partners-top') 
        || document.querySelectorAll('.partner-card-container')[0];
        
    const bottomGrid = document.getElementById('partners-grid-bottom') 
        || document.querySelector('.scotts-partners-bottom') 
        || document.querySelectorAll('.partner-card-container')[1];

    if (partnersList.length > 0) {
        const partnerCardsHtml = partnersList.map(p => {
            const targetRawUrl = smartExtractValue(p.website || p.url) || '#';
            const taggedUrl = attachUtmParameters(targetRawUrl);
            const imgSrc = smartExtractValue(p.image1 || p.image || p.logo);
            const partnerName = smartExtractValue(p.name) || 'Local Partner';
            const altText = getSafeAltText(p.alt || p.alt1, null, partnerName, `${partnerName} official logo`);

            return `
                <div class="partner-card">
                    <div class="partner-logo-box">
                        <img src="${imgSrc}" alt="${altText}" onclick="fireLightbox('${imgSrc}', '${partnerName.replace(/'/g, "\\'")}', 'OFFICIAL PARTNER', 'Official advertising partner of the SMLC Community Portal Network.', '${taggedUrl}')" style="cursor:pointer;">
                    </div>
                    <h4><a href="${taggedUrl}" target="_blank" data-ga-label="partner_link">${partnerName}</a></h4>
                </div>
            `;
        }).join('');

        if (topGrid) topGrid.innerHTML = partnerCardsHtml;
        if (bottomGrid) bottomGrid.innerHTML = partnerCardsHtml;
    }
}

/* === SECTION 14: Footer Data Pipeline Engine === */
function loadFooterDataPipeline(globalFooter, townFooter) {
    const footer = townFooter || globalFooter;

    if (footer) {
        const phoneTarget = document.getElementById('footer-phone-target');
        if (phoneTarget && (footer.phone1 || footer.phone2)) {
            let phones = [footer.phone1, footer.phone2].filter(Boolean);
            phoneTarget.innerHTML = phones.map(p => {
                const cleanNum = String(p).replace(/[^\d]/g, '');
                const isWhatsApp = cleanNum.includes("6187084450");
                return `<div><a href="javascript:void(0)" onclick="handlePhoneClick('${cleanNum}', ${isWhatsApp})" style="color:#fff; text-decoration:none;">${p}</a></div>`;
            }).join('');
        }

        const emailTarget = document.getElementById('footer-email-target');
        if (emailTarget && footer.email) {
            emailTarget.href = `mailto:${footer.email}`;
            emailTarget.innerText = footer.email;
        }

        const addressTarget = document.getElementById('footer-address-target');
        if (addressTarget && (footer.street || footer.city)) {
            const fullAddr = `${footer.street || ''} ${footer.city || ''}, ${footer.state || 'IL'} ${footer.zip || ''}`.trim();
            const mapUrl = buildOSMapUrl(fullAddr);
            addressTarget.innerHTML = `<a href="${mapUrl}" target="_blank" style="color:#fff; text-decoration:underline;">${fullAddr}</a>`;
        }
    }
}

/* === SECTION 15: Section 4.1 Town Article Engine (Includes image1 Extraction) === */
function loadTownArticleData(articleObj) {
    const articleTarget = document.getElementById('town-article-target') || document.querySelector('.section4-left-article-box') || document.querySelector('.town-article-container');
    if (!articleTarget) return;

    if (articleObj) {
        const tag = smartExtractValue(articleObj.category || articleObj.tag) || "RENEWABLE ENERGY FEATURE";
        const title = smartExtractValue(articleObj.title?.title || articleObj.title) || "Town Article";
        const h1 = smartExtractValue(articleObj.header1?.header1 || articleObj.header1);
        const p1 = smartExtractValue(articleObj.paragraph1?.paragraph1 || articleObj.paragraph1);
        const p2 = smartExtractValue(articleObj.paragraph2?.paragraph2 || articleObj.paragraph2);
        
        // Dynamic image1 extraction from Firebase node
        const imgUrl = smartExtractValue(articleObj.image1?.image1 || articleObj.image1 || articleObj.image || articleObj.imageUrl);
        const altText = getSafeAltText(articleObj.image1?.alt || articleObj.alt, null, title, "Article Image");

        let bodyContent = "";
        if (p1) bodyContent += `<p style="margin-bottom: 1.5em; line-height: 1.7; text-align: justify;">${parseInteractiveContent(p1)}</p>`;
        if (p2) bodyContent += `<p style="margin-bottom: 1.5em; line-height: 1.7; text-align: justify;">${parseInteractiveContent(p2)}</p>`;

        articleTarget.innerHTML = `
            <div class="town-article-wrapper" data-ga-label="town_article_block">
                <div class="category-tag">${tag}</div>
                <h2 class="article-stacked-title">${title}</h2>
                ${h1 ? `<h3 class="subtitle">${h1}</h3>` : ''}
                
                ${imgUrl ? `
                    <div class="article-featured-image-wrap">
                        <img src="${imgUrl}" alt="${altText}" onclick="fireLightbox('${imgUrl}', '${title.replace(/'/g, "\\'")}', 'ARTICLE FEATURE', '${altText.replace(/'/g, "\\'")}', '')">
                    </div>
                ` : ''}

                <div class="town-article-body">
                    ${bodyContent}
                </div>
            </div>
        `;
    }
}

/* === MASTER REAL-TIME WEBSOCKET DATA PIPELINE INITIALIZER === */
async function initializePureLiveFirebasePipelines() {
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js");
        const { getAnalytics, logEvent } = await import("https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js");
        const { getDatabase, ref, onValue } = await import("https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js");
        const { getFirestore, collection, onSnapshot, query, orderBy } = await import("https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js");

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

        if (!window.firebaseApp) {
            window.firebaseApp = initializeApp(firebaseConfig);
        }
        window.firebaseDatabase = getDatabase(window.firebaseApp);
        window.firebaseFirestore = getFirestore(window.firebaseApp);
        window.firebaseAnalytics = getAnalytics(window.firebaseApp);

        logEvent(window.firebaseAnalytics, 'news_portal_view', {
            town: ACTIVE_TOWN.primaryName,
            page_title: document.title
        });

        /* ==========================================================================
           1. REALTIME DATABASE LIVE LISTENER (WITH SMART GLOBAL MERGE)
           ========================================================================== */
        const masterRef = ref(window.firebaseDatabase, 'master_county_data');
        onValue(masterRef, (snapshot) => {
            window.masterCountyData = snapshot.val();
            if (!window.masterCountyData) return;

            const globalData = window.masterCountyData.global || {};
            const globalSections = globalData.sections || {};
            
            const townsObj = window.masterCountyData.towns || {};
            const activeTownKey = ACTIVE_TOWN.primaryName; 
            const matchedTownKey = Object.keys(townsObj).find(k => k.toLowerCase() === activeTownKey.toLowerCase()) || activeTownKey;
            const activeTownObj = townsObj[matchedTownKey] || {};
            const townSections = activeTownObj.sections || {};

            /* THE SMART GLOBAL LIST COMBINER (For Slideshow, History, Links) */
            function mergeListSection(key) {
                const townList = smartNormalizeList(townSections[key]);
                const globalList = smartNormalizeList(globalSections[key]);
                // Returns combined array: Town items first, Global items appended
                return [...townList, ...globalList]; 
            }

            /* THE SMART GLOBAL SINGLE-OBJECT FALLBACK (For Article, Spotlight) */
            function fallbackSingleSection(key) {
                const t = townSections[key];
                const g = globalSections[key];
                // If Town has data, use it. Otherwise, strictly fallback to Global node.
                if (t && Object.keys(t).length > 0) return t;
                return g || null;
            }

            // Live Render RTDB Sections Using Smart Global Logic
            renderNavigationMenuPipeline(globalData.menu, activeTownObj.menu);
            initializeSection3Slideshow(mergeListSection("sec_3_1_1"));
            loadTownArticleData(fallbackSingleSection("sec_4_1"));
            loadBusinessSpotlight(mergeListSection("sec_4_2")); // spotlight treated as list to support multiple, Town overrides Global
            loadTownHistoryTimeline(mergeListSection("sec_5"));
            loadLocalLinksDirectory(mergeListSection("sec_7_3_2"));
            loadPartnersStrips([...smartNormalizeList(globalSections.partners), ...smartNormalizeList(townSections.partners)]);
            loadFooterDataPipeline(globalData.footer, activeTownObj.footer);
        });

        /* ==========================================================================
           2. REALTIME DATABASE LIVE LISTENER: /fuel_prices
           ========================================================================== */
        const stationConfigs = {
            "48100": { town: "flora", display: "Flora", name: "CASEY'S", logo: "Casey's.png" },     
            "48101": { town: "flora", display: "Flora", name: "HUCK'S", logo: "Hucks.png" },      
            "128128": { town: "flora", display: "Flora", name: "MACH 1", logo: "Mach 1.png" },    
            "120226": { town: "flora", display: "Flora", name: "FAST STOP", logo: "Fast stop.png" },  
            "48026": { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" }, 
            "171711": { town: "clay-city", display: "Clay City", name: "CASEY'S", logo: "Casey's.png" },
            "181818": { town: "xenia", display: "Xenia", name: "KNAPP'S", logo: "Knapps.png" }  
        };

        const fuelRef = ref(window.firebaseDatabase, 'fuel_prices');
        const gasContainer = document.getElementById('fuel-monitor-target-box') || document.querySelector('.fuel-monitor-billboard-card');
        
        onValue(fuelRef, (snapshot) => {
            const val = snapshot.val();
            if (val && gasContainer) {
                renderGasBillboardUI(val, stationConfigs, ACTIVE_TOWN.gasKey, gasContainer);
            }
        });

        /* ==========================================================================
           3. CLOUD FIRESTORE LIVE LISTENER: /smlc_events
           ========================================================================== */
        const eventsRef = collection(window.firebaseFirestore, 'smlc_events');
        const eventsQuery = query(eventsRef, orderBy('start', 'asc'));
        
        onSnapshot(eventsQuery, (snapshot) => {
            const eventsArray = [];
            snapshot.forEach((docSnap) => {
                eventsArray.push({ id: docSnap.id, ...docSnap.data() });
            });
            renderCalendarBulletinUI(eventsArray);
        });

        /* ==========================================================================
           4. CLOUD FIRESTORE LIVE LISTENER: /local_news
           ========================================================================== */
        const newsRef = collection(window.firebaseFirestore, 'local_news');
        const newsQuery = query(newsRef, orderBy('date', 'desc'));
        
        onSnapshot(newsQuery, (snapshot) => {
            const newsArray = [];
            snapshot.forEach((docSnap) => {
                newsArray.push({ id: docSnap.id, ...docSnap.data() });
            });
            renderLocalNewsMatrixUI(newsArray);
        });

    } catch (err) {
        console.error("Pure Live Firebase Initialization Error:", err);
    }
}

/* === INITIALIZATION === */
window.addEventListener('DOMContentLoaded', () => {
    initializePureLiveFirebasePipelines();
    console.log(`Pure Live Engine initialized for ${ACTIVE_TOWN.primaryName}. Build: 2026-07-29_22:00_SMART_GLOBAL`);
});
