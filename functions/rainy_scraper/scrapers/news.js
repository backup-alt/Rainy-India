const axios = require('axios');
require('dotenv').config(); 

const API_KEY = process.env.NEWS_API_KEY;

// --- CONFIGURATION ---

// 1. TARGET LOCATIONS
// Add any district/state you want to track here.
const TARGET_AREAS = [
    'Mumbai', 'Delhi', 'Kolkata', 'Kochi', 'Hyderabad', 'Chennai', 'Bengaluru', 
    'Thiruvananthapuram', 'Pune', 'Nagpur', 'Visakhapatnam', 'Vijayawada', 
    'Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Kerala', 'Karnataka', 'Bihar', 
    'Uttar Pradesh', 'Noida', 'Gurugram', 'Ghaziabad', 'Puducherry'
];

// 2. THE "EVIDENCE" KEYWORDS (Positive Matchers)
const SCOPE_REGEX = /(school|college|university|educational institution|class|student)/i;
const ACTION_REGEX = /(closed|holiday|shut|suspend|postpone|deferred|non-working|declare)/i;

// 3. THE "VALIDATORS" (Must have at least one to prove legitimacy)
const AUTHORITY_REGEX = /(collector|magistrate|dm|official|government|administration|order|registrar|education department|declared|announced)/i;
const REASON_REGEX = /(rain|flood|cyclone|monsoon|downpour|red alert|orange alert|weather|waterlogging|incessant|heavy rainfall)/i;

// 4. THE "BLOCKLIST" (Negative Matchers - Instant Reject)
// Stops "Online classes", "Bank holidays", "Traffic diversions", "Stock Market"
const IGNORE_REGEX = /(hybrid|online|virtual|partial|resume|reopen|bus|transport|traffic|bank|market|court|lawyer|parliament|assembly|election|vote)/i;

async function getNews() {
    console.log("📰 Fetching Verified Holiday News (Strict Mode)...");

    // Standard 30-Day Window (Rolling)
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - 29); 
    const fromDate = dateObj.toISOString().split('T')[0]; 

    try {
        // QUERY STRATEGY: Broad net, strict filter.
        const query = 'India AND (school OR college OR holiday) AND (closed OR shut OR declared)';

        const response = await axios.get('https://newsapi.org/v2/everything', {
            headers: { 'X-Api-Key': API_KEY },
            params: {
                q: query, 
                language: 'en',
                from: fromDate,
                sortBy: 'publishedAt', // Newest first
                pageSize: 100 
            }
        });

        const cleanNews = [];
        const seenUrls = new Set(); // To duplicate avoid URLs

        response.data.articles.forEach(article => {
            if (seenUrls.has(article.url)) return;

            // Combine title and description for analysis
            const fullText = (article.title + ". " + article.description).toLowerCase();
            
            // CRITICAL STEP: Split into sentences.
            // We never judge a keyword in Sentence A based on a keyword in Sentence B.
            const sentences = fullText.split(/[.!?\n]/);
            let articleSaved = false;

            sentences.forEach(sentence => {
                if (articleSaved) return;
                
                // STEP A: The "Negative Filter" (The Bouncer)
                // If it mentions "Online", "Bank", or "Traffic", it's gone.
                if (IGNORE_REGEX.test(sentence)) return; 

                // STEP B: The "Scorecard"
                let score = 0;
                let hasValidator = false; 

                // 1. LOCATION (+1)
                const detectedCity = TARGET_AREAS.find(area => sentence.includes(area.toLowerCase()));
                if (detectedCity) score++;
                else return; // No city in this sentence? Ignore it.

                // 2. SCOPE (+1) -> "Schools"
                if (SCOPE_REGEX.test(sentence)) score++;

                // 3. ACTION (+1) -> "Closed"
                if (ACTION_REGEX.test(sentence)) score++;

                // 4. VALIDATOR CHECK (+1) 
                // Checks for "Collector", "Government", "Rain", or "Red Alert"
                if (AUTHORITY_REGEX.test(sentence) || REASON_REGEX.test(sentence)) {
                    score++;
                    hasValidator = true;
                }

                // STEP C: The Final Verdict
                // Rule 1: Score must be >= 3 (e.g. City + Scope + Action)
                // Rule 2: MUST have a Validator (Authority OR Reason)
                
                if (score >= 3 && hasValidator) {
                    console.log(`   🏆 [Verified] ${detectedCity}: "${sentence.trim().substring(0, 60)}..."`);
                    
                    cleanNews.push({
                        city: detectedCity,
                        state: 'General',
                        title: article.title,
                        description: sentence.trim(), // Use the PROOF sentence
                        url: article.url,
                        source: article.source.name,
                        publishedAt: article.publishedAt 
                    });
                    
                    seenUrls.add(article.url);
                    articleSaved = true;
                }
            });
        });

        console.log(`   ✅ Found ${cleanNews.length} evidence-backed updates.`);
        return cleanNews;

    } catch (error) {
        console.error(`❌ Error fetching news: ${error.message}`);
        return [];
    }
}

module.exports = { getNews };