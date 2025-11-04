const axios = require('axios');

module.exports = async (context, basicIO) => {
    try {
        console.log('🚀 Sherwin Function - Holiday Detection Started');
        
        // Get query parameters from the request
        const date = basicIO.getArgument('date') || new Date().toISOString().split('T')[0];
        const state = basicIO.getArgument('state');
        const district = basicIO.getArgument('district');
        
        console.log(`📍 Processing request for: ${date}, ${state}, ${district}`);
        
        // If no specific location provided, use default (Mumbai)
        const targetState = state || 'maharashtra';
        const targetDistrict = district || 'mumbai';
        
        // 1. Fetch weather data
        const weatherData = await fetchWeatherData(targetState, targetDistrict);
        
        // 2. Fetch news data (if API key available)
        const newsData = process.env.NEWSAPI_KEY ? 
            await fetchNewsData(targetState, targetDistrict) : [];
        
        // 3. Analyze and determine holiday status
        const analysis = analyzeHolidayStatus(weatherData, newsData, targetState, targetDistrict);
        
        // 4. Prepare comprehensive response
        const response = {
            success: true,
            request: {
                date: date,
                state: targetState,
                district: targetDistrict,
                location: formatLocationName(targetState, targetDistrict)
            },
            analysis: analysis,
            sources: {
                weather_api: "Open-Meteo",
                news_api: process.env.NEWSAPI_KEY ? "NewsAPI" : "Not configured"
            },
            timestamp: new Date().toISOString(),
            message: generateUserMessage(analysis, targetState, targetDistrict)
        };
        
        console.log('✅ Analysis completed:', response.message);
        
        // Send JSON response
        basicIO.setContentType('application/json');
        basicIO.write(JSON.stringify(response, null, 2));
        
    } catch (error) {
        console.error('❌ Error in sherwin_function:', error);
        
        // Error response
        basicIO.setContentType('application/json');
        basicIO.write(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            suggestion: "Please check your parameters and try again"
        }, null, 2));
    }
};

// Fetch weather data from Open-Meteo API
async function fetchWeatherData(state, district) {
    try {
        const coordinates = getCoordinates(state, district);
        
        console.log(`🌤️ Fetching weather for: ${district}, ${state} (${coordinates.lat}, ${coordinates.lng})`);
        
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast`,
            {
                params: {
                    latitude: coordinates.lat,
                    longitude: coordinates.lng,
                    current: 'temperature_2m,rain,precipitation,weather_code,wind_speed_10m',
                    daily: 'precipitation_sum,rain_sum,precipitation_probability_max,weather_code',
                    timezone: 'Asia/Kolkata',
                    forecast_days: 1
                },
                timeout: 8000
            }
        );
        
        console.log('✅ Weather data fetched successfully');
        return response.data;
        
    } catch (error) {
        console.error('❌ Error fetching weather data:', error.message);
        throw new Error(`Weather service unavailable: ${error.message}`);
    }
}

// Fetch news data from NewsAPI
async function fetchNewsData(state, district) {
    try {
        const newsApiKey = "22b49b37fbe245688e926e8cf00ab563";
        if (!newsApiKey) {
            console.log('📰 NewsAPI key not available, skipping news data');
            return [];
        }
        
        const displayDistrict = formatLocationName(null, district);
        const displayState = formatLocationName(state, null);
        
        const query = `rain flood "${displayDistrict}" "${displayState}" India holiday weather alert`;
        
        console.log(`📰 Searching news for: ${query}`);
        
        const response = await axios.get(
            `https://newsapi.org/v2/everything`,
            {
                params: {
                    q: query,
                    sortBy: 'publishedAt',
                    language: 'en',
                    pageSize: 5,
                    apiKey: newsApiKey
                },
                timeout: 8000
            }
        );
        
        const articles = response.data.articles || [];
        console.log(`✅ Found ${articles.length} news articles`);
        return articles;
        
    } catch (error) {
        console.error('❌ Error fetching news data:', error.message);
        // Don't throw error for news API failure, continue with weather data only
        return [];
    }
}

