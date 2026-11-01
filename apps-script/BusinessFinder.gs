/* ==========================================================================
   Active Version: 2026-10-31_v1
   File: BusinessFinder.gs (Google Apps Script - goes in the DIRECTORY sheet)
   Project: Clay County Business Directory - Business Finder

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
    .addToUi();
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
