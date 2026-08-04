/* === SECTION: File Header & Config === */
// Active Version: v1.8.9 | Timestamp: 2026-08-03_20:55:00
// Description: Multi-Source Local News Scraper with Strict Clay County Relevance Filtering

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import fs from "fs";

// Safe JSON reading across all Node.js environments
const sourcesData = JSON.parse(fs.readFileSync(new URL("./rssfeed.json", import.meta.url), "utf8"));

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
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LocalNewsBot/1.8' },
    customFields: {
        item: [
            ['content:encoded', 'contentEncoded'],
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail']
        ]
    }
});

/* === SECTION: Town Keyword Maps === */

const LOCAL_TOWN_KEYWORD_MAP = {
    "Flora": [
        "flora", 
        "floyd henson", 
        "floyd henson jr high", 
        "flora wolves", 
        "lady wolves", 
        "flora unit 35",
        "frank & bright",
        "frank and bright",
        "frank & bright funeral home",
        "frank and bright funeral home"
    ],
    "Louisville": ["louisville", "north clay", "nc cardinals", "north clay cardinals", "north clay indians"],
    "Clay City": ["clay city", "clay city wolves", "clay city lady wolves", "clay city cusd"],
    "Xenia": ["xenia"],
    "Sailor Springs": ["sailor springs"],
    "Iola": ["iola"],
    "Ingraham": ["ingraham"],
    "Bible Grove": ["bible grove"],
    "Unincorporated Clay County": ["hord", "wendelin", "oskaloosa", "riffle", "blair", "harter", "larkinsburg", "pixley", "songer", "stanford"]
};

// Broad Clay County Check (For general county mentions)
const GENERAL_CLAY_COUNTY_REGEX = /\bclay\s*county\b/i;

/* === SECTION: Data Cleaning & Extraction Helpers === */

function cleanTitle(rawTitle) {
    if (!rawTitle) return "";
    return rawTitle
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&').replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
}

function cleanStoryText(rawText) {
    if (!rawText) return "";
    return rawText
        .replace(/<[^>]+>/g, '') // Strips HTML tags
        .replace(/(?:[\u00a9\u24b8\u2122]|&copy;)?\s*copyright[^\.\n]*\.?/gi, '') // Strips copyright notices
        .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .trim();
}

function cleanLink(rawLink) {
    if (!rawLink) return "";
    if (rawLink.includes("google.com/url?") || rawLink.includes("google.com/alerts/url?")) {
        const urlMatch = rawLink.match(/(?:url|q)=([^&]+)/);
        if (urlMatch && urlMatch[1]) {
            return decodeURIComponent(urlMatch[1]);
        }
    }
    return rawLink;
}

function extractImageFromFeed(item) {
    if (item.enclosure && item.enclosure.url) return item.enclosure.url;
    if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) return item.mediaContent.$.url;
    if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) return item.mediaThumbnail.$.url;
    
    const rawContent = item.contentEncoded || item.content || item.description || "";
    const imgMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/i);
    return (imgMatch && imgMatch[1]) ? imgMatch[1] : "";
}

async function scrapeWebPageContent(url) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LocalNewsBot/1.8' },
            signal: AbortSignal.timeout(6000)
        });
        
        if (!res.ok) return { title: "", story: "", image: "" };
        const html = await res.text();
        const $ = cheerio.load(html);

        $('script, style, nav, header, footer, iframe, noscript, .comments, .sidebar').remove();

        const pageTitle = cleanTitle($('h1').first().text() || $('title').text() || "");

        let leadImage = $('meta[property="og:image"]').attr('content') || 
                        $('meta[name="twitter:image"]').attr('content') || 
                        $('article img').first().attr('src') || 
                        $('.content img').first().attr('src') || "";

        if (leadImage && !leadImage.startsWith('http')) {
            const urlObj = new URL(url);
            leadImage = `${urlObj.origin}${leadImage.startsWith('/') ? '' : '/'}${leadImage}`;
        }

        let storyParagraphs = [];
        const selector = $('article').length ? 'article p' : 'main p, .content p, .entry-content p, p';
        
        $(selector).each((_, el) => {
            const txt = $(el).text().trim();
            if (txt.length > 25) {
                storyParagraphs.push(txt);
            }
        });

        const fullStory = storyParagraphs.join("\n\n");
        return {
            title: pageTitle,
            story: cleanStoryText(fullStory),
            image: leadImage
        };
    } catch (err) {
        console.warn(`[HTML SCRAPE WARN] Could not scrape webpage ${url}:`, err.message);
        return { title: "", story: "", image: "" };
    }
}

