// Viewer Page JavaScript - Read-only layout display
let walletConnected = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize viewer
    initializeViewer();
});

function initializeViewer() {
    // Get layout ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const layoutId = urlParams.get('layout') || urlParams.get('id');
    
    if (layoutId) {
        loadPublishedLayout(layoutId);
    } else {
        // Try to load the demo/default layout
        loadDemoLayout();
    }
}

function loadPublishedLayout(layoutId) {
    // Show loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    
    try {
        // Try to load from localStorage first (for demo purposes)
        const savedLayout = localStorage.getItem(`layout_${layoutId}`) || 
                           localStorage.getItem('web3DemoPublishedLayout');
        
        if (savedLayout) {
            const layout = JSON.parse(savedLayout);
            displayLayout(layout);
            hideLoadingScreen();
        } else {
            // In production, this would fetch from your backend API
            // fetch(`/api/layouts/${layoutId}`)
            //   .then(response => response.json())
            //   .then(layout => displayLayout(layout))
            //   .catch(() => showErrorState());
            
            // For now, show demo layout
            setTimeout(() => {
                loadDemoLayout();
            }, 1000);
        }
    } catch (error) {
        console.error('Error loading layout:', error);
        showErrorState();
    }
}

function loadDemoLayout() {
    // Create a demo layout to show functionality
    const demoLayout = {
        widgets: [
            {
                id: 'wrapper1',
                type: 'crypto',
                x: '100px',
                y: '100px',
                width: '300px',
                height: '280px'
            },
            {
                id: 'wrapper2',
                type: 'twitter',
                x: '450px',
                y: '100px',
                width: '350px',
                height: '400px'
            },
            {
                id: 'wrapper3',
                type: 'youtube',
                x: '100px',
                y: '420px',
                width: '480px',
                height: '270px'
            }
        ],
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        timestamp: new Date().toISOString(),
        creatorName: 'Demo Creator'
    };
    
    displayLayout(demoLayout);
    hideLoadingScreen();
}

function displayLayout(layout) {
    const canvas = document.getElementById('canvas');
    const bg = document.getElementById('bg');
    
    // Set background
    if (layout.background) {
        if (layout.background.includes('url(')) {
            bg.style.backgroundImage = layout.background;
        } else {
            bg.style.background = layout.background;
        }
    }
    
    // Set creator name
    if (layout.creatorName) {
        document.getElementById('creatorName').textContent = `${layout.creatorName}'s Stream Layout`;
        document.title = `${layout.creatorName}'s Stream - StreamSpace`;
    }
    
    // Clear existing widgets
    canvas.innerHTML = '';
    
    // Create widgets
    layout.widgets.forEach((widgetData, index) => {
        createViewerWidget(widgetData, index + 1);
    });
    
    // Initialize wallet connectivity for tips
    initializeWalletForViewer();
}

