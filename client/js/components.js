// UI Components
class Components {
    static createUpdateCard(update) {
        const card = document.createElement('div');
        card.className = 'update-card';
        
        const confidenceClass = this.getConfidenceClass(update.confidence);
        const statusIcon = update.isHoliday ? '🚨' : '✅';
        const statusText = update.isHoliday ? 'Holiday Likely' : 'No Holiday';
        
        card.innerHTML = `
            <div class="update-header">
                <div class="update-location">
                    <div class="update-region">${statusIcon} ${this.formatText(update.region)}</div>
                    <div class="update-state">${this.formatText(update.state)} • ${statusText}</div>
                </div>
                <div class="confidence-badge ${confidenceClass}">
                    ${update.confidence}%
                </div>
            </div>
            
            <div class="update-content">
                <p>${update.content || update.title}</p>
                ${update.reason ? `
                    <div class="update-reason">
                        <strong>Reason:</strong>
                        <span>${update.reason}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="update-footer">
                <div class="update-time">
                    <i class="fas fa-clock"></i>
                    ${this.formatTime(update.timestamp)}
                </div>
                <div class="update-sources">
                    ${update.sources && update.sources.length > 0 ? 
                        update.sources.map(source => 
                            `<span class="source-tag">${this.formatSource(source)}</span>`
                        ).join('') : 
                        '<span class="source-tag">Multiple Sources</span>'
                    }
                    ${update.sourceCount > 1 ? `<span class="source-tag">${update.sourceCount} sources</span>` : ''}
                </div>
            </div>
        `;
        
        return card;
    }

    static createStatusCard(result) {
        const isHoliday = result.analysis?.isHoliday || false;
        const confidence = result.analysis?.confidence || 0;
        const reason = result.analysis?.primaryReason || 'No specific reason provided';
        
        const statusClass = isHoliday ? 'status-holiday' : 'status-no-holiday';
        const statusIcon = isHoliday ? '🚨' : '✅';
        const statusTitle = isHoliday ? 'Holiday Likely' : 'No Holiday';
        const statusDescription = isHoliday ? 
            'Based on current data, there is a high likelihood of holiday declaration.' :
            'No holiday declaration expected based on current conditions.';
        
        return `
            <div class="status-card ${statusClass}">
                <div class="status-icon">${statusIcon}</div>
                <div class="status-title">${statusTitle}</div>
                <div class="status-confidence">Confidence: ${confidence}%</div>
                <div class="status-description">${statusDescription}</div>
                <div class="status-reason">
                    <strong>Primary Factor:</strong> ${reason}
                </div>
                <div class="status-details">
                    <p><strong>Location:</strong> ${this.formatText(result.request?.district)}, ${this.formatText(result.request?.state)}</p>
                    <p><strong>Date:</strong> ${result.request?.date}</p>
                    <p><strong>Last Updated:</strong> ${this.formatTime(result.timestamp)}</p>
                </div>
                ${isHoliday ? `
                    <div class="status-alert">
                        <i class="fas fa-exclamation-triangle"></i>
                        Please verify with local authorities for official confirmation.
                    </div>
                ` : ''}
            </div>
        `;
    }

    static getConfidenceClass(confidence) {
        if (confidence >= 80) return 'confidence-high';
        if (confidence >= 60) return 'confidence-medium';
        return 'confidence-low';
    }

    static formatText(text) {
        if (!text) return 'Unknown';
        return text.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    static formatSource(source) {
        if (!source) return 'Unknown';
        
        // Format common source names
        const sourceMap = {
            'imd': 'IMD',
            'news': 'News',
            'twitter': 'Twitter',
            'government': 'Govt',
            'weather': 'Weather'
        };
        
        return sourceMap[source.toLowerCase()] || 
               source.charAt(0).toUpperCase() + source.slice(1);
    }

    static formatTime(timestamp) {
        if (!timestamp) return 'Just now';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}