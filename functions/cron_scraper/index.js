const catalyst = require('zcatalyst-sdk-node');

module.exports = async (cronDetails, context) => {
  const app = catalyst.initialize(context);
  
  try {
    console.log('⏰ Cron job triggered at:', new Date().toISOString());
    console.log('Cron details:', cronDetails);
    
    // Execute the main scraper function
    const functions = app.functions();
    
    // Replace with your actual scraper function ID
    const scraperFunctionId = process.env.SCRAPER_FUNCTION_ID || 'YOUR_SCRAPER_FUNCTION_ID';
    
    const result = await functions.functionId(scraperFunctionId).execute();
    
    console.log('✅ Scraper executed successfully:', result);
    
    return {
      success: true,
      message: 'Cron scraper completed',
      result: result,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Cron scraper error:', error);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};