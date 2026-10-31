/**
 * PROJECT: Support My Local Community / Ourflora - Clay County, IL
 * PURPOSE: Push Google Calendar events + Attachments directly to Firebase Firestore via REST API
 * LEAD DEVELOPER: Werewolf3788
 * VERSION: v3.6.0 (2-month rolling window + Attachments Pipeline + Pure REST Engine)
 */

/* ==========================================================================
   SECTION 1: Global Constants & Configuration (Lines 11-20)
   ========================================================================== */
// Active Version: v3.6.0 | Timestamp: 2026-10-31_09:00:00 EDT
// CSS / JS Imports: ?v=20261031_090000

const CALENDAR_ID = "09907fc6fff214b9dad96172ef13e7b80d62ea80cf22b504d096a47f277a9d2b@group.calendar.google.com";
const FIREBASE_PROJECT_ID = "smlc-fuel-monitor"; 
const TARGET_TIMEZONE = "America/Chicago";
const FIRESTORE_COLLECTION = "smlc_events";
const FIREBASE_WEB_API_KEY = "AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg";
const MONTHS_AHEAD = 2;   // how far ahead the calendar reaches

/* ==========================================================================
   SECTION 2: Main Calendar Execution Engine with Attachments
   Fetches Google Calendar entries & attachments from NOW through the same moment
   2 calendar months ahead (e.g. Oct 31 8:40 AM -> Dec 31 8:40 AM).
   ========================================================================== */