function generateUniqueKey(title) {
    const sanitizedTitle = (title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return `news_${sanitizedTitle.slice(0, 30)}`;
}

/* === SECTION: Strict Location Filtering Engine === */

/**
 * Returns array of tags if story is relevant to Clay County.
 * Returns null if the story has NO relation to Clay County or its towns.
 */
function resolveStoryTags(titleText, storyText) {
    const textBlob = `${titleText} ${storyText}`.toLowerCase();
    const detectedTowns = new Set();

    // 1. Check for specific towns or local landmarks (Flora, Frank & Bright, Louisville, etc.)
    for (const [townName, keywords] of Object.entries(LOCAL_TOWN_KEYWORD_MAP)) {
        for (const kw of keywords) {
            const regex = new RegExp(`\\b${kw}\\b`, 'i');
            if (regex.test(textBlob)) {
                detectedTowns.add(townName);
                break;
            }
        }
    }

    if (detectedTowns.size > 0) {
        return Array.from(detectedTowns);
    }

    // 2. Check for explicit "Clay County" mentions if no specific town was hit
    if (GENERAL_CLAY_COUNTY_REGEX.test(textBlob)) {
        return ["Clay County"];
    }

    // 3. Reject story entirely if neither town nor county is mentioned (e.g. Salem, Marion County)
    return null;
}

/* === SECTION: Dynamic Multi-Source Ingestion === */

async function fetchAllFeedItems() {
    const extractedArticles = [];

    for (const source of sourcesData) {
        const sourceType = (source.type || "").toLowerCase();
        
        // 1. Direct HTML Scraping
        if (sourceType === "html" || sourceType === "webpage") {
            try {
                console.log(`[HTML SCRAPING] ${source.name} (${source.url})`);
                const htmlData = await scrapeWebPageContent(source.url);
                
                if (htmlData.story || htmlData.title) {
                    extractedArticles.push({
                        title: htmlData.title || source.name,
                        link: source.url,
                        date: new Date().toISOString(),
                        full_story: htmlData.story,
                        image: htmlData.image,
                        source_name: source.name,
                        source_url: source.url
                    });
                }
            } catch (err) {
                console.error(`[HTML SOURCE ERROR] Failed parsing ${source.name}:`, err.message);
            }
            continue;
        }

        // 2. RSS & Google Alert Feeds
        try {
            console.log(`[FEED FETCHING] ${source.name} (${source.url})`);
            const feed = await rssParser.parseURL(source.url);

            for (const item of feed.items) {
                const itemTitle = cleanTitle(item.title);
                const itemLink = cleanLink(item.link || source.url);
                let itemStory = cleanStoryText(item.contentEncoded || item.content || item.contentSnippet || item.summary || item.description || "");
                let itemImage = extractImageFromFeed(item);

                // HTML Fallback for short snippets
                if (itemStory.length < 100 && itemLink.startsWith("http")) {
                    console.log(`[HTML FALLBACK] Short snippet for "${itemTitle}". Scraping destination URL...`);
                    const scraped = await scrapeWebPageContent(itemLink);
                    if (scraped.story.length > itemStory.length) {
                        itemStory = scraped.story;
                    }
                    if (!itemImage && scraped.image) {
                        itemImage = scraped.image;
                    }
                }

                extractedArticles.push({
                    title: itemTitle,
                    link: itemLink,
                    date: item.isoDate || item.pubDate || new Date().toISOString(),
                    full_story: itemStory,
                    image: itemImage,
                    source_name: source.name,
                    source_url: source.url
                });
            }
        } catch (err) {
            console.error(`[FEED ERROR] Failed parsing feed "${source.name}":`, err.message);
        }
    }

    return extractedArticles;
}

/* === SECTION: Execution Pipeline === */

async function runScraper() {
    console.log(`Starting news pipeline... Loaded ${sourcesData.length} sources from rssfeed.json`);
    
    const articles = await fetchAllFeedItems();
    console.log(`Extracted ${articles.length} total raw items from all sources.`);

    const writePromises = [];
    const processedKeys = new Set();

    let savedCount = 0;
    let duplicateCount = 0;
    let irrelevantCount = 0;
    let skippedCount = 0;

    for (const item of articles) {
        const title = item.title;
        const story = item.full_story;
        const link = item.link;
        const image = item.image;
        const articleDate = item.date;

        if (!title || title.trim() === "" || link.endsWith('/feed/')) {
            skippedCount++;
            continue;
        }

        const docId = generateUniqueKey(title);
        if (processedKeys.has(docId)) {
            duplicateCount++;
            continue;
        }
        processedKeys.add(docId);

        // Location Check
        const tags = resolveStoryTags(title, story);

        // REJECTION RULE: If story doesn't mention Clay County or its towns, discard it!
        if (!tags) {
            console.log(`[DISCARDED - OUT OF AREA] "${title}"`);
            irrelevantCount++;
            continue;
        }

        const primaryLocation = tags.join(", ");

        const p = setDoc(doc(db, "local_news", docId), {
            date: articleDate,
            full_story: story,
            image: image,
            link: link,
            location: primaryLocation,
            source_name: item.source_name || "Local News",
            source_url: item.source_url || link,
            tags: tags,
            title: title,
            updatedAt: new Date().toISOString()
        }, { merge: true })
        .then(() => {
            console.log(`[SAVED TO FIRESTORE] "${title}" -> Source: ${item.source_name} | Location: ${primaryLocation}`);
            savedCount++;
        })
        .catch((err) => {
            console.error(`[FIRESTORE WRITE ERROR] Failed writing "${title}":`, err.message);
        });

        writePromises.push(p);
    }

    await Promise.all(writePromises);
    console.log(`Pipeline complete! Saved: ${savedCount} | Out of Area Dropped: ${irrelevantCount} | Duplicates: ${duplicateCount} | Skipped: ${skippedCount}`);
    process.exit(0);
}

runScraper();
