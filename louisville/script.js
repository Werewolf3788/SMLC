/**
 * Purpose: Core operational pipeline for the Louisville IL community portal.
 * Inputs: Dynamic API endpoints from GitHub Repos and Apps Script channels.
 * Outputs: Real-time UI population, auto-expiration calendar hider loops, and smart cache busting tokens.
 */

let globalSlideshowTicker = null;
let calendarLiveExpirationTicker = null;
let partnersRotationTicker = null;
window.calendarCachedEvents = [];

(function checkAmbientDuskTheme() {
    const currentHour = new Date().getHours();
    if (currentHour >= 19 || currentHour < 5) {
        document.body.classList.add('dusk-mode-active');
    } else {
        document.body.classList.remove('dusk-mode-active');
    }
})();

function getSmartCacheBuster() {
    return "cb=" + Math.floor(Date.now() / 3600000);
}

/**
 * Purpose: Analyzes current runtime metrics to trigger historical milestone labels and shift localized background themes.
 * Inputs: Dynamic client execution timestamps.
 * Outputs: Mutates global structural page backgrounds and scales text assets dynamically.
 */
function processDynamicHolidayAndMilestoneMatrix() {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // Correct indices to normal 1-12 tracking scales
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    // 1. EVALUATE CLAY COUNTY BIRTHDAY MILESTONES (DECEMBER 23, 1824)
    const baseBirthYear = 1824;
    let absoluteAge = currentYear - baseBirthYear;
    
    // Decrease count by one marker if current month is ahead of December's date line
    if (currentMonth < 12 || (currentMonth === 12 && currentDay < 23)) {
        absoluteAge--;
    }
    
    const countyAgeHud = document.getElementById('hud-county-age-target');
    if (countyAgeHud) {
        // Enforce visibility conditions strictly on multi-decade 50 year milestone transitions
        if (absoluteAge % 50 === 0 || absoluteAge === 200) {
            countyAgeHud.innerText = `Clay County: ${absoluteAge} Years Old!`;
            countyAgeHud.style.display = 'block';
        } else {
            countyAgeHud.style.display = 'none';
        }
    }

    // 2. DETECT HOLIDAY MATRICES AND EXECUTE ART BACKGROUND REPLICATIONS
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
    } else if (currentMonth === 5 && currentDay >= 25 && today.getDay() === 1) { // Last Monday of May loop bounds
        detectedHoliday = "Memorial Day";
        backgroundCssValue = "linear-gradient(180deg, #222222 0%, #051430 100%)";
    } else if (currentMonth === 9 && currentDay >= 1 && currentDay <= 7 && today.getDay() === 1) { // First Monday of Sept
        detectedHoliday = "Labor Day";
        backgroundCssValue = "linear-gradient(180deg, #4d4605 0%, #141301 100%)";
    } else if (currentMonth === 11 && currentDay >= 22 && currentDay <= 28 && today.getDay() === 4) { // Fourth Thursday of Nov
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
            
            // Replicate themed canvas designs across body rules directly
            document.body.style.background = backgroundCssValue;
            document.body.style.backgroundAttachment = "fixed";
        } else {
            holidayHud.style.display = 'none';
        }
    }
}