function createViewerWidget(widgetData, counter) {
    const canvas = document.getElementById('canvas');
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'widget-wrapper';
    wrapper.style.left = widgetData.x;
    wrapper.style.top = widgetData.y;
    wrapper.style.width = widgetData.width;
    wrapper.style.height = widgetData.height;
    wrapper.style.position = 'absolute';
    wrapper.id = widgetData.id;
    
    // Create widget
    const widget = document.createElement('div');
    widget.className = 'widget';
    widget.id = `w${counter}`;
    widget.dataset.type = widgetData.type;
    widget.style.width = '100%';
    widget.style.height = '100%';

    let content = '';
    let title = '';

    switch(widgetData.type) {
        case 'youtube':
            title = 'YouTube';
            content = `
                <div class="upload-section">
                    <input class="input" id="yt${counter}" placeholder="Enter YouTube URL" readonly>
                    <button class="youtube-load-btn" onclick="loadYT(${counter})">Load Video</button>
                </div>
                <div id="ytc${counter}"></div>
            `;
            break;
            
        case 'video':
            title = 'Video Upload';
            content = `
                <div class="video-upload-section">
                    <div class="file-upload centered-upload">
                        <p style="color: rgba(255,255,255,0.7); text-align: center; padding: 20px;">
                            Video upload disabled in viewer mode
                        </p>
                    </div>
                </div>
                <div id="vidc${counter}"></div>
            `;
            break;
            
        case 'crypto':
            title = 'Tips';
            content = `
                <div class="crypto-content">
                    <div class="tip-grid">
                        <button class="tip-btn" onclick="tip(1,${counter})">$1</button>
                        <button class="tip-btn" onclick="tip(5,${counter})">$5</button>
                        <button class="tip-btn" onclick="tip(10,${counter})">$10</button>
                    </div>
                    <div class="custom-tip">
                        <input class="amount" id="amt${counter}" placeholder="Custom amount">
                        <button class="send" onclick="customTip(${counter})">Send</button>
                    </div>
                    <input class="input" id="msg${counter}" placeholder="Add a message (optional)" style="margin-top:10px; margin-bottom:0;">
                    <div id="result${counter}" style="margin-top:10px; min-height:0;"></div>
                </div>
            `;
            break;
            
        case 'twitter':
            title = 'Twitter';
            content = `
                <div class="twitter-feed">
                    <div class="twitter-header">
                        <input class="twitter-input" id="user${counter}" placeholder="Enter Twitter username" value="">
                        <button class="twitter-load-btn" onclick="loadTwitter(${counter})">Load Real Feed</button>
                    </div>
                    <div id="feed${counter}" class="twitter-empty">Enter a username and click "Load Real Feed"</div>
                    <div style="font-size:12px;color:#657786;padding:10px 20px;border-top:1px solid #e1e8ed;background:#f7f9fa;">
                        Real Twitter API integration active! 🚀
                    </div>
                </div>
            `;
            break;
            
        case 'instagram':
            title = 'Instagram';
            content = `
                <div class="social">
                    <p style="color: #666; text-align: center; padding: 20px;">
                        Instagram content would be displayed here
                    </p>
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
                        <button style="background:#fff;color:#7289da;border:none;padding:8px 16px;border-radius:4px;cursor:pointer" onclick="alert('Discord integration coming soon!')">Join</button>
                    </div>
                </div>
            `;
            break;
    }

    // Create header (read-only, no controls)
    const header = document.createElement('div');
    header.className = 'widget-header';
    header.innerHTML = `<span>${title}</span>`;
    
    // Widget content
    widget.innerHTML = `<div class="content">${content}</div>`;
    
    // Append to wrapper
    wrapper.appendChild(header);
    wrapper.appendChild(widget);
    
    // Add to canvas
    canvas.appendChild(wrapper);
    
    // Apply any saved customizations (colors, etc.)
    if (widgetData.customization) {
        applyCustomization(widget.id, widgetData.customization);
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
}

function showErrorState() {
    const loadingScreen = document.getElementById('loadingScreen');
    const errorState = document.getElementById('errorState');
    
    loadingScreen.style.display = 'none';
    errorState.style.display = 'flex';
}

// Initialize wallet for viewer (tips functionality)
async function initializeWalletForViewer() {
    // Auto-detect if wallet is available
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                walletConnected = true;
                console.log('Wallet already connected for tips');
            }
        } catch (error) {
            console.log('Wallet not connected');
        }
    }
}

// Tip functions (same as creator but viewer-focused)
function tip(amount, id) {
    if (!walletConnected) {
        connectWalletForTips();
        return;
    }
    
    window.ethereum.request({ method: 'eth_chainId' }).then(chainId => {
        const isArbitrum = chainId === '0xa4b1' || chainId === '0x66eed';
        const msg = document.getElementById(`msg${id}`).value;
        const message = msg ? ` with message: "${msg}"` : '';
        const networkInfo = isArbitrum ? ' (⚡ Fast & cheap on Arbitrum!)' : ' (Consider switching to Arbitrum for lower fees)';
        
        document.getElementById(`result${id}`).innerHTML = `<div class="success">Thanks for the ${amount} tip${message}! 🚀${networkInfo}</div>`;
        
        // Show success animation
        showTipSuccess(amount);
    });
}

