/**
 * Purpose: Core operational pipeline for the Louisville IL community portal.
 * Inputs: Dynamic API endpoints from GitHub Repos and Apps Script channels.
 * Outputs: Real-time UI population, global lightboxes, and auto-rotation loops.
 */

// Header image asset layout override fix to force full width aspect bounds
(function applyHeaderLayoutFix() {
    const headerImg = document.querySelector('.header-billboard-img');
    const headerLink = document.querySelector('.header-billboard-link');
    if (headerImg && headerLink) {
        headerLink.style.display = 'block';
        headerLink.style.width = '100vw';
        headerLink.style.maxWidth = '100%';
        headerLink.style.aspectRatio = '2 / 1';
        headerLink.style.maxHeight = '280px';
        headerLink.style.margin = '0';
        headerLink.style.padding = '0';
        
        headerImg.style.width = '100%';
        headerImg.style.height = '100%';
        headerImg.style.objectFit = 'fill'; 
        headerImg.style.margin = '0';
        headerImg.style.padding = '0';
        
        // Add global lightbox tracking to header image asset
        headerImg.style.cursor = 'pointer';
        headerImg.onclick = () => fireLightbox(headerImg.src, "Support My Local Community", "NETWORK BANNER", "Clay County Illinois #1 Destination for Local Coupons and Discounts");
    }
})();

// Format database timestamps into readable layout matrices
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

// Global modal dynamic dispatcher engine - Applies to EVERY single asset on the viewport
function fireLightbox(imgSrc, title, dateText, bodyText) {
    const overlay = document.getElementById('portal-global-lightbox');
    const targetImg = document.getElementById('lightbox-target-img');
    
    if(imgSrc) {
        targetImg.src = imgSrc;
        targetImg.parentElement.style.display = 'block';
    } else {
        targetImg.parentElement.style.display = 'none';
    }
    
    document.getElementById('lightbox-target-date').innerText = dateText || '';
    document.getElementById('lightbox-target-title').innerText = title || '';
    document.getElementById('lightbox-target-story').innerText = bodyText || '';
    overlay.style.display = 'flex';
}

function closeLightbox(e) {
    if(e.target.id === "portal-global-lightbox" || e.target.classList.contains('lightbox-close-btn')) {
        document.getElementById('portal-global-lightbox').style.display = 'none';
    }
}

// Toggle expansion blocks in the calendar bulletin widget list
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

