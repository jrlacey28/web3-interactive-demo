// Web3 Interactive Demo - Main Application Logic
// This file contains all the core functionality for widget management,
// drag and drop, UI interactions, and layout management

let counter = 0;
let dragged = null;
let walletConnected = false;
const SNAP = 20;
const isViewer = window.location.search.includes('viewer');
let lastViewportWidth = window.innerWidth;
let lastViewportHeight = window.innerHeight;

// ========================================
// RESPONSIVE WINDOW HANDLING
// ========================================

window.addEventListener('resize', function() {
    const newW = window.innerWidth;
    const newH = window.innerHeight;
    const scaleX = newW / lastViewportWidth;
    const scaleY = newH / lastViewportHeight;

    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        const left = parseFloat(wrapper.style.left || 0) * scaleX;
        const top = parseFloat(wrapper.style.top || 0) * scaleY;
        const width = parseFloat(wrapper.style.width || wrapper.offsetWidth) * scaleX;
        const height = parseFloat(wrapper.style.height || wrapper.offsetHeight) * scaleY;
        wrapper.style.left = left + 'px';
        wrapper.style.top = top + 'px';
        wrapper.style.width = width + 'px';
        wrapper.style.height = height + 'px';

        const rect = wrapper.getBoundingClientRect();
        if (rect.right > newW) wrapper.style.left = Math.max(0, newW - rect.width) + 'px';
        if (rect.bottom > newH) wrapper.style.top = Math.max(0, newH - rect.height) + 'px';
    });

    lastViewportWidth = newW;
    lastViewportHeight = newH;
});

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
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        widgets.push({
            id: wrapper.id,
            type: wrapper.querySelector('.widget').dataset.type,
            x: wrapper.style.left,
            y: wrapper.style.top,
            width: wrapper.style.width,
            height: wrapper.style.height
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
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'widget-wrapper';
    wrapper.id = `wrap${counter}`;
    wrapper.dataset.type = type;
    wrapper.style.left = Math.max(0, x) + 'px';
    wrapper.style.top = Math.max(0, y) + 'px';
    wrapper.style.position = 'absolute';
    // Create widget
    const widget = document.createElement('div');
    widget.className = 'widget glow';
    widget.id = `w${counter}`;
    widget.dataset.type = type;

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
                <div class="twitter-feed">
                    <div class="twitter-header">
                        <div class="twitter-user-info" id="userInfo${counter}" style="display: none;">
                            <div class="twitter-avatar" id="userAvatar${counter}">T</div>
                            <div class="twitter-user-details">
                                <h4 id="userName${counter}">Twitter User</h4>
                                <div class="twitter-username" id="userHandle${counter}">@username</div>
                            </div>
                        </div>
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

    // Create header (now outside widget)
    const header = document.createElement('div');
    header.className = 'widget-header';
    header.innerHTML = `
        <span>${title}</span>
        <div class="header-controls">
            <button class="style-btn" onclick="toggleStylePanel('${widget.id}')" title="Customize">🎨</button>
            <button class="close" onclick="remove('${widget.id}')">×</button>
        </div>
    `;
    // Widget content
    widget.innerHTML = `
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
    // Append header and widget to wrapper
    wrapper.appendChild(header);
    wrapper.appendChild(widget);
    // Add to canvas
    document.getElementById('canvas').appendChild(wrapper);

    // Set initial size based on rendered widget
    const rect = widget.getBoundingClientRect();
    wrapper.style.width = rect.width + 'px';
    wrapper.style.height = rect.height + 'px';

    if (!isViewer) {
        makeWidgetDraggable(wrapper, header);
    } else {
        widget.style.resize = 'none';
    }

    if (type === 'youtube' || type === 'video') {
        setupAspectRatio(wrapper);
    }

    // Auto-enable clean mode for new widgets
    enableCleanModeByDefault(widget);
}

// ========================================
// WIDGET DRAGGING FUNCTIONALITY
// ========================================

function makeWidgetDraggable(wrapper, header) {
    let isDragging = false, startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('close') || e.target.classList.contains('style-btn')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(wrapper.style.left) || 0;
        startTop = parseInt(wrapper.style.top) || 0;
        wrapper.style.zIndex = '1001';

        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newLeft = startLeft + e.clientX - startX;
            const newTop = startTop + e.clientY - startY;
            wrapper.style.left = Math.round(Math.max(0, newLeft) / SNAP) * SNAP + 'px';
            wrapper.style.top = Math.round(Math.max(0, newTop) / SNAP) * SNAP + 'px';
        };

        const handleMouseUp = () => {
            isDragging = false;
            wrapper.style.zIndex = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
}

function remove(id) {
    const widget = document.getElementById(id);
    if (widget && widget.closest('.widget-wrapper')) {
        widget.closest('.widget-wrapper').remove();
    }
}

// Clean mode toggle - auto-enable for new widgets
function toggleCleanMode(widgetId) {
    const widget = document.getElementById(widgetId);
    widget.classList.toggle('clean-mode');
}

// Auto-enable clean mode for new widgets
function enableCleanModeByDefault(widget) {
    widget.classList.add('clean-mode');
}

function setupAspectRatio(wrapper) {
    const ratio = 16 / 9;
    const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
            const w = entry.contentRect.width;
            const snappedW = Math.round(w / SNAP) * SNAP;
            const h = Math.round(snappedW / ratio / SNAP) * SNAP;
            wrapper.style.width = snappedW + 'px';
            wrapper.style.height = h + 'px';
        }
    });
    ro.observe(wrapper);
}

function setPreview(mode) {
    const canvas = document.getElementById('canvas');
    canvas.classList.remove('preview-desktop', 'preview-tablet', 'preview-mobile');
    canvas.classList.add(`preview-${mode}`);
    document.querySelectorAll('.preview-btn').forEach(btn => btn.classList.remove('active'));
    const active = document.getElementById(`preview-${mode}`);
    if (active) active.classList.add('active');
}

function publishPage() {
    saveLayout();
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'viewer');
    window.open(url.toString(), '_blank');
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
    
    const header = widget.closest('.widget-wrapper').querySelector('.widget-header');
    if (header) {
        header.style.background = `linear-gradient(135deg, ${borderColor}, ${borderColor}dd)`;
    }
}

function updateButtonStyle(widgetId) {
    const widget = document.getElementById(widgetId);
    const buttonColor = widget.querySelector('.btn-color').value;
    const textColor = widget.querySelector('.btn-text-color').value;
    
    widget.querySelectorAll('.btn, .tip-btn, .send, .twitter-load-btn').forEach(btn => {
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
// ENHANCED SOCIAL MEDIA FUNCTIONS
// ========================================

// Enhanced loadTwitter function
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
    
    // Hide user info initially
    const userInfo = document.getElementById(`userInfo${id}`);
    if (userInfo) userInfo.style.display = 'none';
    
    // Call your API
    fetch(`/api/twitter/${user}?count=10`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayEnhancedTweets(id, data.tweets || data, { username: user, ...data.user });
        })
        .catch(error => {
            console.error('Twitter API error:', error);
            document.getElementById(`feed${id}`).innerHTML = `
                <div class="twitter-error">
                    Failed to load tweets for @${user}. Please try again or check if the username exists.
                </div>
            `;
        });
}

// Enhanced tweet display function
function displayEnhancedTweets(widgetId, tweets, userInfo) {
    // Show user info in header
    const userInfoDiv = document.getElementById(`userInfo${widgetId}`);
    const userAvatar = document.getElementById(`userAvatar${widgetId}`);
    const userName = document.getElementById(`userName${widgetId}`);
    const userHandle = document.getElementById(`userHandle${widgetId}`);
    
    if (userInfoDiv && userAvatar && userName && userHandle) {
        // Set user avatar (first letter if no profile pic available)
        userAvatar.textContent = userInfo.username.charAt(0).toUpperCase();
        userAvatar.style.background = `linear-gradient(135deg, hsl(${userInfo.username.charCodeAt(0) * 5}, 70%, 50%), hsl(${userInfo.username.charCodeAt(0) * 7}, 70%, 40%))`;
        
        // Set user info
        userName.textContent = userInfo.name || userInfo.username;
        userHandle.textContent = `@${userInfo.username}`;
        
        // Show user info
        userInfoDiv.style.display = 'flex';
    }
    
    // Display tweets
    if (!tweets || tweets.length === 0) {
        document.getElementById(`feed${widgetId}`).innerHTML = `
            <div class="twitter-empty">
                No tweets found for @${userInfo.username}
            </div>
        `;
        return;
    }
    
    let html = '';
    tweets.forEach(tweet => {
        const timeAgo = formatTimeAgo(new Date(tweet.created_at));
        const tweetAvatar = tweet.author?.username?.charAt(0).toUpperCase() || 'T';
        const avatarColor = `hsl(${(tweet.author?.username?.charCodeAt(0) || 84) * 5}, 70%, 50%)`;
        
        html += `
            <div class="tweet">
                <div class="tweet-header">
                    <div class="tweet-avatar" style="background: linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd);">
                        ${tweetAvatar}
                    </div>
                    <div class="tweet-user-info">
                        <h4>${tweet.author?.name || tweet.author?.username || 'Twitter User'}</h4>
                        <div class="tweet-meta">
                            <span class="tweet-username">@${tweet.author?.username || 'username'}</span>
                            <span class="tweet-separator">·</span>
                            <span class="tweet-time">${timeAgo}</span>
                        </div>
                    </div>
                </div>
                <div class="tweet-content">${formatTweetText(tweet.text)}</div>
                <div class="tweet-stats">
                    <div class="tweet-stat">
                        <span class="tweet-stat-icon">💬</span>
                        <span>${formatNumber(tweet.public_metrics?.reply_count || tweet.metrics?.replies || 0)}</span>
                    </div>
                    <div class="tweet-stat">
                        <span class="tweet-stat-icon">🔄</span>
                        <span>${formatNumber(tweet.public_metrics?.retweet_count || tweet.metrics?.retweets || 0)}</span>
                    </div>
                    <div class="tweet-stat">
                        <span class="tweet-stat-icon">❤️</span>
                        <span>${formatNumber(tweet.public_metrics?.like_count || tweet.metrics?.likes || 0)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    document.getElementById(`feed${widgetId}`).innerHTML = html;
}

// Helper function to format tweet text (handles mentions, hashtags, links)
function formatTweetText(text) {
    return text
        .replace(/@(\w+)/g, '<span style="color: #1da1f2;">@$1</span>')
        .replace(/#(\w+)/g, '<span style="color: #1da1f2;">#$1</span>')
        .replace(/(https?:\/\/[^\s]+)/g, '<span style="color: #1da1f2;">$1</span>');
}

// Helper function to format numbers (1234 -> 1.2K)
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Enhanced formatTimeAgo function
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function loadIG(id) {
    document.getElementById(`igc${id}`).innerHTML = '<div style="padding:20px;text-align:center">Instagram reel would load here with real API integration</div>';
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize with demo widget when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (isViewer) {
        document.body.classList.add('viewer-mode');
    }
    const savedLayout = localStorage.getItem('web3DemoLayout');
    if (savedLayout) {
        const layout = JSON.parse(savedLayout);
        document.getElementById('bg').style.background = layout.background;
        layout.widgets.forEach(w => {
            createWidget(w.type, parseInt(w.x), parseInt(w.y));
            const wrapper = document.getElementById('canvas').lastElementChild;
            wrapper.id = w.id;
            wrapper.style.width = w.width;
            wrapper.style.height = w.height;
            wrapper.style.left = w.x;
            wrapper.style.top = w.y;
        });
    } else {
        // Create a demo crypto widget after a short delay
        setTimeout(() => {
            createWidget('crypto', 100, 100);
        }, 1000);
    }
    setPreview('desktop');
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