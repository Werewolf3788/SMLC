/* ==========================================================================
   Active Version: 2026-11-15_v3.6  |  Updated: Nov 15, 2026 6:20 AM ET
   Changes in v3.6: Google Maps + Business ID cells turn green when a Maps link has been
                  looked up, yellow when a link is waiting for "Fill blanks from Google Maps".
   Changes in v3.5: Menu -> "Check Clay County (all rows)": writes a County Check column
                  using the free U.S. Census address lookup + town/ZIP/state/area-code checks.
   Changes in v3.4: AEO text follows the tiers - Basic: name + category + town;
                  Plus: + address, phone, hours; Premium: everything.
   Changes in v3.3: Business Cards is written by this script (no formula to break):
                  every ticked Master Data row, sorted by name. Ticking/unticking Include
                  updates Business Cards AND Firestore right away. Anything typed straight
                  into Business Cards is moved into Master Data (ticked) instead of lost.
   Changes in v3.2: a row with ONLY a Maps link becomes a full new business: name, town,
                  category, tier "Basic", logo placeholder (show box stays unticked);
                  warns when the same Google place is already on another row.
   Changes in v3.1: Master Data column O "Google Maps" (a Maps share link or a plus code).
                  Menu -> "Fill blanks from Google Maps (column O)" fills empty Address /
                  phone / website / hours cells; the website's address links open that exact spot.
   Changes in v3: sends the directory to Firestore (Firebase project smlc-fuel-monitor)
                  with AEO data (plain-English summary, schema.org type, opening hours,
                  "Where can I find ... in <town>?" answers) for the SMLC directory page.
   Changes in v2: tries 4 OpenStreetMap servers (fixes "Address unavailable")
   File: BusinessFinder.gs (Google Apps Script - goes in the DIRECTORY sheet)
   Project: Clay County Business Directory - Business Finder + Firestore sync

   Finds Clay County businesses and lists them on their OWN tab
   ("Business Finder") so Master Data is never touched automatically.

   HOW TO USE
     1. Paste this file into the Directory sheet: Extensions -> Apps Script ->
        + (Add a file) -> Script -> name it BusinessFinder -> paste -> Save.
     2. Run installBusinessFinderMenu once (approve the permissions).
        Reload the sheet: a "Business Finder" menu appears at the top.
     3. Business Finder menu -> "Find businesses (OpenStreetMap - free)".
        Or, once Google Cloud billing is on and PLACES_API_KEY is saved in
        Project Settings -> Script Properties:
        "Find businesses (Google)".
     4. Look over the new rows. Tick the box in Column A for the ones you want.
     5. Business Finder menu -> "Copy ticked rows to Master Data".
        They are added at the BOTTOM of Master Data with the show box
        UNTICKED, so nothing appears in the directory until you tick it there.

   FIRESTORE (v3) - see the FIRESTORE SYNC section near the bottom for setup.
     Business Finder menu -> "Send directory to Firestore now"
     Business Finder menu -> "Turn on automatic sync (instant + every 15 min)"
     Only rows with "Include in directory" ticked are sent. Ticking / unticking
     updates Business Cards and the website right away; other edits within 15 min.
     Business Cards is written by this script - add businesses in Master Data only.

   DUPLICATES
     Every business gets a Business ID (Google's place ID, or the OpenStreetMap ID).
     The same Business ID is never listed twice on the Business Finder tab.
     Everything else is listed with a Status so you can decide:
       New                          - not in Master Data
       Already in directory (X)     - same name + street number, or same address
                                      AND same phone as X in Master Data
       Check: same phone as X       - some listings share phones (e.g. the Bailey businesses)
       Check: same address as X
       Check: same name as X (different address) - e.g. another Dollar General
   ========================================================================== */

var BF_VERSION = "v3.6 - Nov 15, 2026 6:20 AM ET";

// ---- Settings ----------------------------------------------------------------
var BF_TAB = "Business Finder";
var BF_MASTER_TAB = "Master Data";

// Master Data layout: A = show box, B..N = these columns (same as Business Cards)
var BF_MASTER_COLUMNS = ["name", "town", "phone", "category", "tier", "ImageID", "website",
                         "Address", "hours", "facebook", "offer", "validuntil", "company-bio"];

// Business Finder tab layout: A = "Add?" box, then the Master Data columns, then extras
var BF_HEADERS = ["Add?"].concat(BF_MASTER_COLUMNS).concat(["Business ID", "Status", "Google Maps", "Source", "Found On"]);
var BF_COL = {};
BF_HEADERS.forEach(function(h, i) { BF_COL[h] = i; });

// Clay County, IL (rough box around the county) - results outside the towns below are dropped
var BF_BOX = { south: 38.56, west: -88.71, north: 38.92, east: -88.25 };
var BF_TOWNS = ["Flora", "Louisville", "Clay City", "Xenia", "Sailor Springs", "Iola", "Bible Grove",
                "Ingraham", "Hord", "Oskaloosa", "Larkinsburg", "Pixley", "Songer", "Stanford", "Blair", "Harter", "Hoosier"];
var BF_ZIP_TOWN = { "62839": "Flora", "62858": "Louisville", "62824": "Clay City", "62899": "Xenia",
                    "62879": "Sailor Springs", "62838": "Iola", "62434": "Ingraham" };

// What to search for with Google (one search per line, up to 60 results each)
var BF_GOOGLE_SEARCHES = [
  "restaurant", "cafe", "bar", "grocery store", "convenience store", "gas station",
  "auto repair", "car dealer", "tire shop", "hardware store", "farm supply", "feed store",
  "hair salon", "barber shop", "nail salon", "insurance agency", "bank", "credit union",
  "accountant", "tax preparation", "lawyer", "real estate agency", "dentist", "doctor",
  "pharmacy", "veterinarian", "church", "school", "daycare", "florist", "gift shop",
  "clothing store", "thrift store", "furniture store", "plumber", "electrician", "hvac contractor",
  "roofing contractor", "construction company", "storage", "hotel", "funeral home",
  "fitness center", "pet groomer", "towing", "trucking company", "grain elevator", "manufacturer"
];

// ---- Menu ---------------------------------------------------------------------
/** Run once by hand: adds the "Business Finder" menu every time the sheet opens. */
function installBusinessFinderMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "addBusinessFinderMenu") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("addBusinessFinderMenu").forSpreadsheet(ss).onOpen().create();
  addBusinessFinderMenu();
  ss.toast("Business Finder menu installed. Reload the sheet if you don't see it.");
}

function addBusinessFinderMenu() {
  SpreadsheetApp.getUi().createMenu("Business Finder")
    .addItem("Find businesses (OpenStreetMap - free)", "findBusinessesOSM")
    .addItem("Find businesses (Google)", "findBusinessesGoogle")
    .addSeparator()
    .addItem("Copy ticked rows to Master Data", "copyTickedToMasterData")
    .addItem("Fill blanks from Google Maps (column O)", "fillFromGoogleMaps")
    .addItem("Check Clay County (all rows)", "checkClayCounty")
    .addItem("Color the Google Maps column", "colorMapsColumn")
    .addItem("Re-check duplicates", "recheckDuplicates")
    .addSeparator()
    .addItem("Send directory to Firestore now", "syncDirectoryToFirestore")
    .addItem("Turn on automatic sync (instant + every 15 min)", "installDirectorySyncTrigger")
    .addItem("Rebuild Business Cards now", "rebuildBusinessCardsNow")
    .addItem("Test Firestore connection", "testFirestoreConnection")
    .addSeparator()
    .addItem("Which version is this?", "showBusinessFinderVersion")
    .addToUi();
}

function showBusinessFinderVersion() {
  SpreadsheetApp.getUi().alert("Business Finder " + BF_VERSION);
}

// ---- Shared helpers -----------------------------------------------------------
function bfSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BF_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(BF_TAB);
    sheet.getRange(1, 1, 1, BF_HEADERS.length).setValues([BF_HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1).setNote("Tick the rows you want, then Business Finder menu -> Copy ticked rows to Master Data.");
    sheet.getRange(1, BF_COL["Status"] + 1).setNote(
      "New = not in the directory yet\n" +
      "Check: ... = maybe a duplicate, look before adding\n" +
      "Already in directory = same name + street number is in Master Data\n" +
      "Added = copied to Master Data");
  }
  return sheet;
}

function bfNorm_(s) {
  return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}
