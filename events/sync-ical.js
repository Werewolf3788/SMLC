/**
 * PROJECT: Support My Local Community / Ourflora - Clay County, IL
 * PURPOSE: Parse public Google Calendar .ics feed & sync active 720-hr events to Firestore
 * LEAD DEVELOPER: Werewolf3788
 * VERSION: v1.1.0 (Subdirectory Build + 12-Hour Automation)
 */

/* === SECTION: File Header & Config === */
// Active Version: v1.1.0 | Timestamp: 2026-07-29_15:51:00
// CSS / JS Imports: ?v=20260729_155100

const ical = require('node-ical');
const admin = require('firebase-admin');

const ICAL_URL = "https://calendar.google.com/calendar/ical/09907fc6fff214b9dad96172ef13e7b80d62ea80cf22b504d096a47f277a9d2b%40group.calendar.google.com/public/basic.ics";
const TARGET_TIMEZONE = "America/Chicago";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("CRITICAL ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is missing in GitHub Repository Secrets.");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://smlc-fuel-monitor-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function syncICalToFirestore() {
  console.log("Fetching live .ics feed from Google Calendar...");

  try {
    const rawData = await ical.async.fromURL(ICAL_URL);
    const now = new Date();
    
    // 720 Hours in milliseconds (30 days)
    const MS_720_HOURS = 30 * 24 * 60 * 60 * 1000;
    const future720Hours = new Date(now.getTime() + MS_720_HOURS);

    const activeEvents = [];

    for (const key in rawData) {
      if (!Object.prototype.hasOwnProperty.call(rawData, key)) continue;
      const ev = rawData[key];

      if (ev.type === 'VEVENT') {
        const start = new Date(ev.start);
        const end = new Date(ev.end);

        // Strict 720-hour rolling window filter:
        // 1. Must NOT have ended yet (end > now)
        // 2. Must start within 720 hours from right now (start <= now + 720 hours)
        const isStillActive = end && end.getTime() > now.getTime();
        const startsWithin720Hours = start && start.getTime() <= future720Hours.getTime();

        if (isStillActive && startsWithin720Hours) {
          const title = ev.summary || "Untitled Event";
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

          const publicCalId = encodeURIComponent("09907fc6fff214b9dad96172ef13e7b80d62ea80cf22b504d096a47f277a9d2b@group.calendar.google.com");

          activeEvents.push({
            title: title,
            start: start.toISOString(),
            end: end.toISOString(),
            isAllDay: isAllDay,
            displayDate: displayDate,
            color: color,
            desc: ev.description || "Visit ourflora.com for more details.",
            addr: ev.location || "Clay County, IL",
            subscribeGoogle: `https://calendar.google.com/calendar/r?cid=${publicCalId}`,
            subscribeICal: ICAL_URL
          });
        }
      }
    }

    // Sort by start time ascending
    activeEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    console.log(`Parsed ${activeEvents.length} active events strictly within the 720-hour sliding window.`);

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
