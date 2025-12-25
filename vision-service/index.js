const http = require('http');
const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');
const Jimp = require('jimp');
const catalyst = require('zcatalyst-sdk-node');
const axios = require('axios');

// 🚀 MANDATORY APPSAIL HEALTH CHECK
// Zoho needs this web server to "ping" your bot and know it's alive.
const PORT = process.env.PORT || 9000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TAMIL_VISION_BOT_ACTIVE');
}).listen(PORT, () => {
    console.log(`✅ Health check server listening on port ${PORT}`);
});

// 📺 TARGET CHANNELS (Thanthi, Puthiya Thalaimurai, Sun News)
const CHANNELS = [
    { 
        name: 'Thanthi TV', 
        url: 'https://www.youtube.com/@ThanthiTV/live' 
    },
    { 
        name: 'Puthiya Thalaimurai', 
        url: 'https://www.youtube.com/@PuthiyaThalaimuraiTV/live' 
    },
    { 
        name: 'Sun News', 
        url: 'https://www.youtube.com/@Sunnewstamil/live' 
    }
];

// 🕵️ TAMIL KEYWORDS (Holiday, School, Rain, Collector)
const KEYWORDS = [
    'விடுமுறை',   // Holiday
    'பள்ளி',       // School
    'கல்லூரி',     // College
    'மழை',         // Rain
    'கனமழை',       // Heavy Rain
    'ஆட்சியர்',    // Collector
    'ரெட் அலர்ட்', // Red Alert
    'மூடல்',       // Closed
    'உத்தரவு'      // Order
];

// 🔗 Your Database API
const API_URL = 'https://sherwin-60052075848.development.catalystserverless.com/server/api_handler/updates';

async function startTamilVisionBot() {
    console.log("👁️ 🚀 Starting Tamil Vision Bot (Thanthi + PTT + Sun)...");

    const app = catalyst.initialize();

    // Launch Browser (Optimized for AppSail and Linux Docker)
    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: '/usr/bin/google-chrome-stable', // Point to the Chrome installed in your Dockerfile
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', 
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    });

    const page = await browser.newPage();
    
    // Block heavy assets to save RAM in the cloud
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'font', 'stylesheet'].includes(req.resourceType())) req.abort();
        else req.continue();
    });

    // --- INFINITE LOOP ---
    while (true) {
        for (const channel of CHANNELS) {
            try {
                console.log(`   🔴 Tuning into: ${channel.name}`);
                
                // 1. Load Stream (Timeout 30s)
                await page.goto(channel.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                try {
                    await page.waitForSelector('#ytd-player', { timeout: 10000 });
                } catch(e) { 
                    console.log(`      ⚠️ Player not found on ${channel.name}, skipping...`);
                    continue; 
                } 

                // 2. SNAP (Full Screenshot for Evidence)
                const videoElement = await page.$('#ytd-player');
                const fullScreenshotBuffer = await videoElement.screenshot();

                // 3. CROP (Bottom 15% - Ticker Area)
                const image = await Jimp.read(fullScreenshotBuffer);
                const w = image.bitmap.width;
                const h = image.bitmap.height;
                
                // Focusing on the news ticker area for better OCR accuracy
                image.crop(0, Math.floor(h * 0.85), w, Math.floor(h * 0.15))
                     .greyscale()     
                     .contrast(0.8)   
                     .invert();       

                const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

                // 4. READ (OCR in TAMIL)
                const { data: { text } } = await Tesseract.recognize(processedBuffer, 'tam');
                
                const cleanText = text.replace(/\n/g, ' ').trim();

                // 5. DETECT
                const isMatch = KEYWORDS.some(k => cleanText.includes(k));

                if (isMatch) {
                    console.log(`   🚨 MATCH [${channel.name}]: "${cleanText}"`);
                    
                    // --- UPLOAD EVIDENCE ---
                    const fileName = `proof_${channel.name.replace(/\s/g,'')}_${Date.now()}.png`;
                    const folder = app.filestore().folder('Evidence'); 
                    const upload = await folder.upload({
                        code: fullScreenshotBuffer,
                        name: fileName
                    });
                    
                    const proofUrl = `https://sherwin-60052075848.development.catalystserverless.com/server/file_handler/${upload.id}`;

                    // --- SAVE TO DB ---
                    await axios.post(API_URL, {
                        title: `📺 TV Flash: ${channel.name}`,
                        content: `TICKER: ${cleanText}`,
                        region: "Tamil Nadu",
                        state: "Tamil Nadu",
                        confidence: 95,
                        category: "Breaking News",
                        imageUrl: proofUrl
                    });
                    
                    console.log("   ✅ Alert & Proof Sent!");
                }

            } catch (err) {
                console.error(`   ⚠️ Error on ${channel.name}: ${err.message}`);
            }
            
            // Wait 10 seconds before checking the next channel to avoid hitting rate limits
            await new Promise(r => setTimeout(r, 10000));
        }
    }
}

// Global error handling for the main bot loop
startTamilVisionBot().catch(err => {
    console.error("❌ CRITICAL BOT ERROR:", err);
    process.exit(1);
});


