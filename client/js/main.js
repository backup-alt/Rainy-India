// Main application logic
class RainyIndiaApp {
    constructor() {
        this.currentUpdates = [];
        this.filteredUpdates = [];
        this.stats = null;
        this.states = [];
        this.districts = {};
        this.init();
    }

    async init() {
        // Set today's date as default
        this.setDefaultDate();
        
        // Load states data
        await this.loadStatesData();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Check API health
        const isHealthy = await API.healthCheck();
        if (!isHealthy) {
            this.showErrorState('API service is temporarily unavailable. Please try again later.');
            this.hideLoadingScreen();
            return;
        }
        
        // Load initial data
        await this.loadInitialData();
        
        // Hide loading screen, show app
        this.hideLoadingScreen();
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('search-date').value = today;
    }

    async loadStatesData() {
        try {
            // Load states from your data or use default Indian states
            this.states = [
                { id: 'maharashtra', name: 'Maharashtra' },
                { id: 'karnataka', name: 'Karnataka' },
                { id: 'tamil-nadu', name: 'Tamil Nadu' },
                { id: 'kerala', name: 'Kerala' },
                { id: 'gujarat', name: 'Gujarat' },
                { id: 'west-bengal', name: 'West Bengal' },
                { id: 'delhi', name: 'Delhi' },
                { id: 'rajasthan', name: 'Rajasthan' },
                { id: 'uttar-pradesh', name: 'Uttar Pradesh' },
                { id: 'andhra-pradesh', name: 'Andhra Pradesh' }
            ];

            this.districts = {
                'maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad'],
                'karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi'],
                'tamil-nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
                'kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
                'gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
                'west-bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol'],
                'delhi': ['New Delhi', 'Central Delhi', 'North Delhi', 'South Delhi', 'East Delhi'],
                'rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
                'uttar-pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj'],
                'andhra-pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool']
            };

            this.populateStateSelects();
        } catch (error) {
            console.error('Error loading states data:', error);
        }
    }

    populateStateSelects() {
        const searchStateSelect = document.getElementById('search-state');
        const filterStateSelect = document.getElementById('state-filter');

        // Clear existing options except the first one
        while (searchStateSelect.options.length > 1) searchStateSelect.remove(1);
        while (filterStateSelect.options.length > 1) filterStateSelect.remove(1);

        this.states.forEach(state => {
            // For search select
            const searchOption = document.createElement('option');
            searchOption.value = state.id;
            searchOption.textContent = state.name;
            searchStateSelect.appendChild(searchOption);

            // For filter select
            const filterOption = document.createElement('option');
            filterOption.value = state.id;
            filterOption.textContent = state.name;
            filterStateSelect.appendChild(filterOption);
        });
    }

    async loadInitialData() {
        try {
            // Load updates and stats in parallel
            const [updates, stats] = await Promise.all([
                API.getUpdates(),
                API.getStats()
            ]);
            
            this.currentUpdates = updates;
            this.stats = stats;
            
            this.filterUpdates();
            this.updateStats();
            this.hideUpdatesLoading();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showErrorState(error.message);
        }
    }

    initEventListeners() {
        // Search functionality
        document.getElementById('search-state').addEventListener('change', (e) => {
            this.handleStateChange(e.target.value);
        });

        document.getElementById('search-btn').addEventListener('click', () => {
            this.handleSearch();
        });

        document.getElementById('clear-search').addEventListener('click', () => {
            this.clearSearch();
        });

        // Filter functionality
        document.getElementById('state-filter').addEventListener('change', () => {
            this.filterUpdates();
        });

        document.getElementById('confidence-filter').addEventListener('change', () => {
            this.filterUpdates();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });

        // Retry button
        document.getElementById('retry-btn').addEventListener('click', () => {
            this.loadInitialData();
        });

        // Form validation
        document.getElementById('search-date').addEventListener('change', this.validateSearchForm.bind(this));
        document.getElementById('search-district').addEventListener('change', this.validateSearchForm.bind(this));
    }

    handleStateChange(stateId) {
        const districtSelect = document.getElementById('search-district');
        districtSelect.innerHTML = '<option value="">Select District</option>';
        districtSelect.disabled = true;

        if (stateId && this.districts[stateId]) {
            this.districts[stateId].forEach(district => {
                const option = document.createElement('option');
                option.value = district.toLowerCase();
                option.textContent = district;
                districtSelect.appendChild(option);
            });
            districtSelect.disabled = false;
        }

        this.validateSearchForm();
    }

    validateSearchForm() {
        const date = document.getElementById('search-date').value;
        const state = document.getElementById('search-state').value;
        const district = document.getElementById('search-district').value;
        const searchBtn = document.getElementById('search-btn');

        searchBtn.disabled = !(date && state && district);
    }

    async handleSearch() {
        const date = document.getElementById('search-date').value;
        const state = document.getElementById('search-state').value;
        const district = document.getElementById('search-district').value;

        try {
            this.showSearchLoading();
            
            const result = await API.checkHolidayStatus(date, state, district);
            
            this.displaySearchResult(result);
            this.showResultsSection();
        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError(error.message);
        } finally {
            this.hideSearchLoading();
        }
    }

    async refreshData() {
        try {
            this.showUpdatesLoading();
            
            // Trigger a new scrape and reload data
            await API.triggerScrape();
            
            // Wait a moment for scrape to complete, then reload
            setTimeout(async () => {
                await this.loadInitialData();
                this.showNotification('Data refreshed successfully!', 'success');
            }, 2000);
            
        } catch (error) {
            console.error('Refresh error:', error);
            this.showNotification('Failed to refresh data', 'error');
            this.hideUpdatesLoading();
        }
    }

    async loadUpdates() {
        try {
            this.showUpdatesLoading();
            
            const filters = {
                state: document.getElementById('state-filter').value,
                minConfidence: document.getElementById('confidence-filter').value
            };
            
            const updates = await API.getUpdates(filters);
            this.currentUpdates = updates;
            
            this.filterUpdates();
            this.hideUpdatesLoading();
        } catch (error) {
            console.error('Error loading updates:', error);
            this.showErrorState(error.message);
        }
    }

    filterUpdates() {
        const stateFilter = document.getElementById('state-filter').value;
        const confidenceFilter = parseInt(document.getElementById('confidence-filter').value);

        this.filteredUpdates = this.currentUpdates.filter(update => {
            const stateMatch = !stateFilter || update.state === stateFilter;
            const confidenceMatch = !confidenceFilter || update.confidence >= confidenceFilter;
            return stateMatch && confidenceMatch;
        });

        this.displayUpdates();
    }

    displayUpdates() {
        const container = document.getElementById('updates-container');
        const emptyState = document.getElementById('empty-state');

        if (this.filteredUpdates.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        emptyState.style.display = 'none';
        container.innerHTML = '';

        this.filteredUpdates.forEach(update => {
            const updateElement = Components.createUpdateCard(update);
            container.appendChild(updateElement);
        });
    }

    displaySearchResult(result) {
        const container = document.getElementById('results-container');
        container.innerHTML = Components.createStatusCard(result);
    }

    updateStats() {
        if (!this.stats) return;

        document.getElementById('total-updates').textContent = this.stats.totalUpdates;
        
        const activeAlerts = this.currentUpdates.filter(update => update.isHoliday).length;
        document.getElementById('active-alerts').textContent = activeAlerts;
        
        const uniqueStates = new Set(this.currentUpdates.map(update => update.state)).size;
        document.getElementById('states-affected').textContent = uniqueStates;
    }

    // UI State Management
    hideLoadingScreen() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }

    showSearchLoading() {
        const searchBtn = document.getElementById('search-btn');
        const originalText = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        searchBtn.disabled = true;
        
        // Store original content to restore later
        searchBtn.dataset.originalContent = originalText;
    }

    hideSearchLoading() {
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn.dataset.originalContent) {
            searchBtn.innerHTML = searchBtn.dataset.originalContent;
        }
        this.validateSearchForm();
    }

    showResultsSection() {
        document.getElementById('results-section').style.display = 'block';
        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    clearSearch() {
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('search-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('search-state').value = '';
        document.getElementById('search-district').value = '';
        document.getElementById('search-district').disabled = true;
        this.validateSearchForm();
    }

    showUpdatesLoading() {
        document.getElementById('updates-loading').style.display = 'block';
        document.getElementById('updates-container').style.display = 'none';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
    }

    hideUpdatesLoading() {
        document.getElementById('updates-loading').style.display = 'none';
    }

    showErrorState(message) {
        document.getElementById('updates-loading').style.display = 'none';
        document.getElementById('updates-container').style.display = 'none';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('error-message').textContent = message;
    }

    showSearchError(message) {
        const container = document.getElementById('results-container');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Search Failed</h3>
                <p>${message}</p>
            </div>
        `;
        this.showResultsSection();
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : 'info'}-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Add CSS for notifications
const notificationStyles = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RainyIndiaApp();
});