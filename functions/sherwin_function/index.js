const axios = require('axios');
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (context, basicIO) => {
    try {
        // Initialize Catalyst SDK
        const app = catalyst.initialize(context);
        
        // Get query parameters
        const date = basicIO.getArgument('date');
        const state = basicIO.getArgument('state');
        const district = basicIO.getArgument('district');
        
        console.log(`Fetching updates for: ${date}, ${state}, ${district}`);
        
        // Fetch weather data from external API
        const weatherData = await fetchWeatherData(state, district);
        
        // Fetch news data
        const newsData = await fetchNewsData(state, district);
        
        // Analyze data to determine holiday status
        const updates = await analyzeHolidayStatus(weatherData, newsData, state, district);
        
        // Store in Data Store
        await storeUpdates(app, updates);
        
        // Return response
        basicIO.write(JSON.stringify({
            success: true,
            date: date,
            state: state,
            district: district,
            updates: updates,
            timestamp: new Date().toISOString()
        }));
        
    } catch (error) {
        console.error('Error in sherwin_function:', error);
        basicIO.write(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }));
    }
};

// Fetch weather data from external API
async function fetchWeatherData(state, district) {
    try {
        // Using Open-Meteo API for weather data
        // In production, you would use IMD API or similar
        const coordinates = getCoordinates(state, district);
        
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lng}&current=rain,precipitation,weather_code&daily=precipitation_sum,rain_sum&timezone=auto`
        );
        
        return response.data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}

// Fetch news data
async function fetchNewsData(state, district) {
    try {
        // Using NewsAPI for relevant news
        // Note: You need to set NEWSAPI_KEY in environment variables
        const NEWSAPI_KEY = "22b49b37fbe245688e926e8cf00ab563";
        
        if (!NEWSAPI_KEY) {
            console.warn('NEWSAPI_KEY not set, skipping news data');
            return [];
        }
        
        const query = `rain flood "${district}" "${state}" India holiday`;
        const response = await axios.get(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&apiKey=${newsApiKey}`
        );
        
        return response.data.articles || [];
    } catch (error) {
        console.error('Error fetching news data:', error);
        return [];
    }
}

// Analyze data to determine holiday status
async function analyzeHolidayStatus(weatherData, newsData, state, district) {
    const updates = [];
    let confidence = 0;
    let isHoliday = false;
    let reason = 'Normal conditions';
    let proofUrl = null;
    
    // Analyze weather data
    if (weatherData && weatherData.current) {
        const currentRain = weatherData.current.rain || 0;
        const currentPrecip = weatherData.current.precipitation || 0;
        
        if (currentRain > 5 || currentPrecip > 10) {
            confidence += 60;
            isHoliday = true;
            reason = `Heavy rainfall (${currentRain}mm) detected`;
            proofUrl = 'https://mausam.imd.gov.in/';
        }
    }
    
    // Analyze news data
    const relevantArticles = newsData.filter(article => 
        article.title.toLowerCase().includes('holiday') || 
        article.title.toLowerCase().includes('rain') ||
        article.title.toLowerCase().includes('flood')
    );
    
    if (relevantArticles.length > 0) {
        confidence += Math.min(40, relevantArticles.length * 10);
        isHoliday = true;
        reason = `News reports indicate weather-related disruptions (${relevantArticles.length} articles)`;
        proofUrl = relevantArticles[0].url;
    }
    
    // Cap confidence at 100%
    confidence = Math.min(100, confidence);
    
    // If no significant data found, assume normal conditions
    if (confidence < 50) {
        isHoliday = false;
        reason = 'Normal weather conditions';
        confidence = 100 - confidence; // Invert confidence for normal conditions
    }
    
    updates.push({
        region: `${district}, ${state}`,
        isHoliday: isHoliday,
        reason: reason,
        confidence: confidence,
        proof_url: proofUrl,
        timestamp: new Date().toISOString()
    });
    
    return updates;
}

// Store updates in Catalyst Data Store
async function storeUpdates(app, updates) {
    try {
        const datastore = app.datastore();
        const table = datastore.table('holiday_updates');
        
        for (const update of updates) {
            await table.insertRow(update);
        }
        
        console.log('Successfully stored updates in Data Store');
    } catch (error) {
        console.error('Error storing updates in Data Store:', error);
    }
}

// Helper function to get coordinates for a location
function getCoordinates(state, district) {
    // Simple coordinate mapping - in production, use a geocoding service
    const coordinatesMap = {
        'maharashtra': { lat: 19.0760, lng: 72.8777 },
        'karnataka': { lat: 12.9716, lng: 77.5946 },
        'tamil-nadu': { lat: 13.0827, lng: 80.2707 },
        'kerala': { lat: 8.5241, lng: 76.9366 },
        'gujarat': { lat: 23.0225, lng: 72.5714 },
        'west-bengal': { lat: 22.5726, lng: 88.3639 }
    };
    
    return coordinatesMap[state] || { lat: 20.5937, lng: 78.9629 }; // Default to India center
}