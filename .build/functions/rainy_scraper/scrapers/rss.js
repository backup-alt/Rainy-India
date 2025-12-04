const Parser = require('rss-parser');
const parser = new Parser();
const { FLAT_LIST, DISTRICTS_BY_STATE } = require('../utils/districts'); 

// 1. THE "FAST LANE" SOURCES
// These are the direct RSS feeds for breaking news in India
const RSS_FEEDS = [
    { name: 'Times of India (Top)', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' },
    { name: 'Times of India (South)', url: 'https://timesofindia.indiatimes.com/rssfeeds/2950623.cms' }, // South India specific
    { name: 'NDTV News', url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },
    { name: 'India Today', url: 'https://www.indiatoday.in/rss/1206578' },
    { name: 'The Hindu', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
    { name: 'Zee News', url: 'https://zeenews.india.com/rss/india-national-news.xml' },
    { name: 'News18 India', url: 'https://www.news18.com/rss/india.xml' }
];

// 2. THE STRICT FILTERS (Same as News.js)
const SCOPE_REGEX = /(school|college|university|educational|class|student)/i;
const ACTION_REGEX = /(closed|holiday|shut|suspend|postpone|deferred|non-working|declare)/i;
const AUTHORITY_REGEX = /(collector|magistrate|dm|official|government|administration|order|registrar|education department|declared|announced)/i;
const REASON_REGEX = /(rain|flood|cyclone|monsoon|downpour|red alert|orange alert|weather|waterlogging|incessant|heavy rainfall)/i; 
const IGNORE_REGEX = /(hybrid|online|virtual|partial|resume|reopen|bus|transport|traffic|bank|market|court|lawyer|parliament|assembly|election|vote|protest|strike)/i;

async function checkRSS() {
    console.log("⚡ Polling RSS Feeds for Instant Alerts...");
    const updates = [];

    // We process feeds in parallel because they are fast/free
    const promises = RSS_FEEDS.map(async (feed) => {
        try {
            const feedData = await parser.parseURL(feed.url);
            
            // Scan the top 10 items from each feed
            feedData.items.slice(0, 10).forEach(item => {
                const title = item.title || "";
                const desc = item.contentSnippet || item.content || "";
                const fullText = `${title} . ${desc}`.toLowerCase();

                // A. Negative Filter
                if (IGNORE_REGEX.test(fullText)) return;

                // B. Location Check
                // We use the same district list to find where this is happening
                const detectedCity = FLAT_LIST.find(area => {
                    const cityRegex = new RegExp(`\\b${area}\\b`, 'i');
                    return cityRegex.test(fullText);
                });

                if (!detectedCity) return;

                // C. Scorecard (Simplified for RSS)
                // RSS headlines are short, so we are slightly more lenient but still safe
                let score = 0;
                if (SCOPE_REGEX.test(fullText)) score++;
                if (ACTION_REGEX.test(fullText)) score++;
                
                const hasReason = REASON_REGEX.test(fullText);
                const hasAuthority = AUTHORITY_REGEX.test(fullText);

                // RULE: Must have (School + Closed) AND (Rain OR Authority)
                if (score >= 2 && (hasReason || hasAuthority)) {
                    console.log(`   ⚡ FLASH ALERT [${feed.name}]: ${detectedCity} - ${title.substring(0, 40)}...`);
                    
                    updates.push({
                        city: detectedCity,
                        state: 'General', // We could map this using DISTRICTS_BY_STATE if needed
                        title: title,
                        description: desc.substring(0, 250),
                        url: item.link,
                        source: feed.name,
                        publishedAt: item.pubDate || new Date().toISOString()
                    });
                }
            });
        } catch (err) {
            // RSS feeds sometimes timeout, just ignore and move to next
            // console.log(`   ⚠️ RSS Skip (${feed.name}): ${err.message}`);
        }
    });

    await Promise.all(promises);
    return updates;
}

module.exports = { checkRSS };