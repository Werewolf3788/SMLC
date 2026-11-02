/* ==========================================================================
   File: smlc-photos-config.js  |  v1  |  2026-11-02 6:00 PM ET
   Shared settings for the photo pages:
     admin/images.html   (signed-in uploader, authorized users only)
     share-photos.html   (public "Share Your Photos")
     gallery.html        (public Clay County Photo Gallery)
   ========================================================================== */
window.SMLC_PHOTOS = {
    // Web app address of SMLCPhotos.gs (Apps Script -> Deploy -> Web app -> copy the /exec link)
    ENDPOINT: '',

    FIREBASE_CONFIG: {
        apiKey: "AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg",
        authDomain: "smlc-fuel-monitor.firebaseapp.com",
        databaseURL: "https://smlc-fuel-monitor-default-rtdb.firebaseio.com",
        projectId: "smlc-fuel-monitor",
        storageBucket: "smlc-fuel-monitor.firebasestorage.app",
        messagingSenderId: "22397440085",
        appId: "1:22397440085:web:c00e716858ed58895bc4dc",
        measurementId: "G-TJRXX8TCT4"
    },

    // Where approved gallery photos live (synced from the Sheet's "Gallery" tab by Code.gs)
    GALLERY_PATH: 'master_county_data/global/sections/gallery',

    // Places, grouped. "value" is what is saved; the label adds the type.
    PLACE_GROUPS: [
        { group: 'Cities & Villages', places: [
            { value: 'Flora', label: 'Flora (City)' },
            { value: 'Louisville', label: 'Louisville (Village — County Seat)' },
            { value: 'Clay City', label: 'Clay City (Village)' },
            { value: 'Xenia', label: 'Xenia (Village)' },
            { value: 'Iola', label: 'Iola (Village)' },
            { value: 'Sailor Springs', label: 'Sailor Springs (Village)' }
        ] },
        { group: 'Unincorporated Communities', places: [
            'Bible Grove', 'Camp Travis', 'Greendale', 'Hoosier', 'Hord', 'Ingraham', 'Kenner', 'Oskaloosa', 'Riffle', 'Wendelin'
        ].map(function (p) { return { value: p, label: p }; }) },
        { group: 'Townships', places: [
            'Bible Grove', 'Blair', 'Clay City', 'Harter', 'Hoosier', 'Larkinsburg', 'Louisville', 'Oskaloosa', 'Pixley', 'Songer', 'Stanford', 'Xenia'
        ].map(function (p) { return { value: p + ' Township', label: p + ' Township' }; }) },
        { group: 'County-wide', places: [ { value: 'Clay County', label: 'Clay County (county-wide)' } ] }
    ],

    /** Fills a <select> with the grouped places */
    fillPlaceSelect: function (select, firstLabel) {
        var html = firstLabel ? '<option value="">' + firstLabel + '</option>' : '';
        this.PLACE_GROUPS.forEach(function (g) {
            html += '<optgroup label="' + g.group + '">' + g.places.map(function (p) {
                return '<option value="' + p.value + '" data-group="' + g.group + '">' + p.label + '</option>';
            }).join('') + '</optgroup>';
        });
        select.innerHTML = html;
    },
    groupOf: function (place) {
        for (var i = 0; i < this.PLACE_GROUPS.length; i++) {
            if (this.PLACE_GROUPS[i].places.some(function (p) { return p.value === place; })) return this.PLACE_GROUPS[i].group;
        }
        return '';
    },

    /** Talks to SMLCPhotos.gs. text/plain avoids the browser's extra CORS check. */
    call: function (payload) {
        if (!this.ENDPOINT) return Promise.reject(new Error('The photo service is not set up yet (no web app address in smlc-photos-config.js).'));
        return fetch(this.ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        }).then(function (r) { return r.json(); }).then(function (res) {
            if (!res || res.ok !== true) throw new Error((res && res.error) || 'Something went wrong.');
            return res;
        });
    },

    /** Resizes a picture in the browser. Returns { base64, mimeType, ext, width, height, bytes } */
    prepareImage: function (blob, maxWidth, forcePng) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(blob);
            var img = new Image();
            img.onload = function () {
                var w = img.naturalWidth, h = img.naturalHeight;
                if (maxWidth && w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                var c = document.createElement('canvas'); c.width = w; c.height = h;
                var x = c.getContext('2d');
                var png = !!forcePng;
                if (forcePng === undefined) {   // auto: keep see-through parts as PNG
                    try {
                        var t = document.createElement('canvas'); t.width = Math.min(w, 300); t.height = Math.max(1, Math.round(h * t.width / w));
                        var tx = t.getContext('2d'); tx.drawImage(img, 0, 0, t.width, t.height);
                        var d = tx.getImageData(0, 0, t.width, t.height).data;
                        for (var i = 3; i < d.length; i += 16) if (d[i] < 250) { png = true; break; }
                    } catch (e) { /* ignore */ }
                }
                if (!png) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
                x.imageSmoothingQuality = 'high';
                x.drawImage(img, 0, 0, w, h);
                c.toBlob(function (out) {
                    var fr = new FileReader();
                    fr.onload = function () {
                        resolve({ base64: String(fr.result).split(',')[1], mimeType: png ? 'image/png' : 'image/jpeg', ext: png ? 'png' : 'jpg', width: w, height: h, bytes: out.size });
                    };
                    fr.onerror = reject;
                    fr.readAsDataURL(out);
                }, png ? 'image/png' : 'image/jpeg', 0.86);
            };
            img.onerror = function () { reject(new Error('That file is not a picture this browser can read.')); };
            img.src = url;
        });
    }
};
