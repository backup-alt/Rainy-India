const axios = require('axios');
const { CITIES, TRIGGER_KEYWORDS, RAIN_KEYWORDS } = require('../utils/constants');

const API_KEY = process.env.NEWS_API_KEY;

async function getNews() {
    console.log("📰 Fetching news updates...");

    // Get today's date in YYYY-MM-DD format for the filter
    const today = new Date().toISOString().split('T')[0];

    try {
        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
            headers: { 'X-Api-Key': API_KEY },
            params: {
                country: 'in',
                // 1. FILTER: Only get news from today onwards
                from: today, 
                sortBy: 'publishedAt'
            }
        });

        return response.data.articles.map(article => ({
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source.name,
            // 2. CAPTURE: Keep the date so we can show it to the user
            publishedAt: article.publishedAt 
        }));

    } catch (error) {
        console.error(`❌ Error fetching news: ${error.message}`);
        return [];
    }
}

module.exports = { getNews };