function bfPhoneDigits_(s) {
  var d = String(s || "").replace(/\D/g, "");
  return d.length === 11 && d.charAt(0) === "1" ? d.slice(1) : d;
}
function bfStreetNumber_(address) {
  var m = String(address || "").match(/^\s*(\d+)/);
  return m ? m[1] : "";
}
/** name + street number, e.g. "caseysflora|902" */
/** "902 W North Ave" -> "902wnorthave" (street part only) */
function bfStreetKey_(address) {
  var street = String(address || "").split(",")[0];
  return bfStreetNumber_(street) ? bfNorm_(street.replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|highway|hwy|route|rt|us)\b\.?/gi, "")) : "";
}
function bfNameKey_(name, address) {
  return bfNorm_(name).replace(/^the/, "") + "|" + bfStreetNumber_(address);
}
function bfFormatPhone_(raw) {
  var d = bfPhoneDigits_(raw);
  return d.length === 10 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : String(raw || "");
}
function bfTownFromAddress_(address, fallbackTown) {
  var a = String(address || "");
  for (var i = 0; i < BF_TOWNS.length; i++) {
    if (new RegExp("\\b" + BF_TOWNS[i].replace(/ /g, "\\s+") + "\\b", "i").test(a)) return BF_TOWNS[i];
  }
  var zip = (a.match(/\b(\d{5})\b(?!.*\b\d{5}\b)/) || [])[1];
  if (zip && BF_ZIP_TOWN[zip]) return BF_ZIP_TOWN[zip];
  return fallbackTown || "";
}
function bfTitle_(s) {
  return String(s || "").replace(/_/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

/** Everything already known: Master Data names/phones and Business Finder IDs */
function bfKnown_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var known = { ids: {}, nameKeys: {}, phones: {}, streets: {} };

  var master = ss.getSheetByName(BF_MASTER_TAB);
  if (master && master.getLastRow() > 1) {
    var mHead = master.getRange(1, 1, 1, master.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var cName = mHead.indexOf("name"), cAddr = mHead.indexOf("address"), cPhone = mHead.indexOf("phone"), cId = mHead.indexOf("business id");
    master.getRange(2, 1, master.getLastRow() - 1, master.getLastColumn()).getValues().forEach(function(r) {
      var name = cName >= 0 ? r[cName] : "";
      if (!name) return;
      if (cAddr >= 0) known.nameKeys[bfNameKey_(name, r[cAddr])] = String(name);
      known.nameKeys[bfNorm_(name).replace(/^the/, "") + "|"] = String(name);  // name with no street number
      var p = cPhone >= 0 ? bfPhoneDigits_(r[cPhone]) : "";
      if (p.length === 10) known.phones[p] = String(name);
      var sk = cAddr >= 0 ? bfStreetKey_(r[cAddr]) : "";
      if (sk) known.streets[sk] = { name: String(name), phone: p };
      if (cId >= 0 && r[cId]) known.ids[String(r[cId]).trim()] = "master";
    });
  }

  var bf = bfSheet_();
  if (bf.getLastRow() > 1) {
    bf.getRange(2, BF_COL["Business ID"] + 1, bf.getLastRow() - 1, 1).getValues().forEach(function(r) {
      if (r[0]) known.ids[String(r[0]).trim()] = "finder";
    });
  }
  return known;
}

/** "New" / "Check: same phone as X" / "Already in directory (X)" */
function bfStatus_(biz, known) {
  var key = bfNameKey_(biz.name, biz.address);
  var bare = bfNorm_(biz.name).replace(/^the/, "") + "|";
  if (known.nameKeys[key]) return "Already in directory (" + known.nameKeys[key] + ")";
  if (!bfStreetNumber_(biz.address) && known.nameKeys[bare]) return "Already in directory (" + known.nameKeys[bare] + ")";
  var p = bfPhoneDigits_(biz.phone);
  var sameStreet = known.streets[bfStreetKey_(biz.address)];
  if (sameStreet && p.length === 10 && sameStreet.phone === p) return "Already in directory (" + sameStreet.name + ")";
  if (p.length === 10 && known.phones[p]) return "Check: same phone as " + known.phones[p];
  if (sameStreet) return "Check: same address as " + sameStreet.name;
  if (known.nameKeys[bare]) return "Check: same name as " + known.nameKeys[bare] + " (different address)";
  return "New";
}

/** Adds found businesses to the Business Finder tab (skips IDs already listed). */
function bfAppend_(found, source) {
  var sheet = bfSheet_();
  var known = bfKnown_();
  var now = new Date();
  var rows = [];
  found.forEach(function(b) {
    if (!b.id || known.ids[b.id]) return;          // already listed
    known.ids[b.id] = "finder";
    var status = bfStatus_(b, known);
    var row = BF_HEADERS.map(function() { return ""; });
    row[BF_COL["Add?"]] = false;
    row[BF_COL["name"]] = b.name;
    row[BF_COL["town"]] = b.town;
    row[BF_COL["phone"]] = b.phone;
    row[BF_COL["category"]] = b.category;
    row[BF_COL["tier"]] = "Basic";
    row[BF_COL["ImageID"]] = "localbusiness.png";
    row[BF_COL["website"]] = b.website;
    row[BF_COL["Address"]] = b.address;
    row[BF_COL["hours"]] = b.hours;
    row[BF_COL["Business ID"]] = b.id;
    row[BF_COL["Status"]] = status;
    row[BF_COL["Google Maps"]] = b.mapsUrl;
    row[BF_COL["Source"]] = source;
    row[BF_COL["Found On"]] = now;
    rows.push(row);
  });
  if (rows.length) {
    var start = sheet.getLastRow() + 1;
    sheet.getRange(start, 1, rows.length, BF_HEADERS.length).setValues(rows);
    sheet.getRange(start, 1, rows.length, 1).insertCheckboxes();
    sheet.getRange(start, BF_COL["Found On"] + 1, rows.length, 1).setNumberFormat("m/d/yyyy");
  }
  SpreadsheetApp.getActiveSpreadsheet().toast(rows.length + " new businesses added to the " + BF_TAB + " tab.", "Business Finder", 8);
  Logger.log(rows.length + " new businesses added (" + found.length + " found).");
  return rows.length;
}

// ---- Source 1: OpenStreetMap (free, no key) -----------------------------------
// OpenStreetMap has several public servers; if one is down or refuses Google's
// servers ("Address unavailable"), the next one is tried.
var BF_OVERPASS_SERVERS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];

function bfOverpass_(query) {
  var errors = [];
  for (var i = 0; i < BF_OVERPASS_SERVERS.length; i++) {
    var url = BF_OVERPASS_SERVERS[i];
    try {
      var resp = UrlFetchApp.fetch(url + "?data=" + encodeURIComponent(query), {
        method: "get",
        muteHttpExceptions: true,
        headers: { "User-Agent": "SMLC-Business-Finder/1.0 (supportmylocalcommunity.com)" }
      });
      var code = resp.getResponseCode();
      var text = resp.getContentText();
      if (code === 200 && text.charAt(0) === "{") {
        Logger.log("OpenStreetMap server used: " + url);
        return JSON.parse(text);
      }
      errors.push(url + " -> HTTP " + code);
    } catch (e) {
      errors.push(url + " -> " + e.message);
    }
    Utilities.sleep(1000);
  }
  throw new Error("All OpenStreetMap servers failed. Try again in a few minutes.\n" + errors.join("\n"));
}

function findBusinessesOSM() {
  Logger.log("Business Finder " + BF_VERSION);
  var bbox = [BF_BOX.south, BF_BOX.west, BF_BOX.north, BF_BOX.east].join(",");
  var q = '[out:json][timeout:60];(' +
    'nwr["name"]["shop"](' + bbox + ');' +
    'nwr["name"]["amenity"~"restaurant|cafe|fast_food|bar|pub|bank|pharmacy|dentist|doctors|clinic|hospital|veterinary|fuel|car_wash|car_rental|place_of_worship|school|kindergarten|childcare|post_office|townhall|library|police|fire_station|fitness_centre"](' + bbox + ');' +
    'nwr["name"]["office"](' + bbox + ');' +
    'nwr["name"]["craft"](' + bbox + ');' +
    'nwr["name"]["tourism"~"hotel|motel|guest_house|camp_site|attraction|museum"](' + bbox + ');' +
    ');out center tags;';
  var json = bfOverpass_(q);

  var found = [];
  (json.elements || []).forEach(function(el) {
    var t = el.tags || {};
    var street = [t["addr:housenumber"], t["addr:street"]].filter(String).join(" ");
    var city = t["addr:city"] || "";
    var address = [street, city ? city + ", IL" + (t["addr:postcode"] ? " " + t["addr:postcode"] : "") : ""].filter(String).join(", ");
    var town = bfTownFromAddress_(address, city);
    if (!town) return;  // can't tell which Clay County town it's in
    var lat = el.lat || (el.center && el.center.lat), lon = el.lon || (el.center && el.center.lon);
    found.push({
      id: "osm:" + el.type + "/" + el.id,
      name: t.name,
      town: town,
      phone: bfFormatPhone_(t.phone || t["contact:phone"] || ""),
      category: bfTitle_(t.shop || t.amenity || t.office || t.craft || t.tourism || ""),
      website: t.website || t["contact:website"] || "",
      address: address,
      hours: t.opening_hours || "",
      mapsUrl: lat && lon ? "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lon : ""
    });
  });
  return bfAppend_(found, "OpenStreetMap");
}

// ---- Source 2: Google Places API (New) ----------------------------------------
// Needs Google Cloud billing on, "Places API (New)" enabled, and Script Property PLACES_API_KEY.
// Each search line costs 1-3 calls (20 results per call). Run it in batches if you like:
// it skips businesses that are already on the tab.
function findBusinessesGoogle() {
  var key = PropertiesService.getScriptProperties().getProperty("PLACES_API_KEY");
  if (!key) throw new Error("Missing Script Property PLACES_API_KEY (Project Settings -> Script Properties).");

  var fields = ["places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
                "places.websiteUri", "places.regularOpeningHours.weekdayDescriptions", "places.primaryTypeDisplayName",
                "places.businessStatus", "places.googleMapsUri", "nextPageToken"].join(",");
  var byId = {};
  var started = Date.now();

  for (var s = 0; s < BF_GOOGLE_SEARCHES.length; s++) {
    if (Date.now() - started > 5 * 60 * 1000) {   // stay under Apps Script's 6-minute limit
      Logger.log("Stopping early to avoid the time limit - run again to continue.");
      break;
    }
    var pageToken = "";
    for (var page = 0; page < 3; page++) {
      var body = {
        textQuery: BF_GOOGLE_SEARCHES[s] + " in Clay County, Illinois",
        pageSize: 20,
        locationRestriction: { rectangle: {
          low: { latitude: BF_BOX.south, longitude: BF_BOX.west },
          high: { latitude: BF_BOX.north, longitude: BF_BOX.east } } }
      };
      if (pageToken) body.pageToken = pageToken;
      var resp = UrlFetchApp.fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "post", contentType: "application/json",
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields },
        payload: JSON.stringify(body), muteHttpExceptions: true
      });
      if (resp.getResponseCode() !== 200) {
        Logger.log("Google search failed for '" + BF_GOOGLE_SEARCHES[s] + "': " + resp.getContentText().slice(0, 300));
        break;
      }
      var data = JSON.parse(resp.getContentText());
      (data.places || []).forEach(function(p) {
        if (!p.id || byId[p.id]) return;
        if (p.businessStatus && p.businessStatus !== "OPERATIONAL") return;   // skip closed businesses
        var address = String(p.formattedAddress || "").replace(/, USA$/, "");
        var town = bfTownFromAddress_(address, "");
        if (!town) return;
        var hours = ((p.regularOpeningHours || {}).weekdayDescriptions || [])
          .map(function(d) { return d.replace(/^(\w{3})\w*day/, "$1").replace(/ | /g, " "); }).join("; ");
        byId[p.id] = {
          id: p.id,
          name: (p.displayName || {}).text || "",
          town: town,
          phone: bfFormatPhone_(p.nationalPhoneNumber || ""),
          category: (p.primaryTypeDisplayName || {}).text || bfTitle_(BF_GOOGLE_SEARCHES[s]),
          website: p.websiteUri || "",
          address: address,
          hours: hours,
          mapsUrl: p.googleMapsUri || ""
        };
      });
      pageToken = data.nextPageToken || "";
      if (!pageToken) break;
      Utilities.sleep(1500);   // Google needs a moment before the next page is ready
    }
  }
  return bfAppend_(Object.keys(byId).map(function(k) { return byId[k]; }), "Google");
}

