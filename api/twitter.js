// Twitter/X API Integration
// Documentation: https://developer.twitter.com/en/docs/twitter-api

class TwitterManager {
    constructor() {
        this.bearerToken = API_CONFIG.TWITTER.BEARER_TOKEN;
        this.baseURL = API_CONFIG.TWITTER.API_BASE_URL;
        this.useMockData = API_CONFIG.USE_MOCK_DATA;
    }

    // ========================================
    // MAIN API METHODS
    // ========================================
    async getUserTweets(username, count = 5) {
        try {
            if (this.useMockData) {
                return this.getMockTweets(username, count);
            }
    
            // Call your Vercel API route instead of Twitter directly
            const response = await fetch(`/api/twitter/${username}?count=${count}`);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
    
            const tweets = await response.json();
            return tweets;
    
        } catch (error) {
            console.error('Error fetching tweets:', error);
            // Fallback to mock data if API fails
            return this.getMockTweets(username, count);
        }
    }

    async getUserId(username) {
        const url = `${this.baseURL}/users/by/username/${username}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.bearerToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data?.id;

        } catch (error) {
            console.error('Error fetching user ID:', error);
            return null;
        }
    }

    async fetchUserTweets(userId, count = 5) {
        const url = `${this.baseURL}/users/${userId}/tweets`;
        const params = new URLSearchParams({
            max_results: count.toString(),
            'tweet.fields': 'created_at,public_metrics,text',
            'user.fields': 'name,username,profile_image_url',
            expansions: 'author_id'
        });

        try {
            const response = await fetch(`${url}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.bearerToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Error fetching tweets:', error);
            return null;
        }
    }

    // ========================================
    // DATA FORMATTING
    // ========================================
    formatTweets(data) {
        if (!data || !data.data) return [];

        const tweets = data.data;
        const users = data.includes?.users || [];
        
        return tweets.map(tweet => {
            const author = users.find(user => user.id === tweet.author_id);
            
            return {
                id: tweet.id,
                text: tweet.text,
                created_at: new Date(tweet.created_at),
                author: {
                    name: author?.name || 'Unknown',
                    username: author?.username || 'unknown',
                    profile_image: author?.profile_image_url || null
                },
                metrics: {
                    retweets: tweet.public_metrics?.retweet_count || 0,
                    likes: tweet.public_metrics?.like_count || 0,
                    replies: tweet.public_metrics?.reply_count || 0
                }
            };
        });
    }

    // ========================================
    // MOCK DATA (for development/demo)
    // ========================================
    getMockTweets(username, count = 5) {
        const mockTweets = [
            {
                id: '1',
                text: 'Just launched our new Web3 interactive demo! 🚀 The future of social media is here. #Web3 #Crypto #Innovation',
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                author: {
                    name: username.charAt(0).toUpperCase() + username.slice(1),
                    username: username,
                    profile_image: null
                },
                metrics: { retweets: 42, likes: 128, replies: 15 }
            },
            {
                id: '2',
                text: 'Building in public is the way 💪 Here\'s what we learned this week about drag-and-drop interfaces...',
                created_at: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
                author: {
                    name: username.charAt(0).toUpperCase() + username.slice(1),
                    username: username,
                    profile_image: null
                },
                metrics: { retweets: 23, likes: 89, replies: 7 }
            },
            {
                id: '3',
                text: 'The intersection of crypto payments and social media is fascinating. Real-time tips, NFT integration, decentralized storage... 🌐',
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                author: {
                    name: username.charAt(0).toUpperCase() + username.slice(1),
                    username: username,
                    profile_image: null
                },
                metrics: { retweets: 67, likes: 234, replies: 28 }
            },
            {
                id: '4',
                text: 'Shoutout to the amazing developer community! Your feedback has been incredible 🙏 #DevCommunity',
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                author: {
                    name: username.charAt(0).toUpperCase() + username.slice(1),
                    username: username,
                    profile_image: null
                },
                metrics: { retweets: 12, likes: 56, replies: 4 }
            },
            {
                id: '5',
                text: 'Sometimes the best features come from user requests. What would you like to see next? 🤔',
                created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                author: {
                    name: username.charAt(0).toUpperCase() + username.slice(1),
                    username: username,
                    profile_image: null
                },
                metrics: { retweets: 8, likes: 34, replies: 12 }
            }
        ];

        return mockTweets.slice(0, count);
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        return `${Math.floor(diffInSeconds / 86400)}d`;
    }

    formatMetrics(number) {
        if (number < 1000) return number.toString();
        if (number < 1000000) return `${(number / 1000).toFixed(1)}K`;
        return `${(number / 1000000).toFixed(1)}M`;
    }

    // ========================================
    // ERROR HANDLING & RATE LIMITING
    // ========================================
    async handleRateLimit(response) {
        if (response.status === 429) {
            const resetTime = response.headers.get('x-rate-limit-reset');
            const waitTime = resetTime ? parseInt(resetTime) - Math.floor(Date.now() / 1000) : 60;
            
            console.warn(`Rate limited. Retry after ${waitTime} seconds`);
            throw new Error(`Rate limited. Please try again in ${waitTime} seconds.`);
        }
    }

    // ========================================
    // REAL-TIME UPDATES (Advanced)
    // ========================================
    async startRealTimeUpdates(username, callback, intervalSeconds = 60) {
        // Note: Twitter API v2 doesn't have free real-time streaming
        // This implements polling as an alternative
        
        const updateInterval = setInterval(async () => {
            try {
                const tweets = await this.getUserTweets(username, 5);
                callback(tweets);
            } catch (error) {
                console.error('Real-time update failed:', error);
            }
        }, intervalSeconds * 1000);

        return updateInterval; // Return interval ID for cleanup
    }

    stopRealTimeUpdates(intervalId) {
        if (intervalId) {
            clearInterval(intervalId);
        }
    }
}

