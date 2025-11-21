'use strict';

const catalyst = require('zcatalyst-sdk-node');

module.exports = async (context, basicIO) => {
  const app = catalyst.initialize(context);

  try {
    console.log('🚀 Starting Rainy India scraper...');

    // Sample update row (for testing)
    const testUpdate = {
      update_id: 'test_quick_' + Date.now(),
      title: 'Chennai Schools Closed Due to Heavy Rain',
      content: 'All schools in Chennai closed tomorrow due to IMD red alert',
      region: 'Chennai',
      state: 'Tamil Nadu',
      reason: 'Heavy rainfall warning',
      sources: JSON.stringify([
        { name: 'IMD', url: 'https://imd.gov.in', weight: 10 }
      ]),
      source_count: 1,
      confidence: 95,
      update_timestamp: new Date().toISOString(), // ✅ Fixed datetime format
      is_active: true
    };

    // Connect to Data Store
    const datastore = app.datastore();
    const table = datastore.table('Updates');

    console.log('💾 Saving to database...');
    await table.insertRow(testUpdate);
    console.log('✅ Saved successfully');

    const result = {
      status: 'success',
      message: 'Test data created successfully',
      newUpdates: 1,
      timestamp: new Date().toISOString()
    };

    // Write response (string only)
    basicIO.write(JSON.stringify(result, null, 2));
    context.close();

  } catch (error) {
    console.error('❌ Error:', error);

    basicIO.write(JSON.stringify({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2));
    context.close();
  }
};
