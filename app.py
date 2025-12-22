import os
import time
import subprocess
import requests
import zipfile
import io
from flask import Flask
from threading import Thread

app = Flask(__name__)

# Render needs this to keep the service 'Live'
@app.route('/')
def home():
    return "News Monitor is Online. Using Google Proxy for YouTube."

def get_stream_url(video_id):
    # ---------------------------------------------------------
    # 1. PASTE YOUR GOOGLE SCRIPT URL BELOW
    # ---------------------------------------------------------
    GAS_URL = "https://script.google.com/macros/s/AKfycbyIy4Op3k4XpQFvLl0NiCmcQauDP6C6mS0du10DQMh5YVITagFjlfgp26qyFMtULD7tOA/exec"
    
    try:
        print(f"📡 Asking Google for {video_id}...")
        # We allow redirects because Google Apps Script URLs always redirect
        response = requests.get(f"{GAS_URL}?id={video_id}", timeout=25, allow_redirects=True)
        stream_link = response.text.strip()
        
        if "http" in stream_link:
            return stream_link
        else:
            print(f"⚠️ Google Proxy returned an error: {stream_link}")
            return None
    except Exception as e:
        print(f"❌ Connection to Google Proxy failed: {e}")
        return None

def capture_sequence():
    CHANNELS = [
        {"name": "Thanthi", "id": "j1nzTy5q_1Y"},
        {"name": "Polimer", "id": "Ei6NUWLQCQM"},
        {"name": "SunNews", "id": "GNcDkMTBnx4"},
        {"name": "News18Tamil", "id": "WkUMroKX7_c"}
    ]
    
    digest = os.getenv('ZOHO_DIGEST')
    zoho_url = f"https://api.catalyst.zoho.in/signals/v2/event_notification?digest={digest}"

    while True:
        for ch in CHANNELS:
            print(f"🎬 Processing {ch['name']}...")
            
            # Use the Google Proxy instead of yt-dlp
            stream_url = get_stream_url(ch['id'])
            
            if stream_url:
                try:
                    # Capture 6 frames (1 frame every 2.5s for 15s total)
                    ffmpeg_cmd = (
                        f'ffmpeg -y -i "{stream_url}" '
                        f'-vf "fps=1/2.5,scale=800:-1,crop=800:100:0:380" '
                        f'-vframes 6 shot_%03d.jpg'
                    )
                    subprocess.run(ffmpeg_cmd, shell=True, timeout=60)
                    
                    # Create ZIP in memory
                    zip_buffer = io.BytesIO()
                    with zipfile.ZipFile(zip_buffer, 'w') as zf:
                        for i in range(1, 7):
                            fname = f"shot_{i:03d}.jpg"
                            if os.path.exists(fname):
                                zf.write(fname)
                                os.remove(fname)
                    
                    # Send to Zoho
                    zip_buffer.seek(0)
                    files = {'file': (f"{ch['name']}.zip", zip_buffer, 'application/zip')}
                    requests.post(zoho_url, files=files, params={"channel": ch['name']}, timeout=30)
                    print(f"✅ {ch['name']} sequence sent to Zoho.")
                    
                except Exception as e:
                    print(f"❌ FFmpeg/Zoho Error for {ch['name']}: {e}")
            else:
                print(f"⏭️ Skipping {ch['name']} - No stream URL found.")

        print("--- All channels processed. Waiting 30 minutes ---")
        time.sleep(1800)

if __name__ == "__main__":
    # Start capture in the background
    Thread(target=capture_sequence, daemon=True).start()
    # Start web server on Render's assigned port
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
