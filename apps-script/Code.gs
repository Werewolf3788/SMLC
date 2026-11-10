/* ==========================================================================
   Active Version: 2026-11-02_v6.5  |  Updated: Nov 2, 2026 9:00 PM ET
   File: Code.gs (Google Apps Script)
   Project: SMLC County Portal Semantic RTDB Sync
   Description: SMLC County Portal Master Parser & Firebase Realtime DB Sync.
                Converts spreadsheet tabs directly to human-readable semantic
                keys (slideshow, history, article, spotlight, town_links, etc.)
                instead of numeric section grid identifiers.
   Changes in this version:
                - PUT changed to PATCH so weather_forecast, weather_alerts and
                  sports (siblings under /master_county_data) are NOT wiped.
                - Drive links now use the more reliable thumbnail endpoint.
                - =IMAGE("url") cell formulas are read as plain URLs.
                - v3: Added "Gas_Widget" tab -> sections.gas_widget (list)
                      and "Sports" tab -> sections.sports (list), both
                      grouped by Town Name in Column A like every other tab.
                - v4: Gas prices pulled from Google Places API (New) "fuelOptions".
                      See SECTION 4. Gas_Widget gains columns D-G:
                      Google Place ID | Regular | Diesel | Price Updated.
                - v5: Blank sheet rows skipped (no more empty "LINK" menu items).
                      Menu tab: A Town/label | B Website | C Image | D Alt | E Category.
                      Category "More" -> More dropdown; "town" saved for town rows.
                - v6: SECTION 5 added at the bottom = SMLC Photos (photo uploads + public sharing).
                      Everything above SECTION 5 is unchanged from v5.
                - v6.1: Photos shared by the public go straight to the site (no approval).
                      To remove one: untick Show on the Gallery tab.
                - v6.2: Gallery Column A = the town the person picked, so each photo is saved
                      under that town in Firebase (towns/<Town>/sections/gallery).
                - v6.3: Gallery tab gets an "Alt" column (picture description for screen readers).
                - v6.4: File names don't repeat the town ("Flora water tower" -> flora-water-tower.jpg).
                - v6.5: setupSMLCPhotos() - run once to approve permissions and test everything.
   ========================================================================== */

// === SECTION 0: Auto-Sync On Edit Event Listener ===
/**
 * Installable Trigger function for onEdit events.
 * Set up as an Installable Trigger in Apps Script (Triggers -> Add Trigger -> On edit).
 */
function onEditTrigger(e) {
  Logger.log("Change detected in spreadsheet. Initiating automatic Firebase sync...");
  pushMasterDataToFirebase();
}

// === SECTION 1: Master Runner & Firebase Publisher ===
function pushMasterDataToFirebase() {
  /* === SECTION 1.1: Dataset Generation & Payload Prep === */
  var masterData = processFullCountyDataset();

  // Firebase Realtime DB endpoint targeting master_county_data
  var firebaseUrl = "https://smlc-fuel-monitor-default-rtdb.firebaseio.com/master_county_data.json";

  var options = {
    // PATCH only replaces the child keys we send (global, towns).
    // PUT would delete weather_forecast, weather_alerts and sports.
    method: "patch",
    contentType: "application/json",
    payload: JSON.stringify(masterData),
    muteHttpExceptions: true
  };

  /* === SECTION 1.2: HTTP Fetch Execution & Logging === */
  try {
    var response = UrlFetchApp.fetch(firebaseUrl, options);
    var responseCode = response.getResponseCode();
    if (responseCode === 200) {
      Logger.log("Successfully synced semantic Google Sheet dataset to Firebase Realtime DB!");
    } else {
      Logger.log("Firebase HTTP Error " + responseCode + ": " + response.getContentText());
    }
  } catch (e) {
    Logger.log("Firebase Sync Exception: " + e.toString());
  }
}

/**
 * Sanitizes spreadsheet tab names and town keys to form safe Firebase Realtime DB paths.
 * Replaces illegal characters (., $, #, [, ], /) with underscores.
 */
function sanitizeFirebaseKey(key) {
  if (!key) return "unnamed_key";
  return key.toString().trim().replace(/[\.\$#\[\]\/]/g, '_');
}

/**
 * Converts Google Drive sharing URLs into direct displayable image URLs.
 * Handles forms like: https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
 * Returns the original URL unchanged if it's not a Google Drive link.
 * The Drive file must be shared as "Anyone with the link".
 */
function formatGoogleDriveUrl(url) {
  if (!url) return "";
  var strUrl = url.toString().trim();

  // Only touch Drive/Docs links; leave every other URL alone
  if (strUrl.indexOf("drive.google.com") === -1 && strUrl.indexOf("docs.google.com") === -1) {
    return strUrl;
  }

  var match = strUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
              strUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
              strUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w1600";
  }

  return strUrl;
}

// === SECTION 2: Spreadsheet Data Parser ===
function processFullCountyDataset() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  var result = {
    global: { sections: {} },
    towns: {}
  };

  sheets.forEach(function(sheet) {
    var tabName = sheet.getName().trim();
    var range = sheet.getDataRange();
    var data = range.getValues();
    var formulas = range.getFormulas();
    if (data.length <= 1) return; // Skip empty or header-only sheets

    var headers = data.shift();
    formulas.shift();

    data.forEach(function(row, r) {
      // If a cell holds =IMAGE("https://...") getValues() returns blank, so recover the URL
      row = row.map(function(cell, c) {
        if ((cell === "" || cell === null) && formulas[r] && formulas[r][c]) {
          var m = String(formulas[r][c]).match(/^=IMAGE\(\s*"([^"]+)"/i);
          if (m) return m[1];
        }
        return cell;
      });

      // Skip rows that are completely empty (stops blank "LINK" items in the menu)
      var hasAnyValue = row.some(function(cell) {
        return cell !== "" && cell !== null && String(cell).trim() !== "";
      });
      if (!hasAnyValue) return;

      var rawLocation = row[0] ? row[0].toString().trim() : "";

      /* === SECTION 2.1: Automatic Global Component Identification === */
      var isGlobalTab = (tabName === "Menu" || tabName === "Footer");
      if (isGlobalTab && !rawLocation) {
        rawLocation = "Global";
      }

      // Skip empty/blank rows on localized town tabs
      if (!rawLocation) return;

      var isExplicitGlobal = (rawLocation.toLowerCase() === "global");
      var targetContainer;

      // Route data to global root or specific town container
      if (isExplicitGlobal || isGlobalTab) {
        targetContainer = result.global;
      } else {
        var townName = sanitizeFirebaseKey(rawLocation);
        if (!result.towns[townName]) {
          result.towns[townName] = { town: rawLocation, sections: {} };
        }
        targetContainer = result.towns[townName];
      }

      /* === SECTION 2.2: Map Row Data to Semantic Node === */
      mapTabToSemanticNodes(targetContainer, tabName, headers, row);
    });
  });

  return result;
}

