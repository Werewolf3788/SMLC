/**
 * Purpose: Core operational pipeline for the Louisville IL community portal.
 * Inputs: Dynamic API endpoints from GitHub Repos and Apps Script channels.
 * Outputs: Real-time UI population, auto-expiration calendar hider loops, and smart cache busting tokens.
 */

// Global slider interval reference pointer tracking tokens
let globalSlideshowTicker = null;

// Real-time calendar auto-reaping checker interval pointer
let calendarLiveExpirationTicker = null;

// Local storage buffer caching array for active processing elements
window.calendarCachedEvents = [];

/**
 * Purpose: Checks current browser time to toggle dark mode overrides based on Dusk/Dawn phases.
 * Inputs: None.
 * Outputs: Modifies standard DOM document body class tags directly.
 */
(function checkAmbientDuskTheme() {
    const currentHour = new Date().getHours();
    // Dusk threshold set to 7:00 PM (19) through Dawn at 5:00 AM (5)
    if (currentHour >= 19 || currentHour < 5) {
        document.body.classList.add('dusk-mode-active');
    } else {
        document.body.classList.remove('dusk-mode-active');
    }
})();

/**
 * Purpose: Formulates an automated hourly smart cache buster token parameter.
 * Inputs: None.
 * Outputs: String - Unique numeric hash matching the current explicit hour segment blocks.
 */
function getSmartCacheBuster() {
    return "cb=" + Math.floor(Date.now() / 3600000);
}

/**
 * Purpose: Overrides header layout bounds to force wide full screen display rules.
 * Inputs: None (reads direct viewport DOM targets).
 * Outputs: Fixed header billboard asset size presentation maps across 100vw.
 */
(function applyHeaderLayoutFix() {
    const headerImg = document.querySelector('.header-billboard-img');
    const headerLink = document.querySelector('.header-billboard-link');
    if (headerImg && headerLink) {
        headerLink.style.display = 'block';
        headerLink.style.width = '100vw';
        headerLink.style.maxWidth = '100%';
        headerLink.style.maxHeight = '240px';
        headerLink.style.margin = '0';
        headerLink.style.padding = '0';
        
        headerImg.style.width = '100%';
        headerImg.style.height = '100%';
        headerImg.style.objectFit = 'fill'; 
        headerImg.style.margin = '0';
        headerImg.style.padding = '0';
        
        headerImg.style.cursor = 'pointer';
        headerImg.onclick = () => fireLightbox(headerImg.src, "Support My Local Community", "NETWORK BANNER", "Clay County Illinois #1 Destination for Local Coupons and Discounts");
    }
})();

/**
 * Purpose: Formats machine database dates into clean frontend system arrays.
 * Inputs: rawString (String) - Database string representation.
 * Outputs: String - Human formatted layout mapping (MM/DD/YY).
 */
function formatHumanTimestamp(rawString) {
    if (!rawString) return "Date TBA";
    try {
        const dateObj = new Date(rawString);
        if (isNaN(dateObj.getTime())) return rawString;
        return dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    } catch(e) {
        return rawString;
    }
}

/**
 * Purpose: Activates modal dialog viewport system mapping details.
 * Inputs: imgSrc (Url), title (Text), dateText (Text), bodyText (Text), targetUrl (Url).
 * Outputs: Fires global window lightbox element presentation grids.
 */
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

/**
 * Purpose: Closes global modular modal overlay states securely.
 * Inputs: e (Event) - Desktop pointer trigger interactions.
 * Outputs: Toggles structural displays off.
 */
function closeLightbox(e) {
    if(e.target.id === "portal-global-lightbox" || e.target.classList.contains('lightbox-close-btn')) {
        document.getElementById('portal-global-lightbox').style.display = 'none';
    }
}

/**
 * Purpose: Toggles expanding snippet fields inside calendar list streams.
 * Inputs: idx (Number) - Index reference key lookup.
 * Outputs: Shifts visibility constraints across targets.
 */
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

/**
 * Purpose: Loops image visibility classes dynamically across slider nodes.
 * Inputs: None (Scans DOM children within slider container wrapper).
 * Outputs: Changes visibility tags over distinct timed gaps.
 */
