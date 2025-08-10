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

// Smart scaling functions for responsive design
function getMaxVideoWidth(viewportWidth) {
    // Progressive scaling for video widgets with absolute 1000px maximum
    const maxAbsolute = 1000; // Never exceed 1000px
    if (viewportWidth <= 768) return Math.min(viewportWidth * 0.9, maxAbsolute); // 90% on mobile
    if (viewportWidth <= 1024) return Math.min(viewportWidth * 0.7, maxAbsolute); // 70% on tablet
    if (viewportWidth <= 1440) return Math.min(viewportWidth * 0.6, maxAbsolute); // 60% on laptop
    if (viewportWidth <= 1920) return Math.min(800, maxAbsolute); // Max 800px on desktop
    return maxAbsolute; // Max 1000px on large screens
}

function getMaxWidgetWidth(widgetType, viewportWidth) {
    const baseLimits = {
        'crypto': viewportWidth <= 768 ? 350 : viewportWidth <= 1440 ? 400 : 450,
        'twitter': viewportWidth <= 768 ? 300 : viewportWidth <= 1440 ? 350 : 400,
        'instagram': viewportWidth <= 768 ? 300 : viewportWidth <= 1440 ? 350 : 400,
        'discord': viewportWidth <= 768 ? 350 : viewportWidth <= 1440 ? 400 : 450
    };
    return baseLimits[widgetType] || (viewportWidth <= 768 ? 300 : 400);
}

function getMaxWidgetHeight(widgetType, viewportHeight) {
    const baseLimits = {
        'crypto': viewportHeight <= 600 ? 250 : viewportHeight <= 900 ? 300 : 350,
        'twitter': viewportHeight <= 600 ? 400 : viewportHeight <= 900 ? 500 : 600,
        'instagram': viewportHeight <= 600 ? 400 : viewportHeight <= 900 ? 500 : 600,
        'discord': viewportHeight <= 600 ? 400 : viewportHeight <= 900 ? 500 : 600
    };
    return baseLimits[widgetType] || (viewportHeight <= 600 ? 300 : 400);
}

