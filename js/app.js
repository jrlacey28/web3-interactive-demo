// Web3 Interactive Demo - Main Application Logic with Snap Function
// This file contains all the core functionality for widget management,
// drag and drop, UI interactions, and layout management

let counter = 0;
let dragged = null;
let walletConnected = false;

// Snap configuration
const SNAP_THRESHOLD = 20; // Distance in pixels for snapping
const SNAP_GRID_SIZE = 10; // Grid size for grid snapping (optional)

// Visual snap indicators
let snapIndicators = {
    vertical: null,
    horizontal: null
};

let snapEnabled = true;

// ========================================
// SNAP FUNCTIONALITY
// ========================================

// Enhanced resize observer for snap-on-resize
let resizeObserver = null;

// Initialize resize observer for snap functionality
function initializeResizeSnap() {
    if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const wrapper = entry.target;
                if (wrapper.classList.contains('widget-wrapper') && wrapper.classList.contains('resizing')) {
                    const rect = wrapper.getBoundingClientRect();
                    const snapResult = calculateResizeSnapPosition(wrapper, rect.left, rect.top, rect.width, rect.height);
                    
                    if (snapResult.snappedWidth || snapResult.snappedHeight) {
                        wrapper.style.width = snapResult.width + 'px';
                        wrapper.style.height = snapResult.height + 'px';
                        wrapper.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.8)';
                    } else {
                        wrapper.style.boxShadow = '';
                        hideSnapIndicators();
                    }
                }
            });
        });
    }
}

// Calculate snap positions during resize
function calculateResizeSnapPosition(draggedWrapper, currentX, currentY, currentWidth, currentHeight) {
    if (!snapEnabled) {
        hideSnapIndicators();
        return { 
            width: currentWidth, 
            height: currentHeight, 
            snappedWidth: false, 
            snappedHeight: false 
        };
    }

    const otherWidgets = getWidgetPositions(draggedWrapper);
    
    let snapWidth = currentWidth;
    let snapHeight = currentHeight;
    let snappedToWidth = false;
    let snappedToHeight = false;
    
    let closestWidthDistance = SNAP_THRESHOLD;
    let closestHeightDistance = SNAP_THRESHOLD;
    let verticalSnapLine = null;
    let horizontalSnapLine = null;
    
    otherWidgets.forEach(widget => {
        // Width snapping - align right edges
        const rightEdgeDistance = Math.abs((currentX + currentWidth) - widget.right);
        if (rightEdgeDistance < closestWidthDistance) {
            closestWidthDistance = rightEdgeDistance;
            snapWidth = widget.right - currentX;
            verticalSnapLine = widget.right;
            snappedToWidth = true;
        }
        
        // Width snapping - align to left edge of another widget (right-side alignment)
        const leftEdgeDistance = Math.abs((currentX + currentWidth) - widget.left);
        if (leftEdgeDistance < closestWidthDistance) {
            closestWidthDistance = leftEdgeDistance;
            snapWidth = widget.left - currentX;
            verticalSnapLine = widget.left;
            snappedToWidth = true;
        }
        
        // Width snapping - match other widget widths
        const widthMatchDistance = Math.abs(currentWidth - widget.width);
        if (widthMatchDistance < closestWidthDistance) {
            closestWidthDistance = widthMatchDistance;
            snapWidth = widget.width;
            snappedToWidth = true;
        }
        
        // Height snapping - align bottom edges
        const bottomEdgeDistance = Math.abs((currentY + currentHeight) - widget.bottom);
        if (bottomEdgeDistance < closestHeightDistance) {
            closestHeightDistance = bottomEdgeDistance;
            snapHeight = widget.bottom - currentY;
            horizontalSnapLine = widget.bottom;
            snappedToHeight = true;
        }
        
        // Height snapping - match other widget heights
        const heightMatchDistance = Math.abs(currentHeight - widget.height);
        if (heightMatchDistance < closestHeightDistance) {
            closestHeightDistance = heightMatchDistance;
            snapHeight = widget.height;
            snappedToHeight = true;
        }
    });
    
    // Show snap indicators
    if (snappedToWidth && verticalSnapLine !== null) {
        showVerticalSnapIndicator(verticalSnapLine);
    }
    if (snappedToHeight && horizontalSnapLine !== null) {
        showHorizontalSnapIndicator(horizontalSnapLine);
    }
    
    // Ensure widgets don't exceed viewport
    const maxWidth = window.innerWidth - currentX;
    const maxHeight = window.innerHeight - currentY;
    
    snapWidth = Math.max(200, Math.min(snapWidth, maxWidth)); // Min width 200px
    snapHeight = Math.max(150, Math.min(snapHeight, maxHeight)); // Min height 150px
    
    return {
        width: snapWidth,
        height: snapHeight,
        snappedWidth: snappedToWidth,
        snappedHeight: snappedToHeight
    };
}

