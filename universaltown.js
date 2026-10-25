/* ==========================================================================
   PATCH FOR universaltown.js | Version: v3.2.0 | Build: 2026-10-25 05:25 EDT
   Fixes: fuel data (reads /fuel_prices), events (reads Firestore smlc_events),
          clean lightbox text, UTM tags on external links only, 7-day limit.
   HOW TO USE:
   A) Paste the NEW HELPERS block below anywhere above attachUtmParameters().
   B) For each function in the REPLACEMENT FUNCTIONS block, find the function with the
      same name in universaltown.js and replace it (from its "function" line to its closing "}").
   C) Make the small edits listed in the EDIT LIST at the bottom.
   ========================================================================== */

/* ---------- A) NEW HELPERS ---------- */
const MAX_AGE_DAYS = 7;   // used by news AND fuel

function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isWithinMaxAge(raw) {
    const t = new Date(raw).getTime();
    return isNaN(t) ? true : (Date.now() - t) <= MAX_AGE_DAYS * 86400000;
}

// Reads "10/25/2026 @ 3:40 AM CST" (CST = UTC-6, CDT = UTC-5)
function parseFuelDate(raw) {
    const m = String(raw || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*@?\s*(\d{1,2}):(\d{2})\s*([AP]M)?\s*(CST|CDT)?/i);
    if (!m) return null;
    let h = +m[4];
    const ap = (m[6] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    const offset = /CDT/i.test(m[7] || '') ? 5 : 6;
    return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2], h + offset, +m[5]));
}

function unwrapFs(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return parseInt(v.integerValue, 10);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if (v.arrayValue) return (v.arrayValue.values || []).map(unwrapFs);
    if (v.mapValue) { const o = {}; for (const k in (v.mapValue.fields || {})) o[k] = unwrapFs(v.mapValue.fields[k]); return o; }
    return null;
}

async function fetchCollectionRest(name) {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/smlc-fuel-monitor/databases/(default)/documents/${name}?pageSize=300`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || []).map(d => { const o = {}; for (const k in (d.fields || {})) o[k] = unwrapFs(d.fields[k]); return o; });
}

// Calendar stamps for "Add to calendar" links (all-day events use plain dates, Central Time)
function eventCalStamp(iso, allDay) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    if (allDay) return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(d).replace(/-/g, '');
    return d.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

function googleCalUrlForEvent(ev, loc) {
    const p = new URLSearchParams({ text: ev.title || 'Community Event', dates: `${eventCalStamp(ev.start, ev.isAllDay)}/${eventCalStamp(ev.end || ev.start, ev.isAllDay)}`, details: ev.desc || '', location: loc });
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&${p.toString()}`;
}

function icsDataForEvent(ev, loc) {
    const s = eventCalStamp(ev.start, ev.isAllDay), e = eventCalStamp(ev.end || ev.start, ev.isAllDay);
    const dt = ev.isAllDay ? ';VALUE=DATE' : '';
    const esc = t => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SMLC Community Network//EN', 'BEGIN:VEVENT',
        `UID:${s}-${String(ev.title || '').replace(/[^a-z0-9]/gi, '').slice(0, 20)}@smlc`,
        `DTSTAMP:${eventCalStamp(new Date().toISOString(), false)}`, `DTSTART${dt}:${s}`, `DTEND${dt}:${e}`,
        `SUMMARY:${esc(ev.title)}`, `LOCATION:${esc(loc)}`, `DESCRIPTION:${esc(ev.desc)}`, 'END:VEVENT', 'END:VCALENDAR'];
    return 'data:text/calendar;charset=utf8,' + encodeURIComponent(lines.join('\r\n'));
}