// Town names recognized in the Menu tab's Column A (used for the phone "Towns" list)
var MENU_TOWN_NAMES = ["clay county", "clay city", "flora", "louisville", "xenia", "sailor springs", "iola",
                       "bible grove", "blair", "harter", "hoosier", "larkinsburg", "oskaloosa", "pixley", "songer", "stanford"];

// === SECTION 3: Tab to Semantic Node Mapper ===
function mapTabToSemanticNodes(containerObj, tabName, headers, row) {
  var cleanTab = sanitizeFirebaseKey(tabName.toLowerCase().replace(/\s+/g, '_'));
  if (!containerObj.sections) containerObj.sections = {};
  var sec = containerObj.sections;

  // SLIDESHOW TAB -> sec.slideshow
  // Col A: Town (0) | Col B: Title (1) | Col C: Website (2) | Col D: ImageURL (3) | Col E: Alt (4) | Col F: Category (5)
  if (tabName === "Slideshow" || tabName === "Slide Show") {
    if (!sec["slideshow"]) sec["slideshow"] = { items: [] };
    sec["slideshow"].items.push({
      title: row[1] || "",
      website: row[2] || "",
      imageUrl: formatGoogleDriveUrl(row[3]),
      alt: row[4] || row[1] || "",
      category: row[5] || ""
    });
  }

  // POINT OF INTEREST TAB -> sec.point_of_interest
  // Col A: Town (0) | Col B: Title (1) | Col C: Image1 (2) | Col D: Image2 (3) | Col E: Header1 (4) | Col F: Header2 (5) | Col G: Landmark Desc (6) | Col H: About Town (7) | Col I: alt1 (8) | Col J: alt2 (9)
  else if (tabName === "Point of Interest") {
    sec["point_of_interest"] = {
      title: row[1] || "",
      image1: formatGoogleDriveUrl(row[2]),
      image2: formatGoogleDriveUrl(row[3]),
      alt1: row[8] || row[4] || "",
      alt2: row[9] || row[5] || "",
      header1: row[4] || "",
      header2: row[5] || "",
      landmark_description: row[6] || "",
      about_text: row[7] || ""
    };
  }

  // ARTICLE TAB -> sec.article
  // Col A: Town (0) | Col B: Title (1) | Col C: Header1/Category (2) | Col D: Header2/Deck (3) | Col E: Paragraph (4) | Col F: ImageURL (5) | Col G: ALT (6)
  else if (tabName === "Article" || tabName === "Artical") {
    sec["article"] = {
      title: row[1] || "",
      category: row[2] || "",
      deck: row[3] || "",
      body: row[4] || "",
      imageUrl: formatGoogleDriveUrl(row[5]),
      alt: row[6] || row[1] || ""
    };
  }

  // SPOTLIGHT TAB -> sec.spotlight
  // Col A: Town (0) | Col B: Business Name (1) | Col C: Description (2) | Col D: Website (3) | Col E: ImageURL (4) | Col F: ALT (5)
  else if (tabName === "Spotlight" || tabName === "Business Spotlight" || tabName === "Buisness Spotlight") {
    sec["spotlight"] = {
      name: row[1] || "",
      description: row[2] || "",
      website: row[3] || "",
      imageUrl: formatGoogleDriveUrl(row[4]),
      alt: row[5] || row[1] || ""
    };
  }

  // TOWN HISTORY TAB -> sec.history
  // Col A: Town (0) | Col B: Year (1) | Col C: Title (2) | Col D: Description (3) | Col E: Image (4) | Col F: Alt (5)
  else if (tabName === "Town History") {
    if (!sec["history"]) sec["history"] = [];
    sec["history"].push({
      year: row[1] ? String(row[1]) : "",
      title: row[2] || "",
      description: row[3] || "",
      imageUrl: formatGoogleDriveUrl(row[4]),
      alt: row[5] || row[2] || ""
    });
  }

  // PARTNERS TAB -> sec.partners
  // Col A: Town (0) | Col B: Business Name (1) | Col C: Website (2) | Col D: Image (3) | Col E: ALT (4)
  else if (tabName === "Partners") {
    if (!sec["partners"]) sec["partners"] = [];
    sec["partners"].push({
      name: row[1] || "",
      website: row[2] || "",
      imageUrl: formatGoogleDriveUrl(row[3]),
      alt: row[4] || row[1] || ""
    });
  }

  // TOWN LINKS TAB -> sec.town_links
  // Col A: Town (0) | Col B: Title (1) | Col C: Website (2)
  else if (tabName === "Town Links") {
    if (!sec["town_links"]) sec["town_links"] = { links: [] };
    sec["town_links"].links.push({
      title: row[1] || "",
      website: row[2] || ""
    });
  }

  // GAS WIDGET TAB -> sec.gas_widget (one entry per row, so a town can have several stations)
  // Col A: Town Name (0) | Col B: Title (1) | Col C: Gas Station ID (2)
  // Col D: Google Place ID (3) | Col E: Regular (4) | Col F: Diesel (5) | Col G: Price Updated (6)
  // Columns E-G are filled automatically by updateGasPricesFromGoogle() (SECTION 4).
  else if (tabName === "Gas_Widget" || tabName === "Gas Widget") {
    if (!sec["gas_widget"]) sec["gas_widget"] = [];
    sec["gas_widget"].push({
      title: row[1] ? String(row[1]).trim() : "",
      station_id: row[2] !== "" && row[2] !== null ? String(row[2]).trim() : "",
      google_place_id: row[3] ? String(row[3]).trim() : "",
      regular: (row[4] !== "" && row[4] !== null) ? Number(row[4]) : null,
      diesel: (row[5] !== "" && row[5] !== null) ? Number(row[5]) : null,
      price_updated: row[6] instanceof Date ? row[6].toISOString() : (row[6] ? String(row[6]) : "")
    });
  }

  // SPORTS TAB -> sec.sports (one entry per row, so a town can have several schools)
  // Col A: Town Name (0) | Col B: Scorestream Code (1) | Col C: Website (2) | Col D: School_Grade (3) | Col E: Score_Widget Script (4)
  else if (tabName === "Sports") {
    if (!sec["sports"]) sec["sports"] = [];
    sec["sports"].push({
      scorestream_code: row[1] !== "" && row[1] !== null ? String(row[1]).trim() : "",
      website: row[2] ? String(row[2]).trim() : "",
      school_grade: row[3] ? String(row[3]).trim() : "",
      score_widget_script: row[4] ? String(row[4]) : ""
    });
  }

  // MENU TAB -> containerObj.menu (Global menu bar on every page)
  // Col A: Town Name / menu label (0) | Col B: Website (1) | Col C: ImageURL (2) | Col D: Alt (3)
  // Col E: Category (4) - "More" puts the item in the More dropdown | Col F: image preview (not used)
  else if (tabName === "Menu") {
    if (!containerObj.menu) containerObj.menu = [];
    var colA = row[0] ? String(row[0]).trim() : "";
    var isGlobalLabel = !colA || colA.toLowerCase() === "global";
    var label = isGlobalLabel ? String(row[3] || "").trim() : colA;
    if (!label && !row[1]) return;   // nothing to show
    containerObj.menu.push({
      name: label,
      town: (!isGlobalLabel && MENU_TOWN_NAMES.indexOf(colA.toLowerCase()) !== -1) ? colA : "",
      website: row[1] ? String(row[1]).trim() : "",
      imageUrl: formatGoogleDriveUrl(row[2]),
      alt: row[3] ? String(row[3]).trim() : label,
      category: row[4] ? String(row[4]).trim() : ""
    });
  }

  // FOOTER TAB -> containerObj.footer (Root Global Object)
  // Col A: Town/Global (0) | Col B: Phone 1 (1) | Col C: Phone 2 (2) | Col D: Email (3) | Col E: Street (4) | Col F: City (5) | Col G: State (6) | Col H: Zip (7)
  else if (tabName === "Footer") {
    containerObj.footer = {
      phone1: row[1] || "",
      phone2: row[2] || "",
      email: row[3] || "",
      street: row[4] || "",
      city: row[5] || "",
      state: row[6] || "",
      zip: row[7] || ""
    };
  }

  // UNLISTED / DYNAMIC FALLBACK TABS
  else {
    if (!sec[cleanTab]) sec[cleanTab] = [];
    var rowData = {};
    headers.forEach(function(header, idx) {
      if (header) {
        var cleanHeader = sanitizeFirebaseKey(header.toString().toLowerCase().replace(/\s+/g, '_'));
        var val = row[idx] !== undefined ? row[idx] : "";
        if (typeof val === 'string' && val.indexOf('drive.google.com') !== -1) {
          val = formatGoogleDriveUrl(val);
        }
        rowData[cleanHeader] = val;
      }
    });
    sec[cleanTab].push(rowData);
  }
}
// === SECTION 4: Gas Prices from Google Places API (New) ===
/*
 * HOW IT WORKS
 *   1. findMissingPlaceIds()  - run once by hand. Looks up each Gas_Widget row's
 *                               Google Place ID (Col D) from Title + Town.
 *                               Hover over the Col D cell to see the address it matched.
 *   2. updateGasPricesFromGoogle() - runs on a timer. Asks Google for each station's
 *                               fuel prices, writes Regular/Diesel/Updated into
 *                               Cols E-G, then pushes everything to Firebase.
 *                               It also updates the live billboard at
 *                               /fuel_prices/<Col C station number> (reg, dsl, date),
 *                               unless someone posted a newer price through the form.
 *                               If Google has no price for a station, whatever you
 *                               typed in E/F is left alone (manual fallback).
 *   3. installGasPriceTrigger() - run once by hand to start the timer.
 *
 * SETUP
 *   - Google Cloud project with billing on, "Places API (New)" enabled.
 *   - API key saved in Apps Script: Project Settings -> Script Properties ->
 *     Property: PLACES_API_KEY   Value: your key
 *
 * COST
 *   Each station refresh = 1 "Place Details Enterprise + Atmosphere" call.
 *   1,000 free per month. stations x refreshes/day x 31 should stay under 1,000.
 *   e.g. 8 stations x 4/day (every 6 h) x 31 = 992.
 */