async function processDataPipelines() {
    
    // 1. Menu Builder Loader Pipeline
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/menu.json');
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

    // 2. Section 3 Rotator Slide Injector & Col 1-1 Spotlight Hydrator
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/town-images.json');
        const imgData = await res.json();
        
        // Populate slider node containers
        const louisvilleSection = imgData.network_towns.Louisville;
        if(louisvilleSection && louisvilleSection.categories) {
            let slideDeck = [];
            louisvilleSection.categories.forEach(cat => {
                cat.images.forEach(img => {
                    slideDeck.push({ url: img.url, name: img.name, alt: img.alt });
                });
            });

            const slideshowViewport = document.getElementById('louisville-slideshow');
            if(slideDeck.length > 0) {
                slideshowViewport.innerHTML = slideDeck.map((slide, i) => `
                    <div class="slider-slide ${i === 0 ? 'active' : ''}" onclick="fireLightbox('${slide.url}', '${slide.name}', 'GALLERY ARCHIVE', '${slide.alt}')">
                        <img src="${slide.url}" alt="${slide.alt}">
                        <div class="slider-caption">${slide.name} (Click to Enlarge)</div>
                    </div>
                `).join('');

                // Fixed Slideshow Auto Rotation: Decoupled and safely timed right here
                let activeIdx = 0;
                setInterval(() => {
                    const slideNodes = slideshowViewport.querySelectorAll('.slider-slide');
                    if(slideNodes.length <= 1) return;
                    slideNodes[activeIdx].classList.remove('active');
                    activeIdx = (activeIdx + 1) % slideNodes.length;
                    slideNodes[activeIdx].classList.add('active');
                }, 4000);
            }
        }

        // Spotlight Element Hydration Engine (Col 1-1) - Dynamic ID lookups
        const spotlightObj = imgData.global_assets ? imgData.global_assets.find(asset => asset.id === "global_business_spotlight") : null;
        if(spotlightObj) {
            const targetImg = document.getElementById('spotlight-asset-img');
            targetImg.src = spotlightObj.url;
            targetImg.alt = spotlightObj.alt;
            document.getElementById('spotlight-asset-name').innerText = spotlightObj.name;
            document.getElementById('spotlight-asset-loc').innerText = spotlightObj.location || "Flora, IL";
            
            // Fixed case sensitivity problem: reads case-exact "Description" from raw JSON layout mapping
            document.getElementById('spotlight-asset-desc').innerText = spotlightObj.Description || "";
            document.getElementById('spotlight-asset-link').href = spotlightObj.source_url;
            
            targetImg.onclick = () => {
                fireLightbox(spotlightObj.url, spotlightObj.name, "BUSINESS SPOTLIGHT", spotlightObj.Description);
            };
        }
    } catch(e) { console.error("Images workflow error", e); }

    // 3. Section 3 Right Card Matrix Handler
    try {
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/section3.json');
        const rows = await res.json();
        const targetRow = rows.find(r => r.Town === "Louisville");
        if(targetRow) {
            document.getElementById('right-card-meta-title').innerText = targetRow.Title;
            
            const i1 = document.getElementById('dual-img-1');
            i1.src = targetRow.ImageUrl1;
            document.getElementById('dual-header-1').innerText = targetRow.Header1;
            i1.onclick = () => fireLightbox(targetRow.ImageUrl1, targetRow.Header1, "ARCHIVE VIEW", targetRow.Description1);
            
            const i2 = document.getElementById('dual-img-2');
            i2.src = targetRow.ImageUrl2;
            document.getElementById('dual-header-2').innerText = targetRow.Header2;
            i2.onclick = () => fireLightbox(targetRow.ImageUrl2, targetRow.Header2, "ARCHIVE VIEW", targetRow.Description1);
            
            document.getElementById('right-card-meta-desc1').innerText = targetRow.Description1;
            document.getElementById('desc2-target-1').innerText = targetRow.Description2;
        }
    } catch(e) { console.error("Section 3 layout parsing error", e); }

    // 4. Historical Events Timeline Manager (Section 4)
    try {
        const res = await fetch('https://raw.githubusercontent.com/skventuresigns-design/smlc/main/townhistory/louisville.json');
        const payload = await res.json();
        if(payload && payload.history) {
            const historyContainer = document.getElementById('history-row-target');
            historyContainer.innerHTML = payload.history.map(evt => {
                const briefDesc = evt.description.length > 75 ? evt.description.substring(0, 75) + "..." : evt.description;
                return `
                    <div class="history-card" onclick="fireLightbox('${evt.image_url || ''}', '${evt.event}', 'YEAR ${evt.year}', \`${evt.description}\`)">
                        <div>
                            <h2>${evt.year}</h2>
                            <h3>${evt.event}</h3>
                            <p>${briefDesc}</p>
                            <span style="color:#cc0000; font-size:11px; font-weight:bold; display:block; margin-top:6px;">READ FULL TEXT &rarr;</span>
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
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/partners.json');
        const partners = await res.json();
        
        const sequenceTop = [0, 2, 4, 1, 3];    
        const sequenceBottom = [1, 3, 0, 2, 4]; 
        
        const buildPartnerHtml = (indexes) => {
            return indexes.map(idx => {
                const p = partners[idx];
                if(!p) return '';
                
                // Formulate target inline string nodes
                const escapedName = p.name.replace(/'/g, "\\'");
                return `
                    <div class="partner-card">
                        <div class="partner-logo-box">
                            <img src="${p.image}" alt="${p.name} logo" style="cursor:pointer;" onclick="fireLightbox('${p.image}', '${escapedName}', 'NETWORK PARTNER', 'Official digital partner of Support My Local Community network serving ${p.county || 'Clay'} County.')">
                        </div>
                        <h4><a href="${p.websiteUrl}" target="_blank">${p.name}</a></h4>
                    </div>
                `;
            }).join('');
        };
        
        document.getElementById('partners-grid-top').innerHTML = buildPartnerHtml(sequenceTop);
        document.getElementById('partners-grid-bottom').innerHTML = buildPartnerHtml(sequenceBottom);
    } catch(e) { console.error("Partners grid rendering error", e); }

    // 6. Community Calendar Engine (Col 1-2)
    try {
        const scroller = document.getElementById('bulletin-scroller-target');
        const API = "https://script.google.com/macros/s/AKfycbwtunjBquRf8yjnYdpMNMglMQB6n0j4pHSNke-9yADxZ3-9HvJqXT2DdVTUjdhRroGcxQ/exec?feed=true";
        const res = await fetch(API);
        const elements = await res.json();

        if(Array.isArray(elements) && elements.length > 0) {
            const viewportLimits = elements.slice(0, 5);
            scroller.innerHTML = viewportLimits.map((item, idx) => {
                const eventTitle = item.name || "Community Event";
                const eventDate = formatHumanTimestamp(item.date || item.displayDate);
                const eventTime = item.time || item.displayTime || "Time TBA";
                const location = item.location || "Clay County";
                const details = item.details || "No details provided.";
                const briefDetails = details.length > 60 ? details.substring(0, 60) + "..." : details;
                
                const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;

                return `
                    <div class="bulletin-item">
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
    } catch(err) { scroller.innerHTML = `<div style="text-align:center; padding:1rem; color:#cc0000;">Sync Offline.</div>`; }

    // 7. News Filtration Grid Engine Matrix (Col 2 Main Feed)
    try {
        const res = await fetch('https://raw.githubusercontent.com/skventuresigns-design/smlc/main/local-news/news_data.json');
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
                targetGrid.classList.add('two-columns');
            } else {
                targetGrid.classList.remove('two-columns');
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
        const res = await fetch('https://raw.githubusercontent.com/Werewolf3788/Testpages/main/json/footer.json');
        const payload = await res.json();
        const f = payload.footer_data;
        if(f) {
            // FIXED: Strips out text headers and links phone numbers side-by-side on a single row layout natively
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
}

function openNewsModal(id) {
    if(!window.newsCacheBlock) return;
    const match = window.newsCacheBlock.find(a => a.id === id);
    if(match) {
        fireLightbox(match.image, match.title, formatHumanTimestamp(match.date), match.full_story);
    }
}

window.addEventListener('DOMContentLoaded', processDataPipelines);
