/* === SECTION: File Header & Config === */
// Active Version: v1.1.9 | Timestamp: 2026-07-29_12:30:00
// Description: Local News Backend Scraper & Firestore Writer (Flexible Property Mapping)

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

/* === SECTION: Text & Property Extraction Utilities === */
function extractTitle(item) {
    return item.title || item.headline || item.name || "Clay County Local News";
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

function resolveStoryLocation(item, titleText, storyText) {
    if (item.location) return item.location;

    const textBlob = `${titleText} ${storyText}`.toLowerCase();

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

function isClayCountyArticle(titleText, storyText) {
    const textBlob = `${titleText} ${storyText}`.toLowerCase();

    if (textBlob.includes("fairfield") || textBlob.includes("effingham")) {
        return false;
    }

    return true;
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

    for (const item of sourcesData) {
        const title = extractTitle(item);
        const story = extractStory(item);
        const link = extractLink(item);
        const image = extractImage(item);
        const articleDate = extractDate(item);

        // 1. Filter out excluded regions
        if (!isClayCountyArticle(title, story)) {
            console.log(`[SKIPPED - NON-LOCAL] "${title}"`);
            continue;
        }

        // 2. Filter out items older than 48 hours
        if (!isWithinPast48Hours(articleDate)) {
            console.log(`[SKIPPED - OUTDATED] "${title}" (${articleDate})`);
            continue;
        }

        const docId = item.id || `news_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const locationTag = resolveStoryLocation(item, title, story);

        const p = setDoc(doc(db, "local_news", docId), {
            title: title,
            date: articleDate,
            full_story: story,
            image: image,
            link: link,
            location: locationTag,
            updatedAt: new Date().toISOString()
        }, { merge: true })
        .then(() => {
            console.log(`[SAVED] "${title}" -> Tagged: ${locationTag}`);
        })
        .catch((err) => {
            console.error(`[ERROR] Failed writing "${title}":`, err.message);
        });

        writePromises.push(p);
    }

    await Promise.all(writePromises);
    console.log(`Pipeline complete! Successfully processed and updated ${writePromises.length} articles in Firestore.`);
    process.exit(0);
}

runScraper();
