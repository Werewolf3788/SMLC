/* === SECTION: File Header & Config === */
// Active Version: v1.9.2 | Timestamp: 2026-10-31
// Description: Multi-Source Local News Scraper with Strict Clay County Town Filtering + Numeric Area IDs

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import fs from "fs";
import crypto from "crypto";

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
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LocalNewsBot/1.9' },
    customFields: {
        item: [
            ['content:encoded', 'contentEncoded'],
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail']
        ]
    }
});

const STORE_FULL_STORY = false;
const EXCERPT_LENGTH = 400;
const MAX_AGE_DAYS = 7;

/* === SECTION: Area Rules === */
const AREA_RULES = {
    "Flora": {
        strong: ["floyd henson", "floyd henson jr high", "fhjh", "flora wolves", "flora lady wolves",
                 "flora pups", "flora unit 35", "flora high school", "frank & bright", "frank and bright"],
        ambiguous: ["flora"]
    },
    "Louisville": {
        strong: ["north clay", "north clay cardinals", "north clay indians", "north clay high school",
                 "nc cardinals", "louisville township"],
        ambiguous: ["louisville"],
        weakCase: [/\bNC\b/]
    },
    "Clay City": {
        strong: ["cc wolves", "clay city wolves", "clay city lady wolves", "clay city cusd",
                 "clay city high school", "clay city township"],
        ambiguous: ["clay city"],
        weakCase: [/\bCC\b/]
    },
    "Xenia": {
        strong: ["knapps", "xenia township"],
        ambiguous: ["xenia"]
    },
    "Iola": {
        strong: [],
        ambiguous: ["iola"]
    },
    "Sailor Springs": {
        strong: ["sailor springs"],
        ambiguous: []
    },
    "Bible Grove": {
        strong: ["bible grove township"],
        ambiguous: ["bible grove"]
    },
    "Ingraham": {
        strong: [],
        ambiguous: ["ingraham"]
    },
    "Hoosier": {
        strong: ["hoosier township"],
        ambiguous: [],
        weak: ["hoosier"]
    },
    "Hord": {
        strong: [],
        ambiguous: ["hord"]
    },
    "Oskaloosa": {
        strong: ["oskaloosa township"],
        ambiguous: ["oskaloosa"]
    },
    "Riffle": {
        strong: [],
        ambiguous: ["riffle"]
    },
    "Wendelin": {
        strong: [],
        ambiguous: ["wendelin"]
    },
    "Camp Travis": {
        strong: [],
        ambiguous: ["camp travis"]
    },
    "Greendale": {
        strong: [],
        ambiguous: ["greendale"]
    },
    "Bethel": {
        strong: [],
        ambiguous: [],
        weak: ["bethel"]
    },
    "Jordon": {
        strong: [],
        ambiguous: [],
        weak: ["jordon"]
    },
    "Blair": {
        strong: ["blair township"],
        ambiguous: [],
        weak: ["blair"]
    },
    "Harter": {
        strong: ["harter township"],
        ambiguous: [],
        weak: ["harter"]
    },
    "Larkinsburg": {
        strong: ["larkinsburg township"],
        ambiguous: [],
        weak: ["larkinsburg"]
    },
    "Pixley": {
        strong: ["pixley township"],
        ambiguous: [],
        weak: ["pixley"]
    },
    "Songer": {
        strong: ["songer township"],
        ambiguous: [],
        weak: ["songer"]
    },
    "Stanford": {
        strong: ["stanford township"],
        ambiguous: [],
        weak: ["stanford"]
    },
    "Clay County": {
        strong: [],
        ambiguous: ["clay county"]
    }
};

const ZIP_AREAS = {
    "62839": ["Flora"],
    "62858": ["Louisville", "Bible Grove", "Hoosier"],
    "62824": ["Clay City"],
    "62899": ["Xenia"],
    "62847": ["Iola"],
    "62879": ["Sailor Springs"],
    "62434": ["Ingraham"]
};

