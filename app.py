import os
import io
import re
import zipfile
from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
from zcatalyst_sdk import catalyst

app = Flask(__name__)

# --- CONFIGURATION ---
# Ensure 'tam' and 'eng' training data is installed in your Appsail environment
TESSERACT_CONFIG = '--oem 3 --psm 6' 

def clean_tamil_text(text):
    """Removes OCR noise like @#| but keeps Tamil, English, and Numbers."""
    # Keeps Tamil range \u0b80-\u0bff, Alphanumeric, and basic punctuation
    clean = re.sub(r'[^\u0b80-\u0bff a-zA-Z0-9.,!?]', '', text)
    # Remove extra whitespace
    return re.sub(r'\s+', ' ', clean).strip()

@app.route('/signals', methods=['POST'])
def handle_signal():
    try:
        # 1. Initialize Catalyst Context
        catalyst_app = catalyst.initialize(request)
        
        # 2. Get the ZIP file and Channel Name
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No ZIP file found"}), 400
        
        zip_file = request.files['file']
        channel_name = request.args.get('channel', 'Unknown')
        
        extracted_frames = []

        # 3. Unzip and Process each image in memory
        with zipfile.ZipFile(zip_file, 'r') as z:
            # Sort files to process them in chronological order (shot_001, shot_002...)
            for filename in sorted(z.namelist()):
                with z.open(filename) as f:
                    img = Image.open(f)
                    # Run OCR (Tamil + English)
                    raw_text = pytesseract.image_to_string(img, lang='tam+eng', config=TESSERACT_CONFIG)
                    cleaned = clean_tamil_text(raw_text)
                    
                    # Only add if it's not empty and not a duplicate of the last frame
                    if len(cleaned) > 5 and (not extracted_frames or cleaned != extracted_frames[-1]):
                        extracted_frames.append(cleaned)

        # 4. Join all frames into one news string
        final_news_text = " | ".join(extracted_frames)

        if not final_news_text:
            return jsonify({"status": "skipped", "message": "No readable text found in frames"}), 200

        # 5. Save to Zoho DataStore
        datastore = catalyst_app.datastore()
        table = datastore.table('NewsTicker') # Ensure this table exists in Catalyst!
        
        row_data = {
            'ChannelName': channel_name,
            'NewsContent': final_news_text
        }
        
        table.insert_row(row_data)
        
        print(f"✅ Processed {channel_name}: {final_news_text}")
        return jsonify({
            "status": "success",
            "channel": channel_name,
            "processed_text": final_news_text
        }), 200

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # Appsail uses port 8080 by default
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8080)))
