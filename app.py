import os
from flask import Flask, request, jsonify
from zcatalyst_sdk import catalyst

app = Flask(__name__)

@app.route('/signals', methods=['POST'])
def handle_signal():
    try:
        # Initialize Zoho SDK
        catalyst_app = catalyst.initialize(request)
        vision = catalyst_app.vision()
        datastore = catalyst_app.datastore()
        
        # Get the individual JPG frame
        image_file = request.files.get('file')
        channel_name = request.args.get('channel', 'Unknown')
        
        if not image_file:
            return jsonify({"status": "error", "message": "No image received"}), 400

        # OCR: Process this single frame for Tamil text
        image_content = image_file.read()
        ocr_response = vision.ocr(image_content, {'language': 'tam'})
        
        final_text = ""
        if ocr_response and 'text' in ocr_response:
            final_text = ocr_response['text'].strip()

        # Save to DataStore if meaningful text is found
        if len(final_text) > 5:
            table = datastore.table('NewsTicker')
            table.insert_row({
                'ChannelName': channel_name,
                'NewsContent': final_text
            })
            print(f"✅ Saved News from {channel_name}: {final_text[:30]}...")

        return jsonify({"status": "received"}), 200

    except Exception as e:
        print(f"❌ Zoho Logic Error: {str(e)}")
        return jsonify({"status": "error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8080)))