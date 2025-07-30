// LinkedIn Originality Checker - Background Script
class OriginalityAnalyzer {
    constructor() {
        this.cache = new Map();
        this.setupMessageListener();
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

    async analyzePost(postData) {
        console.log('Analyzing post:', postData.text.substring(0, 50) + '...');

        try {
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
            return {
                originalityScore: 100,
                analysis: 'Unable to analyze post due to technical error',
                matches: [],
                error: error.message
            };
        }
    }

    async performAnalysis(postData) {
        // Step 1: Basic text analysis
        const textMetrics = this.analyzeTextMetrics(postData.text);
        
        // Step 2: Search for similar content
        const searchResults = await this.searchSimilarContent(postData);
        
        // Step 3: Calculate similarity scores
        const matches = this.calculateSimilarities(postData.text, searchResults);
        
        // Step 4: Determine originality score
        const originalityScore = this.calculateOriginalityScore(matches, textMetrics);
        
        // Step 5: Generate analysis summary
        const analysis = this.generateAnalysisSummary(originalityScore, matches, textMetrics);

        return {
            originalityScore,
            analysis,
            matches: matches.slice(0, 5), // Return top 5 matches
            textMetrics
        };
    }

    analyzeTextMetrics(text) {
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        
        // Check for common spam indicators
        const hasExcessiveEmojis = (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length > words.length * 0.1;
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
            
            // Store current post for future reference
            const currentPost = {
                text: postData.text,
                author: postData.author,
                date: new Date().toISOString(),
                url: postData.url,
                source: 'linkedin'
            };

            // Find similar posts in stored content
            const storedMatches = storedPosts.filter(post => {
                const similarity = this.calculateDetailedSimilarity(postData.text, post.text);
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
            const similarity = this.calculateTextSimilarity(originalText, result.text);
            return {
                ...result,
                similarity: Math.round(similarity * 100)
            };
        }).sort((a, b) => b.similarity - a.similarity);
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

        // Break into sentences and paragraphs
        const getSentences = (text) => text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
        const sentences1 = getSentences(normalized1);
        const sentences2 = getSentences(normalized2);

        // Get word sequences for phrase matching
        const getWordSequences = (text, size) => {
            const words = text.split(' ');
            const sequences = [];
            for (let i = 0; i <= words.length - size; i++) {
                sequences.push(words.slice(i, i + size).join(' '));
            }
            return sequences;
        };

        // Calculate exact sentence matches
        const exactSentenceMatches = sentences1.filter(s1 => 
            sentences2.some(s2 => s2 === s1)
        ).length;

        // Calculate partial sentence matches (80% similar)
        const partialSentenceMatches = sentences1.filter(s1 => 
            sentences2.some(s2 => {
                const words1 = new Set(s1.split(' '));
                const words2 = new Set(s2.split(' '));
                const intersection = new Set([...words1].filter(x => words2.has(x)));
                return intersection.size / Math.max(words1.size, words2.size) > 0.8;
            })
        ).length;

        // Calculate phrase matches
        const getPhraseMatches = (size) => {
            const seq1 = new Set(getWordSequences(normalized1, size));
            const seq2 = new Set(getWordSequences(normalized2, size));
            return [...seq1].filter(x => seq2.has(x)).length;
        };

        const fourWordMatches = getPhraseMatches(4);
        const threeWordMatches = getPhraseMatches(3);

        // Calculate word-level similarity
        const words1 = new Set(normalized1.split(' '));
        const words2 = new Set(normalized2.split(' '));
        const commonWords = new Set([...words1].filter(x => words2.has(x)));
        const wordSimilarity = commonWords.size / Math.max(words1.size, words2.size);

        // Check for structural similarity
        const lengthRatio = Math.min(normalized1.length, normalized2.length) / 
                           Math.max(normalized1.length, normalized2.length);
        
        // Calculate content fingerprint (word frequency patterns)
        const getWordFrequencies = (text) => {
            const words = text.split(' ');
            const freq = {};
            words.forEach(w => freq[w] = (freq[w] || 0) + 1);
            return freq;
        };
        
        const freq1 = getWordFrequencies(normalized1);
        const freq2 = getWordFrequencies(normalized2);
        const freqSimilarity = Object.keys(freq1).reduce((sum, word) => {
            if (freq2[word]) {
                sum += Math.min(freq1[word], freq2[word]) / Math.max(freq1[word], freq2[word]);
            }
            return sum;
        }, 0) / Object.keys(freq1).length;

        // Calculate overall similarity score with weighted components
        const overallSimilarity = (
            (exactSentenceMatches > 0 ? 0.3 : 0) +
            (partialSentenceMatches / Math.max(sentences1.length, sentences2.length) * 0.2) +
            (fourWordMatches > 0 ? 0.2 : 0) +
            (threeWordMatches / Math.max(sentences1.length, sentences2.length) * 0.1) +
            (wordSimilarity * 0.1) +
            (lengthRatio * 0.05) +
            (freqSimilarity * 0.05)
        );

        return {
            overallSimilarity,
            exactSentenceMatches,
            partialSentenceMatches,
            fourWordMatches,
            threeWordMatches,
            wordSimilarity,
            lengthRatio,
            freqSimilarity
        };
    }

    calculateOriginalityScore(matches, textMetrics) {
        let score = 100;

        // Check for exact matches or high similarity
        if (matches.length > 0) {
            const detailedSimilarity = this.calculateDetailedSimilarity(matches[0].text, textMetrics.originalText);
            
            // Exact sentence matches are strong indicators of copying
            if (detailedSimilarity.sentenceMatches > 0) {
                score -= Math.min(95, detailedSimilarity.sentenceMatches * 30);
            }

            // Phrase matches also indicate potential copying
            if (detailedSimilarity.phraseMatches > 0) {
                score -= Math.min(80, detailedSimilarity.phraseMatches * 20);
            }

            // Overall similarity penalty
            const similarityPenalty = detailedSimilarity.overallSimilarity * 100;
            score -= similarityPenalty;

            // Multiple matches penalty
            if (matches.length > 1) {
                matches.slice(1).forEach((match, index) => {
                    const subsequentSimilarity = this.calculateDetailedSimilarity(match.text, textMetrics.originalText);
                    score -= Math.min(20, subsequentSimilarity.overallSimilarity * 50 / (index + 2));
                });
            }
        }

        // Content quality penalties
        if (textMetrics.hasExcessiveEmojis) score -= 20;
        if (textMetrics.hasExcessiveHashtags) score -= 25;
        if (textMetrics.hasExcessiveCaps) score -= 20;
        if (textMetrics.uniqueWordRatio < 0.5) score -= 20;
        if (textMetrics.wordCount < 10) score -= 15;
        if (textMetrics.uniqueWordRatio < 0.3) score -= 25;

        // Length-based adjustments
        if (textMetrics.wordCount < 20) {
            score -= 10; // Penalize very short posts
        }

        // Final adjustments
        if (score < 50 && matches.length > 0) {
            // If score is already low and we found matches, be more aggressive
            score = Math.max(0, score - 20);
        }

        return Math.max(0, Math.round(score));
    }

    generateAnalysisSummary(score, matches, textMetrics) {
        if (score >= 90) {
            return "This post appears to be highly original with no significant similar content found.";
        } else if (score >= 70) {
            return `This post appears mostly original, though ${matches.length} similar posts were found with moderate similarity.`;
        } else if (score >= 50) {
            return `This post has concerning similarities to existing content. ${matches.length} similar posts found.`;
        } else {
            return `This post appears to be largely copied or heavily inspired by existing content. High similarity detected.`;
        }
    }

    generateCacheKey(text) {
        // Simple hash function for caching
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
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
}

// Initialize the analyzer
new OriginalityAnalyzer();