// Main Application Logic

class RainyIndiaApp {
    constructor() {
        this.updates = [];
        this.stats = null;
        this.filters = {
            state: '',
            region: '',
            minConfidence: 0
        };
        this.isRefreshing = false;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Rainy India App starting...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial data load
        await this.loadData();
        
        // Setup auto-refresh (every 5 minutes)
        setInterval(() => {
            this.loadData();
        }, 5 * 60 * 1000);
        
        Components.hideLoading();
        console.log('✅ App ready!');
    }
    
    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.handleRefresh();
        });
        
        // Retry button
        document.getElementById('retry-btn').addEventListener('click', () => {
            this.loadData();
        });
        
        // State filter
        document.getElementById('state-filter').addEventListener('change', (e) => {
            this.filters.state = e.target.value;
            this.loadUpdates();
        });
        
        // Region filter (debounced)
        let regionTimeout;
        document.getElementById('region-filter').addEventListener('input', (e) => {
            clearTimeout(regionTimeout);
            regionTimeout = setTimeout(() => {
                this.filters.region = e.target.value;
                this.loadUpdates();
            }, 300);
        });
        
        // Confidence filter
        document.getElementById('confidence-filter').addEventListener('change', (e) => {
            this.filters.minConfidence = parseInt(e.target.value);
            this.loadUpdates();
        });
    }
    
    async loadData() {
        try {
            await Promise.all([
                this.loadUpdates(),
                this.loadStats()
            ]);
        } catch (error) {
            console.error('Failed to load data:', error);
            Components.showErrorState('Failed to load updates. Please try again.');
        }
    }
    
    async loadUpdates() {
        try {
            const response = await API.getUpdates(this.filters);
            
            if (response.success) {
                this.updates = response.updates || [];
                this.renderUpdates();
            } else {
                throw new Error('Failed to fetch updates');
            }
        } catch (error) {
            console.error('Load updates error:', error);
            Components.showErrorState(error.message);
        }
    }
    
    async loadStats() {
        try {
            const response = await API.getStats();
            
            if (response.success) {
                this.stats = response.stats;
                Components.updateStats(this.stats);
                
                // Populate state filter with available states
                const states = Object.keys(this.stats.byState || {}).sort();
                Components.populateStateFilter(states);
            }
        } catch (error) {
            console.error('Load stats error:', error);
        }
    }
    
    renderUpdates() {
        const container = document.getElementById('updates-container');
        const countElement = document.getElementById('updates-count');
        
        // Clear existing updates
        container.innerHTML = '';
        
        if (this.updates.length === 0) {
            Components.showEmptyState();
            countElement.textContent = 'No updates found';
            return;
        }
        
        Components.showUpdates();
        
        // Update count
        const count = this.updates.length;
        countElement.textContent = `${count} Update${count !== 1 ? 's' : ''} Found`;
        
        // Render update cards
        this.updates.forEach(update => {
            const card = Components.createUpdateCard(update);
            container.appendChild(card);
        });
    }
    
    async handleRefresh() {
        if (this.isRefreshing) return;
        
        this.isRefreshing = true;
        const btn = document.getElementById('refresh-btn');
        const btnText = btn.querySelector('.btn-text');
        const originalText = btnText.textContent;
        
        btnText.textContent = 'Refreshing...';
        btn.disabled = true;
        
        try {
            // Trigger scraping
            await API.triggerScrape();
            
            // Wait a bit for scraping to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Reload data
            await this.loadData();
            
            Components.showNotification('Updates refreshed successfully!', 'success');
        } catch (error) {
            console.error('Refresh error:', error);
            Components.showNotification('Refresh failed. Please try again.', 'error');
        } finally {
            btnText.textContent = originalText;
            btn.disabled = false;
            this.isRefreshing = false;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RainyIndiaApp();
});