(function applyHeaderLayoutFix() {
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

function formatHumanTimestamp(rawString) {
    if (!rawString) return "Date TBA";
    try {
        const dateObj = new Date(rawString);
        if (isNaN(dateObj.getTime())) return rawString;
        return dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    } catch(e) { return rawString; }
}

function fireLightbox(imgSrc, title, dateText, bodyText, targetUrl) {
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
    if(e.target.id === "portal-global-lightbox" || e.target.classList.contains('lightbox-close-btn')) {
        document.getElementById('portal-global-lightbox').style.display = 'none';
    }
}

function toggleBulletinDesc(idx) {
    const brief = document.getElementById(`bulletin-brief-${idx}`);
    const full = document.getElementById(`bulletin-full-${idx}`);
    const btn = document.getElementById(`bulletin-btn-${idx}`);
    if(full.style.display === 'block') {
        full.style.display = 'none';
        brief.style.display = 'block';
        btn.innerText = 'Read More';
    } else {
        full.style.display = 'block';
        brief.style.display = 'none';
        btn.innerText = 'Show Less';
    }
}

function openCalendarLightboxModal(idx) {
    const targetItem = window.calendarCachedEvents[idx];
    if(!targetItem) return;
    const title = targetItem.name || "Community Event";
    const dateText = formatHumanTimestamp(targetItem.date || targetItem.displayDate);
    const timeText = targetItem.time || targetItem.displayTime || "Time TBA";
    const location = targetItem.location || "Louisville, IL";
    let details = targetItem.details || "No details provided.";
    details = details.replace(/<\/?[^>]+(>|$)/g, ""); 
    
    fireLightbox('', title, `${dateText} @ ${timeText} | Location: ${location}`, details, '');
}

function initializeSlideshowEngine() {
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

function renderLiveActiveCalendarBulletin() {
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller || !Array.isArray(window.calendarCachedEvents)) return;

    const API = "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec?feed=true";
    const nowTimestamp = new Date().getTime();

    const localizedEvents = window.calendarCachedEvents.filter(item => {
        const locUpper = (item.location || "").toUpperCase();
        return locUpper.includes("LOUISVILLE") || locUpper.includes("62858");
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
            const location = item.location || "Louisville, IL";
            let details = item.details || "No details provided.";
            details = details.replace(/<\/?[^>]+(>|$)/g, "");
            
            const briefDetails = details.length > 60 ? details.substring(0, 60) + "..." : details;
            const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;

            return `
                <div class="bulletin-item" data-event-id="${item.id || idx}">
                    <div class="bulletin-date-time" style="color:var(--color-louisville); font-weight:bold;">${eventDate} &bull; ${eventTime}</div>
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
        scroller.innerHTML = `<div style="text-align:center; padding:1rem; font-style:italic;">No Louisville events scheduled.</div>`;
    }
}

function initializeRotatingPartnersEngine(partnersArray) {
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
                <div class="partner-card">
                    <div class="partner-logo-box">
                        <img src="${partner.image}" alt="${partner.name} logo" style="cursor:pointer;" onclick="fireLightbox('${partner.image}', '${escapedName}', 'NETWORK PARTNER', 'Official digital partner of Support My Local Community network serving ${partner.county || 'Clay'} County.', '${partner.websiteUrl}')">
                    </div>
                    <h4><a href="${partner.websiteUrl}" target="_blank">${partner.name}</a></h4>
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

async function loadLocalLinksDirectory(cacheBuster) {
    const linkTarget = document.getElementById('local-links-target-container');
    if(!linkTarget) return;
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/refs/heads/main/json/local_links.json?' + cacheBuster);
        const data = await res.json();
        if(Array.isArray(data)) {
            const filteredLinks = data.filter(link => (link.location || "").toUpperCase().includes("LOUISVILLE"));
            if(filteredLinks.length > 0) {
                linkTarget.innerHTML = filteredLinks.map(link => `
                    <div class="local-link-node">
                        <span>${link.name}</span>
                        <a href="${link.url}" target="_blank" class="local-link-anchor-btn">Visit Site &rarr;</a>
                    </div>
                `).join('');
            } else {
                linkTarget.innerHTML = `<div style="font-style:italic; font-size:12px; color:#666;">No institutional links available.</div>`;
            }
        }
    } catch(e) {
        console.error("Local links directory engine exception occurred", e);
        linkTarget.innerHTML = `<div style="font-size:12px; color:#cc0000;">Directory segment offline.</div>`;
    }
}

async function processDataPipelines() {
    const cb = getSmartCacheBuster();
    
    // Execute Holiday Background Transformations Before Assets Render
    processDynamicHolidayAndMilestoneMatrix();

    // Menu Link Loader
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/menu.json?' + cb);
        const menuArray = await res.json();
        if(Array.isArray(menuArray)) {
            document.getElementById('dynamic-menu-target').innerHTML = menuArray.map(item => `
                <li class="menu-item ${item.name === 'Louisville' ? 'active' : ''}">
                    <a href="${item.url}">${item.name}</a>
                </li>
            `).join('');
        }
    } catch(e) { console.error("Menu link pipeline fault", e); }

    // Discover Complex Image Rotators
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/refs/heads/main/json/town-images.json?' + cb);
        const imgData = await res.json();
        const louisvilleSection = imgData.network_towns ? imgData.network_towns.Louisville : null;
        if(louisvilleSection && louisvilleSection.categories) {
            let slideDeck = [];
            louisvilleSection.categories.forEach(cat => {
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
                document.getElementById('spotlight-asset-name').innerText = spotlightObj.name;
                document.getElementById('spotlight-asset-loc').innerText = spotlightObj.location || "Flora, IL";
                document.getElementById('spotlight-asset-desc').innerText = spotlightObj.description || "";
                document.getElementById('spotlight-asset-link').href = spotlightObj.source_url;
            }
        }
    } catch(e) { console.error("Dynamic images compilation down", e); }

    // Section 3 Discover Complex Text Data Loader
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/section3.json?' + cb);
        const rows = await res.json();
        const targetRow = rows.find(r => r.Town === "Louisville");
        if(targetRow) {
            document.getElementById('right-card-meta-title').innerText = targetRow.Title;
            const i1 = document.getElementById('dual-img-1'); i1.src = targetRow.ImageUrl1;
            i1.onclick = () => fireLightbox(targetRow.ImageUrl1, targetRow.Header1, "ARCHIVE VIEW", targetRow.Description1, targetRow.source_url);
            document.getElementById('dual-header-1').innerText = targetRow.Header1;
            const i2 = document.getElementById('dual-img-2'); i2.src = targetRow.ImageUrl2;
            i2.onclick = () => fireLightbox(targetRow.ImageUrl2, targetRow.Header2, "ARCHIVE VIEW", targetRow.Description1, targetRow.source_url);
            document.getElementById('dual-header-2').innerText = targetRow.Header2;
            document.getElementById('right-card-meta-desc1').innerText = targetRow.Description1;
            document.getElementById('desc2-target-1').innerText = targetRow.Description2;
        }
    } catch(e) { console.error("Discover complex card matrix data failure", e); }

    // Historical Row Archive Timeline
    try {
        const res = await fetch('https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/louisville.json?' + cb);
        const payload = await res.json();
        if(payload && payload.history) {
            document.getElementById('history-row-target').innerHTML = payload.history.map(evt => {
                let textExcerpt = evt.description || "";
                if(textExcerpt.length > 140) {
                    textExcerpt = textExcerpt.substring(0, 140) + "...";
                }
                const safeDescription = evt.description.replace(/'/g, "\\'");
                const safeEventTitle = evt.event.replace(/'/g, "\\'");
                return `
                    <div class="history-card" onclick="fireLightbox('${evt.image_url || ''}', '${safeEventTitle}', 'YEAR ${evt.year}', '${safeDescription}', '${evt.source_url || ''}')">
                        <div>
                            <h2>${evt.year}</h2>
                            <h3>${evt.event}</h3>
                            <p>${textExcerpt}</p>
                        </div>
                        ${evt.image_url ? `<div class="history-img-box"><img src="${evt.image_url}" alt="${evt.event}"></div>` : ''}
                    </div>
                `;
            }).join('');
        }
    } catch(e) { console.error("Timeline data loading fault", e); }

    // Dynamic Partners Rotator Carousel Loading Trigger Sequence
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/partners.json?' + cb);
        const partners = await res.json();
        initializeRotatingPartnersEngine(partners);
    } catch(e) { console.error("Partners configuration pool unreached", e); }

    // Calendar Processing Flow
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
    } catch(err) { document.getElementById('bulletin-scroller-target').innerHTML = `<div style="text-align:center; color:#cc0000;">Sync Offline.</div>`; }

    // News Filtration Matrix
    try {
        const res = await fetch('https://raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json?' + cb);
        const newsArray = await res.json();
        const filtered = newsArray.filter(item => {
            const h = (item.title || "").toUpperCase(); const b = (item.full_story || "").toUpperCase();
            return h.includes("CLAY COUNTY") || b.includes("CLAY COUNTY") || h.includes("LOUISVILLE") || b.includes("LOUISVILLE") || h.includes("NORTH CLAY") || b.includes("NORTH CLAY");
        });
        window.newsCacheBlock = filtered;
        const targetGrid = document.getElementById('news-matrix-target');
        if(filtered.length > 0) {
            targetGrid.innerHTML = filtered.map(story => {
                const snip = story.full_story.length > 95 ? story.full_story.substring(0, 95) + "..." : story.full_story;
                return `
                    <div class="news-matrix-card">
                        <div>
                            ${story.image ? `<img src="${story.image}" class="news-card-thumb" onclick="openNewsModal('${story.id}')">` : ''}
                            <div class="news-card-date">${formatHumanTimestamp(story.date)}</div>
                            <div class="news-card-title">${story.title}</div>
                            <div class="news-card-snippet">"${snip}"</div>
                        </div>
                        <a href="javascript:void(0)" class="cal-text-link" onclick="openNewsModal('${story.id}')" style="font-weight:bold; font-size:12px; margin-top:8px; display:inline-block;">Read Full Story &rarr;</a>
                    </div>
                `;
            }).join('');
        }
    } catch(e) { console.error("News dispatch framework offline", e); }

    // Footer Info Data Populator
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/footer.json?' + cb);
        const payload = await res.json(); const f = payload.footer_data;
        if(f) {
            document.getElementById('footer-phone-target').innerHTML = `<div class="footer-inline-numbers">${f.contact_info.phone.map(p => `<a href="${p.url}">${p.number}</a>`).join('<span style="color:var(--accent-gold); padding:0 10px;">/</span>')}</div>`;
            document.getElementById('footer-email-target').href = f.contact_info.email.url;
            document.getElementById('footer-email-target').innerText = f.contact_info.email.address;
            document.getElementById('footer-address-target').innerHTML = `<a href="${f.contact_info.address.map_url}" target="_blank">${f.contact_info.address.text}</a>`;
            document.getElementById('footer-copy-target').innerText = f.copyright;
        }
    } catch(e) { console.error("Footer fetch fault encountered", e); }
    
    // Hydrate Local Links Row Directory
    await loadLocalLinksDirectory(cb);

    // ScoreStream Athletic System Loader
    try {
        const existingScript = document.querySelector('script[src*="scorestream.com"]');
        if (existingScript) existingScript.remove();
        const sportsScript = document.createElement('script');
        sportsScript.type = 'text/javascript'; sportsScript.src = "https://scorestream.com/apiJsCdn/widgets/embed.js"; sportsScript.async = true;
        document.body.appendChild(sportsScript);
    } catch(e) { console.error("ScoreStream structural layout failure", e); }
}

function openNewsModal(id) {
    if(!window.newsCacheBlock) return;
    const match = window.newsCacheBlock.find(a => a.id === id);
    if(match) fireLightbox(match.image, match.title, formatHumanTimestamp(match.date), match.full_story, match.source_url || '');
}

window.addEventListener('DOMContentLoaded', () => {
    processDataPipelines();
});