// Create snap indicator lines
function createSnapIndicators() {
    // Vertical snap line
    const verticalLine = document.createElement('div');
    verticalLine.style.cssText = `
        position: fixed;
        width: 2px;
        background: #00d4ff;
        box-shadow: 0 0 10px #00d4ff;
        opacity: 0.8;
        pointer-events: none;
        z-index: 9999;
        display: none;
        top: 0;
        height: 100vh;
    `;
    verticalLine.id = 'snap-vertical';
    document.body.appendChild(verticalLine);
    snapIndicators.vertical = verticalLine;

    // Horizontal snap line
    const horizontalLine = document.createElement('div');
    horizontalLine.style.cssText = `
        position: fixed;
        height: 2px;
        background: #00d4ff;
        box-shadow: 0 0 10px #00d4ff;
        opacity: 0.8;
        pointer-events: none;
        z-index: 9999;
        display: none;
        left: 0;
        width: 100vw;
    `;
    horizontalLine.id = 'snap-horizontal';
    document.body.appendChild(horizontalLine);
    snapIndicators.horizontal = horizontalLine;
}

// Hide snap indicators
function hideSnapIndicators() {
    if (snapIndicators.vertical) snapIndicators.vertical.style.display = 'none';
    if (snapIndicators.horizontal) snapIndicators.horizontal.style.display = 'none';
}

// Show vertical snap indicator
function showVerticalSnapIndicator(x) {
    if (snapIndicators.vertical) {
        snapIndicators.vertical.style.left = x + 'px';
        snapIndicators.vertical.style.display = 'block';
    }
}

// Show horizontal snap indicator
function showHorizontalSnapIndicator(y) {
    if (snapIndicators.horizontal) {
        snapIndicators.horizontal.style.top = y + 'px';
        snapIndicators.horizontal.style.display = 'block';
    }
}

// Performance optimized widget position cache
let widgetPositionsCache = new Map();
let cacheTimestamp = 0;
const CACHE_DURATION = 16; // ~60fps

// Get all widget positions and dimensions with caching
function getWidgetPositions(excludeWrapper = null) {
    const now = Date.now();
    const cacheKey = `positions_${excludeWrapper?.id || 'all'}`;
    
    // Use cache if it's still valid (within 16ms for 60fps)
    if (widgetPositionsCache.has(cacheKey) && (now - cacheTimestamp) < CACHE_DURATION) {
        return widgetPositionsCache.get(cacheKey);
    }
    
    const widgets = [];
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        if (wrapper === excludeWrapper) return;
        
        const rect = wrapper.getBoundingClientRect();
        
        widgets.push({
            element: wrapper,
            left: parseInt(wrapper.style.left) || 0,
            top: parseInt(wrapper.style.top) || 0,
            right: (parseInt(wrapper.style.left) || 0) + rect.width,
            bottom: (parseInt(wrapper.style.top) || 0) + rect.height,
            width: rect.width,
            height: rect.height
        });
    });
    
    // Cache the result
    widgetPositionsCache.set(cacheKey, widgets);
    cacheTimestamp = now;
    
    return widgets;
}

// Clear cache when widgets are modified
function clearWidgetPositionsCache() {
    widgetPositionsCache.clear();
    cacheTimestamp = 0;
}

