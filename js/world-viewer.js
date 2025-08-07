// World Viewer JavaScript
let authenticatedWallet = null;
let currentWorld = null;
let creatorUser = null;
let worldData = null;
let urlParams = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    urlParams = new URLSearchParams(window.location.search);
    await initializeWallet();
    await loadWorld();
    setupEventListeners();
});

// ========================================
// INITIALIZATION
// ========================================
async function initializeWallet() {
    try {
        // Initialize wallet manager (for tipping functionality)
        if (typeof walletManager !== 'undefined') {
            authenticatedWallet = new AuthenticatedWalletManager();
        }
    } catch (error) {
        console.log('Wallet not available:', error);
    }
}

async function loadWorld() {
    try {
        const username = urlParams.get('user');
        const worldId = urlParams.get('world') || 'main';
        
        if (!username) {
            showError('Invalid world URL', 'Please check the URL and try again.');
            return;
        }

        updateLoadingText('Finding creator...');
        
        // Find user by username
        creatorUser = await findUserByUsername(username);
        if (!creatorUser) {
            showError('Creator Not Found', `No creator found with username "${username}".`);
            return;
        }

        updateLoadingText('Loading world data...');
        
        // Get user's worlds
        const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
        const userWorlds = allWorlds[creatorUser.walletAddress] || {};
        
        worldData = userWorlds[worldId];
        if (!worldData) {
            showError('World Not Found', `The world "${worldId}" doesn't exist or is private.`);
            return;
        }

        // Check if world is private and user doesn't have access
        if (worldData.privacy === 'private') {
            const currentUser = authenticatedWallet?.getCurrentUser();
            if (!currentUser || currentUser.walletAddress !== creatorUser.walletAddress) {
                showError('Private World', 'This world is private and you don\'t have access to view it.');
                return;
            }
        }

        updateLoadingText('Setting up experience...');
        
        // Update view count
        await incrementViewCount();
        
        // Display the world
        displayWorld();
        hideLoadingScreen();
        
    } catch (error) {
        console.error('Failed to load world:', error);
        showError('Loading Error', 'Failed to load world. Please try again.');
    }
}

