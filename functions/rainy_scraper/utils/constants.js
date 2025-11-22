module.exports = {
    // Major cities to track (Lat/Lon helps with Weather API accuracy)
    CITIES: [
        { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
        { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
        { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
        { name: 'Delhi', state: 'Delhi', lat: 28.7041, lon: 77.1025 },
        { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867 },
        { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
        { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lon: 76.9366 },
        { name: 'Kochi', state: 'Kerala', lat: 9.9312, lon: 76.2673 }
    ],
    
    // Keywords to look for in news titles
    TRIGGER_KEYWORDS: ['school', 'college', 'holiday', 'closed', 'shut', 'suspend', 'leave', 'red alert', 'orange alert'],
    RAIN_KEYWORDS: ['rain', 'downpour', 'waterlogging', 'flood', 'weather'],
    
    // Thresholds
    HEAVY_RAIN_THRESHOLD_MM: 50, // mm of rain in last 24h to consider "Heavy"
    CONFIDENCE_THRESHOLD: 70 // Display updates above this score
};