// Calculate snap positions
function calculateSnapPosition(draggedWrapper, currentX, currentY) {
    if (!snapEnabled) {
        hideSnapIndicators();
        return { x: currentX, y: currentY, snappedX: false, snappedY: false };
    }

    const otherWidgets = getWidgetPositions(draggedWrapper);
    const draggedRect = draggedWrapper.getBoundingClientRect();
    
    const draggedRight = currentX + draggedRect.width;
    const draggedBottom = currentY + draggedRect.height;
    
    let snapX = currentX;
    let snapY = currentY;
    let snappedToVertical = false;
    let snappedToHorizontal = false;
    
    // Find closest snap positions
    let closestVerticalDistance = SNAP_THRESHOLD;
    let closestHorizontalDistance = SNAP_THRESHOLD;
    let verticalSnapLine = null;
    let horizontalSnapLine = null;
    
    otherWidgets.forEach(widget => {
        // Vertical alignment checks (outer edges only)
        const leftToLeftDistance = Math.abs(currentX - widget.left);
        const rightToRightDistance = Math.abs(draggedRight - widget.right);
        const leftToRightDistance = Math.abs(currentX - widget.right);
        const rightToLeftDistance = Math.abs(draggedRight - widget.left);
        
        // Check for left-to-left alignment
        if (leftToLeftDistance < closestVerticalDistance) {
            closestVerticalDistance = leftToLeftDistance;
            snapX = widget.left;
            verticalSnapLine = widget.left;
            snappedToVertical = true;
        }
        
        // Check for right-to-right alignment
        if (rightToRightDistance < closestVerticalDistance) {
            closestVerticalDistance = rightToRightDistance;
            snapX = widget.right - draggedRect.width;
            verticalSnapLine = widget.right;
            snappedToVertical = true;
        }
        
        // Check for center-to-center vertical alignment
        const centerXDistance = Math.abs((currentX + draggedRect.width/2) - (widget.left + widget.width/2));
        if (centerXDistance < closestVerticalDistance) {
            closestVerticalDistance = centerXDistance;
            snapX = widget.left + widget.width/2 - draggedRect.width/2;
            verticalSnapLine = widget.left + widget.width/2;
            snappedToVertical = true;
        }
        
        // Check for left-to-right alignment (spacing)
        if (leftToRightDistance < closestVerticalDistance) {
            closestVerticalDistance = leftToRightDistance;
            snapX = widget.right;
            verticalSnapLine = widget.right;
            snappedToVertical = true;
        }
        
        // Check for right-to-left alignment (spacing)
        if (rightToLeftDistance < closestVerticalDistance) {
            closestVerticalDistance = rightToLeftDistance;
            snapX = widget.left - draggedRect.width;
            verticalSnapLine = widget.left;
            snappedToVertical = true;
        }
        
        // Horizontal alignment checks (outer edges only)
        const topToTopDistance = Math.abs(currentY - widget.top);
        const bottomToBottomDistance = Math.abs(draggedBottom - widget.bottom);
        const topToBottomDistance = Math.abs(currentY - widget.bottom);
        const bottomToTopDistance = Math.abs(draggedBottom - widget.top);
        
        // Check for top-to-top alignment
        if (topToTopDistance < closestHorizontalDistance) {
            closestHorizontalDistance = topToTopDistance;
            snapY = widget.top;
            horizontalSnapLine = widget.top;
            snappedToHorizontal = true;
        }
        
        // Check for bottom-to-bottom alignment
        if (bottomToBottomDistance < closestHorizontalDistance) {
            closestHorizontalDistance = bottomToBottomDistance;
            snapY = widget.bottom - draggedRect.height;
            horizontalSnapLine = widget.bottom;
            snappedToHorizontal = true;
        }
        
        // Check for center-to-center horizontal alignment
        const centerYDistance = Math.abs((currentY + draggedRect.height/2) - (widget.top + widget.height/2));
        if (centerYDistance < closestHorizontalDistance) {
            closestHorizontalDistance = centerYDistance;
            snapY = widget.top + widget.height/2 - draggedRect.height/2;
            horizontalSnapLine = widget.top + widget.height/2;
            snappedToHorizontal = true;
        }
    });
    
    // Add viewport center snapping
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const VIEWPORT_SNAP_THRESHOLD = 30;
    
    // Check for vertical center alignment with viewport
    const draggedCenterX = currentX + draggedRect.width/2;
    const centerXViewportDistance = Math.abs(draggedCenterX - viewportCenterX);
    if (centerXViewportDistance < VIEWPORT_SNAP_THRESHOLD && centerXViewportDistance < closestVerticalDistance) {
        closestVerticalDistance = centerXViewportDistance;
        snapX = viewportCenterX - draggedRect.width/2;
        verticalSnapLine = viewportCenterX;
        snappedToVertical = true;
    }
    
    // Check for horizontal center alignment with viewport  
    const draggedCenterY = currentY + draggedRect.height/2;
    const centerYViewportDistance = Math.abs(draggedCenterY - viewportCenterY);
    if (centerYViewportDistance < VIEWPORT_SNAP_THRESHOLD && centerYViewportDistance < closestHorizontalDistance) {
        closestHorizontalDistance = centerYViewportDistance;
        snapY = viewportCenterY - draggedRect.height/2;
        horizontalSnapLine = viewportCenterY;
        snappedToHorizontal = true;
    }
    
    // Show snap indicators
    if (snappedToVertical && verticalSnapLine !== null) {
        showVerticalSnapIndicator(verticalSnapLine);
    }
    if (snappedToHorizontal && horizontalSnapLine !== null) {
        showHorizontalSnapIndicator(horizontalSnapLine);
    }
    
    // Ensure widgets don't go outside viewport
    const maxX = window.innerWidth - draggedRect.width;
    const maxY = window.innerHeight - draggedRect.height;
    
    snapX = Math.max(0, Math.min(snapX, maxX));
    snapY = Math.max(0, Math.min(snapY, maxY));
    
    return {
        x: snapX,
        y: snapY,
        snappedX: snappedToVertical,
        snappedY: snappedToHorizontal
    };
}

// Add CSS for snap functionality
function addSnapCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .widget-wrapper.dragging {
            opacity: 0.9;
            transform: scale(1.02);
            transition: none;
        }
        
        .widget-wrapper {
            transition: transform 0.1s ease;
        }
        
        /* Snap indicator animations */
        #snap-vertical, #snap-horizontal {
            animation: snapPulse 0.3s ease-in-out;
        }
        
        @keyframes snapPulse {
            0% { opacity: 0; transform: scale(0.8); }
            100% { opacity: 0.8; transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}

// ========================================
// RESPONSIVE WINDOW HANDLING - ENHANCED
// ========================================

// Store original positions as percentages for responsive scaling
let originalPositions = new Map();

// Function to store widget positions as percentages
function storeWidgetPositions() {
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        const rect = wrapper.getBoundingClientRect();
        const currentLeft = parseInt(wrapper.style.left) || 0;
        const currentTop = parseInt(wrapper.style.top) || 0;
        
        originalPositions.set(wrapper.id, {
            leftPercent: (currentLeft / window.innerWidth) * 100,
            topPercent: (currentTop / window.innerHeight) * 100,
            widthPercent: (rect.width / window.innerWidth) * 100,
            heightPercent: (rect.height / window.innerHeight) * 100
        });
    });
}

