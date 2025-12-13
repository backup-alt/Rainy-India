# 1. Use the official Node.js 18 lightweight image
FROM node:18-slim

# 2. Install System Dependencies (Chrome + Tesseract + Tamil Data)
# We add the Google Chrome signing key and repository
# Then we install Chrome, Tesseract OCR, and the Tamil Language Pack (tesseract-ocr-tam)
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y \
       google-chrome-stable \
       tesseract-ocr \
       tesseract-ocr-tam \
       fonts-ipafont-gothic \
       fonts-wqy-zenhei \
       fonts-thai-tlwg \
       fonts-kacst \
       fonts-freefont-ttf \
       fonts-indic \
       libxss1 \
       --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Create the App Directory inside the container
WORKDIR /usr/src/app

# 4. Copy package definitions first (Optimizes build cache)
COPY package*.json ./

# 5. Install Node.js dependencies
RUN npm install

# 6. Copy the rest of your bot's code
COPY . .

# 7. Start the Bot
CMD [ "npm", "start" ]