var GAS_TAB_NAME = "Gas_Widget";
var GAS_REFRESH_HOURS = 6;     // 1, 2, 4, 6, 8 or 12
var GAS_COL = { TOWN: 0, TITLE: 1, STATION_ID: 2, PLACE_ID: 3, REGULAR: 4, DIESEL: 5, UPDATED: 6 };

function getPlacesApiKey_() {
  var key = PropertiesService.getScriptProperties().getProperty("PLACES_API_KEY");
  if (!key) throw new Error("Missing Script Property PLACES_API_KEY (Project Settings -> Script Properties).");
  return key;
}

function getGasSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GAS_TAB_NAME) ||
              SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Gas Widget");
  if (!sheet) throw new Error("Tab '" + GAS_TAB_NAME + "' not found.");
  setupGasWidgetHeaders_(sheet);
  return sheet;
}

/**
 * Row 1 labels for the new columns D-G, plus a hover note on each.
 * Only fills a header cell if it is EMPTY - never overwrites anything you typed,
 * and never touches columns A-C or any data rows.
 */
function setupGasWidgetHeaders_(sheet) {
  var cols = [
    { title: "Google Place ID", note:
      "YOU FILL THIS IN (once per station). Paste ONE of these:\n" +
      "- a Google Maps link to the station\n" +
      "- the station's coordinates, e.g. 38.66869, -88.48876\n" +
      "- or leave blank to search by Title + Town\n" +
      "Then run findMissingPlaceIds - it swaps it for Google's ID (starts with ChIJ).\n" +
      "Hover the cell afterwards to see the address it matched." },
    { title: "Regular", note:
      "AUTOMATIC - filled from Google every few hours.\n" +
      "You can type a price here if Google has none for this station; it will be kept until Google has one." },
    { title: "Diesel", note:
      "AUTOMATIC - filled from Google every few hours.\n" +
      "You can type a price here if Google has none for this station; it will be kept until Google has one." },
    { title: "Price Updated", note:
      "AUTOMATIC - when Google last saw this price change. Don't edit." }
  ];
  var hdr = sheet.getRange(1, 4, 1, cols.length).getValues()[0];
  cols.forEach(function(c, i) {
    var cell = sheet.getRange(1, 4 + i);
    if (!hdr[i]) cell.setValue(c.title);
    if (!cell.getNote()) cell.setNote(c.note);
  });

  // Note on Column C too (note only - the header text itself is left alone)
  var cCell = sheet.getRange(1, 3);
  if (!cCell.getNote()) {
    cCell.setNote("Station number your gas widgets use in Firebase (fuel_prices/<this number>), e.g. 48101 = Flora Huck's.\n" +
                  "Google's prices are written there automatically.");
  }
}