const AREA_IDS = {
    "Clay County": 0,
    "Louisville": 1,
    "Flora": 2,
    "Clay City": 3,
    "Xenia": 4,
    "Sailor Springs": 5,
    "Iola": 6,
    "Bible Grove": 7,
    "Ingraham": 8,
    "Hoosier": 9,
    "Hord": 10,
    "Oskaloosa": 11,
    "Riffle": 12,
    "Wendelin": 13,
    "Camp Travis": 14,
    "Greendale": 15,
    "Bethel": 16,
    "Jordon": 17,
    "Blair": 18,
    "Harter": 19,
    "Larkinsburg": 20,
    "Pixley": 21,
    "Songer": 22,
    "Stanford": 23
};

const COLLEGE_REGEX = /\b(college|university|lake land|olney central|SIU|SIUE|EIU)\b/i;
const OTHER_STATES_REGEX = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|wisconsin|wyoming)\b/i;

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesAny(lowerText, keywords = []) {
    return keywords.some(kw => new RegExp(`\\b${escapeRegex(kw)}\\b`, "i").test(lowerText));
}

/* === SECTION: Strict Location Filtering Engine === */
function resolveStoryTags(title, summary) {
    const text = `${title} ${summary}`;
    const lower = text.toLowerCase();

    const hasIllinois = /\billinois\b/i.test(text) || /,\s*IL\b/.test(text);
    const hasCounty = /\bclay\s*county\b/i.test(text);
    const hasContext = hasIllinois || hasCounty;
    const wrongState = OTHER_STATES_REGEX.test(text) && !hasIllinois;

    const hits = new Set();

    for (const [area, rules] of Object.entries(AREA_RULES)) {
        const matched =
            matchesAny(lower, rules.strong) ||
            (!wrongState && matchesAny(lower, rules.ambiguous)) ||
            (hasContext && matchesAny(lower, rules.weak)) ||
            (hasContext && (rules.weakCase || []).some(re => re.test(text)));

        if (matched) hits.add(area);
    }

    for (const [zip, areas] of Object.entries(ZIP_AREAS)) {
        if (new RegExp(`\\b${zip}\\b`).test(text)) {
            areas.forEach(a => hits.add(a));
        }
    }

    // 1. Towns matched: keep Clay County (tag 0) so stories show up in general county feeds
    const towns = [...hits].filter(a => a !== "Clay County");
    if (towns.length > 0) {
        return ["Clay County", ...towns];
    }

    // 2. Colleges hidden if no town matched
    if (COLLEGE_REGEX.test(text)) return null;

    // 3. County-wide only
    if (hits.has("Clay County")) return ["Clay County"];

    // 4. Everything else discarded
    return null;
}