function initializeSlideshowEngine() {
    const slideshowViewport = document.getElementById('louisville-slideshow');
    if (!slideshowViewport) return;

    if (globalSlideshowTicker) {
        clearInterval(globalSlideshowTicker);
    }

    let activeIdx = 0;
    globalSlideshowTicker = setInterval(() => {
        const slideNodes = slideshowViewport.querySelectorAll('.slider-slide');
        if (slideNodes.length <= 1) return;
        
        slideNodes[activeIdx].classList.remove('active');
        activeIdx = (activeIdx + 1) % slideNodes.length;
        slideNodes[activeIdx].classList.add('active');
    }, 4000);
}

/**
 * Purpose: Assembles standard safety fallback elements if network channels fail.
 * Inputs: None.
 * Outputs: Restores critical UI sections using raw data backups.
 */
function runDataPipelineFallback() {
    console.warn("JSON error caught. Initializing standard pipeline fallback layers.");
    
    const targetImg = document.getElementById('spotlight-asset-img');
    if(targetImg) {
        targetImg.src = "https://raw.githubusercontent.com/Werewolf3788/Testpages/main/images/Grandma_s%20Kitchen.jpg";
        targetImg.alt = "Grandma's Kitchen Spotlight Profile Element";
        targetImg.onclick = () => {
            fireLightbox(targetImg.src, "Grandma's Kitchen", "BUSINESS SPOTLIGHT", "Serving home-cooked favorites for over two decades, the Family Diner is a staple of our community. Known for their Early Bird specials and the friendliest service in Clay County.", "https://www.facebook.com/p/Grandmas-kitchen-Flora-il-61586069549969/");
        };
    }
    document.getElementById('spotlight-asset-name').innerText = "Grandma's Kitchen";
    document.getElementById('spotlight-asset-loc').innerText = "Flora, IL";
    document.getElementById('spotlight-asset-desc').innerText = "Serving home-cooked favorites for over two decades, the Family Diner is a staple of our community. Known for their Early Bird specials and the friendliest service in Clay County.";
    document.getElementById('spotlight-asset-link').href = "https://www.facebook.com/p/Grandmas-kitchen-Flora-il-61586069549969/";

    initializeSlideshowEngine();
}

/**
 * Purpose: Injects and executes the dynamic external ScoreStream tracking script.
 * Inputs: None.
 * Outputs: Displays local high school athletics widget frameworks securely.
 */
function dynamicallyLoadSportsWidget() {
    try {
        const existingScript = document.querySelector('script[src*="scorestream.com"]');
        if (existingScript) existingScript.remove();

        const sportsScript = document.createElement('script');
        sportsScript.type = 'text/javascript';
        sportsScript.src = "https://scorestream.com/apiJsCdn/widgets/embed.js";
        sportsScript.async = true;
        document.body.appendChild(sportsScript);
    } catch(e) {
        console.error("ScoreStream widget initialization fault", e);
    }
}

/**
 * Purpose: Evaluates locations text strings to assign specific town class modifiers.
 * Inputs: locationText (String).
 * Outputs: String (CSS structural layout tracking handles).
 */
function determineTownColorClass(locationText) {
    if (!locationText) return '';
    const textUpper = locationText.toUpperCase();
    if (textUpper.includes("FLORA")) return 'town-flora';
    if (textUpper.includes("LOUISVILLE")) return 'town-louisville';
    if (textUpper.includes("CLAY CITY")) return 'town-claycity';
    return '';
}

/**
 * Purpose: Renders buffered calendar items from memory into the scrollable list container.
 * Inputs: None (reads global window.calendarCachedEvents array data layers).
 * Outputs: Structural calendar list cards populated dynamically.
 */