/** Optional: run by hand to add the Row 1 labels/notes right now. */
function setupGasWidgetHeaders() {
  getGasSheet_();
  SpreadsheetApp.getActiveSpreadsheet().toast("Gas_Widget headers ready - hover Row 1 cells C-G for instructions.");
}

/**
 * Run once by hand (and again whenever you add stations).
 * Fills Col D (Google Place ID) for each Gas_Widget row. Col D can be:
 *   - blank            -> searches "<Title> gas station, <Town>"
 *   - a Google Maps link (full google.com/maps/place/... or maps.app.goo.gl short link)
 *                      -> finds the exact pin in that link
 *   - coordinates      -> e.g. 38.66869, -88.48876 (right-click the pin in Google Maps
 *                         and click the numbers to copy them); searches for the
 *                         Title (Col B) right at that spot
 *   - a Place ID       -> left alone (already done)
 * Hover over Col D afterwards to see the address it matched.
 */
function findMissingPlaceIds() {
  var apiKey = getPlacesApiKey_();
  var sheet = getGasSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

  rows.forEach(function(row, i) {
    var town = String(row[GAS_COL.TOWN] || "").trim();
    var title = String(row[GAS_COL.TITLE] || "").trim();
    var colD = String(row[GAS_COL.PLACE_ID] || "").trim();
    if (!town) return;

    var isLink = /^https?:\/\//i.test(colD);
    var coords = colD.match(/^\s*\(?\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*\)?\s*$/);
    if (colD && !isLink && !coords) return; // already has a Place ID

    var request = { includedType: "gas_station", maxResultCount: 1 };
    var described;

    if (coords) {
      request.textQuery = title || "gas station";
      request.locationBias = { circle: { center: { latitude: Number(coords[1]), longitude: Number(coords[2]) }, radius: 150 } };
      described = "coordinates (" + request.textQuery + " @ " + coords[1] + "," + coords[2] + ")";
    } else if (isLink) {
      var info = parseGoogleMapsLink_(colD);
      if (!info) {
        sheet.getRange(i + 2, GAS_COL.PLACE_ID + 1)
             .setNote("Couldn't read that Maps link. Copy the full link from the browser address bar instead.");
        return;
      }
      request.textQuery = (info.name || title || "gas station");
      request.locationBias = { circle: { center: { latitude: info.lat, longitude: info.lng }, radius: 150 } };
      described = "Maps link (" + request.textQuery + " @ " + info.lat + "," + info.lng + ")";
    } else {
      if (!title) return;
      request.textQuery = title + " gas station, " + town;
      described = "'" + request.textQuery + "'";
    }

    var resp = UrlFetchApp.fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "post",
      contentType: "application/json",
      headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "places.id,places.formattedAddress" },
      payload: JSON.stringify(request),
      muteHttpExceptions: true
    });

    var cell = sheet.getRange(i + 2, GAS_COL.PLACE_ID + 1);
    if (resp.getResponseCode() !== 200) {
      Logger.log("Lookup failed for " + described + ": " + resp.getContentText());
      return;
    }
    var places = (JSON.parse(resp.getContentText()).places) || [];
    if (!places.length) {
      cell.setNote("No match found for " + described + ". Paste a Google Maps link for the station in this cell and run again.");
      return;
    }
    cell.setValue(places[0].id);
    cell.setNote("Matched: " + (places[0].formattedAddress || "") +
                 "\nFrom: " + described +
                 "\nWrong station? Paste its Google Maps link here and run findMissingPlaceIds again.");
  });
}

/**
 * Reads the station name and pin location out of a Google Maps link.
 * Short links (maps.app.goo.gl) are expanded first.
 * Returns { name, lat, lng } or null.
 */
function parseGoogleMapsLink_(url) {
  var full = url;
  // Expand short links by following redirects ourselves (up to 5 hops)
  for (var hop = 0; hop < 5 && !/google\.[a-z.]+\/maps\/place\//i.test(full); hop++) {
    var r = UrlFetchApp.fetch(full, { followRedirects: false, muteHttpExceptions: true });
    var loc = r.getHeaders()["Location"] || r.getHeaders()["location"];
    if (!loc) break;
    full = loc;
  }

  var nameMatch = full.match(/\/maps\/place\/([^\/@?]+)/i);
  var name = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, " ")) : "";

  // Exact pin is in !3d<lat>!4d<lng>; fall back to the map center @lat,lng
  var pin = full.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || full.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!pin) return null;
  return { name: name, lat: Number(pin[1]), lng: Number(pin[2]) };
}

