import os
import time
import subprocess
import requests
import zipfile
import io
from flask import Flask
from threading import Thread

app = Flask(__name__)

# Render needs a web server to stay 'Live'
@app.route('/')
def home():
    return "News Monitor Bot is Active. Checking channels every 30 mins."

def capture_sequence():
    # List of channels to monitor
    CHANNELS = [
        {"name": "Thanthi", "id": "j1nzTy5q_1Y"},
        {"name": "Polimer", "id": "Ei6NUWLQCQM"},
        {"name": "SunNews", "id": "GNcDkMTBnx4"},
        {"name": "News18Tamil", "id": "WkUMroKX7_c"}
    ]
    
    # Get the Zoho Digest from Environment Variables
    digest = os.getenv('ZOHO_DIGEST')
    if not digest:
        print("❌ ERROR: ZOHO_DIGEST environment variable not found!")
        return
        
    zoho_url = f"https://api.catalyst.zoho.in/signals/v2/event_notification?digest={digest}"

    while True:
        for ch in CHANNELS:
            print(f"🎬 Starting capture for {ch['name']}...")
            try:
                # 1. Get Stream URL (Force IPv4 for stability)
                url_cmd = f"yt-dlp --force-ipv4 -g https://www.youtube.com/watch?v={ch['id']}"
                stream_url = subprocess.check_output(url_cmd, shell=True).decode().strip()
                
                # 2. Capture 6 frames (1 frame every 2.5 seconds = 15s sequence)
                # This ensures we get the full ticker as it scrolls
                ffmpeg_cmd = (
                    f'ffmpeg -y -i "{stream_url}" '
                    f'-vf "fps=1/2.5,scale=800:-1,crop=800:100:0:380" '
                    f'-vframes 6 shot_%03d.jpg'
                )
                subprocess.run(ffmpeg_cmd, shell=True, timeout=60)
                
                # 3. Create ZIP in memory to save RAM
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'w') as zf:
                    for i in range(1, 7):
                        fname = f"shot_{i:03d}.jpg"
                        if os.path.exists(fname):
                            zf.write(fname)
                            os.remove(fname) # Delete individual file immediately
                
                # 4. Send ZIP to Zoho
                zip_buffer.seek(0)
                files = {'file': (f"{ch['name']}.zip", zip_buffer, 'application/zip')}
                # We send 'channel' as a header or param so Zoho knows which one it is
                response = requests.post(zoho_url, files=files, params={"channel": ch['name']}, timeout=30)
                
                if response.status_code == 200:
                    print(f"✅ Successfully sent {ch['name']} sequence to Zoho.")
                else:
                    print(f"⚠️ Zoho error for {ch['name']}: {response.text}")

            except Exception as e:
                print(f"❌ Critical Error on {ch['name']}: {e}")

        print("--- All channels checked. Sleeping for 30 minutes ---")
        time.sleep(1800)

if __name__ == "__main__":
    # Start the news capture thread
    monitor_thread = Thread(target=capture_sequence)
    monitor_thread.daemon = True
    monitor_thread.start()
    
    # Start the Flask web server
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
