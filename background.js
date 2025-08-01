
    // Generate a human-readable analysis summary for the originality check.
// LinkedIn Originality Checker - Background Script
class OriginalityAnalyzer {

    constructor() {
        this.cache = new Map();
        this.setupMessageListener();
        this.setupErrorHandling();
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        this.MAX_RESULTS = 5;
        this.MIN_SIMILARITY_THRESHOLD = 0.3;
        this.rateLimiter = new Map();
        this.RATE_LIMIT_WINDOW = 60000; // 1 minute
        this.MAX_REQUESTS = 10; // per minute
    }

    // Generate a human-readable analysis summary for the originality check.
    generateAnalysisSummary(originalityScore, matches, textMetrics) {
        try {
            let summary = '';
            if (originalityScore >= 90) {
                summary += 'This post appears to be highly original. ';
            } else if (originalityScore >= 80) {
                summary += 'This post is likely original, but some similar content was found.';
            } else if (originalityScore >= 50) {
                summary += 'Some similarities detected. Review similar posts for possible overlap.';
            } else {
                summary += 'Significant similarities found. This post may be copied or heavily inspired by other content.';
            }

            if (matches && matches.length > 0) {
                const topMatch = matches[0];
                summary += ` Top similarity: ${topMatch.similarity || 0}%`;
            }

            if (textMetrics) {
                summary += `\nWord count: ${textMetrics.wordCount}, Unique word ratio: ${(textMetrics.uniqueWordRatio * 100).toFixed(1)}%`;
                if (textMetrics.hasExcessiveEmojis) summary += '\nContains excessive emojis.';
                if (textMetrics.hasExcessiveHashtags) summary += '\nContains excessive hashtags.';
                if (textMetrics.hasExcessiveCaps) summary += '\nContains excessive capitalization.';
                summary += `\nReadability score: ${textMetrics.readabilityScore}`;
            }

            return summary;
        } catch (err) {
            console.error('Error generating analysis summary:', err);
            return 'Analysis summary unavailable due to error.';
        }
    }