function customTip(id) {
    const amount = document.getElementById(`amt${id}`).value;
    if (!amount) return;
    
    if (!walletConnected) {
        connectWalletForTips();
        return;
    }
    
    window.ethereum.request({ method: 'eth_chainId' }).then(chainId => {
        const isArbitrum = chainId === '0xa4b1' || chainId === '0x66eed';
        const msg = document.getElementById(`msg${id}`).value;
        const message = msg ? ` with message: "${msg}"` : '';
        const networkInfo = isArbitrum ? ' (⚡ Fast & cheap on Arbitrum!)' : ' (Consider switching to Arbitrum for lower fees)';
        
        document.getElementById(`result${id}`).innerHTML = `<div class="success">Thanks for the ${amount} tip${message}! 🚀${networkInfo}</div>`;
        
        // Clear input
        document.getElementById(`amt${id}`).value = '';
        
        // Show success animation
        showTipSuccess(amount);
    });
}

async function connectWalletForTips() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            walletConnected = true;
            showToast('✅ Wallet connected! You can now send tips.', 'success');
        } catch (error) {
            showToast('❌ Failed to connect wallet', 'error');
        }
    } else {
        alert('MetaMask is not installed. Please install MetaMask to send tips.');
        window.open('https://metamask.io/download/', '_blank');
    }
}

function showTipSuccess(amount) {
    // Create floating tip animation
    const tipFloat = document.createElement('div');
    tipFloat.innerHTML = `+$${amount} 💰`;
    tipFloat.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #00ff88, #00cc6a);
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: bold;
        font-size: 1.2rem;
        z-index: 3000;
        pointer-events: none;
        animation: tipFloatUp 2s ease forwards;
        box-shadow: 0 5px 20px rgba(0, 255, 136, 0.4);
    `;
    
    document.body.appendChild(tipFloat);
    
    setTimeout(() => {
        tipFloat.remove();
    }, 2000);
    
    // Add CSS animation
    if (!document.getElementById('tipAnimationStyle')) {
        const style = document.createElement('style');
        style.id = 'tipAnimationStyle';
        style.textContent = `
            @keyframes tipFloatUp {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 0; transform: translate(-50%, -150%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}

// YouTube and Twitter functions (simplified for viewer)
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

function loadTwitter(id) {
    const user = document.getElementById(`user${id}`).value.trim();
    if (!user) {
        document.getElementById(`feed${id}`).innerHTML = '<div class="twitter-error">Please enter a username</div>';
        return;
    }
    
    // Show loading state
    document.getElementById(`feed${id}`).innerHTML = `
        <div class="twitter-loading">
            <div class="twitter-spinner"></div>
            Loading @${user}'s tweets...
        </div>
    `;
    
    // Simulate API call
    setTimeout(() => {
        document.getElementById(`feed${id}`).innerHTML = `
            <div class="tweet">
                <div class="tweet-header">
                    <div class="tweet-avatar">T</div>
                    <div class="tweet-user-info">
                        <h4>@${user}</h4>
                        <div class="tweet-meta">
                            <span class="tweet-time">2h</span>
                        </div>
                    </div>
                </div>
                <div class="tweet-content">This is a demo tweet! In the real version, you'd see actual tweets from @${user}.</div>
                <div class="tweet-stats">
                    <div class="tweet-stat"><span>💬</span> 12</div>
                    <div class="tweet-stat"><span>🔄</span> 34</div>
                    <div class="tweet-stat"><span>❤️</span> 56</div>
                </div>
            </div>
        `;
    }, 1500);
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