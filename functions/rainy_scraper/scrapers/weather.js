const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.OPENWEATHER_API_KEY;

// Now accepts a list of cities dynamically
async function getWeather(targetCities) {
    if (!targetCities || targetCities.length === 0) {
        console.log("🌤️ No cities to check for weather.");
        return [];
    }

    console.log(`🌤️ Fetching weather for ${targetCities.length} affected districts...`);
    
    // De-duplicate the list
    const uniqueCities = [...new Set(targetCities)];

    const requests = uniqueCities.map(city => 
        axios.get('https://api.openweathermap.org/data/2.5/weather', {
            params: {
                q: city,
                appid: API_KEY,
                units: 'metric'
            }
        }).then(res => ({
            city: city, // Keep original name
            temp: res.data.main.temp,
            condition: res.data.weather[0].main,
            description: res.data.weather[0].description,
            rainMm: (res.data.rain && res.data.rain['1h']) ? res.data.rain['1h'] : 0
        })).catch(err => {
            console.error(`   ❌ Weather fetch failed for ${city}: ${err.message}`);
            return null;
        })
    );

    const responses = await Promise.all(requests);
    return responses.filter(r => r !== null);
}

module.exports = { getWeather };