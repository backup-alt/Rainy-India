# 1. Use the official Node.js 18 lightweight image
FROM node:18-slim

# 2. Install System Dependencies (Chrome + Tesseract + Tamil Data)
USER root
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    --no-install-recommends

# Add Google Chrome's official repository and key
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

# Install Chrome, Tesseract OCR, and Tamil Language Pack
RUN apt-get update && apt-get install -y \
    google-chrome-stable \
    tesseract-ocr \
    tesseract-ocr-tam \
    fonts-indic \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Create the App Directory
WORKDIR /usr/src/app

# 4. Copy package definitions
COPY package*.json ./

# 5. Install Node.js dependencies
RUN npm install

# 6. Copy the rest of your bot's code
COPY . .

# 7. Start the Bot
CMD [ "node", "index.js" ]