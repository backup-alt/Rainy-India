const { HEAVY_RAIN_THRESHOLD_MM } = require('./constants');

function processData(weatherData, newsData) {
    console.log('🧠 Processing data and calculating confidence...');
    const updates = {};

    // 1. Digest Weather Data
    weatherData.forEach(w => {
        if (!updates[w.city]) {
            updates[w.city] = createEmptyUpdate(w.city, w.state);
        }
        updates[w.city].weather = w;
        
        // Base confidence from heavy rain
        if (w.rainMm > 5) updates[w.city].confidence += 20; // Moderate rain
        if (w.rainMm > 20) updates[w.city].confidence += 20; // Heavy rain
    });

    // 2. Digest News Data
    newsData.forEach(n => {
        if (!updates[n.city]) {
            updates[n.city] = createEmptyUpdate(n.city, n.state);
        }

        // Check if we already have this source for this city (avoid duplicate counting)
        const sourceExists = updates[n.city].sources.some(s => s.name === n.source);
        
        if (!sourceExists) {
            updates[n.city].sources.push({
                name: n.source,
                url: n.url,
                title: n.title
            });
            
            // YOUR LOGIC: Increase confidence for every distinct news source
            updates[n.city].confidence += 30;
        }
        
        // Update title/content to the latest news headline
        updates[n.city].title = n.title;
        updates[n.city].content = n.description;
    });

    // 3. Finalize Updates
    return Object.values(updates).map(u => {
        // LOGIC: If 2 or more news sources, boost confidence to High (at least 85)
        if (u.sources.length >= 2) {
            u.confidence = Math.max(u.confidence, 85);
            u.reason = `${u.sources.length} news sources confirmed holiday`;
        } else if (u.weather && u.weather.rainMm > 0) {
            u.reason = `Heavy rain detected (${u.weather.condition})`;
        } else {
            u.reason = "News report detected";
        }

        // Cap confidence at 100
        u.confidence = Math.min(u.confidence, 100);

        // Create a unique ID based on date and city
        const today = new Date().toISOString().split('T')[0];
        u.update_id = `${u.city.toLowerCase()}_${today}`;

        return u;
    });
}

function createEmptyUpdate(city, state) {
    return {
        city,
        state,
        title: `Status Update for ${city}`,
        content: '',
        sources: [],
        confidence: 0,
        weather: null,
        timestamp: new Date().toISOString()
    };
}

module.exports = { processData };