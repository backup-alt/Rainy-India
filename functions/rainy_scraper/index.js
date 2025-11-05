const catalyst = require('zcatalyst-sdk-node');
const weatherScraper = require('./scrapers/weather');
const newsScraper = require('./scrapers/news');
const govScraper = require('./scrapers/gov');
const { deduplicateUpdates, calculateConfidence } = require('./utils/filter');

module.exports = async (context, basicIO) => {
  const app = catalyst.initialize(context);
  
  try {
    console.log('🚀 Starting Rainy India scraper...');
    
    // Run all scrapers in parallel
    const [weatherData, newsData, govData] = await Promise.all([
      weatherScraper.scrape(app),
      newsScraper.scrape(app),
      govScraper.scrape(app)
    ]);
    
    console.log(`✅ Scraping complete: Weather=${weatherData.length}, News=${newsData.length}, Gov=${govData.length}`);
    
    // Combine all results
    const allResults = [...weatherData, ...newsData, ...govData];
    
    if (allResults.length === 0) {
      console.log('⚠️ No new updates found');
      basicIO.write(JSON.stringify({
        success: true,
        message: 'No new updates found',
        count: 0
      }));
      return;
    }
    
    // Deduplicate
    console.log('🔄 Deduplicating updates...');
    const deduplicated = deduplicateUpdates(allResults);
    
    // Calculate confidence scores
    console.log('📊 Calculating confidence scores...');
    const processed = deduplicated.map(update => calculateConfidence(update));
    
    // Get Data Store table
    const datastore = app.datastore();
    const table = datastore.table('Updates');
    
    // Merge with existing data
    console.log('💾 Saving to database...');
    let newCount = 0;
    let updatedCount = 0;
    
    for (const update of processed) {
      try {
        // Check if update exists
        const existingQuery = await table.getRows({
          criteria: {
            column: 'update_id',
            comparator: 'is',
            value: update.id
          }
        });
        
        const rowData = {
          update_id: update.id,
          title: update.title,
          content: update.content || '',
          region: update.region,
          state: update.state,
          reason: update.reason || '',
          sources: JSON.stringify(update.sources),
          source_count: update.sourceCount || update.sources.length,
          confidence: update.confidence,
          update_timestamp: new Date(update.timestamp).toISOString(),
          is_active: true
        };
        
        if (existingQuery.length > 0) {
          // Update existing
          await table.updateRow({
            ROWID: existingQuery[0].ROWID,
            ...rowData
          });
          updatedCount++;
        } else {
          // Insert new
          await table.insertRow(rowData);
          newCount++;
        }
        
      } catch (err) {
        console.error(`Error saving update ${update.id}:`, err.message);
      }
    }
    
    // Cleanup old records (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await table.deleteRows({
      criteria: {
        column: 'update_timestamp',
        comparator: 'is less than',
        value: sevenDaysAgo.toISOString()
      }
    });
    
    const result = {
      success: true,
      message: 'Scraping completed successfully',
      newUpdates: newCount,
      updatedRecords: updatedCount,
      totalProcessed: processed.length,
      timestamp: new Date().toISOString()
    };
    
    console.log('✨ Scraping complete:', result);
    basicIO.write(JSON.stringify(result));
    
  } catch (error) {
    console.error('❌ Scraper error:', error);
    basicIO.write(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }));
  }
};