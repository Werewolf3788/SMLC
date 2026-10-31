/**
 * PROJECT: Support My Local Community / Ourflora - Clay County, IL
 * PURPOSE: Parse public Google Calendar .ics feed & sync active events (next 2 months) to Firestore
 * LEAD DEVELOPER: Werewolf3788
 * VERSION: v1.4.0 (Clean descriptions, extracted links, maps URL, event image)
 */

/* === SECTION: File Header & Config === */
// Active Version: v1.4.0 | Timestamp: 2026-10-25

const ical = require('node-ical');
const admin = require('firebase-admin');

const ICAL_URL = "https://calendar.google.com/calendar/ical/09907fc6fff214b9dad96172ef13e7b80d62ea80cf22b504d096a47f277a9d2b%40group.calendar.google.com/public/basic.ics";
const TARGET_TIMEZONE = "America/Chicago";
const SHORT_DESC_LENGTH = 140;   // used for the compact card on the main screen

/* === SECTION: Firebase Auth Construction === */
const keyId = process.env.FIREBASE_KEY_ID;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!keyId || !privateKey) {
  console.error("CRITICAL ERROR: Missing FIREBASE_KEY_ID or FIREBASE_PRIVATE_KEY in environment.");
  process.exit(1);
}

// Convert literal \n sequences to actual newlines if GitHub Actions escapes them
privateKey = privateKey.replace(/\\n/g, '\n');

const serviceAccount = {
  type: "service_account",
  project_id: "smlc-fuel-monitor",
  private_key_id: keyId,
  private_key: privateKey,
  client_email: "firebase-adminsdk-fbsvc@smlc-fuel-monitor.iam.gserviceaccount.com",
  client_id: "103996680740929680277",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40smlc-fuel-monitor.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://smlc-fuel-monitor-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

/* === SECTION: Text Cleaning Helpers === */
// BEGIN_HELPERS

const IMAGE_URL_RE = /\.(jpe?g|png|gif|webp)(\?|#|$)/i;

// node-ical sometimes returns { val, params } instead of a plain string
function asText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === 'object') return String(v.val ?? v.value ?? "");
  return String(v);
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/gi, '&');
}

function trimUrl(u) {
  return u.replace(/[.,;:!?]+$/, '');
}

/**
 * Takes raw calendar text (may contain HTML, <a> tags, bare URLs, leftover
 * attribute junk) and returns { text, urls }:
 *   text = plain readable text with all links removed
 *   urls = every unique http(s) link that was in it
 */