function renderLiveActiveCalendarBulletin() {
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller || !Array.isArray(window.calendarCachedEvents)) return;

    const API = "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec?feed=true";
    const nowTimestamp = new Date().getTime();

    // Dynamically screens past calendar items out using explicit time validations
    const liveEvents = window.calendarCachedEvents.filter(item => {
        const eventDateStr = item.date || item.displayDate;
        if (!eventDateStr) return true;
        return new Date(eventDateStr).getTime() + 86400000 >= nowTimestamp;
    });

    if (liveEvents.length > 0) {
        // UNLOCKED: Loops through the full array without slicing to ensure all future entries scroll natively
        scroller.innerHTML = liveEvents.map((item, idx) => {
            const eventTitle = item.name || "Community Event";
            const eventDate = formatHumanTimestamp(item.date || item.displayDate);
            const eventTime = item.time || item.displayTime || "Time TBA";
            const location = item.location || "Clay County";
            
            // Clean out inner markup formatting blocks to prevent rogue text layout size explosions
            let details = item.details || "No details provided.";
            details = details.replace(/<\/?[^>]+(>|$)/g, "");
            
            const briefDetails = details.length > 60 ? details.substring(0, 60) + "..." : details;
            
            // Computes specific dynamic color tags underneath your requested town rules
            const townColorClass = determineTownColorClass(location);
            const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;

            return `
                <div class="bulletin-item ${townColorClass}" data-event-id="${item.id || idx}">
                    <div class="bulletin-date-time">${eventDate} &bull; ${eventTime}</div>
                    <div class="bulletin-title">${eventTitle}</div>
                    <div style="font-size:12px; color:#666; margin-bottom:4px;"><strong>Location:</strong> ${location}</div>
                    
                    <div class="bulletin-desc-brief" id="bulletin-brief-${idx}">"${briefDetails}"</div>
                    <div class="bulletin-desc-full" id="bulletin-full-${idx}">${details}</div>
                    
                    ${details.length > 60 ? `<div class="bulletin-toggle-btn" id="bulletin-btn-${idx}" onclick="toggleBulletinDesc(${idx})">Read More</div>` : ''}
                    
                    <div class="bulletin-action-row">
                        <a href="${gCalUrl}" target="_blank" class="cal-text-link">Google Cal</a>
                        <span style="color:#777;">|</span>
                        <a href="${API}" class="cal-text-link" download="${eventTitle.replace(/\s+/g, '_')}.ics">iCal Event</a>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        scroller.innerHTML = `<div style="text-align:center; padding:1rem; font-style:italic;">No events scheduled.</div>`;
    }
}

/**
 * Purpose: Orchestrates structural async network content fetches.
 * Inputs: External JSON resources and dynamic cloud storage endpoints.
 * Outputs: Complete front-end portal hydrations.
 */
async function processDataPipelines() {
    const cb = getSmartCacheBuster();
    
    // 1. Menu Builder Loader Pipeline
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/menu.json?' + cb);
        const menuArray = await res.json();
        
        const brandLabel = document.querySelector('.nav-brand');
        if (brandLabel) brandLabel.style.display = 'none';

        if(Array.isArray(menuArray)) {
            document.getElementById('dynamic-menu-target').innerHTML = menuArray.map(item => `
                <li class="menu-item ${item.name === 'Louisville' ? 'active' : ''}">
                    <a href="${item.url}">${item.name}</a>
                </li>
            `).join('');
        }
    } catch(e) { console.error("Menu pipeline error", e); }

    // 2. Section 3 Dynamic image arrays and spotlight extractors
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/refs/heads/main/json/town-images.json?' + cb);
        
        if (!res.ok) {
            throw new Error(`HTTP network fault code: ${res.status}`);
        }
        
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
        } else {
            initializeSlideshowEngine();
        }

        if(imgData.global_assets && Array.isArray(imgData.global_assets)) {
            const spotlightObj = imgData.global_assets.find(asset => asset.id === "global_business_spotlight");
            if(spotlightObj) {
                const targetImg = document.getElementById('spotlight-asset-img');
                if(targetImg) {
                    targetImg.src = spotlightObj.imageurl;
                    targetImg.alt = spotlightObj.alt;
                    targetImg.onclick = () => {
                        fireLightbox(spotlightObj.imageurl, spotlightObj.name, "BUSINESS SPOTLIGHT", spotlightObj.description, spotlightObj.source_url);
                    };
                }
                
                document.getElementById('spotlight-asset-name').innerText = spotlightObj.name;
                document.getElementById('spotlight-asset-loc').innerText = spotlightObj.location || "Flora, IL";
                document.getElementById('spotlight-asset-desc').innerText = spotlightObj.description || "";
                document.getElementById('spotlight-asset-link').href = spotlightObj.source_url;
            }
        }
    } catch(e) { 
        console.error("Images workflow error:", e); 
        runDataPipelineFallback();
    }

    // 3. Section 3 Right Card Matrix Handler
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/section3.json?' + cb);
        const rows = await res.json();
        const targetRow = rows.find(r => r.Town === "Louisville");
        if(targetRow) {
            document.getElementById('right-card-meta-title').innerText = targetRow.Title;
            
            const i1 = document.getElementById('dual-img-1');
            i1.src = targetRow.ImageUrl1;
            document.getElementById('dual-header-1').innerText = targetRow.Header1;
            i1.onclick = () => fireLightbox(targetRow.ImageUrl1, targetRow.Header1, "ARCHIVE VIEW", targetRow.Description1, targetRow.source_url || "https://supportmylocalcommunity.com");
            
            const i2 = document.getElementById('dual-img-2');
            i2.src = targetRow.ImageUrl2;
            document.getElementById('dual-header-2').innerText = targetRow.Header2;
            i2.onclick = () => fireLightbox(targetRow.ImageUrl2, targetRow.Header2, "ARCHIVE VIEW", targetRow.Description1, targetRow.source_url || "https://supportmylocalcommunity.com");
            
            document.getElementById('right-card-meta-desc1').innerText = targetRow.Description1;
            document.getElementById('desc2-target-1').innerText = targetRow.Description2;
        }
    } catch(e) { console.error("Section 3 layout parsing error", e); }

    // 4. Historical Events Timeline Manager (Section 4)
    try {
        const res = await fetch('https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/louisville.json?' + cb);
        const payload = await res.json();
        if(payload && payload.history) {
            const historyContainer = document.getElementById('history-row-target');
            historyContainer.innerHTML = payload.history.map(evt => {
                const hasImage = !!evt.image_url;
                const finalDesc = hasImage 
                    ? (evt.description.length > 75 ? evt.description.substring(0, 75) + "..." : evt.description)
                    : evt.description;

                const safeDescription = evt.description.replace(/'/g, "\\'").replace(/\r?\n|\r/g, " ");
                const safeEventTitle = evt.event.replace(/'/g, "\\'");

                return `
                    <div class="history-card" onclick="fireLightbox('${evt.image_url || ''}', '${safeEventTitle}', 'YEAR ${evt.year}', '${safeDescription}', '${evt.source_url || ''}')">
                        <div>
                            <h2>${evt.year}</h2>
                            <h3>${evt.event}</h3>
                            <p>${finalDesc}</p>
                            ${evt.image_url ? `<span style="color:#cc0000; font-size:11px; font-weight:bold; display:block; margin-top:6px;">READ FULL TEXT &rarr;</span>` : ''}
                        </div>
                        ${evt.image_url ? `
                            <div class="history-img-box">
                                <img src="${evt.image_url}" alt="${evt.image_caption || evt.event}">
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }
    } catch(e) { console.error("History system down", e); }

    // 5. Partners Modular Grid Ordering Logic System (Sections 5 & 7)
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/partners.json?' + cb);
        const partners = await res.json();
        
        const sequenceTop = [0, 2, 4, 1, 3];    
        const sequenceBottom = [1, 3, 0, 2, 4]; 
        
        const buildPartnerHtml = (indexes) => {
            return indexes.map(idx => {
                const p = partners[idx];
                if(!p) return '';
                
                const escapedName = p.name.replace(/'/g, "\\'");
                return `
                    <div class="partner-card">
                        <div class="partner-logo-box">
                            <img src="${p.image}" alt="${p.name} logo" style="cursor:pointer;" onclick="fireLightbox('${p.image}', '${escapedName}', 'NETWORK PARTNER', 'Official digital partner of Support My Local Community network serving ${p.county || 'Clay'} County.', '${p.websiteUrl}')">
                        </div>
                        <h4><a href="${p.websiteUrl}" target="_blank">${p.name}</a></h4>
                    </div>
                `;
            }).join('');
        };
        
        document.getElementById('partners-grid-top').innerHTML = buildPartnerHtml(sequenceTop);
        document.getElementById('partners-grid-bottom').innerHTML = buildPartnerHtml(sequenceBottom);
    } catch(e) { console.error("Partners grid rendering error", e); }

    // 6. Live Auto-Expiration Community Calendar Pipeline Engine (Col 1-2)
    try {
        const API = "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec?feed=true";
        const res = await fetch(API + "&" + cb);
        const elements = await res.json();

        if(Array.isArray(elements) && elements.length > 0) {
            window.calendarCachedEvents = elements;
            
            // Initial layout print map execution
            renderLiveActiveCalendarBulletin();

            // Setup real-time 30-second sweep sweeps to hide events automatically as they expire
            if(calendarLiveExpirationTicker) clearInterval(calendarLiveExpirationTicker);
            calendarLiveExpirationTicker = setInterval(renderLiveActiveCalendarBulletin, 30000);
        } else {
            document.getElementById('bulletin-scroller-target').innerHTML = `<div style="text-align:center; padding:1rem; font-style:italic;">No events scheduled.</div>`;
        }
    } catch(err) { document.getElementById('bulletin-scroller-target').innerHTML = `<div style="text-align:center; padding:1rem; color:#cc0000;">Sync Offline.</div>`; }

    // 7. News Filtration Grid Engine Matrix
    try {
        const res = await fetch('https://raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json?' + cb);
        const newsArray = await res.json();
        
        const filtered = newsArray.filter(item => {
            const h = (item.title || "").toUpperCase();
            const b = (item.full_story || "").toUpperCase();
            return h.includes("CLAY COUNTY") || b.includes("CLAY COUNTY") ||
                   h.includes("LOUISVILLE") || b.includes("LOUISVILLE") ||
                   h.includes("NORTH CLAY") || b.includes("NORTH CLAY") ||
                   h.includes("HOOSIER") || b.includes("HOOSIER") ||
                   h.includes(" NC ") || b.includes(" NC ");
        });

        window.newsCacheBlock = filtered;
        const targetGrid = document.getElementById('news-matrix-target');
        
        if(filtered.length > 0) {
            if(filtered.length > 1) {
                targetGrid.classList.add('grid-layout-active');
            } else {
                targetGrid.classList.remove('grid-layout-active');
            }

            targetGrid.innerHTML = filtered.map(story => {
                const sDate = formatHumanTimestamp(story.date);
                const snip = story.full_story.length > 95 ? story.full_story.substring(0, 95) + "..." : story.full_story;
                return `
                    <div class="news-matrix-card">
                        <div>
                            ${story.image ? `<img src="${story.image}" alt="${story.title}" class="news-card-thumb" onclick="openNewsModal('${story.id}')">` : ''}
                            <div class="news-card-date">${sDate}</div>
                            <div class="news-card-title">${story.title}</div>
                            <div class="news-card-snippet">"${snip}"</div>
                        </div>
                        <a href="javascript:void(0)" class="cal-text-link" onclick="openNewsModal('${story.id}')" style="font-weight:bold; font-size:12px; text-transform:uppercase; margin-top:8px; display:inline-block;">Read Full Story &rarr;</a>
                    </div>
                `;
            }).join('');
        } else {
            targetGrid.innerHTML = `<div style="text-align:center; padding:2rem; font-style:italic;">No articles matched.</div>`;
        }
    } catch(e) { console.error("News flow halted", e); }

    // 8. Footer Info Data Dynamic Populator Engine
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/footer.json?' + cb);
        const payload = await res.json();
        const f = payload.footer_data;
        if(f) {
            const cleanNumbersHtml = `
                <div class="footer-inline-numbers">
                    ${f.contact_info.phone.map((p, i) => `
                        <a href="${p.url}">${p.number}</a>
                    `).join('<span style="color:var(--accent-gold); padding:0 10px;">/</span>')}
                </div>
            `;
            document.getElementById('footer-phone-target').innerHTML = cleanNumbersHtml;

            document.getElementById('footer-email-target').href = f.contact_info.email.url;
            document.getElementById('footer-email-target').innerText = f.contact_info.email.address;
            document.getElementById('footer-address-target').innerHTML = `<a href="${f.contact_info.address.map_url}" target="_blank">${f.contact_info.address.text}</a>`;
            document.getElementById('footer-copy-target').innerText = f.copyright;
        }
    } catch(e) { console.error("Footer download failed", e); }
    
    dynamicallyLoadSportsWidget();
}

/**
 * Purpose: Connects target click streams directly into the lightbox overlay parser cache blocks.
 * Inputs: id (String) - Database identification hash token.
 * Outputs: Fires detail modal panels.
 */
function openNewsModal(id) {
    if(!window.newsCacheBlock) return;
    const match = window.newsCacheBlock.find(a => a.id === id);
    if(match) {
        fireLightbox(match.image, match.title, formatHumanTimestamp(match.date), match.full_story, match.source_url || '');
    }
}

// Global initialization parameters loaders trigger definitions
window.addEventListener('DOMContentLoaded', () => {
    processDataPipelines();
});
