// Viewer Page JavaScript - Enhanced published page experience
let walletConnected = false;

// Performance optimization: Preload critical resources
document.addEventListener('DOMContentLoaded', function() {
    // Initialize performance monitoring
    initializePerformanceMonitoring();
    
    // Initialize error handling
    initializeErrorHandling();
    
    // Initialize accessibility features
    initializeAccessibility();
    
    // Initialize viewer with progressive loading
    initializeViewer();
    
    // Initialize page analytics (optional)
    initializeAnalytics();
    // Quick share hook for header button
    window.shareCurrentWorld = function() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showToast('✅ Link copied to clipboard!', 'success');
        }).catch(() => {
            showToast('❌ Failed to copy link', 'error');
        });
    };
});

// Performance monitoring for optimization
function initializePerformanceMonitoring() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
            
            // Track Core Web Vitals
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'largest-contentful-paint') {
                            console.log('LCP:', entry.startTime);
                        }
                    }
                });
                observer.observe({ entryTypes: ['largest-contentful-paint'] });
            }
        });
    }
}

// Enhanced error handling
function initializeErrorHandling() {
    // Global error handler
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        // Don't show error to user for minor issues, but log them
        if (e.error && e.error.message.includes('network') || e.error.message.includes('fetch')) {
            showToast('Connection issue detected. Retrying...', 'warning');
        }
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        e.preventDefault();
    });
}

// Accessibility improvements
function initializeAccessibility() {
    // Add keyboard navigation support
    document.addEventListener('keydown', (e) => {
        // Tab navigation enhancement
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-nav');
        }
        
        // ESC to close modals or return to home
        if (e.key === 'Escape') {
            const errorState = document.getElementById('errorState');
            if (errorState && errorState.style.display !== 'none') {
                window.location.href = 'index.html';
            }
        }
    });
    
    // Remove keyboard nav class on mouse use
    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-nav');
    });
    
    // Screen reader announcements
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
    document.body.appendChild(announcer);
    
    window.announceToScreenReader = function(message) {
        announcer.textContent = message;
        setTimeout(() => { announcer.textContent = ''; }, 1000);
    };
}

// Optional analytics tracking
function initializeAnalytics() {
    // Only track if creator has enabled analytics (privacy-focused)
    const urlParams = new URLSearchParams(window.location.search);
    const trackingEnabled = urlParams.get('analytics') === 'true';
    
    if (trackingEnabled) {
        // Track page view
        console.log('Analytics: Page view tracked');
        
        // Track widget interactions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.tip-amount-btn, .send-tip-btn')) {
                console.log('Analytics: Widget interaction -', e.target.className);
            }
        });
    }
}

function initializeViewer() {
    // Enhanced URL parsing with validation
    const urlParams = new URLSearchParams(window.location.search);
    const layoutId = urlParams.get('layout') || urlParams.get('id');
    
    // Update page title and meta tags dynamically
    updatePageMetadata(layoutId);
    
    // Progressive loading with better UX
    showLoadingScreen('Initializing...');
    
    if (layoutId && isValidLayoutId(layoutId)) {
        loadPublishedLayout(layoutId);
    } else if (layoutId) {
        // Invalid layout ID
        showErrorState('Invalid layout ID provided');
    } else {
        // Try to load the demo/default layout
        showLoadingScreen('Loading demo layout...');
        setTimeout(() => loadDemoLayout(), 500); // Small delay for better UX
    }
}

// Validate layout ID format
function isValidLayoutId(layoutId) {
    // Basic validation - alphanumeric and common separators
    return /^[a-zA-Z0-9_-]{1,50}$/.test(layoutId);
}

// Dynamic metadata updates for SEO and sharing
function updatePageMetadata(layoutId) {
    if (layoutId) {
        document.title = `GENESIS Layout - ${layoutId}`;
        
        // Add or update meta tags
        updateMetaTag('description', `Interactive stream layout created with GENESIS - ${layoutId}`);
        updateMetaTag('og:title', `GENESIS Layout - ${layoutId}`);
        updateMetaTag('og:description', 'Interactive stream layout with live widgets and real-time features');
        updateMetaTag('og:type', 'website');
        updateMetaTag('twitter:card', 'summary_large_image');
    }
}