async function findUserByUsername(username) {
    try {
        const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
        
        // Find user with matching username
        for (const [walletAddress, userData] of Object.entries(users)) {
            if (userData.username && userData.username.toLowerCase() === username.toLowerCase()) {
                return {
                    ...userData,
                    walletAddress: walletAddress
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('Failed to find user:', error);
        return null;
    }
}

async function incrementViewCount() {
    try {
        if (!worldData || !creatorUser) return;
        
        // Don't count creator's own views
        const currentUser = authenticatedWallet?.getCurrentUser();
        if (currentUser && currentUser.walletAddress === creatorUser.walletAddress) {
            return;
        }

        // Update view count
        worldData.stats.views = (worldData.stats.views || 0) + 1;
        
        // Save back to storage
        const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
        allWorlds[creatorUser.walletAddress][worldData.id] = worldData;
        localStorage.setItem('user_worlds', JSON.stringify(allWorlds));
        
    } catch (error) {
        console.error('Failed to increment view count:', error);
    }
}

// ========================================
// WORLD DISPLAY
// ========================================
function displayWorld() {
    if (!worldData || !creatorUser) return;

    // Update page title
    document.title = `${worldData.name} - ${creatorUser.username} | GENESIS`;
    document.getElementById('pageTitle').textContent = `${worldData.name} - ${creatorUser.username} | GENESIS`;
    
    // Apply theme
    applyWorldTheme();
    
    // Update breadcrumb
    updateBreadcrumb();
    
    // Display world content
    displayHeroSection();
    displaySubWorlds();
    displayContent();
    displayCreatorBio();
    
    // Update tip modal info
    updateTipModal();
    
    // Update share URL
    updateShareUrl();
}

function applyWorldTheme() {
    const theme = worldData.theme || 'purple';
    document.body.className = `world-page ${theme}-theme`;
    
    // Update banner if available
    const heroBanner = document.getElementById('heroBanner');
    if (heroBanner && worldData.banner) {
        heroBanner.style.backgroundImage = `url(${worldData.banner})`;
        heroBanner.style.backgroundSize = 'cover';
        heroBanner.style.backgroundPosition = 'center';
    }
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('currentBreadcrumb');
    if (breadcrumb) {
        if (worldData.type === 'main') {
            breadcrumb.textContent = `${creatorUser.username}'s World`;
        } else {
            breadcrumb.textContent = `${creatorUser.username} > ${worldData.name}`;
        }
    }
}

function displayHeroSection() {
    // Update creator avatar
    const creatorAvatar = document.getElementById('creatorAvatar');
    if (creatorAvatar && creatorUser.username) {
        creatorAvatar.textContent = creatorUser.username.charAt(0).toUpperCase();
    }
    
    // Update world title
    const worldTitle = document.getElementById('worldTitle');
    if (worldTitle) {
        worldTitle.textContent = worldData.name;
    }
    
    // Update world description
    const worldDescription = document.getElementById('worldDescription');
    if (worldDescription) {
        worldDescription.textContent = worldData.description || 'Welcome to this amazing world!';
    }
    
    // Update stats
    updateWorldStats();
}

function updateWorldStats() {
    const viewCount = document.getElementById('viewCount');
    const tipTotal = document.getElementById('tipTotal');
    const worldAge = document.getElementById('worldAge');
    
    if (viewCount) {
        viewCount.textContent = formatNumber(worldData.stats?.views || 0);
    }
    
    if (tipTotal) {
        tipTotal.textContent = formatNumber(worldData.stats?.tips || 0);
    }
    
    if (worldAge && worldData.createdAt) {
        const createdDate = new Date(worldData.createdAt);
        const daysDiff = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        worldAge.textContent = `${daysDiff}d`;
    }
}

function displaySubWorlds() {
    // Get all sub-worlds for this creator
    const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
    const userWorlds = allWorlds[creatorUser.walletAddress] || {};
    
    // Filter out main world and private worlds
    const subWorlds = Object.values(userWorlds).filter(world => 
        world.type !== 'main' && 
        world.privacy === 'public' && 
        world.id !== worldData.id
    );
    
    if (subWorlds.length > 0) {
        displaySubWorldsNav(subWorlds);
    }
}

function displaySubWorldsNav(subWorlds) {
    const subWorldsNav = document.getElementById('subWorldsNav');
    const subWorldsList = document.getElementById('subWorldsList');
    
    if (!subWorldsNav || !subWorldsList) return;
    
    subWorldsNav.style.display = 'block';
    
    subWorldsList.innerHTML = subWorlds.map(world => `
        <a href="world.html?user=${creatorUser.username}&world=${world.id}" class="sub-world-link">
            ${world.name}
        </a>
    `).join('');
}

function displayContent() {
    displayNFTSection();
    displayWidgetsSection();
}

function displayNFTSection() {
    // Placeholder for NFT display
    // In production, this would fetch NFTs from the user's wallet
    const nftSection = document.getElementById('nftSection');
    const nftGrid = document.getElementById('nftGrid');
    
    if (!nftSection || !nftGrid) return;
    
    // For now, show placeholder
    nftGrid.innerHTML = `
        <div class="nft-placeholder">
            <div class="placeholder-icon">🖼️</div>
            <h4>NFT Collection</h4>
            <p>NFT display feature coming soon! This will show the creator's wallet NFTs.</p>
        </div>
    `;
    
    // Hide section for now
    // nftSection.style.display = 'block';
}

function displayWidgetsSection() {
    const widgetsContainer = document.getElementById('widgetsContainer');
    if (!widgetsContainer) return;
    
    // Check if world has widgets
    if (worldData.content && worldData.content.widgets && worldData.content.widgets.length > 0) {
        // Display actual widgets
        displayWorldWidgets();
    } else {
        // Show placeholder
        widgetsContainer.innerHTML = `
            <div class="widget-placeholder">
                <div class="placeholder-icon">🎮</div>
                <h4>Interactive Experience</h4>
                <p>This creator hasn't added any interactive widgets yet. Check back later for amazing content!</p>
            </div>
        `;
    }
}

function displayWorldWidgets() {
    // TODO: Implement actual widget rendering
    // This would render the creator's saved widgets from the creator page
    console.log('Rendering world widgets:', worldData.content.widgets);
}

function displayCreatorBio() {
    // Update bio avatar
    const bioAvatar = document.getElementById('bioAvatar');
    if (bioAvatar && creatorUser.username) {
        bioAvatar.textContent = creatorUser.username.charAt(0).toUpperCase();
    }
    
    // Update creator name
    const creatorName = document.getElementById('creatorName');
    if (creatorName) {
        creatorName.textContent = creatorUser.username || 'Creator';
    }
    
    // Update creator bio
    const creatorBio = document.getElementById('creatorBio');
    if (creatorBio) {
        creatorBio.textContent = creatorUser.bio || 'Creative professional building amazing digital experiences.';
    }
    
    // Update creator wallet
    const creatorWallet = document.getElementById('creatorWallet');
    if (creatorWallet) {
        creatorWallet.textContent = formatAddress(creatorUser.walletAddress);
    }
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Tip message character counter
    const tipMessage = document.getElementById('tipMessage');
    const messageCount = document.getElementById('messageCount');
    
    if (tipMessage && messageCount) {
        tipMessage.addEventListener('input', () => {
            messageCount.textContent = tipMessage.value.length;
            messageCount.style.color = tipMessage.value.length > 180 ? '#ff4757' : '#667eea';
        });
    }
    
    // Tip form submission
    const tipForm = document.getElementById('tipForm');
    if (tipForm) {
        tipForm.addEventListener('submit', handleTipSubmission);
    }
    
    // Close modals on backdrop click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModals();
        }
    });
    
    // Update tip button based on wallet connection
    updateTipButton();
    
    // Listen for wallet connection changes
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', () => {
            updateTipButton();
            updateTipModal();
        });
    }
}

