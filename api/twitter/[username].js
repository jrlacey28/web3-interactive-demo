// File: api/twitter/[username].js
// Updated to use your API_CONFIG from api-keys.js

// Import your API config
// Import your API config
import API_CONFIG from '../../api-keys.js';
  
  export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { username } = req.query;
    const count = req.query.count || 5;
  
    // Use the bearer token directly (since api-keys.js is in your server environment)
    const BEARER_TOKEN = API_CONFIG.TWITTER.BEARER_TOKEN;
  
    if (!BEARER_TOKEN || BEARER_TOKEN === 'BEARER_TOKEN') {
      return res.status(500).json({ error: 'Twitter bearer token not configured' });
    }
  
    try {
      // Step 1: Get user ID from username
      const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!userResponse.ok) {
        throw new Error(`Failed to get user: ${userResponse.status}`);
      }
  
      const userData = await userResponse.json();
      const userId = userData.data?.id;
  
      if (!userId) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Step 2: Get user's tweets
      const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets`;
      const params = new URLSearchParams({
        max_results: count.toString(),
        'tweet.fields': 'created_at,public_metrics,text',
        'user.fields': 'name,username,profile_image_url',
        expansions: 'author_id'
      });
  
      const tweetsResponse = await fetch(`${tweetsUrl}?${params}`, {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!tweetsResponse.ok) {
        throw new Error(`Failed to get tweets: ${tweetsResponse.status}`);
      }
  
      const tweetsData = await tweetsResponse.json();
  
      // Format the response
      const formattedTweets = formatTweets(tweetsData);
      
      res.status(200).json(formattedTweets);
  
    } catch (error) {
      console.error('Twitter API Error:', error);
      res.status(500).json({ error: 'Failed to fetch tweets', details: error.message });
    }
  }
  
  // Helper function to format tweets
  function formatTweets(data) {
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