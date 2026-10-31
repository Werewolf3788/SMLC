/* ==========================================================================
   Active Version: 2026-10-31_v5
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
    var regular = null, diesel = null, newest = null;
    prices.forEach(function(p) {
      if (!p.price) return;
      var value = Number(p.price.units || 0) + Number(p.price.nanos || 0) / 1e9;
      if (p.type === "REGULAR_UNLEADED") regular = value;
      else if (p.type === "DIESEL") diesel = value;
      else return;
      if (p.updateTime && (!newest || p.updateTime > newest)) newest = p.updateTime;
    });

    var r = i + 2;

    // Also feed the live billboard at /fuel_prices/<station_id> (Col C)
    var stationId = String(row[GAS_COL.STATION_ID] || "").trim();
    if (stationId && (regular !== null || diesel !== null)) {
      pushToBillboard_(stationId, regular, diesel, newest);
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
 * billboard and the community update form use: { reg, dsl, date }.
 * Only overwrites when Google's price is NEWER than what's there, so a price
 * someone typed in through the update form is never replaced by an older one.
 */
function pushToBillboard_(stationId, regular, diesel, googleUpdateIso) {
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