function syncCalendarToFirestore() {
  console.log("Starting SMLC Calendar -> Firestore sync pipeline...");

  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) {
    console.error("CRITICAL: Calendar ID is wrong or access is denied.");
    return;
  }

  const now = new Date();

  // Rolling window: right now -> same date & time 2 calendar months ahead
  const windowEnd = addMonthsClamped(now, MONTHS_AHEAD);

  // Look back 31 days too, so long multi-day events that already started are not dropped
  const MS_31_DAYS = 31 * 24 * 60 * 60 * 1000;
  const fetchStart = new Date(now.getTime() - MS_31_DAYS);
  const fetchEnd = windowEnd;
  console.log(`Window: ${now.toISOString()} -> ${windowEnd.toISOString()}`);

  // Query attachments via Google Calendar Advanced Service (v3)
  const attachmentsMap = {};
  if (typeof Calendar !== "undefined" && Calendar.Events && Calendar.Events.list) {
    try {
      // Page through every result (2 months can be more than one page)
      let pageToken = null;
      const allItems = [];
      do {
        const apiResponse = Calendar.Events.list(CALENDAR_ID, {
          timeMin: fetchStart.toISOString(),
          timeMax: fetchEnd.toISOString(),
          singleEvents: true,
          maxResults: 2500,
          pageToken: pageToken || undefined
        });
        (apiResponse && apiResponse.items || []).forEach(it => allItems.push(it));
        pageToken = apiResponse && apiResponse.nextPageToken;
      } while (pageToken);

      if (allItems.length) {
        allItems.forEach(item => {
          if (item.attachments && item.attachments.length > 0) {
            const parsedAttachments = item.attachments.map(att => ({
              title: att.title || "Attached Flyer",
              fileUrl: att.fileUrl || "",
              mimeType: att.mimeType || "",
              iconLink: att.iconLink || ""
            }));

            // Index by API event ID and sanitized title for reliable pairing
            attachmentsMap[item.id] = parsedAttachments;
            if (item.summary) {
              attachmentsMap[item.summary.trim()] = parsedAttachments;
            }
          }
        });
        console.log(`Calendar v3 API: Indexed attachments for ${Object.keys(attachmentsMap).length} events.`);
      }
    } catch (apiErr) {
      console.warn("Calendar Advanced API query skipped:", apiErr.message);
    }
  } else {
    console.log("Google Calendar API service not detected under Services. Attachments will be omitted until added.");
  }

  const rawEvents = cal.getEvents(fetchStart, fetchEnd);
  console.log(`Raw events returned from Google Calendar API: ${rawEvents.length}`);

  // ROLLING 2-MONTH FILTER:
  // 1. Must NOT have ended yet (endTime > now)
  // 2. Must start on or before the window end (now + 2 months)
  const activeEvents = rawEvents.filter(ev => {
    const startTime = ev.getStartTime();
    const endTime = ev.getEndTime();
    const isStillActive = endTime && endTime.getTime() > now.getTime();
    const startsInWindow = startTime && startTime.getTime() <= windowEnd.getTime();
    return isStillActive && startsInWindow;
  });

  activeEvents.sort((a, b) => a.getStartTime() - b.getStartTime());
  console.log(`Queued ${activeEvents.length} active/upcoming events (next ${MONTHS_AHEAD} months).`);

  // Global Subscription Links
  const publicCalId = encodeURIComponent(CALENDAR_ID);
  const globalGoogleSubscribe = `https://calendar.google.com/calendar/r?cid=${publicCalId}`;
  const globalICalSubscribe = `webcal://calendar.google.com/calendar/ical/${publicCalId}/public/basic.ics`;

  // Format Payload for Firestore REST schema
  const firestoreData = activeEvents.map(ev => {
    let color = "#00bfff";
    const title = ev.getTitle().toUpperCase();
    const isAllDay = ev.isAllDayEvent();

    if (title.includes("MEETING") || title.includes("BOARD")) color = "#ff4500";
    if (title.includes("FESTIVAL") || title.includes("FAIR") || title.includes("MARKET")) color = "#ff00ff";
    if (title.includes("SCHOOL") || title.includes("CUSD") || title.includes("JH") || title.includes("HS")) color = "#32cd32";
    if (title.includes("BLOOD DRIVE") || title.includes("FUNDRAISER")) color = "#ff0000";

    const dateString = isAllDay 
      ? Utilities.formatDate(ev.getStartTime(), TARGET_TIMEZONE, "EEE MMM d") + " (All Day)"
      : Utilities.formatDate(ev.getStartTime(), TARGET_TIMEZONE, "EEE MMM d, h:mm a");

    // Match attachments using Event ID or Summary
    const cleanId = ev.getId().split("@")[0];
    const eventAttachments = attachmentsMap[cleanId] || attachmentsMap[ev.getTitle().trim()] || [];
    const primaryAttachmentUrl = eventAttachments.length > 0 ? eventAttachments[0].fileUrl : "";

    return {
      title: ev.getTitle(),
      start: ev.getStartTime().toISOString(),
      end: ev.getEndTime().toISOString(),
      isAllDay: isAllDay,
      displayDate: dateString,
      color: color,
      desc: ev.getDescription() || "Visit ourflora.com for more details.",
      addr: ev.getLocation() || "Clay County, IL",
      googleLink: generateGoogleLink(ev),
      icalData: generateICalData(ev),
      subscribeGoogle: globalGoogleSubscribe,
      subscribeICal: globalICalSubscribe,
      attachments: eventAttachments,
      hasAttachment: eventAttachments.length > 0,
      attachmentUrl: primaryAttachmentUrl
    };
  });

  pushToFirestoreREST(firestoreData);
}

/* ==========================================================================
   SECTION 3: Firestore REST API Sync Engine (Lines 142-240)
   Uses direct Firebase Web API Key & Security Rules (Zero OAuth Scope Overhead)
   ========================================================================== */
