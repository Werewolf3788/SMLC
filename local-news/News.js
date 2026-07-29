/* === SECTION: File Header & Config === */
// Active Version: v1.3.0 | Timestamp: 2026-07-29_12:50:00
// Description: Local News Scraper (Array-Based Location Tagging for Web Filtering)

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import sourcesData from "./sources.json" with { type: "json" };

// Firebase Configuration
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

/* === SECTION: Master Town Mapping Matrix === */
const TOWN_KEYWORD_MAP = {
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

/* === SECTION: Extraction Utilities === */
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
    return item.image || item.imageUrl || item.img || item.media || "";
}

function extractDate(item) {
    return item.date || item.pubDate || item.publishedAt || item.timestamp || new Date().toISOString();
}

function resolveStoryTags(titleText, storyText) {
    const textBlob = `${titleText} ${storyText}`.toLowerCase();
    const detectedTowns = new Set();

    // 1. Detect all explicit town mentions
    for (const [townName, keywords] of Object.entries(TOWN_KEYWORD_MAP)) {
        for (const kw of keywords) {
            if (textBlob.includes(kw)) {
                detectedTowns.add(townName);
                break;
            }
        }
    }

    const mentionsClayCounty = textBlob.includes("clay county");

    // Rule A: 3+ Towns OR explicit "Clay County" -> Global Tag
    if (detectedTowns.size >= 3 || mentionsClayCounty) {
        return ["Clay County"];
    }

    // Rule B: 1 or 2 Towns -> Array of specific towns
    if (detectedTowns.size > 0) {
        return Array.from(detectedTowns);
    }

    // Rule C: No matches -> Return null to skip
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
    console.log(`Starting news pipeline... Loaded ${sourcesData.length} items from sources.json`);
    
    const writePromises = [];
    let skippedCount = 0;

    for (const item of sourcesData) {
        const title = extractTitle(item);
        const story = extractStory(item);
        const link = extractLink(item);
        const image = extractImage(item);
        const articleDate = extractDate(item);

        // 1. Time Filter (Past 48 Hours)
        if (!isWithinPast48Hours(articleDate)) {
            console.log(`[SKIPPED - OUTDATED] "${title || 'Untitled'}" (${articleDate})`);
            skippedCount++;
            continue;
        }

        // 2. Resolve Tags Array
        const tags = resolveStoryTags(title, story);
        if (!tags || tags.length === 0) {
            console.log(`[SKIPPED - NO TOWN OR COUNTY MATCH] "${title || 'Untitled'}"`);
            skippedCount++;
            continue;
        }

        const docId = item.id || `news_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Save to Firestore with `tags` array and legacy `location` string
        const p = setDoc(doc(db, "local_news", docId), {
            title: title || `${tags.join(", ")} Update`,
            date: articleDate,
            full_story: story,
            image: image,
            link: link,
            tags: tags,                             // Output: ["Flora"] or ["Flora", "Louisville"] or ["Clay County"]
            location: tags.join(", "),             // Output: "Flora" or "Flora, Louisville" or "Clay County"
            updatedAt: new Date().toISOString()
        }, { merge: true })
        .then(() => {
            console.log(`[SAVED] "${title}" -> Tags: [${tags.map(t => `"${t}"`).join(", ")}]`);
        })
        .catch((err) => {
            console.error(`[ERROR] Failed writing "${title}":`, err.message);
        });

        writePromises.push(p);
    }

    await Promise.all(writePromises);
    console.log(`Pipeline complete! Successfully saved ${writePromises.length} articles. (Skipped ${skippedCount} items).`);
    process.exit(0);
}

runScraper();
