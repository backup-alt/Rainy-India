import os
import io
import re
import zipfile
from flask import Flask, request, jsonify
from zcatalyst_sdk import catalyst

app = Flask(__name__)


def clean_tamil_text(text):
    """Removes OCR noise and keeps Tamil, English, and Numbers."""
    # Zia is cleaner than Tesseract, but we still filter for safety
    clean = re.sub(r'[^\u0b80-\u0bff a-zA-Z0-9.,!?]', '', text)
    return re.sub(r'\s+', ' ', clean).strip()

@app.route('/signals', methods=['POST'])
def handle_signal():
    try:
        # 1. Initialize Catalyst
        catalyst_app = catalyst.initialize(request)
        vision = catalyst_app.vision() # Access Zoho's built-in AI
        
        # 2. Get the ZIP file
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No ZIP file"}), 400
        
        zip_file = request.files['file']
        channel_name = request.args.get('channel', 'Unknown')
        
        extracted_texts = []

        # 3. Unzip and Process each image using Zoho Zia
        with zipfile.ZipFile(zip_file, 'r') as z:
            for filename in sorted(z.namelist()):
                with z.open(filename) as f:
                    # Save image temporarily in memory for Zia
                    image_data = f.read()
                    
                    # Call Zoho Zia OCR (No installation needed!)
                    # We specify 'tam' for Tamil support
                    ocr_response = vision.ocr(image_data, {'language': 'tam'})
                    
                    if ocr_response and 'text' in ocr_response:
                        cleaned = clean_tamil_text(ocr_response['text'])
                        if len(cleaned) > 5:
                            extracted_texts.append(cleaned)

        # 4. Join results
        final_news = " | ".join(list(dict.fromkeys(extracted_texts)))

        # 5. Save to DataStore
        if final_news:
            datastore = catalyst_app.datastore()
            table = datastore.table('NewsTicker')
            table.insert_row({
                'ChannelName': channel_name,
                'NewsContent': final_news
            })

        return jsonify({"status": "success", "channel": channel_name, "news": final_news})

    except Exception as e:
        print(f"❌ Zia OCR Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8080)))
