// API Client for Rainy India

// Get the API base URL from Catalyst
const API_BASE_URL = 'https://rainy-india-fkubkgqy.onslate.in';

// Helper function for API calls
async function fetchAPI(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// API Methods
const API = {
    // Get all updates with optional filters
    async getUpdates(filters = {}) {
        const params = new URLSearchParams();
        
        if (filters.state) params.append('state', filters.state);
        if (filters.region) params.append('region', filters.region);
        if (filters.minConfidence) params.append('minConfidence', filters.minConfidence);
        
        const query = params.toString();
        const endpoint = query ? `/updates?${query}` : '/updates';
        
        return await fetchAPI(endpoint);
    },
    
    // Get single update by ID
    async getUpdateById(id) {
        return await fetchAPI(`/updates/${id}`);
    },
    
    // Get statistics
    async getStats() {
        return await fetchAPI('/stats');
    },
    
    // Trigger manual scrape
    async triggerScrape() {
        return await fetchAPI('/scrape', {
            method: 'POST'
        });
    },
    
    // Health check
    async checkHealth() {
        return await fetchAPI('/health');
    }
};

// Export for use in other files
window.API = API;