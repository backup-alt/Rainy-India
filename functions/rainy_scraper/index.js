require('dotenv').config(); 
'use strict';

const axios = require('axios');
const catalyst = require('zcatalyst-sdk-node');
const { getWeather } = require('./scrapers/weather');
const { getNews } = require('./scrapers/news');
const { checkRSS } = require('./scrapers/rss'); 
const { processData } = require('./utils/processor');

const API_KEY = process.env.NEWS_API_KEY;

module.exports = async (context, basicIO) => {
    const app = catalyst.initialize(context);
    const mode = basicIO.getArgument('mode');

    // ====================================================
    // ⚡ MODE 1: FLASH UPDATE (RSS - Fast & Free)
    // Usage: rainy_scraper({ "mode": "flash" })
    // ====================================================
    if (mode === 'flash') {
        try {
            console.log('⚡ Starting Flash Scraper (RSS Mode)...');
            
            // 1. Poll RSS Feeds (Instant)
            const rssResults = await checkRSS();
            
            if (rssResults.length > 0) {
                console.log(`   ⚡ Found ${rssResults.length} breaking alerts.`);
                
                // 2. Verify with Weather (Only for specific cities found)
                const affectedCities = rssResults.map(n => n.city);
                const weatherResults = await getWeather(affectedCities);
                
                // 3. Process & Save
                const activeUpdates = processData(weatherResults, rssResults);
                await saveUpdates(app, activeUpdates);
                
                basicIO.write(JSON.stringify({ 
                    status: 'success', 
                    type: 'flash',
                    updates_found: activeUpdates.length 
                }));
            } else {
                console.log("   ⚡ No breaking alerts found.");
                basicIO.write(JSON.stringify({ status: 'success', message: 'No new alerts' }));
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
    // Usage: rainy_scraper({ "mode": "real_history" })
    // ====================================================
    if (mode === 'real_history') {
        console.log("🔥 STARTING 30-DAY HISTORY BACKFILL...");
        
        try {
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                
                console.log(`\n📅 Processing Date: ${dateStr}`);
                
                // Fetch News for this specific day
                const newsResults = await getNews(dateStr, dateStr);
                
                if (newsResults.length > 0) {
                    const affectedCities = newsResults.map(n => n.city);
                    const weatherResults = await getWeather(affectedCities);
                    
                    // Rule-Based Processing (No AI)
                    const activeUpdates = processData(weatherResults, newsResults);
                    
                    await saveUpdates(app, activeUpdates);
                }
                
                // Sleep 1s to prevent API Limit errors
                await new Promise(r => setTimeout(r, 1000));
            }
            basicIO.write(JSON.stringify({ status: 'success', message: 'History backfill complete' }));
        } catch (err) {
            console.error('❌ History Error:', err);
            // Stop if we hit the limit
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
    // 🚀 MODE 3: PRODUCTION (Default - Scheduled Job)
    // Features: Deep Search + Predictive Watchlist
    // ====================================================
    try {
        console.log('🚀 Starting Rainy India Scraper (Predictive Mode)...');
        
        // 1. DEFINE WATCHLIST (Cities to monitor 24/7)
        // These get checked for weather even if there is NO news.
        const WATCHLIST = [
            'Chennai', 'Mumbai', 'Bengaluru', 'Kochi', 'Hyderabad', 
            'Visakhapatnam', 'Puducherry', 'Cuddalore', 'Nagapattinam', 'Thiruvananthapuram'
        ];

        // 2. PARALLEL FETCH (News + Watchlist Weather)
        const [newsResults, watchlistWeather] = await Promise.all([
            getNews(),              // Check for confirmed holidays (Last 24h)
            getWeather(WATCHLIST)   // Check for predictive alerts (Heavy Rain)
        ]);

        // 3. MERGE TARGETS
        // Get weather for any NEW cities found in the news (that aren't in watchlist)
        const newsCities = newsResults.map(n => n.city);
        const uniqueNewsCities = newsCities.filter(c => !WATCHLIST.includes(c)); 
        
        const newsWeather = await getWeather(uniqueNewsCities);

        // Combine all weather data (Watchlist + News-Driven)
        const allWeatherData = [...watchlistWeather, ...newsWeather];

        console.log(`✅ Data: ${allWeatherData.length} weather reports, ${newsResults.length} news articles`);

        // 4. PROCESS (Processor will now see high rain even without news)
        const activeUpdates = processData(allWeatherData, newsResults);
        
        if (activeUpdates.length === 0) {
            console.log('💤 No significant updates to report.');
            basicIO.write(JSON.stringify({ status: 'success', message: 'No updates needed' }));
            context.close();
            return;
        }

        // 5. Save to Database
        await saveUpdates(app, activeUpdates);

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
            // Check for existing record to avoid duplicates
            const query = `SELECT ROWID FROM Updates WHERE update_id = '${update.update_id}'`;
            const existingResult = await zcql.executeZCQLQuery(query);
            
            const rowData = {
                update_id: update.update_id,
                title: update.title,
                content: update.content || 'Weather condition monitored.',
                region: update.city,
                state: update.state,
                reason: update.reason,
                
                // Timestamps
                news_date: update.news_date, 
                update_timestamp: new Date().toISOString(),
                
                // Classification Fields (Rule-Based)
                category: update.category,
                holiday_type: update.holiday_type,
                summary: update.summary,

                // Metadata
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