function updateMetaTag(property, content) {
    let meta = document.querySelector(`meta[property="${property}"]`) || 
               document.querySelector(`meta[name="${property}"]`);
    
    if (!meta) {
        meta = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
            meta.setAttribute('property', property);
        } else {
            meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
}

// Enhanced loading screen with messages
function showLoadingScreen(message = 'Loading Stream Layout...') {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingText = loadingScreen.querySelector('p');
    if (loadingText) {
        loadingText.textContent = message;
    }
    loadingScreen.style.display = 'flex';
    announceToScreenReader(`Loading: ${message}`);
}

function loadPublishedLayout(layoutId, retryCount = 0) {
    const maxRetries = 2;
    
    showLoadingScreen(`Loading layout ${layoutId}...`);
    
    try {
        // Try to load from localStorage first (for demo/local development)
        const savedLayout = localStorage.getItem(`layout_${layoutId}`) || 
                           localStorage.getItem('web3DemoPublishedLayout');
        
        if (savedLayout) {
            const layout = JSON.parse(savedLayout);
            
            // Validate layout structure
            if (isValidLayout(layout)) {
                displayLayout(layout, layoutId);
                hideLoadingScreen();
                announceToScreenReader('Layout loaded successfully');
            } else {
                throw new Error('Invalid layout structure');
            }
        } else {
            // In production, this would fetch from your backend API
            // For now, attempt to load demo or show appropriate error
            if (retryCount < maxRetries) {
                showLoadingScreen(`Layout not found, trying demo... (${retryCount + 1}/${maxRetries})`);
                setTimeout(() => {
                    loadPublishedLayout(layoutId, retryCount + 1);
                }, 1000);
            } else {
                showErrorState('Layout not found', layoutId);
            }
        }
    } catch (error) {
        console.error('Error loading layout:', error);
        
        if (retryCount < maxRetries) {
            showLoadingScreen(`Retrying... (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
                loadPublishedLayout(layoutId, retryCount + 1);
            }, 2000);
        } else {
            showErrorState('Failed to load layout', layoutId);
        }
    }
}

// Validate layout structure for security and integrity
function isValidLayout(layout) {
    if (!layout || typeof layout !== 'object') return false;
    if (!Array.isArray(layout.widgets)) return false;
    
    // Check each widget has required properties
    for (const widget of layout.widgets) {
        if (!widget.id || !widget.type || !widget.x || !widget.y) {
            return false;
        }
        
        // Validate widget types
        const validTypes = ['youtube', 'video', 'livestream', 'crypto', 'twitter', 'instagram', 'discord'];
        if (!validTypes.includes(widget.type)) {
            return false;
        }
    }
    
    return true;
}

// Function to apply background from enhanced background data
function applyBackgroundFromData(bgElement, backgroundData) {
    if (!bgElement || !backgroundData) return;
    
    switch (backgroundData.type) {
        case 'solid':
            bgElement.style.background = backgroundData.solid.color;
            console.log('Applied solid background:', backgroundData.solid.color);
            break;
            
        case 'linear':
            const linear = backgroundData.linear;
            const linearGradient = `linear-gradient(${linear.direction}, ${linear.color1} 0%, ${linear.color2} 100%)`;
            bgElement.style.background = linearGradient;
            console.log('Applied linear gradient:', linearGradient);
            break;
            
        case 'radial':
            const radial = backgroundData.radial;
            const radialGradient = `radial-gradient(${radial.size} at ${radial.position}, ${radial.color1} 0%, ${radial.color2} 100%)`;
            bgElement.style.background = radialGradient;
            console.log('Applied radial gradient:', radialGradient);
            break;
            
        case 'image':
            const image = backgroundData.image;
            if (image.url) {
                bgElement.style.backgroundImage = `url(${image.url})`;
                bgElement.style.backgroundSize = image.size;
                bgElement.style.backgroundPosition = image.position;
                bgElement.style.backgroundRepeat = image.repeat;
                console.log('Applied image background:', image);
            }
            break;
            
        default:
            console.warn('Unknown background type:', backgroundData.type);
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
    
    // Store original layout data for responsive scaling
    localStorage.setItem('currentLayoutData', JSON.stringify(layout));
    storedOriginalLayout = layout;
    
    // Set background properly with enhanced system
    if (layout.background) {
        // Clear any existing background styles
        bg.style.background = '';
        bg.style.backgroundImage = '';
        bg.style.backgroundSize = '';
        bg.style.backgroundPosition = '';
        bg.style.backgroundRepeat = '';
        
        // Check if it's the new background system (object with backgroundData)
        if (typeof layout.background === 'object' && layout.background.backgroundData) {
            const bgData = layout.background.backgroundData;
            applyBackgroundFromData(bg, bgData);
        } 
        // Handle legacy background strings
        else if (typeof layout.background === 'string') {
            if (layout.background.includes('url(')) {
                bg.style.backgroundImage = layout.background;
                bg.style.backgroundSize = 'cover';
                bg.style.backgroundPosition = 'center';
                bg.style.backgroundRepeat = 'no-repeat';
            } else {
                bg.style.background = layout.background;
            }
        }
    }
    
    // Set creator name and world name
    if (layout.creatorName) {
        const worldTitle = layout.worldName ? `${layout.creatorName}'s ${layout.worldName}` : `${layout.creatorName}'s Stream Layout`;
        document.getElementById('creatorName').textContent = worldTitle;
        document.title = layout.worldName ? `${layout.creatorName}'s ${layout.worldName} - GENESIS` : `${layout.creatorName}'s Stream - GENESIS`;
    }
    
    // Clear existing widgets
    canvas.innerHTML = '';
    
  // Create widgets (no extra vertical offset)
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
            
        case 'livestream':
            title = 'Live Stream';
            content = `
                <div class="upload-section" style="display: none;">
                    <input class="input" id="stream${counter}" placeholder="Enter Stream URL" readonly>
                    <button class="youtube-load-btn" onclick="loadStream(${counter})">Load Stream</button>
                </div>
                <div id="streamc${counter}"></div>
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
            
        case 'livestream':
            if (state.streamUrl) {
                const input = document.getElementById(`stream${counter}`);
                const content = document.getElementById(`streamc${counter}`);
                if (input) input.value = state.streamUrl;
                if (content && state.streamContent) {
                    content.innerHTML = state.streamContent;
                    widget.classList.add('video-loaded');
                }
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

function showErrorState(errorMessage = 'Layout not found', layoutId = null) {
    const loadingScreen = document.getElementById('loadingScreen');
    const errorState = document.getElementById('errorState');
    
    // Update error message dynamically
    const errorTitle = errorState.querySelector('h2');
    const errorDescription = errorState.querySelector('p');
    
    if (errorTitle && errorDescription) {
        if (layoutId) {
            errorTitle.textContent = `Layout "${layoutId}" Not Found`;
            errorDescription.textContent = `The stream layout "${layoutId}" doesn't exist or hasn't been published yet. It may have been removed or the link is incorrect.`;
        } else {
            errorTitle.textContent = 'Unable to Load Layout';
            errorDescription.textContent = errorMessage;
        }
    }
    
    // Add retry option for network-related errors
    if (errorMessage.includes('network') || errorMessage.includes('Failed to load')) {
        const errorActions = errorState.querySelector('.error-actions');
        if (errorActions && !errorActions.querySelector('.retry-btn')) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn-secondary retry-btn';
            retryBtn.textContent = 'Try Again';
            retryBtn.onclick = () => window.location.reload();
            errorActions.insertBefore(retryBtn, errorActions.firstChild);
        }
    }
    
    loadingScreen.style.display = 'none';
    errorState.style.display = 'flex';
    
    // Accessibility announcement
    announceToScreenReader(`Error: ${errorMessage}`);
    
    // Focus management for keyboard users
    const firstButton = errorState.querySelector('button, a');
    if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
    }
}

// Initialize wallet for viewer (tips functionality)
async function initializeWalletForViewer() {
    // Wait for Moralis wallet manager to be available
    if (typeof walletManager !== 'undefined') {
        try {
            await walletManager.checkExistingSession();
            if (walletManager.isAuthenticated) {
                walletConnected = true;
                console.log('Moralis wallet already connected for tips');
            }
        } catch (error) {
            console.log('Moralis wallet not connected');
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
    
    // Check Moralis wallet connection
    if (typeof walletManager !== 'undefined') {
        walletManager.authenticate()
            .then((result) => {
                if (result.success) {
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
                } else {
                    resultDiv.innerHTML = 'Please authenticate your wallet to send tips';
                    resultDiv.className = 'tip-result error';
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Send Tip';
                }
            })
            .catch(() => {
                resultDiv.innerHTML = 'Please connect your wallet to send tips';
                resultDiv.className = 'tip-result error';
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Tip';
            });
    } else {
        resultDiv.innerHTML = 'Please connect your wallet to send tips';
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

// Legacy tip function - updated to use Moralis
function tip(amount, id) {
    if (!walletConnected) {
        connectWalletForTips();
        return;
    }
    
    if (typeof walletManager !== 'undefined' && walletManager.isAuthenticated) {
        const msg = document.getElementById(`msg${id}`).value;
        const message = msg ? ` with message: "${msg}"` : '';
        
        document.getElementById(`result${id}`).innerHTML = `<div class="success">Thanks for the ${amount} tip${message}! 🚀</div>`;
        
        // Show success animation
        showTipSuccess(amount);
    } else {
        connectWalletForTips();
    }
}

function customTip(id) {
    const amount = document.getElementById(`amt${id}`).value;
    if (!amount) return;
    
    if (!walletConnected) {
        connectWalletForTips();
        return;
    }
    
    if (typeof walletManager !== 'undefined' && walletManager.isAuthenticated) {
        const msg = document.getElementById(`msg${id}`).value;
        const message = msg ? ` with message: "${msg}"` : '';
        
        document.getElementById(`result${id}`).innerHTML = `<div class="success">Thanks for the ${amount} tip${message}! 🚀</div>`;
        
        // Clear input
        document.getElementById(`amt${id}`).value = '';
        
        // Show success animation
        showTipSuccess(amount);
    } else {
        connectWalletForTips();
    }
}

async function connectWalletForTips() {
    if (typeof walletManager !== 'undefined') {
        try {
            const result = await walletManager.authenticate();
            if (result.success) {
                walletConnected = true;
                showToast('✅ Wallet connected! You can now send tips.', 'success');
            } else {
                showToast('❌ Failed to authenticate wallet', 'error');
            }
        } catch (error) {
            showToast('❌ Failed to connect wallet', 'error');
        }
    } else {
        showToast('❌ Please ensure wallet manager is loaded', 'error');
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
    
    // Generate enhanced mock data for viewer (same as creator but simpler)
    setTimeout(() => {
        const mockTweets = [
            {
                text: `Just launched our new Web3 interactive demo! 🚀 The future of social media is here. #Web3 #Crypto #Innovation`,
                timeAgo: '2h',
                metrics: { replies: 42, retweets: 128, likes: 315 }
            },
            {
                text: `Building in public is the way 💪 Here's what we learned this week about drag-and-drop interfaces...`,
                timeAgo: '8h', 
                metrics: { replies: 23, retweets: 89, likes: 167 }
            },
            {
                text: `The intersection of crypto payments and social media is fascinating. Real-time tips, NFT integration... 🌐`,
                timeAgo: '1d',
                metrics: { replies: 67, retweets: 234, likes: 456 }
            }
        ];
        
        let tweetsHtml = '';
        mockTweets.forEach((tweet, index) => {
            tweetsHtml += `
                <div class="tweet">
                    <div class="tweet-header">
                        <div class="tweet-avatar" style="background: linear-gradient(135deg, #1da1f2, #0d8bd9);">
                            ${user.charAt(0).toUpperCase()}
                        </div>
                        <div class="tweet-user-info">
                            <h4>@${user}</h4>
                            <div class="tweet-meta">
                                <span class="tweet-time">${tweet.timeAgo}</span>
                            </div>
                        </div>
                    </div>
                    <div class="tweet-content">${tweet.text}</div>
                    <div class="tweet-stats">
                        <div class="tweet-stat"><span>💬</span> ${tweet.metrics.replies}</div>
                        <div class="tweet-stat"><span>🔄</span> ${tweet.metrics.retweets}</div>
                        <div class="tweet-stat"><span>❤️</span> ${tweet.metrics.likes}</div>
                    </div>
                </div>
            `;
        });
        
        document.getElementById(`feed${id}`).innerHTML = tweetsHtml;
    }, 1500);
}

function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts of the same type to prevent spam
    const existingToasts = document.querySelectorAll(`.toast-${type}`);
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Enhanced styling with icons and better colors
    const colors = {
        success: { bg: '#00ff88', icon: '✅' },
        error: { bg: '#ff4757', icon: '❌' },
        warning: { bg: '#ffa502', icon: '⚠️' },
        info: { bg: '#00d4ff', icon: 'ℹ️' }
    };
    
    const color = colors[type] || colors.info;
    
    toast.innerHTML = `
        <span class="toast-icon">${color.icon}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close notification">×</button>
    `;
    
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${color.bg}; 
        color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000;
        font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex; align-items: center; gap: 8px; max-width: 400px;
        transform: translateX(400px); transition: transform 0.3s ease;
        font-family: Arial, sans-serif; font-size: 14px;
    `;
    
    // Add accessibility attributes
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    document.body.appendChild(toast);
    
    // Slide in animation
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });
    
    // Screen reader announcement
    announceToScreenReader(`${type}: ${message}`);
    
    // Auto-dismiss
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.transform = 'translateX(400px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }
    
    return toast;
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
    
    // Get original layout dimensions if available
    const originalLayout = getOriginalLayoutDimensions();
    
    wrappers.forEach(wrapper => {
        const widget = wrapper.querySelector('.widget');
        if (!widget) return;
        
        const widgetType = widget.dataset.type;
        const widgetId = wrapper.id;
        
        // Get original positioning data if available
        const originalData = originalLayout.widgets.find(w => w.id === widgetId);
        
        if (!originalData) {
            // Fallback to current behavior if no original data
            adjustWidgetFallback(wrapper, widgetType, viewportWidth, viewportHeight);
            return;
        }
        
        // YouTube-like responsive scaling based on original percentage positions
        let leftPercent = parseFloat(originalData.x);
        let topPercent = parseFloat(originalData.y);
        let widthPercent = parseFloat(originalData.width);
        let heightPercent = parseFloat(originalData.height);
        
        // Calculate new positions and sizes
        let newLeft = (leftPercent / 100) * viewportWidth;
        let newTop = (topPercent / 100) * viewportHeight;
        let newWidth = (widthPercent / 100) * viewportWidth;
        let newHeight = (heightPercent / 100) * viewportHeight;
        
        // Apply YouTube-like scaling for videos with strict limits
        if (widgetType === 'youtube' || widgetType === 'video' || widgetType === 'livestream') {
            // Calculate base dimensions
            const baseWidth = (widthPercent / 100) * viewportWidth;
            const scaleFactor = getVideoScaleFactor(viewportWidth);
            
            // Apply scaling with absolute maximum of 1000px
            const scaledWidth = baseWidth * scaleFactor;
            const maxWidth = Math.min(1000, viewportWidth * 0.8); // Never exceed 1000px or 80% of viewport
            newWidth = Math.max(320, Math.min(scaledWidth, maxWidth));
            newHeight = (newWidth / 16) * 9; // Maintain 16:9 aspect ratio
            
            // Ensure height doesn't exceed 70% of viewport
            const maxHeight = viewportHeight * 0.7;
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = (newHeight / 9) * 16;
            }
            
            // Adjust position to maintain relative placement
            const widthDiff = newWidth - (widthPercent / 100) * viewportWidth;
            newLeft = Math.max(10, newLeft - (widthDiff / 2)); // Keep centered
        } else {
            // Scale other widgets responsively
            const scaleFactor = getWidgetScaleFactor(widgetType, viewportWidth);
            const minWidth = getMinWidgetWidth_viewer(widgetType);
            const minHeight = getMinWidgetHeight_viewer(widgetType);
            const maxWidth = getMaxWidgetWidth_viewer(widgetType, viewportWidth);
            const maxHeight = getMaxWidgetHeight_viewer(widgetType, viewportHeight);
            
            newWidth = Math.max(minWidth, Math.min(newWidth * scaleFactor, maxWidth));
            newHeight = Math.max(minHeight, Math.min(newHeight * scaleFactor, maxHeight));
        }
        
        // Ensure widgets stay within viewport bounds
        newLeft = Math.max(10, Math.min(newLeft, viewportWidth - newWidth - 10));
        newTop = Math.max(10, Math.min(newTop, viewportHeight - newHeight - 10));
        
        // Apply smooth transitions
        wrapper.style.transition = 'all 0.3s ease';
        wrapper.style.left = newLeft + 'px';
        wrapper.style.top = newTop + 'px';
        wrapper.style.width = newWidth + 'px';
        wrapper.style.height = newHeight + 'px';
        
        // Clear transition after animation
        setTimeout(() => {
            wrapper.style.transition = '';
        }, 300);
    });
}

// YouTube-like video scaling factors with maximum size limits
function getVideoScaleFactor(viewportWidth) {
    if (viewportWidth <= 480) return 0.9; // Mobile: 90% width
    if (viewportWidth <= 768) return 0.8; // Tablet: 80% width
    if (viewportWidth <= 1024) return 0.7; // Small desktop: 70% width
    if (viewportWidth <= 1440) return 0.6; // Medium desktop: 60% width
    if (viewportWidth <= 1920) return 0.5; // Large desktop: 50% width
    return 0.4; // Ultra-wide: 40% width
}

// Widget scaling factors for non-video widgets
function getWidgetScaleFactor(widgetType, viewportWidth) {
    const baseScale = viewportWidth <= 768 ? 0.9 : viewportWidth <= 1440 ? 0.8 : 0.7;
    
    const typeMultipliers = {
        'crypto': 1.0,    // Tips widgets scale normally
        'twitter': 1.0,   // Social widgets scale normally  
        'instagram': 1.0,
        'discord': 1.0
    };
    
    return baseScale * (typeMultipliers[widgetType] || 1.0);
}

// Fallback adjustment for widgets without original data
function adjustWidgetFallback(wrapper, widgetType, viewportWidth, viewportHeight) {
    let currentLeft = parseInt(wrapper.style.left) || 0;
    let currentTop = parseInt(wrapper.style.top) || 0;
    let currentWidth = parseInt(wrapper.style.width) || 300;
    let currentHeight = parseInt(wrapper.style.height) || 200;
    
    const newLeft = Math.max(10, Math.min(currentLeft, viewportWidth - 100));
    const newTop = Math.max(10, Math.min(currentTop, viewportHeight - 100));
    
    wrapper.style.left = newLeft + 'px';
    wrapper.style.top = newTop + 'px';
}

// Store original layout dimensions for responsive scaling
let storedOriginalLayout = null;

function getOriginalLayoutDimensions() {
    if (!storedOriginalLayout) {
        // Try to get from current layout or localStorage
        const layoutData = localStorage.getItem('currentLayoutData');
        if (layoutData) {
            storedOriginalLayout = JSON.parse(layoutData);
        } else {
            storedOriginalLayout = { widgets: [] };
        }
    }
    return storedOriginalLayout;
}