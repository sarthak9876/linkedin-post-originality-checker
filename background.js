// LinkedIn Originality Checker - Background Script
class OriginalityAnalyzer {
    constructor() {
        this.cache = new Map();
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'analyzePost') {
                this.analyzePost(request.data).then(sendResponse);
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
        // Simulate searching for similar content
        // In a real implementation, this would:
        // 1. Extract key phrases from the post
        // 2. Search LinkedIn using those phrases
        // 3. Scrape and analyze found posts
        // 4. Return potential matches

        const mockResults = await this.generateMockSearchResults(postData);
        return mockResults;
    }

    async generateMockSearchResults(postData) {
        // Generate realistic mock data for demonstration
        const mockPosts = [
            {
                text: this.generateSimilarText(postData.text, 0.8),
                author: "John Business",
                date: "2024-01-15",
                url: "https://linkedin.com/posts/mock1"
            },
            {
                text: this.generateSimilarText(postData.text, 0.6),
                author: "Sarah Professional",
                date: "2024-01-10",
                url: "https://linkedin.com/posts/mock2"
            },
            {
                text: this.generateSimilarText(postData.text, 0.4),
                author: "Mike Industry",
                date: "2024-01-05",
                url: "https://linkedin.com/posts/mock3"
            }
        ];

        // Randomly return 0-3 results to simulate real behavior
        const numResults = Math.floor(Math.random() * 4);
        return mockPosts.slice(0, numResults);
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

    calculateTextSimilarity(text1, text2) {
        // Simple Jaccard similarity for demonstration
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    calculateOriginalityScore(matches, textMetrics) {
        let score = 100;

        // Reduce score based on matches
        if (matches.length > 0) {
            const highestSimilarity = matches[0].similarity;
            score -= highestSimilarity * 0.8; // High similarity reduces score significantly
            
            // Additional penalty for multiple similar matches
            if (matches.length > 1) {
                score -= matches.length * 5;
            }
        }

        // Reduce score for spam indicators
        if (textMetrics.hasExcessiveEmojis) score -= 10;
        if (textMetrics.hasExcessiveHashtags) score -= 15;
        if (textMetrics.hasExcessiveCaps) score -= 10;
        if (textMetrics.uniqueWordRatio < 0.5) score -= 10; // Low vocabulary diversity

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
}

// Initialize the analyzer
new OriginalityAnalyzer();