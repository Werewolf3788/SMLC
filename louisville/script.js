/* ==========================================================================
   Active Version: 2026-07-26_15:25
   File: script.js
   Description: Core operational pipeline & application engine for community portal pages.
   Features:
   - Dynamic Title-Based Town & Keyword Extraction Filter Matrix
   - Dynamic ScoreStream Widget Extraction from External JSON Config (sports.json / config.json)
   - Real-time UI population, auto-expiration calendar loops, and smart cache-busting
   - Smart tabs handling, dynamic UTM tracking, and visible build footer sync
   ========================================================================== */

/* === SECTION 1: Dynamic Town Configuration & Aliases Matrix === */
const TOWN_ALIAS_MAP = {
    "LOUISVILLE": {
        primaryName: "Louisville",
        jsonKey: "louisville",
        keywords: ["LOUISVILLE", "NORTH CLAY", "NC", "HOOSIER"],
        zipCodes: ["62858"]
    },
    "FLORA": {
        primaryName: "Flora",
        jsonKey: "flora",
        keywords: ["FLORA", "FLO", "WOLVES"],
        zipCodes: ["62839"]
    },
    "CLAY CITY": {
        primaryName: "Clay City",
        jsonKey: "clay_city",
        keywords: ["CLAY CITY", "CC"],
        zipCodes: ["62824"]
    },
    "XENIA": {
        primaryName: "Xenia",
        jsonKey: "clay_county_teams",
        keywords: ["XENIA"],
        zipCodes: ["62899"]
    },
    "IOLA": {
        primaryName: "Iola",
        jsonKey: "louisville",
        keywords: ["IOLA"],
        zipCodes: ["62849"]
    },
    "SAILOR SPRINGS": {
        primaryName: "Sailor Springs",
        jsonKey: "clay_county_teams",
        keywords: ["SAILOR SPRINGS"],
        zipCodes: ["62879"]
    },
    "INGRAHAM": {
        primaryName: "Ingraham",
        jsonKey: "louisville",
        keywords: ["INGRAHAM"],
        zipCodes: ["62434"]
    }
};

function getActiveTownConfig() {
    /* === Logic: Inspects <title> to identify active town and returns match parameters === */
    const pageTitle = document.title.toUpperCase();
    
    for (const key in TOWN_ALIAS_MAP) {
        if (pageTitle.includes(key)) {
            return TOWN_ALIAS_MAP[key];
        }
    }
    
    // Default fallback if title is not matched
    return TOWN_ALIAS_MAP["LOUISVILLE"];
}

const ACTIVE_TOWN = getActiveTownConfig();

/* === SECTION 2: Global State Tracking & Variables === */
let globalSlideshowTicker = null;
let calendarLiveExpirationTicker = null;
let partnersRotationTicker = null;
window.calendarCachedEvents = [];
window.newsCacheBlock = [];

/* === SECTION 3: Ambient Theme & Cache Buster Helpers === */
(function checkAmbientDuskTheme() {
    /* === Logic: Toggles dusk mode class based on client local hour === */
    const currentHour = new Date().getHours();
    if (currentHour >= 19 || currentHour < 5) {
        document.body.classList.add('dusk-mode-active');
    } else {
        document.body.classList.remove('dusk-mode-active');
    }
})();

function getSmartCacheBuster() {
    /* === Logic: Hourly auto-expiring cache buster token === */
    return "cb=" + Math.floor(Date.now() / 3600000);
}

function matchesActiveTown(text, location) {
    /* === Logic: Checks string content against active town keywords & zips === */
    const combinedStr = ((text || "") + " " + (location || "")).toUpperCase();
    
    const matchedKeyword = ACTIVE_TOWN.keywords.some(kw => combinedStr.includes(kw));
    const matchedZip = ACTIVE_TOWN.zipCodes.some(zip => combinedStr.includes(zip));
    
    return matchedKeyword || matchedZip;
}

