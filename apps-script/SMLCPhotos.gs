/* ==========================================================================
   Active Version: 2026-11-02_v1  |  Updated: Nov 2, 2026 6:10 PM ET
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
          GITHUB_TOKEN   = fine-grained token, Werewolf3788/SMLC only, Contents: Read and write
          NOTIFY_EMAILS  = (optional) emails to tell about new public photos, comma separated
     2. Deploy -> New deployment -> type "Web app"
          Execute as: Me      Who has access: Anyone
        Copy the /exec link and put it in smlc-photos-config.js (ENDPOINT).
     3. After changing this file later: Deploy -> Manage deployments -> edit -> Version: New version.
   ========================================================================== */

var PH_VERSION = "v1 - Nov 2, 2026 6:10 PM ET";
var PH_REPO = "Werewolf3788/SMLC";
var PH_BRANCH = "Claude-Test";                 // the branch the live site is published from
var PH_FOLDER = "images";
var PH_FIREBASE_API_KEY = "AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg";   // public web key (same as the website)
var PH_RTDB = "https://smlc-fuel-monitor-default-rtdb.firebaseio.com";
var PH_GALLERY_TAB = "Gallery";
var PH_GALLERY_HEADERS = ["Town", "Image", "Place", "Group", "Caption", "Era", "Year", "Credit", "Show", "Added", "Source"];
var PH_SUB_HEADERS = ["Received", "Status", "Place", "Group", "Caption", "Era", "Year", "Credit", "Submitted By", "Email",
                      "Drive File ID", "Reviewed By", "Reviewed On", "Image Link"];
var PH_MAX_PUBLIC_PER_DAY = 60;
var PH_MAX_BYTES = 9 * 1024 * 1024;

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
  var t = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!t) throw new Error("GITHUB_TOKEN is missing in Script Properties.");
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
    throw new Error("GitHub refused the save (" + code + (msg ? ": " + msg : "") + "). Check GITHUB_TOKEN has Contents: Read and write.");
  }
  return phRawUrl_(path);
}

// ---- Gallery tab (in this sheet; Code.gs syncs it) --------------------------------------
function phGalleryAdd_(row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PH_GALLERY_TAB);
  if (!sh) {
    sh = ss.insertSheet(PH_GALLERY_TAB);
    sh.getRange(1, 1, 1, PH_GALLERY_HEADERS.length).setValues([PH_GALLERY_HEADERS]).setFontWeight("bold");
    sh.setFrozenRows(1);
    sh.getRange(1, 9).setNote("Untick Show to hide a photo from the public Gallery page.");
  }
  var values = PH_GALLERY_HEADERS.map(function (h) { return row[h] !== undefined ? row[h] : ""; });
  sh.appendRow(values);
  sh.getRange(sh.getLastRow(), 9).insertCheckboxes().setValue(row.Show !== false);
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
      Town: "Global", Image: link, Place: req.place || "", Group: req.group || "", Caption: req.caption || "",
      Era: req.era || "", Year: req.year || "", Credit: req.credit || "", Show: true, Added: new Date(), Source: "Uploaded by " + u.email
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
  var blob = Utilities.newBlob(Utilities.base64Decode(req.base64), mime,
    phSlug_(req.place + " " + (req.caption || "photo")) + "." + (mime === "image/png" ? "png" : "jpg"));
  var file = phSubmissionsFolder_().createFile(blob);

  phSubmissionsSheet_().appendRow([new Date(), "Pending", clean(req.place, 80), clean(req.group, 80), clean(req.caption, 300),
    clean(req.era, 20), clean(req.year, 20), clean(req.credit, 120), clean(req.name, 120), clean(req.email, 160),
    file.getId(), "", "", ""]);

  var notify = props.getProperty("NOTIFY_EMAILS");
  if (notify) {
    try {
      MailApp.sendEmail(notify, "New SMLC photo to review: " + clean(req.place, 80),
        "A new photo was shared for " + clean(req.place, 80) + (req.caption ? " (" + clean(req.caption, 120) + ")" : "") +
        ".\n\nReview it in the SMLC Image Uploader (sign in) under Photos waiting for approval.");
    } catch (e) { Logger.log("Notify email failed: " + e); }
  }
  return { received: true };
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
  var path = phFreePath_(phSlug_(place + " " + (caption || "photo")), ext);
  var link = phCommit_(path, Utilities.base64Encode(blob.getBytes()), "Add " + path + " (shared photo approved by " + u.email + ")");

  phGalleryAdd_({
    Town: "Global", Image: link, Place: place, Group: r[3], Caption: caption, Era: r[5], Year: r[6],
    Credit: credit, Show: true, Added: new Date(), Source: "Shared by the public"
  });
  sh.getRange(rowNum, 2).setValue("Approved");
  sh.getRange(rowNum, 12, 1, 3).setValues([[u.email, new Date(), link]]);
  return { approved: true, link: link, path: path };
}
