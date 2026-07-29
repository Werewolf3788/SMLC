/* === SECTION: File Header & Config === */
// Active Version: v1.6.0 | Timestamp: 2026-07-29_13:48:00
// Description: Local News Scraper & Firestore Pipeline (rssfeed.json source import)

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import sourcesData from "./rssfeed.json" with { type: "json" };

const firebaseConfig = {
    apiKey: "AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg",
    authDomain: "smlc-fuel-monitor.firebaseapp.com",
    databaseURL: "https://smlc-fuel-monitor-default-rtdb.firebaseio.com",
    projectId: "smlc-fuel-monitor",
    storageBucket: "smlc-fuel-monitor.firebasestorage.app",
    messagingSenderId: "22397440085",
    appId: "1:22397440085:web:c00e716858ed58895bc4dc",
    measurementId: "G-687D605K75"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* === SECTION: Global Keyword Overrides === */
const GLOBAL_CATEGORY_KEYWORDS = [
    "obituary", "obituaries", "passed away", "funeral", 
    "for sale", "for rent", "land for sale", "property for sale", "real estate", 
    "hiring", "job opening", "help wanted", "now hiring", "employment opportunity"
];

/* === SECTION: Town Keyword Maps === */

// 1. Relaxed Town Matching (For Local Feeds like WNOI, Freedom 92.9, etc.)
const LOCAL_TOWN_KEYWORD_MAP = {
    "Flora": ["flora", "floyd henson"],
    "Louisville": ["louisville", "north clay"],
    "Clay City": ["clay city"],
    "Xenia": ["xenia"],
    "Sailor Springs": ["sailor springs"],
    "Iola": ["iola"],
    "Ingraham": ["ingraham"],
    "Bible Grove": ["bible grove"],
    "Unincorporated Clay County": ["hord", "wendelin", "oskaloosa", "riffle"]
};

// 2. Strict Town Matching Patterns (For Web Sweeps / Google Alerts ONLY)
const GOOGLE_ALERT_TOWN_REGEX_MAP = {
    "Flora": [
        /\bflora\b.*?\b(il|illinois)\b/i,
        /\bflora\s*,?\s*(il|illinois)\b/i,
        /\bfloyd henson\b/i
    ],
    "Louisville": [
        /\blouisville\b.*?\b(il|illinois)\b/i,
        /\blouisville\s*,?\s*(il|illinois)\b/i,
        /\bnorth clay\b/i
    ],
    "Clay City": [
        /\bclay city\b.*?\b(il|illinois)\b/i,
        /\bclay city\s*,?\s*(il|illinois)\b/i
    ],
    "Xenia": [
        /\bxenia\b.*?\b(il|illinois)\b/i,
        /\bxenia\s*,?\s*(il|illinois)\b/i
    ],
    "Sailor Springs": [
        /\bsailor springs\b.*?\b(il|illinois)\b/i,
        /\bsailor springs\s*,?\s*(il|illinois)\b/i
    ],
    "Iola": [
        /\biola\b.*?\b(il|illinois)\b/i,
        /\biola\s*,?\s*(il|illinois)\b/i
    ],
    "Ingraham": [
        /\bingraham\b.*?\b(il|illinois)\b/i,
        /\bingraham\s*,?\s*(il|illinois)\b/i
    ],
    "Bible Grove": [
        /\bbible grove\b.*?\b(il|illinois)\b/i,
        /\bbible grove\s*,?\s*(il|illinois)\b/i
    ]
};

/* === SECTION: Utilities & Extraction === */
function extractTitle(item) {
    return item.title || item.headline || item.name || "";
}

function extractStory(item) {
    const rawStory = item.full_story || item.story || item.content || item.description || item.body || "";
    return rawStory
        .replace(/[\u00a9\u24b8\u2122]?\s*Copyright\s+\d{4},?\s*WNOI[\s\S]*/gi, '')
        .trim();
}

function extractLink(item) {
    return item.link || item.url || item.source_url || "#";
}

function extractImage(item) {
    if (item.image || item.imageUrl || item.img || item.media) {
        return item.image || item.imageUrl || item.img || item.media;
    }
    const rawStory = item.full_story || item.story || item.content || item.description || "";
    const imgMatch = rawStory.match(/<img[^>]+src=["']([^"']+)["']/i);
    return (imgMatch && imgMatch[1]) ? imgMatch[1] : "";
}

function extractDate(item) {
    return item.date || item.pubDate || item.publishedAt || item.timestamp || new Date().toISOString();
}

function generateUniqueKey(title, link) {
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `news_${cleanTitle.slice(0, 30)}`;
}

/* === SECTION: Location & Category Resolution === */
function resolveStoryTags(titleText, storyText, isGoogleAlert) {
    const textBlob = `${titleText} ${storyText}`.toLowerCase();

    // 1. Obituaries, Sales/Rent, Jobs -> Global "Clay County"
    for (const globalKw of GLOBAL_CATEGORY_KEYWORDS) {
        if (textBlob.includes(globalKw)) {
            return ["Clay County"];
        }
    }

    const detectedTowns = new Set();

    if (isGoogleAlert) {
        // STRICT MODE: Requires "Flora, IL" or "Flora Illinois" for Google Alerts
        for (const [townName, regexArray] of Object.entries(GOOGLE_ALERT_TOWN_REGEX_MAP)) {
            for (const pattern of regexArray) {
                if (pattern.test(textBlob)) {
                    detectedTowns.add(townName);
                    break;
                }
            }
        }
    } else {
        // RELAXED MODE: Matches town name directly for local station feeds
        for (const [townName, keywords] of Object.entries(LOCAL_TOWN_KEYWORD_MAP)) {
            for (const kw of keywords) {
                if (textBlob.includes(kw)) {
                    detectedTowns.add(townName);
                    break;
                }
            }
        }
    }

    const mentionsClayCounty = textBlob.includes("clay county");

    // 3+ Towns OR explicit "Clay County" -> Global Tag
    if (detectedTowns.size >= 3 || mentionsClayCounty) {
        return ["Clay County"];
    }

    // 1 or 2 Towns -> Array of detected towns
    if (detectedTowns.size > 0) {
        return Array.from(detectedTowns);
    }

    return null;
}

function isWithinPast48Hours(dateString) {
    if (!dateString) return true;
    const articleTime = new Date(dateString).getTime();
    if (isNaN(articleTime)) return true;

    const FortyEightHoursInMs = 48 * 60 * 60 * 1000;
    return articleTime >= (Date.now() - FortyEightHoursInMs);
}

/* === SECTION: Execution Pipeline === */
async function runScraper() {
    console.log(`Starting news pipeline... Loaded ${sourcesData.length} items from rssfeed.json`);
    
    const writePromises = [];
    const processedKeys = new Set();

    let savedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    for (const item of sourcesData) {
        const title = extractTitle(item);
        const story = extractStory(item);
        const link = extractLink(item);
        const image = extractImage(item);
        const articleDate = extractDate(item);

        // Filter out feed header titles
        if (title === "Freedom 92.9" || title === "WNOI Radio" || link.endsWith('/feed/')) {
            continue;
        }

        // 1. Recency Check (Past 48 Hours)
        if (!isWithinPast48Hours(articleDate)) {
            skippedCount++;
            continue;
        }

        // 2. Deduplication Check
        const docId = generateUniqueKey(title, link);
        if (processedKeys.has(docId)) {
            console.log(`[DUPLICATE INTERCEPTED] "${title}"`);
            duplicateCount++;
            continue;
        }
        processedKeys.add(docId);

        // 3. Detect if item came from a Google Alert feed
        const sourceName = (item.source_name || item.name || "").toLowerCase();
        const sourceUrl = (item.source_url || link || "").toLowerCase();
        const isGoogleAlert = sourceName.includes("google alert") || sourceUrl.includes("google.com/alerts");

        // 4. Resolve Tags
        const tags = resolveStoryTags(title, story, isGoogleAlert);
        if (!tags || tags.length === 0) {
            skippedCount++;
            continue;
        }

        const primaryLocation = tags.join(", ");

        // 5. Write Complete Structure to Firestore Collection local_news
        const p = setDoc(doc(db, "local_news", docId), {
            date: articleDate,
            full_story: story,
            image: image,
            link: link,
            location: primaryLocation,
            tags: tags,
            title: title || `${primaryLocation} Update`,
            updatedAt: new Date().toISOString()
        }, { merge: true })
        .then(() => {
            console.log(`[SAVED] "${title}" -> Mode: ${isGoogleAlert ? 'Google Alert (Strict)' : 'Local Feed (Relaxed)'} | Location: ${primaryLocation}`);
            savedCount++;
        })
        .catch((err) => {
            console.error(`[ERROR] Failed writing "${title}":`, err.message);
        });

        writePromises.push(p);
    }

    await Promise.all(writePromises);
    console.log(`Pipeline complete! Saved: ${savedCount} | Duplicates: ${duplicateCount} | Skipped: ${skippedCount}`);
    process.exit(0);
}

runScraper();
