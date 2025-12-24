const http = require('http');
const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');
const Jimp = require('jimp');
const catalyst = require('zcatalyst-sdk-node');

/**
 * 🚀 1. MANDATORY APPSAIL HEALTH CHECK
 * Starts immediately so Zoho doesn't kill the container while Chrome loads.
 */
const PORT = process.env.PORT || 9000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TAMIL_VISION_BOT_ACTIVE');
}).listen(PORT, () => {
    console.log(`✅ Health check server listening on port ${PORT}`);
});

/**
 * 🕵️ 2. BOT CONFIGURATION
 */
const CHANNELS = [
    { name: 'Thanthi TV', url: 'https://www.youtube.com/@ThanthiTV/live' },
    { name: 'Puthiya Thalaimurai', url: 'https://www.youtube.com/@PuthiyaThalaimuraiTV/live' }
];

const KEYWORDS = ['விடுமுறை', 'பள்ளி', 'கல்லூரி', 'மழை', 'ஆட்சியர்'];

async function startBot() {
    console.log("👁️ Initializing Cloud Browser...");
    const app = catalyst.initialize();

    const browser = await puppeteer.launch({
        headless: "new",
        // This path is set by our Dockerfile
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    while (true) {
        for (const channel of CHANNELS) {
            try {
                console.log(`📺 Checking ${channel.name}...`);
                await page.goto(channel.url, { waitUntil: 'networkidle2', timeout: 60000 });

                // Wait for the video stream element specifically
                const videoSelector = 'video.video-stream.html5-main-video';
                await page.waitForSelector(videoSelector, { timeout: 20000 });
                
                const videoElement = await page.$(videoSelector);
                const screenshotBuffer = await videoElement.screenshot();

                // 🖼️ Image Processing for better OCR
                const image = await Jimp.read(screenshotBuffer);
                image.crop(0, Math.floor(image.bitmap.height * 0.8), image.bitmap.width, Math.floor(image.bitmap.height * 0.2))
                     .greyscale()
                     .contrast(0.5);
                
                const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

                // 📝 OCR Processing
                const { data: { text } } = await Tesseract.recognize(processedBuffer, 'tam');
                console.log(`📝 [${channel.name}] Text: ${text.substring(0, 40)}...`);

                if (KEYWORDS.some(word => text.includes(word))) {
                    console.log("🚨 MATCH FOUND! Saving to DataStore...");
                    
                    const table = app.datastore().table('updates');
                    await table.insertRow({
                        title: `TV ALERT: ${channel.name}`,
                        content: text.trim(),
                        source: channel.name,
                        is_active: true,
                        category: "Weather Update"
                    });
                }
            } catch (err) {
                console.error(`⚠️ Error on ${channel.name}:`, err.message);
            }
            // 15 second gap between channels
            await new Promise(res => setTimeout(res, 15000));
        }
        // 5 minute gap between full cycles
        console.log("😴 Cycle complete. Sleeping for 5 minutes...");
        await new Promise(res => setTimeout(res, 300000));
    }
}

// Start the bot loop
startBot().catch(console.error);