// ---- Copy approved rows ---------------------------------------------------------
/** Copies ticked Business Finder rows to the bottom of Master Data (show box UNTICKED). */
function copyTickedToMasterData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bf = bfSheet_();
  var master = ss.getSheetByName(BF_MASTER_TAB);
  if (!master) throw new Error("Tab '" + BF_MASTER_TAB + "' not found.");
  if (bf.getLastRow() < 2) return;

  // Make sure Master Data has a "Business ID" column (added at the far right, header only)
  var lastCol = master.getLastColumn();
  var mHead = master.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var idCol = mHead.indexOf("business id");
  if (idCol === -1) {
    idCol = lastCol;                       // 0-based index of the new column
    master.getRange(1, idCol + 1).setValue("Business ID")
      .setNote("Filled by Business Finder. Used to avoid adding the same business twice.");
  }

  var mapsCol = mHead.indexOf("google maps");
  var rows = bf.getRange(2, 1, bf.getLastRow() - 1, BF_HEADERS.length).getValues();
  var out = [], doneRows = [];
  rows.forEach(function(r, i) {
    if (r[BF_COL["Add?"]] !== true) return;
    if (String(r[BF_COL["Status"]]).indexOf("Added") === 0) return;
    var line = [];
    for (var c = 0; c <= Math.max(idCol, mapsCol, BF_MASTER_COLUMNS.length); c++) line.push("");
    line[0] = false;                                         // A = show box, unticked
    BF_MASTER_COLUMNS.forEach(function(col, j) { line[j + 1] = r[BF_COL[col]]; });   // B..N
    line[idCol] = r[BF_COL["Business ID"]];
    if (mapsCol >= 0) line[mapsCol] = r[BF_COL["Google Maps"]];
    out.push(line);
    doneRows.push(i + 2);
  });
  if (!out.length) { ss.toast("No ticked rows to copy.", "Business Finder", 6); return; }

  var width = out[0].length;
  var start = master.getLastRow() + 1;
  master.getRange(start, 1, out.length, width).setValues(out);
  master.getRange(start, 1, out.length, 1).insertCheckboxes();

  doneRows.forEach(function(rowNum) {
    bf.getRange(rowNum, BF_COL["Status"] + 1).setValue("Added " + Utilities.formatDate(new Date(), "America/Chicago", "M/d/yyyy"));
    bf.getRange(rowNum, 1).setValue(false);
  });
  ss.toast(out.length + " businesses copied to the bottom of Master Data (show box unticked).", "Business Finder", 8);
}

/** Updates the Status column (e.g. after you add businesses to Master Data by hand). */
function recheckDuplicates() {
  var bf = bfSheet_();
  if (bf.getLastRow() < 2) return;
  var known = bfKnown_();
  var range = bf.getRange(2, 1, bf.getLastRow() - 1, BF_HEADERS.length);
  var rows = range.getValues();
  var statuses = rows.map(function(r) {
    var current = String(r[BF_COL["Status"]]);
    if (current.indexOf("Added") === 0) return [current];
    return [bfStatus_({ name: r[BF_COL["name"]], address: r[BF_COL["Address"]], phone: r[BF_COL["phone"]] }, known)];
  });
  bf.getRange(2, BF_COL["Status"] + 1, statuses.length, 1).setValues(statuses);
  SpreadsheetApp.getActiveSpreadsheet().toast("Duplicate check updated.", "Business Finder", 5);
}

/* ==========================================================================
   FIRESTORE SYNC + AEO (v3)
   Sends every Master Data row with "Include in directory" ticked to Firestore:
     businesses/{id}      one document per business (for future admin tools)
     directory/public     the whole directory in ONE document (the website reads
                          this once per visit) + AEO answers per town
   Only changed businesses are written, so it stays inside Firebase's free usage.

   ONE-TIME SETUP (Scott's Google account runs this script, so his account needs
   permission to write to the smlc-fuel-monitor Firebase project):
     1. Firebase console (owner) -> Project settings -> Users and permissions ->
        Add member: skventuresigns@gmail.com, role Editor.
     2. Apps Script -> Project Settings -> tick "Show appsscript.json manifest file in editor".
        Open appsscript.json and add the "oauthScopes" list from apps-script/
        appsscript.directory.json (it keeps every permission Business Finder needs
        and adds Firestore: https://www.googleapis.com/auth/datastore).
     3. Business Finder menu -> "Test Firestore connection".
     4. Business Finder menu -> "Send directory to Firestore now", then
        "Turn on automatic sync (every 15 min)".
   ========================================================================== */

var DIR_PROJECT = "smlc-fuel-monitor";
var DIR_DB = "projects/" + DIR_PROJECT + "/databases/(default)/documents";
var DIR_API = "https://firestore.googleapis.com/v1/";
var DIR_IMAGE_BASE = "https://raw.githubusercontent.com/skventuresigns-design/media/main/";
var DIR_PAGE_URL = "https://supportmylocalcommunity.com/directory.html";
var DIR_TOWNS = ["Flora", "Louisville", "Clay City", "Xenia", "Sailor Springs", "Iola", "Bible Grove",
                 "Ingraham", "Hord", "Wendelin", "Rinard"];
var DIR_TIER_ORDER = { "Premium": 0, "Plus": 1, "Basic": 2 };

