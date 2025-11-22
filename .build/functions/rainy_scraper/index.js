require('dotenv').config(); 
'use strict';

// --- DEBUG CHECK START ---
console.log("------------------------------------------------");
console.log("🔍 DEBUGGING KEYS:");
console.log("Weather Key:", process.env.OPENWEATHER_API_KEY ? "✅ Loaded" : "❌ MISSING (Undefined)");
console.log("News Key:", process.env.NEWS_API_KEY ? "✅ Loaded" : "❌ MISSING (Undefined)");
console.log("------------------------------------------------");
// --- DEBUG CHECK END ---


const catalyst = require('zcatalyst-sdk-node');
const { getWeather } = require('./scrapers/weather');
const { getNews } = require('./scrapers/news');
const { processData } = require('./utils/processor');

module.exports = async (context, basicIO) => {
    const app = catalyst.initialize(context);
    
    try {
        console.log('🚀 Starting Rainy India Scraper (Production Mode)...');
        
        // 1. Run Scrapers in Parallel
        const [weatherResults, newsResults] = await Promise.all([
            getWeather(),
            getNews()
        ]);

        console.log(`✅ Raw Data: ${weatherResults.length} weather alerts, ${newsResults.length} news articles`);

        // 2. Process and Merge Data
        const finalUpdates = processData(weatherResults, newsResults);
        
        // Filter: Only save if confidence > 0 (meaning either rain or news exists)
        const activeUpdates = finalUpdates.filter(u => u.confidence > 0);
        
        if (activeUpdates.length === 0) {
            console.log('sleeping... No significant updates to report.');
            basicIO.write(JSON.stringify({ status: 'success', message: 'No updates needed' }));
            context.close();
            return;
        }

        // 3. Save to Catalyst Data Store
        const datastore = app.datastore();
        const table = datastore.table('Updates');
        const zcql = app.zcql(); // <--- WE NEED THIS FOR QUERIES
        
        console.log(`💾 Saving ${activeUpdates.length} updates to database...`);
        
        for (const update of activeUpdates) {
            // CORRECTED: Use ZCQL to check if the row exists
            // We wrap the ID in quotes '${id}' because it is a string
            const query = `SELECT ROWID FROM Updates WHERE update_id = '${update.update_id}'`;
            const existingResult = await zcql.executeZCQLQuery(query);
            
            // The result comes back as an array of objects
            const existingRows = existingResult; 

            const rowData = {
                update_id: update.update_id,
                title: update.title,
                content: update.content || 'Weather condition monitored.',
                region: update.city || update.source || 'India',
                state: update.state || 'General',
                reason: update.reason || 'News/Weather update',
                sources: JSON.stringify(update.sources),
                source_count: update.sources.length,
                confidence: update.confidence,
                update_timestamp: new Date().toISOString(),
                is_active: true
            };

            if (existingRows.length > 0) {
                // Found it! Update using the ROWID from the query result
                // Note: ZCQL returns tables as keys, e.g., { Updates: { ROWID: ... } }
                const rowId = existingRows[0].Updates.ROWID;
                
                await table.updateRow({ ROWID: rowId, ...rowData });
                console.log(`🔄 Updated record for ${update.city || update.title.substring(0,10)}...`);
            } else {
                // Not found! Insert new.
                await table.insertRow(rowData);
                console.log(`✨ Created new record for ${update.city || update.title.substring(0,10)}...`);
            }
        }

        basicIO.write(JSON.stringify({ 
            status: 'success', 
            processed: activeUpdates.length 
        }));
        context.close();

    } catch (error) {
        console.error('❌ Critical Error:', error);
        // Improve error logging to see the full object
        basicIO.write(JSON.stringify({ status: 'error', error: error.message }));
        context.close();
    }
};