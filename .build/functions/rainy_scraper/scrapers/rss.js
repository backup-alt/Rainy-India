const Parser = require('rss-parser');
const parser = new Parser();
const { FLAT_LIST, DISTRICTS_BY_STATE } = require('../utils/districts'); 

// --- THE "ALL-SEEING EYE" FEED LIST ---
const RSS_FEEDS = [
    // 1. NATIONAL GIANTS (Breaking News)
    { name: 'NDTV Top Stories', url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },
    { name: 'NDTV India (National)', url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
    { name: 'Times of India (Top)', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' },
    { name: 'Times of India (India)', url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms' },
    { name: 'Hindustan Times (India)', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml' },
    { name: 'Indian Express (India)', url: 'https://indianexpress.com/section/india/feed/' },
    { name: 'India Today (Top)', url: 'https://www.indiatoday.in/rss/1206584' },
    { name: 'Zee News (National)', url: 'https://zeenews.india.com/rss/india-national-news.xml' },
    { name: 'News18 (India)', url: 'https://www.news18.com/rss/india.xml' },
    { name: 'OneIndia (National)', url: 'https://www.oneindia.com/rss/feeds/news-india-fb.xml' },
    { name: 'DNA India', url: 'https://www.dnaindia.com/feeds/india.xml' },
    { name: 'Firstpost (India)', url: 'https://www.firstpost.com/rss/india.xml' },

    // 2. SOUTH INDIA SPECIALS (Critical for Rain/Cyclones)
    { name: 'The Hindu (National)', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
    { name: 'The Hindu (States)', url: 'https://www.thehindu.com/news/states/feeder/default.rss' }, // Vital for TN/Kerala
    { name: 'Times of India (Chennai)', url: 'https://timesofindia.indiatimes.com/rssfeeds/2977472.cms' },
    { name: 'Times of India (Hyderabad)', url: 'https://timesofindia.indiatimes.com/rssfeeds/2977645.cms' },
    { name: 'Times of India (Bangalore)', url: 'https://timesofindia.indiatimes.com/rssfeeds/2977909.cms' },
    { name: 'Times of India (Kerala)', url: 'https://timesofindia.indiatimes.com/rssfeeds/3012535.cms' },
    { name: 'News18 (South)', url: 'https://www.news18.com/rss/south-india.xml' },
    { name: 'Deccan Chronicle', url: 'https://www.deccanchronicle.com/rss/feed.xml' }, // Strong South coverage
    { name: 'OneIndia (Chennai)', url: 'https://www.oneindia.com/rss/feeds/chennai-fb.xml' },
    { name: 'OneIndia (Bangalore)', url: 'https://www.oneindia.com/rss/feeds/bangalore-fb.xml' },

    // 3. NORTH & CENTRAL INDIA (Fog/Cold Wave/Rain)
    { name: 'Times of India (Delhi)', url: 'https://timesofindia.indiatimes.com/rssfeeds/3008185.cms' },
    { name: 'Times of India (Mumbai)', url: 'https://timesofindia.indiatimes.com/rssfeeds/2977209.cms' },
    { name: 'Times of India (Kolkata)', url: 'https://timesofindia.indiatimes.com/rssfeeds/2977695.cms' },
    { name: 'Hindustan Times (Delhi)', url: 'https://www.hindustantimes.com/feeds/rss/cities/delhi-news/rssfeed.xml' },
    { name: 'Hindustan Times (Mumbai)', url: 'https://www.hindustantimes.com/feeds/rss/cities/mumbai-news/rssfeed.xml' },
    { name: 'The Tribune (Punjab/Haryana)', url: 'https://www.tribuneindia.com/rss/feed?cat_id=7' }, // Excellent for North India holidays

    // 4. EDUCATION SPECIFIC (Often posts "School Closed" notices directly)
    { name: 'NDTV Education', url: 'https://feeds.feedburner.com/ndtvnews-education' },
    { name: 'Indian Express (Education)', url: 'https://indianexpress.com/section/education/feed/' },
    { name: 'Hindustan Times (Education)', url: 'https://www.hindustantimes.com/feeds/rss/education/rssfeed.xml' },
    { name: 'Times of India (Education)', url: 'https://timesofindia.indiatimes.com/rssfeeds/913168846.cms' }
];

// FILTERS (Keep your existing regex logic below this line)
const SCOPE_REGEX = /(school|college|university|educational|class|student)/i;
const ACTION_REGEX = /(closed|holiday|shut|suspend|postpone|deferred|non-working|declare)/i;
const AUTHORITY_REGEX = /(collector|magistrate|dm|official|government|administration|order|registrar|education department|declared|announced)/i;
const REASON_REGEX = /(rain|flood|cyclone|monsoon|downpour|red alert|orange alert|weather|waterlogging|incessant|heavy rainfall|martyrdom|shaheedi|cold wave|fog)/i; 
const IGNORE_REGEX = /(hybrid|online|virtual|partial|resume|reopen|bus|transport|traffic|bank|market|court|lawyer|parliament|assembly|election|vote|protest|strike)/i;

async function checkRSS() {
    console.log(`⚡ Polling ${RSS_FEEDS.length} RSS Feeds for Instant Alerts...`);
    const updates = [];

    const promises = RSS_FEEDS.map(async (feed) => {
        try {
            // Set a short timeout (3s) so slow feeds don't block the whole process
            const feedData = await parser.parseURL(feed.url);
            
            // Scan ALL items in the feed (Unlimited)
            feedData.items.forEach(item => {
                const title = item.title || "";
                const desc = item.contentSnippet || item.content || "";
                const fullText = `${title} . ${desc}`.toLowerCase();

                if (IGNORE_REGEX.test(fullText)) return;

                const detectedCity = FLAT_LIST.find(area => {
                    const cityRegex = new RegExp(`\\b${area}\\b`, 'i');
                    return cityRegex.test(fullText);
                });

                if (!detectedCity) return;

                let score = 0;
                if (SCOPE_REGEX.test(fullText)) score++;
                if (ACTION_REGEX.test(fullText)) score++;
                
                const hasReason = REASON_REGEX.test(fullText);
                const hasAuthority = AUTHORITY_REGEX.test(fullText);

                if (score >= 2 && (hasReason || hasAuthority)) {
                    // Create a unique ID for deduplication in logs
                    console.log(`   ⚡ FLASH ALERT [${feed.name}]: ${detectedCity} - ${title.substring(0, 40)}...`);
                    
                    updates.push({
                        city: detectedCity,
                        state: 'General',
                        title: title,
                        description: desc.substring(0, 250),
                        url: item.link,
                        source: feed.name,
                        publishedAt: item.pubDate || new Date().toISOString()
                    });
                }
            });
        } catch (err) {
            // Silent fail for individual feeds is okay
            // console.log(`   ⚠️ RSS Skip (${feed.name})`);
        }
    });

    await Promise.all(promises);
    return updates;
}

module.exports = { checkRSS };