// ========================================
// TIP FUNCTIONALITY
// ========================================
function openTipModal() {
    const modal = document.getElementById('tipModal');
    if (!modal) return;
    
    updateTipModal();
    modal.style.display = 'flex';
}

function closeTipModal() {
    const modal = document.getElementById('tipModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('tipForm').reset();
    }
}

function updateTipModal() {
    if (!creatorUser) return;
    
    // Update recipient info
    const recipientAvatar = document.getElementById('tipRecipientAvatar');
    const recipientName = document.getElementById('tipRecipientName');
    const recipientWallet = document.getElementById('tipRecipientWallet');
    
    if (recipientAvatar && creatorUser.username) {
        recipientAvatar.textContent = creatorUser.username.charAt(0).toUpperCase();
    }
    
    if (recipientName) {
        recipientName.textContent = creatorUser.username || 'Creator';
    }
    
    if (recipientWallet) {
        recipientWallet.textContent = formatAddress(creatorUser.walletAddress);
    }
    
    updateTipButton();
}

function updateTipButton() {
    const sendTipBtn = document.getElementById('sendTipBtn');
    const networkInfo = document.getElementById('networkInfo');
    
    if (!sendTipBtn || !networkInfo) return;
    
    if (authenticatedWallet && authenticatedWallet.isConnected) {
        // Wallet connected
        networkInfo.classList.add('connected');
        networkInfo.innerHTML = `
            <div class="network-status">
                <span class="network-icon">✅</span>
                <span class="network-text">Ready to send tip on ${authenticatedWallet.getNetworkName()}</span>
            </div>
        `;
        sendTipBtn.disabled = false;
        sendTipBtn.textContent = '🚀 Send Tip';
    } else {
        // Wallet not connected
        networkInfo.classList.remove('connected');
        networkInfo.innerHTML = `
            <div class="network-status">
                <span class="network-icon">⚠️</span>
                <span class="network-text">Please connect your wallet to send tips</span>
            </div>
        `;
        sendTipBtn.disabled = true;
        sendTipBtn.textContent = 'Connect Wallet First';
    }
}

