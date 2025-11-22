const axios = require('axios');

// CHANGE THIS LINE:
const API_KEY = process.env.OPENWEATHER_API_KEY; 

const cities = [ 'Mumbai', 'Delhi', 'Kolkata', 'Kochi', 'Hyderabad', 'Chennai', 'Bengaluru', 'Thiruvananthapuram' ];

async function getWeather() {
    console.log("🌤️ Fetching weather data...");
    
    // We use Promise.all to fetch all cities at the same time (faster)
    const requests = cities.map(city => 
        axios.get('https://api.openweathermap.org/data/2.5/weather', {
            params: {
                q: city,
                appid: API_KEY, // <--- This fixes the 401 error
                units: 'metric'
            }
        }).catch(err => {
            console.error(`❌ Error fetching weather for ${city}: ${err.message}`);
            return null; // Return null so one failure doesn't break everything
        })
    );

    const responses = await Promise.all(requests);

    // Filter out failed requests (nulls) and return clean data
    return responses
        .filter(response => response !== null)
        .map(res => ({
            city: res.data.name,
            temp: res.data.main.temp,
            condition: res.data.weather[0].main,
            description: res.data.weather[0].description
        }));
}

module.exports = { getWeather };