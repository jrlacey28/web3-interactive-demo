# 🚀 Web3 Interactive Demo

A modern, interactive Web3 application featuring drag-and-drop widgets, cryptocurrency payments via MetaMask, and real-time social media integration.

![Demo Screenshot](assets/images/demo-screenshot.png)

## ✨ Features

- **🎨 Drag & Drop Interface** - Create custom layouts with resizable widgets
- **💰 Crypto Payments** - Send tips via MetaMask with custom messages
- **🐦 Live Social Feeds** - Real-time Twitter/X, Instagram integration
- **📹 Video Integration** - YouTube embeds and video uploads
- **🎨 Full Customization** - Per-widget styling and theming
- **💾 Layout Persistence** - Save and restore custom layouts
- **📱 Responsive Design** - Works on desktop and mobile

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Web3**: MetaMask integration, Ethereum transactions
- **APIs**: Twitter API v2, Instagram Basic Display, YouTube Data API v3
- **Storage**: LocalStorage (client-side), MongoDB (optional)
- **Deployment**: Vercel, Netlify, or traditional hosting

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/web3-interactive-demo.git
cd web3-interactive-demo
npm install
```

### 2. Development Server
```bash
npm run dev
# Opens at http://localhost:3000
```

### 3. Configure APIs (Optional)
```bash
cp .env.example .env
# Edit .env with your API keys
```

## 🔑 API Setup

### Twitter/X API
1. **Apply for Access**: [Twitter Developer Portal](https://developer.twitter.com/)
2. **Create App** → Generate Bearer Token
3. **Update Config**: Add token to `config/api-keys.js`
```javascript
TWITTER: {
    BEARER_TOKEN: 'your_bearer_token_here'
}
```

### Instagram API
1. **Facebook Developers**: [Create App](https://developers.facebook.com/)
2. **Add Instagram Basic Display** product
3. **Generate Access Token**
```javascript
INSTAGRAM: {
    ACCESS_TOKEN: 'your_access_token_here'
}
```

### YouTube API
1. **Google Cloud Console**: [Enable YouTube Data API](https://console.cloud.google.com/)
2. **Create API Key**
```javascript
YOUTUBE: {
    API_KEY: 'your_api_key_here'
}
```

### MetaMask Integration
- **No setup required** - works out of the box
- Users need MetaMask browser extension
- Supports Ethereum mainnet & testnets

## 📁 Project Structure

```
web3-interactive-demo/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   ├── app.js              # Core application logic
│   ├── api/
│   │   ├── twitter.js      # Twitter API integration
│   │   ├── instagram.js    # Instagram API integration
│   │   ├── wallet.js       # MetaMask wallet management
│   │   └── storage.js      # Data persistence
│   └── components/
│       ├── widgets.js      # Widget creation & management
│       ├── customization.js # Styling controls
│       └── layout.js       # Layout management
├── config/
│   └── api-keys.js         # API configuration
├── assets/
│   ├── images/             # Static images
│   └── videos/             # Video assets
├── package.json            # Dependencies & scripts
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🎮 Usage

### Creating Widgets
1. **Open Sidebar** - Click "☰ Widgets" button
2. **Drag & Drop** - Drag any widget onto the canvas
3. **Customize** - Click 🎨 button in widget header
4. **Resize** - Drag corners to resize widgets

