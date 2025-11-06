// API client for communicating with Catalyst backend
class API {
    static baseURL = '/server'; // Catalyst functions are served from /server

    static async getUpdates(filters = {}) {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            
            if (filters.state) params.append('state', filters.state);
            if (filters.region) params.append('region', filters.region);
            if (filters.minConfidence) params.append('minConfidence', filters.minConfidence);
            
            const response = await fetch(`${this.baseURL}/api_handler/updates?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch updates');
            }
            
            // Transform data to match frontend expectations
            return data.updates.map(update => ({
                id: update.id,
                title: update.title,
                content: update.content,
                region: update.region,
                state: update.state,
                reason: update.reason,
                sources: update.sources || [],
                sourceCount: update.sourceCount || update.sources?.length || 0,
                confidence: update.confidence,
                timestamp: update.timestamp,
                isHoliday: update.confidence >= 70 // Assume high confidence means holiday likely
            }));
        } catch (error) {
            console.error('API Error fetching updates:', error);
            throw new Error('Failed to fetch updates. Please try again.');
        }
    }

    static async checkHolidayStatus(date, state, district) {
        try {
            // This would call your main scraper function
            const response = await fetch(`${this.baseURL}/rainy_scraper?date=${date}&state=${state}&district=${district}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to check holiday status');
            }
            
            // Transform response to match frontend expectations
            return {
                success: true,
                request: {
                    date: date,
                    state: state,
                    district: district
                },
                analysis: {
                    isHoliday: data.isHoliday || false,
                    confidence: data.confidence || 0,
                    primaryReason: data.reason || 'Unknown',
                    allReasons: [data.reason || 'Unknown']
                },
                timestamp: data.timestamp || new Date().toISOString()
            };
            
        } catch (error) {
            console.error('API Error checking holiday status:', error);
            throw new Error('Failed to check holiday status. Please try again.');
        }
    }

    static async getStats() {
        try {
            const response = await fetch(`${this.baseURL}/api_handler/stats`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch statistics');
            }
            
            return data.stats;
        } catch (error) {
            console.error('API Error fetching stats:', error);
            throw new Error('Failed to fetch statistics.');
        }
    }

    static async getUpdateById(id) {
        try {
            const response = await fetch(`${this.baseURL}/api_handler/updates/${id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch update');
            }
            
            return data.update;
        } catch (error) {
            console.error('API Error fetching update:', error);
            throw new Error('Failed to fetch update details.');
        }
    }

    static async triggerScrape() {
        try {
            const response = await fetch(`${this.baseURL}/api_handler/scrape`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to trigger scrape');
            }
            
            return data;
        } catch (error) {
            console.error('API Error triggering scrape:', error);
            throw new Error('Failed to trigger data update.');
        }
    }

    static async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/api_handler/health`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success && data.status === 'healthy';
        } catch (error) {
            console.error('API Health check failed:', error);
            return false;
        }
    }
}