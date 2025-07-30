// LinkedIn Originality Checker - Content Script
class LinkedInOriginalityChecker {
    constructor() {
        this.processedPosts = new Set();
        this.isEnabled = true;
        this.init();
    }

    init() {
        console.log('LinkedIn Originality Checker loaded');
        this.loadSettings();
        this.observeNewPosts();
        this.processExistingPosts();
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggleEnabled') {
                this.isEnabled = request.enabled;
                if (this.isEnabled) {
                    this.processExistingPosts();
                }
                sendResponse({ success: true });
            }
        });
    }

    async loadSettings() {
        const result = await chrome.storage.sync.get(['enabled']);
        this.isEnabled = result.enabled !== false;
    }

    observeNewPosts() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.checkForNewPosts(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    checkForNewPosts(element) {
        // Look for LinkedIn post containers
        const posts = element.querySelectorAll('[data-urn*="activity"], .feed-shared-update-v2, .occludable-update');
        posts.forEach(post => this.processPost(post));
    }

    processExistingPosts() {
        const posts = document.querySelectorAll('[data-urn*="activity"], .feed-shared-update-v2, .occludable-update');
        posts.forEach(post => this.processPost(post));
    }

    processPost(postElement) {
        if (!this.isEnabled || !postElement || this.processedPosts.has(postElement)) {
            return;
        }

        this.processedPosts.add(postElement);
        
        try {
            const postData = this.extractPostData(postElement);
            if (postData && postData.text && postData.text.length > 50) {
                this.addOriginalityButton(postElement, postData);
            }
        } catch (error) {
            console.error('Error processing post:', error);
        }
    }

    extractPostData(postElement) {
        try {
            // Try different selectors for post content
            const textSelectors = [
                '.feed-shared-text',
                '.feed-shared-inline-show-more-text',
                '[data-test-id="main-feed-activity-card"] .break-words',
                '.attributed-text-segment-list__content',
                '.feed-shared-text__text-view'
            ];

            let textElement = null;
            for (const selector of textSelectors) {
                textElement = postElement.querySelector(selector);
                if (textElement) break;
            }

            if (!textElement) return null;

            // Extract author information
            const authorSelectors = [
                '.feed-shared-actor__name',
                '.feed-shared-actor__title',
                '[data-test-id="main-feed-activity-card"] .feed-shared-actor__name'
            ];

            let authorElement = null;
            for (const selector of authorSelectors) {
                authorElement = postElement.querySelector(selector);
                if (authorElement) break;
            }

            // Extract post URL
            let postUrl = '';
            // Try to get the post URL from various possible elements
            const possibleLinkSelectors = [
                'a[data-tracking-control-name="main_feed_detail_share"]',
                '.feed-shared-actor__meta a',
                '.feed-shared-actor__container a',
                '.feed-shared-actor__meta-link',
                '.feed-shared-update-v2__meta-link',
                '.update-components-actor__meta-link'
            ];

            for (const selector of possibleLinkSelectors) {
                const linkElement = postElement.querySelector(selector);
                if (linkElement && linkElement.href) {
                    postUrl = linkElement.href;
                    // Clean up the URL to get the permanent post URL
                    const urlMatch = postUrl.match(/(https:\/\/[^\/]+\/(?:posts|feed)\/[^?#]+)/);
                    if (urlMatch) {
                        postUrl = urlMatch[1];
                        break;
                    }
                }
            }

            // If we couldn't find a specific post URL, try to get it from the post's data attributes
            if (!postUrl) {
                const urn = postElement.getAttribute('data-urn');
                if (urn) {
                    const activityId = urn.split(':').pop();
                    postUrl = `https://www.linkedin.com/feed/update/${activityId}/`;
                }
            }

            // Extract timestamp
            const timeElement = postElement.querySelector('time, .feed-shared-actor__sub-description time');

            return {
                text: textElement.innerText.trim(),
                author: authorElement ? authorElement.innerText.trim() : 'Unknown',
                timestamp: timeElement ? timeElement.getAttribute('datetime') || timeElement.innerText : 'Unknown',
                url: postUrl || window.location.href, // Fallback to current page URL if no specific post URL found
                element: postElement
            };
        } catch (error) {
            console.error('Error extracting post data:', error);
            return null;
        }
    }

    addOriginalityButton(postElement, postData) {
        // Check if button already exists
        if (postElement.querySelector('.originality-checker-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.className = 'originality-checker-btn';
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Check Originality
        `;
        button.title = 'Check if this post is original';

        // Find the best place to insert the button
        const actionBar = postElement.querySelector('.feed-shared-social-action-bar, .social-actions-bar');
        if (actionBar) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'originality-button-container';
            buttonContainer.appendChild(button);
            actionBar.appendChild(buttonContainer);
        } else {
            // Fallback: add to the end of the post
            postElement.appendChild(button);
        }

        button.addEventListener('click', () => this.checkOriginality(postData, button));
    }

    async checkOriginality(postData, button) {
        if (!postData || !postData.text) {
            console.error('Invalid post data:', postData);
            this.showError(button, 'Invalid post data');
            return;
        }

        button.disabled = true;
        button.innerHTML = `
            <div class="spinner"></div>
            Checking...
        `;

        try {
            // Validate post data before sending
            const validatedData = {
                text: postData.text.trim(),
                author: postData.author || 'Unknown',
                url: postData.url || window.location.href,
                timestamp: postData.timestamp || new Date().toISOString()
            };

            console.log('Sending post data for analysis:', validatedData);
            
            // Send message to background script for analysis
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'analyzePost',
                    data: validatedData
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });
            
            console.log('Received response:', response);
            
            if (!response) {
                throw new Error('No response received from background script');
            }

            // Validate response before displaying results
            if (typeof response.originalityScore === 'undefined') {
                throw new Error('Invalid response format from background script');
            }

            this.displayResults(validatedData, response, button);
        } catch (error) {
            console.error('Error checking originality:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                postData: postData
            });
            
            let errorMessage = 'Error occurred while checking';
            if (error.message.includes('runtime.sendMessage')) {
                errorMessage = 'Extension communication error';
            } else if (error.message.includes('Invalid response')) {
                errorMessage = 'Invalid analysis results';
            }
            
            this.showError(button, errorMessage);
        }
    }

    displayResults(postData, results, button) {
        // Update button to show result
        const score = results.originalityScore;
        let buttonClass = 'original';
        let buttonText = 'Likely Original';
        let buttonIcon = '✓';

        if (score < 50) {
            buttonClass = 'suspicious';
            buttonText = 'Potential Copy';
            buttonIcon = '⚠';
        } else if (score < 80) {
            buttonClass = 'similar';
            buttonText = 'Similar Found';
            buttonIcon = '?';
        }

        button.className = `originality-checker-btn ${buttonClass}`;
        button.innerHTML = `${buttonIcon} ${buttonText} (${score}%)`;
        button.disabled = false;

        // Create detailed results popup
        this.createResultsPopup(postData, results, button);
    }

    createResultsPopup(postData, results, button) {
        // Remove existing popup
        const existingPopup = document.querySelector('.originality-results-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        const popup = document.createElement('div');
        popup.className = 'originality-results-popup';
        
        let matchesHtml = '';
        if (results.matches && results.matches.length > 0) {
            matchesHtml = results.matches.map(match => `
                <div class="match-item">
                    <div class="match-preview">${this.truncate(match.text, 100)}</div>
                    <div class="match-meta">
                        <strong>${match.author}</strong> • ${match.similarity}% similar
                        ${match.url ? `<a href="${match.url}" target="_blank">View Post</a>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            matchesHtml = '<div class="no-matches">No similar posts found</div>';
        }

        popup.innerHTML = `
            <div class="popup-header">
                <h3>Originality Check Results</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="popup-content">
                <div class="score-display">
                    <div class="score-circle ${results.originalityScore < 50 ? 'low' : results.originalityScore < 80 ? 'medium' : 'high'}">
                        ${results.originalityScore}%
                    </div>
                    <div class="score-label">Originality Score</div>
                </div>
                <div class="analysis-summary">
                    <p>${results.analysis}</p>
                </div>
                <div class="matches-section">
                    <h4>Similar Posts Found: ${results.matches ? results.matches.length : 0}</h4>
                    ${matchesHtml}
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Position popup near the button
        const buttonRect = button.getBoundingClientRect();
        popup.style.top = `${buttonRect.bottom + window.scrollY + 10}px`;
        popup.style.left = `${buttonRect.left + window.scrollX}px`;

        // Close button functionality
        popup.querySelector('.close-btn').addEventListener('click', () => {
            popup.remove();
        });

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!popup.contains(e.target) && e.target !== button) {
                    popup.remove();
                }
            }, { once: true });
        }, 100);
    }

    showError(button, message) {
        button.className = 'originality-checker-btn error';
        button.innerHTML = `⚠ ${message}`;
        button.disabled = false;
    }

    truncate(text, length) {
        return text.length > length ? text.substring(0, length) + '...' : text;
    }
}

// Initialize the checker when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new LinkedInOriginalityChecker();
    });
} else {
    new LinkedInOriginalityChecker();
}