### Connecting Wallet
1. **Install MetaMask** - Download from [metamask.io](https://metamask.io/)
2. **Click "Connect Wallet"** - Top right corner
3. **Approve Connection** - In MetaMask popup
4. **Send Tips** - Use crypto widgets to send payments

### Social Media Integration
1. **Twitter** - Enter username, click "Load Feed"
2. **Instagram** - Paste Instagram URL
3. **YouTube** - Paste YouTube video URL

### Saving Layouts
1. **Arrange Widgets** - Position as desired
2. **Click "💾 Save Layout"** - Bottom right corner
3. **Auto-Restore** - Layout restores on page reload

## 🔧 Development

### File Structure Overview

#### `index.html`
- Main HTML structure
- Loads all CSS and JavaScript modules
- Contains sidebar and canvas elements

#### `css/styles.css`
- Complete styling for all components
- Responsive design rules
- Custom animations and effects

#### `js/app.js`
- Core application logic
- Widget creation and management
- Event handling and UI interactions

#### `js/api/wallet.js`
- MetaMask integration
- Transaction handling
- Account management

#### `js/api/twitter.js`
- Twitter API v2 integration
- Real-time tweet fetching
- Mock data for development

#### `config/api-keys.js`
- Centralized API configuration
- Environment-specific settings
- Security best practices

### Adding New Widgets

1. **Update `createWidget()` function** in `js/app.js`:
```javascript
case 'newwidget':
    title = 'New Widget';
    content = `<div>Your widget content here</div>`;
    break;
```

2. **Add widget item** to sidebar in `index.html`:
```html
<div class="item" draggable="true" data-widget="newwidget">
    🆕 New Widget
</div>
```

3. **Add specific functionality** in dedicated file:
```javascript
// js/api/newwidget.js
class NewWidgetManager {
    // Your widget logic here
}
```

### Styling Customization

Each widget supports individual styling through the 🎨 button:
- **Background color & transparency**
- **Border color & style**
- **Button colors & text**
- **Custom CSS properties**

### API Integration Points

#### Twitter Feed Loading
```javascript
// Located in: js/api/twitter.js
async function loadTwitterFeed(widgetId) {
    const twitter = new TwitterManager();
    const tweets = await twitter.getUserTweets(username, count);
    // Update widget display
}
```

#### MetaMask Transactions
```javascript
// Located in: js/api/wallet.js
async function sendTip(amount, widgetId) {
    const wallet = new WalletManager();
    const result = await wallet.sendTip(recipientAddress, amount, message);
    // Handle transaction result
}
```

#### Video Processing
```javascript
// Located in: js/app.js
function loadYouTube(id) {
    // Extract video ID from URL
    // Create iframe embed
    // Handle loading states
}
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
1. **Build**: `npm run build`
2. **Deploy**: Upload `dist/` folder to Netlify
3. **Configure**: Set environment variables in dashboard

### Traditional Hosting
1. **Upload Files**: Copy all files to web server
2. **Configure HTTPS**: Required for MetaMask
3. **Set Headers**: Configure CORS if needed

### Environment Variables

For production deployment, set these environment variables:

```bash
TWITTER_BEARER_TOKEN=your_token_here
INSTAGRAM_ACCESS_TOKEN=your_token_here
YOUTUBE_API_KEY=your_key_here
MONGODB_URI=your_mongodb_connection
```

## 🔒 Security Considerations

### API Keys
- **Never commit API keys** to version control
- **Use environment variables** in production
- **Implement rate limiting** to prevent abuse
- **Validate all inputs** on client and server

### MetaMask Integration
- **Never store private keys** in application
- **Always validate addresses** before transactions
- **Use HTTPS** in production
- **Implement proper error handling**

### CORS & Backend
For production API calls:
```javascript
// Create backend proxy for API calls
app.get('/api/twitter/:username', async (req, res) => {
    // Server-side API call to avoid CORS
    // Never expose API keys to frontend
});
```

## 🐛 Troubleshooting

### Common Issues

**MetaMask not connecting:**
- Ensure MetaMask is installed
- Check network connection
- Try refreshing the page
- Check browser console for errors

**Twitter feed not loading:**
- Verify API keys in `config/api-keys.js`
- Check rate limits (500k tweets/month for basic)
- Ensure username exists and is public

**Videos not playing:**
- Check URL format for YouTube
- Ensure video files are accessible
- Verify HTTPS for uploaded videos

**Styling not applying:**
- Check browser compatibility
- Verify CSS selectors
- Test in different browsers

### Development Mode
Set `USE_MOCK_DATA: true` in `config/api-keys.js` to use demo data without API keys.

### Debug Mode
Add to browser console:
```javascript
// Enable debug logging
localStorage.setItem('debug', 'true');
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### Development Guidelines
- **Code Style**: Use ESLint configuration
- **Testing**: Add tests for new features
- **Documentation**: Update README for new APIs
- **Security**: Follow security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MetaMask** - Web3 wallet integration
- **Twitter API** - Social media data
- **Vercel** - Hosting platform
- **Open Source Community** - Inspiration and tools

## 🔗 Links

- **Live Demo**: [https://your-demo-url.vercel.app](https://your-demo-url.vercel.app)
- **Documentation**: [https://docs.your-project.com](https://docs.your-project.com)
- **API Reference**: [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/web3-interactive-demo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/web3-interactive-demo/discussions)
- **Email**: your-email@example.com
- **Discord**: [Join our community](https://discord.gg/your-server)

---

**Made with ❤️ for the Web3 community**