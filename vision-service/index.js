const http = require('http');
const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');
const Jimp = require('jimp');
const catalyst = require('zcatalyst-sdk-node');
const axios = require('axios');

// 🚀 MANDATORY APPSAIL HEALTH CHECK
// This keeps the bot alive 24/7 on Zoho's servers
const PORT = process.env.PORT || 9000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TAMIL_VISION_BOT_ACTIVE');
}).listen(PORT);

const CHANNELS = [
    { name: 'Thanthi TV', url: 'https://www.youtube.com/@ThanthiTV/live' },
    { name: 'Puthiya Thalaimurai', url: 'https://www.youtube.com/@PuthiyaThalaimuraiTV/live' },
    { name: 'Sun News', url: 'https://www.youtube.com/@Sunnewstamil/live' }
];

const KEYWORDS = ['விடுமுறை', 'பள்ளி', 'கல்லூரி', 'மழை', 'கனமழை', 'ஆட்சியர்'];
const API_URL = 'https://sherwin-60052075848.development.catalystserverless.com/server/api_handler/updates';

async function startTamilVisionBot() {
    console.log("👁️ 🚀 Starting Tamil Vision Bot...");
    const app = catalyst.initialize();

    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: '/usr/bin/google-chrome-stable',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    while (true) {
        for (const channel of CHANNELS) {
            try {
                console.log(`🔴 Tuning into: ${channel.name}`);
                await page.goto(channel.url, { waitUntil: 'networkidle2', timeout: 30000 });
                
                await page.waitForSelector('video', { timeout: 10000 });
                const videoElement = await page.$('video');
                const screenshotBuffer = await videoElement.screenshot();

                const image = await Jimp.read(screenshotBuffer);
                image.crop(0, Math.floor(image.bitmap.height * 0.8), image.bitmap.width, Math.floor(image.bitmap.height * 0.2))
                     .greyscale().contrast(0.5);
                
                const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
                const { data: { text } } = await Tesseract.recognize(processedBuffer, 'tam');

                if (KEYWORDS.some(k => text.includes(k))) {
                    console.log(`🚨 MATCH FOUND: ${text.substring(0, 50)}`);
                    await axios.post(API_URL, {
                        title: `📺 TV Alert: ${channel.name}`,
                        content: text.trim(),
                        category: "Breaking News"
                    });
                }
            } catch (err) {
                console.error(`⚠️ Error: ${err.message}`);
            }
            await new Promise(r => setTimeout(r, 10000));
        }
    }
}

startTamilVisionBot().catch(console.error);