const FUEL_STATIONS = {
    "48100":  { town: "flora", display: "Flora", name: "CASEY'S", logo: "Casey's.png" },
    "48101":  { town: "flora", display: "Flora", name: "HUCK'S", logo: "Hucks.png" },
    "87817":  { town: "flora", display: "Flora", name: "FLORA STATION", logo: "smlc-default.png" }, // EDIT: real name + logo file
    "120226": { town: "flora", display: "Flora", name: "FAST STOP", logo: "Fast stop.png" },
    "128128": { town: "flora", display: "Flora", name: "MACH 1", logo: "Mach 1.png" },
    "48026":  { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png" },
    "171711": { town: "clay-city", display: "Clay City", name: "CASEY'S", logo: "Casey's.png" },
    "181818": { town: "xenia", display: "Xenia", name: "KNAPP'S", logo: "Knapps.png" }
};

/* ---------- B) REPLACEMENT FUNCTIONS ---------- */

// UTM tags go on EXTERNAL links only. Internal, mailto, tel and in-page links are untouched.
function attachUtmParameters(urlStr) {
    if (!urlStr || urlStr.startsWith('#') || /^(javascript:|tel:|mailto:|maps:|webcal:|data:)/i.test(urlStr)) return urlStr;
    try {
        const u = new URL(urlStr, window.location.href);
        if (!/^https?:$/.test(u.protocol) || u.hostname === window.location.hostname) return urlStr;
        if (u.searchParams.has('utm_source')) return u.toString();
        u.searchParams.set('utm_source', 'smlc_portal');
        u.searchParams.set('utm_medium', 'town_portal');
        u.searchParams.set('utm_campaign', (document.title || 'smlc_portal').trim());
        return u.toString();
    } catch (e) {
        return urlStr;
    }
}

// Strips old HTML first, escapes the text, then makes ONE clean link per web address
function linkifyRawUrls(text) {
    if (!text) return "";
    const plain = String(text).replace(/<\s*br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ');
    return escapeHtml(plain).replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi, (match) => {
        const url = match.replace(/[.,;:!?)]+$/, '');
        const tail = match.slice(url.length);
        const href = /^https?:/i.test(url) ? url : '//' + url;
        return `<a href="${href}" target="_blank" rel="noopener" style="color:var(--link-bright-blue); text-decoration:underline; word-break:break-all;">${url}</a>${tail}`;
    }).replace(/\n/g, '<br>');
}

// FUEL: reads /fuel_prices (and /billboard_network if present). Hides stations with no price
// or a price older than MAX_AGE_DAYS. Shows two stations at a time.
function initializeFirebaseGasMonitor(db) {
    const box = document.getElementById('fuel-monitor-target-box') || document.querySelector('.fuel-monitor-billboard-card');
    if (!box || !db) return;
    const targetTowns = ACTIVE_TOWN.gasKey || ["flora"];
    const ids = Object.keys(FUEL_STATIONS).filter(id => targetTowns.includes(FUEL_STATIONS[id].town));
    if (!ids.length) return;

    let prices = {}, network = {};
    const refresh = () => startGasRotator(Object.assign({}, network, prices), FUEL_STATIONS, ids, box);
    try {
        if (window.__fuelRefs) window.__fuelRefs.forEach(r => r.off());
        const r1 = db.ref('fuel_prices'), r2 = db.ref('billboard_network');
        window.__fuelRefs = [r1, r2];
        r1.on('value', s => { prices = s.val() || {}; refresh(); });
        r2.on('value', s => { network = s.val() || {}; refresh(); });
    } catch (e) {
        console.warn('Gas monitor notice:', e.message);
    }
}

function startGasRotator(data, stationConfigs, stationIds, container) {
    if (gasMonitorRotator) { clearInterval(gasMonitorRotator); gasMonitorRotator = null; }
    const updateUrl = cleanRawUrl(DEFAULT_APP_CONFIG.regional_endpoints.gas_widget);
    container.style.cursor = 'pointer';
    container.onclick = () => window.open(attachUtmParameters(updateUrl), '_blank', 'noopener');

    const money = v => { const n = parseFloat(String(v === undefined || v === null ? '' : v).replace(/[^0-9.]/g, '')); return n > 0 ? `$${n.toFixed(2)}` : null; };
    const live = stationIds.map(id => {
        const info = data[id] || {};
        const reg = money(info.reg !== undefined ? info.reg : (info.regular !== undefined ? info.regular : info.price));
        const dsl = money(info.dsl !== undefined ? info.dsl : info.diesel);
        const when = parseFuelDate(info.date || info.updated);
        const fresh = !when || (Date.now() - when.getTime()) <= MAX_AGE_DAYS * 86400000;
        return (reg || dsl) && fresh ? { cfg: stationConfigs[id], info: info, reg: reg, dsl: dsl, when: when } : null;
    }).filter(Boolean);

    const heading = `<div class="sidebar-widget-title">${escapeHtml(ACTIVE_TOWN.isHome ? 'CLAY COUNTY' : ACTIVE_TOWN.primaryName.toUpperCase())} FUEL INDEX MONITOR</div>`;
    if (!live.length) {
        container.innerHTML = heading + `<div class="fuel-note">To show prices, update.<br>Click here to open the price update page.</div>`;
        return;
    }

    const block = s => `
        <div class="fuel-station-block">
            <div class="fuel-station-header">
                <div class="station-logo-frame"><img src="//raw.githubusercontent.com/skventuresigns-design/smlc/main/gas-prices/image/${encodeURIComponent(s.cfg.logo)}" alt="" onerror="this.onerror=null; this.src='//raw.githubusercontent.com/skventuresigns-design/media/main/smlc-web.png';"></div>
                <div class="station-meta-title">${escapeHtml(s.info.name || s.cfg.name)} (${escapeHtml(s.cfg.display)})</div>
            </div>
            <div class="fuel-pricing-grid">
                <div class="price-box"><span class="price-type-label">REGULAR</span><span class="price-value-regular">${s.reg || '---'}</span></div>
                <div class="price-box"><span class="price-type-label">DIESEL</span><span class="price-value-diesel">${s.dsl || '---'}</span></div>
            </div>
            <div class="sync-timestamp-label">Updated: ${escapeHtml(s.when ? formatToCentralTime(s.when.toISOString()) : (s.info.date || 'Live'))}</div>
        </div>`;

    let start = 0;
    const draw = () => {
        const shown = [];
        for (let i = 0; i < Math.min(2, live.length); i++) shown.push(live[(start + i) % live.length]);
        container.innerHTML = heading + shown.map(block).join('') + `<div class="sync-timestamp-label">Click to update prices</div>`;
        start = (start + 2) % live.length;
    };
    draw();
    if (live.length > 2) gasMonitorRotator = setInterval(draw, 6000);
}

