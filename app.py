import os
import io
import re
import zipfile
from flask import Flask, request, jsonify
import pytesseract
from PIL import Image

app = Flask(__name__)

def clean_tamil_text(text):
    # Remove OCR noise like @#| but keep Tamil, English, and Numbers
    clean = re.sub(r'[^\u0b80-\u0bff a-zA-Z0-9.,!?]', '', text)
    return re.sub(r'\s+', ' ', clean).strip()

@app.route('/signals', methods=['POST'])
def handle_signal():
    # 1. Get the ZIP file from the request
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file received"}), 400
    
    zip_file = request.files['file']
    channel_name = request.args.get('channel', 'Unknown')
    
    extracted_text = []
    
    # 2. Unzip the images in memory
    with zipfile.ZipFile(zip_file, 'r') as z:
        for filename in sorted(z.namelist()):
            with z.open(filename) as f:
                img = Image.open(f)
                # 3. Run OCR on each frame
                raw_text = pytesseract.image_to_string(img, lang='tam+eng')
                cleaned = clean_tamil_text(raw_text)
                if len(cleaned) > 5: # Only keep meaningful text
                    extracted_text.append(cleaned)

    # 4. Join all frames into one news update (removing duplicates)
    final_news = " | ".join(list(dict.fromkeys(extracted_text)))
    
    print(f"📢 News from {channel_name}: {final_news}")
    
    # 5. TODO: Save 'final_news' to your DataStore or Database
    return jsonify({
        "status": "success",
        "channel": channel_name,
        "news": final_news
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=os.getenv('PORT', 8080))
