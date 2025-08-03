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

// Enhanced window resize handler with collision detection
window.addEventListener('resize', function() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const MIN_SPACING = 20;
    
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        const storedPos = originalPositions.get(wrapper.id);
        
        if (storedPos) {
            // Calculate new positions based on stored percentages
            let newLeft = Math.max(0, Math.min(
                (storedPos.leftPercent / 100) * viewportWidth,
                viewportWidth - 200 // Minimum space on right
            ));
            let newTop = Math.max(0, Math.min(
                (storedPos.topPercent / 100) * viewportHeight,
                viewportHeight - 150 // Minimum space on bottom
            ));
            
            // Scale widget size proportionally but maintain aspect ratios
            const widget = wrapper.querySelector('.widget');
            const widgetType = widget.dataset.type;
            
            let newWidth, newHeight;
            
            if (widgetType === 'youtube' || widgetType === 'video') {
                // For video widgets, maintain 16:9 aspect ratio
                newWidth = Math.max(320, Math.min(
                    (storedPos.widthPercent / 100) * viewportWidth,
                    viewportWidth - newLeft - MIN_SPACING
                ));
                newHeight = (newWidth / 16) * 9; // Maintain 16:9
            } else {
                // For other widgets, scale proportionally
                newWidth = Math.max(250, Math.min(
                    (storedPos.widthPercent / 100) * viewportWidth,
                    viewportWidth - newLeft - MIN_SPACING
                ));
                newHeight = Math.max(150, Math.min(
                    (storedPos.heightPercent / 100) * viewportHeight,
                    viewportHeight - newTop - MIN_SPACING
                ));
            }
            
            // Check for collisions and adjust position if necessary
            const adjustedPosition = checkWidgetPositionCollisions(wrapper, newLeft, newTop, newWidth, newHeight, MIN_SPACING);
            newLeft = adjustedPosition.left;
            newTop = adjustedPosition.top;
            
            // Apply final positions and sizes
            wrapper.style.left = newLeft + 'px';
            wrapper.style.top = newTop + 'px';
            wrapper.style.width = newWidth + 'px';
            wrapper.style.height = newHeight + 'px';
            widget.style.width = newWidth + 'px';
            widget.style.height = newHeight + 'px';
            
        } else {
            // Fallback for widgets without stored positions
            const rect = wrapper.getBoundingClientRect();
            
            if (rect.right > viewportWidth) {
                wrapper.style.left = Math.max(0, viewportWidth - rect.width - MIN_SPACING) + 'px';
            }
            if (rect.bottom > viewportHeight) {
                wrapper.style.top = Math.max(0, viewportHeight - rect.height - MIN_SPACING) + 'px';
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
    widget.className = 'widget';
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
                    <button class="send-tip-btn" id="sendBtn${counter}" onclick="sendTip(${counter})" disabled>
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
            
        case 'square':
            title = 'Square';
            content = `
                <div class="shape-content">
                    <div class="shape square-shape"></div>
                </div>
            `;
            break;
            
        case 'circle':
            title = 'Circle';
            content = `
                <div class="shape-content">
                    <div class="shape circle-shape"></div>
                </div>
            `;
            break;
            
        case 'triangle':
            title = 'Triangle';
            content = `
                <div class="shape-content">
                    <div class="shape triangle-shape"></div>
                </div>
            `;
            break;
    }

    // Create header (now outside widget)
    const header = document.createElement('div');
    header.className = 'widget-header';
    const showCustomization = type !== 'youtube' && type !== 'video';
    
    header.innerHTML = `
        <span>${title}</span>
        <div class="header-controls">
            ${showCustomization ? '<button class="style-btn" onclick="toggleStylePanel(\'' + widget.id + '\')" title="Customize">🎨</button>' : ''}
            <button class="close" onclick="remove('${widget.id}')">×</button>
        </div>
    `;
    // Widget content (without embedded style panel)
    widget.innerHTML = `
        <div class="content">
            ${content}
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

// Function to check for widget collisions and maintain spacing during resize
function checkWidgetCollisions(currentWrapper, x, y, width, height, minSpacing) {
    const otherWidgets = [];
    
    // Get all other widgets
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        if (wrapper === currentWrapper) return;
        
        const rect = wrapper.getBoundingClientRect();
        const wrapperLeft = parseInt(wrapper.style.left) || 0;
        const wrapperTop = parseInt(wrapper.style.top) || 0;
        
        otherWidgets.push({
            left: wrapperLeft,
            top: wrapperTop,
            right: wrapperLeft + rect.width,
            bottom: wrapperTop + rect.height,
            width: rect.width,
            height: rect.height
        });
    });
    
    let constrainedWidth = width;
    let constrainedHeight = height;
    
    // Check potential collisions with proposed size
    const proposedRight = x + width;
    const proposedBottom = y + height;
    
    otherWidgets.forEach(other => {
        // Check if widgets would overlap or be too close
        const horizontalOverlap = !(proposedRight + minSpacing <= other.left || x >= other.right + minSpacing);
        const verticalOverlap = !(proposedBottom + minSpacing <= other.top || y >= other.bottom + minSpacing);
        
        if (horizontalOverlap && verticalOverlap) {
            // Calculate maximum allowed size to maintain spacing
            
            // Width constraint
            if (x < other.left) {
                // Current widget is to the left, constrain width
                const maxAllowedWidth = other.left - x - minSpacing;
                if (maxAllowedWidth > 0 && maxAllowedWidth < constrainedWidth) {
                    constrainedWidth = maxAllowedWidth;
                }
            }
            
            // Height constraint
            if (y < other.top) {
                // Current widget is above, constrain height
                const maxAllowedHeight = other.top - y - minSpacing;
                if (maxAllowedHeight > 0 && maxAllowedHeight < constrainedHeight) {
                    constrainedHeight = maxAllowedHeight;
                }
            }
        }
    });
    
    // Ensure minimum sizes are maintained
    constrainedWidth = Math.max(constrainedWidth, 200);
    constrainedHeight = Math.max(constrainedHeight, 150);
    
    return {
        width: constrainedWidth,
        height: constrainedHeight
    };
}

// Function to check position collisions during window resize
function checkWidgetPositionCollisions(currentWrapper, x, y, width, height, minSpacing) {
    const otherWidgets = [];
    
    // Get all other visible widgets
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        if (wrapper === currentWrapper || wrapper.style.display === 'none') return;
        
        const rect = wrapper.getBoundingClientRect();
        const wrapperLeft = parseInt(wrapper.style.left) || 0;
        const wrapperTop = parseInt(wrapper.style.top) || 0;
        
        otherWidgets.push({
            element: wrapper,
            left: wrapperLeft,
            top: wrapperTop,
            right: wrapperLeft + rect.width,
            bottom: wrapperTop + rect.height,
            width: rect.width,
            height: rect.height
        });
    });
    
    let adjustedX = x;
    let adjustedY = y;
    
    // Check for overlaps and push widgets away
    otherWidgets.forEach(other => {
        const proposedRight = adjustedX + width;
        const proposedBottom = adjustedY + height;
        
        // Check if widgets would overlap
        const horizontalOverlap = !(proposedRight + minSpacing <= other.left || adjustedX >= other.right + minSpacing);
        const verticalOverlap = !(proposedBottom + minSpacing <= other.top || adjustedY >= other.bottom + minSpacing);
        
        if (horizontalOverlap && verticalOverlap) {
            // Determine best direction to move to avoid overlap
            const overlapLeft = proposedRight - other.left;
            const overlapRight = other.right - adjustedX;
            const overlapTop = proposedBottom - other.top;
            const overlapBottom = other.bottom - adjustedY;
            
            // Move in direction with least overlap
            const minHorizontal = Math.min(overlapLeft, overlapRight);
            const minVertical = Math.min(overlapTop, overlapBottom);
            
            if (minHorizontal < minVertical) {
                // Move horizontally
                if (overlapLeft < overlapRight) {
                    adjustedX = other.left - width - minSpacing;
                } else {
                    adjustedX = other.right + minSpacing;
                }
            } else {
                // Move vertically
                if (overlapTop < overlapBottom) {
                    adjustedY = other.top - height - minSpacing;
                } else {
                    adjustedY = other.bottom + minSpacing;
                }
            }
            
            // Ensure we don't move outside viewport
            adjustedX = Math.max(0, Math.min(adjustedX, window.innerWidth - width - minSpacing));
            adjustedY = Math.max(0, Math.min(adjustedY, window.innerHeight - height - minSpacing));
        }
    });
    
    return {
        left: adjustedX,
        top: adjustedY
    };
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
            bottom: -15px;
            right: -15px;
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
                
                // Calculate viewport constraints
                const wrapperLeft = parseInt(wrapper.style.left) || 0;
                const wrapperTop = parseInt(wrapper.style.top) || 0;
                const maxWidth = window.innerWidth - wrapperLeft - 30; // Leave space for resize handle
                const maxHeight = window.innerHeight - wrapperTop - 30;
                
                if (widgetType === 'youtube' || widgetType === 'video') {
                    // Video widgets: maintain 16:9 aspect ratio
                    newWidth = Math.max(320, Math.min(startWidth + deltaX, maxWidth));
                    newHeight = (newWidth / 16) * 9;
                    
                    // If height would exceed viewport, recalculate based on height constraint
                    if (newHeight > maxHeight) {
                        newHeight = maxHeight;
                        newWidth = (newHeight / 9) * 16;
                    }
                } else {
                    // Other widgets: free resize with minimum constraints
                    newWidth = Math.max(250, Math.min(startWidth + deltaX, maxWidth));
                    newHeight = Math.max(150, Math.min(startHeight + deltaY, maxHeight));
                }
                
                // Check for collisions with other widgets and maintain spacing
                const MIN_SPACING = 20;
                const constrainedSize = checkWidgetCollisions(wrapper, wrapperLeft, wrapperTop, newWidth, newHeight, MIN_SPACING);
                newWidth = constrainedSize.width;
                newHeight = constrainedSize.height;
                
                wrapper.style.width = newWidth + 'px';
                wrapper.style.height = newHeight + 'px';
                widget.style.width = newWidth + 'px';
                widget.style.height = newHeight + 'px';
                
                // Immediately sync header width during resize
                requestAnimationFrame(() => {
                    syncHeaderWidth(wrapper);
                });
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
        
        // Remove any visual effects during drag (no glow, no enlargement)

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
            // No dragging class to remove since we don't add it
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
// NEW SIMPLE TIP FUNCTIONS
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
    
    // Simulate tip processing
    const sendBtn = document.getElementById(`sendBtn${widgetId}`);
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    setTimeout(() => {
        resultDiv.innerHTML = `Thank you for your $${amount} tip!${message ? `<br><em>"${message}"</em>` : ''}`;
        resultDiv.className = 'tip-result success';
        
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
}

// Add character counter functionality
document.addEventListener('input', function(e) {
    if (e.target.id && e.target.id.startsWith('tipMsg')) {
        const widgetId = e.target.id.replace('tipMsg', '');
        const charCountSpan = document.getElementById(`charCount${widgetId}`);
        if (charCountSpan) {
            charCountSpan.textContent = e.target.value.length;
        }
    }
});

// ========================================
// OLD CRYPTO TIP FUNCTIONS (DEPRECATED)
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

// Layer management system
let currentZIndex = 1000;

function createLayerManagementButton() {
    const layerToggle = document.createElement('button');
    layerToggle.className = 'layer-toggle';
    layerToggle.innerHTML = '📚';
    layerToggle.title = 'Manage Layers';
    
    layerToggle.addEventListener('click', function() {
        toggleLayerPanel();
    });
    
    document.body.appendChild(layerToggle);
}

function toggleLayerPanel() {
    let layerPanel = document.getElementById('layerPanel');
    
    if (layerPanel) {
        layerPanel.remove();
        return;
    }
    
    layerPanel = document.createElement('div');
    layerPanel.id = 'layerPanel';
    layerPanel.className = 'layer-panel';
    layerPanel.innerHTML = `
        <div class="layer-header">
            <h3>Layer Management</h3>
            <button class="layer-close" onclick="document.getElementById('layerPanel').remove()">×</button>
        </div>
        <div class="layer-list" id="layerList">
            <!-- Layers will be populated here -->
        </div>
    `;
    
    layerPanel.style.cssText = `
        position: fixed;
        left: 20px;
        top: 120px;
        width: 250px;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        padding: 0;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
    `;
    
    document.body.appendChild(layerPanel);
    updateLayerList();
}

function updateLayerList() {
    const layerList = document.getElementById('layerList');
    if (!layerList) return;
    
    const widgets = Array.from(document.querySelectorAll('.widget-wrapper'));
    widgets.sort((a, b) => {
        const aZ = parseInt(a.style.zIndex) || 1000;
        const bZ = parseInt(b.style.zIndex) || 1000;
        return bZ - aZ; // Highest z-index first
    });
    
    layerList.innerHTML = '';
    
    widgets.forEach((wrapper, index) => {
        const widget = wrapper.querySelector('.widget');
        const widgetType = widget.dataset.type;
        const zIndex = parseInt(wrapper.style.zIndex) || 1000;
        
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        layerItem.draggable = true;
        layerItem.dataset.wrapperId = wrapper.id;
        layerItem.dataset.currentIndex = index;
        
        const isHidden = wrapper.style.display === 'none';
        const eyeIcon = isHidden ? '🙈' : '👁️';
        
        layerItem.innerHTML = `
            <div class="layer-drag-handle">
                <span class="hamburger-icon">☰</span>
            </div>
            <div class="layer-info">
                <span class="layer-type">${widgetType.charAt(0).toUpperCase() + widgetType.slice(1)}</span>
                <span class="layer-z">Z: ${zIndex}</span>
            </div>
            <div class="layer-actions">
                <button onclick="toggleWidgetVisibility('${wrapper.id}')" title="Toggle Visibility" style="opacity: ${isHidden ? '0.5' : '1'}">${eyeIcon}</button>
                <button onclick="highlightWidget('${wrapper.id}')" title="Select Widget">🎯</button>
            </div>
        `;
        
        layerItem.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            cursor: grab;
            transition: background-color 0.2s ease;
            opacity: ${isHidden ? '0.6' : '1'};
        `;
        
        // Add drag and drop event listeners
        layerItem.addEventListener('dragstart', handleLayerDragStart);
        layerItem.addEventListener('dragover', handleLayerDragOver);
        layerItem.addEventListener('drop', handleLayerDrop);
        layerItem.addEventListener('dragend', handleLayerDragEnd);
        
        layerList.appendChild(layerItem);
    });
}