/* === SECTION 4: Smart Tabs & Duplicate Tab Interception === */
function setupSmartTabsLogic() {
    /* === Logic: Intercepts link clicks to shift focus to active tab sessions if already open === */
    const channelName = "community_portal_tab_channel";
    const broadcast = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelName) : null;

    if (!window.name) {
        window.name = "community_portal_main_tab";
    }

    document.addEventListener("click", (event) => {
        const anchor = event.target.closest("a");
        if (!anchor) return;

        const targetUrl = anchor.getAttribute("href");
        if (!targetUrl || targetUrl.startsWith("#") || targetUrl.startsWith("javascript:")) return;

        if (broadcast) {
            broadcast.postMessage({
                type: "TAB_NAVIGATION",
                url: targetUrl,
                timestamp: Date.now()
            });
        }
    });

    if (broadcast) {
        broadcast.onmessage = (event) => {
            if (event.data && event.data.type === "TAB_NAVIGATION") {
                console.log("Smart tab navigation event captured:", event.data);
            }
        };
    }
}

/* === SECTION 5: Dynamic UTM URL Tracking === */
function applyDynamicUTMTracking() {
    /* === Logic: Dynamically appends project & element UTM metrics for GA4 === */
    const activeProjectIdentifier = "werewolf3788profile";
    
    document.querySelectorAll("a").forEach((anchor) => {
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

        try {
            const url = new URL(href, window.location.origin);
            
            if (!url.searchParams.has("utm_campaign")) {
                url.searchParams.set("utm_campaign", activeProjectIdentifier);
            }
            if (!url.searchParams.has("utm_source")) {
                const elementLabel = anchor.innerText.trim() || anchor.getAttribute("aria-label") || "LinkClick";
                url.searchParams.set("utm_source", elementLabel.replace(/\s+/g, "_"));
            }
            if (!url.searchParams.has("utm_medium")) {
                url.searchParams.set("utm_medium", "interactive_element");
            }
            
            anchor.setAttribute("href", url.toString());
        } catch (e) {
            console.error("UTM Injection error for URL:", href, e);
        }
    });
}

/* === SECTION 6: Milestone & Holiday Overlay Engine === */
function processDynamicHolidayAndMilestoneMatrix() {
    /* === Logic: Evaluates Clay County age milestones and applies seasonal background gradients === */
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    // 1. Clay County Birthday Milestones (December 23, 1824)
    const baseBirthYear = 1824;
    let absoluteAge = currentYear - baseBirthYear;
    
    if (currentMonth < 12 || (currentMonth === 12 && currentDay < 23)) {
        absoluteAge--;
    }
    
    const countyAgeHud = document.getElementById('hud-county-age-target');
    if (countyAgeHud) {
        if (absoluteAge % 50 === 0 || absoluteAge === 200) {
            countyAgeHud.innerText = `Clay County: ${absoluteAge} Years Old!`;
            countyAgeHud.style.display = 'block';
        } else {
            countyAgeHud.style.display = 'none';
        }
    }

    // 2. Holiday Overlay Matrix
    let detectedHoliday = "";
    let backgroundCssValue = "";

    if (currentMonth === 7 && currentDay === 4) {
        detectedHoliday = "4th of July";
        backgroundCssValue = "radial-gradient(circle, #ff3333 10%, transparent 11%), radial-gradient(circle, #3333ff 10%, #05051a 80%)";
    } else if (currentMonth === 12 && currentDay === 25) {
        detectedHoliday = "Christmas Day";
        backgroundCssValue = "linear-gradient(135deg, #0a5c1a 0%, #022407 50%, #7a0909 100%)";
    } else if (currentMonth === 1 && currentDay === 1) {
        detectedHoliday = "New Year's Day";
        backgroundCssValue = "radial-gradient(circle, #ffd700 20%, #111111 80%)";
    } else if (currentMonth === 3 && currentDay === 17) {
        detectedHoliday = "St. Patrick's Day";
        backgroundCssValue = "linear-gradient(180deg, #1b4d0a 0%, #000000 100%)";
    } else if (currentMonth === 2 && currentDay === 14) {
        detectedHoliday = "Valentine's Day";
        backgroundCssValue = "linear-gradient(135deg, #a80526 0%, #40010c 100%)";
    } else if (currentMonth === 5 && currentDay >= 25 && today.getDay() === 1) {
        detectedHoliday = "Memorial Day";
        backgroundCssValue = "linear-gradient(180deg, #222222 0%, #051430 100%)";
    } else if (currentMonth === 9 && currentDay >= 1 && currentDay <= 7 && today.getDay() === 1) {
        detectedHoliday = "Labor Day";
        backgroundCssValue = "linear-gradient(180deg, #4d4605 0%, #141301 100%)";
    } else if (currentMonth === 11 && currentDay >= 22 && currentDay <= 28 && today.getDay() === 4) {
        detectedHoliday = "Thanksgiving";
        backgroundCssValue = "linear-gradient(135deg, #5c2c05 0%, #210e01 100%)";
    } else if (currentMonth === 10 && currentDay === 31) {
        detectedHoliday = "Halloween";
        backgroundCssValue = "linear-gradient(180deg, #d45d02 0%, #1c0121 70%, #000000 100%)";
    }

    const holidayHud = document.getElementById('hud-holiday-title-target');
    if (holidayHud) {
        if (detectedHoliday !== "") {
            holidayHud.innerText = `Happy ${detectedHoliday}!`;
            holidayHud.style.display = 'block';
            document.body.style.background = backgroundCssValue;
            document.body.style.backgroundAttachment = "fixed";
        } else {
            holidayHud.style.display = 'none';
        }
    }
}