function getMinWidgetWidth(widgetType) {
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

function getMinWidgetHeight(widgetType) {
    const minimums = {
        'crypto': 200,
        'twitter': 150,
        'instagram': 150,
        'discord': 150,
        'youtube': 180, // 16:9 of 320px
        'video': 180
    };
    return minimums[widgetType] || 150;
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
            
            // Smart percentage-based scaling with breakpoints and limits
            if (widgetType === 'youtube' || widgetType === 'video') {
                // Video widgets: smart scaling with maximum limits
                const baseWidth = Math.min(storedPos.widthPercent / 100 * viewportWidth, getMaxVideoWidth(viewportWidth));
                newWidth = Math.max(320, Math.min(baseWidth, viewportWidth - newLeft - MIN_SPACING));
                newHeight = (newWidth / 16) * 9; // Maintain 16:9 aspect ratio
            } else {
                // Other widgets: smart scaling with type-specific limits
                const maxWidth = getMaxWidgetWidth(widgetType, viewportWidth);
                const maxHeight = getMaxWidgetHeight(widgetType, viewportHeight);
                
                newWidth = Math.max(
                    getMinWidgetWidth(widgetType), 
                    Math.min(
                        Math.min(storedPos.widthPercent / 100 * viewportWidth, maxWidth),
                        viewportWidth - newLeft - MIN_SPACING
                    )
                );
                newHeight = Math.max(
                    getMinWidgetHeight(widgetType),
                    Math.min(
                        Math.min(storedPos.heightPercent / 100 * viewportHeight, maxHeight),
                        viewportHeight - newTop - MIN_SPACING
                    )
                );
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
    
    // Hide/show all toggle buttons when sidebar opens/closes
    const layerToggle = document.querySelector('.layer-toggle');
    const safeAreaToggle = document.querySelector('.safe-area-toggle');
    
    if (sidebar.classList.contains('open')) {
        toggle.style.opacity = '0';
        toggle.style.pointerEvents = 'none';
        toggle.style.transform = 'translateX(-20px)';
        
        [snapToggle, layerToggle, safeAreaToggle].forEach(btn => {
            if (btn) {
                btn.style.opacity = '0';
                btn.style.pointerEvents = 'none';
                btn.style.transform = 'translateX(-20px)';
            }
        });
    } else {
        toggle.style.opacity = '1';
        toggle.style.pointerEvents = 'auto';
        toggle.style.transform = 'translateX(0)';
        
        [snapToggle, layerToggle, safeAreaToggle].forEach(btn => {
            if (btn) {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
                btn.style.transform = 'translateX(0)';
            }
        });
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.toggle');
    const snapToggle = document.querySelector('.snap-toggle');
    const layerToggle = document.querySelector('.layer-toggle');
    const safeAreaToggle = document.querySelector('.safe-area-toggle');
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        
        toggle.style.opacity = '1';
        toggle.style.pointerEvents = 'auto';
        toggle.style.transform = 'translateX(0)';
        
        [snapToggle, layerToggle, safeAreaToggle].forEach(btn => {
            if (btn) {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
                btn.style.transform = 'translateX(0)';
            }
        });
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

function saveLayout(userMetadata) {
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
        background: getCurrentBackground(),
        timestamp: new Date().toISOString(),
        owner: userMetadata && userMetadata.walletAddress ? userMetadata.walletAddress : null,
        username: userMetadata && userMetadata.username ? userMetadata.username : null
    };
    
    // Save per-wallet if owner is present
    if (layout.owner) {
        try {
            const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
            if (!allWorlds[layout.owner]) {
                allWorlds[layout.owner] = {};
            }
            if (!allWorlds[layout.owner].main) {
                allWorlds[layout.owner].main = {};
            }
            allWorlds[layout.owner].main.content = allWorlds[layout.owner].main.content || {};
            allWorlds[layout.owner].main.content.widgets = layout.widgets;
            allWorlds[layout.owner].main.content.background = layout.background;
            allWorlds[layout.owner].main.updatedAt = layout.timestamp;
            localStorage.setItem('user_worlds', JSON.stringify(allWorlds));
        } catch (e) {
            console.error('Failed to save per-wallet layout:', e);
        }
    }
    
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

function publishLayout(currentUser) {
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
        background: getCurrentBackground(),
        timestamp: new Date().toISOString(),
        published: true,
        creatorName: currentUser && currentUser.username ? currentUser.username : 'Anonymous Creator',
        owner: currentUser && currentUser.walletAddress ? currentUser.walletAddress : null
    };
    
    // Save as published layout
    localStorage.setItem('web3DemoPublishedLayout', JSON.stringify(layout));
    localStorage.setItem(layoutId, JSON.stringify(layout));
    
    // Also persist under user_worlds for owner
    if (layout.owner) {
        try {
            const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
            if (!allWorlds[layout.owner]) {
                allWorlds[layout.owner] = {};
            }
            if (!allWorlds[layout.owner].main) {
                allWorlds[layout.owner].main = {};
            }
            allWorlds[layout.owner].main.content = allWorlds[layout.owner].main.content || {};
            allWorlds[layout.owner].main.content.widgets = layout.widgets;
            allWorlds[layout.owner].main.content.background = layout.background;
            allWorlds[layout.owner].main.updatedAt = layout.timestamp;
            localStorage.setItem('user_worlds', JSON.stringify(allWorlds));
        } catch (e) {
            console.error('Failed to save published layout per-wallet:', e);
        }
    }
    
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
    if (bg) {
        bg.style.background = gradient;
        bg.style.backgroundImage = 'none';
        bg.style.backgroundSize = 'cover';
        bg.style.backgroundPosition = 'center';
        bg.style.backgroundRepeat = 'no-repeat';
        console.log('Background set to:', gradient);
    } else {
        console.error('Background element not found');
    }
}

// New enhanced background functions
function selectBgType(type) {
    // Update active button
    document.querySelectorAll('.bg-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    // Show/hide appropriate options
    document.querySelectorAll('.bg-options').forEach(option => {
        option.style.display = 'none';
    });
    
    // Set background type and apply
    currentBackgroundData.type = type;
    
    if (type === 'solid') {
        document.getElementById('solidOptions').style.display = 'block';
        // Apply current solid color
        const colorElement = document.getElementById('solidColor');
        if (colorElement) {
            currentBackgroundData.solid.color = colorElement.value;
        }
        applyCurrentBackground();
    } else if (type === 'gradient') {
        document.getElementById('gradientOptions').style.display = 'block';
        // Update gradient
        updateGradient();
    } else if (type === 'radial') {
        document.getElementById('radialOptions').style.display = 'block';
        // Update radial gradient
        updateRadialGradient();
    } else if (type === 'image') {
        document.getElementById('imageOptions').style.display = 'block';
        // Only apply if we have an image URL
        if (currentBackgroundData.image.url) {
            applyCurrentBackground();
        }
    }
}

function applySolidColor(color) {
    currentBackgroundData.type = 'solid';
    currentBackgroundData.solid.color = color;
    applyCurrentBackground();
    resetSaveButton();
}

function updateGradient() {
    const color1 = document.getElementById('gradientColor1');
    const color2 = document.getElementById('gradientColor2');
    const direction = document.getElementById('gradientDirection');
    
    if (!color1 || !color2 || !direction) {
        console.error('Gradient elements not found');
        return;
    }
    
    currentBackgroundData.type = 'linear';
    currentBackgroundData.linear.color1 = color1.value;
    currentBackgroundData.linear.color2 = color2.value;
    currentBackgroundData.linear.direction = direction.value;
    
    applyCurrentBackground();
    resetSaveButton();
}

function updateRadialGradient() {
    const color1 = document.getElementById('radialColor1');
    const color2 = document.getElementById('radialColor2');
    const position = document.getElementById('radialPosition');
    const size = document.getElementById('radialSize');
    
    if (!color1 || !color2 || !position || !size) {
        console.error('Radial gradient elements not found');
        return;
    }
    
    currentBackgroundData.type = 'radial';
    currentBackgroundData.radial.color1 = color1.value;
    currentBackgroundData.radial.color2 = color2.value;
    currentBackgroundData.radial.position = position.value;
    currentBackgroundData.radial.size = size.value;
    
    applyCurrentBackground();
    resetSaveButton();
}

// Enhanced Background Management System
let currentBackgroundData = {
    type: 'solid', // 'solid', 'linear', 'radial', 'image'
    solid: {
        color: '#667eea'
    },
    linear: {
        color1: '#667eea',
        color2: '#764ba2',
        direction: '135deg'
    },
    radial: {
        color1: '#667eea',
        color2: '#764ba2',
        position: 'center',
        size: 'ellipse'
    },
    image: {
        url: '',
        size: 'cover',
        position: 'center',
        repeat: 'no-repeat'
    }
};

// Function to properly capture current background
function getCurrentBackground() {
    // Return the complete background data object for proper restoration
    return {
        backgroundData: currentBackgroundData,
        // Also include the CSS string for backwards compatibility
        backgroundString: getCurrentBackgroundString()
    };
}

function getCurrentBackgroundString() {
    // Build the complete background string based on current background data
    switch (currentBackgroundData.type) {
        case 'solid':
            return currentBackgroundData.solid.color;
            
        case 'linear':
            const linear = currentBackgroundData.linear;
            return `linear-gradient(${linear.direction}, ${linear.color1} 0%, ${linear.color2} 100%)`;
            
        case 'radial':
            const radial = currentBackgroundData.radial;
            return `radial-gradient(${radial.size} at ${radial.position}, ${radial.color1} 0%, ${radial.color2} 100%)`;
            
        case 'image':
            return currentBackgroundData.image.url ? `url(${currentBackgroundData.image.url})` : '';
            
        default:
            return '';
    }
}

function handleImageUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentBackgroundData.image.url = e.target.result;
            currentBackgroundData.type = 'image';
            applyCurrentBackground();
            // Show image controls
            document.getElementById('imageControls').style.display = 'block';
            // Update save button state
            resetSaveButton();
        };
        reader.readAsDataURL(file);
    }
}

function updateImageBackground() {
    if (!currentBackgroundData.image.url) return;
    
    const sizeElement = document.getElementById('imageSize');
    const positionElement = document.getElementById('imagePosition');
    const repeatElement = document.getElementById('imageRepeat');
    
    if (sizeElement) currentBackgroundData.image.size = sizeElement.value;
    if (positionElement) currentBackgroundData.image.position = positionElement.value;
    if (repeatElement) currentBackgroundData.image.repeat = repeatElement.value;
    
    applyCurrentBackground();
    resetSaveButton();
}

function applyCurrentBackground() {
    const bg = document.getElementById('bg');
    if (!bg) return;
    
    // Clear all background styles first
    bg.style.background = '';
    bg.style.backgroundImage = '';
    bg.style.backgroundSize = '';
    bg.style.backgroundPosition = '';
    bg.style.backgroundRepeat = '';
    
    switch (currentBackgroundData.type) {
        case 'solid':
            bg.style.background = currentBackgroundData.solid.color;
            console.log('Applied solid background:', currentBackgroundData.solid.color);
            break;
            
        case 'linear':
            const linear = currentBackgroundData.linear;
            const linearGradient = `linear-gradient(${linear.direction}, ${linear.color1} 0%, ${linear.color2} 100%)`;
            bg.style.background = linearGradient;
            console.log('Applied linear gradient:', linearGradient);
            break;
            
        case 'radial':
            const radial = currentBackgroundData.radial;
            const radialGradient = `radial-gradient(${radial.size} at ${radial.position}, ${radial.color1} 0%, ${radial.color2} 100%)`;
            bg.style.background = radialGradient;
            console.log('Applied radial gradient:', radialGradient);
            break;
            
        case 'image':
            const image = currentBackgroundData.image;
            if (image.url) {
                bg.style.backgroundImage = `url(${image.url})`;
                bg.style.backgroundSize = image.size;
                bg.style.backgroundPosition = image.position;
                bg.style.backgroundRepeat = image.repeat;
                console.log('Applied image background:', image);
            }
            break;
    }
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
    
    // Set initial size based on widget type - optimized for content
    if (type === 'youtube' || type === 'video' || type === 'livestream') {
        wrapper.style.width = '320px';
        wrapper.style.height = '180px'; // 16:9 ratio (320 * 9/16 = 180)
    } else if (type === 'crypto') {
        wrapper.style.width = '300px';
        wrapper.style.height = '280px'; // Larger height to show send button
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
            
        case 'livestream':
            title = 'Live Stream';
            content = `
                <div class="upload-section">
                    <input class="input" id="stream${counter}" placeholder="Enter Stream URL (Twitch, OBS, etc.)">
                    <button class="youtube-load-btn" onclick="loadStream(${counter})">Load Stream</button>
                </div>
                <div id="streamc${counter}"></div>
                <button class="video-overlay" onclick="resetStream(${counter})">×</button>
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
    const showCustomization = type !== 'youtube' && type !== 'video'; // crypto, twitter, instagram, discord get customization
    
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
            bottom: 2px;
            right: 2px;
            width: 18px;
            height: 18px;
            background: rgba(0, 212, 255, 0.9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: se-resize;
            border-radius: 0 0 12px 0;
            font-size: 12px;
            z-index: 20;
            user-select: none;
            pointer-events: auto;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
            
            // Add cursor constraint styling during resize
            // document.body.style.cursor = 'nw-resize';
            // document.body.style.userSelect = 'none';
            
            let resizeTimeout;
            const handleMouseMove = (e) => {
                if (!isResizing) return;
                
                // Throttle resize operations for smoother performance
                if (resizeTimeout) return;
                resizeTimeout = setTimeout(() => {
                    resizeTimeout = null;
                }, 16); // ~60fps throttling
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newWidth, newHeight;
                
                // Cache viewport constraints (don't recalculate every frame)
                const wrapperLeft = parseInt(wrapper.style.left) || 0;
                const wrapperTop = parseInt(wrapper.style.top) || 0;
                const maxWidth = window.innerWidth - wrapperLeft - 30;
                const maxHeight = window.innerHeight - wrapperTop - 30;
                
                if (widgetType === 'youtube' || widgetType === 'video' || widgetType === 'livestream') {
                    // Video widgets: maintain 16:9 aspect ratio with smart limits
                    const videoMaxWidth = getMaxVideoWidth(window.innerWidth);
                    newWidth = Math.max(320, Math.min(startWidth + deltaX, Math.min(maxWidth, videoMaxWidth)));
                    newHeight = (newWidth / 16) * 9;
                    
                    // If height would exceed viewport, recalculate based on height constraint
                    if (newHeight > maxHeight) {
                        newHeight = maxHeight;
                        newWidth = (newHeight / 9) * 16;
                    }
                } else {
                    // Other widgets: free resize with smart type-specific constraints
                    const minWidth = getMinWidgetWidth(widgetType);
                    const minHeight = getMinWidgetHeight(widgetType);
                    const typeMaxWidth = getMaxWidgetWidth(widgetType, window.innerWidth);
                    const typeMaxHeight = getMaxWidgetHeight(widgetType, window.innerHeight);
                    
                    newWidth = Math.max(minWidth, Math.min(startWidth + deltaX, Math.min(maxWidth, typeMaxWidth)));
                    newHeight = Math.max(minHeight, Math.min(startHeight + deltaY, Math.min(maxHeight, typeMaxHeight)));
                }
                
                // Simplified collision detection (reduce computational overhead)
                const MIN_SPACING = 20;
                const constrainedSize = checkWidgetCollisions(wrapper, wrapperLeft, wrapperTop, newWidth, newHeight, MIN_SPACING);
                newWidth = constrainedSize.width;
                newHeight = constrainedSize.height;
                
                // Apply dimensions immediately for responsive feedback
                wrapper.style.width = newWidth + 'px';
                wrapper.style.height = newHeight + 'px';
                widget.style.width = newWidth + 'px';
                widget.style.height = newHeight + 'px';
                
                // Batch DOM updates for better performance
                requestAnimationFrame(() => {
                    syncHeaderWidth(wrapper);
                });
            };
            
            const handleMouseUp = () => {
                isResizing = false;
                wrapper.classList.remove('resizing');
                updateStoredPosition(wrapper);
                syncHeaderWidth(wrapper); // Final sync after resize
                
                // Restore cursor and user selection
                // document.body.style.cursor = '';
                // document.body.style.userSelect = '';
                
                // Check safe area bounds if visible
                if (safeAreaVisible) {
                    setTimeout(checkWidgetsInBounds, 50);
                }
                
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
        
        // Set cursor for dragging
        // document.body.style.cursor = 'grabbing';
        // document.body.style.userSelect = 'none';
        
        // Remove any visual effects during drag (no glow, no enlargement)

        let dragTimeout;
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            let newX = startLeft + e.clientX - startX;
            let newY = startTop + e.clientY - startY;
            
            // Apply boundary constraints - prevent header from going beyond body boundaries
            const wrapperRect = wrapper.getBoundingClientRect();
            const canvas = document.getElementById('canvas');
            
            if (canvas) {
                const canvasRect = canvas.getBoundingClientRect();
                // Ensure widget stays within canvas boundaries
                newX = Math.max(0, Math.min(newX, canvasRect.width - wrapperRect.width));
                newY = Math.max(0, Math.min(newY, canvasRect.height - wrapperRect.height));
            }
            
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
            
            // Restore cursor and user selection
            // document.body.style.cursor = '';
            // document.body.style.userSelect = '';
            
            // No dragging class to remove since we don't add it
            hideSnapIndicators();
            
            // Clear any pending drag timeout
            clearTimeout(dragTimeout);
            
            // Check safe area bounds if visible
            if (safeAreaVisible) {
                setTimeout(checkWidgetsInBounds, 50);
            }
            
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
    const panel = document.getElementById('external-style-panel');
    if (!widget || !panel) return;
    
    const opacity = panel.querySelector('.opacity-slider').value;
    const bgColor = panel.querySelector('.bg-color').value;
    const borderColor = panel.querySelector('.border-color').value;
    
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
    const panel = document.getElementById('external-style-panel');
    if (!widget || !panel) return;
    
    const buttonColor = panel.querySelector('.btn-color').value;
    const textColor = panel.querySelector('.btn-text-color').value;
    
    widget.querySelectorAll('.btn, .tip-btn, .send, .twitter-load-btn, .youtube-load-btn, .tip-amount-btn, .send-tip-btn').forEach(btn => {
        btn.style.background = `linear-gradient(135deg, ${buttonColor}, ${buttonColor}dd)`;
        btn.style.color = textColor;
    });
}

function updateCryptoStyle(widgetId) {
    const widget = document.getElementById(widgetId);
    const panel = document.getElementById('external-style-panel');
    if (!widget || !panel) return;
    
    // Get all the color values
    const tipBtnColor = panel.querySelector('.tip-btn-color')?.value || '#00d4ff';
    const tipBtnTextColor = panel.querySelector('.tip-btn-text-color')?.value || '#ffffff';
    const sendBtnColor = panel.querySelector('.send-btn-color')?.value || '#00ff88';
    const sendBtnTextColor = panel.querySelector('.send-btn-text-color')?.value || '#ffffff';
    const headerTextColor = panel.querySelector('.header-text-color')?.value || '#ffffff';
    const messageTextColor = panel.querySelector('.message-text-color')?.value || '#cccccc';
    
    // Apply tip amount button styles
    widget.querySelectorAll('.tip-amount-btn').forEach(btn => {
        btn.style.background = `linear-gradient(135deg, ${tipBtnColor}, ${tipBtnColor}dd)`;
        btn.style.color = tipBtnTextColor;
        btn.style.transition = 'all 0.3s ease';
    });
    
    // Apply send button styles
    widget.querySelectorAll('.send-tip-btn').forEach(btn => {
        btn.style.background = `linear-gradient(135deg, ${sendBtnColor}, ${sendBtnColor}dd)`;
        btn.style.color = sendBtnTextColor;
        btn.style.transition = 'all 0.3s ease';
    });
    
    // Apply header text color
    widget.querySelectorAll('.tip-header h3').forEach(header => {
        header.style.color = headerTextColor;
    });
    
    // Apply message text color
    widget.querySelectorAll('textarea, .char-count').forEach(element => {
        element.style.color = messageTextColor;
    });
    
    // Apply placeholder text color
    widget.querySelectorAll('textarea').forEach(textarea => {
        textarea.style.setProperty('--placeholder-color', messageTextColor);
        const style = document.createElement('style');
        const uniqueId = 'textarea-' + Math.random().toString(36).substr(2, 9);
        textarea.classList.add(uniqueId);
        style.textContent = `
            .${uniqueId}::placeholder {
                color: ${messageTextColor} !important;
                opacity: 0.7;
            }
        `;
        document.head.appendChild(style);
    });
    
    // Store customization for persistence
    const customization = {
        tipBtnColor,
        tipBtnTextColor,
        sendBtnColor,
        sendBtnTextColor,
        headerTextColor,
        messageTextColor
    };
    
    widget.dataset.cryptoCustomization = JSON.stringify(customization);
}

// toggleStylePanel function moved to external style panel section

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

function loadStream(id) {
    const input = document.getElementById(`stream${id}`);
    const content = document.getElementById(`streamc${id}`);
    const widget = document.getElementById(`w${id.toString().split('stream')[0] || id}`);
    const url = input.value.trim();
    
    if (url) {
        let embedUrl = '';
        let isValidStream = false;
        
        // Handle Twitch streams
        if (url.includes('twitch.tv/')) {
            const channel = url.split('twitch.tv/')[1].split('/')[0].split('?')[0];
            embedUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
            isValidStream = true;
        }
        // Handle YouTube live streams
        else if (url.includes('youtube.com/watch?v=') || url.includes('youtu.be/')) {
            let videoId = '';
            if (url.includes('youtube.com/watch?v=')) {
                videoId = url.split('v=')[1].split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            }
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            isValidStream = true;
        }
        // Handle generic stream URLs (for OBS, etc.)
        else if (url.includes('.m3u8') || url.includes('rtmp://') || url.startsWith('http')) {
            // For generic streams, create a video element
            content.innerHTML = `<video controls autoplay style="width: 100%; height: 100%; border-radius: 8px;">
                <source src="${url}" type="application/x-mpegURL">
                <source src="${url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>`;
            widget.classList.add('video-loaded');
            return;
        }
        
        if (isValidStream && embedUrl) {
            content.innerHTML = `<iframe src="${embedUrl}" allowfullscreen style="border: none; border-radius: 8px;"></iframe>`;
            widget.classList.add('video-loaded');
        } else {
            content.innerHTML = '<div style="color:#ff4757;padding:20px;text-align:center">Invalid stream URL. Supported: Twitch, YouTube Live, direct stream URLs</div>';
        }
    }
}