// ---- Cleaning helpers ----------------------------------------------------------
function dirClean_(v) {
  var s = String(v === null || v === undefined ? "" : v).replace(/\s+/g, " ").trim();
  return /^(n\/?a|none|null|-|tbd|find)$/i.test(s) ? "" : s;
}
function dirUrl_(v) {
  var s = dirClean_(v);
  if (!s) return "";
  var wrapped = s.match(/google\.[a-z.]+\/search\?q=(https?[^&\s]+)/i);   // "google.com/search?q=https://facebook..." -> the real link
  if (wrapped) s = decodeURIComponent(wrapped[1]);
  if (/\s/.test(s) || s.indexOf(".") < 0) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  return s.replace(/^http:\/\//i, "https://");
}
function dirPhone_(v) {
  var d = String(v || "").replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  return d.length === 10 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : "";
}
function dirAddress_(v) {
  return dirClean_(v).replace(/^find\s*,\s*/i, "").replace(/,\s*IL\s*,\s*(\d{5})/i, ", IL $1").replace(/IL(\d{5})/, "IL $1");
}
function dirTown_(town, address) {
  var t = dirClean_(town);
  for (var i = 0; i < DIR_TOWNS.length; i++) if (t.toLowerCase() === DIR_TOWNS[i].toLowerCase()) return DIR_TOWNS[i];
  var fromAddr = bfTownFromAddress_(address, "");
  if (fromAddr) return fromAddr;
  var zip = (t.match(/\b(\d{5})\b/) || [])[1];
  if (zip && BF_ZIP_TOWN[zip]) return BF_ZIP_TOWN[zip];
  return t.replace(/^IL\s*/i, "") || "Clay County";
}
function dirTier_(v) {
  var t = dirClean_(v).toLowerCase();
  return t === "premium" ? "Premium" : t === "plus" ? "Plus" : "Basic";
}
function dirImage_(v) {
  var s = dirClean_(v);
  if (!s || /^placeholder\./i.test(s)) s = "localbusiness.png";
  return /^https?:\/\//i.test(s) ? s : DIR_IMAGE_BASE + encodeURI(s);
}
function dirDate_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, "America/Chicago", "yyyy-MM-dd");
  var s = dirClean_(v);
  if (!s) return "";
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
}
function dirSlug_(s) {
  return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

// ---- AEO helpers -----------------------------------------------------------------
// schema.org type for each category (what Google and AI tools use to understand a business)
function dirSchemaType_(category, name) {
  var byCategory = dirSchemaMatch_(String(category || "").toLowerCase());
  if (byCategory === "NGO" && /church|baptist|methodist|catholic|christian church/i.test(name)) return "Church";
  if (byCategory !== "LocalBusiness") return byCategory;
  return dirSchemaMatch_(String(name || "").toLowerCase().replace(/clay county|clay city/g, ""));
}
function dirSchemaMatch_(c) {
  var map = [
    [/restaurant|diner|cafe|pizza|grill|ice cream|food/, "Restaurant"], [/\bbar\b|saloon|lounge|tavern/, "BarOrPub"],
    [/gas station|fuel/, "GasStation"], [/hardware/, "HardwareStore"], [/grocery/, "GroceryStore"],
    [/florist/, "Florist"], [/beauty|salon|barber/, "BeautySalon"], [/auto repair|automotive|tire|auto body/, "AutoRepair"],
    [/auto parts/, "AutoPartsStore"], [/insurance/, "InsuranceAgency"], [/legal|law/, "Attorney"],
    [/real estate|realty/, "RealEstateAgent"], [/lodging|hotel|inn\b|motel/, "LodgingBusiness"],
    [/hospital/, "Hospital"], [/healthcare|clinic|medical|counseling|health/, "MedicalOrganization"],
    [/dentist/, "Dentist"], [/police|sheriff/, "PoliceStation"], [/fire/, "FireStation"],
    [/emergency/, "EmergencyService"], [/school|academy|education/, "EducationalOrganization"],
    [/church|baptist|christian|methodist|catholic/, "Church"], [/government|township|village hall|city of|county|post office/, "GovernmentOffice"],
    [/bank|banking|financial/, "FinancialService"], [/bookkeeping|accounting|tax|cpa/, "AccountingService"],
    [/non-profit|nonprofit|legion|club|society|association/, "NGO"], [/library/, "Library"],
    [/retail|store|boutique|general|walmart|furniture/, "Store"]
  ];
  for (var i = 0; i < map.length; i++) if (map[i][0].test(c)) return map[i][1];
  return "LocalBusiness";
}

// "Mon-Sat 8AM-7PM; Sun 10AM-5PM" -> ["Mo-Sa 08:00-19:00", "Su 10:00-17:00"]  (empty when unclear)
function dirOpeningHours_(hours) {
  var h = dirClean_(hours);
  if (!h) return [];
  if (/^(24 ?hours|24\/7|24hrs.*|open 24 hours)$/i.test(h)) return ["Mo-Su 00:00-23:59"];
  var days = { mon: "Mo", tue: "Tu", wed: "We", thu: "Th", fri: "Fr", sat: "Sa", sun: "Su" };
  function t24(x) {
    var m = String(x).trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)$/);
    if (!m) return "";
    var hr = +m[1] % 12; if (m[3].charAt(0) === "p") hr += 12;
    return ("0" + hr).slice(-2) + ":" + (m[2] || "00");
  }
  var out = [];
  var parts = h.split(/;\s*/);
  for (var i = 0; i < parts.length; i++) {
    var m = parts[i].match(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s*(?:-\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?)?\s+(\d{1,2}(?::\d{2})?\s*[ap]m?)\s*-\s*(\d{1,2}(?::\d{2})?\s*[ap]m?)$/i);
    if (!m) return [];                       // one unclear part -> leave hours out of the schema
    var d1 = days[m[1].toLowerCase()], d2 = m[2] ? days[m[2].toLowerCase()] : "";
    var a = t24(m[3]), b = t24(m[4]);
    if (!a || !b) return [];
    if (b === "00:00") b = "23:59";
    out.push((d2 ? d1 + "-" + d2 : d1) + " " + a + "-" + b);
  }
  return out;
}