// Drag and drop handlers for layer management
let draggedLayerItem = null;

function handleLayerDragStart(e) {
    draggedLayerItem = e.target.closest('.layer-item');
    if (draggedLayerItem) {
        draggedLayerItem.style.opacity = '0.5';
        draggedLayerItem.style.cursor = 'grabbing';
        draggedLayerItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedLayerItem.dataset.wrapperId);
    }
}

function handleLayerDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback
    const targetItem = e.target.closest('.layer-item');
    if (targetItem && targetItem !== draggedLayerItem) {
        targetItem.style.backgroundColor = 'rgba(0, 212, 255, 0.2)';
    }
}

function handleLayerDrop(e) {
    e.preventDefault();
    
    const targetItem = e.target.closest('.layer-item');
    if (targetItem && targetItem !== draggedLayerItem && draggedLayerItem) {
        const draggedWrapperId = draggedLayerItem.dataset.wrapperId;
        const targetWrapperId = targetItem.dataset.wrapperId;
        
        const draggedWrapper = document.getElementById(draggedWrapperId);
        const targetWrapper = document.getElementById(targetWrapperId);
        
        if (draggedWrapper && targetWrapper) {
            // Get all widgets and their current z-indices
            const allWrappers = Array.from(document.querySelectorAll('.widget-wrapper'));
            allWrappers.sort((a, b) => {
                const aZ = parseInt(a.style.zIndex) || 1000;
                const bZ = parseInt(b.style.zIndex) || 1000;
                return bZ - aZ; // Highest first
            });
            
            // Find positions in sorted array
            const draggedIndex = allWrappers.indexOf(draggedWrapper);
            const targetIndex = allWrappers.indexOf(targetWrapper);
            
            // Remove dragged item and insert at target position
            allWrappers.splice(draggedIndex, 1);
            allWrappers.splice(targetIndex, 0, draggedWrapper);
            
            // Reassign z-indices based on new order (highest to lowest)
            allWrappers.forEach((wrapper, index) => {
                wrapper.style.zIndex = 2000 - index; // Start from high number and decrease
            });
            
            // Update the layer list to reflect changes
            updateLayerList();
        }
    }
    
    // Reset visual feedback
    document.querySelectorAll('.layer-item').forEach(item => {
        item.style.backgroundColor = '';
        item.classList.remove('drop-zone');
    });
}

