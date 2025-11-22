const { HEAVY_RAIN_THRESHOLD_MM } = require('./constants');

function processData(weatherData, newsData) {
    console.log('🧠 Processing Holiday Data...');
    const updates = {};

    // 1. Digest Weather Data
    weatherData.forEach(w => {
        if (!updates[w.city]) updates[w.city] = createEmptyUpdate(w.city, w.state);
        updates[w.city].weather = w;
        if (w.rainMm > 20) updates[w.city].confidence += 20; 
    });

    // 2. Digest News Data
    newsData.forEach(n => {
        if (!updates[n.city]) updates[n.city] = createEmptyUpdate(n.city, n.state);

        // Add Source
        const sourceExists = updates[n.city].sources.some(s => s.name === n.source);
        if (!sourceExists) {
            updates[n.city].sources.push({
                name: n.source,
                url: n.url,
                title: n.title,
                date: n.publishedAt
            });
        }
        
        // INTELLIGENT UPDATE:
        // Since 'news.js' now ONLY passes Holiday news, we treat this as High Priority.
        updates[n.city].confidence = 95; // Almost certain
        updates[n.city].reason = "News confirms School/Holiday impact";

        // Update content to latest headline
        const currentLatest = updates[n.city].latestNewsDate;
        if (!currentLatest || (n.publishedAt && new Date(n.publishedAt) > new Date(currentLatest))) {
            updates[n.city].title = n.title;
            updates[n.city].content = n.description;
            updates[n.city].latestNewsDate = n.publishedAt;
        }
    });

    // 3. Finalize
    return Object.values(updates).map(u => {
        // Only save if we have High Confidence (News) OR Extreme Rain
        const isActionable = u.confidence > 50 || (u.weather && u.weather.rainMm > 50);
        
        if (!isActionable) return null; // Discard boring days

        u.confidence = Math.min(u.confidence, 100);
        const today = new Date().toISOString().split('T')[0];
        u.update_id = `${u.city.toLowerCase()}_${today}`;
        delete u.latestNewsDate; 
        return u;
    }).filter(u => u !== null); // Remove nulls
}

function createEmptyUpdate(city, state) {
    return {
        city,
        state,
        title: `Weather Update: ${city}`,
        content: '',
        sources: [],
        confidence: 0,
        weather: null,
        timestamp: new Date().toISOString()
    };
}

module.exports = { processData };