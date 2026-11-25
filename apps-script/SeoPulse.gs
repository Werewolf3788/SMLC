/* ==========================================================================
   SMLC SEO Pulse | v1.0 | 2026-11-23
   Once a day, saves how supportmylocalcommunity.com ranks, next to the visit
   counts, so admin/site-pulse.html can show it:

     community_pulse/days/<YYYY-MM-DD>/seo/authority   Open PageRank score (0-10) + world rank
     community_pulse/days/<YYYY-MM-DD>/seo/google      Google Search Console, last 28 days:
                                                        totals, top searches, top pages

   SET UP (once) — its own small Apps Script project:
     1. script.google.com -> New project -> name it "SMLC SEO Pulse".
     2. Project Settings -> tick "Show appsscript.json manifest file in editor".
        Replace appsscript.json with the contents of apps-script/appsscript.seo.json
        (adds the Keys library and permission to read Search Console).
     3. Paste this file into Code.gs. Save.
     4. Run  setupSeoPulse  once and approve the permissions. It adds the daily
        timer and runs the first check right away.

   KEYS (from the Key Vault, no pasting into the script):
     Keys.get('openpagerank_api_key')  -> free at https://www.domcop.com/openpagerank/
   GOOGLE SEARCH CONSOLE: no key. The Google account running this script must be
   added as a user on the supportmylocalcommunity.com property in Search Console
   (Scott: Search Console -> Settings -> Users and permissions -> Add user).
   ========================================================================== */

var SEO_DOMAIN = "supportmylocalcommunity.com";
var SEO_RTDB = "https://smlc-fuel-monitor-default-rtdb.firebaseio.com";
// Search Console property names to try (domain property first, then the https site)
var SEO_GSC_SITES = ["sc-domain:" + SEO_DOMAIN, "https://" + SEO_DOMAIN + "/", "https://www." + SEO_DOMAIN + "/"];

function setupSeoPulse() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "runSeoPulse") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("runSeoPulse").timeBased().everyDays(1).atHour(6).create();
  runSeoPulse();
}

function runSeoPulse() {
  var day = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd");   // Clay County is Central Time
  var seo = {};
  try { seo.authority = seoAuthority_(day); } catch (e) { Logger.log("Authority: " + e); }
  try { seo.google = seoGoogle_(); } catch (e) { Logger.log("Search Console: " + e); }
  if (!seo.authority && !seo.google) { Logger.log("Nothing to save today."); return; }
  var r = UrlFetchApp.fetch(SEO_RTDB + "/community_pulse/days/" + day + "/seo.json", {
    method: "put", contentType: "application/json", payload: JSON.stringify(seo), muteHttpExceptions: true
  });
  Logger.log("Saved SEO pulse for " + day + ": HTTP " + r.getResponseCode());
}

// ---- Open PageRank (free authority score, 0-10) -----------------------------------
function seoAuthority_(day) {
  var key = "";
  try { key = Keys.get("openpagerank_api_key"); } catch (e) {}
  key = String(key || "").trim();
  if (!key) throw new Error("openpagerank_api_key is empty in the Keys sheet");
  // New Open PageRank API (openpagerank.keywordseverywhere.com): keys start with opr_live_
  if (/^opr_/.test(key)) {
    var r = UrlFetchApp.fetch("https://openpagerank.keywordseverywhere.com/v1/domains/bulk", {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      headers: { Authorization: "Bearer " + key },
      payload: JSON.stringify({ domains: [SEO_DOMAIN], include_history: false })
    });
    var j = JSON.parse(r.getContentText() || "{}");
    var row = j.results && j.results[0];
    if (r.getResponseCode() !== 200 || !row) throw new Error("Open PageRank said: " + r.getContentText().slice(0, 300));
    return { score: row.found ? Number(row.open_page_rank) || 0 : 0, rank: row.rank || null,
             referring: row.referring_domains || 0, asOf: j.as_of || "", day: day };
  }
  // Older DomCop key
  var r2 = UrlFetchApp.fetch("https://openpagerank.com/api/v1.0/getPageRank?domains%5B0%5D=" + encodeURIComponent(SEO_DOMAIN), {
    headers: { "API-OPR": key }, muteHttpExceptions: true
  });
  var j2 = JSON.parse(r2.getContentText() || "{}");
  var row2 = j2.response && j2.response[0];
  if (!row2 || String(row2.status_code) !== "200") throw new Error("Open PageRank said: " + r2.getContentText().slice(0, 300));
  return { score: Number(row2.page_rank_decimal) || 0, rank: row2.rank ? Number(row2.rank) : null, day: day };
}

// ---- Google Search Console (last 28 days) -------------------------------------------
function seoGoogle_() {
  var end = new Date(); end.setDate(end.getDate() - 2);          // Google's data runs ~2 days behind
  var start = new Date(end); start.setDate(start.getDate() - 27);
  var fmt = function (d) { return Utilities.formatDate(d, "America/Chicago", "yyyy-MM-dd"); };
  var range = { startDate: fmt(start), endDate: fmt(end) };
  var lastErr = "";
  for (var i = 0; i < SEO_GSC_SITES.length; i++) {
    var site = SEO_GSC_SITES[i];
    var totals = seoGscQuery_(site, Object.assign({}, range, { rowLimit: 1 }));
    if (totals.error) { lastErr = totals.error; continue; }
    var t = (totals.rows && totals.rows[0]) || { clicks: 0, impressions: 0, position: 0 };
    var q = seoGscQuery_(site, Object.assign({}, range, { dimensions: ["query"], rowLimit: 25 }));
    var p = seoGscQuery_(site, Object.assign({}, range, { dimensions: ["page"], rowLimit: 25 }));
    var rows = function (res) {
      return (res.rows || []).map(function (x) {
        return { key: String(x.keys[0]).slice(0, 200), clicks: x.clicks || 0, impressions: x.impressions || 0, position: Math.round((x.position || 0) * 10) / 10 };
      });
    };
    return {
      site: site, range: range.startDate + " to " + range.endDate,
      totals: { clicks: t.clicks || 0, impressions: t.impressions || 0, position: Math.round((t.position || 0) * 10) / 10 },
      queries: rows(q), pages: rows(p)
    };
  }
  throw new Error("No Search Console access yet (" + lastErr + ")");
}
function seoGscQuery_(site, body) {
  var r = UrlFetchApp.fetch("https://searchconsole.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(site) + "/searchAnalytics/query", {
    method: "post", contentType: "application/json", payload: JSON.stringify(body),
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) return { error: r.getResponseCode() + " " + r.getContentText().slice(0, 200) };
  return JSON.parse(r.getContentText());
}