/** Timer job: refreshes Regular/Diesel from Google, then syncs to Firebase. */
function updateGasPricesFromGoogle() {
  var apiKey = getPlacesApiKey_();
  var sheet = getGasSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  var changed = false;

  rows.forEach(function(row, i) {
    var placeId = String(row[GAS_COL.PLACE_ID] || "").trim();
    if (!row[GAS_COL.TOWN] || !placeId) return;

    var resp = UrlFetchApp.fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId), {
      method: "get",
      headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "fuelOptions" },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) {
      Logger.log("Price fetch failed for " + row[GAS_COL.TITLE] + ": " + resp.getContentText());
      return;
    }

    var prices = ((JSON.parse(resp.getContentText()).fuelOptions) || {}).fuelPrices || [];
    var regular = null, diesel = null, midgrade = null, premium = null, newest = null;
    prices.forEach(function(p) {
      if (!p.price) return;
      var value = Number(p.price.units || 0) + Number(p.price.nanos || 0) / 1e9;
      if (p.type === "REGULAR_UNLEADED") regular = value;
      else if (p.type === "DIESEL") diesel = value;
      else if (p.type === "MIDGRADE") midgrade = value;
      else if (p.type === "PREMIUM") premium = value;
      else return;
      if (p.updateTime && (!newest || p.updateTime > newest)) newest = p.updateTime;
    });

    var r = i + 2;

    // Also feed the live billboard at /fuel_prices/<station_id> (Col C)
    var stationId = String(row[GAS_COL.STATION_ID] || "").trim();
    if (stationId && (regular !== null || diesel !== null)) {
      pushToBillboard_(stationId, regular, diesel, newest, midgrade, premium);
    }

    if (regular !== null) {
      sheet.getRange(r, GAS_COL.REGULAR + 1).setValue(Math.round(regular * 1000) / 1000).setNumberFormat("$0.00");
      changed = true;
    }
    if (diesel !== null) {
      sheet.getRange(r, GAS_COL.DIESEL + 1).setValue(Math.round(diesel * 1000) / 1000).setNumberFormat("$0.00");
      changed = true;
    }
    if (newest) {
      sheet.getRange(r, GAS_COL.UPDATED + 1).setValue(new Date(newest)).setNumberFormat("m/d/yyyy h:mm am/pm");
    }
    if (regular === null && diesel === null) {
      Logger.log("Google has no regular/diesel price for " + row[GAS_COL.TITLE] + " (" + row[GAS_COL.TOWN] + "); kept existing values.");
    }
  });

  SpreadsheetApp.flush();
  if (changed) pushMasterDataToFirebase();
}

/**
 * Writes Google's price into /fuel_prices/<stationId> in the same shape the
 * billboard and the community update form use: { reg, mid, pre, dsl, date }.
 * Only overwrites when Google's price is NEWER than what's there, so a price
 * someone typed in through the update form is never replaced by an older one.
 */
function pushToBillboard_(stationId, regular, diesel, googleUpdateIso, midgrade, premium) {
  var base = "https://smlc-fuel-monitor-default-rtdb.firebaseio.com/fuel_prices/" + encodeURIComponent(stationId) + ".json";
  var googleTime = googleUpdateIso ? new Date(googleUpdateIso) : new Date();

  // What's on the billboard now?
  var current = null;
  try {
    var got = UrlFetchApp.fetch(base, { muteHttpExceptions: true });
    if (got.getResponseCode() === 200) current = JSON.parse(got.getContentText());
  } catch (e) {}

  var currentTime = current && current.date ? parseBillboardDate_(current.date) : null;
  if (currentTime && currentTime >= googleTime) {
    Logger.log("Billboard " + stationId + " already has a newer price (" + current.date + "); left it alone.");
    return;
  }

  var update = {
    date: Utilities.formatDate(googleTime, "America/Chicago", "M/d/yyyy '@' h:mm a") + " CST"
  };
  if (regular !== null) update.reg = regular.toFixed(2);
  if (diesel !== null) update.dsl = diesel.toFixed(2);
  if (midgrade) update.mid = midgrade.toFixed(2);
  if (premium) update.pre = premium.toFixed(2);

  var resp = UrlFetchApp.fetch(base, {
    method: "patch",
    contentType: "application/json",
    payload: JSON.stringify(update),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) {
    Logger.log("Billboard write failed for " + stationId + ": " + resp.getContentText());
  }
}

/** Reads the form's date text, e.g. "10/31/2026 @ 3:45 PM CST", as Chicago time. */
function parseBillboardDate_(text) {
  var m = String(text).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*@\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  var hour = Number(m[4]) % 12 + (m[6].toUpperCase() === "PM" ? 12 : 0);
  var guess = new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]), hour, Number(m[5])));
  var offset = Utilities.formatDate(guess, "America/Chicago", "XXX"); // e.g. -05:00 or -06:00
  var sign = offset.charAt(0) === "-" ? 1 : -1;
  var parts = offset.substring(1).split(":");
  return new Date(guess.getTime() + sign * (Number(parts[0]) * 60 + Number(parts[1])) * 60000);
}

/** Run once by hand: starts the automatic refresh (replaces any old one). */
function installGasPriceTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "updateGasPricesFromGoogle") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("updateGasPricesFromGoogle").timeBased().everyHours(GAS_REFRESH_HOURS).create();
  Logger.log("Gas price refresh scheduled every " + GAS_REFRESH_HOURS + " hours.");
}

// === SECTION 5: SMLC Photos (was the separate SMLCPhotos.gs file) ===
/* ==========================================================================
   Active Version: 2026-11-02_v1.2  |  Updated: Nov 2, 2026 8:10 PM ET
   File: SMLCPhotos.gs (Google Apps Script - goes in the SMLC Sheet, next to Code.gs)
   Project: SMLC Photos - signed-in uploader, public photo sharing, approvals, gallery

   WHAT IT DOES
     - Authorized users (signed in with Google through Firebase) save pictures
       straight into the SMLC GitHub repository (images/...). Nobody needs a
       GitHub token on their own device: the token lives here, in Script Properties.
     - The public "Share Your Photos" page sends photos here. They are kept in a
       private Drive folder + a private "SMLC Photo Submissions" spreadsheet
       (NOT a tab in this sheet, so Code.gs never publishes anyone's email).
     - Approving a photo saves it to GitHub and adds it to this sheet's "Gallery" tab,
       which Code.gs syncs to Firebase for the public Gallery page.

   WHO IS AUTHORIZED
     Firebase Realtime Database -> smlc_admins. One entry per person, key = email
     with dots changed to commas, value = true. Example:
        smlc_admins
          raykevin71888@gmail,com : true
     (Add or remove people right in the Firebase console - no code change.)

   SETUP (once)
     1. Project Settings -> Script Properties -> add:
          SMLC_GITHUB_TOKEN = fine-grained token, Werewolf3788/SMLC only, Contents: Read and write
                              (Apps Script Script Properties - NOT GitHub's Secrets page)
          NOTIFY_EMAILS  = (optional) emails to tell about new public photos, comma separated
     2. Deploy -> New deployment -> type "Web app"
          Execute as: Me      Who has access: Anyone
        Copy the /exec link and put it in smlc-photos-config.js (ENDPOINT).
     3. After changing this file later: Deploy -> Manage deployments -> edit -> Version: New version.
   ========================================================================== */