function handleLayerDragEnd(e) {
    const item = e.target.closest('.layer-item');
    if (item) {
        item.style.opacity = '1';
        item.style.cursor = 'grab';
        item.classList.remove('dragging');
    }
    draggedLayerItem = null;
    
    // Reset visual feedback
    document.querySelectorAll('.layer-item').forEach(item => {
        item.style.backgroundColor = '';
        item.classList.remove('drop-zone');
    });
}

// Widget visibility toggle function
function toggleWidgetVisibility(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    
    const isHidden = wrapper.style.display === 'none';
    
    if (isHidden) {
        wrapper.style.display = 'block';
        wrapper.style.opacity = '1';
    } else {
        wrapper.style.display = 'none';
    }
    
    // Update the layer list to reflect visibility changes
    updateLayerList();
    
    // Update button appearance
    const layerItems = document.querySelectorAll('.layer-item');
    layerItems.forEach(item => {
        if (item.dataset.wrapperId === wrapperId) {
            const eyeButton = item.querySelector('button[title="Toggle Visibility"]');
            if (eyeButton) {
                eyeButton.textContent = isHidden ? '👁️' : '🙈';
                eyeButton.style.opacity = isHidden ? '1' : '0.5';
            }
            item.style.opacity = isHidden ? '1' : '0.6';
        }
    });
}