// Analyze data to determine holiday likelihood
function analyzeHolidayStatus(weatherData, newsData, state, district) {
    let confidence = 0;
    let isHoliday = false;
    const reasons = [];
    let primaryReason = 'Normal weather conditions';
    let severity = 'low';
    
    // Analyze current weather conditions
    if (weatherData && weatherData.current) {
        const current = weatherData.current;
        const rain = current.rain || 0;
        const precipitation = current.precipitation || 0;
        const weatherCode = current.weather_code || 0;
        
        console.log(`🔍 Weather analysis - Rain: ${rain}mm, Precip: ${precipitation}mm, Code: ${weatherCode}`);
        
        // Heavy rain indicator (primary factor)
        if (rain > 15) {
            confidence += 75;
            reasons.push(`Heavy rainfall (${rain}mm)`);
            severity = 'high';
        } else if (rain > 8) {
            confidence += 55;
            reasons.push(`Moderate rainfall (${rain}mm)`);
            severity = 'medium';
        } else if (rain > 3) {
            confidence += 35;
            reasons.push(`Light rainfall (${rain}mm)`);
            severity = 'low';
        }
        
        // Weather code analysis (based on WMO codes)
        if (weatherCode >= 95 && weatherCode <= 99) {
            // Thunderstorm codes
            confidence += 40;
            reasons.push(`Thunderstorm activity detected`);
            severity = 'high';
        } else if (weatherCode >= 80 && weatherCode < 95) {
            // Precipitation codes
            confidence += 25;
            reasons.push(`Significant precipitation`);
            severity = Math.max(severity, 'medium');
        }
        
        // Wind speed consideration
        const windSpeed = current.wind_speed_10m || 0;
        if (windSpeed > 50) {
            confidence += 20;
            reasons.push(`High winds (${windSpeed} km/h)`);
            severity = Math.max(severity, 'medium');
        }
    }
    
    // Analyze daily forecast
    if (weatherData && weatherData.daily) {
        const daily = weatherData.daily;
        const maxPrecipProb = daily.precipitation_probability_max?.[0] || 0;
        const totalRain = daily.rain_sum?.[0] || 0;
        
        if (maxPrecipProb > 90) {
            confidence += 25;
            reasons.push(`Very high rain probability (${maxPrecipProb}%)`);
        } else if (maxPrecipProb > 70) {
            confidence += 15;
            reasons.push(`High rain probability (${maxPrecipProb}%)`);
        }
        
        if (totalRain > 20) {
            confidence += 30;
            reasons.push(`Expected heavy rain (${totalRain}mm)`);
            severity = 'high';
        }
    }
    
    // Analyze news data
    if (newsData && newsData.length > 0) {
        const relevantKeywords = ['holiday', 'rain', 'flood', 'alert', 'warning', 'school', 'college', 'office', 'close', 'shutdown'];
        let relevantArticleCount = 0;
        let highRelevanceCount = 0;
        
        newsData.forEach(article => {
            const title = article.title?.toLowerCase() || '';
            const content = article.description?.toLowerCase() || '';
            const text = title + ' ' + content;
            
            const keywordMatches = relevantKeywords.filter(keyword => 
                text.includes(keyword)
            ).length;
            
            if (keywordMatches >= 3) {
                highRelevanceCount++;
                relevantArticleCount++;
            } else if (keywordMatches >= 2) {
                relevantArticleCount++;
            }
        });
        
        if (highRelevanceCount > 0) {
            const newsConfidence = Math.min(40, highRelevanceCount * 20);
            confidence += newsConfidence;
            reasons.push(`Strong news indicators (${highRelevanceCount} highly relevant articles)`);
            severity = Math.max(severity, 'high');
        } else if (relevantArticleCount > 0) {
            const newsConfidence = Math.min(25, relevantArticleCount * 10);
            confidence += newsConfidence;
            reasons.push(`News reports (${relevantArticleCount} relevant articles)`);
            severity = Math.max(severity, 'medium');
        }
    }
    
    // Determine final holiday status with thresholds
    confidence = Math.min(100, Math.max(0, confidence));
    
    if (confidence >= 70) {
        isHoliday = true;
        primaryReason = reasons[0] || 'Severe weather conditions';
    } else if (confidence >= 45) {
        // Moderate confidence - contextual decision
        isHoliday = confidence > 60; // Higher threshold for moderate range
        primaryReason = `Uncertain: ${reasons[0] || 'Mixed conditions'}`;
        severity = 'medium';
    } else {
        isHoliday = false;
        primaryReason = 'Normal weather conditions';
        confidence = 100 - confidence; // Invert for normal conditions confidence
        severity = 'low';
    }
    
    return {
        isHoliday: isHoliday,
        confidence: Math.round(confidence),
        primaryReason: primaryReason,
        allReasons: reasons,
        severity: severity,
        factorsConsidered: {
            weather_data: !!weatherData,
            news_articles: newsData.length,
            location: formatLocationName(state, district)
        },
        recommendation: isHoliday ? 
            'High likelihood of holiday declaration' :
            'No holiday expected'
    };
}