/* === SECTION 7: Header Layout Adjustments === */
(function applyHeaderLayoutFix() {
    /* === Logic: Enforces responsive header billboard dimensions & lightboxes === */
    const headerImg = document.querySelector('.header-billboard-img');
    const headerLink = document.querySelector('.header-billboard-link');
    if (headerImg && headerLink) {
        headerLink.style.display = 'block';
        headerLink.style.width = '100vw';
        headerLink.style.maxWidth = '100%';
        headerLink.style.maxHeight = '240px';
        
        headerImg.style.width = '100%';
        headerImg.style.height = '100%';
        headerImg.style.objectFit = 'fill'; 
        headerImg.onclick = () => fireLightbox(headerImg.src, "Support My Local Community", "NETWORK BANNER", "Clay County Illinois #1 Destination for Local Coupons and Discounts");
    }
})();

/* === SECTION 8: Helper Functions & Lightbox System === */
function formatHumanTimestamp(rawString) {
    /* === Logic: Formats ISO date strings into MM/DD/YY === */
    if (!rawString) return "Date TBA";
    try {
        const dateObj = new Date(rawString);
        if (isNaN(dateObj.getTime())) return rawString;
        return dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    } catch(e) { return rawString; }
}

function fireLightbox(imgSrc, title, dateText, bodyText, targetUrl) {
    /* === Logic: Triggers global popup modal for detail views === */
    const overlay = document.getElementById('portal-global-lightbox');
    const targetImg = document.getElementById('lightbox-target-img');
    const actionRow = document.getElementById('lightbox-action-row');
    const actionLink = document.getElementById('lightbox-target-link');
    
    if(imgSrc) {
        targetImg.src = imgSrc;
        targetImg.parentElement.style.display = 'block';
    } else {
        targetImg.parentElement.style.display = 'none';
    }
    
    document.getElementById('lightbox-target-date').innerText = dateText || '';
    document.getElementById('lightbox-target-title').innerText = title || '';
    document.getElementById('lightbox-target-story').innerText = bodyText || '';
    
    if (targetUrl) {
        actionLink.href = targetUrl;
        actionRow.style.display = 'block';
    } else {
        actionRow.style.display = 'none';
    }
    overlay.style.display = 'flex';
}

function closeLightbox(e) {
    /* === Logic: Dismisses active modal when clicking outside contents === */
    if(e.target.id === "portal-global-lightbox" || e.target.classList.contains('lightbox-close-btn')) {
        document.getElementById('portal-global-lightbox').style.display = 'none';
    }
}