function highlightWidget(wrapperId) {
    // Remove previous highlights
    document.querySelectorAll('.widget-wrapper').forEach(w => {
        w.style.outline = '';
    });
    
    // Highlight selected widget
    const wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        wrapper.style.outline = '3px solid #00d4ff';
        setTimeout(() => {
            wrapper.style.outline = '';
        }, 2000);
    }
}

// ========================================
// WIDGET CUSTOMIZATION PANEL
// ========================================

function toggleStylePanel(widgetId) {
    // Remove any existing style panel
    const existingPanel = document.getElementById('external-style-panel');
    if (existingPanel) {
        existingPanel.remove();
        return;
    }
    
    // Get widget element
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    
    // Create external style panel
    const stylePanel = document.createElement('div');
    stylePanel.id = 'external-style-panel';
    stylePanel.className = 'external-style-panel';
    
    const widgetType = widget.dataset.type;
    const isShape = ['square', 'circle', 'triangle'].includes(widgetType);
    
    stylePanel.innerHTML = `
        <div class="style-panel-header">
            <h3>Customize ${widgetType.charAt(0).toUpperCase() + widgetType.slice(1)}</h3>
            <button class="style-panel-close" onclick="document.getElementById('external-style-panel').remove()">×</button>
        </div>
        <div class="style-panel-content">
            <div class="style-group">
                <label>Widget Transparency</label>
                <input type="range" class="style-slider opacity-slider" min="0" max="1" step="0.1" value="0.85" onchange="updateWidgetStyle('${widgetId}')">
            </div>
            <div class="style-group">
                <div class="style-row">
                    <label>Background Color</label>
                    <input type="color" class="style-color bg-color" value="#000000" onchange="updateWidgetStyle('${widgetId}')">
                </div>
            </div>
            <div class="style-group">
                <div class="style-row">
                    <label>Border Color</label>
                    <input type="color" class="style-color border-color" value="#00d4ff" onchange="updateWidgetStyle('${widgetId}')">
                </div>
            </div>
            ${isShape ? `
                <div class="style-group">
                    <div class="style-row">
                        <label>Shape Color</label>
                        <input type="color" class="style-color shape-color" value="#00d4ff" onchange="updateShapeStyle('${widgetId}')">
                    </div>
                </div>
                <div class="style-group">
                    <label>Shape Size</label>
                    <input type="range" class="style-slider size-slider" min="20" max="120" step="10" value="80" onchange="updateShapeStyle('${widgetId}')">
                </div>
            ` : `
                <div class="style-group">
                    <div class="style-row">
                        <label>Button Color</label>
                        <input type="color" class="style-color btn-color" value="#00d4ff" onchange="updateButtonStyle('${widgetId}')">
                    </div>
                </div>
                <div class="style-group">
                    <div class="style-row">
                        <label>Button Text Color</label>
                        <input type="color" class="style-color btn-text-color" value="#ffffff" onchange="updateButtonStyle('${widgetId}')">
                    </div>
                </div>
            `}
        </div>
    `;
    
    // Position the panel near the widget
    const wrapper = widget.closest('.widget-wrapper');
    const wrapperRect = wrapper.getBoundingClientRect();
    
    stylePanel.style.cssText = `
        position: fixed;
        left: ${Math.min(wrapperRect.right + 10, window.innerWidth - 300)}px;
        top: ${Math.max(wrapperRect.top, 20)}px;
        width: 280px;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 0;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    `;
    
    document.body.appendChild(stylePanel);
}