function resetStream(id) {
    const content = document.getElementById(`streamc${id}`);
    const input = document.getElementById(`stream${id}`);
    const widget = document.getElementById(`w${id.toString().split('stream')[0] || id}`);
    
    content.innerHTML = '';
    input.value = '';
    widget.classList.remove('video-loaded');
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
    
    // Use enhanced mock data (Twitter API requires backend due to CORS)
    setTimeout(() => {
        try {
            const mockTweets = generateEnhancedMockTweets(user);
            const mockUserInfo = {
                username: user,
                name: user.charAt(0).toUpperCase() + user.slice(1),
                profile_image: `https://ui-avatars.com/api/?name=${user}&background=1da1f2&color=fff&size=48`
            };
            displayEnhancedTweets(id, mockTweets, mockUserInfo);
        } catch (error) {
            console.error('Error displaying tweets:', error);
            document.getElementById(`feed${id}`).innerHTML = `
                <div class="twitter-error">
                    Unable to load tweets. Please try again.
                </div>
            `;
        }
    }, 1500); // Simulate API delay
}

// Generate realistic mock tweets based on username
function generateEnhancedMockTweets(username) {
    const tweetTemplates = [
        {
            text: `Just launched our new Web3 interactive demo! 🚀 The future of social media is here. #Web3 #Crypto #Innovation`,
            metrics: { retweets: 42, likes: 128, replies: 15 },
            timeAgo: '2h'
        },
        {
            text: `Building in public is the way 💪 Here's what we learned this week about drag-and-drop interfaces...`,
            metrics: { retweets: 23, likes: 89, replies: 7 },
            timeAgo: '8h'
        },
        {
            text: `The intersection of crypto payments and social media is fascinating. Real-time tips, NFT integration, decentralized storage... 🌐`,
            metrics: { retweets: 67, likes: 234, replies: 28 },
            timeAgo: '1d'
        },
        {
            text: `Shoutout to the amazing developer community! Your feedback has been incredible 🙏 #DevCommunity`,
            metrics: { retweets: 12, likes: 56, replies: 4 },
            timeAgo: '2d'
        },
        {
            text: `Sometimes the best features come from user requests. What would you like to see next? 🤔`,
            metrics: { retweets: 8, likes: 34, replies: 12 },
            timeAgo: '3d'
        },
        {
            text: `Coffee + Code = Magic ☕✨ Another late night debugging session complete! #DeveloperLife`,
            metrics: { retweets: 15, likes: 67, replies: 8 },
            timeAgo: '4d'
        },
        {
            text: `PSA: Always test your code on different screen sizes 📱💻 Responsive design matters!`,
            metrics: { retweets: 31, likes: 102, replies: 19 },
            timeAgo: '5d'
        },
        {
            text: `Exciting news coming soon... 👀 Can't wait to share what we've been working on!`,
            metrics: { retweets: 45, likes: 156, replies: 32 },
            timeAgo: '6d'
        }
    ];

    // Shuffle and return 5 random tweets
    const shuffled = tweetTemplates.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5).map((tweet, index) => ({
        id: `tweet_${username}_${index}`,
        ...tweet,
        username: username
    }));
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
    const urlInput = document.getElementById(`ig${id}`);
    const container = document.getElementById(`igc${id}`);
    
    // Show loading state
    container.innerHTML = `
        <div class="instagram-loading" style="padding: 20px; text-align: center; color: #999;">
            <div style="width: 20px; height: 20px; border: 2px solid #E1306C; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
            Loading Instagram post...
        </div>
    `;
    
    // Simulate loading delay
    setTimeout(() => {
        const mockInstagramPost = generateMockInstagramPost();
        container.innerHTML = `
            <div class="instagram-post" style="border: 1px solid #dbdbdb; border-radius: 8px; background: white; max-width: 100%; margin: 10px 0;">
                <div class="instagram-header" style="padding: 14px; display: flex; align-items: center; border-bottom: 1px solid #efefef;">
                    <img src="${mockInstagramPost.user.avatar}" alt="${mockInstagramPost.user.username}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px; color: #262626;">${mockInstagramPost.user.username}</div>
                        <div style="font-size: 12px; color: #8e8e8e;">${mockInstagramPost.location}</div>
                    </div>
                </div>
                <div class="instagram-media" style="position: relative;">
                    <img src="${mockInstagramPost.image}" alt="Instagram post" style="width: 100%; height: 300px; object-fit: cover;">
                    ${mockInstagramPost.isVideo ? '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 24px;">▶️</div>' : ''}
                </div>
                <div class="instagram-actions" style="padding: 12px 14px 8px; display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 24px; cursor: pointer;">❤️</span>
                    <span style="font-size: 24px; cursor: pointer;">💬</span>
                    <span style="font-size: 24px; cursor: pointer;">📤</span>
                    <span style="margin-left: auto; font-size: 24px; cursor: pointer;">🔖</span>
                </div>
                <div class="instagram-likes" style="padding: 0 14px; font-weight: 600; font-size: 14px; color: #262626;">
                    ${mockInstagramPost.likes.toLocaleString()} likes
                </div>
                <div class="instagram-caption" style="padding: 8px 14px;">
                    <span style="font-weight: 600; color: #262626; margin-right: 8px;">${mockInstagramPost.user.username}</span>
                    <span style="color: #262626; font-size: 14px;">${mockInstagramPost.caption}</span>
                </div>
                <div class="instagram-time" style="padding: 8px 14px; font-size: 12px; color: #8e8e8e; text-transform: uppercase;">
                    ${mockInstagramPost.timeAgo}
                </div>
            </div>
        `;
    }, 1200);
}

