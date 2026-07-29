/* === SECTION: File Header & Config === */
// Active Version: v1.1.4 | Timestamp: 2026-07-29_12:12:00
// Description: Local News Backend Scraper & Firestore Writer

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Read sources.json directly from the local repository directory
import sourcesData from "./sources.json" with { type: "json" };

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* === SECTION: Master Clay County Keyword Mapping Matrix === */
const TOWN_KEYWORD_MAP = {
    "Flora": [
        "flora", "flora wolves", "flora pups", "harter", "harter township", "62839"
    ],
    "Louisville": [
        "louisville", "hoosier", "hoosier township", "louisville township", 
        "north clay", "nc indians", "nc cardinals", "blair township", "larkinsburg township", "62858"
    ],
    "Clay City": [
        "clay city", "clay city wolves", "clay city pups", "clay city township", "62824"
    ],
    "Xenia": [
        "xenia", "xenia township", "greendale", "62899"
    ],
    "Sailor Springs": [
        "sailor springs", "pixley", "pixley township", "62879"
    ],
    "Iola": [
        "iola", "songer", "songer township"
    ],
    "Ingraham": [
        "ingraham", "62434"
    ],
    "Bible Grove": [
        "bible grove", "bible grove township"
    ],
    "Unincorporated Clay County": [
        "bethel", "camp travis", "hord", "jordon", "oskaloosa", 
        "oskaloosa township", "riffle", "wendelin", "stanford township"
    ]
};

const CLAY_COUNTY_FALLBACKS = ["clay county", "clay county news", "state news", "illinois news"];

/* === SECTION: Text Processing & Formatting Utilities === */
function cleanStoryBody(storyText) {
    if (!storyText) return "";
    return storyText
        .replace(/[\u00a9\u24b8\u2122]?\s*Copyright\s+\d{4},?\s*WNOI[\s\S]*/gi, '')
        .trim();
}

function resolveStoryLocation(item) {
    if (item.location) return item.location;

    const textBlob = `${item.title || ""} ${item.full_story || ""}`.toLowerCase();

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

    return null;
}

function isClayCountyArticle(item) {
    const textBlob = `${item.title || ""} ${item.full_story || ""} ${item.location || ""}`.toLowerCase();

    if (textBlob.includes("fairfield") || textBlob.includes("effingham")) {
        return false;
    }

    return resolveStoryLocation(item) !== null;
}

/* === SECTION: Execution Pipeline === */
async function runScraper() {
    console.log("Processing local news from sources.json...");
    
    try {
        let processedCount = 0;

        for (const item of sourcesData) {
            if (!isClayCountyArticle(item)) continue;

            const docId = item.id || `news_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const locationTag = resolveStoryLocation(item);
            const cleanedStory = cleanStoryBody(item.full_story);

            // Write or update news document in Firestore 'local_news' collection
            await setDoc(doc(db, "local_news", docId), {
                title: item.title || "",
                date: item.date || new Date().toISOString(),
                full_story: cleanedStory,
                image: item.image || "",
                link: item.link || "#",
                location: locationTag,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            processedCount++;
            console.log(`[SAVED] "${item.title}" -> Tagged: ${locationTag}`);
        }

        console.log(`Successfully processed and saved ${processedCount} Clay County articles to Firestore!`);
    } catch (error) {
        console.error("Error executing news Firestore pipeline:", error);
        process.exit(1);
    }
}

runScraper();
