/* ==========================================================================
   Active Version: 2026-11-15_v3  |  Updated: Nov 15, 2026 4:30 AM ET
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
     Business Finder menu -> "Turn on automatic sync (every 15 min)"
     Only rows with "Include in directory" ticked are sent. Unticking a row
     removes it from the website on the next sync.

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

var BF_VERSION = "v3 - Nov 15, 2026 4:30 AM ET";

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
    .addItem("Re-check duplicates", "recheckDuplicates")
    .addSeparator()
    .addItem("Send directory to Firestore now", "syncDirectoryToFirestore")
    .addItem("Turn on automatic sync (every 15 min)", "installDirectorySyncTrigger")
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

  var rows = bf.getRange(2, 1, bf.getLastRow() - 1, BF_HEADERS.length).getValues();
  var out = [], doneRows = [];
  rows.forEach(function(r, i) {
    if (r[BF_COL["Add?"]] !== true) return;
    if (String(r[BF_COL["Status"]]).indexOf("Added") === 0) return;
    var line = [];
    for (var c = 0; c <= Math.max(idCol, BF_MASTER_COLUMNS.length); c++) line.push("");
    line[0] = false;                                         // A = show box, unticked
    BF_MASTER_COLUMNS.forEach(function(col, j) { line[j + 1] = r[BF_COL[col]]; });   // B..N
    line[idCol] = r[BF_COL["Business ID"]];
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
  if (b.address) s += ", located at " + b.address;
  s += ".";
  if (b.phone) s += " Phone: " + b.phone + ".";
  if (b.hours) s += " Hours: " + b.hours.replace(/\.$/, "") + ".";
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
      var street = b.address ? b.address.split(",")[0].trim() : "";
      return b.name + (street && street.toLowerCase() !== town.toLowerCase() && /\d/.test(street) ? " (" + street + ")" : "");
    });
    var last = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
    return {
      town: town, category: cat,
      q: "Where can I find " + dirA_(what) + " in " + town + ", IL?",
      a: "In " + town + ", Illinois: " + last + ". Listed in the Clay County Business Directory by Support My Local Community."
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
    facebook: col("facebook"), offer: col("offer"), until: col("validuntil"), bio: col("company-bio"), id: col("business id")
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
      businessId: dirClean_(get(r, "id"))
    };
    var base = b.businessId ? b.businessId.replace(/[\/#?\s]+/g, "_") : dirSlug_(b.name + " " + b.town);
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

/** Business Finder menu -> "Turn on automatic sync (every 15 min)". Only sends when Master Data changed. */
function installDirectorySyncTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "syncDirectoryOnTimer") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncDirectoryOnTimer").timeBased().everyMinutes(15).create();
  PropertiesService.getScriptProperties().setProperty("DIRECTORY_SHEET_ID", SpreadsheetApp.getActiveSpreadsheet().getId());
  syncDirectoryToFirestore(true);
  SpreadsheetApp.getActiveSpreadsheet().toast("Automatic sync is on: changes reach the website within 15 minutes.", "Directory", 8);
}
function syncDirectoryOnTimer() { syncDirectoryToFirestore(false); }

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