    setupErrorHandling() {
        // Remove window.onerror and use self for service worker context
        self.onerror = (message, source, lineno, colno, error) => {
            console.error('Global error handler:', {
                message,
                source,
                lineno,
                colno,
                error
            });
            return false;
        };

        // Add unhandledrejection handler for Promises
        self.onunhandledrejection = (event) => {
            console.error('Unhandled Promise rejection:', event.reason);
        };
    }

    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache) {
            if (now - value.timestamp > this.CACHE_DURATION) {
                this.cache.delete(key);
            }
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'analyzePost') {
                // Validate incoming request
                if (!request.data || !request.data.text) {
                    console.error('Invalid request data:', request);
                    sendResponse({
                        error: true,
                        message: 'Invalid request data',
                        originalityScore: 0,
                        analysis: 'Error: Invalid post data',
                        matches: []
                    });
                    return true;
                }

                console.log('Background script received analyzePost request:', request.data);
                
                // Create a timeout to ensure sendResponse is called
                const timeoutId = setTimeout(() => {
                    console.error('Analysis timeout');
                    sendResponse({
                        error: true,
                        message: 'Analysis timeout',
                        originalityScore: 0,
                        analysis: 'Error: Analysis took too long',
                        matches: []
                    });
                }, 15000); // 15 second timeout

                // Properly handle the Promise with sendResponse
                this.analyzePost(request.data)
                    .then(result => {
                        clearTimeout(timeoutId);
                        console.log('Analysis complete, sending response:', result);
                        
                        // Ensure result has all required fields
                        const validatedResult = {
                            originalityScore: result.originalityScore || 0,
                            analysis: result.analysis || 'Analysis completed',
                            matches: Array.isArray(result.matches) ? result.matches : [],
                            textMetrics: result.textMetrics || {},
                            error: false
                        };
                        
                        sendResponse(validatedResult);
                    })
                    .catch(error => {
                        clearTimeout(timeoutId);
                        console.error('Error in background script:', error);
                        sendResponse({
                            error: true,
                            message: error.message,
                            originalityScore: 0,
                            analysis: 'Error analyzing post',
                            matches: []
                        });
                    });
                
                return true; // Will respond asynchronously
            }
        });
    }

    async checkRateLimit() {
        const now = Date.now();
        const windowStart = now - this.RATE_LIMIT_WINDOW;
        const requestTimes = this.rateLimiter.get('requests') || [];
        
        const validRequests = requestTimes.filter(time => time > windowStart);
        this.rateLimiter.set('requests', validRequests);

        if (validRequests.length >= this.MAX_REQUESTS) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        validRequests.push(now);
        this.rateLimiter.set('requests', validRequests);
    }

    async analyzePost(postData) {
        console.log('Analyzing post:', postData.text.substring(0, 50) + '...');

        try {
            await this.checkRateLimit();

            // Check cache first
            const cacheKey = this.generateCacheKey(postData.text);
            if (this.cache.has(cacheKey)) {
                console.log('Returning cached result');
                return this.cache.get(cacheKey);
            }

            // Perform analysis
            const result = await this.performAnalysis(postData);
            
            // Cache the result
            this.cache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('Analysis error:', error);
            if (error.message.includes('Rate limit')) {
                return {
                    originalityScore: 0,
                    analysis: 'Rate limit exceeded. Please wait a minute and try again.',
                    matches: [],
                    error: error.message
                };
            }
            return {
                originalityScore: 0,
                analysis: 'Unable to analyze post due to technical error',
                matches: [],
                error: error.message
            };
        }
    }

    async performAnalysis(postData) {
        try {
            // Progress: start
            try { chrome.runtime.sendMessage({ type: 'analysisProgress', stage: 'start', progress: 0 }); } catch (e) {}

            // Step 1: Basic text analysis
            const textMetrics = {
                ...this.analyzeTextMetrics(postData.text),
                originalText: postData.text
            };
            try { chrome.runtime.sendMessage({ type: 'analysisProgress', stage: 'textMetrics', progress: 20 }); } catch (e) {}

            // Step 2: AI Analysis
            const aiAnalysis = await this.performAIAnalysis(postData.text);
            try { chrome.runtime.sendMessage({ type: 'analysisProgress', stage: 'aiAnalysis', progress: 40 }); } catch (e) {}

            // Step 3: Search for similar content
            const searchResults = await this.searchSimilarContent(postData);
            try { chrome.runtime.sendMessage({ type: 'analysisProgress', stage: 'searchResults', progress: 60 }); } catch (e) {}

            // Step 4: Calculate similarity scores
            const matches = this.calculateSimilarities(postData.text, searchResults);
            try { chrome.runtime.sendMessage({ type: 'analysisProgress', stage: 'similarities', progress: 80 }); } catch (e) {}

            // Step 5: Generate final results
            const originalityScore = this.calculateOriginalityScore(matches, textMetrics);
            const analysis = this.generateAnalysisSummary(originalityScore, matches, textMetrics);

            try { chrome.runtime.sendMessage({ type: 'analysisProgress', stage: 'complete', progress: 100 }); } catch (e) {}

            return {
                originalityScore,
                analysis,
                matches: matches.slice(0, 5),
                textMetrics,
                aiAnalysis
            };
        } catch (error) {
            try { chrome.runtime.sendMessage({ type: 'analysisProgress', stage: 'error', error: error.message }); } catch (e) {}
            throw error;
        }
    }

    analyzeTextMetrics(text) {
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        
        // Fixed emoji regex pattern
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;
        const hasExcessiveEmojis = (text.match(emojiRegex) || []).length > words.length * 0.1;
        const hasExcessiveHashtags = (text.match(/#\w+/g) || []).length > 10;
        const hasExcessiveCaps = text.match(/[A-Z]/g)?.length > text.length * 0.3;

        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            uniqueWordRatio: uniqueWords.size / words.length,
            hasExcessiveEmojis,
            hasExcessiveHashtags,
            hasExcessiveCaps,
            readabilityScore: this.calculateReadabilityScore(words, sentences)
        };
    }

    calculateReadabilityScore(words, sentences) {
        if (sentences.length === 0) return 0;
        const avgWordsPerSentence = words.length / sentences.length;
        // Simple readability approximation
        return Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 15) * 2));
    }

    async searchSimilarContent(postData) {
        try {
            if (!navigator.onLine) {
                console.log('Offline mode - using cached data only');
                return this.searchCachedContent(postData);
            }
            
            const results = [];
            
            // 1. First do a real-time LinkedIn search
            console.log('Searching LinkedIn posts...');
            const searchResults = await this.searchLinkedInPosts(postData.text);
            if (searchResults.length > 0) {
                console.log(`Found ${searchResults.length} LinkedIn results`);
                results.push(...searchResults);
            }

            // 2. Search web for similar content
            console.log('Searching web content...');
            const webResults = await this.searchWebForSimilarContent(postData.text);
            if (webResults.length > 0) {
                console.log(`Found ${webResults.length} web results`);
                results.push(...webResults);
            }

            // Get stored posts from local storage
            const storage = await chrome.storage.local.get('posts');
            const storedPosts = storage.posts || [];
            
            // Store current post for future reference, always include author
            const currentPost = {
                text: postData.text,
                author: postData.author || (postData.element && postData.element.getAttribute && postData.element.getAttribute('data-author')) || 'Unknown',
                date: new Date().toISOString(),
                url: postData.url,
                source: 'linkedin'
            };

            // Find similar posts in stored content
            const storedMatches = storedPosts.filter(post => {
                const similarity = this.calculateDetailedSimilarity(postData.text, post.text);
                // Patch: If author is missing but postData has it, fill it in
                if ((!post.author || post.author === 'Unknown') && postData.author && postData.author !== 'Unknown') {
                    post.author = postData.author;
                }
                return similarity.overallSimilarity > 0.3 || 
                       similarity.phraseMatches > 0 ||
                       similarity.sentenceMatches > 0;
            });
            
            // Add matching stored posts to results
            if (storedMatches.length > 0) {
                console.log(`Found ${storedMatches.length} matches in stored content`);
                results.push(...storedMatches);
            }

            // Store the current post if not a duplicate
            if (!storedPosts.some(p => p.url === currentPost.url)) {
                storedPosts.push(currentPost);
                await chrome.storage.local.set({ posts: storedPosts });
            }

            return results;
        } catch (error) {
            console.error('Error searching similar content:', error);
            return [];
        }
    }

    async searchCachedContent(postData) {
        try {
            const storage = await chrome.storage.local.get(null);
            const cachedPosts = [];
            
            for (const key in storage) {
                if (key.startsWith('posts_')) {
                    cachedPosts.push(...storage[key]);
                }
            }

            return this.calculateSimilarities(postData.text, cachedPosts);
        } catch (error) {
            console.error('Error searching cached content:', error);
            return [];
        }
    }

    extractKeyPhrases(text) {
        // Normalize text
        const normalized = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Split into sentences
        const sentences = normalized.split(/[.!?]+/).filter(s => s.trim().length > 0);

        // Extract important phrases (3-5 words)
        const phrases = [];
        sentences.forEach(sentence => {
            const words = sentence.trim().split(' ');
            for (let i = 0; i < words.length - 2; i++) {
                phrases.push(words.slice(i, i + 3).join(' ')); // 3-word phrases
                if (i < words.length - 3) {
                    phrases.push(words.slice(i, i + 4).join(' ')); // 4-word phrases
                }
                if (i < words.length - 4) {
                    phrases.push(words.slice(i, i + 5).join(' ')); // 5-word phrases
                }
            }
        });

        return Array.from(new Set(phrases)); // Remove duplicates
    }

    calculateDetailedSimilarity(text1, text2) {
        const normalizeText = (text) => {
            return text.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        const normalized1 = normalizeText(text1);
        const normalized2 = normalizeText(text2);

        // Break into sentences
        const sentences1 = normalized1.split(/[.!?]+/).filter(s => s.trim());
        const sentences2 = normalized2.split(/[.!?]+/).filter(s => s.trim());

        // Count exact sentence matches
        const sentenceMatches = sentences1.filter(s1 => 
            sentences2.some(s2 => s2.trim() === s1.trim())
        ).length;

        // Extract and compare phrases
        const phrases1 = this.extractKeyPhrases(normalized1);
        const phrases2 = this.extractKeyPhrases(normalized2);
        const phraseMatches = phrases1.filter(p1 => 
            phrases2.includes(p1)
        ).length;

        // Calculate word-level similarity
        const words1 = new Set(normalized1.split(' '));
        const words2 = new Set(normalized2.split(' '));
        const commonWords = new Set([...words1].filter(x => words2.has(x)));
        const wordSimilarity = commonWords.size / Math.max(words1.size, words2.size);

        // Calculate length similarity
        const lengthSimilarity = Math.min(text1.length, text2.length) / 
                               Math.max(text1.length, text2.length);

        // Calculate overall similarity with weighted components
        const overallSimilarity = (
            (sentenceMatches > 0 ? 0.4 : 0) +
            (phraseMatches / Math.max(phrases1.length, phrases2.length) * 0.3) +
            (wordSimilarity * 0.2) +
            (lengthSimilarity * 0.1)
        );

        return {
            overallSimilarity,
            sentenceMatches,
            phraseMatches,
            wordSimilarity,
            lengthSimilarity
        };
    }

    async generateMockSearchResults(postData) {
        try {
            // Get all stored data
            const storage = await chrome.storage.local.get(null);
            let posts = [];
            
            // Collect posts from all dates
            Object.keys(storage).forEach(key => {
                if (key.startsWith('posts_')) {
                    posts = posts.concat(storage[key]);
                }
            });

            // Clean and normalize the current post text
            const normalizeText = (text) => {
                return text.toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            const currentPost = {
                text: postData.text,
                normalizedText: normalizeText(postData.text),
                author: postData.author,
                date: new Date().toISOString(),
                url: postData.url,
                key: this.generateCacheKey(postData.text) // Add a unique key
            };

            // Get today's date key
            const today = new Date().toISOString().split('T')[0];
            const storageKey = `posts_${today}`;

            // Get today's posts
            const todaysPosts = storage[storageKey] || [];

            // Check if this exact post is already stored
            const isDuplicate = todaysPosts.some(post => 
                post.key === currentPost.key || 
                post.url === currentPost.url ||
                this.calculateTextSimilarity(currentPost.text, post.text) > 0.9
            );

            if (!isDuplicate) {
                // Add to today's posts
                todaysPosts.push(currentPost);
                await chrome.storage.local.set({ [storageKey]: todaysPosts });
            }

            // Find similar posts across all stored posts
            const allSimilarPosts = posts
                .filter(post => post.url !== postData.url)
                .map(post => {
                    const similarity = this.calculateDetailedSimilarity(postData.text, post.text);
                    return {
                        ...post,
                        similarity: similarity.overallSimilarity,
                        matchDetails: similarity
                    };
                })
                .filter(post => post.similarity > 0.3) // Increased threshold for better accuracy
                .sort((a, b) => b.similarity - a.similarity);

            // Group similar posts by similarity level
            const highSimilarity = allSimilarPosts.filter(p => p.similarity > 0.7);
            const mediumSimilarity = allSimilarPosts.filter(p => p.similarity > 0.5 && p.similarity <= 0.7);
            const lowSimilarity = allSimilarPosts.filter(p => p.similarity <= 0.5);

            // Prioritize high similarity matches
            const similarPosts = [
                ...highSimilarity,
                ...mediumSimilarity.slice(0, 2),
                ...lowSimilarity.slice(0, 1)
            ].slice(0, 5);

            // Clean up old posts (keep last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const oldKeys = Object.keys(storage)
                .filter(key => key.startsWith('posts_'))
                .filter(key => {
                    const dateStr = key.split('_')[1];
                    return new Date(dateStr) < thirtyDaysAgo;
                });

            if (oldKeys.length > 0) {
                await chrome.storage.local.remove(oldKeys);
            }

            return similarPosts;
        } catch (error) {
            console.error('Error generating search results:', error);
            return [];
        }
    }

    generateSimilarText(originalText, similarity) {
        const words = originalText.split(' ');
        const numWordsToChange = Math.floor(words.length * (1 - similarity));
        
        const synonyms = {
            'great': 'excellent',
            'good': 'wonderful',
            'amazing': 'incredible',
            'team': 'group',
            'project': 'initiative',
            'work': 'effort',
            'company': 'organization',
            'success': 'achievement',
            'happy': 'pleased',
            'excited': 'thrilled'
        };

        const modifiedWords = [...words];
        for (let i = 0; i < numWordsToChange; i++) {
            const randomIndex = Math.floor(Math.random() * words.length);
            const word = words[randomIndex].toLowerCase();
            if (synonyms[word]) {
                modifiedWords[randomIndex] = synonyms[word];
            }
        }

        return modifiedWords.join(' ');
    }

    calculateSimilarities(originalText, searchResults) {
        return searchResults.map(result => {
            const similarity = this.calculateDetailedSimilarity(originalText, result.text);
            return {
                ...result,
                similarity: Math.round(similarity.overallSimilarity * 100)
            };
        }).sort((a, b) => b.similarity - a.similarity);
    }

    calculateOriginalityScore(matches, textMetrics) {
        // Base score starts at 100
        let score = 100;

        // Deduct points for similar matches
        if (matches.length > 0) {
            // Get highest similarity match
            const maxSimilarity = Math.max(...matches.map(m => m.similarity));
            // Deduct up to 60 points based on highest similarity
            score -= (maxSimilarity * 60);
        }

        // Deduct points for poor text metrics
        if (textMetrics) {
            // Deduct for low unique word ratio
            if (textMetrics.uniqueWordRatio < 0.8) {
                score -= (1 - textMetrics.uniqueWordRatio) * 10;
            }

            // Deduct for excessive formatting
            if (textMetrics.hasExcessiveEmojis) score -= 5;
            if (textMetrics.hasExcessiveHashtags) score -= 5;
            if (textMetrics.hasExcessiveCaps) score -= 5;

            // Deduct for poor readability
            if (textMetrics.readabilityScore < 70) {
                score -= (70 - textMetrics.readabilityScore) * 0.2;
            }
        }

        // Ensure score stays between 0 and 100
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    async performAIAnalysis(text) {
        try {
            // Return default values since API endpoints are not actually configured
            return {
                styleScore: 1.0,
                styleFingerprint: 'default',
                authenticityScore: 1.0,
                authenticityConfidence: 1.0,
                contextRelevance: 1.0,
                aiPrediction: 'original',
                analysisDetails: {
                    stylistic: {},
                    authenticity: {},
                    context: {}
                }
            };
        } catch (error) {
            console.error('AI Analysis error:', error);
            // Return default values on error
            return {
                styleScore: 1.0,
                authenticityScore: 1.0,
                contextRelevance: 1.0,
                aiPrediction: 'original',
                analysisDetails: {
                    stylistic: {},
                    authenticity: {},
                    context: {}
                }
            };
        }
    }

    async searchLinkedInPosts(text) {
        try {
            // Extract key phrases for search
            const keyPhrases = this.extractKeyPhrases(text);
            const searchResults = [];
            
            // Use Chrome tabs API to search LinkedIn feed
            const queryParams = new URLSearchParams({
                keywords: keyPhrases.slice(0, 3).join(' OR '),
                origin: 'GLOBAL_SEARCH_HEADER',
                sortBy: 'date_posted'
            });

            // Search LinkedIn posts using their search API
            const searchUrl = `https://www.linkedin.com/search/results/content/?${queryParams}`;
            
            // Create a temporary tab for search
            const tab = await chrome.tabs.create({ 
                url: searchUrl, 
                active: false 
            });

            // Wait for content to load and extract posts
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Inject content script to extract post data
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    const posts = [];
                    document.querySelectorAll('.search-result__occluded-item').forEach(post => {
                        const textElement = post.querySelector('.feed-shared-text');
                        const authorElement = post.querySelector('.feed-shared-actor__name');
                        const urlElement = post.querySelector('a[data-tracking-control-name]');
                        
                        if (textElement && authorElement) {
                            posts.push({
                                text: textElement.innerText.trim(),
                                author: authorElement.innerText.trim(),
                                url: urlElement ? urlElement.href : '',
                                date: new Date().toISOString(),
                                source: 'linkedin-search'
                            });
                        }
                    });
                    return posts;
                }
            });

            // Close the temporary tab
            chrome.tabs.remove(tab.id);

            // Filter and return relevant results
            return results[0]?.result || [];
        } catch (error) {
            console.error('Error searching LinkedIn:', error);
            return [];
        }
    }

    async searchWebForSimilarContent(text) {
        try {
            // Extract meaningful phrases
            const keyPhrases = this.extractKeyPhrases(text)
                .filter(phrase => phrase.split(' ').length >= 3)
                .slice(0, 3);  // Use top 3 most relevant phrases

            const results = [];
            
            // Search using exact phrases
            for (const phrase of keyPhrases) {
                try {
                    // Use DuckDuckGo API for web search (more privacy-friendly)
                    const searchUrl = `https://api.duckduckgo.com/?q="${encodeURIComponent(phrase)}"&format=json`;
                    
                    const response = await fetch(searchUrl);
                    if (!response.ok) {
                        console.error('DuckDuckGo API error:', response.status);
                        continue;
                    }
                    
                    const data = await response.json();
                    
                    if (data.RelatedTopics) {
                        data.RelatedTopics.forEach(topic => {
                            if (topic.Text) {
                                const similarity = this.calculateDetailedSimilarity(topic.Text, text);
                                if (similarity.overallSimilarity > 0.5) {
                                    results.push({
                                        text: topic.Text,
                                        url: topic.FirstURL || '',
                                        author: 'Web Result',
                                        date: new Date().toISOString(),
                                        source: 'web-search',
                                        similarity: similarity.overallSimilarity
                                    });
                                }
                            }
                        });
                    }
                } catch (searchError) {
                    console.error('Error searching phrase:', phrase, searchError);
                    continue;
                }
            }

            return results;
        } catch (error) {
            console.error('Error searching web content:', error);
            return [];
        }
    }

    generateCacheKey(text) {
        // Create a simple hash of the text for cache key
        const normalizedText = text.toLowerCase().trim();
        let hash = 0;
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `post_${hash}`;
    }
}

// Initialize the analyzer
const analyzer = new OriginalityAnalyzer();