// Enhanced window resize handler
window.addEventListener('resize', function() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        const storedPos = originalPositions.get(wrapper.id);
        
        if (storedPos) {
            // Calculate new positions based on stored percentages
            const newLeft = Math.max(0, Math.min(
                (storedPos.leftPercent / 100) * viewportWidth,
                viewportWidth - 200 // Minimum space on right
            ));
            const newTop = Math.max(0, Math.min(
                (storedPos.topPercent / 100) * viewportHeight,
                viewportHeight - 150 // Minimum space on bottom
            ));
            
            wrapper.style.left = newLeft + 'px';
            wrapper.style.top = newTop + 'px';
            
            // Scale widget size proportionally but maintain aspect ratios
            const widget = wrapper.querySelector('.widget');
            const widgetType = widget.dataset.type;
            
            if (widgetType === 'youtube' || widgetType === 'video') {
                // For video widgets, maintain 16:9 aspect ratio
                const newWidth = Math.max(320, Math.min(
                    (storedPos.widthPercent / 100) * viewportWidth,
                    viewportWidth - newLeft - 20
                ));
                const newHeight = (newWidth / 16) * 9; // Maintain 16:9
                
                wrapper.style.width = newWidth + 'px';
                wrapper.style.height = newHeight + 'px';
                widget.style.width = newWidth + 'px';
                widget.style.height = newHeight + 'px';
            } else {
                // For other widgets, scale proportionally
                const newWidth = Math.max(250, Math.min(
                    (storedPos.widthPercent / 100) * viewportWidth,
                    viewportWidth - newLeft - 20
                ));
                const newHeight = Math.max(150, Math.min(
                    (storedPos.heightPercent / 100) * viewportHeight,
                    viewportHeight - newTop - 20
                ));
                
                wrapper.style.width = newWidth + 'px';
                wrapper.style.height = newHeight + 'px';
                widget.style.width = newWidth + 'px';
                widget.style.height = newHeight + 'px';
            }
        } else {
            // Fallback for widgets without stored positions
            const rect = wrapper.getBoundingClientRect();
            
            if (rect.right > viewportWidth) {
                wrapper.style.left = Math.max(0, viewportWidth - rect.width - 20) + 'px';
            }
            if (rect.bottom > viewportHeight) {
                wrapper.style.top = Math.max(0, viewportHeight - rect.height - 20) + 'px';
            }
        }
    });
    
    // Sync all headers after window resize
    setTimeout(() => syncAllHeaders(), 100);
});

// Store positions when widgets are moved or created
function updateStoredPosition(wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const currentLeft = parseInt(wrapper.style.left) || 0;
    const currentTop = parseInt(wrapper.style.top) || 0;
    
    originalPositions.set(wrapper.id, {
        leftPercent: (currentLeft / window.innerWidth) * 100,
        topPercent: (currentTop / window.innerHeight) * 100,
        widthPercent: (rect.width / window.innerWidth) * 100,
        heightPercent: (rect.height / window.innerHeight) * 100
    });
    
    // Ensure header matches widget width
    syncHeaderWidth(wrapper);
}

// Synchronize header width with widget width
function syncHeaderWidth(wrapper) {
    const header = wrapper.querySelector('.widget-header');
    const widget = wrapper.querySelector('.widget');
    
    if (header && widget) {
        // Match header width exactly to widget width (not wrapper)
        const widgetRect = widget.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        
        const widgetWidth = widget.offsetWidth;
        const leftOffset = widget.offsetLeft || 0;
        
        header.style.left = leftOffset + 'px';
        header.style.width = widgetWidth + 'px';
        header.style.right = 'auto';
        header.style.boxSizing = 'border-box';
    }
}

// Sync all widget headers
function syncAllHeaders() {
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        syncHeaderWidth(wrapper);
    });
}

// ========================================
// CORE APPLICATION FUNCTIONS
// ========================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.toggle');
    const snapToggle = document.querySelector('.snap-toggle');
    
    sidebar.classList.toggle('open');
    
    // Hide/show toggle and snap buttons when sidebar opens/closes
    if (sidebar.classList.contains('open')) {
        toggle.style.opacity = '0';
        toggle.style.pointerEvents = 'none';
        toggle.style.transform = 'translateX(-20px)';
        
        if (snapToggle) {
            snapToggle.style.opacity = '0';
            snapToggle.style.pointerEvents = 'none';
            snapToggle.style.transform = 'translateX(-20px)';
        }
    } else {
        toggle.style.opacity = '1';
        toggle.style.pointerEvents = 'auto';
        toggle.style.transform = 'translateX(0)';
        
        if (snapToggle) {
            snapToggle.style.opacity = '1';
            snapToggle.style.pointerEvents = 'auto';
            snapToggle.style.transform = 'translateX(0)';
        }
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.toggle');
    const snapToggle = document.querySelector('.snap-toggle');
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        
        toggle.style.opacity = '1';
        toggle.style.pointerEvents = 'auto';
        toggle.style.transform = 'translateX(0)';
        
        if (snapToggle) {
            snapToggle.style.opacity = '1';
            snapToggle.style.pointerEvents = 'auto';
            snapToggle.style.transform = 'translateX(0)';
        }
    }
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