function parseRichText(raw) {
  let s = decodeEntities(asText(raw));

  const urls = [];
  const addUrl = (u) => {
    const clean = trimUrl(u);
    if (clean && !urls.includes(clean)) urls.push(clean);
  };

  // 1. Links inside <a href="...">
  for (const m of s.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) addUrl(m[1]);

  // 2. Line breaks / paragraphs -> newlines, then strip all remaining tags
  s = s.replace(/<\s*br\s*\/?>/gi, '\n')
       .replace(/<\/(p|div|li)>/gi, '\n')
       .replace(/<[^>]+>/g, ' ');

  // 3. Leftover attribute junk from earlier mangled HTML (target="_blank" etc.)
  s = s.replace(/\b(?:target|rel|style|href|class)\s*=\s*"[^"]*"/gi, ' ')
       .replace(/["'\[\]]+>/g, ' ')
       .replace(/(?:\s|^)["'\[\]>\\]+(?=\s|$)/g, ' ');

  // 4. Bare URLs in the text
  for (const m of s.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) addUrl(m[0]);

  // 5. Remove URLs from the readable text
  s = s.replace(/https?:\/\/[^\s<>"')\]]+/gi, ' ')
       .replace(/\bwww\.\S+/gi, ' ');

  // 6. Tidy whitespace
  s = s.replace(/[ \t\u00a0]+/g, ' ')
       .replace(/ *\n */g, '\n')
       .replace(/\n{3,}/g, '\n\n')
       .trim();

  return { text: s, urls };
}

function isImageUrl(u) {
  return IMAGE_URL_RE.test(u);
}

// Google Drive share links aren't directly embeddable; convert to a thumbnail URL
function normalizeImageUrl(u) {
  const drive = u.match(/drive\.google\.com\/(?:open\?id=|file\/d\/|uc\?id=|thumbnail\?id=)([\w-]+)/i);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w1000`;
  return u;
}

// Image from the calendar event's attachments, if any
function imageFromAttach(att) {
  const list = Array.isArray(att) ? att : (att ? [att] : []);
  for (const a of list) {
    const url = typeof a === 'string' ? a : asText(a);
    const type = (a && a.params && a.params.FMTTYPE) || '';
    if (/^https?:/i.test(url) && (/^image\//i.test(type) || isImageUrl(url))) {
      return normalizeImageUrl(url);
    }
  }
  return "";
}

// Friendly button label for an extracted link
function labelForUrl(u) {
  let host = "";
  try { host = new URL(u).hostname.replace(/^www\./, ''); } catch { return "Link"; }
  if (/facebook\.com|fb\.me|fb\.watch/i.test(host)) return "View on Facebook";
  if (/instagram\.com/i.test(host)) return "View on Instagram";
  if (/forms\.gle|docs\.google\.com\/forms/i.test(u)) return "Sign-up Form";
  if (/eventbrite\./i.test(host)) return "Get Tickets";
  if (/youtube\.com|youtu\.be/i.test(host)) return "Watch on YouTube";
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/i.test(u)) return "Map";
  return host;
}

function shorten(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + "…";
}

// END_HELPERS

/* === SECTION: Core Sync Logic === */
async function syncICalToFirestore() {
  console.log("Fetching live .ics feed from Google Calendar...");

  try {
    const rawData = await ical.async.fromURL(ICAL_URL);
    const now = new Date();

    // Rolling window: now -> same date & time 2 calendar months ahead
    // (never spills into the next month: Dec 31 + 2 months = Feb 28/29)
    const MONTHS_AHEAD = 2;
    const windowEnd = new Date(now.getTime());
    const startDay = windowEnd.getDate();
    windowEnd.setDate(1);
    windowEnd.setMonth(windowEnd.getMonth() + MONTHS_AHEAD);
    windowEnd.setDate(Math.min(startDay, new Date(windowEnd.getFullYear(), windowEnd.getMonth() + 1, 0).getDate()));

    const activeEvents = [];

    for (const key in rawData) {
      if (!Object.prototype.hasOwnProperty.call(rawData, key)) continue;
      const ev = rawData[key];

      if (ev.type === 'VEVENT') {
        const start = new Date(ev.start);
        const end = new Date(ev.end);

        // Rolling 2-month window filter
        const isStillActive = end && end.getTime() > now.getTime();
        const startsInWindow = start && start.getTime() <= windowEnd.getTime();

        if (isStillActive && startsInWindow) {
          const title = parseRichText(ev.summary).text || "Untitled Event";
          const uppercaseTitle = title.toUpperCase();
          const isAllDay = ev.datetype === 'date';

          // Category color coding
          let color = "#00bfff";
          if (uppercaseTitle.includes("MEETING") || uppercaseTitle.includes("BOARD")) color = "#ff4500";
          if (uppercaseTitle.includes("FESTIVAL") || uppercaseTitle.includes("FAIR") || uppercaseTitle.includes("MARKET")) color = "#ff00ff";
          if (uppercaseTitle.includes("SCHOOL") || uppercaseTitle.includes("CUSD") || uppercaseTitle.includes("JH") || uppercaseTitle.includes("HS")) color = "#32cd32";
          if (uppercaseTitle.includes("BLOOD DRIVE") || uppercaseTitle.includes("FUNDRAISER")) color = "#ff0000";

          // Format human-readable date string
          const dateOptions = isAllDay
            ? { weekday: 'short', month: 'short', day: 'numeric', timeZone: TARGET_TIMEZONE }
            : { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TARGET_TIMEZONE };

          let displayDate = start.toLocaleDateString('en-US', dateOptions);
          if (isAllDay) displayDate += " (All Day)";

          // ---- Description: plain text + extracted links + image ----
          const descParsed = parseRichText(ev.description);
          const imageUrls = descParsed.urls.filter(isImageUrl).map(normalizeImageUrl);
          const linkUrls = descParsed.urls.filter(u => !isImageUrl(u));

          const links = linkUrls.map(u => ({ url: u, label: labelForUrl(u) }));
          const image = imageFromAttach(ev.attach) || imageUrls[0] || "";

          const desc = descParsed.text || "Visit ourflora.com for more details.";

          // ---- Location: plain text address + a clean Google Maps directions URL ----
          const locParsed = parseRichText(ev.location);
          const addr = locParsed.text || "Clay County, IL";
          const existingMapsUrl = locParsed.urls.find(u => /google\.[a-z.]+\/maps|maps\.app\.goo\.gl/i.test(u));
          const mapsUrl = locParsed.text
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locParsed.text)}`
            : (existingMapsUrl || "");

          const publicCalId = encodeURIComponent("09907fc6fff214b9dad96172ef13e7b80d62ea80cf22b504d096a47f277a9d2b@group.calendar.google.com");

          activeEvents.push({
            title: title,
            start: start.toISOString(),
            end: end.toISOString(),
            isAllDay: isAllDay,
            displayDate: displayDate,
            color: color,
            desc: desc,                                   // full plain-text description (no links, no HTML)
            descShort: shorten(desc, SHORT_DESC_LENGTH),  // compact version for the main screen
            links: links,                                 // [{ url, label }] -> show as buttons
            image: image,                                 // "" if none
            addr: addr,                                   // plain text address
            mapsUrl: mapsUrl,                             // ready-to-use directions link
            subscribeGoogle: `https://calendar.google.com/calendar/r?cid=${publicCalId}`,
            subscribeICal: ICAL_URL
          });
        }
      }
    }

    // Sort by start time ascending
    activeEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    console.log(`Parsed ${activeEvents.length} active events in the next 2 months.`);

    // Wipe-and-replace collection: /smlc_events
    const collectionRef = db.collection('smlc_events');
    const existingDocs = await collectionRef.get();

    const batch = db.batch();

    // Step 1: Delete stale entries
    existingDocs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Step 2: Inject current active items
    activeEvents.forEach((event, idx) => {
      const docId = `event_${idx}_${event.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}`;
      const docRef = collectionRef.doc(docId);
      batch.set(docRef, event);
    });

    await batch.commit();
    console.log(`Successfully synced ${activeEvents.length} events to Firestore collection: /smlc_events`);
    process.exit(0);

  } catch (err) {
    console.error("CRITICAL ERROR during iCal sync execution:", err);
    process.exit(1);
  }
}

syncICalToFirestore();
