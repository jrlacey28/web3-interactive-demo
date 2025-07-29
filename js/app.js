// Web3 Interactive Demo - Main Application Logic
// This file contains all the core functionality for widget management,
// drag and drop, UI interactions, and layout management

let counter = 0;
let dragged = null;
let walletConnected = false;

// ========================================
// CORE APPLICATION FUNCTIONS
// ========================================

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

async function connectWallet() {
    const btn = document.getElementById('walletBtn');
    
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            walletConnected = true;
            
            // Get account address
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            const shortAddress = accounts[0] ? 
                `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` : '';
            
            // Get current network
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const networkName = getNetworkName(chainId);
            
            btn.textContent = `✅ ${shortAddress}`;
            btn.classList.add('connected');
            btn.title = `Connected to ${networkName}`;
            
            // Show Arbitrum switch prompt if not on Arbitrum
            if (chainId !== '0xa4b1' && chainId !== '0x66eed') {
                setTimeout(() => {
                    showArbitrumSwitchModal();
                }, 1000);
            }
            
        } catch (error) {
            alert('Failed to connect wallet: ' + error.message);
        }
    } else {
        alert('MetaMask is not installed. Please install MetaMask to connect your wallet.');
        window.open('https://metamask.io/download/', '_blank');
    }
}

function getNetworkName(chainId) {
    const networks = {
        '0x1': 'Ethereum Mainnet',
        '0x5': 'Goerli Testnet',
        '0x89': 'Polygon Mainnet',
        '0xa4b1': 'Arbitrum One',
        '0x66eed': 'Arbitrum Goerli'
    };
    return networks[chainId] || 'Unknown Network';
}

function showArbitrumSwitchModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
        align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 450px;">
            <h3 style="color: #2D374B; margin-bottom: 15px;">⚡ Switch to Arbitrum</h3>
            <p style="margin: 15px 0; color: #666;">For faster and cheaper crypto tips, switch to Arbitrum network</p>
            <div style="margin: 20px 0; padding: 15px; background: #f8f9ff; border-radius: 8px; text-align: left;">
                <strong>Arbitrum Benefits:</strong><br>
                • ~95% lower gas fees<br>
                • Near-instant transactions<br>
                • Same ETH, better experience<br>
                • Perfect for micro-tips!
            </div>
            <button id="switchToArbitrum" 
                    style="background: #2D374B; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 10px;">
                Switch to Arbitrum One
            </button>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: #ccc; color: black; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 10px;">
                Maybe Later
            </button>
        </div>
    `;
    
    modal.querySelector('#switchToArbitrum').onclick = async () => {
        try {
            // Try to switch to Arbitrum One
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xa4b1' }],
            });
            modal.remove();
            showToast('✅ Switched to Arbitrum One!', 'success');
        } catch (switchError) {
            // If Arbitrum isn't added, add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0xa4b1',
                            chainName: 'Arbitrum One',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                            blockExplorerUrls: ['https://arbiscan.io/']
                        }]
                    });
                    modal.remove();
                    showToast('✅ Added Arbitrum network!', 'success');
                } catch (addError) {
                    showToast('❌ Failed to add Arbitrum network', 'error');
                }
            } else {
                showToast('❌ Failed to switch networks', 'error');
            }
        }
    };
    
    document.body.appendChild(modal);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#00ff88' : type === 'error' ? '#ff4757' : '#00d4ff';
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${bgColor}; 
        color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000;
        font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function saveLayout() {
    const widgets = [];
    document.querySelectorAll('.widget').forEach(widget => {
        widgets.push({
            id: widget.id,
            type: widget.dataset.type,
            x: widget.style.left,
            y: widget.style.top,
            width: widget.style.width,
            height: widget.style.height
        });
    });
    
    const layout = {
        widgets: widgets,
        background: document.getElementById('bg').style.backgroundImage || 
                   document.getElementById('bg').style.background,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('web3DemoLayout', JSON.stringify(layout));
    
    // Show success message
    const btn = document.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Saved!';
    btn.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
    }, 2000);
}

// ========================================
// BACKGROUND MANAGEMENT
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Background file upload handler
    document.getElementById('bgFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('bg').style.backgroundImage = `url(${e.target.result})`;
            };
            reader.readAsDataURL(file);
        }
    });
});

function setBg() {
    const url = document.getElementById('bgUrl').value;
    if (url) {
        document.getElementById('bg').style.backgroundImage = `url(${url})`;
    }
}

function setPreset(gradient) {
    const bg = document.getElementById('bg');
    bg.style.background = gradient;
    bg.style.backgroundImage = 'none';
}

// ========================================
// DRAG AND DROP SYSTEM
// ========================================

document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('item')) {
        dragged = e.target;
        e.dataTransfer.effectAllowed = 'copy';
    }
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dragged && (e.target.id === 'canvas' || e.target.closest('#canvas'))) {
        const widgetType = dragged.dataset.widget;
        createWidget(widgetType, e.clientX - 150, e.clientY - 100);
        dragged = null;
    }
});

// ========================================
// WIDGET CREATION AND MANAGEMENT
// ========================================

function createWidget(type, x, y) {
    counter++;
    const widget = document.createElement('div');
    widget.className = 'widget glow';
    widget.id = `w${counter}`;
    widget.dataset.type = type;
    widget.style.left = Math.max(0, x) + 'px';
    widget.style.top = Math.max(0, y) + 'px';

    let content = '';
    let title = '';

    switch(type) {
        case 'youtube':
            title = 'YouTube';
            content = `
                <div class="upload-section">
                    <input class="input" id="yt${counter}" placeholder="Enter YouTube URL">
                    <button class="btn" onclick="loadYT(${counter})">Load Video</button>
                </div>
                <div id="ytc${counter}"></div>
                <button class="video-overlay" onclick="resetYT(${counter})">×</button>
            `;
            break;
            
        case 'video':
            title = 'Video Upload';
            content = `
                <div class="upload-section">
                    <div class="file-upload">
                        <input type="file" id="vidFile${counter}" accept="video/*" onchange="loadVid(${counter})">
                        <label for="vidFile${counter}" class="file-btn">📁 Upload Video</label>
                    </div>
                </div>
                <div id="vidc${counter}"></div>
                <button class="video-overlay" onclick="resetVid(${counter})">×</button>
            `;
            break;
            
        case 'crypto':
            title = 'Tips';
            content = `
                <div style="text-align:center">
                    <div class="tip-grid">
                        <button class="tip-btn" onclick="tip(1,${counter})">$1</button>
                        <button class="tip-btn" onclick="tip(5,${counter})">$5</button>
                        <button class="tip-btn" onclick="tip(10,${counter})">$10</button>
                    </div>
                    <div class="custom-tip">
                        <input class="amount" id="amt${counter}" placeholder="Custom amount">
                        <button class="send" onclick="customTip(${counter})">Send</button>
                    </div>
                    <input class="input" id="msg${counter}" placeholder="Add a message (optional)" style="margin-top:10px">
                    <div id="result${counter}"></div>
                </div>
            `;
            break;
            
        case 'twitter':
            title = 'Twitter';
            content = `
                <div class="social">
                    <input style="width:100%;padding:8px;margin:10px 0" id="user${counter}" placeholder="Enter Twitter username" value="">
                    <button class="btn" onclick="loadTwitter(${counter})" style="color:#333">Load Real Feed</button>
                    <div id="feed${counter}">Enter a username and click "Load Real Feed"</div>
                    <div style="font-size:12px;color:#666;margin-top:10px">Note: Real Twitter API integration requires authentication</div>
                </div>
            `;
            break;
            
        case 'instagram':
            title = 'Instagram';
            content = `
                <div class="social">
                    <input style="width:100%;padding:8px;margin:10px 0" id="ig${counter}" placeholder="Instagram URL">
                    <button class="btn" onclick="loadIG(${counter})" style="color:#333">Load</button>
                    <div id="igc${counter}"></div>
                </div>
            `;
            break;
            
        case 'discord':
            title = 'Discord';
            content = `
                <div class="social">
                    <div style="background:#7289da;color:white;padding:15px;border-radius:8px;margin:10px 0">
                        <h5>Web3 Demo Server</h5>
                        <p style="margin:10px 0">🟢 24 Online • 156 Members</p>
                        <button style="background:#fff;color:#7289da;border:none;padding:8px 16px;border-radius:4px;cursor:pointer" onclick="alert('Would connect to Discord server!')">Join</button>
                    </div>
                </div>
            `;
            break;
    }

    widget.innerHTML = `
        <div class="header">
            <span>${title}</span>
            <div class="header-controls">
                <button class="style-btn" onclick="toggleStylePanel('${widget.id}')" title="Customize">🎨</button>
                <button class="close" onclick="remove('${widget.id}')">×</button>
            </div>
        </div>
        <div class="content">
            ${content}
            <div class="style-panel" id="style-panel-${widget.id}">
                <div class="style-group">
                    <label>Widget Transparency</label>
                    <input type="range" class="style-slider opacity-slider" min="0" max="1" step="0.1" value="0.85" onchange="updateWidgetStyle('${widget.id}')">
                </div>
                <div class="style-group">
                    <div class="style-row">
                        <label>Background</label>
                        <input type="color" class="style-color bg-color" value="#000000" onchange="updateWidgetStyle('${widget.id}')">
                    </div>
                </div>
                <div class="style-group">
                    <div class="style-row">
                        <label>Border</label>
                        <input type="color" class="style-color border-color" value="#00d4ff" onchange="updateWidgetStyle('${widget.id}')">
                    </div>
                </div>
                <div class="style-group">
                    <div class="style-row">
                        <label>Button Color</label>
                        <input type="color" class="style-color btn-color" value="#00d4ff" onchange="updateButtonStyle('${widget.id}')">
                    </div>
                </div>
                <div class="style-group">
                    <div class="style-row">
                        <label>Button Text</label>
                        <input type="color" class="style-color btn-text-color" value="#ffffff" onchange="updateButtonStyle('${widget.id}')">
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('canvas').appendChild(widget);
    makeWidgetDraggable(widget);
}