function updateShapeStyle(widgetId) {
    const widget = document.getElementById(widgetId);
    const panel = document.getElementById('external-style-panel');
    if (!widget || !panel) return;
    
    const shapeColor = panel.querySelector('.shape-color')?.value || '#00d4ff';
    const shapeSize = panel.querySelector('.size-slider')?.value || 80;
    
    const shape = widget.querySelector('.shape');
    if (shape) {
        if (shape.classList.contains('square-shape')) {
            shape.style.width = shapeSize + 'px';
            shape.style.height = shapeSize + 'px';
            shape.style.background = shapeColor;
        } else if (shape.classList.contains('circle-shape')) {
            shape.style.width = shapeSize + 'px';
            shape.style.height = shapeSize + 'px';
            shape.style.background = shapeColor;
        } else if (shape.classList.contains('triangle-shape')) {
            const halfSize = shapeSize / 2;
            shape.style.borderLeftWidth = halfSize + 'px';
            shape.style.borderRightWidth = halfSize + 'px';
            shape.style.borderBottomWidth = shapeSize + 'px';
            shape.style.borderBottomColor = shapeColor;
        }
    }
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
    createLayerManagementButton();
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
    
    // Change save button to green "saved" state
    const saveBtn = document.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    const originalBackground = saveBtn.style.background;
    
    saveBtn.textContent = '✅ Saved';
    saveBtn.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
    saveBtn.classList.add('saved-state');
    
    // Reset button when layout is edited again
    markLayoutAsUnsaved();
}

