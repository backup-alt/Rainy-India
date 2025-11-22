require('dotenv').config();
'use strict';

const catalyst = require('zcatalyst-sdk-node');

module.exports = async (context, basicIO) => {
  const app = catalyst.initialize(context);
  const req = context.request;
  
  try {
    console.log('📥 API Handler called');
    console.log('Path:', req.url?.pathname || 'unknown');
    
    const path = req.url?.pathname || '';
    const query = req.url?.query || {};
    
    const datastore = app.datastore();
    const table = datastore.table('Updates');
    
    // GET /updates - Get all updates
    if (path.includes('/updates') && !path.split('/').filter(p => p).pop()?.match(/\d+/)) {
      console.log('🔍 Fetching updates from database...');
      
      const tableQuery = table.query();
      tableQuery.where('is_active').is(true);
      
      // Apply filters
      if (query.state) {
        tableQuery.where('state').is(query.state);
      }
      
      if (query.region) {
        tableQuery.where('region').contains(query.region);
      }
      
      if (query.minConfidence) {
        tableQuery.where('confidence').greaterThanOrEqualTo(parseInt(query.minConfidence));
      }
      
      tableQuery.orderBy('confidence', 'desc');
      tableQuery.limit(100);
      
      const rows = await tableQuery.get();
      console.log(`✅ Found ${rows.length} updates`);
      
      // Transform data
      const updates = rows.map(row => ({
        id: row.update_id,
        title: row.title,
        content: row.content,
        region: row.region,
        state: row.state,
        reason: row.reason,
        sources: JSON.parse(row.sources || '[]'),
        sourceCount: row.source_count,
        confidence: row.confidence,
        timestamp: row.update_timestamp
      }));
      
      const response = {
        success: true,
        count: updates.length,
        updates: updates
      };
      
      basicIO.write(JSON.stringify(response, null, 2));
      return;
    }
    
    // GET /stats - Get statistics
    if (path.includes('/stats')) {
      console.log('📊 Fetching statistics...');
      
      const tableQuery = table.query();
      tableQuery.where('is_active').is(true);
      tableQuery.limit(1000);
      const allRows = await tableQuery.get();
      
      const stats = {
        totalUpdates: allRows.length,
        highConfidence: allRows.filter(r => r.confidence >= 90).length,
        mediumConfidence: allRows.filter(r => r.confidence >= 75 && r.confidence < 90).length,
        lowConfidence: allRows.filter(r => r.confidence < 75).length,
        byState: {},
        recentUpdates: []
      };
      
      // Group by state
      allRows.forEach(row => {
        if (!stats.byState[row.state]) {
          stats.byState[row.state] = 0;
        }
        stats.byState[row.state]++;
      });
      
      // Get 5 most recent
      const sorted = [...allRows].sort((a, b) => 
        new Date(b.update_timestamp) - new Date(a.update_timestamp)
      );
      
      stats.recentUpdates = sorted.slice(0, 5).map(row => ({
        id: row.update_id,
        title: row.title,
        region: row.region,
        state: row.state,
        confidence: row.confidence,
        timestamp: row.update_timestamp
      }));
      
      const response = {
        success: true,
        stats: stats
      };
      
      basicIO.write(JSON.stringify(response, null, 2));
      return;
    }
    
    // GET /health - Health check
    if (path.includes('/health')) {
      const response = {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
      
      basicIO.write(JSON.stringify(response, null, 2));
      return;
    }
    
    // Default: Return error
    const errorResponse = {
      success: false,
      error: 'Endpoint not found',
      path: path,
      availableEndpoints: ['/updates', '/stats', '/health']
    };
    
    basicIO.write(JSON.stringify(errorResponse, null, 2));
    
  } catch (error) {
    console.error('❌ API Error:', error);
    const errorResponse = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    basicIO.write(JSON.stringify(errorResponse, null, 2));
  }
};