// Function to capture widget content state for preservation
function captureWidgetState(widget) {
    const state = {};
    const widgetType = widget.dataset.type;
    const widgetId = widget.id;
    
    // Extract widget counter from ID
    const counter = widgetId.replace('w', '');
    
    switch(widgetType) {
        case 'youtube':
            const ytInput = document.getElementById(`yt${counter}`);
            const ytContent = document.getElementById(`ytc${counter}`);
            if (ytInput && ytContent) {
                state.youtubeUrl = ytInput.value;
                state.youtubeContent = ytContent.innerHTML;
                state.videoLoaded = widget.classList.contains('video-loaded');
            }
            break;
            
        case 'crypto':
            const msgInput = document.getElementById(`msg${counter}`);
            const amtInput = document.getElementById(`amt${counter}`);
            const result = document.getElementById(`result${counter}`);
            if (msgInput) state.message = msgInput.value;
            if (amtInput) state.amount = amtInput.value;
            if (result) state.result = result.innerHTML;
            break;
            
        case 'twitter':
            const userInput = document.getElementById(`user${counter}`);
            const feed = document.getElementById(`feed${counter}`);
            if (userInput) state.username = userInput.value;
            if (feed) state.feedContent = feed.innerHTML;
            break;
    }
    
    return state;
}

function saveLayout() {
    const widgets = [];
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        const widget = wrapper.querySelector('.widget');
        const widgetData = {
            id: wrapper.id,
            type: widget.dataset.type,
            x: wrapper.style.left,
            y: wrapper.style.top,
            width: wrapper.style.width,
            height: wrapper.style.height,
            state: captureWidgetState(widget) // Capture content state
        };
        widgets.push(widgetData);
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

function publishLayout() {
    // Get current layout
    const widgets = [];
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        const widget = wrapper.querySelector('.widget');
        const widgetData = {
            id: wrapper.id,
            type: widget.dataset.type,
            x: wrapper.style.left,
            y: wrapper.style.top,
            width: wrapper.style.width,
            height: wrapper.style.height,
            state: captureWidgetState(widget) // Capture content state
        };
        widgets.push(widgetData);
    });
    
    // Generate unique layout ID
    const layoutId = 'layout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const layout = {
        id: layoutId,
        widgets: widgets,
        background: document.getElementById('bg').style.backgroundImage || 
                   document.getElementById('bg').style.background,
        timestamp: new Date().toISOString(),
        published: true,
        creatorName: 'Anonymous Creator' // In production, this would come from user auth
    };
    
    // Save as published layout
    localStorage.setItem('web3DemoPublishedLayout', JSON.stringify(layout));
    localStorage.setItem(layoutId, JSON.stringify(layout));
    
    // Generate shareable URL
    const baseUrl = window.location.origin + window.location.pathname.replace('creator.html', '');
    const shareableUrl = `${baseUrl}viewer.html?layout=${layoutId}`;
    
    // Show success message with shareable link
    showPublishSuccessModal(shareableUrl);
    
    // Update button
    const btn = document.querySelector('.publish-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Published!';
    btn.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
    }, 3000);
}