var PH_VERSION = "v1.7 - Nov 2, 2026 9:00 PM ET";
var PH_REPO = "Werewolf3788/SMLC";
var PH_BRANCH = "Claude-Test";                 // the branch the live site is published from
var PH_FOLDER = "images";
var PH_FIREBASE_API_KEY = "AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg";   // public web key (same as the website)
var PH_RTDB = "https://smlc-fuel-monitor-default-rtdb.firebaseio.com";
var PH_GALLERY_TAB = "Gallery";
var PH_GALLERY_HEADERS = ["Town", "Image", "Place", "Group", "Caption", "Era", "Year", "Credit", "Show", "Added", "Source", "Alt", "Month", "Day"];
var PH_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var PH_SUB_HEADERS = ["Received", "Status", "Place", "Group", "Caption", "Era", "Year", "Credit", "Submitted By", "Email",
                      "Drive File ID", "Reviewed By", "Reviewed On", "Image Link"];
var PH_MAX_PUBLIC_PER_DAY = 60;
var PH_MAX_BYTES = 9 * 1024 * 1024;

// ---- one-click token setup -------------------------------------------------------------
/** Run this once from the Apps Script editor (pick it in the function list, click Run).
 *  A box opens in the Google Sheet: paste the GitHub token and click OK.
 *  It is stored privately in this script's Script Properties - never in the code. */
function saveGitHubToken() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt("SMLC Photos - GitHub token",
    "Paste the GitHub token (starts with github_pat_) and click OK.\nIt is stored privately in this Sheet's script, not in the website.",
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var t = String(res.getResponseText() || "").trim();
  if (!/^(github_pat_|ghp_)/.test(t)) { ui.alert("That doesn't look like a GitHub token (it should start with github_pat_)."); return; }
  PropertiesService.getScriptProperties().setProperty("SMLC_GITHUB_TOKEN", t);
  var check = UrlFetchApp.fetch("https://api.github.com/repos/" + PH_REPO, {
    muteHttpExceptions: true, headers: { "Authorization": "Bearer " + t, "Accept": "application/vnd.github+json" } });
  ui.alert(check.getResponseCode() === 200
    ? "Saved. The token works with " + PH_REPO + "."
    : "Saved, but GitHub answered " + check.getResponseCode() + " - check the token has access to " + PH_REPO + ".");
}

/** Run this ONCE from the editor (choose it in the function list, click Run).
 *  Google asks you to approve the permissions the photo page needs (GitHub, Drive, Sheets, email),
 *  then it checks each part and shows the result in the Execution log. */
function setupSMLCPhotos() {
  var out = [];
  try { phGitHubToken_(); out.push("GitHub key: found"); } catch (e) { out.push("GitHub key: MISSING - run saveGitHubToken"); }
  try {
    var r = phGh_("https://api.github.com/repos/" + PH_REPO);
    out.push("GitHub access: " + (r.getResponseCode() === 200 ? "OK" : "HTTP " + r.getResponseCode()));
  } catch (e) { out.push("GitHub access: " + e.message); }
  try { phSubmissionsFolder_(); out.push("Private Drive folder: OK"); } catch (e) { out.push("Drive folder: " + e.message); }
  try { phSubmissionsSheet_(); out.push("Private submissions sheet: OK"); } catch (e) { out.push("Submissions sheet: " + e.message); }
  try { out.push("Email quota left today: " + MailApp.getRemainingDailyQuota()); } catch (e) { out.push("Email: " + e.message); }
  Logger.log("SMLC Photos " + PH_VERSION + "\n" + out.join("\n") +
    "\n\nNext: Deploy -> Manage deployments -> pencil -> Version: New version -> Deploy (Who has access: Anyone).");
}

// ---- entry point ---------------------------------------------------------------
function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    switch (req.action) {
      case "whoami":          out = phWhoAmI_(req); break;
      case "upload":          out = phUpload_(req); break;
      case "submit":          out = phSubmit_(req); break;
      case "listSubmissions": out = phListSubmissions_(req); break;
      case "review":          out = phReview_(req); break;
      default: throw new Error("Unknown action.");
    }
    out.ok = true;
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  out.version = PH_VERSION;
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: "SMLC Photos", version: PH_VERSION }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- sign-in check ------------------------------------------------------------------
function phEmailKey_(email) { return String(email || "").toLowerCase().replace(/\./g, ","); }

/** Confirms the Firebase sign-in with Google, then checks smlc_admins. Returns { email, admin }. */
function phCheckUser_(idToken) {
  if (!idToken) throw new Error("Please sign in.");
  var r = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + PH_FIREBASE_API_KEY, {
    method: "post", contentType: "application/json", payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) throw new Error("Your sign-in has expired. Please sign in again.");
  var user = (JSON.parse(r.getContentText()).users || [])[0];
  if (!user || !user.email) throw new Error("Could not read your sign-in.");
  if (!user.emailVerified) throw new Error("Your Google email is not verified.");
  // Reading your own smlc_admins entry with your sign-in proves you're on the list
  var a = UrlFetchApp.fetch(PH_RTDB + "/smlc_admins/" + encodeURIComponent(phEmailKey_(user.email)) + ".json?auth=" + encodeURIComponent(idToken),
                            { muteHttpExceptions: true });
  var admin = a.getResponseCode() === 200 && a.getContentText().trim() === "true";
  return { email: user.email, admin: admin };
}
function phRequireAdmin_(idToken) {
  var u = phCheckUser_(idToken);
  if (!u.admin) throw new Error(u.email + " is not authorized. Ask an administrator to add you in Firebase (smlc_admins).");
  return u;
}