// ========================================
// WIDGET DRAGGING FUNCTIONALITY
// ========================================

function makeWidgetDraggable(widget) {
    const header = widget.querySelector('.header');
    let isDragging = false, startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('close') || e.target.classList.contains('style-btn')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(widget.style.left) || 0;
        startTop = parseInt(widget.style.top) || 0;
        widget.style.zIndex = '1001';

        const handleMouseMove = (e) => {
            if (!isDragging) return;
            widget.style.left = Math.max(0, startLeft + e.clientX - startX) + 'px';
            widget.style.top = Math.max(0, startTop + e.clientY - startY) + 'px';
        };

        const handleMouseUp = () => {
            isDragging = false;
            widget.style.zIndex = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
}

function remove(id) {
    document.getElementById(id).remove();
}

// Clean mode toggle
function toggleCleanMode(widgetId) {
    const widget = document.getElementById(widgetId);
    widget.classList.toggle('clean-mode');
}

// ========================================
// WIDGET CUSTOMIZATION
// ========================================

function updateWidgetStyle(widgetId) {
    const widget = document.getElementById(widgetId);
    const opacity = widget.querySelector('.opacity-slider').value;
    const bgColor = widget.querySelector('.bg-color').value;
    const borderColor = widget.querySelector('.border-color').value;
    
    widget.style.background = `${bgColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
    widget.style.borderColor = borderColor;
    widget.querySelector('.header').style.background = `linear-gradient(135deg, ${borderColor}, ${borderColor}dd)`;
}

function updateButtonStyle(widgetId) {
    const widget = document.getElementById(widgetId);
    const buttonColor = widget.querySelector('.btn-color').value;
    const textColor = widget.querySelector('.btn-text-color').value;
    
    widget.querySelectorAll('.btn, .tip-btn, .send').forEach(btn => {
        btn.style.background = `linear-gradient(135deg, ${buttonColor}, ${buttonColor}dd)`;
        btn.style.color = textColor;
    });
}

function toggleStylePanel(widgetId) {
    const panel = document.getElementById(`style-panel-${widgetId}`);
    // Close all other panels
    document.querySelectorAll('.style-panel').forEach(p => {
        if (p.id !== `style-panel-${widgetId}`) p.classList.remove('show');
    });
    panel.classList.toggle('show');
}

// ========================================
// VIDEO WIDGET FUNCTIONS
// ========================================

function loadYT(id) {
    const input = document.getElementById(`yt${id}`);
    const content = document.getElementById(`ytc${id}`);
    const widget = document.getElementById(`w${id.toString().split('yt')[0] || id}`);
    const url = input.value.trim();
    
    if (url) {
        let videoId = '';
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('embed/')[1].split('?')[0];
        }
        
        if (videoId) {
            content.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
            widget.classList.add('video-loaded');
        } else {
            content.innerHTML = '<div style="color:#ff4757;padding:20px;text-align:center">Invalid YouTube URL</div>';
        }
    }
}

function resetYT(id) {
    const widget = document.getElementById(`w${id.toString().split('yt')[0] || id}`);
    const content = document.getElementById(`ytc${id}`);
    const input = document.getElementById(`yt${id}`);
    
    widget.classList.remove('video-loaded');
    content.innerHTML = '';
    if (input) input.value = '';
}

function loadVid(id) {
    const fileInput = document.getElementById(`vidFile${id}`);
    const content = document.getElementById(`vidc${id}`);
    const widget = document.getElementById(`w${id.toString().split('vidFile')[0] || id}`);
    
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        const url = URL.createObjectURL(file);
        content.innerHTML = `<video controls><source src="${url}"></video>`;
        widget.classList.add('video-loaded');
    }
}

function resetVid(id) {
    const widget = document.getElementById(`w${id.toString().split('vid')[0] || id}`);
    const content = document.getElementById(`vidc${id}`);
    const input = document.getElementById(`vidFile${id}`);
    
    widget.classList.remove('video-loaded');
    content.innerHTML = '';
    if (input) input.value = '';
}

// ========================================
// CRYPTO TIP FUNCTIONS
// ========================================

function tip(amount, id) {
    if (!walletConnected) {
        alert('Please connect your wallet first!');
        return;
    }
    
    // Check if on Arbitrum for better UX message
    window.ethereum.request({ method: 'eth_chainId' }).then(chainId => {
        const isArbitrum = chainId === '0xa4b1' || chainId === '0x66eed';
        const msg = document.getElementById(`msg${id}`).value;
        const message = msg ? ` with message: "${msg}"` : '';
        const networkInfo = isArbitrum ? ' (⚡ Fast & cheap on Arbitrum!)' : ' (Consider switching to Arbitrum for lower fees)';
        
        document.getElementById(`result${id}`).innerHTML = `<div class="success">Sent ${amount} tip${message}! 🚀${networkInfo}</div>`;
    });
}

function customTip(id) {
    if (!walletConnected) {
        alert('Please connect your wallet first!');
        return;
    }
    
    const amount = document.getElementById(`amt${id}`).value;
    if (!amount) return;
    
    window.ethereum.request({ method: 'eth_chainId' }).then(chainId => {
        const isArbitrum = chainId === '0xa4b1' || chainId === '0x66eed';
        const msg = document.getElementById(`msg${id}`).value;
        const message = msg ? ` with message: "${msg}"` : '';
        const networkInfo = isArbitrum ? ' (⚡ Fast & cheap on Arbitrum!)' : ' (Consider switching to Arbitrum for lower fees)';
        
        document.getElementById(`result${id}`).innerHTML = `<div class="success">Sent ${amount} tip${message}! 🚀${networkInfo}</div>`;
    });
}

// ========================================
// SOCIAL MEDIA FUNCTIONS
// ========================================

function loadTwitter(id) {
    const user = document.getElementById(`user${id}`).value.trim();
    if (!user) {
        document.getElementById(`feed${id}`).innerHTML = '<div style="color:#ff4757;padding:20px">Please enter a username</div>';
        return;
    }
    
    // Show loading state
    document.getElementById(`feed${id}`).innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            Loading @${user}'s tweets...
        </div>
    `;
    
    // Try to use real Twitter API if available and configured
    if (typeof twitterManager !== 'undefined' && 
        API_CONFIG && 
        API_CONFIG.TWITTER && 
        API_CONFIG.TWITTER.BEARER_TOKEN !== 'YOUR_TWITTER_BEARER_TOKEN') {
        
        twitterManager.getUserTweets(user, 5).then(tweets => {
            displayTweets(id, tweets);
        }).catch(error => {
            console.error('Twitter API error:', error);
            displayMockTweets(id, user);
        });
    } else {
        // Use enhanced mock data that looks more realistic
        setTimeout(() => {
            displayMockTweets(id, user);
        }, 1000); // Simulate API delay
    }
}

function displayMockTweets(widgetId, username) {
    const mockTweets = [
        {
            id: '1',
            text: `Just launched our new Web3 interactive demo! 🚀 The future of social media is here. Drag & drop widgets, crypto tips, real-time feeds. Check it out! #Web3 #Crypto #Innovation`,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
            author: { name: username, username: username },
            metrics: { retweets: 42, likes: 128, replies: 15 }
        },
        {
            id: '2', 
            text: `Building in public is the way 💪 Here's what we learned this week about drag-and-drop interfaces and MetaMask integration. The developer community feedback has been incredible!`,
            created_at: new Date(Date.now() - 8 * 60 * 60 * 1000),
            author: { name: username, username: username },
            metrics: { retweets: 23, likes: 89, replies: 7 }
        },
        {
            id: '3',
            text: `The intersection of crypto payments and social media is fascinating. Real-time tips, NFT integration, decentralized storage... We're just scratching the surface 🌐`,
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
            author: { name: username, username: username },
            metrics: { retweets: 67, likes: 234, replies: 28 }
        },
        {
            id: '4',
            text: `Reminder: This is demo data! To see real tweets, you need Twitter API access. But isn't this mock feed looking pretty realistic? 😉 #MockData #Demo`,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            author: { name: username, username: username },
            metrics: { retweets: 12, likes: 45, replies: 8 }
        },
        {
            id: '5',
            text: `Pro tip: Click the 🧹 button to enable clean mode and remove the widget border for a sleeker look! ✨`,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            author: { name: username, username: username },
            metrics: { retweets: 18, likes: 73, replies: 5 }
        }
    ];
    
    displayTweets(widgetId, mockTweets);
}

function displayTweets(widgetId, tweets) {
    let html = '';
    tweets.forEach(tweet => {
        const timeAgo = formatTimeAgo(tweet.created_at);
        html += `
            <div class="tweet">
                <div class="tweet-header">
                    <div class="avatar">${tweet.author.username[0].toUpperCase()}</div>
                    <div>
                        <h4>@${tweet.author.username}</h4>
                        <span>${timeAgo}</span>
                    </div>
                </div>
                <div class="tweet-content">${tweet.text}</div>
                <div class="tweet-stats">
                    <span>💬 ${tweet.metrics.replies}</span>
                    <span>🔄 ${tweet.metrics.retweets}</span>
                    <span>❤️ ${tweet.metrics.likes}</span>
                </div>
            </div>
        `;
    });
    document.getElementById(`feed${widgetId}`).innerHTML = html;
}

function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
}

function loadIG(id) {
    document.getElementById(`igc${id}`).innerHTML = '<div style="padding:20px;text-align:center">Instagram reel would load here with real API integration</div>';
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize with demo widget when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Create a demo crypto widget after a short delay
    setTimeout(() => {
        createWidget('crypto', 100, 100);
    }, 1000);
    
    // Load saved layout if it exists
    const savedLayout = localStorage.getItem('web3DemoLayout');
    if (savedLayout) {
        // Could implement layout restoration here
        console.log('Saved layout found:', savedLayout);
    }
});

// Close style panels when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.style-panel') && !e.target.classList.contains('style-btn')) {
        document.querySelectorAll('.style-panel').forEach(panel => {
            panel.classList.remove('show');
        });
    }
});

// Prevent default drag behavior on images
document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
    }
});