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
    
    // Set background properly 
    if (layout.background) {
        // Clear any existing background styles
        bg.style.background = '';
        bg.style.backgroundImage = '';
        bg.style.backgroundSize = '';
        bg.style.backgroundPosition = '';
        bg.style.backgroundRepeat = '';
        
        if (layout.background.includes('url(')) {
            bg.style.backgroundImage = layout.background;
            bg.style.backgroundSize = 'cover';
            bg.style.backgroundPosition = 'center';
            bg.style.backgroundRepeat = 'no-repeat';
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
    
    // Set up responsive adjustment for consistent scaling
    setupResponsiveScaling();
}

function createViewerWidget(widgetData, counter) {
    const canvas = document.getElementById('canvas');
    
    // Create wrapper with responsive positioning
    const wrapper = document.createElement('div');
    wrapper.className = 'widget-wrapper';
    wrapper.style.position = 'absolute';
    wrapper.id = widgetData.id;
    
    // Apply responsive positioning (convert from creator's coordinate system)
    applyResponsivePositioning(wrapper, widgetData);
    
    // Create widget
    const widget = document.createElement('div');
    widget.className = 'widget clean-mode'; // Auto-enable clean mode for viewer
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
                <div class="upload-section" style="display: none;">
                    <input class="input" id="yt${counter}" placeholder="Enter YouTube URL" readonly>
                    <button class="youtube-load-btn" onclick="loadYT(${counter})">Load Video</button>
                </div>
                <div id="ytc${counter}"></div>
            `;
            break;
            
        case 'video':
            title = 'Video Upload';
            content = `
                <div class="video-upload-section" style="display: none;">
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
                <div class="simple-tip-widget">
                    <div class="tip-header">
                        <h3>Send a Tip</h3>
                    </div>
                    <div class="tip-amounts">
                        <button class="tip-amount-btn" onclick="selectTip(1, ${counter})" data-amount="1">$1</button>
                        <button class="tip-amount-btn" onclick="selectTip(5, ${counter})" data-amount="5">$5</button>
                        <button class="tip-amount-btn" onclick="selectTip(10, ${counter})" data-amount="10">$10</button>
                    </div>
                    <div class="tip-message">
                        <textarea id="tipMsg${counter}" placeholder="Leave a message (optional)" maxlength="100"></textarea>
                        <div class="char-count"><span id="charCount${counter}">0</span>/100</div>
                    </div>
                    <button class="send-tip-btn" id="sendBtn${counter}" onclick="sendTip(${counter})">
                        Send Tip
                    </button>
                    <div class="tip-result" id="tipResult${counter}"></div>
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

    // No headers in viewer mode - only content
    
    // Widget content
    widget.innerHTML = `<div class="content">${content}</div>`;
    
    // Append only widget to wrapper (no header)
    wrapper.appendChild(widget);
    
    // Add to canvas
    canvas.appendChild(wrapper);
    
    // Apply any saved state (content and customizations)
    if (widgetData.state) {
        restoreWidgetState(widget, widgetData.state, counter);
    }
    if (widgetData.customization) {
        applyCustomization(widget, widgetData.customization);
    }
}

// Function to restore widget state in viewer
function restoreWidgetState(widget, state, counter) {
    const widgetType = widget.dataset.type;
    
    switch(widgetType) {
        case 'youtube':
            if (state.youtubeUrl) {
                const input = document.getElementById(`yt${counter}`);
                const content = document.getElementById(`ytc${counter}`);
                if (input) input.value = state.youtubeUrl;
                if (content) {
                    // Extract video ID and create iframe directly
                    const url = state.youtubeUrl;
                    let videoId = '';
                    if (url.includes('youtube.com/watch?v=')) {
                        videoId = url.split('v=')[1].split('&')[0];
                    } else if (url.includes('youtu.be/')) {
                        videoId = url.split('youtu.be/')[1].split('?')[0];
                    } else if (url.includes('youtube.com/embed/')) {
                        videoId = url.split('embed/')[1].split('?')[0];
                    }
                    
                    if (videoId) {
                        content.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen style="border:none; border-radius:8px;"></iframe>`;
                        widget.classList.add('video-loaded');
                    }
                }
            }
            break;
            
        case 'video':
            if (state.videoContent) {
                const content = document.getElementById(`vidc${counter}`);
                const uploadSection = widget.querySelector('.video-upload-section');
                if (content) {
                    // Clean up the video content to remove any overlay buttons
                    let cleanVideoContent = state.videoContent.replace(/<button[^>]*class="video-overlay"[^>]*>.*?<\/button>/g, '');
                    content.innerHTML = cleanVideoContent;
                }
                if (uploadSection) {
                    uploadSection.style.display = 'none';
                }
                widget.classList.add('video-loaded');
            }
            break;
            
        case 'crypto':
            if (state.message) {
                const msgInput = document.getElementById(`msg${counter}`);
                if (msgInput) msgInput.value = state.message;
            }
            if (state.amount) {
                const amtInput = document.getElementById(`amt${counter}`);
                if (amtInput) amtInput.value = state.amount;
            }
            if (state.result) {
                const result = document.getElementById(`result${counter}`);
                if (result) result.innerHTML = state.result;
            }
            break;
            
        case 'twitter':
            if (state.username) {
                const userInput = document.getElementById(`user${counter}`);
                if (userInput) userInput.value = state.username;
            }
            if (state.feedContent) {
                const feed = document.getElementById(`feed${counter}`);
                if (feed) feed.innerHTML = state.feedContent;
            }
            break;
    }
}

// Function to apply customization styles in viewer
function applyCustomization(widget, customization) {
    if (!customization) return;
    
    // Apply widget background and transparency
    if (customization.opacity !== undefined) {
        const opacity = customization.opacity;
        const bgColor = customization.bgColor || '#000000';
        const borderColor = customization.borderColor || '#00d4ff';
        
        widget.style.background = `${bgColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
        widget.style.borderColor = borderColor;
        
        // Add blur effect based on transparency
        const blurAmount = (1 - opacity) * 8;
        widget.style.backdropFilter = `blur(${blurAmount}px)`;
        widget.style.webkitBackdropFilter = `blur(${blurAmount}px)`;
    }
    
    // Apply button customizations
    if (customization.buttonColor || customization.buttonTextColor) {
        const buttonColor = customization.buttonColor || '#00d4ff';
        const textColor = customization.buttonTextColor || '#ffffff';
        
        widget.querySelectorAll('.btn, .tip-btn, .send, .twitter-load-btn, .youtube-load-btn').forEach(btn => {
            btn.style.background = `linear-gradient(135deg, ${buttonColor}, ${buttonColor}dd)`;
            btn.style.color = textColor;
        });
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

// ========================================
// NEW SIMPLE TIP FUNCTIONS FOR VIEWER
// ========================================

let selectedTipAmounts = {}; // Store selected amounts per widget

function selectTip(amount, widgetId) {
    // Store selected amount
    selectedTipAmounts[widgetId] = amount;
    
    // Update button states
    const widget = document.getElementById(`w${widgetId}`);
    const buttons = widget.querySelectorAll('.tip-amount-btn');
    buttons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.amount == amount) {
            btn.classList.add('selected');
        }
    });
    
    // Enable send button
    const sendBtn = document.getElementById(`sendBtn${widgetId}`);
    sendBtn.disabled = false;
}

function sendTip(widgetId) {
    const amount = selectedTipAmounts[widgetId];
    const message = document.getElementById(`tipMsg${widgetId}`).value.trim();
    const resultDiv = document.getElementById(`tipResult${widgetId}`);
    
    if (!amount) {
        resultDiv.innerHTML = 'Please select a tip amount';
        resultDiv.className = 'tip-result error';
        return;
    }
    
    // Simulate tip processing with wallet connection
    const sendBtn = document.getElementById(`sendBtn${widgetId}`);
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    // Check wallet connection
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(() => {
                setTimeout(() => {
                    resultDiv.innerHTML = `Thank you for your $${amount} tip!${message ? `<br><em>"${message}"</em>` : ''}`;
                    resultDiv.className = 'tip-result success';
                    
                    // Show success animation
                    showTipSuccess(amount);
                    
                    // Reset form
                    setTimeout(() => {
                        const buttons = document.getElementById(`w${widgetId}`).querySelectorAll('.tip-amount-btn');
                        buttons.forEach(btn => btn.classList.remove('selected'));
                        document.getElementById(`tipMsg${widgetId}`).value = '';
                        document.getElementById(`charCount${widgetId}`).textContent = '0';
                        sendBtn.disabled = true;
                        sendBtn.textContent = 'Send Tip';
                        selectedTipAmounts[widgetId] = null;
                        
                        // Clear result after a few seconds
                        setTimeout(() => {
                            resultDiv.innerHTML = '';
                            resultDiv.className = 'tip-result';
                        }, 5000);
                    }, 2000);
                }, 1000);
            })
            .catch(() => {
                resultDiv.innerHTML = 'Please connect your wallet to send tips';
                resultDiv.className = 'tip-result error';
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Tip';
            });
    } else {
        resultDiv.innerHTML = 'Please install MetaMask to send tips';
        resultDiv.className = 'tip-result error';
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Tip';
    }
}

// Add character counter functionality for viewer
document.addEventListener('input', function(e) {
    if (e.target.id && e.target.id.startsWith('tipMsg')) {
        const widgetId = e.target.id.replace('tipMsg', '');
        const charCountSpan = document.getElementById(`charCount${widgetId}`);
        if (charCountSpan) {
            charCountSpan.textContent = e.target.value.length;
        }
    }
});

// Responsive positioning system for viewer - maintains relative positioning
function applyResponsivePositioning(wrapper, widgetData) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Use percentage positioning for responsive layouts
    if (typeof widgetData.x === 'string' && widgetData.x.includes('%')) {
        const leftPercent = parseFloat(widgetData.x);
        const topPercent = parseFloat(widgetData.y);
        const widthPercent = parseFloat(widgetData.width);
        const heightPercent = parseFloat(widgetData.height);
        
        // Calculate responsive positions maintaining relative placement
        let newLeft = (leftPercent / 100) * viewportWidth;
        let newTop = (topPercent / 100) * viewportHeight;
        let newWidth = (widthPercent / 100) * viewportWidth;
        let newHeight = (heightPercent / 100) * viewportHeight;
        
        // Apply widget type constraints
        const widgetType = widgetData.type;
        
        if (widgetType === 'youtube' || widgetType === 'video') {
            // Maintain aspect ratio for videos
            const maxVideoWidth = getMaxVideoWidth(viewportWidth);
            newWidth = Math.min(newWidth, maxVideoWidth);
            newHeight = (newWidth / 16) * 9;
        } else {
            // Apply type-specific size limits
            const minWidth = getMinWidgetWidth_viewer(widgetType);
            const minHeight = getMinWidgetHeight_viewer(widgetType);
            const maxWidth = getMaxWidgetWidth_viewer(widgetType, viewportWidth);
            const maxHeight = getMaxWidgetHeight_viewer(widgetType, viewportHeight);
            
            newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
            newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        }
        
        // Ensure widgets don't go off-screen
        newLeft = Math.max(0, Math.min(newLeft, viewportWidth - newWidth - 20));
        newTop = Math.max(0, Math.min(newTop, viewportHeight - newHeight - 20));
        
        wrapper.style.left = newLeft + 'px';
        wrapper.style.top = newTop + 'px';
        wrapper.style.width = newWidth + 'px';
        wrapper.style.height = newHeight + 'px';
        return;
    }
    
    // Fallback to pixel positioning with constraints for older layouts
    if (typeof widgetData.x === 'string' && widgetData.x.includes('px')) {
        let newLeft = parseInt(widgetData.x);
        let newTop = parseInt(widgetData.y);
        let newWidth = parseInt(widgetData.width);
        let newHeight = parseInt(widgetData.height);
        
        // Apply viewport constraints
        newLeft = Math.max(0, Math.min(newLeft, viewportWidth - 100));
        newTop = Math.max(0, Math.min(newTop, viewportHeight - 100));
        newWidth = Math.min(newWidth, viewportWidth - newLeft - 20);
        newHeight = Math.min(newHeight, viewportHeight - newTop - 20);
        
        wrapper.style.left = newLeft + 'px';
        wrapper.style.top = newTop + 'px';
        wrapper.style.width = newWidth + 'px';
        wrapper.style.height = newHeight + 'px';
        return;
    }
    
    // Legacy fallback for numeric values
    const referenceWidth = 1920;
    const referenceHeight = 1080;
    
    const leftPercent = (parseInt(widgetData.x) / referenceWidth) * 100;
    const topPercent = (parseInt(widgetData.y) / referenceHeight) * 100;
    const widthPercent = (parseInt(widgetData.width) / referenceWidth) * 100;
    const heightPercent = (parseInt(widgetData.height) / referenceHeight) * 100;
    
    let newLeft = (leftPercent / 100) * viewportWidth;
    let newTop = (topPercent / 100) * viewportHeight;
    let newWidth = (widthPercent / 100) * viewportWidth;
    let newHeight = (heightPercent / 100) * viewportHeight;
    
    newLeft = Math.max(0, Math.min(newLeft, viewportWidth - 200));
    newTop = Math.max(0, Math.min(newTop, viewportHeight - 150));
    
    wrapper.style.left = newLeft + 'px';
    wrapper.style.top = newTop + 'px';
    wrapper.style.width = newWidth + 'px';
    wrapper.style.height = newHeight + 'px';
}

// Smart scaling functions for viewer (same as creator)
function getMaxVideoWidth(viewportWidth) {
    if (viewportWidth <= 768) return viewportWidth * 0.9;
    if (viewportWidth <= 1024) return viewportWidth * 0.7;
    if (viewportWidth <= 1440) return viewportWidth * 0.8;
    if (viewportWidth <= 1920) return 1200;
    return 1600;
}

function getMaxWidgetWidth_viewer(widgetType, viewportWidth) {
    const baseLimits = {
        'crypto': viewportWidth <= 768 ? 350 : viewportWidth <= 1440 ? 400 : 450,
        'twitter': viewportWidth <= 768 ? 300 : viewportWidth <= 1440 ? 350 : 400,
        'instagram': viewportWidth <= 768 ? 300 : viewportWidth <= 1440 ? 350 : 400,
        'discord': viewportWidth <= 768 ? 350 : viewportWidth <= 1440 ? 400 : 450
    };
    return baseLimits[widgetType] || (viewportWidth <= 768 ? 300 : 400);
}

function getMaxWidgetHeight_viewer(widgetType, viewportHeight) {
    const baseLimits = {
        'crypto': viewportHeight <= 600 ? 250 : viewportHeight <= 900 ? 300 : 350,
        'twitter': viewportHeight <= 600 ? 400 : viewportHeight <= 900 ? 500 : 600,
        'instagram': viewportHeight <= 600 ? 400 : viewportHeight <= 900 ? 500 : 600,
        'discord': viewportHeight <= 600 ? 400 : viewportHeight <= 900 ? 500 : 600
    };
    return baseLimits[widgetType] || (viewportHeight <= 600 ? 300 : 400);
}

function getMinWidgetWidth_viewer(widgetType) {
    const minimums = {
        'crypto': 300,
        'twitter': 250,
        'instagram': 250,
        'discord': 250,
        'youtube': 320,
        'video': 320
    };
    return minimums[widgetType] || 250;
}

function getMinWidgetHeight_viewer(widgetType) {
    const minimums = {
        'crypto': 200,
        'twitter': 150,
        'instagram': 150,
        'discord': 150,
        'youtube': 180,
        'video': 180
    };
    return minimums[widgetType] || 150;
}

// Old tip functions (deprecated but kept for compatibility)
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

// Responsive scaling system to ensure consistent behavior between creator and viewer
function setupResponsiveScaling() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            adjustWidgetsForViewport();
        }, 150); // Debounce resize events
    });
}

