/* === SECTION: File Header & Config === */
// Active Version: v1.1.8 | Timestamp: 2026-07-29_12:26:00
// Description: Local News Backend Scraper & Firestore Writer (48-Hour Filter)

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

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* === SECTION: Master Clay County Keyword Mapping Matrix === */
const TOWN_KEYWORD_MAP = {
    "Flora": ["flora", "flora wolves", "flora pups", "harter", "harter township", "62839"],
    "Louisville": ["louisville", "hoosier", "hoosier township", "louisville township", "north clay", "nc indians", "nc cardinals", "blair township", "larkinsburg township", "62858"],
    "Clay City": ["clay city", "clay city wolves", "clay city pups", "clay city township", "62824"],
    "Xenia": ["xenia", "xenia township", "greendale", "62899"],
    "Sailor Springs": ["sailor springs", "pixley", "pixley township", "62879"],
    "Iola": ["iola", "songer", "songer township"],
    "Ingraham": ["ingraham", "62434"],
    "Bible Grove": ["bible grove", "bible grove township"],
    "Unincorporated Clay County": ["bethel", "camp travis", "hord", "jordon", "oskaloosa", "oskaloosa township", "riffle", "wendelin", "stanford township"]
};

const CLAY_COUNTY_FALLBACKS = ["clay county", "clay county news", "state news", "illinois news"];

/* === SECTION: Text & Time Filtering Utilities === */
function cleanStoryBody(storyText) {
    if (!storyText) return "";
    return storyText
        .replace(/[\u00a9\u24b8\u2122]?\s*Copyright\s+\d{4},?\s*WNOI[\s\S]*/gi, '')
        .trim();
}

function resolveStoryLocation(item) {
    if (item.location) return item.location;

    const textBlob = `${item.title || ""} ${item.full_story || ""} ${item.description || ""}`.toLowerCase();

    if (textBlob.includes("bible grove")) {
        return "Bible Grove";
    }

    for (const [townName, keywords] of Object.entries(TOWN_KEYWORD_MAP)) {
        for (const kw of keywords) {
            if (textBlob.includes(kw)) {
                return townName;
            }
        }
    }

    for (const fallbackKw of CLAY_COUNTY_FALLBACKS) {
        if (textBlob.includes(fallbackKw)) {
            return "Clay County";
        }
    }

    return "Clay County";
}

function isClayCountyArticle(item) {
    const textBlob = `${item.title || ""} ${item.full_story || ""} ${item.description || ""}`.toLowerCase();

    if (textBlob.includes("fairfield") || textBlob.includes("effingham")) {
        return false;
    }

    return true;
}

function isWithinPast48Hours(dateString) {
    if (!dateString) return true; // Keep item if no date is provided so we don't accidentally drop valid stories

    const articleTime = new Date(dateString).getTime();
    if (isNaN(articleTime)) return true; // Fallback for unparseable dates

    const FortyEightHoursInMs = 48 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - FortyEightHoursInMs;

    return articleTime >= cutoffTime;
}

/* === SECTION: Execution Pipeline === */
async function runScraper() {
    console.log(`Starting news pipeline... Loaded ${sourcesData.length} total items from sources.json`);
    
    const writePromises = [];
    let skippedExclusionCount = 0;
    let skippedOutdatedCount = 0;

    for (const item of sourcesData) {
        // 1. Check Location & Keyword Exclusion
        if (!isClayCountyArticle(item)) {
            skippedExclusionCount++;
            continue;
        }

        // 2. Check 48-Hour Time Window
        if (!isWithinPast48Hours(item.date)) {
            console.log(`[SKIPPED - TOO OLD] "${item.title || 'Untitled'}" (${item.date})`);
            skippedOutdatedCount++;
            continue;
        }

        const docId = item.id || `news_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const locationTag = resolveStoryLocation(item);
        const cleanedStory = cleanStoryBody(item.full_story || item.description || "");

        // Build Firestore document promise
        const p = setDoc(doc(db, "local_news", docId), {
            title: item.title || "Clay County Local News",
            date: item.date || new Date().toISOString(),
            full_story: cleanedStory,
            image: item.image || "",
            link: item.link || "#",
            location: locationTag,
            updatedAt: new Date().toISOString()
        }, { merge: true })
        .then(() => {
            console.log(`[SAVED] "${item.title || docId}" (${item.date || 'No Date'}) -> Tagged: ${locationTag}`);
        })
        .catch((err) => {
            console.error(`[ERROR] Failed to save "${item.title}":`, err.message);
        });

        writePromises.push(p);
    }

    // Wait for all writes to finish before closing Node
    await Promise.all(writePromises);
    console.log(`Pipeline complete! Saved ${writePromises.length} articles to Firestore. (Skipped ${skippedOutdatedCount} older than 48h, ${skippedExclusionCount} non-local).`);
    process.exit(0);
}

runScraper();
