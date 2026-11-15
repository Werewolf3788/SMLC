/* SMLC Business Directory renderer | v1.0 | 2026-11-15
   One set of markup for both:
     - scripts/build-directory.js (bakes the cards, answers and schema into directory.html
       so Google and AI crawlers can read everything without running JavaScript)
     - directory.html in the browser (re-draws from Firestore when the data is newer)
   Data shape = Firestore document directory/public, written by BusinessFinder.gs v3. */
(function (root) {
    'use strict';
    var SITE = 'https://supportmylocalcommunity.com/';
    var TIER_LABEL = { Premium: 'Featured', Plus: 'Community Partner' };

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
    function offerIsLive(b, today) { return !!b.offer && (!b.validUntil || b.validUntil >= today); }
    function mapsLink(address) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address); }
    function niceDate(iso) {
        var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return '';
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
    }

    function cardHtml(b, today) {
        var tier = TIER_LABEL[b.tier] ? '<span class="tier tier-' + slug(b.tier) + '">' + esc(TIER_LABEL[b.tier]) + '</span>' : '';
        var lines = [];
        if (b.address) lines.push('<li><span aria-hidden="true">&#128205;</span> <a href="' + esc(mapsLink(b.address)) + '" target="_blank" rel="noopener">' + esc(b.address) + '</a></li>');
        if (b.phone) lines.push('<li><span aria-hidden="true">&#128222;</span> <a href="tel:' + esc(b.phone.replace(/\D/g, '')) + '">' + esc(b.phone) + '</a></li>');
        if (b.hours) lines.push('<li><span aria-hidden="true">&#128339;</span> ' + esc(b.hours) + '</li>');
        var links = [];
        if (b.website) links.push('<a class="btn" href="' + esc(b.website) + '" target="_blank" rel="noopener">Website</a>');
        if (b.facebook) links.push('<a class="btn btn-fb" href="' + esc(b.facebook) + '" target="_blank" rel="noopener">Facebook</a>');
        if (b.phone) links.push('<a class="btn btn-call" href="tel:' + esc(b.phone.replace(/\D/g, '')) + '">Call</a>');
        var offer = offerIsLive(b, today)
            ? '<p class="offer"><strong>Offer:</strong> ' + esc(b.offer) + (b.validUntil ? ' <span>(through ' + esc(niceDate(b.validUntil)) + ')</span>' : '') + '</p>'
            : '';
        var bio = b.bio ? '<p class="bio">' + esc(b.bio) + '</p>' : '';
        var hay = [b.name, b.category, b.town, b.address, b.bio, b.offer].join(' ').toLowerCase();
        return '<article class="biz tier-' + slug(b.tier) + '" id="' + esc(b.id) + '" data-town="' + esc(b.town) + '" data-category="' + esc(b.category) + '" data-search="' + esc(hay) + '">' +
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
            var biz = {
                '@type': b.schemaType || 'LocalBusiness',
                '@id': page + '#' + b.id,
                name: b.name,
                description: b.bio || b.summary,
                image: b.image,
                address: postalAddress(b),
                areaServed: { '@type': 'AdministrativeArea', name: 'Clay County, Illinois' }
            };
            if (b.phone) biz.telephone = '+1-' + b.phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
            if (b.website) biz.url = b.website;
            if (b.facebook) biz.sameAs = [b.facebook];
            if (b.openingHours && b.openingHours.length) biz.openingHours = b.openingHours;
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
                answersHtml: answersHtml, ldJson: ldJson, fieldsToObject: fieldsToObject, offerIsLive: offerIsLive };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.SMLCDirectory = api;
})(typeof window !== 'undefined' ? window : this);
