const { HEAVY_RAIN_THRESHOLD_MM } = require('./constants');

// --- RULE-BASED BRAIN (No AI) ---
function deriveInsights(title, content) {
    const text = (title + " " + (content || "")).toLowerCase();
    
    // 1. Determine CATEGORY
    let category = "General";
    if (text.match(/(school|college|university|student|class|exam|educational)/)) {
        category = "Educational";
    } else if (text.match(/(bank|market|office|work|govt|government)/)) {
        category = "Public/Official";
    } else if (text.match(/(transport|bus|train|metro|flight)/)) {
        category = "Transportation";
    }

    // 2. Determine HOLIDAY TYPE
    let type = "Update"; 
    if (text.match(/(rain|flood|cyclone|alert|downpour|heavy|waterlogging|weather|monsoon)/)) {
        type = "⚠️ Unexpected (Weather)";
    } else if (text.match(/(festival|diwali|pongal|eid|christmas|jayanti|republic|independence)/)) {
        type = "📅 Calendar Holiday";
    } else if (text.match(/(closed|shut|holiday|suspend|non-working)/)) {
        type = "⛔ Closure";
    }

    // 3. Clean Summary
    let summary = title;
    if (content) {
        summary = content
            .replace(/Read more.*/gi, "")
            .replace(/Click here.*/gi, "")
            .replace(/Live Updates.*/gi, "")
            .replace(/\.\.\./g, ".")
            .trim()
            .substring(0, 450);
    }

    return { category, type, summary };
}

function processData(weatherData, newsData) {
    console.log('🧠 Processing Data (Rule-Based)...');
    const updates = {}; 

    // 1. Weather
    if (weatherData && Array.isArray(weatherData)) {
        weatherData.forEach(w => {
            if (!updates[w.city]) updates[w.city] = createEmptyUpdate(w.city, w.state);
            updates[w.city].weather = w;
            if (w.rainMm > 20) updates[w.city].confidence += 20; 
        });
    }

    // 2. News
    if (newsData && Array.isArray(newsData)) {
        newsData.forEach(n => {
            if (!updates[n.city]) updates[n.city] = createEmptyUpdate(n.city, n.state);

            const sourceExists = updates[n.city].sources.some(s => s.name === n.source);
            if (!sourceExists) {
                updates[n.city].sources.push({
                    name: n.source,
                    url: n.url,
                    title: n.title,
                    date: n.publishedAt
                });
            }
            
            updates[n.city].confidence = 95;
            updates[n.city].reason = "News confirms School/Holiday impact";

            const currentLatest = updates[n.city].latestNewsDate;
            if (!currentLatest || (n.publishedAt && new Date(n.publishedAt) > new Date(currentLatest))) {
                updates[n.city].title = n.title;
                updates[n.city].content = n.description;
                updates[n.city].latestNewsDate = n.publishedAt;
            }
        });
    }

    // 3. Finalize
    return Object.values(updates).map(u => {
        const isActionable = u.confidence > 50 || (u.weather && u.weather.rainMm > 50);
        if (!isActionable) return null;

        u.confidence = Math.min(u.confidence, 100);
        const today = new Date().toISOString().split('T')[0];
        u.update_id = `${u.city.toLowerCase()}_${today}`;
        
        // Date Formatting
        let dateObj = new Date(); 
        if (u.latestNewsDate) dateObj = new Date(u.latestNewsDate);
        
        // Safe SQL Format: YYYY-MM-DD HH:MM:SS
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        const ss = String(dateObj.getSeconds()).padStart(2, '0');
        u.news_date = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        delete u.latestNewsDate; 

        // Run Rules
        const insights = deriveInsights(u.title, u.content);
        u.category = insights.category;
        u.holiday_type = insights.type;
        u.summary = insights.summary;

        return u;
    }).filter(u => u !== null);
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