function phWhoAmI_(req) {
  var u = phCheckUser_(req.idToken);
  return { email: u.email, admin: u.admin };
}

// ---- GitHub ---------------------------------------------------------------------
function phGitHubToken_() {
  var props = PropertiesService.getScriptProperties();
  var t = props.getProperty("SMLC_GITHUB_TOKEN") || props.getProperty("GITHUB_TOKEN");
  if (!t) throw new Error("SMLC_GITHUB_TOKEN is missing (Apps Script -> Project Settings -> Script Properties).");
  return t;
}
function phApiPath_(path) { return "https://api.github.com/repos/" + PH_REPO + "/contents/" + path.split("/").map(encodeURIComponent).join("/"); }
function phGh_(url, opts) {
  opts = opts || {};
  opts.muteHttpExceptions = true;
  opts.headers = { "Authorization": "Bearer " + phGitHubToken_(), "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  return UrlFetchApp.fetch(url, opts);
}
function phExistingSha_(path) {
  var r = phGh_(phApiPath_(path) + "?ref=" + encodeURIComponent(PH_BRANCH));
  return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()).sha : null;
}
function phRawUrl_(path) {
  return "https://raw.githubusercontent.com/" + PH_REPO + "/" + encodeURIComponent(PH_BRANCH) + "/" + path.split("/").map(encodeURIComponent).join("/");
}
function phSlug_(s) {
  return String(s || "").toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
/** "flora" + "Flora water tower" -> "flora-water-tower" (town only added when the name doesn't start with it) */
function phTownSlug_(place, name) {
  var t = phSlug_(String(place || "").replace(/\s+township$/i, "")), n = phSlug_(name || "photo");
  return (t && n.indexOf(t) !== 0) ? (t + "-" + n).slice(0, 80) : n;
}
/** First free name: flora-depot.jpg, flora-depot-2.jpg, ... */
function phFreePath_(base, ext) {
  for (var n = 1; n < 50; n++) {
    var path = PH_FOLDER + "/" + base + (n > 1 ? "-" + n : "") + "." + ext;
    if (!phExistingSha_(path)) return path;
  }
  throw new Error("Too many pictures with that name.");
}
function phCommit_(path, base64, message, sha) {
  var body = { message: message, content: base64, branch: PH_BRANCH };
  if (sha) body.sha = sha;
  var r = phGh_(phApiPath_(path), { method: "put", contentType: "application/json", payload: JSON.stringify(body) });
  var code = r.getResponseCode();
  if (code !== 200 && code !== 201) {
    var msg = ""; try { msg = JSON.parse(r.getContentText()).message; } catch (e) {}
    throw new Error("GitHub refused the save (" + code + (msg ? ": " + msg : "") + "). Check SMLC_GITHUB_TOKEN has Contents: Read and write.");
  }
  return phRawUrl_(path);
}

// ---- Gallery tab (in this sheet; Code.gs syncs it) --------------------------------------
/** Column A of the Gallery tab: the town picked, so Code.gs files the photo under that town.
 *  County-wide photos go under Global. */
function phTownCol_(place) {
  var p = String(place || "").trim();
  return (!p || p.toLowerCase() === "clay county") ? "Global" : p;
}
function phGalleryAdd_(row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PH_GALLERY_TAB);
  if (!sh) {
    sh = ss.insertSheet(PH_GALLERY_TAB);
    sh.getRange(1, 1, 1, PH_GALLERY_HEADERS.length).setValues([PH_GALLERY_HEADERS]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  // Match columns by their header names, and add any missing headers (e.g. "Alt") at the end
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  PH_GALLERY_HEADERS.forEach(function (h) {
    if (head.indexOf(h) === -1) { head.push(h); sh.getRange(1, head.length).setValue(h).setFontWeight("bold"); }
  });
  var values = head.map(function (h) { return row[h] !== undefined ? row[h] : ""; });
  sh.appendRow(values);
  var showCol = head.indexOf("Show") + 1;
  sh.getRange(1, showCol).setNote("Untick Show to hide a photo from the public Gallery page.");
  sh.getRange(sh.getLastRow(), showCol).insertCheckboxes().setValue(row.Show !== false);
  // Send it to Firebase now (Code.gs). Edits made by a script don't fire the On edit trigger.
  if (typeof pushMasterDataToFirebase === "function") {
    try { pushMasterDataToFirebase(); } catch (e) { Logger.log("Firebase sync after gallery add failed: " + e); }
  }
}

// ---- signed-in upload --------------------------------------------------------------
function phUpload_(req) {
  var u = phRequireAdmin_(req.idToken);
  if (!req.base64) throw new Error("No picture was sent.");
  if (req.base64.length * 0.75 > PH_MAX_BYTES) throw new Error("That picture is too large. Choose a smaller width.");
  var ext = /^(png|jpg|jpeg|gif|webp)$/i.test(req.ext || "") ? req.ext.toLowerCase() : "jpg";
  var slug = phSlug_(req.name);
  if (!slug) throw new Error("Please give the picture a name.");
  var path = PH_FOLDER + "/" + slug + "." + ext;
  var sha = phExistingSha_(path);
  if (sha && !req.overwrite) return { exists: true, path: path };
  var link = phCommit_(path, req.base64, (sha ? "Replace " : "Add ") + path + " (SMLC Photos, " + u.email + ")", sha);

  if (req.addToGallery) {
    phGalleryAdd_({
      Town: phTownCol_(req.place), Image: link, Place: req.place || "", Group: req.group || "", Caption: req.caption || "",
      Era: req.era || "", Year: req.year || "", Credit: req.credit || "", Show: true, Added: new Date(), Source: "Uploaded by " + u.email, Alt: String(req.alt || "").slice(0, 300)
    });
  }
  return { path: path, link: link, replaced: !!sha };
}

// ---- public submissions (kept OUT of the synced sheet) ---------------------------------------
function phSubmissionsSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SUBMISSIONS_SHEET_ID");
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create("SMLC Photo Submissions (private)");
    props.setProperty("SUBMISSIONS_SHEET_ID", ss.getId());
    var sh0 = ss.getSheets()[0];
    sh0.setName("Submissions");
    sh0.getRange(1, 1, 1, PH_SUB_HEADERS.length).setValues([PH_SUB_HEADERS]).setFontWeight("bold");
    sh0.setFrozenRows(1);
  }
  return ss.getSheetByName("Submissions") || ss.getSheets()[0];
}
function phSubmissionsFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SUBMISSIONS_FOLDER_ID");
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder("SMLC Photo Submissions (private)");
  props.setProperty("SUBMISSIONS_FOLDER_ID", f.getId());
  return f;
}

