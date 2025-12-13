const catalyst = require('zcatalyst-sdk-node');

// CORRECT SIGNATURE: (context, basicIO)
module.exports = async (context, basicIO) => {
  const app = catalyst.initialize(context);
  
  try {
    console.log('⏰ Cron Trigger: Starting Flash Check...');
    
    // Initialize Functions component
    const functions = app.functions();
    
    // EXECUTE RAINY_SCRAPER WITH "FLASH" ARGUMENT
    // This tells the main scraper to run in the fast, free RSS mode
    const execution = await functions.functionId('rainy_scraper').execute({
        args: { 
            mode: "flash" 
        } 
    });
    
    console.log('✅ Scraper Output:', execution);
    
    // BASIC I/O RESPONSE (Required!)
    basicIO.write(JSON.stringify({ 
        success: true, 
        message: "Flash mode triggered successfully" 
    }));
    context.close();
    
  } catch (error) {
    console.error('❌ Cron Failed:', error);
    basicIO.write(JSON.stringify({ success: false, error: error.message }));
    context.close();
  }
};