function generateMockInstagramPost() {
    const posts = [
        {
            user: { 
                username: 'techcreator', 
                avatar: 'https://ui-avatars.com/api/?name=TC&background=E1306C&color=fff&size=64'
            },
            location: 'San Francisco, CA',
            image: 'https://picsum.photos/400/400?random=1',
            isVideo: false,
            likes: Math.floor(Math.random() * 1000) + 100,
            caption: '🚀 Just launched our new Web3 interactive demo! The future of social media is here. #Web3 #Innovation #TechLife',
            timeAgo: Math.floor(Math.random() * 24) + 1 + ' hours ago'
        },
        {
            user: { 
                username: 'devlife', 
                avatar: 'https://ui-avatars.com/api/?name=DL&background=405de6&color=fff&size=64'
            },
            location: 'New York, NY',
            image: 'https://picsum.photos/400/400?random=2',
            isVideo: true,
            likes: Math.floor(Math.random() * 2000) + 200,
            caption: '💻 Behind the scenes: Building the drag & drop interface! Swipe to see the process ➡️ #CodeLife #BuildInPublic',
            timeAgo: Math.floor(Math.random() * 7) + 1 + ' days ago'
        },
        {
            user: { 
                username: 'innovator', 
                avatar: 'https://ui-avatars.com/api/?name=IN&background=00d4ff&color=fff&size=64'
            },
            location: 'Austin, TX',
            image: 'https://picsum.photos/400/400?random=3',
            isVideo: false,
            likes: Math.floor(Math.random() * 1500) + 300,
            caption: '☕ Coffee + Code = Magic ✨ Another late night coding session complete! What are you building today? #DeveloperLife',
            timeAgo: Math.floor(Math.random() * 48) + 1 + ' hours ago'
        }
    ];
    
    return posts[Math.floor(Math.random() * posts.length)];
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
    layerToggle.innerHTML = '📋';
    layerToggle.title = 'Manage Layers';
    
    layerToggle.addEventListener('click', function() {
        toggleLayerPanel();
    });
    
    document.body.appendChild(layerToggle);
}