// Function to mark layout as unsaved and reset save button
function markLayoutAsUnsaved() {
    // Reset save button when any changes are made
    const saveBtn = document.querySelector('.save-btn');
    
    // Set up listeners to detect changes (only once)
    if (!saveBtn.hasAttribute('data-listeners-set')) {
        saveBtn.setAttribute('data-listeners-set', 'true');
        
        // Listen for widget modifications
        const resetSaveButton = () => {
            if (saveBtn.classList.contains('saved-state')) {
                saveBtn.textContent = '💾 Save Layout';
                saveBtn.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
                saveBtn.classList.remove('saved-state');
            }
        };
        
        // Detect when widgets are moved, resized, or modified
        document.addEventListener('mouseup', (e) => {
            // Only reset if it was a meaningful interaction with widgets
            if (e.target.closest('.widget-wrapper') || e.target.closest('.widget')) {
                setTimeout(resetSaveButton, 100);
            }
        });
        
        // Detect when widgets are added or removed
        const observer = new MutationObserver((mutations) => {
            let shouldReset = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && 
                    (mutation.target.id === 'canvas' || mutation.target.closest('#canvas'))) {
                    shouldReset = true;
                }
            });
            if (shouldReset) {
                resetSaveButton();
            }
        });
        
        observer.observe(document.getElementById('canvas'), {
            childList: true,
            subtree: true
        });
        
        // Reset when style panels are used
        document.addEventListener('input', (e) => {
            if (e.target.closest('#external-style-panel')) {
                resetSaveButton();
            }
        });
        
        // Reset when background is changed
        document.addEventListener('change', (e) => {
            if (e.target.id === 'bgFile' || e.target.id === 'bgUrl' || e.target.closest('.presets')) {
                setTimeout(resetSaveButton, 100);
            }
        });
    }
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
            state: captureWidgetState(widget, widget.dataset.type, Array.from(document.querySelectorAll('.widget-wrapper')).indexOf(wrapper) + 1),
            customization: captureWidgetCustomization(widget)
        };
        widgets.push(widgetData);
    });
    
    // Generate unique layout ID
    const layoutId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const layout = {
        id: layoutId,
        widgets: widgets,
        background: document.getElementById('bg').style.backgroundImage || 
                   document.getElementById('bg').style.background,
        timestamp: new Date().toISOString(),
        published: true,
        creatorName: 'Anonymous Creator'
    };
    
    // Save as published layout with correct key format
    localStorage.setItem('web3DemoPublishedLayout', JSON.stringify(layout));
    localStorage.setItem(`layout_${layoutId}`, JSON.stringify(layout));
    
    // Generate shareable URL
    const baseUrl = window.location.origin + window.location.pathname.replace('creator.html', '');
    const shareableUrl = `${baseUrl}viewer.html?layout=${layoutId}`;
    
    // Update button temporarily and open viewer directly
    const btn = document.querySelector('.publish-btn');
    const originalText = btn.textContent;
    const originalBackground = btn.style.background;
    btn.textContent = '✅ Published!';
    btn.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
    
    // Open viewer page directly instead of showing modal
    setTimeout(() => {
        window.open(shareableUrl, '_blank');
    }, 500);
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBackground;
    }, 3000);
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
            state: captureWidgetState(widget, widgetType, index + 1),
            customization: captureWidgetCustomization(widget)
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