// EVENTS: reads the clean Firestore collection smlc_events (written by the calendar sync)
async function loadCommunityBulletinFeed() {
    const scroller = document.getElementById('bulletin-scroller-target');
    if (!scroller) return;
    try {
        let events = [];
        if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
            const snap = await firebase.firestore().collection('smlc_events').get();
            snap.forEach(d => events.push(d.data()));
        }
        if (!events.length) events = await fetchCollectionRest('smlc_events');

        const now = Date.now();
        window.calendarCachedEvents = events
            .filter(e => e && e.title && (!e.end || new Date(e.end).getTime() > now))
            .sort((a, b) => new Date(a.start) - new Date(b.start));
        const list = window.calendarCachedEvents;
        if (!list.length) { scroller.innerHTML = '<div class="feed-loading-placeholder">No upcoming events right now.</div>'; return; }

        applyHighDensityScrollLimits(scroller, list.length, 500);
        const subG = list[0].subscribeGoogle || '';
        const subI = (list[0].subscribeICal || '').replace(/^https?:/i, 'webcal:');
        const banner = (txt) => (!subG && !subI) ? '' : `
            <div style="background:#f8f9fa; border:1px solid #e2e8f0; padding:10px; border-radius:6px; margin:12px 0; text-align:center;">
                <span style="font-size:12px; font-weight:bold; color:#222; display:block; margin-bottom:6px; text-transform:uppercase;">${txt}</span>
                <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
                    ${subG ? `<a href="${escapeHtml(subG)}" target="_blank" rel="noopener" style="font-size:11px; font-weight:bold; color:#fff !important; background:#1a73e8; padding:8px 12px; border-radius:4px; text-decoration:none;" data-ga-label="global_cal_google">Google Calendar</a>` : ''}
                    ${subI ? `<a href="${escapeHtml(subI)}" style="font-size:11px; font-weight:bold; color:#fff !important; background:#1e7e34; padding:8px 12px; border-radius:4px; text-decoration:none;" data-ga-label="global_cal_ical">Apple / iCal</a>` : ''}
                </div>
            </div>`;

        const items = list.map((ev, idx) => {
            const loc = ev.addr || ev.location || (ACTIVE_TOWN.primaryName + ', IL');
            const img = normalizeImageUrl(ev.image);
            const nav = buildTurnByTurnNavigationUrl(loc);
            const when = ev.displayDate || cleanCalendarDate(ev.start);
            return `
                <div class="divi-event-item" style="margin-bottom:15px; padding-bottom:12px; border-bottom:1px dashed #888; overflow:hidden;">
                    ${img ? `<div style="float:right; margin:0 0 10px 12px;"><img src="${escapeHtml(img)}" alt="" onclick="openCalendarLightboxModal(${idx})" style="width:85px; height:85px; object-fit:cover; border-radius:6px; border:2px solid #222; cursor:pointer; display:block;" onerror="this.parentElement.style.display='none';"></div>` : ''}
                    <div class="divi-event-date" style="font-weight:bold;">${escapeHtml(when)}</div>
                    <div class="divi-event-title" style="font-size:16px; font-weight:bold; margin:4px 0;">${escapeHtml(ev.title)}</div>
                    <div class="event-info-text" style="font-size:13px;"><strong>Where:</strong> <a href="${escapeHtml(nav)}" target="_blank" rel="noopener" class="event-nav-link" style="font-weight:bold; text-decoration:underline;">${escapeHtml(loc)} &rarr; Directions</a></div>
                    <div style="font-size:13px; margin-top:4px;">${escapeHtml(ev.descShort || ev.desc || '')}</div>
                    <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                        <div class="read-more-btn" onclick="openCalendarLightboxModal(${idx})" style="font-weight:bold; cursor:pointer; font-size:12px; text-decoration:underline;">Read Details &rarr;</div>
                        <span style="opacity:.5; font-size:11px;">|</span>
                        <a href="${escapeHtml(googleCalUrlForEvent(ev, loc))}" target="_blank" rel="noopener" style="font-size:11px; color:#4f9df5 !important; font-weight:bold;" data-ga-label="single_cal_google">+ Google Cal</a>
                        <span style="opacity:.5; font-size:11px;">|</span>
                        <a href="${icsDataForEvent(ev, loc)}" download="${escapeHtml(String(ev.title).replace(/\s+/g, '_'))}.ics" style="font-size:11px; color:#5ac47a !important; font-weight:bold;" data-ga-label="single_cal_ical">+ iCal (.ics)</a>
                    </div>
                </div>`;
        }).join('');

        scroller.innerHTML = banner('Subscribe to Full County Calendar') + items + banner('County-Wide Calendar Subscriptions');
        triggerGoogleTranslateUpdate(scroller);
    } catch (err) {
        console.warn('Bulletin feed notice:', err.message);
    }
}

