// GENESIS Dashboard - Clean Implementation

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Initializing GENESIS Dashboard...');
    
    try {
        // Wait for GENESIS system
        await waitForGenesis();
        
        // Require authentication and profile
        if (!window.genesis.requireProfile()) {
            return;
        }
        
        // Initialize dashboard
        await initializeDashboard();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide loading screen
        hideLoading();
        
        console.log('✅ Dashboard ready');
        
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        window.location.href = 'index.html';
    }
});

async function waitForGenesis() {
    let attempts = 0;
    while (!window.genesis && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.genesis) {
        throw new Error('GENESIS system not available');
    }
}

async function initializeDashboard() {
    const user = window.genesis.currentUser;
    if (!user) {
        throw new Error('No current user found');
    }
    
    console.log('🎨 Setting up dashboard for:', user.username);
    
    // Update UI with user data
    updateUserInterface(user);
    
    // Load user stats
    updateStats(user);
    
    // Load recent activity
    loadActivity(user);
    
    // Check profile completion
    checkProfileCompletion(user);
}

function updateUserInterface(user) {
    // Update welcome message
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) {
        welcomeName.textContent = user.username || 'Creator';
    }
    
    // Update user menu in header
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) {
        userName.textContent = user.username;
    }
    
    if (userAvatar) {
        userAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
    
    // Update dropdown info
    updateDropdownInfo(user);
    
    console.log('✅ User interface updated');
}

function updateDropdownInfo(user) {
    const dropdownWalletAddress = document.getElementById('dropdownWalletAddress');
    const dropdownUsername = document.getElementById('dropdownUsername');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (dropdownWalletAddress) {
        dropdownWalletAddress.textContent = window.genesis.getShortAddress();
    }
    
    if (window.genesis.username && usernameDisplay && dropdownUsername) {
        dropdownUsername.textContent = window.genesis.username;
        usernameDisplay.style.display = 'block';
    } else if (usernameDisplay) {
        usernameDisplay.style.display = 'none';
    }
}

function updateStats(user) {
    const stats = user.stats || {
        worldsCreated: 0,
        totalViews: 0,
        totalTips: 0
    };
    
    // Update stat displays
    const worldCount = document.getElementById('worldCount');
    const viewCount = document.getElementById('viewCount');
    const tipCount = document.getElementById('tipCount');
    const ratingValue = document.getElementById('ratingValue');
    
    if (worldCount) worldCount.textContent = stats.worldsCreated || 0;
    if (viewCount) viewCount.textContent = formatNumber(stats.totalViews || 0);
    if (tipCount) tipCount.textContent = formatNumber(stats.totalTips || 0);
    if (ratingValue) ratingValue.textContent = '5.0'; // Default rating
    
    console.log('📈 Stats updated:', stats);
}

function loadActivity(user) {
    const activityFeed = document.getElementById('activityFeed');
    if (!activityFeed) return;
    
    // Create welcome activity
    const welcomeActivity = `
        <div class="activity-item">
            <div class="activity-icon">🎉</div>
            <div class="activity-content">
                <div class="activity-title">Welcome to GENESIS, ${user.username}!</div>
                <div class="activity-desc">Your profile is set up and ready to go</div>
                <div class="activity-time">Just now</div>
            </div>
        </div>
    `;
    
    // Add placeholder for future activities
    const placeholder = `
        <div class="activity-placeholder">
            <div class="placeholder-icon">🚀</div>
            <div class="placeholder-content">
                <h4>Ready to create your first world?</h4>
                <p>Click "Create New World" to start building your interactive space.</p>
            </div>
        </div>
    `;
    
    activityFeed.innerHTML = welcomeActivity + placeholder;
    
    console.log('📰 Activity feed loaded');
}

function checkProfileCompletion(user) {
    const profileSection = document.getElementById('profileSection');
    if (!profileSection) return;
    
    // Calculate completion percentage
    let completed = 0;
    const total = 4;
    
    if (user.walletAddress) completed++;
    if (user.username) completed++;
    if (user.bio) completed++;
    if (user.worlds && user.worlds.length > 0) completed++;
    
    const percentage = Math.round((completed / total) * 100);
    
    if (percentage < 100) {
        profileSection.style.display = 'block';
        
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${percentage}% Complete`;
        
        console.log(`📋 Profile ${percentage}% complete`);
    } else {
        profileSection.style.display = 'none';
        console.log('✅ Profile 100% complete');
    }
}

function setupEventListeners() {
    // User menu toggle
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.addEventListener('click', toggleUserDropdown);
    }
    
    // Account change detection
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0 || 
                (window.genesis.account && accounts[0].toLowerCase() !== window.genesis.account.toLowerCase())) {
                console.log('🔄 Account changed, refreshing...');
                window.location.reload();
            }
        });
    }
    
    console.log('👂 Event listeners set up');
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOnOutsideClick);
        }, 100);
    }
}

function closeDropdownOnOutsideClick(e) {
    const dropdown = document.getElementById('userDropdown');
    const userMenu = document.getElementById('userMenu');
    
    if (dropdown && userMenu && 
        !dropdown.contains(e.target) && 
        !userMenu.contains(e.target)) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdownOnOutsideClick);
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
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

// ========================================
// NAVIGATION FUNCTIONS
// ========================================
function goToMyWorlds() {
    window.location.href = 'my-worlds.html';
}

function goToProfile() {
    window.location.href = 'profile-setup.html?edit=true';
}

async function signOut() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.style.display = 'none';
    
    window.genesis.clearSession();
    window.location.href = 'index.html';
}

function showAnalytics() {
    alert('📊 Analytics feature coming soon!');
}

function showHelp() {
    alert('❓ Help system coming soon!');
}

// Make functions global
window.goToMyWorlds = goToMyWorlds;
window.goToProfile = goToProfile;
window.signOut = signOut;
window.showAnalytics = showAnalytics;
window.showHelp = showHelp;

console.log('✅ GENESIS Dashboard system loaded');