// Function to capture widget customization settings
function captureWidgetCustomization(widget) {
    const customization = {};
    
    // Extract current applied styles
    const computedStyle = window.getComputedStyle(widget);
    
    // Capture background color and opacity
    if (widget.style.background) {
        const bgMatch = widget.style.background.match(/#([a-fA-F0-9]{6})([a-fA-F0-9]{2})?/);
        if (bgMatch) {
            customization.bgColor = '#' + bgMatch[1];
            if (bgMatch[2]) {
                customization.opacity = parseInt(bgMatch[2], 16) / 255;
            }
        }
    }
    
    // Capture border color
    if (widget.style.borderColor) {
        customization.borderColor = widget.style.borderColor;
    }
    
    // Capture button colors
    const firstButton = widget.querySelector('.btn, .tip-btn, .send, .twitter-load-btn, .youtube-load-btn');
    if (firstButton && firstButton.style.background) {
        const btnBgMatch = firstButton.style.background.match(/#([a-fA-F0-9]{6})/);
        if (btnBgMatch) {
            customization.buttonColor = '#' + btnBgMatch[1];
        }
        if (firstButton.style.color) {
            customization.buttonTextColor = firstButton.style.color;
        }
    }
    
    // Capture shape customizations
    const shape = widget.querySelector('.shape');
    if (shape) {
        if (shape.style.background) {
            customization.shapeColor = shape.style.background;
        }
        if (shape.style.width) {
            customization.shapeSize = parseInt(shape.style.width);
        }
    }
    
    return Object.keys(customization).length > 0 ? customization : null;
}

function showToast(message, type = 'info', sourceElement = null) {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#00ff88' : type === 'error' ? '#ff4757' : '#00d4ff';
    
    let positionStyle = '';
    if (sourceElement) {
        const rect = sourceElement.getBoundingClientRect();
        positionStyle = `position: fixed; top: ${rect.bottom + 10}px; left: ${rect.left}px;`;
    } else {
        positionStyle = 'position: fixed; top: 20px; right: 20px;';
    }
    
    toast.style.cssText = `
        ${positionStyle} background: ${bgColor};
        color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000;
        font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = sourceElement ? 'translateY(-20px)' : 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}