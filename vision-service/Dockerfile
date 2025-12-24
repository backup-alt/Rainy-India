# 1. Use the official Node image
FROM node:18-slim

# 2. Install System Dependencies for Chrome & Tamil OCR
# We need these because Puppeteer doesn't include the OS-level libraries
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates \
    google-chrome-stable \
    tesseract-ocr \
    tesseract-ocr-tam \
    fonts-indic \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Setup the AppSail Environment
# Zoho AppSail mounts your code in /catalyst. We must work there.
WORKDIR /catalyst

# 4. Install Node Modules
COPY package*.json ./
# Skip downloading the bundled Chromium because we installed the stable version above
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true 
RUN npm install --production

# 5. Copy your code
COPY . .

# 6. Set Environment Variables
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PORT=9000

# 7. Start the bot
CMD ["node", "index.js"]