function showPublishSuccessModal(shareableUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
        align-items: center; justify-content: center; backdrop-filter: blur(10px);
    `;
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); 
                    backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2);
                    padding: 40px; border-radius: 20px; text-align: center; max-width: 600px; color: white;">
            <h2 style="color: #00ff88; margin-bottom: 20px; font-size: 2rem;">🚀 Published Successfully!</h2>
            <p style="margin: 20px 0; font-size: 1.1rem; line-height: 1.6;">
                Your interactive stream layout is now live! Share this link with your audience:
            </p>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin: 20px 0; 
                        border: 1px solid rgba(0,212,255,0.3); word-break: break-all;">
                <input id="shareableLink" value="${shareableUrl}" readonly 
                       style="background: transparent; border: none; color: #00d4ff; width: 100%; 
                              font-family: monospace; text-align: center; font-size: 0.9rem; padding: 5px;">
            </div>
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">
                <button onclick="copyToClipboard('${shareableUrl}')" 
                        style="background: linear-gradient(135deg, #00d4ff, #0099cc); color: white; 
                               border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; 
                               font-weight: bold; transition: all 0.3s ease;">
                    📋 Copy Link
                </button>
                <button onclick="window.open('${shareableUrl}', '_blank')" 
                        style="background: linear-gradient(135deg, #00ff88, #00cc6a); color: white; 
                               border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; 
                               font-weight: bold; transition: all 0.3s ease;">
                    👁️ Preview
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="background: rgba(255,255,255,0.2); color: white; border: none; 
                               padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    Close
                </button>
            </div>
            <p style="margin-top: 25px; font-size: 0.9rem; color: rgba(255,255,255,0.7);">
                💡 Tip: Bookmark this link or save it somewhere safe. You can share it on social media, 
                embed it in your stream, or send it to your audience!
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-select the link for easy copying
    setTimeout(() => {
        document.getElementById('shareableLink').select();
    }, 100);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ Link copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('✅ Link copied to clipboard!', 'success');
    });
}

// ========================================
// BACKGROUND MANAGEMENT - SIMPLIFIED
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Background file upload handler
    const bgFileInput = document.getElementById('bgFile');
    if (bgFileInput) {
        bgFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('bg').style.backgroundImage = `url(${e.target.result})`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// Simplified preset function - no URL input needed
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
    wrapper.style.left = Math.max(0, x) + 'px';
    wrapper.style.top = Math.max(0, y) + 'px';
    wrapper.style.position = 'absolute';
    wrapper.id = `wrapper${counter}`;
    
    // Set initial size based on widget type - smaller default sizes
    if (type === 'youtube' || type === 'video') {
        wrapper.style.width = '320px';
        wrapper.style.height = '180px'; // 16:9 ratio (320 * 9/16 = 180)
    } else {
        wrapper.style.width = '300px';
        wrapper.style.height = '200px';
    }
    
    // Create widget
    const widget = document.createElement('div');
    widget.className = 'widget glow';
    widget.id = `w${counter}`;
    widget.dataset.type = type;
    
    // Set widget size to match wrapper
    widget.style.width = wrapper.style.width;
    widget.style.height = wrapper.style.height;

    let content = '';
    let title = '';

    switch(type) {
        case 'youtube':
            title = 'YouTube';
            content = `
                <div class="upload-section">
                    <input class="input" id="yt${counter}" placeholder="Enter YouTube URL">
                    <button class="youtube-load-btn" onclick="loadYT(${counter})">Load Video</button>
                </div>
                <div id="ytc${counter}"></div>
                <button class="video-overlay" onclick="resetYT(${counter})">×</button>
            `;
            break;
            
        case 'video':
            title = 'Video Upload';
            content = `
                <div class="video-upload-section">
                    <div class="file-upload centered-upload">
                        <input type="file" id="vidFile${counter}" accept="video/*" onchange="loadVid(${counter})">
                        <label for="vidFile${counter}" class="video-upload-btn">Upload Video</label>
                    </div>
                </div>
                <div id="vidc${counter}"></div>
                <button class="video-overlay" onclick="resetVid(${counter})">×</button>
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
    makeWidgetDraggable(wrapper, header);
    enableResizeSnap(wrapper); // Add resize snap functionality
    // Auto-enable clean mode for new widgets
    enableCleanModeByDefault(widget);
    // Apply initial styling including blur effect
    updateWidgetStyle(widget.id);
    // Store initial position for responsive scaling and sync header
    setTimeout(() => {
        updateStoredPosition(wrapper);
        syncHeaderWidth(wrapper);
    }, 100);
}

