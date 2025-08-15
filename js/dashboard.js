// Dashboard JavaScript
let authenticatedWallet = null;
let currentUser = null;

// Wait for Genesis wallet to be available
async function waitForGenesisWallet() {
    console.log('⏳ Waiting for Genesis wallet...');
    let attempts = 0;
    while (!window.genesisWallet && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.genesisWallet) {
        throw new Error('Genesis wallet not available after waiting');
    }
    console.log('✅ Genesis wallet ready');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Dashboard loading...');
    await initializeAuth();
    await loadDashboardData();
    setupEventListeners();
    hideLoadingScreen();
});

// ========================================
// AUTHENTICATION & INITIALIZATION
// ========================================
async function initializeAuth() {
    try {
        console.log('🔐 Initializing dashboard authentication...');
        
        // Wait for Genesis wallet to be ready
        await waitForGenesisWallet();
        
        // Use the Genesis wallet system
        authenticatedWallet = window.genesisWallet;
        
        if (!authenticatedWallet) {
            console.log('❌ Genesis wallet not available');
            redirectToHome();
            return;
        }
        
        console.log('👤 Checking wallet authentication...');
        console.log('Connected:', authenticatedWallet.connected);
        console.log('Authenticated:', authenticatedWallet.isAuthenticated);
        console.log('Account:', authenticatedWallet.account);
        
        // Check if wallet is connected (either authenticated or just connected with account)
        if (!authenticatedWallet.account) {
            console.log('❌ No wallet account found, redirecting to home');
            redirectToHome();
            return;
        }

        currentUser = authenticatedWallet.getCurrentUser();
        console.log('✅ User authenticated:', currentUser);

        // If no username, redirect to profile setup
        if (!currentUser?.username) {
            console.log('ℹ️ No username set. Redirecting to profile setup.');
            window.location.href = 'profile-setup.html?from=auth';
            return;
        }
        
        updateUserUI();
        
    } catch (error) {
        console.error('❌ Dashboard authentication failed:', error);
        // Try legacy initialization as fallback
        await legacyDashboardAuth();
    }
}

// Legacy dashboard authentication for backward compatibility
async function legacyDashboardAuth() {
    try {
        console.log('🔄 Using legacy dashboard authentication...');
        
        // Wait for Moralis wallet manager to be available
        if (typeof walletManager === 'undefined') {
            console.log('⏳ Waiting for Moralis wallet manager...');
            await new Promise(r => setTimeout(r, 1000));
            if (typeof walletManager === 'undefined') {
                console.log('❌ Wallet manager not found, redirecting to home');
                redirectToHome();
                return;
            }
        }

        // Use Moralis wallet manager
        authenticatedWallet = walletManager;
        
        // Wait for Moralis initialization
        let retryCount = 0;
        const maxRetries = 8;
        
        while (!authenticatedWallet.initialized && retryCount < maxRetries) {
            console.log(`⏳ Attempt ${retryCount + 1}/${maxRetries} - waiting for Moralis initialization...`);
            await new Promise(r => setTimeout(r, 400));
            retryCount++;
        }
        
        if (!authenticatedWallet.initialized) {
            console.log('❌ Moralis not initialized, redirecting to home');
            redirectToHome();
            return;
        }
        
        // Check for existing authentication
        await authenticatedWallet.checkExistingSession();
        
        if (!authenticatedWallet.isAuthenticated) {
            console.log('❌ User not authenticated, redirecting to home');
            redirectToHome();
            return;
        }

        currentUser = authenticatedWallet.getCurrentUser();
        console.log('✅ User authenticated:', currentUser);

        // If no username, redirect to profile setup
        if (!currentUser?.username) {
            console.log('ℹ️ No username set. Redirecting to profile setup.');
            window.location.href = 'profile-setup.html?from=auth';
            return;
        }
        
        updateUserUI();
        
    } catch (error) {
        console.error('❌ Legacy dashboard authentication failed:', error);
        redirectToHome();
    }
}

function redirectToHome() {
    console.log('🏠 Redirecting to home page...');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 100);
}

function updateUserUI() {
    if (!currentUser) return;

    console.log('🎨 Updating dashboard UI for user:', currentUser.username);

    // Update welcome message
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) {
        welcomeName.textContent = currentUser.username || 'Creator';
    }

    // Update user menu
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) {
        userName.textContent = currentUser.username || 'User';
    }
    
    if (userAvatar && currentUser.username) {
        userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    }

    // Update stats (placeholder data for now)
    updateStats();
}

function updateStats() {
    // Get user's worlds for stats
    const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
    const userWorlds = allWorlds[currentUser.walletAddress] || {};
    
    const worldCount = Object.keys(userWorlds).length;
    let totalViews = 0;
    let totalTips = 0;
    
    // Calculate totals
    Object.values(userWorlds).forEach(world => {
        if (world.stats) {
            totalViews += world.stats.views || 0;
            totalTips += world.stats.tips || 0;
        }
    });
    
    // Update UI
    const worldCountEl = document.getElementById('worldCount');
    const viewCountEl = document.getElementById('viewCount');
    const tipCountEl = document.getElementById('tipCount');
    const ratingValueEl = document.getElementById('ratingValue');
    
    if (worldCountEl) worldCountEl.textContent = worldCount;
    if (viewCountEl) viewCountEl.textContent = formatNumber(totalViews);
    if (tipCountEl) tipCountEl.textContent = formatNumber(totalTips);
    if (ratingValueEl) ratingValueEl.textContent = '5.0'; // Placeholder
}

