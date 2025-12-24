const puppeteer = require('puppeteer'); // Back to standard
const axios = require('axios');
const FormData = require('form-data');

// ... (Your URLs) ...

module.exports = async (context, basicIO) => {
    // ...
    let browser = null;
    try {
        console.log("Launching Standard Browser...");
        
        // STANDARD LAUNCH WITH SAFETY ARGS
        browser = await puppeteer.launch({
            headless: "new", 
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        console.log("🔗 Opening YouTube...");
        await page.goto(NEWS_URL, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#movie_player');
        
        // Hide controls
        await page.evaluate(() => {
            const controls = document.querySelector('.ytp-chrome-bottom');
            if (controls) controls.style.display = 'none'; 
        });

        console.log("📸 Starting 24-Shot Burst...");

        // Run for approx 60 seconds (24 shots * 2.5s)
        for (let i = 1; i <= 24; i++) {
            const startTime = Date.now();
            
            // 1. Capture
            const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 70 });

            // 2. Upload (Fire & Forget)
            const form = new FormData();
            form.append('image', screenshotBuffer, { filename: `shot_${i}.jpg` });

            // Send to Vision Bot without waiting
            axios.post(VISION_API_URL, form, { headers: { ...form.getHeaders() } })
                .then(r => {
                    if (r.data.status === "New") console.log(`✨ NEWS: ${r.data.text}`);
                })
                .catch(e => console.error(`❌ Upload Error: ${e.message}`));

            // 3. Wait
            const timeTaken = Date.now() - startTime;
            const waitTime = Math.max(0, 2500 - timeTaken);
            await wait(waitTime);
        }

        console.log("✅ Cycle Complete.");
        
        // --- NEW RETURN STYLE (Node 18) ---
        return { 
            status: "success", 
            message: "Scraping Cycle Finished Successfully" 
        };

    } catch (error) {
        console.error("❌ Critical Error:", error);
        if (browser) await browser.close();
        
        // --- NEW ERROR STYLE (Node 18) ---
        throw new Error("Scraper Failed: " + error.message);
    }
};