function setTipAmount(amount) {
    const tipAmount = document.getElementById('tipAmount');
    if (tipAmount) {
        tipAmount.value = amount;
    }
}

async function handleTipSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const amount = parseFloat(formData.get('tipAmount'));
    const message = formData.get('tipMessage');
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid tip amount.');
        return;
    }
    
    if (!authenticatedWallet || !authenticatedWallet.isConnected) {
        alert('Please connect your wallet first.');
        return;
    }
    
    try {
        const sendTipBtn = document.getElementById('sendTipBtn');
        sendTipBtn.disabled = true;
        sendTipBtn.textContent = 'Sending...';
        
        // Send tip using wallet manager
        const result = await authenticatedWallet.sendTip(
            creatorUser.walletAddress,
            amount,
            message
        );
        
        if (result.success) {
            // Update tip count
            if (worldData.stats) {
                worldData.stats.tips = (worldData.stats.tips || 0) + 1;
                updateWorldStats();
                
                // Save updated stats
                const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
                allWorlds[creatorUser.walletAddress][worldData.id] = worldData;
                localStorage.setItem('user_worlds', JSON.stringify(allWorlds));
            }
            
            closeTipModal();
            showToast(`✅ Tip of ${amount} ETH sent successfully!`, 'success');
            
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Tip failed:', error);
        showToast(`❌ Failed to send tip: ${error.message}`, 'error');
        
    } finally {
        const sendTipBtn = document.getElementById('sendTipBtn');
        sendTipBtn.disabled = false;
        updateTipButton();
    }
}

// ========================================
// SHARING FUNCTIONALITY
// ========================================
function shareWorld() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        updateShareUrl();
        modal.style.display = 'flex';
    }
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateShareUrl() {
    const shareUrl = document.getElementById('shareUrl');
    if (shareUrl && creatorUser) {
        const url = worldData.type === 'main' 
            ? `${window.location.origin}/world.html?user=${creatorUser.username}`
            : `${window.location.origin}/world.html?user=${creatorUser.username}&world=${worldData.id}`;
        shareUrl.value = url;
    }
}

async function copyShareUrl() {
    try {
        const shareUrl = document.getElementById('shareUrl');
        if (shareUrl) {
            await navigator.clipboard.writeText(shareUrl.value);
            showToast('✅ URL copied to clipboard!', 'success');
        }
    } catch (error) {
        console.error('Failed to copy URL:', error);
        showToast('❌ Failed to copy URL', 'error');
    }
}

function shareOnTwitter() {
    const url = document.getElementById('shareUrl').value;
    const text = `Check out ${creatorUser.username}'s amazing world: ${worldData.name}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
}

function shareOnFacebook() {
    const url = document.getElementById('shareUrl').value;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank');
}

function shareOnDiscord() {
    const url = document.getElementById('shareUrl').value;
    const message = `Check out ${creatorUser.username}'s world: ${worldData.name} - ${url}`;
    
    // Copy to clipboard for Discord
    navigator.clipboard.writeText(message).then(() => {
        showToast('✅ Message copied! Paste it in Discord.', 'success');
    });
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
async function copyCreatorWallet() {
    try {
        await navigator.clipboard.writeText(creatorUser.walletAddress);
        showToast('✅ Wallet address copied!', 'success');
    } catch (error) {
        console.error('Failed to copy wallet address:', error);
        showToast('❌ Failed to copy address', 'error');
    }
}

function followCreator() {
    // TODO: Implement follow functionality
    showToast('💙 Follow feature coming soon!', 'info');
}

function closeModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatAddress(address) {
    if (!address) return '0x0000...0000';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function updateLoadingText(text) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function showError(title, message) {
    hideLoadingScreen();
    
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorState) {
        errorState.style.display = 'flex';
    }
    
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    
    // Update page title
    document.title = `${title} - GENESIS`;
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