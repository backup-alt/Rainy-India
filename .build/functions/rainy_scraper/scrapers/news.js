const axios = require('axios');
const cheerio = require('cheerio'); 
const { FLAT_LIST, DISTRICTS_BY_STATE } = require('../utils/districts'); 
require('dotenv').config(); 

const API_KEY = process.env.NEWS_API_KEY;

// --- CONFIGURATION ---
const SCOPE_REGEX = /(school|college|university|educational institution|class|student)/i;

// POSITIVE ACTIONS (Must exist)
const ACTION_REGEX = /(closed|holiday|shut|suspend|postpone|deferred|non-working|declare|ordered to close)/i;

// NEGATIVE ACTIONS (Instant Reject)
// If sentence says "Open", "Normal", "Resumed" -> KILL IT.
const NEGATIVE_REGEX = /(open|resume|normal|function as usual|no holiday|working day|regular class)/i;

const AUTHORITY_REGEX = /(collector|magistrate|dm|official|government|administration|order|registrar|education department|declared|announced)/i;
const REASON_REGEX = /(rain|flood|cyclone|monsoon|downpour|red alert|orange alert|weather|waterlogging|incessant|heavy rainfall|martyrdom|shaheedi)/i; 

const IGNORE_REGEX = /(hybrid|online|virtual|partial|bus|transport|traffic|bank|market|court|lawyer|parliament|assembly|election|vote|protest|strike)/i;

// --- ROBUST DEEP SCRAPER ---
async function fetchFullArticleText(url) {
    try {
        const response = await axios.get(url, {
            timeout: 5000, 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        $('script, style, nav, footer, header, .ad').remove();
        return $('p').slice(0, 20).map((i, el) => $(el).text().trim()).get().join(' . ');
    } catch (error) {
        return "";
    }
}

async function getNews(fromDate, toDate) {
    if (!fromDate) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        fromDate = d.toISOString().split('T')[0];
    }
    console.log(`📰 Fetching STRICT Holiday News (${fromDate})...`);

    try {
        // Query: "Schools" AND ("Closed" OR "Holiday")
        // We remove "India" to broaden search, then filter for Indian cities manually
        const query = '(school OR college OR holiday) AND (closed OR shut OR declared)';
        
        const response = await axios.get('https://newsapi.org/v2/everything', {
            headers: { 'X-Api-Key': API_KEY },
            params: {
                q: query, 
                language: 'en',
                from: fromDate,
                to: toDate,
                sortBy: 'publishedAt',
                pageSize: 100 
            }
        });

        const cleanNews = [];
        const processedIds = new Set();

        for (const article of response.data.articles) {
            // 1. Base Text
            let fullText = `${article.title} . ${article.description}`;
            
            // 2. Intelligent Deep Scrape
            // If snippet has "Holiday" but NO location, dig deeper.
            const hasHoliday = (fullText.toLowerCase().includes('closed') || fullText.toLowerCase().includes('holiday'));
            const hasLocation = FLAT_LIST.some(loc => fullText.toLowerCase().includes(loc.toLowerCase()));
            
            if (hasHoliday && !hasLocation) {
                 const deepText = await fetchFullArticleText(article.url);
                 if (deepText) fullText += " . " + deepText;
            }

            // 3. Analyze Sentences
            const sentences = fullText.toLowerCase().replace(/(\r\n|\n|\r)/gm, " ").split(/[.!?]/); 
            let previousSentenceWasHit = false; 

            sentences.forEach(sentence => {
                if (sentence.length < 15) return; 
                
                // A. NEGATIVE FILTER (The "Normal Operations" Killer)
                if (IGNORE_REGEX.test(sentence) || NEGATIVE_REGEX.test(sentence)) {
                    previousSentenceWasHit = false;
                    return; 
                }

                // B. Find Locations
                const foundLocations = FLAT_LIST.filter(area => {
                    const cityRegex = new RegExp(`\\b${area}\\b`, 'i');
                    return cityRegex.test(sentence);
                });

                if (foundLocations.length === 0) return; 

                // C. Hierarchy Filter (Drop State if Child exists)
                const finalLocations = foundLocations.filter(loc => {
                    if (DISTRICTS_BY_STATE[loc]) { 
                        const childDistricts = DISTRICTS_BY_STATE[loc];
                        return !foundLocations.some(otherLoc => childDistricts.includes(otherLoc));
                    }
                    return true; 
                });

                if (finalLocations.length === 0) return;

                // D. Scorecard
                let score = 0;
                let hasValidator = false; 

                if (SCOPE_REGEX.test(sentence)) score++;
                if (ACTION_REGEX.test(sentence)) score++;

                if (AUTHORITY_REGEX.test(sentence) || REASON_REGEX.test(sentence)) {
                    score++;
                    hasValidator = true;
                }

                // E. Final Verdict
                const isStrongMatch = (score >= 3 && hasValidator);
                const isContextMatch = (previousSentenceWasHit && score >= 1); 

                if (isStrongMatch || isContextMatch) {
                    finalLocations.forEach(city => {
                        const uniqueId = `${article.url}_${city}`;
                        
                        // Double Check: Ensure we aren't saving a whole state unless necessary
                        // If city is a State, we accept it ONLY if we found NO other districts in the whole article
                        // (This prevents the "Generic Tamil Nadu" row when deep scrape failed)
                        
                        if (!processedIds.has(uniqueId)) {
                            console.log(`   🏆 [Verified] ${city}`);
                            
                            cleanNews.push({
                                city: city,
                                state: 'General',
                                title: article.title,
                                description: sentence.trim().substring(0, 250),
                                url: article.url,
                                source: article.source.name,
                                publishedAt: article.publishedAt 
                            });
                            
                            processedIds.add(uniqueId);
                        }
                    });
                    previousSentenceWasHit = true;
                } else {
                    previousSentenceWasHit = false;
                }
            });
        }

        return cleanNews;

    } catch (error) {
        console.error(`❌ API Error: ${error.message}`);
        return [];
    }
}

module.exports = { getNews };