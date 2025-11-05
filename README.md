# 🌧️ Rainy India - Live Leave & Holiday Tracker

Real-time tracking and verification of leave updates across India due to rain, natural disasters, or government orders.

## 🚀 Features

- **Multi-Source Verification**: Scrapes data from official weather agencies, news outlets, and government sites
- **Confidence Scoring**: AI-powered reliability scoring based on source credibility and cross-verification
- **Real-time Updates**: Automated scraping every 15 minutes
- **Regional Filtering**: Filter by state, city, or region
- **Proof Links**: Direct links to official sources for verification
- **Mobile Responsive**: Works seamlessly on all devices

## 📋 Prerequisites

- Zoho Catalyst account
- Catalyst CLI installed (`npm install -g zoho-catalyst-cli`)
- Node.js 16+ installed

## 🛠️ Setup Instructions

### 1. Initialize Catalyst Project

```bash
# Login to Catalyst
catalyst login

# Create new project
catalyst init

# Follow prompts and select "Web Application"
```

### 2. Configure Environment Variables

In Catalyst Console:
- Go to Settings > Environment Variables
- Add the following:
  - `NEWS_API_KEY` (optional - get from newsapi.org)
  - `OPENWEATHER_API_KEY` (optional - get from openweathermap.org)
  - `TWITTER_BEARER_TOKEN` (optional - for Twitter API)

### 3. Deploy Functions

```bash
# Deploy scraper function
cd functions/rainy_scraper
npm install
catalyst deploy

# Deploy API handler
cd ../api_handler
npm install
catalyst deploy

# Deploy cron function
cd ../cron_scraper
npm install
catalyst deploy
```

### 4. Create Data Store Table

```bash
# Create the Updates table
catalyst datastore:create-table --config datastore/updates_table.json
```

### 5. Setup Cron Job

```bash
# Create cron job
catalyst cron:create --config cron/scraper_schedule.json
```

### 6. Deploy Client

```bash
# Deploy static files
catalyst deploy --only client
```

### 7. Access Your App

```bash
# Get app URL
catalyst serve

# Or visit: https://your-project-id.development.catalystserverless.com
```

## 📁 Project Structure

```
rainy-india/
├── app/                    # App configuration
├── client/                 # Frontend (HTML, CSS, JS)
├── functions/              # Backend functions
│   ├── rainy_scraper/     # Main scraper
│   ├── api_handler/       # API endpoints
│   └── cron_scraper/      # Scheduled job
├── datastore/             # Database schemas
├── cron/                  # Cron configurations
└── catalyst.json          # Main config
```

## 🔧 Development

### Local Testing

```bash
# Start local development server
catalyst serve

# Test scrapers
catalyst function:execute rainy_scraper

# View logs
catalyst logs --function rainy_scraper
```

### Update Scrapers

Edit files in `functions/rainy_scraper/scrapers/`:
- `weather.js` - Weather data scraper
- `news.js` - News sources scraper
- `gov.js` - Government sites scraper

### Modify Frontend

Edit files in `client/`:
- `index.html` - Main HTML
- `css/style.css` - Styles
- `js/main.js` - App logic

## 📊 API Endpoints

- `GET /updates` - Get all updates (with filters)
- `GET /updates/:id` - Get single update
- `GET /stats` - Get statistics
- `POST /scrape` - Trigger manual scrape
- `GET /health` - Health check

## 🎯 Roadmap

- [ ] SMS/Email notifications
- [ ] PWA support for offline access
- [ ] Admin dashboard for manual verification
- [ ] Historical data analytics
- [ ] Predictive alerts using ML

## 📝 License

MIT License - feel free to use for any purpose

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Contact: your.email@example.com

---

Built with ❤️ using Zoho Catalyst