const catalyst = require('zcatalyst-sdk-node');

module.exports = async (context, basicIO) => {
  const app = catalyst.initialize(context);
  const req = context.request;
  const res = context.response;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    basicIO.write('');
    return;
  }
  
  try {
    const path = req.url.pathname;
    const query = req.url.query || {};
    
    const datastore = app.datastore();
    const table = datastore.table('Updates');
    
    // GET /api/updates - Get all updates with filters
    if (path === '/updates' && req.method === 'GET') {
      let queryOptions = {
        max_rows: 100,
        order_by: {
          column: 'confidence',
          order: 'desc'
        }
      };
      
      // Build query criteria
      const criteria = [];
      
      if (query.state) {
        criteria.push({
          column: 'state',
          comparator: 'is',
          value: query.state
        });
      }
      
      if (query.region) {
        criteria.push({
          column: 'region',
          comparator: 'contains',
          value: query.region
        });
      }
      
      if (query.minConfidence) {
        criteria.push({
          column: 'confidence',
          comparator: 'is greater than or equal to',
          value: parseInt(query.minConfidence)
        });
      }
      
      // Always filter active records
      criteria.push({
        column: 'is_active',
        comparator: 'is',
        value: true
      });
      
      if (criteria.length > 0) {
        queryOptions.criteria = criteria;
      }
      
      const rows = await table.getRows(queryOptions);
      
      // Parse sources JSON
      const updates = rows.map(row => ({
        id: row.update_id,
        title: row.title,
        content: row.content,
        region: row.region,
        state: row.state,
        reason: row.reason,
        sources: JSON.parse(row.sources),
        sourceCount: row.source_count,
        confidence: row.confidence,
        timestamp: row.update_timestamp
      }));
      
      res.statusCode = 200;
      basicIO.write(JSON.stringify({
        success: true,
        count: updates.length,
        updates: updates
      }));
      
    }
    
    // GET /api/updates/:id - Get single update
    else if (path.startsWith('/updates/') && req.method === 'GET') {
      const updateId = path.split('/').pop();
      
      const rows = await table.getRows({
        criteria: {
          column: 'update_id',
          comparator: 'is',
          value: updateId
        }
      });
      
      if (rows.length === 0) {
        res.statusCode = 404;
        basicIO.write(JSON.stringify({
          success: false,
          error: 'Update not found'
        }));
        return;
      }
      
      const row = rows[0];
      const update = {
        id: row.update_id,
        title: row.title,
        content: row.content,
        region: row.region,
        state: row.state,
        reason: row.reason,
        sources: JSON.parse(row.sources),
        sourceCount: row.source_count,
        confidence: row.confidence,
        timestamp: row.update_timestamp
      };
      
      res.statusCode = 200;
      basicIO.write(JSON.stringify({
        success: true,
        update: update
      }));
      
    }
    
    // GET /api/stats - Get statistics
    else if (path === '/stats' && req.method === 'GET') {
      const allRows = await table.getRows({
        criteria: {
          column: 'is_active',
          comparator: 'is',
          value: true
        },
        max_rows: 1000
      });
      
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
      
      res.statusCode = 200;
      basicIO.write(JSON.stringify({
        success: true,
        stats: stats
      }));
      
    }
    
    // POST /api/scrape - Trigger manual scrape
    else if (path === '/scrape' && req.method === 'POST') {
      const functions = app.functions();
      
      // Execute scraper function
      const result = await functions.functionId('YOUR_SCRAPER_FUNCTION_ID').execute();
      
      res.statusCode = 200;
      basicIO.write(JSON.stringify({
        success: true,
        message: 'Scraping triggered',
        result: result
      }));
      
    }
    
    // GET /api/health - Health check
    else if (path === '/health' && req.method === 'GET') {
      res.statusCode = 200;
      basicIO.write(JSON.stringify({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
      }));
      
    }
    
    // 404 - Not found
    else {
      res.statusCode = 404;
      basicIO.write(JSON.stringify({
        success: false,
        error: 'Endpoint not found'
      }));
    }
    
  } catch (error) {
    console.error('API Error:', error);
    res.statusCode = 500;
    basicIO.write(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
};