/* === SECTION: Data Cleaning & Extraction Helpers === */
function decodeEntities(str) {
    if (!str) return "";
    return str
        .replace(/&#8217;|&#8216;|&rsquo;|&lsquo;/g, "'")
        .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
        .replace(/&#8211;|&ndash;/g, "–")
        .replace(/&#8212;|&mdash;/g, "—")
        .replace(/&#8230;|&hellip;/g, "…")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function cleanTitle(rawTitle) {
    if (!rawTitle) return "";
    return decodeEntities(rawTitle.replace(/<[^>]+>/g, '').trim());
}

function cleanStoryText(rawText) {
    if (!rawText) return "";
    const stripped = rawText
        .replace(/<p>\s*The post\b[\s\S]*?appeared first on[\s\S]*?<\/p>/gi, '')
        .replace(/The post\b[^\n]*?appeared first on[^\n]*/gi, '')
        .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/\bwww\.\S+/gi, '')
        .replace(/\bVisit website\b/gi, '');

    return decodeEntities(stripped)
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

function makeExcerpt(text) {
    if (!text || text.length <= EXCERPT_LENGTH) return text || "";
    const cut = text.slice(0, EXCERPT_LENGTH);
    const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    return (lastStop > 150 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, "")) + "…";
}

function normalizeDate(raw) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
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
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LocalNewsBot/1.9' },
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

        return {
            title: pageTitle,
            story: cleanStoryText(storyParagraphs.join("\n\n")),
            image: leadImage
        };
    } catch (err) {
        console.warn(`[HTML SCRAPE WARN] Could not scrape webpage ${url}:`, err.message);
        return { title: "", story: "", image: "" };
    }
}

// Generates an ID using headline text + MD5 hash of link to guarantee zero collisions
function generateUniqueKey(title, link) {
    const slug = (title || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 35);
    const hash = crypto.createHash("md5").update(link || title).digest("hex").slice(0, 8);
    return `news_${slug}_${hash}`;
}

/* === SECTION: Dynamic Multi-Source Ingestion === */
async function fetchAllFeedItems() {
    const extractedArticles = [];

    for (const source of sourcesData) {
        const sourceType = (source.type || "").toLowerCase();

        if (sourceType === "html" || sourceType === "webpage") {
            try {
                console.log(`[HTML SCRAPING] ${source.name} (${source.url})`);
                const htmlData = await scrapeWebPageContent(source.url);

                if (htmlData.story || htmlData.title) {
                    extractedArticles.push({
                        title: htmlData.title || source.name,
                        link: source.url,
                        date: normalizeDate(new Date().toISOString()),
                        full_story: htmlData.story,
                        summary: htmlData.story.slice(0, 500),
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

        try {
            console.log(`[FEED FETCHING] ${source.name} (${source.url})`);
            const feed = await rssParser.parseURL(source.url);
            const skipFallback = source.excerptOnly === true || /wnoi\.com/i.test(source.url);

            for (const item of feed.items) {
                const itemTitle = cleanTitle(item.title);
                const itemLink = cleanLink(item.link || source.url);
                let itemStory = cleanStoryText(item.contentEncoded || item.content || item.contentSnippet || item.summary || item.description || "");
                const itemSummary = cleanStoryText(item.contentSnippet || item.summary || item.description || item.content || "").slice(0, 500);
                let itemImage = extractImageFromFeed(item);

                if (!skipFallback && itemStory.length < 100 && itemLink.startsWith("http")) {
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
                    date: normalizeDate(item.isoDate || item.pubDate || new Date().toISOString()),
                    full_story: itemStory,
                    summary: itemSummary,
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
    let tooOldCount = 0;
    const cutoffTime = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

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

        if (new Date(articleDate).getTime() < cutoffTime) {
            tooOldCount++;
            continue;
        }

        const docId = generateUniqueKey(title, link);
        if (processedKeys.has(docId)) {
            duplicateCount++;
            continue;
        }
        processedKeys.add(docId);

        const tags = resolveStoryTags(title, item.summary || "");
        if (!tags) {
            irrelevantCount++;
            continue;
        }

        const towns = tags.filter(t => t !== "Clay County");
        const tagIds = tags.map(t => AREA_IDS[t]);

        if (tagIds.some(id => id === undefined)) {
            console.error(`[MISSING AREA ID] "${title}" has an unmapped tag: ${tags.join(", ")}`);
            skippedCount++;
            continue;
        }

        const displayLocation = towns.length ? towns.join(", ") : "Clay County";

        const docData = {
            date: articleDate,
            excerpt: makeExcerpt(story),
            image: image,
            link: link,
            location: displayLocation,
            source_name: item.source_name || "Local News",
            source_url: item.source_url || link,
            tags: tagIds,         // Numeric array (0 = Clay County, 2 = Flora, etc.)
            tagNames: tags,       // Human-readable labels
            towns: towns,
            title: title,
            updatedAt: new Date().toISOString()
        };

        if (STORE_FULL_STORY) docData.full_story = story;

        const p = setDoc(doc(db, "local_news", docId), docData, { merge: true })
            .then(() => {
                console.log(`[SAVED TO FIRESTORE] "${title}" -> ${displayLocation}`);
                savedCount++;
            })
            .catch((err) => {
                console.error(`[FIRESTORE WRITE ERROR] "${title}":`, err.message);
            });

        writePromises.push(p);
    }

    await Promise.all(writePromises);
    console.log(`Pipeline complete! Saved: ${savedCount} | Out of Area Dropped: ${irrelevantCount} | Too Old Dropped: ${tooOldCount} | Duplicates: ${duplicateCount} | Skipped: ${skippedCount}`);
    process.exit(0);
}

runScraper();
