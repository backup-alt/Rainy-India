const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const fs = require('fs');

const app = express();
const upload = multer({ dest: '/tmp/' }); // Save images to temp folder temporarily

app.use(express.json());

// 1. The Home Page (Just to check if server is alive)
app.get('/', (req, res) => {
    res.send('✅ The Brain is awake! Send POST requests to /process-image');
});

// 2. The OCR Route (This is what your Laptop hits)
app.post('/process-image', upload.single('image'), (req, res) => {
    console.log("📨 Received an image!");

    if (!req.file) {
        return res.status(400).send('❌ No image file uploaded.');
    }

    // Run Tesseract OCR
    Tesseract.recognize(
        req.file.path,
        'eng', // Language: English
        { logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
        console.log("✅ Text Found:", text);
        
        // Clean up: Delete the temp file
        fs.unlinkSync(req.file.path);

        // Send the text back to the laptop
        res.json({
            message: "Success",
            text: text
        });
    }).catch(err => {
        console.error("❌ OCR Error:", err);
        res.status(500).send(err.toString());
    });
});

module.exports = app;