// Category -> words people (and AI tools) actually use: "Automotive" -> "auto shop"
var DIR_PHRASES = {
  "agriculture": "farm or agriculture business", "automotive": "auto shop", "auto repair": "auto repair shop",
  "beauty": "beauty salon or barber shop", "bookkeeping": "tax and bookkeeping service", "butcher": "butcher shop",
  "delivery": "delivery service", "education": "school", "emergency": "emergency service", "financial": "bank",
  "gaming": "gaming parlor", "gas station": "gas station", "government": "government office",
  "hardware": "hardware store", "healthcare": "healthcare provider", "insurance": "insurance agency",
  "legal": "law office", "lodging": "hotel", "manufacturing": "manufacturer", "non-profit": "non-profit organization",
  "real estate": "real estate agency", "recreation": "recreation group", "restaurant": "restaurant",
  "retail": "store", "retail/grocery": "grocery store", "service": "local service business",
  "services": "local service business", "wholesale": "wholesale distributor", "florist": "florist"
};
function dirPhrase_(category) {
  var c = String(category || "").trim().toLowerCase();
  if (!c) return "local business";
  return DIR_PHRASES[c] || c.replace(/\//g, " and ");
}
function dirA_(phrase) { return (/^[aeiou]/i.test(phrase) ? "an " : "a ") + phrase; }

// One plain sentence AI tools can quote word for word
function dirSummary_(b) {
  var s = b.name + " is " + dirA_(dirPhrase_(b.category)) + " in " + b.town + ", Illinois (Clay County)";
  var plus = b.tier === "Plus" || b.tier === "Premium";           // Basic listings: name, category, town only
  if (plus && b.address) s += ", located at " + b.address;
  s += ".";
  if (plus && b.phone) s += " Phone: " + b.phone + ".";
  if (plus && b.hours) s += " Hours: " + b.hours.replace(/\.$/, "") + ".";
  return s;
}

// "Where can I find a gas station in Flora, IL?" -> names, for every town + category with listings
function dirAnswers_(list) {
  var groups = {};
  list.forEach(function(b) {
    if (!b.category) return;
    var key = b.town + "|" + b.category;
    (groups[key] = groups[key] || []).push(b);
  });
  return Object.keys(groups).sort().map(function(key) {
    var town = key.split("|")[0], cat = key.split("|")[1], items = groups[key];
    var what = dirPhrase_(cat);
    var names = items.map(function(b) {
      var street = (b.tier === "Plus" || b.tier === "Premium") && b.address ? b.address.split(",")[0].trim() : "";
      return b.name + (street && street.toLowerCase() !== town.toLowerCase() && /\d/.test(street) ? " (" + street + ")" : "");
    });
    var last = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
    return {
      town: town, category: cat,
      q: "Where can I find " + dirA_(what) + " in " + town + ", IL?",
      a: "In " + town + ", Illinois: " + last.replace(/\.$/, "") + ". Listed in the Clay County Business Directory by Support My Local Community."
    };
  });
}

// ---- Read Master Data -> clean business records -----------------------------------
function dirReadMasterData_(values) {
  var head = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
  function col(name) { return head.indexOf(name); }
  var c = {
    show: col("include in directory") >= 0 ? col("include in directory") : 0,
    name: col("name"), town: col("town"), phone: col("phone"), category: col("category"), tier: col("tier"),
    image: col("imageid"), website: col("website"), address: col("address"), hours: col("hours"),
    facebook: col("facebook"), offer: col("offer"), until: col("validuntil"), bio: col("company-bio"), id: col("business id"),
    maps: dirMapsHeaderIndex_(head)
  };
  function get(r, k) { return c[k] >= 0 && c[k] < r.length ? r[c[k]] : ""; }
  var used = {}, list = [];
  values.slice(1).forEach(function(r) {
    var show = get(r, "show");
    if (!(show === true || String(show).toUpperCase() === "TRUE")) return;
    var name = dirClean_(get(r, "name"));
    if (!name || /^test$/i.test(name)) return;
    var address = dirAddress_(get(r, "address"));
    var b = {
      name: name,
      town: dirTown_(get(r, "town"), address),
      phone: dirPhone_(get(r, "phone")),
      category: dirClean_(get(r, "category")),
      tier: dirTier_(get(r, "tier")),
      image: dirImage_(get(r, "image")),
      website: dirUrl_(get(r, "website")),
      address: address,
      hours: dirClean_(get(r, "hours")),
      facebook: dirUrl_(get(r, "facebook")),
      offer: dirClean_(get(r, "offer")),
      validUntil: dirDate_(get(r, "until")),
      bio: dirClean_(get(r, "bio")),
      mapsUrl: dirMapsUrl_(get(r, "maps")),
      businessId: dirClean_(get(r, "id"))
    };
    var base = b.businessId ? b.businessId.replace(/[^A-Za-z0-9_-]+/g, "_") : dirSlug_(b.name + " " + b.town);
    var id = base, n = 2;
    while (used[id]) id = base + "-" + (n++);
    used[id] = true;
    b.id = id;
    b.schemaType = dirSchemaType_(b.category, b.name);
    b.openingHours = dirOpeningHours_(b.hours);
    b.summary = dirSummary_(b);
    list.push(b);
  });
  list.sort(function(a, b) {
    return (DIR_TIER_ORDER[a.tier] - DIR_TIER_ORDER[b.tier]) || a.name.localeCompare(b.name) || a.town.localeCompare(b.town);
  });
  return list;
}

/** Everything the website needs, in one object (also used by the page builder). */
function dirBuildPublic_(list) {
  var towns = {}, cats = {};
  list.forEach(function(b) { towns[b.town] = 1; if (b.category) cats[b.category] = 1; });
  return {
    updatedAt: new Date().toISOString(),
    count: list.length,
    pageUrl: DIR_PAGE_URL,
    towns: Object.keys(towns).sort(),
    categories: Object.keys(cats).sort(),
    businesses: list,
    answers: dirAnswers_(list)
  };
}

// ---- Firestore REST ---------------------------------------------------------------
function dirFsValue_(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Math.floor(v) === v ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: v.length ? { values: v.map(dirFsValue_) } : {} };
  if (typeof v === "object") return { mapValue: { fields: dirFsFields_(v) } };
  return { stringValue: String(v) };
}
function dirFsFields_(obj) {
  var f = {};
  Object.keys(obj).forEach(function(k) { f[k] = dirFsValue_(obj[k]); });
  return f;
}
function dirFetch_(method, path, body) {
  var opts = {
    method: method, muteHttpExceptions: true, contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }
  };
  if (body) opts.payload = JSON.stringify(body);
  var r = UrlFetchApp.fetch(DIR_API + path, opts);
  var code = r.getResponseCode(), text = r.getContentText();
  if (code >= 300) {
    var hint = code === 403 ? "\nPermission denied: see ONE-TIME SETUP at the top of the FIRESTORE SYNC section (Firebase member + appsscript.json scope)." : "";
    throw new Error("Firestore " + method + " " + path.split("?")[0] + " -> HTTP " + code + ": " + text.slice(0, 300) + hint);
  }
  return text ? JSON.parse(text) : {};
}
function dirHash_(obj) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(obj), Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ("0" + (b & 255).toString(16)).slice(-2); }).join("");
}

/** Existing business documents -> { id: hash } */
function dirExistingHashes_() {
  var out = {}, token = "";
  do {
    var res = dirFetch_("get", DIR_DB + "/businesses?pageSize=300&mask.fieldPaths=hash" + (token ? "&pageToken=" + encodeURIComponent(token) : ""));
    (res.documents || []).forEach(function(d) {
      var id = d.name.split("/").pop();
      out[id] = d.fields && d.fields.hash ? d.fields.hash.stringValue : "";
    });
    token = res.nextPageToken || "";
  } while (token);
  return out;
}

// ---- Sync ---------------------------------------------------------------------------
/** Business Finder menu -> "Send directory to Firestore now" (also used by the 15-minute trigger). */
function syncDirectoryToFirestore(force) {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("DIRECTORY_SHEET_ID"));
  var master = ss.getSheetByName(BF_MASTER_TAB);
  if (!master) throw new Error("Tab '" + BF_MASTER_TAB + "' not found.");
  var props = PropertiesService.getScriptProperties();
  props.setProperty("DIRECTORY_SHEET_ID", ss.getId());

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { Logger.log("Another sync is running - skipped."); return 0; }
  try {
    dirRebuildBusinessCards_(ss);                       // Business Cards always matches Master Data
    return dirSendToFirestore_(ss, master, props, force);
  } finally {
    lock.releaseLock();
  }
}

function dirSendToFirestore_(ss, master, props, force) {
  var list = dirReadMasterData_(master.getDataRange().getValues());
  var sheetHash = dirHash_(list);
  if (force === false && props.getProperty("DIR_LAST_HASH") === sheetHash) {   // timer: skip when nothing changed
    Logger.log("Directory unchanged - nothing sent.");
    return 0;
  }

  var existing = dirExistingHashes_();
  var now = new Date().toISOString();
  var writes = [], changed = 0, removed = 0;
  list.forEach(function(b) {
    var h = dirHash_(b);
    if (existing[b.id] === h) return;
    var doc = {};
    Object.keys(b).forEach(function(k) { doc[k] = b[k]; });
    doc.hash = h; doc.updatedAt = now;
    writes.push({ update: { name: DIR_DB + "/businesses/" + b.id, fields: dirFsFields_(doc) } });
    changed++;
  });
  var keep = {};
  list.forEach(function(b) { keep[b.id] = true; });
  Object.keys(existing).forEach(function(id) {
    if (!keep[id]) { writes.push({ delete: DIR_DB + "/businesses/" + id }); removed++; }
  });
  writes.push({ update: { name: DIR_DB + "/directory/public", fields: dirFsFields_(dirBuildPublic_(list)) } });

  for (var i = 0; i < writes.length; i += 400) {
    dirFetch_("post", DIR_DB + ":commit", { writes: writes.slice(i, i + 400) });
  }
  props.setProperty("DIR_LAST_HASH", sheetHash);
  var msg = list.length + " businesses in the directory: " + changed + " updated, " + removed + " removed.";
  Logger.log(msg);
  try { ss.toast(msg, "Directory -> Firestore", 8); } catch (e) {}
  return changed + removed;
}

/** Business Finder menu -> "Turn on automatic sync". Two triggers:
 *   - on edit: any Master Data edit rebuilds Business Cards at once; ticking/unticking
 *     Include (column A) also updates Firestore at once
 *   - every 15 min: sends other edits (phone, hours, ...) when Master Data changed */
function installDirectorySyncTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var f = t.getHandlerFunction();
    if (f === "syncDirectoryOnTimer" || f === "onMasterDataEdit") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncDirectoryOnTimer").timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger("onMasterDataEdit").forSpreadsheet(ss).onEdit().create();
  PropertiesService.getScriptProperties().setProperty("DIRECTORY_SHEET_ID", ss.getId());
  syncDirectoryToFirestore(true);
  ss.toast("Automatic sync is on: ticking or unticking Include updates Business Cards and the website right away; other edits within 15 minutes.", "Directory", 10);
}
function syncDirectoryOnTimer() { syncDirectoryToFirestore(false); }

/** Installed "on edit" trigger (see installDirectorySyncTrigger) */
function onMasterDataEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var name = sheet.getName();
  if (name === "Business Cards") {                     // typed into Business Cards: move it into Master Data
    syncDirectoryToFirestore(false);
    return;
  }
  if (name !== BF_MASTER_TAB || e.range.getRow() < 2 && e.range.getLastRow() < 2) return;
  if (e.range.getColumn() === 1) {                     // Include ticked / unticked -> everything now
    syncDirectoryToFirestore(false);
  } else {                                             // other edits: Business Cards now, Firestore on the timer
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;
    try { dirRebuildBusinessCards_(e.source); } finally { lock.releaseLock(); }
  }
}

