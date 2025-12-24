const Tesseract = require('tesseract.js');
const fs = require('fs');
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (event, context) => {
    const catalystApp = catalyst.initialize(context);
    const imagePath = `/tmp/ocr_${Date.now()}.jpg`;

    console.log("🔔 mail_bot triggered by Signal!");

    try {
        // 1. EXTRACT IMAGE DATA
        // We check both direct data and the nested 'events' array to ensure compatibility
        const base64Image = event.data?.image || event.events?.[0]?.data?.image;

        if (!base64Image) {
            console.error("❌ No image found in payload. Structure:", JSON.stringify(event));
            throw new Error("Missing image data in Signal payload");
        }

        // 2. SAVE TEMPORARY IMAGE FILE
        fs.writeFileSync(imagePath, Buffer.from(base64Image, 'base64'));
        console.log("💾 Image stored temporarily for processing.");

        // 3. RUN TAMIL + ENGLISH OCR
        console.log("🔍 Starting OCR (Tamil + English)...");
        const result = await Tesseract.recognize(imagePath, 'tam+eng', {
            logger: m => console.log(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`)
        });
        
        const extractedText = result.data.text.trim();
        console.log("📝 Extracted Text:", extractedText);

        // 4. SAVE TO DATA STORE
        if (extractedText) {
            const table = catalystApp.datastore().table('NewsHeadlines');
            await table.insertRow({ 
                HeadlineText: extractedText 
            });
            console.log("✅ Row inserted successfully into NewsHeadlines.");
        } else {
            console.log("⚠️ No text detected. Skipping database insertion.");
        }

        // 5. SEND TO VISION SERVICE (Optional AppSail Update)
        // If your Vision service is active, it will pick this up via the dashboard API
        
        context.closeWithSuccess();

    } catch (err) {
        console.error("❌ Process Error:", err.message);
        context.closeWithFailure();
    } finally {
        // Cleanup: Always delete the temporary image file
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log("🧹 Temporary file cleaned up.");
        }
    }
};