// Resize snapping functionality with 16:9 aspect ratio enforcement
function enableResizeSnap(wrapper) {
    const widget = wrapper.querySelector('.widget');
    const widgetType = widget.dataset.type;
    
    // Create resize functionality for ALL widgets
    {
        // Add resize corner handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'video-resize-handle';
        resizeHandle.innerHTML = '↘';
        resizeHandle.style.cssText = `
            position: absolute;
            bottom: 5px;
            right: 5px;
            width: 20px;
            height: 20px;
            background: rgba(0, 212, 255, 0.8);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: se-resize;
            border-radius: 4px;
            font-size: 12px;
            z-index: 100;
            user-select: none;
            pointer-events: auto;
        `;
        
        // Ensure wrapper has proper positioning context for resize handle
        wrapper.style.position = 'absolute';
        
        // Add resize handle after a small delay to ensure proper positioning
        setTimeout(() => {
            wrapper.appendChild(resizeHandle);
        }, 50);
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = wrapper.offsetWidth;
            startHeight = wrapper.offsetHeight;
            
            wrapper.classList.add('resizing');
            
            const handleMouseMove = (e) => {
                if (!isResizing) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newWidth, newHeight;
                
                if (widgetType === 'youtube' || widgetType === 'video') {
                    // Video widgets: maintain 16:9 aspect ratio
                    newWidth = Math.max(320, startWidth + deltaX);
                    newHeight = (newWidth / 16) * 9;
                    
                    // Ensure it doesn't exceed viewport
                    const maxWidth = window.innerWidth - parseInt(wrapper.style.left);
                    const maxHeight = window.innerHeight - parseInt(wrapper.style.top);
                    
                    if (newWidth > maxWidth) {
                        newWidth = maxWidth;
                        newHeight = (newWidth / 16) * 9;
                    }
                    
                    if (newHeight > maxHeight) {
                        newHeight = maxHeight;
                        newWidth = (newHeight / 9) * 16;
                    }
                } else {
                    // Other widgets: free resize
                    newWidth = Math.max(250, startWidth + deltaX);
                    newHeight = Math.max(150, startHeight + deltaY);
                    
                    // Ensure it doesn't exceed viewport
                    const maxWidth = window.innerWidth - parseInt(wrapper.style.left);
                    const maxHeight = window.innerHeight - parseInt(wrapper.style.top);
                    
                    newWidth = Math.min(newWidth, maxWidth);
                    newHeight = Math.min(newHeight, maxHeight);
                }
                
                wrapper.style.width = newWidth + 'px';
                wrapper.style.height = newHeight + 'px';
                widget.style.width = newWidth + 'px';
                widget.style.height = newHeight + 'px';
                
                // Immediately sync header width during resize
                syncHeaderWidth(wrapper);
            };
            
            const handleMouseUp = () => {
                isResizing = false;
                wrapper.classList.remove('resizing');
                updateStoredPosition(wrapper);
                syncHeaderWidth(wrapper); // Final sync after resize
                
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
    }
}

// ========================================
// WIDGET DRAGGING FUNCTIONALITY WITH SNAP
// ========================================

function makeWidgetDraggable(wrapper, header) {
    let isDragging = false, startX, startY, startLeft, startTop;

    // Prevent content area and widget body from being draggable
    const content = wrapper.querySelector('.content');
    const widget = wrapper.querySelector('.widget');
    
    if (content) {
        content.addEventListener('mousedown', function(e) {
            // Stop drag events from bubbling up from content area
            e.stopPropagation();
            e.preventDefault();
        });
        content.draggable = false;
        content.style.userSelect = 'none';
        content.style.pointerEvents = 'auto'; // Allow content interaction
    }
    
    if (widget) {
        widget.addEventListener('mousedown', function(e) {
            // Only allow dragging from header, block everything else
            if (!e.target.closest('.widget-header')) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
        widget.draggable = false;
        widget.style.pointerEvents = 'none'; // Block widget body interaction except for inputs
        
        // Ensure inputs and interactive elements work
        const inputs = widget.querySelectorAll('input, textarea, button, select');
        inputs.forEach(input => {
            input.style.pointerEvents = 'auto';
            input.style.userSelect = 'auto';
            input.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent dragging when interacting with inputs
            });
            input.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent dragging when clicking inputs
            });
        });
    }

    header.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('close') || e.target.classList.contains('style-btn')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(wrapper.style.left) || 0;
        startTop = parseInt(wrapper.style.top) || 0;
        wrapper.style.zIndex = '1001';
        
        // Add dragging class for visual feedback
        wrapper.classList.add('dragging');

        let dragTimeout;
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            let newX = startLeft + e.clientX - startX;
            let newY = startTop + e.clientY - startY;
            
            // Apply boundary constraints - prevent header from going beyond body boundaries
            const wrapperRect = wrapper.getBoundingClientRect();
            const canvasRect = document.getElementById('canvas').getBoundingClientRect();
            
            // Ensure widget stays within canvas boundaries
            newX = Math.max(0, Math.min(newX, canvasRect.width - wrapperRect.width));
            newY = Math.max(0, Math.min(newY, canvasRect.height - wrapperRect.height));
            
            // Apply position immediately for smooth dragging
            wrapper.style.left = newX + 'px';
            wrapper.style.top = newY + 'px';
            
            // Debounce snap calculations for performance
            clearTimeout(dragTimeout);
            dragTimeout = setTimeout(() => {
                // Calculate snap position
                const snapResult = calculateSnapPosition(wrapper, newX, newY);
                
                // Apply snapped position if different
                if (snapResult.x !== newX || snapResult.y !== newY) {
                    wrapper.style.left = snapResult.x + 'px';
                    wrapper.style.top = snapResult.y + 'px';
                }
                
                // Visual feedback for snapping
                if (snapResult.snappedX || snapResult.snappedY) {
                    wrapper.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.8)';
                } else {
                    wrapper.style.boxShadow = '';
                    hideSnapIndicators();
                }
            }, 10); // 10ms debounce for smooth performance
        };

        const handleMouseUp = () => {
            isDragging = false;
            wrapper.style.zIndex = '';
            wrapper.style.boxShadow = '';
            wrapper.classList.remove('dragging');
            hideSnapIndicators();
            
            // Clear any pending drag timeout
            clearTimeout(dragTimeout);
            
            // Clear position cache since widget moved
            clearWidgetPositionsCache();
            
            // Store the new position for responsive scaling
            updateStoredPosition(wrapper);
            
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
    
    // Add blur effect based on transparency (more blur = less opacity)
    const blurAmount = (1 - opacity) * 8; // Max 8px blur when fully transparent
    widget.style.backdropFilter = `blur(${blurAmount}px)`;
    widget.style.webkitBackdropFilter = `blur(${blurAmount}px)`; // Safari support
    
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
    const uploadSection = widget.querySelector('.video-upload-section');
    
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        const url = URL.createObjectURL(file);
        
        // Create video element with controls and reset button like YouTube widget
        content.innerHTML = `
            <video controls style="width: 100%; height: 100%; object-fit: cover;">
                <source src="${url}" type="${file.type}">
                Your browser does not support the video tag.
            </video>
            <button class="video-overlay" onclick="resetVid(${id})">×</button>
        `;
        
        // Hide upload section and mark as loaded
        if (uploadSection) {
            uploadSection.style.display = 'none';
        }
        widget.classList.add('video-loaded');
    }
}