/** Business Finder menu -> "Rebuild Business Cards now" */
function rebuildBusinessCardsNow() {
  var r = dirRebuildBusinessCards_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getActiveSpreadsheet().toast(r.count + " businesses on Business Cards." +
    (r.rescued.length ? " Moved into Master Data: " + r.rescued.join(", ") : ""), "Business Cards", 8);
}

/* ---- Business Cards (written by this script; replaces the old FILTER formula) ----------
   Same layout the old formula made: Master Data's name..company-bio headers, then every
   ticked row, sorted by name. Rows someone typed straight into Business Cards that are not
   in Master Data are first ADDED to Master Data (ticked), so nothing is lost. */
var DIR_CARDS_TAB = "Business Cards";

function dirKey_(name, town) { return bfNorm_(name) + "|" + bfNorm_(town); }

function dirRebuildBusinessCards_(ss) {
  var master = ss.getSheetByName(BF_MASTER_TAB);
  var cards = ss.getSheetByName(DIR_CARDS_TAB) || ss.insertSheet(DIR_CARDS_TAB);
  var props = PropertiesService.getScriptProperties();
  var values = master.getDataRange().getValues();
  var head = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var cols = BF_MASTER_COLUMNS.map(function(c) { return head.indexOf(c.toLowerCase()); });
  var cName = head.indexOf("name"), cTown = head.indexOf("town");

  // 1. Rescue rows typed into Business Cards that Master Data doesn't have
  var inMaster = {};
  values.slice(1).forEach(function(r) { if (dirClean_(r[cName])) inMaster[dirKey_(r[cName], r[cTown])] = true; });
  var lastWritten = {};
  String(props.getProperty("DIR_CARDS_KEYS") || "").split(",").forEach(function(k) { if (k) lastWritten[k] = true; });
  var rescued = [], rescueRows = [];
  if (cards.getLastRow() >= 2) {
    var cv = cards.getRange(1, 1, cards.getLastRow(), Math.max(cards.getLastColumn(), BF_MASTER_COLUMNS.length)).getValues();
    var ch = cv[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var cardsName = ch.indexOf("name") >= 0 ? ch.indexOf("name") : 0;
    var cardsTown = ch.indexOf("town") >= 0 ? ch.indexOf("town") : 1;
    cv.slice(1).forEach(function(r) {
      var nm = dirClean_(r[cardsName]);
      if (!nm || /^#(ref|n\/a|value)/i.test(nm)) return;
      var key = dirKey_(nm, r[cardsTown]);
      var hk = dirHash_(key).slice(0, 10);
      if (inMaster[key] || lastWritten[hk]) return;      // already in Master Data, or written by us before (renamed since)
      var row = [true];
      BF_MASTER_COLUMNS.forEach(function(c, j) { var k = ch.indexOf(c.toLowerCase()); row.push(k >= 0 ? r[k] : r[j]); });
      while (row.length < head.length) row.push("");
      rescueRows.push(row.slice(0, Math.max(head.length, row.length)));
      rescued.push(nm);
      inMaster[key] = true;
    });
  }
  if (rescueRows.length) {
    var width = Math.max(head.length, rescueRows[0].length);
    rescueRows = rescueRows.map(function(r) { while (r.length < width) r.push(""); return r.slice(0, width); });
    // use the first empty rows (name..company-bio blank), else add at the bottom
    var free = [];
    values.slice(1).forEach(function(r, i) {
      if (free.length < rescueRows.length && r.slice(1).every(function(v) { return v === "" || v === null; })) free.push(i + 2);   // every column after A blank (keeps Maps links / IDs safe)
    });
    var next = values.length + 1;
    rescueRows.forEach(function(row, i) {
      var at = free[i] || next++;
      master.getRange(at, 1, 1, width).setValues([row]);
      master.getRange(at, 1, 1, 1).insertCheckboxes();
    });
    values = master.getDataRange().getValues();
  }

  // 2. Write header + ticked rows, sorted by name (values only)
  var out = values.slice(1).filter(function(r) {
    return (r[0] === true || String(r[0]).toUpperCase() === "TRUE") && dirClean_(r[cName]);
  }).map(function(r) {
    return cols.map(function(c) { return c >= 0 ? r[c] : ""; });
  }).sort(function(a, b) { return String(a[0]).toLowerCase().localeCompare(String(b[0]).toLowerCase()); });
  var header = BF_MASTER_COLUMNS.map(function(c, j) { return cols[j] >= 0 ? values[0][cols[j]] : c; });
  cards.clearContents();
  cards.getRange(1, 1, 1, header.length).setValues([header]);
  if (out.length) cards.getRange(2, 1, out.length, header.length).setValues(out);
  if (cards.getFrozenRows() < 1) cards.setFrozenRows(1);

  props.setProperty("DIR_CARDS_KEYS", out.map(function(r) { return dirHash_(dirKey_(r[0], r[1])).slice(0, 10); }).join(","));
  if (rescued.length) { try { ss.toast("Moved into Master Data (ticked): " + rescued.join(", "), "Business Cards", 10); } catch (e) {} }
  return { count: out.length, rescued: rescued };
}

/** Business Finder menu -> "Test Firestore connection" */
function testFirestoreConnection() {
  var ui = SpreadsheetApp.getUi();
  try {
    dirFetch_("get", DIR_DB + "/businesses?pageSize=1&mask.fieldPaths=hash");
    ui.alert("Firestore connection works. You can now use \"Send directory to Firestore now\".");
  } catch (e) {
    ui.alert("Firestore connection failed:\n\n" + e.message);
  }
}

/* ==========================================================================
   GOOGLE MAPS COLUMN (v3.1) - Master Data column O, header "Google Maps"
   Paste either:
     - a Maps share link   https://maps.app.goo.gl/tzkYqVey2GNZbT1JA   (best: it is THE business)
     - a plus code         MGHC+5J Flora, Illinois                     (only a spot on the map:
                                                                         fills the address only)
   Business Finder menu -> "Fill blanks from Google Maps (column O)"
     Fills ONLY empty cells (or "N/A" / "find, ..." placeholders) in Address, phone,
     website and hours - it never overwrites what you typed. A row with ONLY a Maps
     link also gets name, town, category, tier "Basic" and the placeholder logo
     (Include stays unticked so you can check it first). It also fills Business ID
     (Google's place ID), which marks the row as done and prevents duplicates.
     Needs Script Property PLACES_API_KEY (Places API (New)).
   ========================================================================== */

/** Column index of the Maps column: header "Google Maps" (also accepts "GMaps" / "Maps") */
function dirMapsHeaderIndex_(head) {
  var names = ["google maps", "gmaps", "maps", "google map"];
  for (var i = 0; i < names.length; i++) { var c = head.indexOf(names[i]); if (c >= 0) return c; }
  return -1;
}

var DIR_PLUS_CODE = /^\s*([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{0,3})\b/i;

/** Link the website uses for "open in Maps" (share link as-is, plus code -> Maps search) */
function dirMapsUrl_(v) {
  var s = dirClean_(v);
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
  if (DIR_PLUS_CODE.test(s)) return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s);
  return "";
}

/** Short link -> the full Google Maps address it points to (follows up to 5 redirects) */
function gmExpand_(url) {
  var current = url;
  for (var i = 0; i < 5; i++) {
    var r = UrlFetchApp.fetch(current, { followRedirects: false, muteHttpExceptions: true });
    var h = r.getHeaders();
    var loc = h.Location || h.location;
    if (!loc || r.getResponseCode() < 300 || r.getResponseCode() >= 400) return current;
    current = loc;
  }
  return current;
}

/** What to search for: { query, lat, lng, isPlusCode } from a share link, Maps URL or plus code */
function gmParse_(value) {
  var s = dirClean_(value);
  if (!s) return null;
  if (DIR_PLUS_CODE.test(s)) return { query: s, isPlusCode: true };
  if (!/^https?:\/\//i.test(s)) return { query: s };
  var full = /goo\.gl|g\.co\//i.test(s) ? gmExpand_(s) : s;
  var out = { query: "", url: full };
  var place = full.match(/\/maps\/place\/([^\/@?]+)/);
  if (place) out.query = decodeURIComponent(place[1].replace(/\+/g, " "));
  var pin = full.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || full.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (pin) { out.lat = +pin[1]; out.lng = +pin[2]; }
  var q = full.match(/[?&](?:q|query)=([^&]+)/);
  if (!out.query && q) out.query = decodeURIComponent(q[1].replace(/\+/g, " "));
  if (out.query && DIR_PLUS_CODE.test(out.query)) out.isPlusCode = true;
  return out.query || pin ? out : null;
}

/** "Monday: 8:00 AM – 7:00 PM" x7 -> "Mon-Sat 8AM-7PM; Sun 10AM-5PM" (same style as the sheet) */
function gmHours_(weekdayDescriptions) {
  var list = weekdayDescriptions || [];
  if (!list.length) return "";
  function t(x) { return x.replace(/ | /g, " ").replace(/:00\s*/g, "").replace(/\s*(AM|PM)/gi, "$1").trim(); }
  var days = list.map(function(line) {
    var m = String(line).match(/^(\w{3})\w*:\s*(.*)$/);
    if (!m) return null;
    var hours = m[2].trim();
    if (/open 24 hours/i.test(hours)) hours = "24 Hours";
    else if (!/closed/i.test(hours)) hours = hours.split(/\s*,\s*/).map(function(r) { return r.split(/\s*[–-]\s*/).map(t).join("-"); }).join(", ");
    return { day: m[1], hours: hours };
  }).filter(Boolean);
  if (days.length === 7 && days.every(function(d) { return d.hours === "24 Hours"; })) return "24 Hours";
  var out = [], i = 0;
  while (i < days.length) {
    var j = i;
    while (j + 1 < days.length && days[j + 1].hours === days[i].hours) j++;
    if (!/closed/i.test(days[i].hours)) out.push((j > i ? days[i].day + "-" + days[j].day : days[i].day) + " " + days[i].hours);
    i = j + 1;
  }
  return out.join("; ");
}

/** Places API (New) Text Search, biased to the pin when we have one */
function gmLookup_(info, key) {
  var fields = ["places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
                "places.websiteUri", "places.regularOpeningHours.weekdayDescriptions", "places.googleMapsUri", "places.types",
                "places.primaryTypeDisplayName"].join(",");
  var body = { textQuery: info.query || (info.lat + "," + info.lng), pageSize: 1 };
  if (info.lat !== undefined) body.locationBias = { circle: { center: { latitude: info.lat, longitude: info.lng }, radius: 300 } };
  else body.locationBias = { rectangle: { low: { latitude: BF_BOX.south, longitude: BF_BOX.west }, high: { latitude: BF_BOX.north, longitude: BF_BOX.east } } };
  var r = UrlFetchApp.fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields }, payload: JSON.stringify(body)
  });
  if (r.getResponseCode() !== 200) throw new Error("Google Places: HTTP " + r.getResponseCode() + " " + r.getContentText().slice(0, 200));
  var p = (JSON.parse(r.getContentText()).places || [])[0];
  if (!p) return null;
  var isPlace = !(p.types || []).some(function(x) { return x === "plus_code" || x === "street_address" || x === "geocode" || x === "premise"; });
  var address = String(p.formattedAddress || "").replace(/, USA$/, "");
  return {
    id: p.id,
    name: (p.displayName || {}).text || "",
    category: (p.primaryTypeDisplayName || {}).text || "",
    town: bfTownFromAddress_(address, ""),
    address: address,
    phone: p.nationalPhoneNumber || "",
    website: p.websiteUri || "",
    hours: gmHours_((p.regularOpeningHours || {}).weekdayDescriptions),
    isBusiness: isPlace && !info.isPlusCode
  };
}