function openCalendarLightboxModal(idx) {
    const ev = window.calendarCachedEvents[idx];
    if (!ev) return;
    const loc = ev.addr || ev.location || (ACTIVE_TOWN.primaryName + ', IL');
    const nav = buildTurnByTurnNavigationUrl(loc);
    const meta = `${escapeHtml(ev.displayDate || cleanCalendarDate(ev.start))}<br>Location: <a href="${escapeHtml(nav)}" target="_blank" rel="noopener" style="color:var(--on-card-accent); font-weight:bold; text-decoration:underline;">${escapeHtml(loc)} (Directions &rarr;)</a>`;
    const links = Array.isArray(ev.links) ? ev.links.filter(l => l && l.url) : [];
    const extra = links.slice(1).map(l => `${l.label || 'Link'}: ${l.url}`).join('\n');
    fireLightbox(normalizeImageUrl(ev.image), ev.title, meta,
        (ev.desc || 'No additional details provided.') + (extra ? '\n\n' + extra : ''),
        links[0] ? links[0].url : '', ev.title);
}

/* ---------- C) EDIT LIST (small changes inside existing functions) ----------
   1. fireLightbox(): replace
          if (dateEl) dateEl.innerHTML = linkifyRawUrls(cleanDate || '');
      with
          if (dateEl) dateEl.innerHTML = cleanDate || '';
   2. fireLightbox(): replace
          const cleanAlt = altText || '';
      with
          const cleanAlt = String(altText || '').replace(/^#+\s*/gm, '').replace(/[*_`]/g, '');
   3. bindFirebaseLocalLinksEngine(): there are two places that say activeFbRefGlobalSections
      (one "activeFbRefGlobalSections = db.ref(...town_links/links)" and one
      "activeFbRefGlobalSections.on('value'..."). Change BOTH to activeFbRefLinksGlobal.
      (The old name was shared with the sections engine, which switched the links off.)
   4. loadLocalNewsDispatches(): just before the line  if (window.newsCacheBlock.length > 0) {
      add:
          window.newsCacheBlock = window.newsCacheBlock
              .filter(s => isWithinMaxAge(s.date))
              .sort((a, b) => new Date(b.date) - new Date(a.date));
   5. loadLocalNewsDispatches(): in the card template change
          ${cleanCalendarDate(story.date)}</div>
      to
          ${cleanCalendarDate(story.date)}${story.source_name ? ' • ' + escapeHtml(story.source_name) : ''}</div>
      and change   ${cleanTitle}</div>   to   ${escapeHtml(cleanTitle)}</div>
   6. Weather pill: also apply weather-pill-patch.js (renderNavbarWeatherWidget).
   ---------------------------------------------------------------------- */