function toggleLayerPanel() {
    let layerPanel = document.getElementById('layer-panel');
    
    if (layerPanel) {
        closeLayerPanel();
        return;
    }
    
    layerPanel = document.createElement('div');
    layerPanel.id = 'layer-panel';
    layerPanel.className = 'layer-panel';
    layerPanel.innerHTML = `
        <div class="layer-header">
            <h3>Layer Management</h3>
            <button class="layer-close" onclick="closeLayerPanel()">×</button>
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
    
    // Close layer panel when clicking outside
    setTimeout(() => {
        document.addEventListener('click', handleLayerPanelOutsideClick);
    }, 100);
}

function handleLayerPanelOutsideClick(e) {
    const layerPanel = document.getElementById('layer-panel');
    const layerToggle = document.querySelector('.layer-toggle');
    
    if (layerPanel && 
        !layerPanel.contains(e.target) && 
        !layerToggle.contains(e.target)) {
        closeLayerPanel();
    }
}

function closeLayerPanel() {
    const layerPanel = document.getElementById('layer-panel');
    if (layerPanel) {
        layerPanel.remove();
        document.removeEventListener('click', handleLayerPanelOutsideClick);
    }
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
            <div class="layer-drag-handle" style="cursor: grab; pointer-events: none;">
                <span class="hamburger-icon">☰</span>
            </div>
            <div class="layer-info" style="flex: 1; pointer-events: none;">
                <span class="layer-type">${widgetType.charAt(0).toUpperCase() + widgetType.slice(1)}</span>
                <span class="layer-z">Z: ${zIndex}</span>
            </div>
            <div class="layer-actions" style="pointer-events: auto;">
                <button onclick="toggleWidgetVisibility('${wrapper.id}')" title="Toggle Visibility" style="opacity: ${isHidden ? '0.5' : '1'}; pointer-events: auto;">${eyeIcon}</button>
                <button onclick="highlightWidget('${wrapper.id}')" title="Select Widget" style="pointer-events: auto;">🎯</button>
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
        layerItem.addEventListener('dragenter', handleLayerDragOver);
        layerItem.addEventListener('drop', handleLayerDrop);
        layerItem.addEventListener('dragend', handleLayerDragEnd);
        layerItem.addEventListener('dragleave', (e) => {
            // Only clear if we're leaving the layer item entirely
            if (!layerItem.contains(e.relatedTarget)) {
                layerItem.style.backgroundColor = '';
                layerItem.classList.remove('drop-zone');
            }
        });
        
        layerList.appendChild(layerItem);
    });
}

// Drag and drop handlers for layer management
let draggedLayerItem = null;

function handleLayerDragStart(e) {
    e.stopPropagation();
    draggedLayerItem = e.target.closest('.layer-item');
    if (draggedLayerItem) {
        console.log('Starting drag for:', draggedLayerItem.dataset.wrapperId); // Debug log
        draggedLayerItem.style.opacity = '0.5';
        draggedLayerItem.style.cursor = 'grabbing';
        draggedLayerItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedLayerItem.dataset.wrapperId);
        
        // Add a drag image
        const dragImage = draggedLayerItem.cloneNode(true);
        dragImage.style.opacity = '0.8';
        dragImage.style.background = 'rgba(0, 212, 255, 0.2)';
        document.body.appendChild(dragImage);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);
    }
}

function handleLayerDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Clear previous visual feedback
    document.querySelectorAll('.layer-item').forEach(item => {
        if (item !== draggedLayerItem) {
            item.style.backgroundColor = '';
            item.classList.remove('drop-zone');
        }
    });
    
    // Add visual feedback to target
    const targetItem = e.target.closest('.layer-item');
    if (targetItem && targetItem !== draggedLayerItem) {
        targetItem.style.backgroundColor = 'rgba(0, 212, 255, 0.3)';
        targetItem.classList.add('drop-zone');
    }
}

function handleLayerDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const targetItem = e.target.closest('.layer-item');
    if (targetItem && targetItem !== draggedLayerItem && draggedLayerItem) {
        const draggedWrapperId = draggedLayerItem.dataset.wrapperId;
        const targetWrapperId = targetItem.dataset.wrapperId;
        
        console.log('Dropping', draggedWrapperId, 'onto', targetWrapperId); // Debug log
        
        const draggedWrapper = document.getElementById(draggedWrapperId);
        const targetWrapper = document.getElementById(targetWrapperId);
        
        if (draggedWrapper && targetWrapper) {
            // Get all widgets and their current z-indices
            const allWrappers = Array.from(document.querySelectorAll('.widget-wrapper'));
            allWrappers.sort((a, b) => {
                const aZ = parseInt(a.style.zIndex) || 1000;
                const bZ = parseInt(b.style.zIndex) || 1000;
                return bZ - aZ; // Highest first (top layer first)
            });
            
            // Find positions in sorted array
            const draggedIndex = allWrappers.indexOf(draggedWrapper);
            const targetIndex = allWrappers.indexOf(targetWrapper);
            
            console.log('Current order:', allWrappers.map(w => w.id));
            console.log('Moving from index', draggedIndex, 'to', targetIndex);
            
            // Remove dragged item and insert at target position
            allWrappers.splice(draggedIndex, 1);
            allWrappers.splice(targetIndex, 0, draggedWrapper);
            
            // Reassign z-indices based on new order (highest to lowest)
            allWrappers.forEach((wrapper, index) => {
                const newZIndex = 2000 - index; // Start from high number and decrease
                wrapper.style.zIndex = newZIndex;
                console.log(`Setting ${wrapper.id} z-index to ${newZIndex}`);
            });
            
            console.log('New order:', allWrappers.map(w => w.id));
            
            // Update the layer list to reflect changes
            setTimeout(() => {
                updateLayerList();
            }, 100);
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
    const isCrypto = widgetType === 'crypto';
    
    // Enhanced customization options for crypto widgets
    const cryptoCustomizations = isCrypto ? `
        <div class="style-group">
            <div class="style-row">
                <label>Tip Button Color</label>
                <input type="color" class="style-color tip-btn-color" value="#00d4ff" onchange="updateCryptoStyle('${widgetId}')">
            </div>
        </div>
        <div class="style-group">
            <div class="style-row">
                <label>Tip Button Text Color</label>
                <input type="color" class="style-color tip-btn-text-color" value="#ffffff" onchange="updateCryptoStyle('${widgetId}')">
            </div>
        </div>
        <div class="style-group">
            <div class="style-row">
                <label>Send Button Color</label>
                <input type="color" class="style-color send-btn-color" value="#00ff88" onchange="updateCryptoStyle('${widgetId}')">
            </div>
        </div>
        <div class="style-group">
            <div class="style-row">
                <label>Send Button Text Color</label>
                <input type="color" class="style-color send-btn-text-color" value="#ffffff" onchange="updateCryptoStyle('${widgetId}')">
            </div>
        </div>
        <div class="style-group">
            <div class="style-row">
                <label>Header Text Color</label>
                <input type="color" class="style-color header-text-color" value="#ffffff" onchange="updateCryptoStyle('${widgetId}')">
            </div>
        </div>
        <div class="style-group">
            <div class="style-row">
                <label>Message Text Color</label>
                <input type="color" class="style-color message-text-color" value="#cccccc" onchange="updateCryptoStyle('${widgetId}')">
            </div>
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
    `;
    
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
            ${cryptoCustomizations}
        </div>
    `;
    
    // Position the panel near the widget with smart positioning
    const wrapper = widget.closest('.widget-wrapper');
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Calculate optimal position
    const panelWidth = 280;
    const panelHeight = 400; // Estimated height
    let left = wrapperRect.right + 10;
    let top = wrapperRect.top;
    
    // Check if panel would go off right edge
    if (left + panelWidth > window.innerWidth) {
        left = wrapperRect.left - panelWidth - 10; // Position to the left
        if (left < 0) {
            left = 10; // Fallback to left edge with margin
        }
    }
    
    // Check if panel would go off bottom edge
    if (top + panelHeight > window.innerHeight) {
        top = Math.max(wrapperRect.bottom - panelHeight, 10); // Position upward
    }
    
    // Ensure panel doesn't go off top edge
    top = Math.max(top, 10);
    
    stylePanel.style.cssText = `
        position: fixed;
        left: ${left}px;
        top: ${top}px;
        width: ${panelWidth}px;
        max-height: ${Math.min(panelHeight, window.innerHeight - 40)}px;
        overflow-y: auto;
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
    
    // Store reference to widget for repositioning during drag
    stylePanel.dataset.attachedWidget = widgetId;
    
    document.body.appendChild(stylePanel);
    
    // Set up mutation observer to detect widget movement
    const observer = new MutationObserver(() => {
        const currentWrapper = document.getElementById(widgetId)?.closest('.widget-wrapper');
        if (currentWrapper && stylePanel.parentElement) {
            const currentRect = currentWrapper.getBoundingClientRect();
            
            // Recalculate position
            let newLeft = currentRect.right + 10;
            let newTop = currentRect.top;
            
            // Apply same positioning logic
            if (newLeft + panelWidth > window.innerWidth) {
                newLeft = currentRect.left - panelWidth - 10;
                if (newLeft < 0) newLeft = 10;
            }
            
            if (newTop + panelHeight > window.innerHeight) {
                newTop = Math.max(currentRect.bottom - panelHeight, 10);
            }
            
            newTop = Math.max(newTop, 10);
            
            stylePanel.style.left = newLeft + 'px';
            stylePanel.style.top = newTop + 'px';
        }
    });
    
    // Observe changes to widget position
    if (wrapper) {
        observer.observe(wrapper, {
            attributes: true,
            attributeFilter: ['style']
        });
    }
    
    // Clean up observer when panel is removed
    const originalRemove = stylePanel.remove.bind(stylePanel);
    stylePanel.remove = function() {
        observer.disconnect();
        originalRemove();
    };
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
// SAFE AREA WARNING SYSTEM
// ========================================

let safeAreaVisible = false;

function createSafeAreaToggle() {
    const safeAreaToggle = document.createElement('button');
    safeAreaToggle.className = 'safe-area-toggle';
    safeAreaToggle.innerHTML = '⚠️';
    safeAreaToggle.title = 'Toggle Safe Area';
    safeAreaToggle.onclick = toggleSafeArea;
    document.body.appendChild(safeAreaToggle);
}

function toggleSafeArea() {
    safeAreaVisible = !safeAreaVisible;
    
    let overlay = document.getElementById('safe-area-overlay');
    if (!overlay) {
        overlay = createSafeAreaOverlay();
    }
    
    if (safeAreaVisible) {
        overlay.classList.add('active');
        updateSafeAreaBounds();
        checkWidgetsInBounds();
    } else {
        overlay.classList.remove('active');
        clearOutOfBoundsWarnings();
    }
}

function createSafeAreaOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'safe-area-overlay';
    overlay.className = 'safe-area-overlay';
    
    const warning = document.createElement('div');
    warning.className = 'safe-area-warning';
    warning.textContent = 'Safe viewing area - widgets outside may be cut off on smaller screens';
    
    overlay.appendChild(warning);
    document.body.appendChild(overlay);
    
    return overlay;
}

function updateSafeAreaBounds() {
    const overlay = document.getElementById('safe-area-overlay');
    if (!overlay) return;
    
    // Remove existing bounds
    const existingBounds = overlay.querySelector('.safe-area-bounds');
    if (existingBounds) existingBounds.remove();
    
    // Create safe area bounds (based on common mobile/tablet sizes)
    const bounds = document.createElement('div');
    bounds.className = 'safe-area-bounds';
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate safe area (80% of viewport with centering)
    const safeWidth = viewportWidth * 0.8;
    const safeHeight = viewportHeight * 0.8;
    const offsetX = (viewportWidth - safeWidth) / 2;
    const offsetY = (viewportHeight - safeHeight) / 2;
    
    bounds.style.left = offsetX + 'px';
    bounds.style.top = offsetY + 'px';
    bounds.style.width = safeWidth + 'px';
    bounds.style.height = safeHeight + 'px';
    
    overlay.appendChild(bounds);
}

function checkWidgetsInBounds() {
    if (!safeAreaVisible) return;
    
    clearOutOfBoundsWarnings();
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const safeWidth = viewportWidth * 0.8;
    const safeHeight = viewportHeight * 0.8;
    const offsetX = (viewportWidth - safeWidth) / 2;
    const offsetY = (viewportHeight - safeHeight) / 2;
    
    document.querySelectorAll('.widget-wrapper').forEach(wrapper => {
        const rect = wrapper.getBoundingClientRect();
        const left = parseInt(wrapper.style.left) || 0;
        const top = parseInt(wrapper.style.top) || 0;
        
        let isOutOfBounds = false;
        let warningText = '';
        
        if (left < offsetX) {
            isOutOfBounds = true;
            warningText = 'Too far left';
        } else if (left + rect.width > offsetX + safeWidth) {
            isOutOfBounds = true;
            warningText = 'Too far right';
        }
        
        if (top < offsetY) {
            isOutOfBounds = true;
            warningText = warningText ? 'Out of bounds' : 'Too high';
        } else if (top + rect.height > offsetY + safeHeight) {
            isOutOfBounds = true;
            warningText = warningText ? 'Out of bounds' : 'Too low';
        }
        
        if (isOutOfBounds) {
            addOutOfBoundsWarning(wrapper, warningText);
        }
    });
}

function addOutOfBoundsWarning(wrapper, text) {
    const warning = document.createElement('div');
    warning.className = 'out-of-bounds-warning';
    warning.textContent = text;
    warning.style.top = '-25px';
    warning.style.right = '0px';
    wrapper.appendChild(warning);
}

function clearOutOfBoundsWarnings() {
    document.querySelectorAll('.out-of-bounds-warning').forEach(warning => {
        warning.remove();
    });
}

// Update safe area when window resizes
window.addEventListener('resize', () => {
    if (safeAreaVisible) {
        updateSafeAreaBounds();
        setTimeout(checkWidgetsInBounds, 100);
    }
    
    // Adjust widgets for viewport to ensure consistent scaling with viewer
    adjustWidgetsForViewport_creator();
});

// Responsive scaling system for creator (matches viewer behavior)
function adjustWidgetsForViewport_creator() {
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
        if (widgetType === 'youtube' || widgetType === 'video' || widgetType === 'livestream') {
            const videoMaxWidth = getMaxVideoWidth(viewportWidth);
            newWidth = Math.min(newWidth, videoMaxWidth);
            newHeight = (newWidth / 16) * 9; // Maintain aspect ratio
            
            // Ensure height fits
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = (newHeight / 9) * 16;
            }
        } else {
            const typeMaxWidth = getMaxWidgetWidth(widgetType, viewportWidth);
            const typeMaxHeight = getMaxWidgetHeight(widgetType, viewportHeight);
            const minWidth = getMinWidgetWidth(widgetType);
            const minHeight = getMinWidgetHeight(widgetType);
            
            newWidth = Math.max(minWidth, Math.min(newWidth, typeMaxWidth));
            newHeight = Math.max(minHeight, Math.min(newHeight, typeMaxHeight));
        }
        
        // Apply adjusted dimensions smoothly
        if (newLeft !== currentLeft || newTop !== currentTop || 
            newWidth !== currentWidth || newHeight !== currentHeight) {
            wrapper.style.left = newLeft + 'px';
            wrapper.style.top = newTop + 'px';
            wrapper.style.width = newWidth + 'px';
            wrapper.style.height = newHeight + 'px';
            
            // Also update widget dimensions to match wrapper
            widget.style.width = newWidth + 'px';
            widget.style.height = newHeight + 'px';
        }
    });
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize with demo widget when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Create safe area toggle button
    createSafeAreaToggle();
    
    // Initialize snap functionality
    createSnapIndicators();
    addSnapCSS();
    createSnapToggleButton();
    createLayerManagementButton();
    initializeResizeSnap(); // Initialize resize snap functionality
    
    // Check for edit parameter to load existing layout
    checkForEditLayout();
    
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

function publishLayout(currentUser, worldName) {
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
    const layoutId = worldName ? `${currentUser?.username || 'anonymous'}_${worldName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}` : Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const layout = {
        id: layoutId,
        widgets: widgets,
        background: getCurrentBackground(),
        timestamp: new Date().toISOString(),
        published: true,
        creatorName: currentUser?.username || 'Anonymous Creator',
        worldName: worldName || 'Untitled World',
        creatorAddress: currentUser?.walletAddress
    };
    
    // Save as published layout with correct key format
    localStorage.setItem('web3DemoPublishedLayout', JSON.stringify(layout));
    localStorage.setItem(`layout_${layoutId}`, JSON.stringify(layout));
    
    // Generate shareable URL
    const baseUrl = window.location.origin + window.location.pathname.replace('creator.html', '');
    const shareableUrl = `${baseUrl}viewer.html?layout=${layoutId}`;
    
    // Update button temporarily
    const btn = document.querySelector('.publish-btn');
    const originalText = btn.textContent;
    const originalBackground = btn.style.background;
    btn.textContent = '✅ Published!';
    btn.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
    
    // Show publish success modal
    showPublishSuccessModal(shareableUrl);
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBackground;
    }, 3000);
}

// ========================================
// EDIT LAYOUT FUNCTIONALITY
// ========================================
function checkForEditLayout() {
    const urlParams = new URLSearchParams(window.location.search);
    const editLayoutId = urlParams.get('edit');
    
    if (editLayoutId) {
        console.log('🔧 Loading layout for editing:', editLayoutId);
        loadLayoutForEditing(editLayoutId);
    }
}

function loadLayoutForEditing(layoutId) {
    try {
        // Try to find the layout in localStorage
        const layout = JSON.parse(localStorage.getItem(`layout_${layoutId}`)) || 
                      JSON.parse(localStorage.getItem('web3DemoPublishedLayout'));
        
        if (layout && layout.id === layoutId) {
            console.log('✅ Found layout to edit:', layout);
            
            // Clear existing widgets
            document.getElementById('canvas').innerHTML = '';
            
            // Set background
            if (layout.background) {
                applyBackground(layout.background);
            }
            
            // Restore widgets
            if (layout.widgets && layout.widgets.length > 0) {
                layout.widgets.forEach((widgetData, index) => {
                    restoreWidget(widgetData, index);
                });
            }
            
            // Show success message
            const worldName = layout.worldName || 'your world';
            showToast(`📝 Loaded "${worldName}" for editing. Make your changes and publish when ready!`, 'success');
            
        } else {
            console.log('❌ Layout not found for ID:', layoutId);
            showToast('⚠️ Could not find the requested world to edit.', 'error');
        }
        
    } catch (error) {
        console.error('❌ Failed to load layout for editing:', error);
        showToast('❌ Failed to load world for editing.', 'error');
    }
}

function applyBackground(backgroundData) {
    const bg = document.getElementById('bg');
    if (bg && backgroundData) {
        if (backgroundData.type === 'solid') {
            bg.style.background = backgroundData.color;
        } else if (backgroundData.type === 'linear-gradient') {
            bg.style.background = `linear-gradient(${backgroundData.direction}, ${backgroundData.colors.join(', ')})`;
        } else if (backgroundData.type === 'radial-gradient') {
            bg.style.background = `radial-gradient(${backgroundData.shape} at ${backgroundData.position}, ${backgroundData.colors.join(', ')})`;
        } else if (backgroundData.type === 'image') {
            bg.style.background = `url(${backgroundData.url})`;
            bg.style.backgroundSize = backgroundData.size || 'cover';
            bg.style.backgroundPosition = backgroundData.position || 'center';
            bg.style.backgroundRepeat = backgroundData.repeat || 'no-repeat';
        }
    }
}

function restoreWidget(widgetData, index) {
    // This function would recreate widgets from saved data
    // Implementation depends on how widgets are originally created
    console.log('🔄 Restoring widget:', widgetData);
    
    // Basic implementation - create widget wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'widget-wrapper';
    wrapper.id = widgetData.id || `widget${counter++}`;
    wrapper.style.left = widgetData.x;
    wrapper.style.top = widgetData.y;
    wrapper.style.width = widgetData.width;
    wrapper.style.height = widgetData.height;
    
    // Create the actual widget based on type
    const widget = createWidgetByType(widgetData.type);
    if (widget) {
        widget.dataset.type = widgetData.type;
        wrapper.appendChild(widget);
        
        // Apply customization if available
        if (widgetData.customization) {
            applyWidgetCustomization(widget, widgetData.customization);
        }
        
        // Restore widget state if available
        if (widgetData.state) {
            restoreWidgetState(widget, widgetData.state, widgetData.type);
        }
        
        document.getElementById('canvas').appendChild(wrapper);
        
        // Make it draggable and resizable
        makeDraggable(wrapper);
        makeResizable(wrapper);
    }
}

function createWidgetByType(type) {
    // Create a basic widget element based on type
    const widget = document.createElement('div');
    widget.className = 'widget';
    
    switch(type) {
        case 'crypto':
            widget.innerHTML = '<div class="tip-container"><div class="tip-header">💰 Tips</div><div class="tip-buttons"><button class="tip-btn">$1</button><button class="tip-btn">$5</button><button class="tip-btn">$10</button></div></div>';
            break;
        case 'twitter':
            widget.innerHTML = '<div class="twitter-container"><div class="twitter-header">🐦 Twitter Feed</div><div class="twitter-content">Latest tweets will appear here</div></div>';
            break;
        case 'instagram':
            widget.innerHTML = '<div class="instagram-container"><div class="instagram-header">📷 Instagram</div><div class="instagram-content">Instagram posts will appear here</div></div>';
            break;
        case 'youtube':
            widget.innerHTML = '<div class="youtube-container"><iframe src="about:blank" frameborder="0"></iframe></div>';
            break;
        case 'livestream':
            widget.innerHTML = '<div class="livestream-container"><div class="livestream-placeholder">📺 Live Stream</div></div>';
            break;
        case 'video':
            widget.innerHTML = '<div class="video-container"><video controls><source src="" type="video/mp4">Your browser does not support video.</video></div>';
            break;
        case 'discord':
            widget.innerHTML = '<div class="discord-container"><div class="discord-header">💬 Discord</div><div class="discord-content">Discord integration</div></div>';
            break;
        default:
            widget.innerHTML = '<div class="default-widget">Widget Content</div>';
    }
    
    return widget;
}

function applyWidgetCustomization(widget, customization) {
    if (!customization) return;
    
    // Apply background color and opacity
    if (customization.opacity !== undefined) {
        const opacity = customization.opacity;
        const bgColor = customization.bgColor || '#000000';
        const borderColor = customization.borderColor || '#00d4ff';
        
        // Convert hex to rgba for opacity
        const r = parseInt(bgColor.substr(1,2), 16);
        const g = parseInt(bgColor.substr(3,2), 16);
        const b = parseInt(bgColor.substr(5,2), 16);
        
        widget.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        widget.style.borderColor = borderColor;
    }
    
    // Apply button customization
    if (customization.buttonColor || customization.buttonTextColor) {
        const buttons = widget.querySelectorAll('button');
        buttons.forEach(button => {
            if (customization.buttonColor) {
                button.style.backgroundColor = customization.buttonColor;
            }
            if (customization.buttonTextColor) {
                button.style.color = customization.buttonTextColor;
            }
        });
    }
}

function restoreWidgetState(widget, state, type) {
    // Restore widget-specific state
    if (type === 'youtube' && state.videoId) {
        const iframe = widget.querySelector('iframe');
        if (iframe) {
            iframe.src = `https://www.youtube.com/embed/${state.videoId}`;
        }
    }
    // Add more state restoration logic for other widget types as needed
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#00ff88' : 
                   type === 'error' ? '#ff4757' : 
                   type === 'info' ? '#667eea' : '#667eea';
    
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${bgColor}; 
        color: white; padding: 15px 20px; border-radius: 10px; z-index: 10001;
        font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        transform: translateX(100%); transition: transform 0.3s ease;
        max-width: 350px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showPublishSuccessModal(shareableUrl) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'publish-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'publish-modal';
    modal.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 20px;
        padding: 30px;
        width: 90%;
        max-width: 500px;
        text-align: center;
        color: white;
        border: 2px solid rgba(0, 212, 255, 0.3);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.3s ease;
        position: relative;
    `;
    
    modal.innerHTML = `
        <div style="margin-bottom: 20px; font-size: 48px;">🚀</div>
        <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #00ff88;">Layout Published!</h2>
        <p style="margin: 0 0 25px 0; color: rgba(255, 255, 255, 0.8); font-size: 16px;">
            Your layout is now live and ready to share with the world.
        </p>
        
        <div style="background: rgba(0, 0, 0, 0.3); border-radius: 12px; padding: 15px; margin: 20px 0; border: 1px solid rgba(0, 212, 255, 0.2);">
            <div style="margin-bottom: 10px; font-size: 14px; color: rgba(255, 255, 255, 0.7);">Shareable Link:</div>
            <div style="background: rgba(0, 0, 0, 0.5); padding: 10px; border-radius: 8px; font-family: monospace; font-size: 14px; word-break: break-all; border: 1px solid rgba(0, 212, 255, 0.3);" id="shareableLink">${shareableUrl}</div>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: center; margin: 25px 0; flex-wrap: wrap;">
            <button onclick="copyToClipboard('${shareableUrl}')" style="
                background: linear-gradient(135deg, #00d4ff, #0099cc);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                transition: transform 0.2s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                📋 Copy Link
            </button>
            <button onclick="window.open('${shareableUrl}', '_blank')" style="
                background: linear-gradient(135deg, #00ff88, #00cc6a);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                transition: transform 0.2s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                👁️ Preview
            </button>
            <button onclick="window.location.href='creator.html'" style="
                background: linear-gradient(135deg, #9d4edd, #7b2cbf);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                transition: transform 0.2s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                ✨ Create Another World
            </button>
        </div>
        
        <button onclick="closePublishModal()" style="
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease;
        " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
            ×
        </button>
    `;
    
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    // Close modal when clicking overlay
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closePublishModal();
        }
    });
    
    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-30px) scale(0.9); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

function closePublishModal() {
    const modal = document.querySelector('.publish-modal-overlay');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show temporary success message
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        button.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}

function captureLayoutState() {
    const widgets = [];
    const wrappers = document.querySelectorAll('.widget-wrapper');
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    wrappers.forEach((wrapper, index) => {
        const widget = wrapper.querySelector('.widget');
        const widgetType = widget.dataset.type;
        
        // Convert pixel positions to percentages for responsive layout
        const leftPx = parseInt(wrapper.style.left) || 0;
        const topPx = parseInt(wrapper.style.top) || 0;
        const widthPx = parseInt(wrapper.style.width) || 300;
        const heightPx = parseInt(wrapper.style.height) || 200;
        
        const widgetData = {
            id: wrapper.id,
            type: widgetType,
            x: ((leftPx / viewportWidth) * 100) + '%',
            y: ((topPx / viewportHeight) * 100) + '%',
            width: ((widthPx / viewportWidth) * 100) + '%',
            height: ((heightPx / viewportHeight) * 100) + '%',
            // Keep pixel values for fallback
            pixelX: wrapper.style.left,
            pixelY: wrapper.style.top,
            pixelWidth: wrapper.style.width,
            pixelHeight: wrapper.style.height,
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
            
        case 'livestream':
            const streamInput = document.getElementById(`stream${counter}`);
            const streamContent = document.getElementById(`streamc${counter}`);
            if (streamInput && streamInput.value) {
                state.streamUrl = streamInput.value;
                state.streamContent = streamContent ? streamContent.innerHTML : '';
                state.streamLoaded = widget.classList.contains('video-loaded');
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