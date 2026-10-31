/* ==========================================================================
   File: jobs/jobs-sync.js  |  2026-10-31  |  v1.0
   Now Hiring feed for SMLC.

   Pulls job openings in and around Clay County, IL from the free Adzuna
   job search API and saves them to Firebase, where now-hiring.html reads them.

   Runs from .github/workflows/jobs-sync.yml twice a day.
   Needs two GitHub repository secrets (free key from developer.adzuna.com):
       ADZUNA_APP_ID
       ADZUNA_APP_KEY

   Free plan = about 1,000 calls a month. This uses at most
   SEARCH_CENTERS x MAX_PAGES calls per run (2 x 2 = 4), so 2 runs a day
   is about 250 calls a month.
   ========================================================================== */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const APP_ID = process.env.ADZUNA_APP_ID || "";
const APP_KEY = process.env.ADZUNA_APP_KEY || "";

// Searches are centered on these towns; RADIUS_KM around each covers the county
const SEARCH_CENTERS = ["Louisville, Illinois", "Flora, Illinois"];
const RADIUS_KM = 30;          // about 19 miles
const RESULTS_PER_PAGE = 50;
const MAX_PAGES = 2;

// Towns in Clay County (a job whose location names one of these is "in the county")
const COUNTY_TOWNS = ["Clay City", "Flora", "Louisville", "Sailor Springs", "Xenia", "Iola",
    "Bible Grove", "Blair", "Harter", "Hoosier", "Larkinsburg", "Oskaloosa", "Pixley", "Songer", "Stanford"];

const firebaseConfig = {
    apiKey: "AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg",
    authDomain: "smlc-fuel-monitor.firebaseapp.com",
    databaseURL: "https://smlc-fuel-monitor-default-rtdb.firebaseio.com",
    projectId: "smlc-fuel-monitor",
    storageBucket: "smlc-fuel-monitor.firebasestorage.app",
    messagingSenderId: "22397440085",
    appId: "1:22397440085:web:c00e716858ed58895bc4dc"
};

function cleanText(s) {
    return String(s || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

/** Which Clay County town the job is in, or "" if it's outside the county */
function countyTown(job) {
    const area = (job.location && job.location.area) || [];
    const display = (job.location && job.location.display_name) || "";
    const haystack = (area.join(" | ") + " | " + display).toLowerCase();
    const town = COUNTY_TOWNS.find(t => haystack.includes(t.toLowerCase()));
    if (town) return town;
    if (haystack.includes("clay county")) return "Clay County";
    return "";
}

async function searchAdzuna(where, page) {
    const params = new URLSearchParams({
        app_id: APP_ID,
        app_key: APP_KEY,
        results_per_page: String(RESULTS_PER_PAGE),
        where,
        distance: String(RADIUS_KM),
        sort_by: "date",
        "content-type": "application/json"
    });
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/${page}?${params}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Adzuna HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
}

async function main() {
    if (!APP_ID || !APP_KEY) {
        console.log("[JOBS] ADZUNA_APP_ID / ADZUNA_APP_KEY secrets are not set yet - nothing to do.");
        return;
    }

    const byId = new Map();
    for (const center of SEARCH_CENTERS) {
        for (let page = 1; page <= MAX_PAGES; page++) {
            let data;
            try {
                data = await searchAdzuna(center, page);
            } catch (e) {
                console.error(`[JOBS] Search failed for ${center} page ${page}:`, e.message);
                break;
            }
            const results = data.results || [];
            console.log(`[JOBS] ${center} page ${page}: ${results.length} jobs`);
            results.forEach(j => {
                if (!j || !j.id || byId.has(String(j.id))) return;
                const town = countyTown(j);
                const predicted = String(j.salary_is_predicted) === "1";
                byId.set(String(j.id), {
                    id: String(j.id),
                    title: cleanText(j.title),
                    company: cleanText(j.company && j.company.display_name),
                    location: cleanText(j.location && j.location.display_name),
                    town: town,                         // "" = nearby, outside Clay County
                    inCounty: !!town,
                    description: cleanText(j.description).slice(0, 400),
                    url: j.redirect_url || "",
                    created: j.created || "",
                    category: cleanText(j.category && j.category.label).replace(/\s*Jobs$/i, ""),
                    contract: j.contract_time || j.contract_type || "",
                    salaryMin: !predicted && j.salary_min ? Math.round(j.salary_min) : null,
                    salaryMax: !predicted && j.salary_max ? Math.round(j.salary_max) : null
                });
            });
            if (results.length < RESULTS_PER_PAGE) break; // no more pages
        }
    }

    const jobs = [...byId.values()]
        .filter(j => j.title && j.url)
        .sort((a, b) => (b.inCounty - a.inCounty) || (new Date(b.created) - new Date(a.created)));

    const payload = {
        updatedAt: new Date().toISOString(),
        source: "Adzuna",
        count: jobs.length,
        inCountyCount: jobs.filter(j => j.inCounty).length,
        jobsJson: JSON.stringify(jobs)
    };
    console.log(`[JOBS] ${payload.count} jobs (${payload.inCountyCount} in Clay County)`);

    if (!jobs.length) {
        console.log("[JOBS] No jobs returned - keeping the previous list.");
        return;
    }

    // Save to Firestore (smlc_jobs/current). If Firestore rules block it, fall back to the Realtime DB.
    try {
        const db = getFirestore(initializeApp(firebaseConfig));
        await setDoc(doc(db, "smlc_jobs", "current"), payload);
        console.log("[JOBS] Saved to Firestore smlc_jobs/current");
    } catch (e) {
        console.warn("[JOBS] Firestore save failed (" + e.message + "), trying Realtime Database /jobs_board ...");
        const res = await fetch(firebaseConfig.databaseURL + "/jobs_board.json", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Realtime DB save failed: HTTP " + res.status + " " + (await res.text()).slice(0, 200));
        console.log("[JOBS] Saved to Realtime Database /jobs_board");
    }
}

main()
    .then(() => process.exit(0))
    .catch(e => { console.error("[JOBS] Failed:", e.message); process.exit(1); });