function pushToFirestoreREST(data) {
  if (!Array.isArray(data) || data.length === 0) {
    console.log(`No active events in the next ${MONTHS_AHEAD} months to push.`);
    return;
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${FIRESTORE_COLLECTION}?key=${FIREBASE_WEB_API_KEY}`;
  
  const headers = {
    "Content-Type": "application/json"
  };

  try {
    // Step 1: Query existing documents in the collection to purge stale items
    // (pages through ALL existing docs - 2 months of events can be more than one page)
    let cleared = 0;
    let listToken = null;
    do {
      const listUrl = baseUrl + "&pageSize=300" + (listToken ? "&pageToken=" + encodeURIComponent(listToken) : "");
      const getRes = UrlFetchApp.fetch(listUrl, { method: "GET", headers: headers, muteHttpExceptions: true });
      if (getRes.getResponseCode() !== 200) {
        console.warn(`Collection query returned HTTP ${getRes.getResponseCode()}: ${getRes.getContentText()}`);
        break;
      }
      const existingData = JSON.parse(getRes.getContentText());
      (existingData.documents || []).forEach(doc => {
        UrlFetchApp.fetch(`https://firestore.googleapis.com/v1/${doc.name}?key=${FIREBASE_WEB_API_KEY}`, {
          method: "DELETE",
          headers: headers,
          muteHttpExceptions: true
        });
        cleared++;
      });
      listToken = existingData.nextPageToken || null;
    } while (listToken);
    console.log(`Cleared ${cleared} stale records from Firestore.`);

    // Step 2: Write all active events (next 2 months) + attachment arrays
    let successCount = 0;

    data.forEach((event, index) => {
      const docId = `event_${index}_${event.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}`;
      const targetUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${FIRESTORE_COLLECTION}?documentId=${docId}&key=${FIREBASE_WEB_API_KEY}`;

      const payload = {
        fields: {
          title: { stringValue: event.title || "" },
          start: { stringValue: event.start || "" },
          end: { stringValue: event.end || "" },
          isAllDay: { booleanValue: !!event.isAllDay },
          displayDate: { stringValue: event.displayDate || "" },
          color: { stringValue: event.color || "#00bfff" },
          desc: { stringValue: event.desc || "" },
          addr: { stringValue: event.addr || "" },
          googleLink: { stringValue: event.googleLink || "" },
          icalData: { stringValue: event.icalData || "" },
          subscribeGoogle: { stringValue: event.subscribeGoogle || "" },
          subscribeICal: { stringValue: event.subscribeICal || "" },
          hasAttachment: { booleanValue: !!event.hasAttachment },
          attachmentUrl: { stringValue: event.attachmentUrl || "" },
          attachments: {
            arrayValue: {
              values: (event.attachments || []).map(att => ({
                mapValue: {
                  fields: {
                    title: { stringValue: att.title || "" },
                    fileUrl: { stringValue: att.fileUrl || "" },
                    mimeType: { stringValue: att.mimeType || "" },
                    iconLink: { stringValue: att.iconLink || "" }
                  }
                }
              }))
            }
          }
        }
      };

      const options = {
        method: "POST",
        headers: headers,
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const postRes = UrlFetchApp.fetch(targetUrl, options);
      if (postRes.getResponseCode() === 200) {
        successCount++;
      } else {
        console.error(`Failed to push document ${docId} (HTTP ${postRes.getResponseCode()}):`, postRes.getContentText());
      }
    });

    console.log(`Successfully synced ${successCount} events to Firestore collection: /${FIRESTORE_COLLECTION}`);
  } catch (err) {
    console.error("REST PUSH ERROR:", err.message);
  }
}

/* ==========================================================================
   SECTION 4: Helper Functions & Calendar Generators
   ========================================================================== */
// Adds whole months but never spills into the month after
// (e.g. Dec 31 + 2 months = Feb 28/29, not Mar 3)
function addMonthsClamped(date, months) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

function generateGoogleLink(ev) {
  const s = Utilities.formatDate(ev.getStartTime(), "GMT", ev.isAllDayEvent() ? "yyyyMMdd" : "yyyyMMdd'T'HHmmss'Z'");
  const e = Utilities.formatDate(ev.getEndTime(), "GMT", ev.isAllDayEvent() ? "yyyyMMdd" : "yyyyMMdd'T'HHmmss'Z'");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.getTitle())}&dates=${s}/${e}&details=${encodeURIComponent(ev.getDescription())}&location=${encodeURIComponent(ev.getLocation())}&sf=true&output=xml`;
}

function generateICalData(ev) {
  const s = Utilities.formatDate(ev.getStartTime(), "GMT", "yyyyMMdd'T'HHmmss'Z'");
  const e = Utilities.formatDate(ev.getEndTime(), "GMT", "yyyyMMdd'T'HHmmss'Z'");
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${s}\nDTEND:${e}\nSUMMARY:${ev.getTitle()}\nDESCRIPTION:${(ev.getDescription() || "").replace(/\n/g, "\\n")}\nLOCATION:${ev.getLocation() || ""}\nEND:VEVENT\nEND:VCALENDAR`;
  return Utilities.base64Encode(ics);
}