// UI Components for Rainy India

const Components = {
    // Create an update card
    createUpdateCard(update) {
        const card = document.createElement('div');
        card.className = 'update-card';
        card.dataset.updateId = update.id;
        
        // Get confidence class
        const confidenceClass = update.confidence >= 90 ? 'confidence-high' :
                              update.confidence >= 75 ? 'confidence-medium' : 'confidence-low';
        
        const statusClass = update.confidence >= 90 ? 'status-high' :
                           update.confidence >= 75 ? 'status-medium' : 'status-low';
        
        // Format timestamp
        const timeAgo = this.formatTimeAgo(update.timestamp);
        
        card.innerHTML = `
            <div class="update-header">
                <div class="update-title-section">
                    <div class="update-location">
                        <div class="status-indicator ${statusClass}"></div>
                        <h3 class="update-region">${this.escapeHtml(update.region)}</h3>
                        <span class="update-state">• ${this.escapeHtml(update.state)}</span>
                    </div>
                    <h2 class="update-title">${this.escapeHtml(update.title)}</h2>
                </div>
                <div class="confidence-badge ${confidenceClass}">
                    ${update.confidence}% Sure
                </div>
            </div>
            
            ${update.content ? `
                <div class="update-content">
                    ${this.escapeHtml(update.content)}
                </div>
            ` : ''}
            
            ${update.reason ? `
                <div class="update-reason">
                    <strong>Reason:</strong> <span>${this.escapeHtml(update.reason)}</span>
                </div>
            ` : ''}
            
            <div class="update-sources">
                <span class="sources-label">
                    ${update.sourceCount || update.sources.length} Source${(update.sourceCount || update.sources.length) !== 1 ? 's' : ''}:
                </span>
                <div class="sources-list">
                    ${update.sources.map(source => `
                        <span class="source-tag">${this.escapeHtml(source.name)}</span>
                    `).join('')}
                </div>
            </div>
            
            <div class="update-footer">
                <span class="update-time">🕐 Updated ${timeAgo}</span>
                <div class="update-links">
                    ${update.sources.slice(0, 3).map(source => `
                        <a href="${this.escapeHtml(source.url)}" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="update-link">
                            ${this.escapeHtml(source.name)} →
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
        
        return card;
    },
    
    // Format timestamp to relative time
    formatTimeAgo(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    },
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Show loading state
    showLoading() {
        document.getElementById('loading-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    },
    
    // Hide loading state
    hideLoading() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    },
    
    // Show empty state
    showEmptyState() {
        document.getElementById('updates-container').style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';
        document.getElementById('error-state').style.display = 'none';
    },
    
    // Show error state
    showErrorState(message) {
        document.getElementById('updates-container').style.display = 'none';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('error-message').textContent = message;
    },
    
    // Show updates
    showUpdates() {
        document.getElementById('updates-container').style.display = 'flex';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
    },
    
    // Update stats display
    updateStats(stats) {
        document.getElementById('stat-total').textContent = stats.totalUpdates;
        document.getElementById('stat-high').textContent = stats.highConfidence;
        document.getElementById('stat-medium').textContent = stats.mediumConfidence;
        document.getElementById('stat-states').textContent = Object.keys(stats.byState || {}).length;
    },
    
    // Populate state filter
    populateStateFilter(states) {
        const select = document.getElementById('state-filter');
        select.innerHTML = '<option value="">All States</option>';
        
        states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            select.appendChild(option);
        });
    },
    
    // Show notification
    showNotification(message, type = 'info') {
        // Simple notification (can be enhanced with a toast library)
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};

// Export for use in other files
window.Components = Components;