function adjustWidgetsForViewport() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const wrappers = document.querySelectorAll('.widget-wrapper');
    
    wrappers.forEach(wrapper => {
        const widget = wrapper.querySelector('.widget');
        if (!widget) return;
        
        const widgetType = widget.dataset.type;
        let currentLeft = parseInt(wrapper.style.left) || 0;
        let currentTop = parseInt(wrapper.style.top) || 0;
        let currentWidth = parseInt(wrapper.style.width) || 300;
        let currentHeight = parseInt(wrapper.style.height) || 200;
        
        // Constrain to viewport bounds
        const newLeft = Math.max(0, Math.min(currentLeft, viewportWidth - 100));
        const newTop = Math.max(0, Math.min(currentTop, viewportHeight - 100));
        const maxWidth = viewportWidth - newLeft - 20;
        const maxHeight = viewportHeight - newTop - 20;
        
        let newWidth = Math.min(currentWidth, maxWidth);
        let newHeight = Math.min(currentHeight, maxHeight);
        
        // Apply type-specific constraints
        if (widgetType === 'youtube' || widgetType === 'video') {
            const videoMaxWidth = getMaxVideoWidth(viewportWidth);
            newWidth = Math.min(newWidth, videoMaxWidth);
            newHeight = (newWidth / 16) * 9; // Maintain aspect ratio
            
            // Ensure height fits
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = (newHeight / 9) * 16;
            }
        } else {
            const typeMaxWidth = getMaxWidgetWidth_viewer(widgetType, viewportWidth);
            const typeMaxHeight = getMaxWidgetHeight_viewer(widgetType, viewportHeight);
            const minWidth = getMinWidgetWidth_viewer(widgetType);
            const minHeight = getMinWidgetHeight_viewer(widgetType);
            
            newWidth = Math.max(minWidth, Math.min(newWidth, typeMaxWidth));
            newHeight = Math.max(minHeight, Math.min(newHeight, typeMaxHeight));
        }
        
        // Apply adjusted dimensions
        if (newLeft !== currentLeft || newTop !== currentTop || 
            newWidth !== currentWidth || newHeight !== currentHeight) {
            wrapper.style.left = newLeft + 'px';
            wrapper.style.top = newTop + 'px';
            wrapper.style.width = newWidth + 'px';
            wrapper.style.height = newHeight + 'px';
        }
    });
}