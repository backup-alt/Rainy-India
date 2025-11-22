const axios = require('axios');
const { CITIES, TRIGGER_KEYWORDS, RAIN_KEYWORDS } = require('../utils/constants');

const API_KEY = process.env.NEWS_API_KEY;

async function getNews() {
    console.log('📰 Fetching news updates...');
    const newsUpdates = [];

    // Construct a complex query to save API calls:
    // (Chennai OR Mumbai OR ...) AND (rain OR flood) AND (school OR holiday)
    const cityQuery = '(' + CITIES.map(c => c.name).join(' OR ') + ')';
    const rainQuery = '(' + RAIN_KEYWORDS.join(' OR ') + ')';
    const triggerQuery = '(' + TRIGGER_KEYWORDS.join(' OR ') + ')';
    
    const q = `${cityQuery} AND ${rainQuery} AND ${triggerQuery}`;

    try {
        // Sort by publishedAt to get latest news
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&apiKey=${API_KEY}`;
        
        const response = await axios.get(url);
        const articles = response.data.articles || [];

        // Process articles
        articles.forEach(article => {
            // Find which city this article is about
            const matchedCity = CITIES.find(c => 
                article.title.includes(c.name) || 
                (article.description && article.description.includes(c.name))
            );

            if (matchedCity) {
                newsUpdates.push({
                    city: matchedCity.name,
                    state: matchedCity.state,
                    title: article.title,
                    description: article.description,
                    source: article.source.name,
                    url: article.url,
                    timestamp: article.publishedAt
                });
            }
        });

    } catch (error) {
        console.error('❌ Error fetching news:', error.message);
    }

    return newsUpdates;
}

module.exports = { getNews };