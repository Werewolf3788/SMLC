/* ============================================================================
   SMLC GAS STATIONS - one list used by update-gas.html, index.html and every town page.
   Edit a station HERE and every page picks it up.

   Fields:
     town     page key the station belongs to (flora, louisville, clay-city, xenia, sailor-springs)
     display  town name shown on the monitor
     name     station name
     logo     file in gas-prices/image/
     whiteBg  true when the logo needs a white box behind it
     address  street address ("" = not shown)
     city     "Flora, IL 62839"
     phone    "(618) 555-1234" ("" = not shown)
     hours    text shown to visitors ("" = not shown)
     grades   which prices this station posts: reg, mid, pre, dsl
   Station facts came from the GasBuddy station pages. Fill in the blanks ("") when you have them.
   ============================================================================ */
window.SMLC_STATIONS = {
    "48100":  { town: "flora", display: "Flora", name: "CASEY'S", logo: "Casey's.png",
                address: "902 W North Ave", city: "Flora, IL 62839", phone: "(618) 356-1390", hours: "5 AM - 10 PM daily",
                grades: ["reg", "dsl"] },
    "48101":  { town: "flora", display: "Flora", name: "HUCK'S", logo: "Hucks.png",
                address: "232 W North Ave", city: "Flora, IL 62839", phone: "(618) 662-2426", hours: "Open 24 hours",
                grades: ["reg", "mid", "pre", "dsl"] },
    "128128": { town: "flora", display: "Flora", name: "MACH 1", logo: "Mach 1.png", whiteBg: true,
                address: "1433 N State Rd", city: "Flora, IL 62839", phone: "", hours: "",
                grades: ["reg", "mid", "pre", "dsl"] },
    "120226": { town: "flora", display: "Flora", name: "FAST STOP", logo: "Fast stop.png",
                address: "11109 Old US-50", city: "Flora, IL 62839", phone: "", hours: "",
                grades: ["reg", "dsl"] },
    "87817":  { town: "louisville", display: "Louisville", name: "CASEY'S", logo: "Casey's.png",
                address: "300 Route 45 S", city: "Louisville, IL 62858", phone: "", hours: "",
                grades: ["reg", "dsl"] },
    "48026":  { town: "clay-city", display: "Clay City", name: "CASEY'S", logo: "Casey's.png",
                address: "", city: "Clay City, IL", phone: "", hours: "",
                grades: ["reg", "mid", "pre", "dsl"] },
    "171711": { town: "xenia", display: "Xenia", name: "CITGO", logo: "Citgo.png",
                address: "1500 Church St", city: "Xenia, IL 62899", phone: "", hours: "",
                grades: ["reg", "mid", "dsl"] }
};

/* Grade labels, in the order they are shown (Regular on top, Diesel on the bottom). */
window.SMLC_GRADES = [
    { key: "reg", label: "REGULAR" },
    { key: "mid", label: "MIDGRADE" },
    { key: "pre", label: "PREMIUM" },
    { key: "dsl", label: "DIESEL" }
];

/* Small helpers shared by the pages. */
window.smlcMapsUrl = function (st) {
    const q = [st.name, st.address, st.city].filter(Boolean).join(", ");
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
};
window.smlcTelUrl = function (phone) { return "tel:+1" + String(phone || "").replace(/\D/g, ""); };
