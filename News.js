/* === SECTION: File Header & Config === */
// Active Version: v1.1.0 | Timestamp: 2026-07-29_11:12:00
// Description: Local News Engine - Firebase v9+ Firestore Integration & Town Filter Matrix

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const analytics = getAnalytics(app);
const db = getFirestore(app);

/* === SECTION: Text Processing & Filtering Utilities === */
function formatMoney(text) {
    if (!text) return "";
    return text.replace(/(\$\d+(?:,\d{3})*(?:\.\d{2})?)/g, '<span style="white-space: nowrap; font-weight: bold;">$1</span>');
}

const CLAY_TOWNS = [
    "flora", "louisville", "clay city", "xenia", "iola", "sailor springs",
    "bible grove", "blair", "harter", "hoosier", "larkinsburg", 
    "oskaloosa", "pixley", "songer", "stanford"
];

const CLAY_COUNTY_KEYWORDS = ["clay county", "state news", "illinois news"];

// Removes "© Copyright..." text from WNOI
function cleanStoryBody(storyText) {
    if (!storyText) return "";
    return storyText
        .replace(/[\u00a9\u24b8\u2122]?\s*Copyright\s+\d{4},?\s*WNOI[\s\S]*/gi, '')
        .trim();
}

// Determines Location tag
function resolveStoryLocation(item) {
    if (item.location) return item.location; // Use stored location if present

    const textBlob = `${item.title || ""} ${item.full_story || ""}`.toLowerCase();
    
    for (const town of CLAY_TOWNS) {
        if (textBlob.includes(town)) {
            return town.replace(/\b\w/g, char => char.toUpperCase());
        }
    }
    return "Clay County";
}

// Appends UTM parameters to external links
function appendUTMParameters(url) {
    if (!url) return "#";
    try {
        const parsedUrl = new URL(url);
        parsedUrl.searchParams.set("utm_source", "SMLC_News");
        parsedUrl.searchParams.set("utm_medium", "article_click");
        parsedUrl.searchParams.set("utm_campaign", "local_news");
        return parsedUrl.toString();
    } catch (e) {
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}utm_source=SMLC_News&utm_medium=article_click&utm_campaign=local_news`;
    }
}

// Drops Fairfield, Effingham, and non-Clay County stories
function isClayCountyArticle(item) {
    const textBlob = `${item.title || ""} ${item.full_story || ""} ${item.location || ""}`.toLowerCase();
    if (textBlob.includes("fairfield") || textBlob.includes("effingham")) return false;
    
    const allLocations = [...CLAY_TOWNS, ...CLAY_COUNTY_KEYWORDS];
    return allLocations.some(place => textBlob.includes(place));
}

/* === SECTION: News Rendering Pipeline === */
document.addEventListener('DOMContentLoaded', async () => {
    const summaryContainer = document.getElementById('town-summaries'); 
    const fullContainer = document.getElementById('full-news-container'); 

    try {
        const newsRef = collection(db, "local_news");
        const newsQuery = query(newsRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(newsQuery);
        
        const rawData = [];
        querySnapshot.forEach((doc) => {
            rawData.push({ id: doc.id, ...doc.data() });
        });

        // Dynamic Injection: Location resolving, copyright cleaning, and UTM tagging
        const processedData = rawData.map(item => {
            const locationTag = resolveStoryLocation(item);
            const cleanedStory = cleanStoryBody(item.full_story);
            const utmLink = appendUTMParameters(item.link);

            return {
                ...item,
                location: locationTag,
                full_story: cleanedStory,
                link: utmLink
            };
        });

        // Filter down to allowed articles
        const filteredData = processedData.filter(isClayCountyArticle);

        // MODE A: FRONT PAGE GRID
        if (summaryContainer) {
            summaryContainer.style.display = "grid";
            summaryContainer.style.gridTemplateColumns = "repeat(auto-fit, minmax(300px, 1fr))";
            summaryContainer.style.gap = "30px";
            summaryContainer.style.padding = "20px";
            summaryContainer.innerHTML = ''; 

            filteredData.forEach(item => {
                const imgHTML = item.image ? `<img src="${item.image}">` : '';

                summaryContainer.innerHTML += `
                    <div class="full-story-display" data-location="${item.location}">
                        <span class="location-badge" style="background:#0056b3; color:#fff; font-size:11px; font-weight:bold; padding:3px 8px; border-radius:3px; display:inline-block; margin-bottom:8px;">📍 ${item.location}</span>
                        <h1>${formatMoney(item.title)}</h1>
                        <p style="font-size: 0.8rem; font-weight: bold; color: #777;">${item.date || ''}</p>
                        ${imgHTML}
                        <div class="story-body">${formatMoney(item.full_story)}</div>
                        <button class="news-read-more-btn" 
                                onclick="window.location.href='https://www.supportmylocalcommunity.com/local-news/index.html#${item.id}'">
                            Read Full Story
                        </button>
                    </div>`;
            });
        } 
        
        // MODE B: HUB PAGE ARTICLES
        if (fullContainer) {
            fullContainer.innerHTML = ''; 

            filteredData.forEach(item => {
                const imgHTML = item.image ? `<img src="${item.image}" style="width:100%; border:1px solid #ccc; margin-bottom:20px;">` : '';

                fullContainer.innerHTML += `
                    <article id="${item.id}" data-location="${item.location}" style="background:#fff; padding:30px; border-bottom:3px double #333; margin-bottom:40px; font-family: 'Times New Roman', serif;">
                        <span class="location-badge" style="background:#0056b3; color:#fff; font-size:12px; font-weight:bold; padding:4px 10px; border-radius:3px; display:inline-block; margin-bottom:12px;">📍 ${item.location}</span>
                        <h1 style="font-size:2.8rem; margin-bottom:10px;">${formatMoney(item.title)}</h1>
                        <p style="font-style:italic; color:#666; margin-bottom:20px;">${item.date || ''}</p>
                        ${imgHTML}
                        <div class="story-body-full" style="font-size: 1.25rem; line-height: 1.8; white-space: pre-wrap;">${formatMoney(item.full_story)}</div>
                        <div style="margin-top:20px;">
                            <a href="${item.link}" target="_blank" style="color:#0258A3; font-weight:bold; font-size:1rem;">View Original Source &rarr;</a>
                        </div>
                    </article>`;
            });

            setTimeout(() => {
                const hashId = window.location.hash.substring(1); 
                if (hashId) {
                    const el = document.getElementById(hashId);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 600);
        }
    } catch (err) {
        console.error("Error loading news Firestore pipeline:", err);
    }
});