// Helper function to get coordinates for Indian locations
function getCoordinates(state, district) {
    const coordinateMap = {
        // Maharashtra
        'mumbai': { lat: 19.0760, lng: 72.8777 },
        'pune': { lat: 18.5204, lng: 73.8567 },
        'nagpur': { lat: 21.1458, lng: 79.0882 },
        'thane': { lat: 19.2183, lng: 72.9781 },
        'nashik': { lat: 20.0059, lng: 73.7910 },
        
        // Karnataka
        'bengaluru': { lat: 12.9716, lng: 77.5946 },
        'mysuru': { lat: 12.2958, lng: 76.6394 },
        'mangaluru': { lat: 12.9141, lng: 74.8560 },
        
        // Tamil Nadu
        'chennai': { lat: 13.0827, lng: 80.2707 },
        'coimbatore': { lat: 11.0168, lng: 76.9558 },
        'madurai': { lat: 9.9252, lng: 78.1198 },
        
        // Kerala
        'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
        'kochi': { lat: 9.9312, lng: 76.2673 },
        'kozhikode': { lat: 11.2588, lng: 75.7804 },
        
        // Gujarat
        'ahmedabad': { lat: 23.0225, lng: 72.5714 },
        'surat': { lat: 21.1702, lng: 72.8311 },
        'vadodara': { lat: 22.3072, lng: 73.1812 },
        
        // West Bengal
        'kolkata': { lat: 22.5726, lng: 88.3639 },
        'howrah': { lat: 22.5958, lng: 88.2636 },
        'durgapur': { lat: 23.5204, lng: 87.3119 },
        
        // Default state capitals
        'maharashtra': { lat: 19.0760, lng: 72.8777 },
        'karnataka': { lat: 12.9716, lng: 77.5946 },
        'tamil-nadu': { lat: 13.0827, lng: 80.2707 },
        'kerala': { lat: 8.5241, lng: 76.9366 },
        'gujarat': { lat: 23.0225, lng: 72.5714 },
        'west-bengal': { lat: 22.5726, lng: 88.3639 },
        'delhi': { lat: 28.6139, lng: 77.2090 },
        'rajasthan': { lat: 26.9124, lng: 75.7873 }
    };
    
    // Try district first, then state, then default to Mumbai
    return coordinateMap[district] || coordinateMap[state] || { lat: 19.0760, lng: 72.8777 };
}

// Format location names for display
function formatLocationName(state, district) {
    if (state && district) {
        const formattedState = state.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        const formattedDistrict = district.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        return `${formattedDistrict}, ${formattedState}`;
    } else if (state) {
        return state.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    } else if (district) {
        return district.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    return 'Mumbai, Maharashtra';
}

// Generate user-friendly message
function generateUserMessage(analysis, state, district) {
    const location = formatLocationName(state, district);
    
    if (analysis.isHoliday) {
        return `🚨 HIGH LIKELIHOOD: Holiday may be declared in ${location} due to ${analysis.primaryReason}. Confidence: ${analysis.confidence}%`;
    } else {
        return `✅ NORMAL: No holiday expected in ${location}. ${analysis.primaryReason}. Confidence: ${analysis.confidence}%`;
    }
}