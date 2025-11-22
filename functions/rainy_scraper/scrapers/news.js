const axios = require('axios');
const API_KEY = process.env.NEWS_API_KEY;

const TARGET_CITIES = [
    'Mumbai', 'Delhi', 'Kolkata', 'Kochi', 
    'Hyderabad', 'Chennai', 'Bengaluru', 'Thiruvananthapuram'
];

// STRICT FILTER: The article MUST contain one of these "Shut Down" words
const IMPACT_KEYWORDS = [
    'school', 'college', 'university', 'educational institution',
    'closed', 'holiday', 'shut', 'suspend', 'deferred', 'postpone',
    'red alert' // Red alerts almost always result in holidays
];

// It must ALSO contain one of these (so we don't get "Bank Holiday" or "Festival")
const WEATHER_CONTEXT = [
    'rain', 'flood', 'downpour', 'monsoon', 'cyclone', 'weather', 'waterlogging', 'incessant'
];

async function getNews() {
    console.log("📰 Fetching STRICT Rain Holiday news (Last 30 Days)...");

    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - 29); 
    const fromDate = dateObj.toISOString().split('T')[0]; 

    try {
        // QUERY: (Rain OR Flood) AND (School OR Holiday OR Closed)
        // This ensures the API only sends us relevant combos
        const query = '(rain OR flood OR cyclone OR weather) AND (school OR college OR holiday OR closed)';

        const response = await axios.get('https://newsapi.org/v2/everything', {
            headers: { 'X-Api-Key': API_KEY },
            params: {
                q: query, 
                language: 'en',
                from: fromDate,
                sortBy: 'relevancy', 
                pageSize: 100 
            }
        });

        const relevantNews = response.data.articles.map(article => {
            const text = (article.title + " " + article.description).toLowerCase();
            
            // 1. Check City
            const detectedCity = TARGET_CITIES.find(city => text.includes(city.toLowerCase()));
            if (!detectedCity) return null;

            // 2. Check for IMPACT (Schools, Closed, Holiday)
            const hasImpact = IMPACT_KEYWORDS.some(k => text.includes(k));
            
            // 3. Check for WEATHER (Rain, Flood) - ensuring it's not a "Festival Holiday"
            const hasWeather = WEATHER_CONTEXT.some(k => text.includes(k));

            // MUST HAVE BOTH to be a "Rain Holiday"
            if (!hasImpact || !hasWeather) return null;

            return {
                city: detectedCity,
                state: 'General',
                title: article.title,
                description: article.description,
                url: article.url,
                source: article.source.name,
                publishedAt: article.publishedAt 
            };
        });

        const cleanNews = relevantNews.filter(n => n !== null);
        console.log(`Found ${cleanNews.length} confirmed holiday updates.`);
        return cleanNews;

    } catch (error) {
        console.error(`❌ Error fetching news: ${error.message}`);
        return [];
    }
}

module.exports = { getNews };