// ========================================
// INTEGRATION INSTRUCTIONS
// ========================================
/*
TO INTEGRATE TWITTER API:

1. GET API ACCESS:
   - Apply for Twitter Developer Account: https://developer.twitter.com/
   - Create a new App in the Developer Portal
   - Generate Bearer Token (requires Elevated access for some endpoints)
   - Update API_CONFIG.TWITTER.BEARER_TOKEN in config/api-keys.js

2. REQUIRED SCOPES:
   - tweet.read: Read tweets
   - users.read: Read user information
   - For advanced features: tweet.write, follows.read

3. RATE LIMITS:
   - Essential access: 500,000 tweets/month
   - Elevated access: 2,000,000 tweets/month
   - Academic access: 10,000,000 tweets/month

4. CORS CONSIDERATIONS:
   - Twitter API requires server-side calls due to CORS
   - For production, create a backend proxy:
   
   ```javascript
   // Express.js backend example
   app.get('/api/twitter/user/:username', async (req, res) => {
     const twitter = new TwitterManager();
     const tweets = await twitter.getUserTweets(req.params.username);
     res.json(tweets);
   });
   ```

5. PRODUCTION SETUP:
   - Never expose Bearer Token in frontend
   - Implement caching to avoid rate limits
   - Add error handling for network issues
   - Consider Twitter's webhook for real-time updates

EXAMPLE USAGE:
```javascript
const twitter = new TwitterManager();

// Get tweets for a user
const tweets = await twitter.getUserTweets('elonmusk', 10);
console.log(tweets);

// Start real-time updates
const intervalId = twitter.startRealTimeUpdates('elonmusk', (newTweets) => {
    updateTweetDisplay(newTweets);
}, 30); // Update every 30 seconds

// Stop updates
twitter.stopRealTimeUpdates(intervalId);
```

BACKEND PROXY EXAMPLE (Node.js + Express):
```javascript
const express = require('express');
const app = express();

app.get('/api/tweets/:username', async (req, res) => {
    try {
        const response = await fetch(`https://api.twitter.com/2/users/by/username/${req.params.username}`, {
            headers: {
                'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```
*/

// Create global instance
let twitterManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    twitterManager = new TwitterManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TwitterManager;
}