function phSubmit_(req) {
  if (req.hp) return { received: true };                       // spam trap filled in -> pretend it worked
  if (!req.consent) throw new Error("Please confirm you have the right to share this photo.");
  if (!req.base64) throw new Error("Please choose a photo.");
  if (req.base64.length * 0.75 > PH_MAX_BYTES) throw new Error("That photo is too large.");
  if (!req.place) throw new Error("Please choose where the photo was taken.");

  var props = PropertiesService.getScriptProperties();
  var dayKey = "SUBS_" + Utilities.formatDate(new Date(), "America/Chicago", "yyyyMMdd");
  var count = Number(props.getProperty(dayKey) || 0);
  if (count >= PH_MAX_PUBLIC_PER_DAY) throw new Error("We've received a lot of photos today. Please try again tomorrow.");
  props.setProperty(dayKey, String(count + 1));

  var clean = function (s, n) { return String(s || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n || 300); };
  var mime = /^image\/(png|jpeg|gif|webp)$/.test(req.mimeType || "") ? req.mimeType : "image/jpeg";
  var ext = mime === "image/png" ? "png" : "jpg";
  var place = clean(req.place, 80), caption = clean(req.caption, 300);
  var credit = clean(req.credit, 120) || clean(req.name, 120);
  // Month and day are optional. Day is only kept when a month was chosen.
  var month = PH_MONTHS.indexOf(clean(req.month, 20)) >= 0 ? clean(req.month, 20) : "";
  var dayNum = Number(clean(req.day, 2));
  var day = (month && dayNum >= 1 && dayNum <= 31) ? String(Math.floor(dayNum)) : "";

  // Publish right away: save into images/ (named after the town) and add it to the Gallery tab
  var path = phFreePath_(phTownSlug_(place, caption), ext);
  var link = phCommit_(path, req.base64, "Add " + path + " (shared by the public)");
  phGalleryAdd_({
    Town: phTownCol_(place), Image: link, Place: place, Group: clean(req.group, 80), Caption: caption, Era: clean(req.era, 20),
    Year: clean(req.year, 20), Credit: credit, Show: true, Added: new Date(), Source: "Shared by the public", Alt: clean(req.alt, 300),
    Month: month, Day: day
  });

  // Private record (who sent what) - kept out of the synced sheet so emails never go public
  phSubmissionsSheet_().appendRow([new Date(), "Published", place, clean(req.group, 80), caption,
    clean(req.era, 20), clean(req.year, 20), credit, clean(req.name, 120), clean(req.email, 160), "", "", "", link]);

  var notify = props.getProperty("NOTIFY_EMAILS");
  if (notify) {
    try {
      MailApp.sendEmail(notify, "New photo on SMLC: " + place,
        "A photo was just added to the Clay County Photo Gallery for " + place + (caption ? " (" + caption + ")" : "") + ".\n\n" + link +
        "\n\nTo take it down: open the SMLC Sheet -> Gallery tab -> untick Show on that row.");
    } catch (e) { Logger.log("Notify email failed: " + e); }
  }
  return { received: true, published: true, link: link };
}

function phListSubmissions_(req) {
  phRequireAdmin_(req.idToken);
  var sh = phSubmissionsSheet_();
  if (sh.getLastRow() < 2) return { items: [] };
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, PH_SUB_HEADERS.length).getValues();
  var items = [];
  rows.forEach(function (r, i) {
    if (r[1] !== "Pending") return;
    var preview = "";
    try {
      var thumb = DriveApp.getFileById(r[10]).getThumbnail();
      if (thumb) preview = "data:" + thumb.getContentType() + ";base64," + Utilities.base64Encode(thumb.getBytes());
    } catch (e) {}
    items.push({ row: i + 2, received: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), place: r[2], group: r[3],
      caption: r[4], era: r[5], year: String(r[6] || ""), credit: r[7], name: r[8], email: r[9], preview: preview });
  });
  return { items: items.slice(0, 40) };
}

function phReview_(req) {
  var u = phRequireAdmin_(req.idToken);
  var sh = phSubmissionsSheet_();
  var rowNum = Number(req.row);
  if (!rowNum || rowNum < 2 || rowNum > sh.getLastRow()) throw new Error("That photo was not found.");
  var r = sh.getRange(rowNum, 1, 1, PH_SUB_HEADERS.length).getValues()[0];
  if (r[1] !== "Pending") throw new Error("That photo was already reviewed (" + r[1] + ").");
  var file = DriveApp.getFileById(r[10]);

  if (req.decision === "reject") {
    sh.getRange(rowNum, 2).setValue("Rejected");
    sh.getRange(rowNum, 12, 1, 2).setValues([[u.email, new Date()]]);
    try { file.setTrashed(true); } catch (e) {}
    return { rejected: true };
  }

  // Approve: allow small edits from the reviewer
  var place = req.place || r[2], caption = req.caption !== undefined ? req.caption : r[4];
  var credit = req.credit !== undefined ? req.credit : (r[7] || r[8]);
  var blob = file.getBlob();
  var ext = /png/i.test(blob.getContentType()) ? "png" : "jpg";
  var path = phFreePath_(phTownSlug_(place, caption), ext);
  var link = phCommit_(path, Utilities.base64Encode(blob.getBytes()), "Add " + path + " (shared photo approved by " + u.email + ")");

  phGalleryAdd_({
    Town: phTownCol_(place), Image: link, Place: place, Group: r[3], Caption: caption, Era: r[5], Year: r[6],
    Credit: credit, Show: true, Added: new Date(), Source: "Shared by the public", Alt: req.alt || ""
  });
  sh.getRange(rowNum, 2).setValue("Approved");
  sh.getRange(rowNum, 12, 1, 3).setValues([[u.email, new Date(), link]]);
  return { approved: true, link: link, path: path };
}
