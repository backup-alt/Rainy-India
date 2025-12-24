require('dotenv').config();
'use strict';

const axios = require('axios');
const catalyst = require('zcatalyst-sdk-node');
const { getWeather } = require('./scrapers/weather');
const { getNews } = require('./scrapers/news');
const { checkRSS } = require('./scrapers/rss');
const { processData } = require('./utils/processor');

// --- CONFIGURATION ---
const API_KEY = process.env.NEWS_API_KEY;
const GITHUB_TOKEN = "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";
const REPO_OWNER = "backup-alt";
const REPO_NAME = "Rainy-India";

// Cities to check 24/7 (Predictive Mode)
const WATCHLIST = [
    'Chennai', 'Mumbai', 'Bengaluru', 'Kochi', 'Hyderabad',
    'Visakhapatnam', 'Puducherry', 'Cuddalore', 'Nagapattinam', 'Thiruvananthapuram'
];

// --- HELPER: CALL CAMERAMAN (GITHUB ACTIONS) ---
async function callCameraman(districtName) {
    console.log(`📞 Calling Cameraman (GitHub) for ${districtName}...`);
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/cameraman.yml/dispatches`;

    try {
        await axios.post(url,
            {
                ref: "main",
                inputs: { duration: "3600" } // Tell him to watch for 1 hour
            },
            {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'ZohoCatalyst'
                }
            }
        );
        console.log("✅ Cameraman Dispatched successfully! (Check GitHub Actions)");
    } catch (error) {
        console.error("❌ Failed to call Cameraman:", error.response ? error.response.data : error.message);
    }
}

// --- MAIN FUNCTION ---
module.exports = async (context, basicIO) => {
    const app = catalyst.initialize(context);
    const mode = basicIO.getArgument('mode');

    // ====================================================
    // ⚡ MODE 1: FLASH UPDATE (RSS + Watchlist)
    // Run this frequently (e.g., every 15 mins)
    // ====================================================
    if (mode === 'flash') {
        try {
            console.log('⚡ Starting Flash Scraper (RSS + Watchlist)...');

            // 1. Run Checks in Parallel (Fast)
            const [rssResults, watchlistWeather] = await Promise.all([
                checkRSS(),             // Check breaking news (Free)
                getWeather(WATCHLIST)   // Check heavy rain in key cities (Free)
            ]);

            // 2. Combine Weather Targets
            const rssCities = rssResults.map(n => n.city);
            const uniqueRssCities = rssCities.filter(c => !WATCHLIST.includes(c));

            // Fetch weather for any NEW cities found in RSS
            const rssWeather = await getWeather(uniqueRssCities);

            // Merge all weather data
            const allWeatherData = [...watchlistWeather, ...rssWeather];

            console.log(`   ⚡ Status: ${rssResults.length} news alerts, ${allWeatherData.length} weather reports.`);

            // 3. Process & Save
            const activeUpdates = processData(allWeatherData, rssResults);

            if (activeUpdates.length > 0) {
                await saveUpdates(app, activeUpdates);

                // --- 🎥 INTELLIGENT CAMERAMAN TRIGGER ---
                // If any update is "High Confidence" rain/holiday, call the cameraman
                for (const update of activeUpdates) {
                    if (update.confidence > 80 || update.holiday_type !== 'None') {
                        await callCameraman(update.city);
                        break; // Only call once per batch to avoid spamming GitHub
                    }
                }
                // ----------------------------------------

                basicIO.write(JSON.stringify({
                    status: 'success',
                    type: 'flash',
                    updates_found: activeUpdates.length
                }));
            } else {
                console.log("   ⚡ No significant updates found.");
                basicIO.write(JSON.stringify({ status: 'success', message: 'No updates needed' }));
            }

        } catch (err) {
            console.error('❌ Flash Scraper Error:', err);
            basicIO.write(JSON.stringify({ status: 'error', error: err.message }));
        }
        context.close();
        return;
    }

    // ====================================================
    // 📜 MODE 2: REAL HISTORY (Backfill - 30 Days)
    // ====================================================
    if (mode === 'real_history') {
        console.log("🔥 STARTING 30-DAY HISTORY BACKFILL...");

        try {
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];

                console.log(`\n📅 Processing Date: ${dateStr}`);

                const newsResults = await getNews(dateStr, dateStr);

                if (newsResults.length > 0) {
                    const affectedCities = newsResults.map(n => n.city);
                    const weatherResults = await getWeather(affectedCities);
                    const activeUpdates = processData(weatherResults, newsResults);
                    await saveUpdates(app, activeUpdates);
                }

                await new Promise(r => setTimeout(r, 1000));
            }
            basicIO.write(JSON.stringify({ status: 'success', message: 'History backfill complete' }));
        } catch (err) {
            console.error('❌ History Error:', err);
            if (err.message === "API_LIMIT_REACHED") {
                basicIO.write(JSON.stringify({ status: 'error', error: 'API Limit Reached' }));
            } else {
                basicIO.write(JSON.stringify({ status: 'error', error: err.message }));
            }
        }
        context.close();
        return;
    }

    // ====================================================
    // 🚀 MODE 3: PRODUCTION (Default - Manual/Daily Deep Check)
    // ====================================================
    try {
        console.log('🚀 Starting Deep Scraper (Production Mode)...');

        const [newsResults, watchlistWeather] = await Promise.all([
            getNews(),
            getWeather(WATCHLIST)
        ]);

        const newsCities = newsResults.map(n => n.city);
        const uniqueNewsCities = newsCities.filter(c => !WATCHLIST.includes(c));
        const newsWeather = await getWeather(uniqueNewsCities);

        const allWeatherData = [...watchlistWeather, ...newsWeather];

        console.log(`✅ Data: ${allWeatherData.length} weather reports, ${newsResults.length} news articles`);

        const activeUpdates = processData(allWeatherData, newsResults);

        if (activeUpdates.length === 0) {
            console.log('💤 No significant updates to report.');
            basicIO.write(JSON.stringify({ status: 'success', message: 'No updates needed' }));
            context.close();
            return;
        }

        await saveUpdates(app, activeUpdates);

        // --- 🎥 INTELLIGENT CAMERAMAN TRIGGER ---
        // Same logic: If Production Mode finds something serious, Record it.
        for (const update of activeUpdates) {
            if (update.confidence > 80 || update.holiday_type !== 'None') {
                await callCameraman(update.city);
                break; 
            }
        }
        // ----------------------------------------

        basicIO.write(JSON.stringify({
            status: 'success',
            processed: activeUpdates.length
        }));
        context.close();

    } catch (error) {
        console.error('❌ Critical Error:', error);
        basicIO.write(JSON.stringify({ status: 'error', error: error.message }));
        context.close();
    }
};

// --- HELPER: DATABASE SAVER ---
async function saveUpdates(app, updates) {
    if (updates.length === 0) return;

    const table = app.datastore().table('Updates');
    const zcql = app.zcql();

    console.log(`💾 Saving ${updates.length} updates...`);

    for (const update of updates) {
        try {
            const query = `SELECT ROWID FROM Updates WHERE update_id = '${update.update_id}'`;
            const existingResult = await zcql.executeZCQLQuery(query);

            const rowData = {
                update_id: update.update_id,
                title: update.title,
                content: update.content || 'Weather condition monitored.',
                region: update.city,
                state: update.state,
                reason: update.reason,

                news_date: update.news_date,
                update_timestamp: new Date().toISOString(),

                category: update.category,
                holiday_type: update.holiday_type,
                summary: update.summary,

                sources: JSON.stringify(update.sources),
                source_count: update.sources.length,
                confidence: update.confidence,
                is_active: true
            };

            if (existingResult.length > 0) {
                const rowId = existingResult[0].Updates.ROWID;
                await table.updateRow({ ROWID: rowId, ...rowData });
                console.log(`   🔄 Updated: ${update.city} [${update.holiday_type}]`);
            } else {
                await table.insertRow(rowData);
                console.log(`   ✨ Created: ${update.city} [${update.holiday_type}]`);
            }
        } catch (err) {
            console.error(`   ⚠️ Save failed for ${update.city}: ${err.message}`);
        }
    }
}