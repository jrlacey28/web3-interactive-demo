// Instagram API Integration
// Documentation: https://developers.facebook.com/docs/instagram-basic-display-api

class InstagramManager {
    constructor() {
        this.accessToken = API_CONFIG.INSTAGRAM.ACCESS_TOKEN;
        this.baseURL = API_CONFIG.INSTAGRAM.API_BASE_URL;
        this.useMockData = API_CONFIG.USE_MOCK_DATA;
    }

    // ========================================
    // MAIN API METHODS
    // ========================================
    async getUserMedia(count = 10) {
        try {
            if (this.useMockData || this.accessToken === 'YOUR_INSTAGRAM_ACCESS_TOKEN') {
                return this.getMockMedia(count);
            }

            const url = `${this.baseURL}/me/media`;
            const params = new URLSearchParams({
                fields: 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp',
                access_token: this.accessToken,
                limit: count.toString()
            });

            const response = await fetch(`${url}?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.formatMedia(data.data || []);

        } catch (error) {
            console.error('Error fetching Instagram media:', error);
            return this.getMockMedia(count);
        }
    }

    async getSpecificMedia(mediaId) {
        try {
            if (this.useMockData) {
                return this.getMockMedia(1)[0];
            }

            const url = `${this.baseURL}/${mediaId}`;
            const params = new URLSearchParams({
                fields: 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp',
                access_token: this.accessToken
            });

            const response = await fetch(`${url}?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Error fetching specific media:', error);
            return null;
        }
    }

    // ========================================
    // URL PARSING & MEDIA EXTRACTION
    // ========================================
    extractMediaIdFromUrl(instagramUrl) {
        // Extract media ID from Instagram URLs
        // Format: https://www.instagram.com/p/MEDIA_ID/
        const regex = /instagram\.com\/p\/([A-Za-z0-9_-]+)/;
        const match = instagramUrl.match(regex);
        return match ? match[1] : null;
    }

    async loadFromUrl(instagramUrl) {
        const mediaShortcode = this.extractMediaIdFromUrl(instagramUrl);
        
        if (!mediaShortcode) {
            throw new Error('Invalid Instagram URL format');
        }

        // Note: Converting shortcode to media ID requires additional API calls
        // For demo purposes, we'll show mock data
        return this.getMockMedia(1)[0];
    }

    // ========================================
    // DATA FORMATTING
    // ========================================
    formatMedia(mediaArray) {
        return mediaArray.map(media => ({
            id: media.id,
            type: media.media_type, // IMAGE, VIDEO, CAROUSEL_ALBUM
            url: media.media_url,
            thumbnail: media.thumbnail_url,
            permalink: media.permalink,
            caption: media.caption || '',
            timestamp: new Date(media.timestamp),
            isVideo: media.media_type === 'VIDEO'
        }));
    }

    // ========================================
    // MOCK DATA (for development/demo)
    // ========================================
    getMockMedia(count = 10) {
        const mockPosts = [
            {
                id: 'mock_1',
                type: 'VIDEO',
                url: 'https://example.com/mock-video-1.mp4',
                thumbnail: 'https://picsum.photos/400/400?random=1',
                permalink: 'https://instagram.com/p/mock1',
                caption: '🚀 Just dropped our latest Web3 demo! The future is decentralized ✨ #Web3 #Crypto #Innovation',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                isVideo: true
            },
            {
                id: 'mock_2',
                type: 'IMAGE',
                url: 'https://picsum.photos/400/600?random=2',
                thumbnail: 'https://picsum.photos/400/600?random=2',
                permalink: 'https://instagram.com/p/mock2',
                caption: 'Behind the scenes: Building the drag & drop interface 💻 #TechLife #Development',
                timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
                isVideo: false
            },
            {
                id: 'mock_3',
                type: 'CAROUSEL_ALBUM',
                url: 'https://picsum.photos/400/400?random=3',
                thumbnail: 'https://picsum.photos/400/400?random=3',
                permalink: 'https://instagram.com/p/mock3',
                caption: 'Swipe to see the journey from concept to live demo! 👉 #BuildInPublic',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                isVideo: false
            },
            {
                id: 'mock_4',
                type: 'VIDEO',
                url: 'https://example.com/mock-video-4.mp4',
                thumbnail: 'https://picsum.photos/400/400?random=4',
                permalink: 'https://instagram.com/p/mock4',
                caption: 'Quick demo of the MetaMask integration! 💰 Crypto tips made easy',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                isVideo: true
            },
            {
                id: 'mock_5',
                type: 'IMAGE',
                url: 'https://picsum.photos/400/500?random=5',
                thumbnail: 'https://picsum.photos/400/500?random=5',
                permalink: 'https://instagram.com/p/mock5',
                caption: 'Coffee + Code = Magic ☕✨ #DeveloperLife #CodingVibes',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                isVideo: false
            }
        ];

        return mockPosts.slice(0, count);
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    // ========================================
    // ACCESS TOKEN MANAGEMENT
    // ========================================
    async refreshAccessToken() {
        // Instagram access tokens expire every 60 days
        // This would typically be handled server-side
        try {
            const response = await fetch(`${this.baseURL}/refresh_access_token`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'ig_refresh_token',
                    access_token: this.accessToken
                })
            });

            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                return data.access_token;
            }
        } catch (error) {
            console.error('Error refreshing access token:', error);
        }
        return null;
    }

    // ========================================
    // ERROR HANDLING
    // ========================================
    handleApiError(error, response) {
        if (response?.status === 400) {
            console.error('Bad Request - Check your access token and parameters');
        } else if (response?.status === 403) {
            console.error('Forbidden - Access token may be expired or invalid');
        } else if (response?.status === 429) {
            console.error('Rate Limited - Too many requests');
        } else {
            console.error('Instagram API Error:', error);
        }
    }
}

