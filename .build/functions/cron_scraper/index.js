const catalyst = require('zcatalyst-sdk-node');

module.exports = async (cronDetails, context) => {
  const app = catalyst.initialize(context);
  
  try {
    console.log('⏰ Cron Trigger: Starting Flash Check...');
    
    // Initialize Functions component
    const functions = app.functions();
    
    // EXECUTE RAINY_SCRAPER WITH "FLASH" ARGUMENT
    const execution = await functions.functionId('rainy_scraper').execute({
        args: { 
            mode: "flash" 
        } 
    });
    
    console.log('✅ Scraper Output:', execution);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Cron Failed:', error);
    return { success: false, error: error.message };
  }
};