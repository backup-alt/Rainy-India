import os
import io
import re
import zipfile
from flask import Flask, request, jsonify
from zcatalyst_sdk import catalyst

app = Flask(__name__)

def clean_tamil_text(text):
    clean = re.sub(r'[^\u0b80-\u0bff a-zA-Z0-9.,!?]', '', text)
    return re.sub(r'\s+', ' ', clean).strip()

@app.route('/signals', methods=['POST'])
def handle_signal():
    try:
        catalyst_app = catalyst.initialize(request)
        vision = catalyst_app.vision()
        
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file received"}), 400
        
        uploaded_file = request.files['file']
        channel_name = request.args.get('channel', 'Unknown')
        extracted_texts = []

        # If it's a ZIP from the Cameraman bot
        if uploaded_file.filename.endswith('.zip'):
            with zipfile.ZipFile(uploaded_file, 'r') as z:
                for filename in sorted(z.namelist()):
                    if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                        with z.open(filename) as f:
                            ocr_response = vision.ocr(f.read(), {'language': 'tam'})
                            if ocr_response and 'text' in ocr_response:
                                cleaned = clean_tamil_text(ocr_response['text'])
                                if len(cleaned) > 5: extracted_texts.append(cleaned)
        else:
            # Single image processing
            ocr_response = vision.ocr(uploaded_file.read(), {'language': 'tam'})
            if ocr_response and 'text' in ocr_response:
                extracted_texts.append(clean_tamil_text(ocr_response['text']))

        final_news = " | ".join(list(dict.fromkeys(extracted_texts)))

        if final_news:
            table = catalyst_app.datastore().table('NewsTicker')
            table.insert_row({'ChannelName': channel_name, 'NewsContent': final_news})

        return jsonify({"status": "success", "news": final_news})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8080)))