// ========================================
// INTEGRATION INSTRUCTIONS
// ========================================
/*
TO INTEGRATE INSTAGRAM API:

1. GET API ACCESS:
   - Create Facebook App: https://developers.facebook.com/apps/
   - Add Instagram Basic Display product
   - Configure Instagram Basic Display settings
   - Generate User Access Token

2. REQUIRED PERMISSIONS:
   - instagram_graph_user_profile
   - instagram_graph_user_media

3. ACCESS TOKEN SETUP:
   - Get short-lived access token (1 hour)
   - Exchange for long-lived token (60 days)
   - Set up refresh mechanism for production

4. RATE LIMITS:
   - 200 requests per hour per user
   - Plan your API calls accordingly

5. CORS CONSIDERATIONS:
   - Instagram API requires server-side calls
   - Create backend proxy for production:

   ```javascript
   // Express.js backend example
   app.get('/api/instagram/media', async (req, res) => {
     const instagram = new InstagramManager();
     const media = await instagram.getUserMedia(10);
     res.json(media);
   });
   ```

6. PRODUCTION SETUP:
   - Store access tokens securely server-side
   - Implement token refresh mechanism
   - Add proper error handling
   - Consider webhook subscriptions for real-time updates

EXAMPLE USAGE:
```javascript
const instagram = new InstagramManager();

// Get user's recent media
const media = await instagram.getUserMedia(10);
console.log(media);

// Load specific post from URL
const post = await instagram.loadFromUrl('https://instagram.com/p/ABC123/');
console.log(post);

// Refresh access token (server-side)
const newToken = await instagram.refreshAccessToken();
```

BACKEND PROXY EXAMPLE (Node.js + Express):
```javascript
const express = require('express');
const app = express();

app.get('/api/instagram/media/:count', async (req, res) => {
    try {
        const response = await fetch(`https://graph.instagram.com/me/media?fields=id,media_type,media_url,caption&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}&limit=${req.params.count}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

SECURITY NOTES:
- Never expose access tokens in frontend code
- Use HTTPS for all API calls
- Implement proper authentication
- Validate all user inputs
- Handle expired tokens gracefully
*/

// Create global instance
let instagramManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    instagramManager = new InstagramManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InstagramManager;
}