function gmIsBlank_(v) {
  var s = String(v === null || v === undefined ? "" : v).trim();
  return !s || /^(n\/?a|none|tbd|-)$/i.test(s) || /^find\s*,/i.test(s) || /^[^,\d]*(service area|hub)$/i.test(s);
}

/** Business Finder menu -> "Fill blanks from Google Maps (column O)" */
function fillFromGoogleMaps() {
  var key = PropertiesService.getScriptProperties().getProperty("PLACES_API_KEY");
  if (!key) throw new Error("Missing Script Property PLACES_API_KEY (Project Settings -> Script Properties).");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(BF_MASTER_TAB);
  var lastCol = master.getLastColumn();
  var head = master.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var cMaps = dirMapsHeaderIndex_(head);
  if (cMaps < 0) {
    SpreadsheetApp.getUi().alert("Type \"Google Maps\" in the first row of an empty column in Master Data (for example O1), paste Maps links or plus codes under it, then run this again.");
    return;
  }
  var cId = head.indexOf("business id");
  if (cId < 0) {                      // add the Business ID column at the far right
    cId = lastCol;
    master.getRange(1, cId + 1).setValue("Business ID").setNote("Google place ID / OpenStreetMap ID. Filled by Business Finder; prevents duplicates.");
    lastCol++;
  }
  var cols = { address: head.indexOf("address"), phone: head.indexOf("phone"), website: head.indexOf("website"), hours: head.indexOf("hours"),
               name: head.indexOf("name"), town: head.indexOf("town"), category: head.indexOf("category"), tier: head.indexOf("tier"),
               image: head.indexOf("imageid") };
  var range = master.getRange(2, 1, master.getLastRow() - 1, lastCol);
  var rows = range.getValues();
  var started = Date.now(), filled = 0, looked = 0, failed = [], added = [];
  var idRow = {};                                                       // Google place ID -> sheet row (duplicate check)
  rows.forEach(function(r, i) { var id = dirClean_(r[cId]); if (id) idRow[id] = i + 2; });

  rows.forEach(function(r, i) {
    if (Date.now() - started > 5 * 60 * 1000) return;                 // stay under Apps Script's 6-minute limit
    var link = r[cMaps];
    if (!dirClean_(link) || dirClean_(r[cId])) return;                  // no link, or already done
    var info = gmParse_(link);
    if (!info) { failed.push("Row " + (i + 2) + ": can't read the link"); return; }
    looked++;
    var g;
    try { g = gmLookup_(info, key); } catch (e) { failed.push("Row " + (i + 2) + ": " + e.message); return; }
    if (!g) { failed.push("Row " + (i + 2) + ": Google found nothing"); return; }
    if (g.isBusiness && idRow[g.id] && idRow[g.id] !== i + 2) {
      failed.push("Row " + (i + 2) + ": same Google place as row " + idRow[g.id] + " (left empty - delete one of them)");
      return;
    }
    var changed = false;
    var isNew = cols.name >= 0 && !dirClean_(r[cols.name]);
    function put(c, v) { if (c >= 0 && v && gmIsBlank_(r[c])) { r[c] = v; changed = true; } }
    put(cols.address, g.address);
    if (g.isBusiness) {                                                  // plus codes: address only
      put(cols.name, g.name);                                            // a row with only a link -> a full new business
      put(cols.town, g.town);
      put(cols.category, g.category);
      put(cols.phone, g.phone);
      put(cols.website, g.website);
      put(cols.hours, g.hours);
      if (isNew) {
        put(cols.tier, "Basic");
        put(cols.image, "localbusiness.png");
        added.push("Row " + (i + 2) + ": " + g.name);
      }
      r[cId] = g.id;
      idRow[g.id] = i + 2;
      changed = true;
    } else {
      r[cId] = "pluscode:" + String(link).trim().split(/\s+/)[0];        // marks the row as done
      changed = true;
    }
    if (changed) filled++;
    Utilities.sleep(200);
  });

  range.setValues(rows);
  try { colorMapsColumn_(master); } catch (e) { Logger.log("Coloring skipped: " + e); }
  var msg = looked + " rows looked up, " + filled + " updated." +
            (added.length ? "\n\nNew businesses (tick Include when they look right):\n" + added.slice(0, 15).join("\n") : "") +
            (failed.length ? "\n\nCould not fill:\n" + failed.slice(0, 15).join("\n") : "") +
            (Date.now() - started > 5 * 60 * 1000 ? "\n\nStopped at the time limit: run it again to continue." : "");
  Logger.log(msg);
  SpreadsheetApp.getUi().alert("Google Maps fill-in", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ==========================================================================
   CLAY COUNTY CHECK (v3.5) - Business Finder menu -> "Check Clay County (all rows)"
   Writes a "County Check" column in Master Data (added at the far right):
     ✓ Clay County                      Census Bureau says the street address is in Clay County, IL
     ✗ Wayne County, IL                 the address is in another county
     ✗ Not Illinois (WI)                another state
     ✗ ZIP 62878 is outside Clay County  no street address, but the ZIP is not a Clay County ZIP
     ? Likely Clay County (no street address)   town/ZIP look right, nothing to verify exactly
     ? Not verified: <reason>           e.g. the Census lookup could not match the address
   Extra warnings are added for phone area codes outside Illinois (e.g. 715 = Wisconsin).
   Nothing is unticked or deleted. Rows are re-checked only when their address changes,
   so run it again any time (it stops after ~5 minutes; run again to continue).
   Census lookup: free, no key - https://geocoding.geo.census.gov
   ========================================================================== */
var CC_ZIPS = { "62839": "Flora", "62858": "Louisville", "62824": "Clay City", "62899": "Xenia",
                "62879": "Sailor Springs", "62838": "Iola", "62434": "Ingraham" };
var CC_PLACES = ["flora", "louisville", "clay city", "xenia", "sailor springs", "iola", "ingraham", "bible grove",
                 "hord", "oskaloosa", "songer", "pixley", "larkinsburg", "harter", "stanford", "blair", "hoosier",
                 "clay county", "riffle", "kenner", "camp travis", "greendale", "oak mound"];
var IL_AREA_CODES = ["217", "224", "309", "312", "331", "447", "464", "618", "630", "708", "730", "773", "779", "815", "847", "861", "872"];
var TOLL_FREE = ["800", "833", "844", "855", "866", "877", "888"];
var STATE_CODES = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s+\d{5}\b/;

/** Census Bureau: address -> { county, state, fips } or null */
function ccCensus_(address) {
  var url = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=json&address=" + encodeURIComponent(address);
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error("Census lookup HTTP " + r.getResponseCode());
  var m = ((JSON.parse(r.getContentText()).result || {}).addressMatches || [])[0];
  if (!m) return null;
  var c = ((m.geographies || {}).Counties || [])[0];
  if (!c) return null;
  return { county: c.NAME || c.BASENAME || "", fips: String(c.GEOID || (String(c.STATE || "") + String(c.COUNTY || ""))), state: String(c.STATE || ""), matched: m.matchedAddress || "" };
}

var FIPS_STATE = { "17": "IL", "18": "IN", "29": "MO", "21": "KY", "55": "WI", "19": "IA", "26": "MI", "39": "OH" };

/** One row -> { result, warn } */
function ccCheckRow_(name, town, address, phone, census) {
  var addr = dirAddress_(address), t = dirClean_(town).toLowerCase();
  var warn = [];
  var area = String(phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "").slice(0, 3);
  if (area.length === 3 && IL_AREA_CODES.indexOf(area) < 0 && TOLL_FREE.indexOf(area) < 0) warn.push("phone area code " + area + " is not Illinois");

  var other = (addr.match(STATE_CODES) || [])[1];
  if (other && other !== "IL") return { result: "✗ Not Illinois (" + other + ")", warn: warn };
  var zip = (addr.match(/\b(\d{5})\b(?!.*\b\d{5}\b)/) || [])[1] || (t.match(/\b(\d{5})\b/) || [])[1];

  var hasStreet = /^\s*\d+\s+\S/.test(addr) && !/service area|hub|po box/i.test(addr);
  if (hasStreet && census) {
    try {
      var c = census(addr.indexOf(",") > 0 ? addr : addr + ", " + (town || "") + ", IL");
      if (c) {
        if (c.fips === "17025") return { result: "✓ Clay County", warn: warn };
        var st = FIPS_STATE[c.state] || ("state " + c.state);
        return { result: "✗ " + c.county + (st ? ", " + st : ""), warn: warn };
      }
      warn.push("Census could not match the street address");
    } catch (e) {
      warn.push("Census lookup failed (" + e.message + ")");
    }
  }
  if (zip && !CC_ZIPS[zip]) return { result: "✗ ZIP " + zip + " is outside Clay County", warn: warn };
  var placeOk = CC_PLACES.some(function(p) { return t.indexOf(p) >= 0 || addr.toLowerCase().indexOf(p) >= 0; });
  if (zip && CC_ZIPS[zip]) return { result: "? Likely Clay County (" + (hasStreet ? "address not verified" : "no street address") + ")", warn: warn };
  if (placeOk) return { result: "? Likely Clay County (no street address or ZIP)", warn: warn };
  return { result: "? Not verified: no Clay County town, ZIP or street address", warn: warn };
}

/** Business Finder menu -> "Check Clay County (all rows)" */
function checkClayCounty() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(BF_MASTER_TAB);
  var lastCol = master.getLastColumn();
  var head = master.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var cCheck = head.indexOf("county check");
  if (cCheck < 0) {
    cCheck = lastCol;
    master.getRange(1, cCheck + 1).setValue("County Check")
      .setNote("Filled by Business Finder -> Check Clay County. ✓ = verified in Clay County, ✗ = outside, ? = could not verify exactly.");
    lastCol++;
  }
  var cName = head.indexOf("name"), cTown = head.indexOf("town"), cAddr = head.indexOf("address"), cPhone = head.indexOf("phone");
  var n = master.getLastRow() - 1;
  if (n < 1) return;
  var data = master.getRange(2, 1, n, lastCol).getValues();
  var checkRange = master.getRange(2, cCheck + 1, n, 1);
  var results = checkRange.getValues(), notes = checkRange.getNotes();
  var colors = checkRange.getBackgrounds();
  var started = Date.now(), done = 0, skipped = 0, stopped = false;
  var counts = { ok: 0, out: 0, maybe: 0 }, outside = [];

  for (var i = 0; i < n; i++) {
    var r = data[i];
    var name = dirClean_(r[cName]);
    if (!name) { results[i][0] = ""; notes[i][0] = ""; colors[i][0] = null; continue; }
    var key = [r[cTown], r[cAddr], r[cPhone]].join(" | ");
    if (notes[i][0] === key && results[i][0]) { skipped++; tally(results[i][0], name, i); continue; }   // unchanged since last check
    if (Date.now() - started > 5 * 60 * 1000) { stopped = true; break; }
    var res = ccCheckRow_(name, r[cTown], r[cAddr], r[cPhone], ccCensus_);
    results[i][0] = res.result + (res.warn.length ? "  ⚠ " + res.warn.join("; ") : "");
    notes[i][0] = key;
    colors[i][0] = res.result.charAt(0) === "✓" ? "#d9f2dd" : res.result.charAt(0) === "✗" ? "#f8d7d5" : "#fff3c4";
    if (res.warn.length && res.result.charAt(0) === "✓") colors[i][0] = "#fff3c4";
    tally(results[i][0], name, i);
    done++;
    Utilities.sleep(150);
  }
  function tally(text, nm, idx) {
    var c = String(text).charAt(0);
    if (c === "✓" && String(text).indexOf("⚠") < 0) counts.ok++;
    else if (c === "✗") { counts.out++; outside.push("Row " + (idx + 2) + ": " + nm + " - " + String(text).slice(2)); }
    else counts.maybe++;
  }
  checkRange.setValues(results);
  checkRange.setNotes(notes);
  checkRange.setBackgrounds(colors);

  var msg = "Checked " + done + " rows (" + skipped + " unchanged since last time).\n\n" +
            "✓ In Clay County: " + counts.ok + "\n✗ Outside Clay County: " + counts.out + "\n? Check by hand: " + counts.maybe +
            (outside.length ? "\n\nOutside:\n" + outside.slice(0, 20).join("\n") + (outside.length > 20 ? "\n…and " + (outside.length - 20) + " more" : "") : "") +
            (stopped ? "\n\nStopped at the time limit - run it again to finish the rest." : "");
  Logger.log(msg);
  SpreadsheetApp.getUi().alert("Clay County check", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ---- Colors for the Google Maps column (v3.6) -----------------------------------------
   Conditional formatting (Google Sheets updates it live, no script run needed):
     green  = Maps link + Business ID (looked up)
     yellow = Maps link, no Business ID yet (run "Fill blanks from Google Maps")
   Set up once from the menu; "Fill blanks from Google Maps" also makes sure it's there. */
function colorMapsColumn() {
  colorMapsColumn_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BF_MASTER_TAB));
  SpreadsheetApp.getActiveSpreadsheet().toast("Google Maps column: green = looked up, yellow = waiting for \"Fill blanks from Google Maps\".", "Colors", 8);
}
function colorMapsColumn_(master) {
  var lastCol = master.getLastColumn();
  var head = master.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var cMaps = dirMapsHeaderIndex_(head), cId = head.indexOf("business id");
  if (cMaps < 0 || cId < 0) return;
  function letter(i) { var s = "", n = i + 1; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  var L = letter(cMaps), P = letter(cId);
  var rows = master.getMaxRows();
  var ranges = [master.getRange(2, cMaps + 1, rows - 1, 1), master.getRange(2, cId + 1, rows - 1, 1)];
  var green = "=AND(LEN($" + L + "2)>0,LEN($" + P + "2)>0)";
  var yellow = "=AND(LEN($" + L + "2)>0,LEN($" + P + "2)=0)";
  // drop the rules this script added before, keep everyone else's
  var keep = master.getConditionalFormatRules().filter(function(rule) {
    var c = rule.getBooleanCondition();
    var vals = c && c.getCriteriaValues ? c.getCriteriaValues() : [];
    return !(vals.length && (vals[0] === green || vals[0] === yellow));
  });
  keep.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(green).setBackground("#c8ecd0").setRanges(ranges).build());
  keep.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(yellow).setBackground("#fff1b8").setRanges(ranges).build());
  master.setConditionalFormatRules(keep);
}
