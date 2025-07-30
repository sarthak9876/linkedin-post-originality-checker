// LinkedIn Originality Checker - Popup Script
class PopupController {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadStats();
        this.setupEventListeners();
        this.checkCurrentPage();
    }

    async loadSettings() {
        const result = await chrome.storage.sync.get(['enabled']);
        const enableToggle = document.getElementById('enableToggle');
        
        // Set initial state - default to enabled if not set
        const isEnabled = result.enabled !== false;
        if (isEnabled) {
            enableToggle.classList.add('active');
        } else {
            enableToggle.classList.remove('active');
        }
        
        // Update storage with initial state
        await chrome.storage.sync.set({ enabled: isEnabled });
    }

    async loadStats() {
        const result = await chrome.storage.local.get(['stats']);
        const stats = result.stats || {
            checkedToday: 0,
            duplicatesFound: 0,
            lastReset: new Date().toDateString()
        };

        // Reset daily stats if it's a new day
        if (stats.lastReset !== new Date().toDateString()) {
            stats.checkedToday = 0;
            stats.lastReset = new Date().toDateString();
            await chrome.storage.local.set({ stats });
        }

        document.getElementById('checkedToday').textContent = stats.checkedToday;
        document.getElementById('duplicatesFound').textContent = stats.duplicatesFound;
    }

    async checkCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const pageStatus = document.getElementById('pageStatus');
            
            if (tab.url.includes('linkedin.com')) {
                pageStatus.textContent = 'LinkedIn ✓';
                pageStatus.style.color = '#057642';
            } else {
                pageStatus.textContent = 'Not LinkedIn';
                pageStatus.style.color = '#cb4335';
            }
        } catch (error) {
            console.error('Error checking current page:', error);
        }
    }

    setupEventListeners() {
        // Enable/Disable toggle
        document.getElementById('enableToggle').addEventListener('click', async (e) => {
            const toggle = e.target;
            const isEnabled = !toggle.classList.contains('active');
            
            try {
                // Update UI first
                if (isEnabled) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
                
                // Update storage
                await chrome.storage.sync.set({ enabled: isEnabled });
                
                // Notify all content scripts in LinkedIn tabs
                const tabs = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
                const promises = tabs.map(tab => 
                    chrome.tabs.sendMessage(tab.id, { 
                        action: 'toggleEnabled', 
                        enabled: isEnabled 
                    }).catch(err => console.log(`Could not notify tab ${tab.id}:`, err))
                );
                
                await Promise.all(promises);
            } catch (error) {
                console.error('Error updating extension state:', error);
                // Revert UI on error
                if (isEnabled) {
                    toggle.classList.remove('active');
                } else {
                    toggle.classList.add('active');
                }
                alert('Failed to update extension state. Please try again.');
            }
        });

        // Scan current page
        document.getElementById('scanPageBtn').addEventListener('click', () => {
            this.scanCurrentPage();
        });

        // Clear cache
        document.getElementById('clearCacheBtn').addEventListener('click', () => {
            this.clearCache();
        });

        // Export data
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Help and support links
        document.getElementById('reportIssue').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://github.com/your-repo/issues' });
        });

        document.getElementById('viewHelp').addEventListener('click', (e) => {
            e.preventDefault();
            this.showHelp();
        });
    }

    async scanCurrentPage() {
        const loadingDiv = document.getElementById('loadingDiv');
        const scanBtn = document.getElementById('scanPageBtn');
        
        loadingDiv.classList.add('show');
        scanBtn.disabled = true;
        scanBtn.textContent = 'Scanning...';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('linkedin.com')) {
                alert('Please navigate to LinkedIn first');
                return;
            }

            // Trigger scan
            await chrome.tabs.sendMessage(tab.id, { action: 'scanPage' });
            
            // Update stats
            setTimeout(async () => {
                await this.loadStats();
            }, 2000);

        } catch (error) {
            console.error('Error scanning page:', error);
            alert('Error scanning page. Make sure you are on LinkedIn.');
        } finally {
            loadingDiv.classList.remove('show');
            scanBtn.disabled = false;
            scanBtn.textContent = 'Scan Current Page';
        }
    }

    async clearCache() {
        if (confirm('Are you sure you want to clear all cached data?')) {
            await chrome.storage.local.clear();
            await this.loadStats();
            alert('Cache cleared successfully!');
        }
    }

    async exportData() {
        try {
            const data = await chrome.storage.local.get(null);
            const exportData = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                data: data
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `linkedin-originality-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Error exporting data. Please try again.');
        }
    }

    showHelp() {
        const helpText = `
LinkedIn Originality Checker Help:

1. Navigate to LinkedIn
2. The extension will automatically detect posts
3. Click "Check Originality" on any post
4. View similarity scores and potential duplicates

Features:
• Automatic post detection
• Similarity scoring
• Duplicate identification
• Export functionality

Tips:
• Keep the extension enabled for best results
• Check posts regularly to build comparison database
• Use export feature to backup your data

For more help, visit our GitHub repository.
        `.trim();
        
        alert(helpText);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
