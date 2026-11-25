/* SMLC Business Directory renderer | v1.4 | 2026-11-15 ("Open" bookmark tag on Plus/Premium cards that are open now;
   v1.3: tiers Basic / Plus / Premium; bio Read more)
   One set of markup for both:
     - scripts/build-directory.js (bakes the cards, answers and schema into directory.html
       so Google and AI crawlers can read everything without running JavaScript)
     - directory.html in the browser (re-draws from Firestore when the data is newer)
   Data shape = Firestore document directory/public, written by BusinessFinder.gs v3. */
(function (root) {
    'use strict';
    var SITE = 'https://supportmylocalcommunity.com/';
    var TIER_LABEL = { Premium: 'Premium Partner', Plus: 'Plus Member' };

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
    function todayIso(now) {
        var d = now || new Date();
        // Central Time date (Clay County)
        var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        return p;   // yyyy-mm-dd
    }
    // What each tier shows (Scott's plans):
    //   Basic   - logo, name, category (+ town)
    //   Plus    - + address, phone, hours
    //   Premium - everything: + website, Facebook, company bio, offers
    function isPlus(b) { return b.tier === 'Plus' || b.tier === 'Premium'; }
    function isPremium(b) { return b.tier === 'Premium'; }
    function offerIsLive(b, today) { return isPremium(b) && !!b.offer && (!b.validUntil || b.validUntil >= today); }
    function mapsLink(address) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address); }
    function niceDate(iso) {
        var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return '';
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
    }

    // Quick-filter groups (the chips at the top of the directory)
    var GROUPS = [
        ['Dining', /restaurant|diner|cafe|food|pizza|\bbar\b|grill|butcher|ice cream|bakery|coffee/i],
        ['Health', /health|medical|dentist|clinic|hospital|counsel|pharmacy|chiro|vision/i],
        ['Community', /government|emergency|education|school|non-profit|nonprofit|church|recreation|library|post office/i],
        ['Shopping', /retail|grocery|hardware|florist|boutique|store|antique|furniture|gift|gas station|appliance/i],
        ['Services', /./]
    ];
    function groupOf(category) {
        for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][1].test(category || '')) return GROUPS[i][0];
        return 'Services';
    }

    // ---- "Open now" tag (v1.4) -------------------------------------------------------------
    // Uses b.openingHours (schema.org style, e.g. "Mo-Fr 08:00-16:30") written by BusinessFinder.gs.
    // The cards are baked into directory.html hourly, so "open now" is worked out in the browser
    // (refreshOpen) in Clay County time (Central). Hours the sheet could not read give no tag.
    var DAY_INDEX = { Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6 };
    var WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    function centralNow(now) {
        var o = {};
        new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
            .formatToParts(now || new Date()).forEach(function (p) { o[p.type] = p.value; });
        return { day: WEEKDAY_INDEX[o.weekday], minutes: (+o.hour % 24) * 60 + (+o.minute) };
    }
    function parseHourRules(list) {
        var out = [];
        (list || []).forEach(function (s) {
            var m = String(s).match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
            if (!m) return;
            var end = (+m[5]) * 60 + (+m[6]);
            if (end === 23 * 60 + 59) end = 1440;                 // "23:59" means open until midnight
            out.push({ from: DAY_INDEX[m[1]], to: m[2] ? DAY_INDEX[m[2]] : DAY_INDEX[m[1]], start: (+m[3]) * 60 + (+m[4]), end: end });
        });
        return out;
    }
    function dayInRule(r, d) { return r.from <= r.to ? (d >= r.from && d <= r.to) : (d >= r.from || d <= r.to); }
    // true / false, or null when there are no readable hours (then no tag is shown)
    function isOpenNow(openingHours, now) {
        var rules = parseHourRules(openingHours);
        if (!rules.length) return null;
        var t = centralNow(now), prev = (t.day + 6) % 7;
        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            if (r.end > r.start) {
                if (dayInRule(r, t.day) && t.minutes >= r.start && t.minutes < r.end) return true;
            } else {                                              // runs past midnight, e.g. 22:00-02:00
                if (dayInRule(r, t.day) && t.minutes >= r.start) return true;
                if (dayInRule(r, prev) && t.minutes < r.end) return true;
            }
        }
        return false;
    }
    // Shows the "Open" tag on every card that is open right now (browser only)
    function refreshOpen(scope, now) {
        (scope || document).querySelectorAll('.biz[data-hours]').forEach(function (el) {
            var tag = el.querySelector('.open-tag');
            if (!tag) return;
            var open = isOpenNow(el.getAttribute('data-hours').split('|'), now) === true;
            tag.hidden = !open;
            el.classList.toggle('is-open', open);
        });
    }

    function cardHtml(b, today) {
        var hasHours = isPlus(b) && b.openingHours && b.openingHours.length;
        var openTag = hasHours ? '<span class="open-tag" hidden title="Open right now" aria-label="Open now">Open</span>' : '';
        var tier =TIER_LABEL[b.tier] ? '<span class="tier tier-' + slug(b.tier) + '">' + esc(TIER_LABEL[b.tier]) + '</span>' : '';
        var plus = isPlus(b), prem = isPremium(b);
        var tel = b.phone ? b.phone.replace(/\D/g, '') : '';
        var lines = [];
        if (plus) {
            // data-address: on iPhone/iPad/Mac, smlc-app.js opens Apple Maps with this address instead
            if (b.address) lines.push('<li><span aria-hidden="true">&#128205;</span> <a href="' + esc(b.mapsUrl || mapsLink(b.address)) + '" data-address="' + esc(b.address) + '" target="_blank" rel="noopener">' + esc(b.address) + '</a></li>');
            else if (b.mapsUrl) lines.push('<li><span aria-hidden="true">&#128205;</span> <a href="' + esc(b.mapsUrl) + '" target="_blank" rel="noopener">Open in Google Maps</a></li>');
            if (b.phone) lines.push('<li><span aria-hidden="true">&#128222;</span> <a href="tel:' + esc(tel) + '">' + esc(b.phone) + '</a></li>');
            if (b.hours) lines.push('<li><span aria-hidden="true">&#128339;</span> ' + esc(b.hours) + '</li>');
        }
        var links = [];
        if (prem && b.website) links.push('<a class="btn" href="' + esc(b.website) + '" target="_blank" rel="noopener">Website</a>');
        if (prem && b.facebook) links.push('<a class="btn btn-fb" href="' + esc(b.facebook) + '" target="_blank" rel="noopener">Facebook</a>');
        if (plus && b.phone) links.push('<a class="btn btn-call" href="tel:' + esc(tel) + '">Call</a>');
        var offer = offerIsLive(b, today)
            ? '<p class="offer"><strong>Offer:</strong> ' + esc(b.offer) + (b.validUntil ? ' <span>(through ' + esc(niceDate(b.validUntil)) + ')</span>' : '') + '</p>'
            : '';
        var bio = '';
        if (prem && b.bio) {
            var long = b.bio.length > 160;
            bio = '<p class="bio' + (long ? ' clamp' : '') + '" id="bio-' + esc(b.id) + '">' + esc(b.bio) + '</p>' +
                  (long ? '<button type="button" class="more" aria-expanded="false" aria-controls="bio-' + esc(b.id) + '">Read more</button>' : '');
        }
        var hay = [b.name, b.category, b.town].concat(plus ? [b.address] : []).concat(prem ? [b.bio, b.offer] : []).join(' ').toLowerCase();
        return '<article class="biz tier-' + slug(b.tier) + '" id="' + esc(b.id) + '" data-town="' + esc(b.town) + '" data-category="' + esc(b.category) + '" data-group="' + esc(groupOf(b.category)) + '" data-tier="' + esc(b.tier) + '"' + (offerIsLive(b, today) ? ' data-offer="1"' : '') + (hasHours ? ' data-hours="' + esc(b.openingHours.join('|')) + '"' : '') + ' data-search="' + esc(hay) + '">' +
            openTag +
            '<div class="biz-logo"><img src="' + esc(b.image) + '" alt="' + esc(b.name) + ' logo" loading="lazy" width="120" height="120" onerror="this.onerror=null;this.src=\'https://raw.githubusercontent.com/skventuresigns-design/media/main/localbusiness.png\'"></div>' +
            '<div class="biz-body">' + tier +
            '<h3>' + esc(b.name) + '</h3>' +
            '<p class="meta">' + esc(b.category || 'Local business') + ' &middot; ' + esc(b.town) + ', IL</p>' +
            (lines.length ? '<ul class="facts">' + lines.join('') + '</ul>' : '') +
            offer + bio +
            (links.length ? '<p class="links">' + links.join(' ') + '</p>' : '') +
            '</div></article>';
    }

    function cardsHtml(pub, today) {
        return (pub.businesses || []).map(function (b) { return cardHtml(b, today); }).join('\n');
    }

    // "Current offers" spotlight at the top of the directory (links to each card)
    function offersHtml(pub, today) {
        var live = (pub.businesses || []).filter(function (b) { return offerIsLive(b, today); });
        if (!live.length) return '';
        return '<h2 class="offers-h">Current offers</h2><div class="offers-row">' + live.map(function (b) {
            return '<a class="offer-card" href="#' + esc(b.id) + '" data-goto="' + esc(b.id) + '">' +
                '<span class="offer-badge">Offer</span>' +
                '<img src="' + esc(b.image) + '" alt="" loading="lazy" width="64" height="64">' +
                '<strong>' + esc(b.name) + '</strong>' +
                '<span class="offer-text">' + esc(b.offer) + '</span>' +
                (b.validUntil ? '<span class="offer-until">Through ' + esc(niceDate(b.validUntil)) + '</span>' : '') +
                '</a>';
        }).join('') + '</div>';
    }
    function liveOffers(pub, today) {
        return (pub.businesses || []).filter(function (b) { return offerIsLive(b, today); })
            .map(function (b) { return { id: b.id, name: b.name, image: b.image, offer: b.offer, validUntil: b.validUntil, town: b.town }; });
    }

    function optionsHtml(values, allLabel) {
        return '<option value="">' + esc(allLabel) + '</option>' +
            (values || []).map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('');
    }

    // "Quick answers" grouped by town: plain text AI tools can quote
    function answersHtml(pub) {
        var byTown = {};
        (pub.answers || []).forEach(function (a) { (byTown[a.town] = byTown[a.town] || []).push(a); });
        return Object.keys(byTown).sort().map(function (town) {
            return '<details class="answers-town"><summary>' + esc(town) + ', IL</summary><dl>' +
                byTown[town].map(function (a) { return '<dt>' + esc(a.q) + '</dt><dd>' + esc(a.a) + '</dd>'; }).join('') +
                '</dl></details>';
        }).join('\n');
    }

    function postalAddress(b) {
        var a = { '@type': 'PostalAddress', addressLocality: b.town, addressRegion: 'IL', addressCountry: 'US' };
        var parts = String(b.address || '').split(',').map(function (s) { return s.trim(); });
        if (parts.length > 1 && /\d/.test(parts[0])) a.streetAddress = parts[0];
        var zip = String(b.address || '').match(/\b(\d{5})\b(?!.*\b\d{5}\b)/);
        if (zip) a.postalCode = zip[1];
        return a;
    }

    // schema.org ItemList of LocalBusiness entries (+ page + breadcrumb)
    function ldJson(pub, today) {
        var page = (pub.pageUrl || SITE + 'directory.html');
        var items = (pub.businesses || []).map(function (b, i) {
            var plus = isPlus(b), prem = isPremium(b);
            var addr = plus ? postalAddress(b) : { '@type': 'PostalAddress', addressLocality: b.town, addressRegion: 'IL', addressCountry: 'US' };
            var biz = {
                '@type': b.schemaType || 'LocalBusiness',
                '@id': page + '#' + b.id,
                name: b.name,
                description: (prem && b.bio) || b.summary,
                image: b.image,
                address: addr,
                areaServed: { '@type': 'AdministrativeArea', name: 'Clay County, Illinois' }
            };
            if (plus && b.phone) biz.telephone = '+1-' + b.phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
            if (plus && b.openingHours && b.openingHours.length) biz.openingHours = b.openingHours;
            if (plus && b.mapsUrl) biz.hasMap = b.mapsUrl;
            if (prem && b.website) biz.url = b.website;
            if (prem && b.facebook) biz.sameAs = [b.facebook];
            if (offerIsLive(b, today)) {
                biz.makesOffer = { '@type': 'Offer', description: b.offer };
                if (b.validUntil) biz.makesOffer.validThrough = b.validUntil;
            }
            return { '@type': 'ListItem', position: i + 1, item: biz };
        });
        return {
            '@context': 'https://schema.org',
            '@graph': [
                { '@type': 'CollectionPage', '@id': page + '#webpage', url: page,
                  name: 'Clay County, IL Business Directory',
                  description: 'Local businesses, services, churches and offices in Flora, Louisville, Clay City, Xenia and across Clay County, Illinois.',
                  isPartOf: { '@type': 'WebSite', '@id': SITE + '#website', name: 'Support My Local Community', url: SITE },
                  publisher: { '@type': 'Organization', '@id': SITE + '#organization', name: 'Support My Local Community' },
                  dateModified: String(pub.updatedAt || '').slice(0, 10),
                  breadcrumb: { '@id': page + '#breadcrumb' },
                  mainEntity: { '@id': page + '#list' } },
                { '@type': 'BreadcrumbList', '@id': page + '#breadcrumb', itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Clay County', item: SITE },
                    { '@type': 'ListItem', position: 2, name: 'Business Directory', item: page }] },
                { '@type': 'ItemList', '@id': page + '#list', name: 'Clay County, IL businesses', numberOfItems: items.length, itemListElement: items }
            ]
        };
    }

    // Firestore REST document -> plain object
    function fromFirestore(v) {
        if (!v || typeof v !== 'object') return v;
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return Number(v.integerValue);
        if ('doubleValue' in v) return v.doubleValue;
        if ('booleanValue' in v) return v.booleanValue;
        if ('nullValue' in v) return null;
        if ('timestampValue' in v) return v.timestampValue;
        if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestore);
        if ('mapValue' in v) return fieldsToObject(v.mapValue.fields || {});
        return null;
    }
    function fieldsToObject(fields) {
        var o = {};
        Object.keys(fields || {}).forEach(function (k) { o[k] = fromFirestore(fields[k]); });
        return o;
    }

    var api = { esc: esc, todayIso: todayIso, cardHtml: cardHtml, cardsHtml: cardsHtml, optionsHtml: optionsHtml,
                answersHtml: answersHtml, ldJson: ldJson, fieldsToObject: fieldsToObject, offerIsLive: offerIsLive,
                offersHtml: offersHtml, liveOffers: liveOffers, groupOf: groupOf, niceDate: niceDate, isPlus: isPlus, isPremium: isPremium,
                isOpenNow: isOpenNow, refreshOpen: refreshOpen };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.SMLCDirectory = api;
})(typeof window !== 'undefined' ? window : this);
