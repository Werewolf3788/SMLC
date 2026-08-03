/* === SECTION: File Header & Config === */
// Active Version: v1.8.2 | Timestamp: 2026-08-03_20:20:00
// Description: Local News Scraper - Direct Town Match OR Clay County Default Pipeline

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import Parser from "rss-parser";
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
const rssParser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'contentEncoded'],
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail']
        ]
    }
});

/* === SECTION: Town Keyword Maps === */

// 1. Relaxed Town Matching (For Local Feeds)
const LOCAL_TOWN_KEYWORD_MAP = {
    "Flora": ["flora", "floyd henson", "floyd henson jr high", "flora wolves", "lady wolves", "flora unit 35"],
    "Louisville": ["louisville", "north clay", "nc cardinals", "north clay cardinals", "north clay indians"],
    "Clay City": ["clay city", "clay city wolves", "clay city lady wolves", "clay city cusd"],
    "Xenia": ["xenia"],
    "Sailor Springs": ["sailor springs"],
    "Iola": ["iola"],
    "Ingraham": ["ingraham"],
    "Bible Grove": ["bible grove"],
    "Unincorporated Clay County": ["hord", "wendelin", "oskaloosa", "riffle", "blair", "harter", "larkinsburg", "pixley", "songer", "stanford"]
};

// 2. Strict Town Matching Patterns (For Web Sweeps / Google Alerts ONLY)
const GOOGLE_ALERT_TOWN_REGEX_MAP = {
    "Flora": [
        /\bflora\b.*?\b(il|illinois)\b/i,
        /\bflora\s*,?\s*(il|illinois)\b/i,
        /\bfloyd henson\b/i,
        /\bflora wolves\b/i
    ],
    "Louisville": [
        /\blouisville\b.*?\b(il|illinois)\b/i,
        /\blouisville\s*,?\s*(il|illinois)\b/i,
        /\bnorth clay\b/i
    ],
    "Clay City": [
        /\bclay city\b.*?\b(il|illinois)\b/i,
        /\bclay city\s*,?\s*(il|illinois)\b/i,
        /\bclay city wolves\b/i
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

/* === SECTION: Extraction Helpers === */

/**
 * REFINED CLEANER:
 * Strips HTML tags and hides/removes any line or phrase containing "copyright".
 */
function extractStory(item) {
    const rawStory = item.contentEncoded || item.content || item.contentSnippet || item.summary || item.description || "";
    return rawStory
        .replace(/<[^>]+>/g, '') // Strips HTML tags
        .replace(/(?:[\u00a9\u24b8\u2122]|&copy;)?\s*copyright[^\.\n]*\.?/gi, '') // Removes copyright lines
        .trim();
}

function extractImage(item) {
    if (item.enclosure && item.enclosure.url) {
        return item.enclosure.url;
    }
    if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
        return item.mediaContent.$.url;
    }
    if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
        return item.mediaThumbnail.$.url;
    }
    
    const rawContent = item.contentEncoded || item.content || item.description || "";
    const imgMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/i);
    return (imgMatch && imgMatch[1]) ? imgMatch[1] : "";
}

function generateUniqueKey(title) {
    const cleanTitle = (title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return `news_${cleanTitle.slice(0, 30)}`;
}

/* === SECTION: Location Resolution === */
function resolveStoryTags(titleText, storyText, isGoogleAlert) {
    const textBlob = `${titleText} ${storyText}`.toLowerCase();
    const detectedTowns = new Set();

    // Check for town matches
    if (isGoogleAlert) {
        // Strict matching for web alert sweeps
        for (const [townName, regexArray] of Object.entries(GOOGLE_ALERT_TOWN_REGEX_MAP)) {
            for (const pattern of regexArray) {
                if (pattern.test(textBlob)) {
                    detectedTowns.add(townName);
                    break;
                }
            }
        }
    } else {
        // Direct word boundary matching for local RSS feeds
        for (const [townName, keywords] of Object.entries(LOCAL_TOWN_KEYWORD_MAP)) {
            for (const kw of keywords) {
                const regex = new RegExp(`\\b${kw}\\b`, 'i');
                if (regex.test(textBlob)) {
                    detectedTowns.add(townName);
                    break;
                }
            }
        }
    }

    // RULE 1: If town(s) mentioned, tag with those town name(s)
    if (detectedTowns.size > 0) {
        return Array.from(detectedTowns);
    }

    // RULE 2: If NO town name mentioned, default strictly to "Clay County"
    return ["Clay County"];
}

/* === SECTION: Dynamic Feed Fetching === */
async function fetchAllFeedItems() {
    const extractedArticles = [];

    for (const source of sourcesData) {
        if (source.type !== "rss") continue;

        try {
            console.log(`Fetching feed: ${source.name} (${source.url})`);
            const feed = await rssParser.parseURL(source.url);

            for (const item of feed.items) {
                extractedArticles.push({
                    title: item.title || "",
                    link: item.link || source.url,
                    date: item.isoDate || item.pubDate || new Date().toISOString(),
                    full_story: extractStory(item),
                    image: extractImage(item),
                    source_name: source.name,
                    source_url: source.url
                });
            }
        } catch (err) {
            console.error(`[FEED ERROR] Failed parsing ${source.name}:`, err.message);
        }
    }

    return extractedArticles;
}

/* === SECTION: Execution Pipeline === */
async function runScraper() {
    console.log(`Starting news pipeline... Loaded ${sourcesData.length} sources from rssfeed.json`);
    
    const articles = await fetchAllFeedItems();
    console.log(`Extracted ${articles.length} individual items to process.`);

    const writePromises = [];
    const processedKeys = new Set();

    let savedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    for (const item of articles) {
        const title = item.title;
        const story = item.full_story;
        const link = item.link;
        const image = item.image;
        const articleDate = item.date;

        if (
            !title || 
            title === "Freedom 92.9" || 
            title === "Flora City Official" || 
            link.endsWith('/feed/') || 
            (!story && !image)
        ) {
            skippedCount++;
            continue;
        }

        const docId = generateUniqueKey(title);
        if (processedKeys.has(docId)) {
            console.log(`[DUPLICATE INTERCEPTED] "${title}"`);
            duplicateCount++;
            continue;
        }
        processedKeys.add(docId);

        const sourceName = (item.source_name || "").toLowerCase();
        const sourceUrl = (item.source_url || "").toLowerCase();
        const isGoogleAlert = sourceName.includes("google alert") || sourceUrl.includes("google.com/alerts");

        // Resolve location tag (Town name if mentioned, otherwise "Clay County")
        const tags = resolveStoryTags(title, story, isGoogleAlert);
        const primaryLocation = tags.join(", ");

        // Save entry directly to Firestore /local_news
        const p = setDoc(doc(db, "local_news", docId), {
            date: articleDate,
            full_story: story,
            image: image,
            link: link,
            location: primaryLocation,
            tags: tags,
            title: title,
            updatedAt: new Date().toISOString()
        }, { merge: true })
        .then(() => {
            console.log(`[SAVED TO FIRESTORE] "${title}" -> Location: ${primaryLocation}`);
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