function resetVid(id) {
    const widget = document.getElementById(`w${id.toString().split('vid')[0] || id}`);
    const content = document.getElementById(`vidc${id}`);
    const input = document.getElementById(`vidFile${id}`);
    const uploadSection = widget.querySelector('.video-upload-section');
    
    widget.classList.remove('video-loaded');
    content.innerHTML = '';
    if (input) input.value = '';
    
    // Show upload section again
    if (uploadSection) {
        uploadSection.style.display = 'block';
    }
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
// SNAP TOGGLE BUTTON INITIALIZATION
// ========================================

function createSnapToggleButton() {
    const snapToggle = document.createElement('button');
    snapToggle.className = 'snap-toggle';
    snapToggle.innerHTML = '🧲';
    snapToggle.title = 'Toggle Snap (Currently ON)';
    
    snapToggle.addEventListener('click', function() {
        snapEnabled = !snapEnabled;
        if (snapEnabled) {
            snapToggle.classList.remove('disabled');
            snapToggle.title = 'Toggle Snap (Currently ON)';
        } else {
            snapToggle.classList.add('disabled');
            snapToggle.title = 'Toggle Snap (Currently OFF)';
            hideSnapIndicators();
        }
    });
    
    document.body.appendChild(snapToggle);
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize with demo widget when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize snap functionality
    createSnapIndicators();
    addSnapCSS();
    createSnapToggleButton();
    initializeResizeSnap(); // Initialize resize snap functionality
    
    // Close button is now in HTML
    
    // Click outside sidebar to close
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.querySelector('.toggle');
        
        if (sidebar && sidebar.classList.contains('open')) {
            // If click is outside sidebar and not on the toggle button
            if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                closeSidebar();
            }
        }
    });
    
    // Create a demo crypto widget after a short delay
    setTimeout(() => {
        createWidget('crypto', 100, 100);
        // Sync all headers after widgets are created
        setTimeout(() => syncAllHeaders(), 200);
    }, 1000);
    
    // Load saved layout if it exists
    const savedLayout = localStorage.getItem('web3DemoLayout');
    if (savedLayout) {
        // Could implement layout restoration here
        console.log('Saved layout found:', savedLayout);
    }
});

// ========================================
// LAYOUT SAVE AND PUBLISH FUNCTIONS
// ========================================

function saveLayout() {
    const layout = captureLayoutState();
    localStorage.setItem('web3DemoLayout', JSON.stringify(layout));
    showToast('✅ Layout saved!', 'success');
}

function publishLayout() {
    const layout = captureLayoutState();
    localStorage.setItem('web3DemoPublishedLayout', JSON.stringify(layout));
    showToast('🚀 Layout published!', 'success');
    
    // Open viewer page in new tab
    setTimeout(() => {
        window.open('viewer.html?layout=demo', '_blank');
    }, 1000);
}

function captureLayoutState() {
    const widgets = [];
    const wrappers = document.querySelectorAll('.widget-wrapper');
    
    wrappers.forEach((wrapper, index) => {
        const widget = wrapper.querySelector('.widget');
        const widgetType = widget.dataset.type;
        
        const widgetData = {
            id: wrapper.id,
            type: widgetType,
            x: wrapper.style.left,
            y: wrapper.style.top,
            width: wrapper.style.width,
            height: wrapper.style.height,
            state: captureWidgetState(widget, widgetType, index + 1)
        };
        
        widgets.push(widgetData);
    });
    
    const bgElement = document.getElementById('bg');
    const background = bgElement.style.background || bgElement.style.backgroundImage;
    
    return {
        widgets: widgets,
        background: background,
        timestamp: new Date().toISOString(),
        creatorName: 'Anonymous Creator'
    };
}

function captureWidgetState(widget, widgetType, counter) {
    const state = {};
    
    switch(widgetType) {
        case 'youtube':
            const ytInput = document.getElementById(`yt${counter}`);
            const ytContent = document.getElementById(`ytc${counter}`);
            if (ytInput && ytInput.value) {
                state.youtubeUrl = ytInput.value;
                state.youtubeContent = ytContent ? ytContent.innerHTML : '';
                state.videoLoaded = widget.classList.contains('video-loaded');
            }
            break;
            
        case 'video':
            const vidContent = document.getElementById(`vidc${counter}`);
            if (vidContent && vidContent.innerHTML.trim()) {
                state.videoContent = vidContent.innerHTML;
                state.videoLoaded = widget.classList.contains('video-loaded');
            }
            break;
            
        case 'crypto':
            const msgInput = document.getElementById(`msg${counter}`);
            const amtInput = document.getElementById(`amt${counter}`);
            const result = document.getElementById(`result${counter}`);
            
            if (msgInput && msgInput.value) state.message = msgInput.value;
            if (amtInput && amtInput.value) state.amount = amtInput.value;
            if (result && result.innerHTML) state.result = result.innerHTML;
            break;
            
        case 'twitter':
            const userInput = document.getElementById(`user${counter}`);
            const feed = document.getElementById(`feed${counter}`);
            
            if (userInput && userInput.value) state.username = userInput.value;
            if (feed && feed.innerHTML !== 'Enter a username and click "Load Real Feed"') {
                state.feedContent = feed.innerHTML;
            }
            break;
    }
    
    return state;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#00ff88' : type === 'error' ? '#ff4757' : '#00d4ff';
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${bgColor};
        color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000;
        font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}