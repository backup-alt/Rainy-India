const axios = require('axios');
const catalyst = require('zcatalyst-sdk-node');
require('dotenv').config();

const API_KEY = process.env.NEWS_API_KEY;

// Cities to check
const TARGET_AREAS = [
    'Mumbai', 'Delhi', 'Kolkata', 'Kochi', 'Hyderabad', 'Chennai', 'Bengaluru', 
    'Thiruvananthapuram', 'Telangana', 'Bihar', 'Tamil Nadu'
];

module.exports = async (app) => {
    console.log("🔥 STARTING API LIMIT STRESS TEST (Past 6 Months)...");

    const datastore = app.datastore();
    const table = datastore.table('Updates');
    
    // We will try to fetch data for 6 distinct 30-day blocks
    for (let i = 0; i < 6; i++) {
        // Calculate the Date Window for this iteration
        const endDateObj = new Date();
        endDateObj.setDate(endDateObj.getDate() - (i * 30)); // e.g., Today, -30 days, -60 days
        
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - ((i + 1) * 30)); // e.g., -30 days, -60 days, -90 days

        const fromDate = startDateObj.toISOString().split('T')[0];
        const toDate = endDateObj.toISOString().split('T')[0];

        console.log(`\n📅 Testing Window ${i+1}: [${fromDate} to ${toDate}]`);

        try {
            const query = 'India AND (school OR college OR holiday) AND (closed OR shut OR declared)';

            const response = await axios.get('https://newsapi.org/v2/everything', {
                headers: { 'X-Api-Key': API_KEY },
                params: {
                    q: query,
                    language: 'en',
                    from: fromDate,
                    to: toDate,
                    sortBy: 'relevancy',
                    pageSize: 100
                }
            });

            const articles = response.data.articles;
            console.log(`   ✅ SUCCESS! Server returned ${articles.length} articles.`);

            // If we actually get data, let's process and save it
            if (articles.length > 0) {
                const validRows = [];
                
                articles.forEach(article => {
                    const text = (article.title + " " + article.description).toLowerCase();
                    
                    // Quick City Check
                    const detectedCity = TARGET_AREAS.find(area => text.includes(area.toLowerCase()));
                    if (!detectedCity) return;

                    // Quick Holiday Check
                    if (!text.includes('closed') && !text.includes('holiday')) return;

                    validRows.push({
                        update_id: `${detectedCity.toLowerCase()}_${article.publishedAt.split('T')[0]}`,
                        title: article.title,
                        content: article.description || "Historical News Record",
                        region: detectedCity,
                        state: 'General',
                        reason: 'Historical API Fetch',
                        news_date: article.publishedAt.replace('T', ' ').replace('Z', ''),
                        sources: JSON.stringify([{ name: article.source.name, date: article.publishedAt }]),
                        source_count: 1,
                        confidence: 100,
                        update_timestamp: new Date().toISOString(),
                        is_active: true
                    });
                });

                if (validRows.length > 0) {
                    console.log(`   💾 Saving ${validRows.length} valid updates to database...`);
                    // Note: This might fail if rows explicitly exist, but we try anyway
                    try { await table.insertRows(validRows); } catch (e) {} 
                }
            }

        } catch (error) {
            // THIS IS WHERE WE HIT THE WALL
            console.error(`   ❌ FAILED: ${error.message}`);
            if (error.response) {
                console.error(`   ⚠️ Server Message: ${error.response.data.message}`);
            }
        }
    }

    return { status: "Test Complete" };
};