// ========================================
// DASHBOARD DATA LOADING
// ========================================
async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...');
        
        // Load recent activity
        loadRecentActivity();
        
        // Check profile completion
        checkProfileCompletion();
        
        console.log('✅ Dashboard data loaded');
        
    } catch (error) {
        console.error('❌ Failed to load dashboard data:', error);
    }
}

function loadRecentActivity() {
    const activityFeed = document.getElementById('activityFeed');
    if (!activityFeed) return;
    
    // For now, show welcome message and placeholder
    const welcomeActivity = `
        <div class="activity-item">
            <div class="activity-icon">✨</div>
            <div class="activity-content">
                <div class="activity-title">Welcome to GENESIS!</div>
                <div class="activity-desc">Your dashboard is ready. Start creating amazing worlds!</div>
                <div class="activity-time">Just now</div>
            </div>
        </div>
    `;
    
    const placeholder = `
        <div class="activity-placeholder">
            <div class="placeholder-icon">📊</div>
            <div class="placeholder-content">
                <h4>Your activity will appear here</h4>
                <p>Create your first world to start seeing activity updates, tips, and viewer interactions.</p>
            </div>
        </div>
    `;
    
    activityFeed.innerHTML = welcomeActivity + placeholder;
}

function checkProfileCompletion() {
    const profileSection = document.getElementById('profileSection');
    if (!profileSection || !currentUser) return;
    
    // Calculate profile completion
    let completedTasks = 0;
    let totalTasks = 4;
    
    // Check completion criteria
    if (currentUser.walletAddress) completedTasks++;
    if (currentUser.username) completedTasks++;
    if (currentUser.bio) completedTasks++;
    
    // Check if user has created worlds
    const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
    const userWorlds = allWorlds[currentUser.walletAddress] || {};
    if (Object.keys(userWorlds).length > 0) completedTasks++;
    
    const completionPercentage = Math.round((completedTasks / totalTasks) * 100);
    
    // Show profile section if not 100% complete
    if (completionPercentage < 100) {
        profileSection.style.display = 'block';
        
        // Update progress
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) progressFill.style.width = `${completionPercentage}%`;
        if (progressText) progressText.textContent = `${completionPercentage}% Complete`;
    }
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // User menu click
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.addEventListener('click', toggleUserDropdown);
    }
    
    // Listen for wallet changes
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0 || (currentUser && accounts[0].toLowerCase() !== currentUser.walletAddress.toLowerCase())) {
                // Account changed or disconnected, redirect to home
                redirectToHome();
            }
        });
    }
}

// ========================================
// UI INTERACTIONS
// ========================================
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        // Show dropdown
        dropdown.style.display = 'block';
        updateDropdownInfo();
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOnOutsideClick);
        }, 100);
    } else {
        // Hide dropdown
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdownOnOutsideClick);
    }
}

function closeDropdownOnOutsideClick(e) {
    const dropdown = document.getElementById('userDropdown');
    const userMenu = document.getElementById('userMenu');
    
    if (dropdown && userMenu && !dropdown.contains(e.target) && !userMenu.contains(e.target)) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdownOnOutsideClick);
    }
}

function updateDropdownInfo() {
    if (!currentUser) return;
    
    const dropdownName = document.getElementById('dropdownName');
    const dropdownWallet = document.getElementById('dropdownWallet');
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    
    if (dropdownName) {
        dropdownName.textContent = currentUser.username || 'User';
    }
    
    if (dropdownWallet) {
        dropdownWallet.textContent = formatAddress(currentUser.walletAddress);
    }
    
    if (dropdownAvatar && currentUser.username) {
        dropdownAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    }
}

// ========================================
// NAVIGATION FUNCTIONS
// ========================================
function goToDashboard() {
    // Already on dashboard
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function goToProfile() {
    window.location.href = 'profile-setup.html';
}

function goToMyWorlds() {
    window.location.href = 'my-worlds.html';
}

async function signOut() {
    try {
        console.log('🚪 Signing out...');
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) dropdown.style.display = 'none';
        
        await authenticatedWallet.signOut();
        redirectToHome();
        
    } catch (error) {
        console.error('❌ Sign out failed:', error);
    }
}

// ========================================
// PLACEHOLDER FUNCTIONS
// ========================================
function showAnalytics() {
    showToast('📊 Analytics feature coming soon!', 'info');
}

function showHelp() {
    showToast('❓ Help system coming soon!', 'info');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
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

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
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

// Make functions available globally
window.showAnalytics = showAnalytics;
window.showHelp = showHelp;
window.goToProfile = goToProfile;
window.goToMyWorlds = goToMyWorlds;
window.signOut = signOut;