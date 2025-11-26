require('dotenv').config(); 
'use strict';

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
        const activeUpdates = processData(weatherResults, newsResults);
        
        if (activeUpdates.length === 0) {
            console.log('sleeping... No significant updates to report.');
            basicIO.write(JSON.stringify({ status: 'success', message: 'No updates needed' }));
            context.close();
            return;
        }

        // 3. Save to Catalyst Data Store
        const datastore = app.datastore();
        const table = datastore.table('Updates');
        const zcql = app.zcql(); 
        
        console.log(`💾 Saving ${activeUpdates.length} updates to database...`);
        
        for (const update of activeUpdates) {
            // Check if row exists for today
            const query = `SELECT ROWID FROM Updates WHERE update_id = '${update.update_id}'`;
            const existingResult = await zcql.executeZCQLQuery(query);
            const existingRows = existingResult; 

            const rowData = {
                update_id: update.update_id,
                title: update.title,
                content: update.content || 'Weather condition monitored.',
                region: update.city || update.source || 'India',
                state: update.state || 'General',
                reason: update.reason || 'News/Weather update',
                
                // ✅ Saving the new date column
                news_date: update.news_date, 

                sources: JSON.stringify(update.sources),
                source_count: update.sources.length,
                confidence: update.confidence,
                update_timestamp: new Date().toISOString(),
                is_active: true
            };

            if (existingRows.length > 0) {
                // Update existing
                const rowId = existingRows[0].Updates.ROWID;
                await table.updateRow({ ROWID: rowId, ...rowData });
                console.log(`🔄 Updated record for ${update.city}`);
            } else {
                // Insert new
                await table.insertRow(rowData);
                console.log(`✨ Created new record for ${update.city}`);
            }
        }

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