function openCalendarLightboxModal(idx) {
    /* === Logic: Launches modal populated with specific calendar event parameters === */
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

/* === SECTION 9: Slideshow Engine === */
function initializeSlideshowEngine() {
    /* === Logic: Auto-rotates image slides in 4 second intervals === */
    const slideshowViewport = document.getElementById('louisville-slideshow');
    if (!slideshowViewport) return;
    if (globalSlideshowTicker) clearInterval(globalSlideshowTicker);
    let activeIdx = 0;
    globalSlideshowTicker = setInterval(() => {
        const slideNodes = slideshowViewport.querySelectorAll('.slider-slide');
        if (slideNodes.length <= 1) return;
        slideNodes[activeIdx].classList.remove('active');
        activeIdx = (activeIdx + 1) % slideNodes.length;
        slideNodes[activeIdx].classList.add('active');
    }, 4000);
}

/* === SECTION 10: Calendar Bulletin & Auto-Expiration Loop === */
function renderLiveActiveCalendarBulletin() {
    /* === Logic: Filters and renders upcoming town events using alias matrix === */
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller || !Array.isArray(window.calendarCachedEvents)) return;

    const API = "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec?feed=true";
    const nowTimestamp = new Date().getTime();

    // DYNAMIC FILTER: Matches against active town keywords & ZIPs
    const localizedEvents = window.calendarCachedEvents.filter(item => {
        return matchesActiveTown(item.name + " " + item.details, item.location);
    });

    const liveEvents = localizedEvents.filter(item => {
        const eventDateStr = item.date || item.displayDate;
        if (!eventDateStr) return true;
        
        let year, month, day;
        if (eventDateStr.includes('-')) {
            const parts = eventDateStr.split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        } else if (eventDateStr.includes('/')) {
            const parts = eventDateStr.split('/');
            if (parts[0].length === 4) {
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10) - 1;
                day = parseInt(parts[2], 10);
            } else {
                month = parseInt(parts[0], 10) - 1;
                day = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
                if (year < 100) year += 2000;
            }
        } else {
            const fallbackDate = new Date(eventDateStr);
            if (isNaN(fallbackDate.getTime())) return true;
            year = fallbackDate.getFullYear();
            month = fallbackDate.getMonth();
            day = fallbackDate.getDate();
        }

        const eventBoundaryTarget = new Date(year, month, day);
        const eventTimeStr = item.time || item.displayTime;
        
        if (eventTimeStr) {
            const timeSegments = eventTimeStr.split('-');
            const targetTimeBlock = (timeSegments.length > 1 ? timeSegments[1] : timeSegments[0]).trim();
            const cleanTimeMatches = targetTimeBlock.match(/(\d+):(\d+)\s*(am|pm)?/i);
            if (cleanTimeMatches) {
                let structuralHours = parseInt(cleanTimeMatches[1], 10);
                const structuralMinutes = parseInt(cleanTimeMatches[2], 10);
                const meridiemIndicator = cleanTimeMatches[3];
                if (meridiemIndicator) {
                    if (meridiemIndicator.toLowerCase() === 'pm' && structuralHours < 12) structuralHours += 12;
                    if (meridiemIndicator.toLowerCase() === 'am' && structuralHours === 12) structuralHours = 0;
                }
                eventBoundaryTarget.setHours(structuralHours, structuralMinutes, 0, 0);
            } else {
                eventBoundaryTarget.setHours(23, 59, 59, 999);
            }
        } else {
            eventBoundaryTarget.setHours(23, 59, 59, 999);
        }
        return eventBoundaryTarget.getTime() >= nowTimestamp;
    });

    if (liveEvents.length > 0) {
        scroller.innerHTML = liveEvents.map((item, idx) => {
            const eventTitle = item.name || "Community Event";
            const eventDate = formatHumanTimestamp(item.date || item.displayDate);
            const eventTime = item.time || item.displayTime || "Time TBA";
            const location = item.location || ACTIVE_TOWN.primaryName + ", IL";
            let details = item.details || "No details provided.";
            details = details.replace(/<\/?[^>]+(>|$)/g, "");
            
            const briefDetails = details.length > 60 ? details.substring(0, 60) + "..." : details;
            const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;

            return `
                <div class="bulletin-item" data-event-id="${item.id || idx}">
                    <div class="bulletin-date-time" style="color:var(--primary-color, #1b365d); font-weight:bold;">${eventDate} &bull; ${eventTime}</div>
                    <div class="bulletin-title">${eventTitle}</div>
                    <div style="font-size:12px; color:#666; margin-bottom:4px;"><strong>Location:</strong> ${location}</div>
                    <div class="bulletin-desc-brief">"${briefDetails}"</div>
                    <div class="bulletin-toggle-btn" style="color:#cc0000; text-decoration:underline; font-weight:bold; cursor:pointer; text-transform:uppercase; font-size:12px; margin-top:4px;" onclick="openCalendarLightboxModal(${idx})">Read More &rarr;</div>
                    <div class="bulletin-action-row" style="margin-top:6px; font-size:11px;">
                        <a href="${gCalUrl}" target="_blank" class="cal-text-link">Google Cal</a>
                        <span style="color:#777;">|</span>
                        <a href="${API}" class="cal-text-link" download="${eventTitle.replace(/\s+/g, '_')}.ics">iCal Event</a>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        scroller.innerHTML = `<div style="text-align:center; padding:1rem; font-style:italic;">No ${ACTIVE_TOWN.primaryName} events scheduled.</div>`;
    }
}

/* === SECTION 11: Rotating Network Partners Engine === */
function initializeRotatingPartnersEngine(partnersArray) {
    /* === Logic: Cycles through network business partner cards every 5 seconds === */
    if(!Array.isArray(partnersArray) || partnersArray.length === 0) return;
    if(partnersRotationTicker) clearInterval(partnersRotationTicker);

    let baseSequenceTop = [0, 2, 4, 1, 3];
    let baseSequenceBottom = [1, 3, 0, 2, 4];

    const renderSequence = (targetId, sequenceIndices) => {
        const targetContainer = document.getElementById(targetId);
        if(!targetContainer) return;
        targetContainer.innerHTML = sequenceIndices.map(idx => {
            const partner = partnersArray[idx % partnersArray.length];
            if(!partner) return '';
            const escapedName = partner.name.replace(/'/g, "\\'");
            return `
                <div class="partner-card" style="min-width: 160px; text-align: center;">
                    <div class="partner-logo-box">
                        <img src="${partner.image}" alt="${partner.name} logo" style="cursor:pointer; max-width: 100%; height: auto;" onclick="fireLightbox('${partner.image}', '${escapedName}', 'NETWORK PARTNER', 'Official digital partner of Support My Local Community network serving ${partner.county || 'Clay'} County.', '${partner.websiteUrl}')">
                    </div>
                    <h4 style="font-size: 12px; margin-top: 6px;"><a href="${partner.websiteUrl}" target="_blank" style="color: inherit; text-decoration: none;">${partner.name}</a></h4>
                </div>
            `;
        }).join('');
    };

    renderSequence('partners-grid-top', baseSequenceTop);
    renderSequence('partners-grid-bottom', baseSequenceBottom);

    partnersRotationTicker = setInterval(() => {
        baseSequenceTop = baseSequenceTop.map(i => (i + 1) % partnersArray.length);
        baseSequenceBottom = baseSequenceBottom.map(i => (i + 1) % partnersArray.length);
        renderSequence('partners-grid-top', baseSequenceTop);
        renderSequence('partners-grid-bottom', baseSequenceBottom);
    }, 5000);
}

/* === SECTION 12: Institutional Links Directory Fetcher === */
async function loadLocalLinksDirectory(cacheBuster) {
    /* === Logic: Pulls town-specific directory links using active town filter === */
    const linkTarget = document.getElementById('local-links-target-container');
    if(!linkTarget) return;
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/refs/heads/main/json/local_links.json?' + cacheBuster);
        const data = await res.json();
        if(Array.isArray(data)) {
            const filteredLinks = data.filter(link => matchesActiveTown(link.name, link.location));
            if(filteredLinks.length > 0) {
                linkTarget.innerHTML = filteredLinks.map(link => `
                    <div class="local-link-node" style="margin-bottom: 8px;">
                        <span>${link.name}</span> &mdash; 
                        <a href="${link.url}" target="_blank" class="local-link-anchor-btn" style="font-weight: bold; color: var(--primary-color);">Visit Site &rarr;</a>
                    </div>
                `).join('');
            } else {
                linkTarget.innerHTML = `<div style="font-style:italic; font-size:12px; color:#666;">No institutional links available for ${ACTIVE_TOWN.primaryName}.</div>`;
            }
        }
    } catch(e) {
        console.error("Local links directory engine exception occurred", e);
        linkTarget.innerHTML = `<div style="font-size:12px; color:#cc0000;">Directory segment offline.</div>`;
    }
}

/* === SECTION 13: Data Pipeline Orchestrator === */
async function processDataPipelines() {
    /* === Logic: Executes dynamic content fetch loops and applies active town filtering === */
    const cb = getSmartCacheBuster();
    
    processDynamicHolidayAndMilestoneMatrix();

    // 1. Dynamic Menu Loader
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/menu.json?' + cb);
        const menuArray = await res.json();
        if(Array.isArray(menuArray)) {
            const menuTarget = document.getElementById('dynamic-menu-target');
            if (menuTarget) {
                menuTarget.innerHTML = menuArray.map(item => `
                    <li class="menu-item ${item.name.toUpperCase() === ACTIVE_TOWN.primaryName.toUpperCase() ? 'active' : ''}">
                        <a href="${item.url}">${item.name}</a>
                    </li>
                `).join('');
            }
        }
    } catch(e) { console.error("Menu link pipeline fault", e); }

    // 2. Discover Complex Image Rotators & Spotlights
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/refs/heads/main/json/town-images.json?' + cb);
        const imgData = await res.json();
        const activeTownKey = ACTIVE_TOWN.primaryName;
        const townSection = imgData.network_towns ? imgData.network_towns[activeTownKey] : null;
        if(townSection && townSection.categories) {
            let slideDeck = [];
            townSection.categories.forEach(cat => {
                if (Array.isArray(cat.images)) {
                    cat.images.forEach(img => {
                        slideDeck.push({ url: img.imageurl, name: img.name, alt: img.alt, link: img.source_url });
                    });
                }
            });
            const slideshowViewport = document.getElementById('louisville-slideshow');
            if(slideDeck.length > 0 && slideshowViewport) {
                slideshowViewport.innerHTML = slideDeck.map((slide, i) => `
                    <div class="slider-slide ${i === 0 ? 'active' : ''}" onclick="fireLightbox('${slide.url}', '${slide.name}', 'GALLERY ARCHIVE', '${slide.alt}', '${slide.link}')">
                        <img src="${slide.url}" alt="${slide.alt}">
                        <div class="slider-caption">${slide.name} (Click to Enlarge)</div>
                    </div>
                `).join('');
                initializeSlideshowEngine();
            }
        }
        if(imgData.global_assets && Array.isArray(imgData.global_assets)) {
            const spotlightObj = imgData.global_assets.find(asset => asset.id === "global_business_spotlight");
            if(spotlightObj) {
                const targetImg = document.getElementById('spotlight-asset-img');
                if(targetImg) {
                    targetImg.src = spotlightObj.imageurl;
                    targetImg.onclick = () => fireLightbox(spotlightObj.imageurl, spotlightObj.name, "BUSINESS SPOTLIGHT", spotlightObj.description, spotlightObj.source_url);
                }
                const nameEl = document.getElementById('spotlight-asset-name'); if (nameEl) nameEl.innerText = spotlightObj.name;
                const locEl = document.getElementById('spotlight-asset-loc'); if (locEl) locEl.innerText = spotlightObj.location || "Flora, IL";
                const descEl = document.getElementById('spotlight-asset-desc'); if (descEl) descEl.innerText = spotlightObj.description || "";
                const linkEl = document.getElementById('spotlight-asset-link'); if (linkEl) linkEl.href = spotlightObj.source_url;
            }
        }
    } catch(e) { console.error("Dynamic images compilation down", e); }

    // 3. Section 3 Discover Complex Text Data
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/section3.json?' + cb);
        const rows = await res.json();
        const targetRow = rows.find(r => (r.Town || "").toUpperCase() === ACTIVE_TOWN.primaryName.toUpperCase());
        if(targetRow) {
            const rTitle = document.getElementById('right-card-meta-title'); if (rTitle) rTitle.innerText = targetRow.Title;
            const i1 = document.getElementById('dual-img-1'); if (i1) { i1.src = targetRow.ImageUrl1; i1.onclick = () => fireLightbox(targetRow.ImageUrl1, targetRow.Header1, "ARCHIVE VIEW", targetRow.Description1, targetRow.source_url); }
            const h1 = document.getElementById('dual-header-1'); if (h1) h1.innerText = targetRow.Header1;
            const i2 = document.getElementById('dual-img-2'); if (i2) { i2.src = targetRow.ImageUrl2; i2.onclick = () => fireLightbox(targetRow.ImageUrl2, targetRow.Header2, "ARCHIVE VIEW", targetRow.Description1, targetRow.source_url); }
            const h2 = document.getElementById('dual-header-2'); if (h2) h2.innerText = targetRow.Header2;
            const desc1 = document.getElementById('right-card-meta-desc1'); if (desc1) desc1.innerText = targetRow.Description1;
            const desc2 = document.getElementById('desc2-target-1'); if (desc2) desc2.innerText = targetRow.Description2;
        }
    } catch(e) { console.error("Discover complex card matrix data failure", e); }

    // 4. Historical Archive Timeline
    try {
        const townSlug = ACTIVE_TOWN.primaryName.toLowerCase().replace(/\s+/g, '');
        const res = await fetch(`https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/${townSlug}.json?` + cb);
        const payload = await res.json();
        const historyRowTarget = document.getElementById('history-row-target');
        if(payload && payload.history && historyRowTarget) {
            historyRowTarget.innerHTML = payload.history.map(evt => {
                let textExcerpt = evt.description || "";
                if(textExcerpt.length > 140) {
                    textExcerpt = textExcerpt.substring(0, 140) + "...";
                }
                const safeDescription = (evt.description || "").replace(/'/g, "\\'");
                const safeEventTitle = (evt.event || "").replace(/'/g, "\\'");
                return `
                    <div class="history-card" onclick="fireLightbox('${evt.image_url || ''}', '${safeEventTitle}', 'YEAR ${evt.year}', '${safeDescription}', '${evt.source_url || ''}')" style="background:#fff; border:1px solid #ddd; padding:16px; border-radius:6px; cursor:pointer;">
                        <div>
                            <h2 style="font-size:1.2rem; color:var(--primary-color);">${evt.year}</h2>
                            <h3 style="font-size:1rem; margin:4px 0;">${evt.event}</h3>
                            <p style="font-size:12px; color:#555;">${textExcerpt}</p>
                        </div>
                        ${evt.image_url ? `<div class="history-img-box" style="margin-top:8px;"><img src="${evt.image_url}" alt="${evt.event}" style="width:100%; border-radius:4px;"></div>` : ''}
                    </div>
                `;
            }).join('');
        }
    } catch(e) { console.error("Timeline data loading fault", e); }

    // 5. Network Partners
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/partners.json?' + cb);
        const partners = await res.json();
        initializeRotatingPartnersEngine(partners);
    } catch(e) { console.error("Partners configuration pool unreached", e); }

    // 6. Calendar Stream
    try {
        const API = "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec?feed=true";
        const res = await fetch(API + "&" + cb);
        const elements = await res.json();
        if(Array.isArray(elements) && elements.length > 0) {
            window.calendarCachedEvents = elements;
            renderLiveActiveCalendarBulletin();
            if(calendarLiveExpirationTicker) clearInterval(calendarLiveExpirationTicker);
            calendarLiveExpirationTicker = setInterval(renderLiveActiveCalendarBulletin, 30000);
        }
    } catch(err) { 
        const scroller = document.getElementById('bulletin-scroller-target');
        if (scroller) scroller.innerHTML = `<div style="text-align:center; color:#cc0000;">Sync Offline.</div>`; 
    }

    // 7. Dynamic News Matrix Filter
    try {
        const res = await fetch('https://raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json?' + cb);
        const newsArray = await res.json();
        
        const filtered = newsArray.filter(item => {
            return matchesActiveTown(item.title + " " + item.full_story, item.location);
        });
        
        window.newsCacheBlock = filtered;
        const targetGrid = document.getElementById('news-matrix-target');
        if(filtered.length > 0 && targetGrid) {
            targetGrid.innerHTML = filtered.map(story => {
                const snip = story.full_story.length > 95 ? story.full_story.substring(0, 95) + "..." : story.full_story;
                return `
                    <div class="news-matrix-card" style="background:#fff; border:1px solid #ddd; padding:16px; border-radius:6px;">
                        <div>
                            ${story.image ? `<img src="${story.image}" class="news-card-thumb" onclick="openNewsModal('${story.id}')" style="width:100%; height:140px; object-fit:cover; border-radius:4px; cursor:pointer;">` : ''}
                            <div class="news-card-date" style="font-size:11px; color:#777; font-weight:bold; margin-top:8px;">${formatHumanTimestamp(story.date)}</div>
                            <div class="news-card-title" style="font-weight:bold; font-size:14px; margin:4px 0;">${story.title}</div>
                            <div class="news-card-snippet" style="font-size:12px; color:#555;">"${snip}"</div>
                        </div>
                        <a href="javascript:void(0)" class="cal-text-link" onclick="openNewsModal('${story.id}')" style="font-weight:bold; font-size:12px; margin-top:8px; display:inline-block; color:var(--primary-color);">Read Full Story &rarr;</a>
                    </div>
                `;
            }).join('');
        } else if(targetGrid) {
            targetGrid.innerHTML = `<div style="text-align:center; grid-column:1/-1; font-style:italic;">No news articles currently found for ${ACTIVE_TOWN.primaryName}.</div>`;
        }
    } catch(e) { console.error("News dispatch framework offline", e); }

    // 8. Dynamic Footer Information
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/footer.json?' + cb);
        const payload = await res.json(); const f = payload.footer_data;
        if(f) {
            const fPhone = document.getElementById('footer-phone-target'); if (fPhone) fPhone.innerHTML = `<div class="footer-inline-numbers">${f.contact_info.phone.map(p => `<a href="${p.url}" style="color:#c5a059; text-decoration:none;">${p.number}</a>`).join('<span style="color:#c5a059; padding:0 10px;">/</span>')}</div>`;
            const fEmail = document.getElementById('footer-email-target'); if (fEmail) { fEmail.href = f.contact_info.email.url; fEmail.innerText = f.contact_info.email.address; }
            const fAddress = document.getElementById('footer-address-target'); if (fAddress) fAddress.innerHTML = `<a href="${f.contact_info.address.map_url}" target="_blank" style="color:#fff; text-decoration:none;">${f.contact_info.address.text}</a>`;
            const fCopy = document.getElementById('footer-copy-target'); if (fCopy) fCopy.innerText = f.copyright;
        }
    } catch(e) { console.error("Footer fetch fault encountered", e); }
    
    // 9. Load Directory Links
    await loadLocalLinksDirectory(cb);

    // 10. Dynamic ScoreStream Sports Integration with JSON Config Fetching
    try {
        // Primary JSON route for sports configuration
        const sportsJsonUrl = 'https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/sports.json?' + cb;
        const res = await fetch(sportsJsonUrl);
        const sportsConfig = await res.json();
        
        let targetWidgetId = "68601"; // Fallback default

        if (sportsConfig && sportsConfig.widgets) {
            const activeKey = ACTIVE_TOWN.jsonKey || "louisville";
            const townWidgetGroup = sportsConfig.widgets[activeKey] || sportsConfig.widgets["clay_county_teams"];
            if (townWidgetGroup && townWidgetGroup.banner_id) {
                targetWidgetId = townWidgetGroup.banner_id;
            }
        }

        const widgetContainer = document.querySelector('.scorestream-widget-container');
        if (widgetContainer) {
            widgetContainer.setAttribute('data-user-widget-id', targetWidgetId);
        }

        // Re-inject script to trigger ScoreStream re-render
        const existingScript = document.querySelector('script[src*="scorestream.com"]');
        if (existingScript) existingScript.remove();

        const sportsScript = document.createElement('script');
        sportsScript.type = 'text/javascript'; 
        sportsScript.src = "https://scorestream.com/apiJsCdn/widgets/embed.js"; 
        sportsScript.async = true;
        document.body.appendChild(sportsScript);

        console.log(`ScoreStream Sports Widget dynamic binding successful using Banner ID: ${targetWidgetId}`);
    } catch(e) { 
        console.error("ScoreStream JSON configuration pipeline error, falling back to static embed", e); 
    }
}

function openNewsModal(id) {
    /* === Logic: Launches lightbox populated with full news story === */
    if(!window.newsCacheBlock) return;
    const match = window.newsCacheBlock.find(a => a.id === id);
    if(match) fireLightbox(match.image, match.title, formatHumanTimestamp(match.date), match.full_story, match.source_url || '');
}

/* === SECTION 14: Main Application Initialization Engine === */
window.addEventListener('DOMContentLoaded', () => {
    applyDynamicUTMTracking();
    setupSmartTabsLogic();
    processDataPipelines();
    console.log(`Portal Engine initialized for ${ACTIVE_TOWN.primaryName}. Active Version: 2026-07-26_15:25`);
});
