// Creator Page Authentication Integration
let authenticatedWallet = null;
let currentUser = null;

// Initialize authentication when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeCreatorAuth();
});

// ========================================
// AUTHENTICATION INITIALIZATION
// ========================================
async function initializeCreatorAuth() {
    try {
        console.log('🎨 Initializing creator page authentication...');
        
        // Wait for wallet manager to be available
        if (typeof walletManager === 'undefined') {
            setTimeout(initializeCreatorAuth, 100);
            return;
        }

        // Create authenticated wallet manager
        authenticatedWallet = new AuthenticatedWalletManager();
        
        // Check for existing session
        await checkUserSession();
        
        // Update UI based on current state
        updateCreatorUI();
        
        // Override the original connectWallet function
        window.connectWallet = handleCreatorWalletConnect;
        
        // Listen for network changes
        window.addEventListener('networkChanged', handleNetworkChange);
        
        console.log('✅ Creator authentication initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize creator authentication:', error);
    }
}

// ========================================
// SESSION MANAGEMENT
// ========================================
async function checkUserSession() {
    try {
        console.log('🔍 Checking existing user session...');
        
        // Wait for wallet to be ready
        let attempts = 0;
        while (!authenticatedWallet.isConnected && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
        
        // Check existing session
        const hasValidSession = authenticatedWallet.siwe.checkExistingSession();
        
        if (hasValidSession && authenticatedWallet.siwe.isAuthenticated) {
            currentUser = authenticatedWallet.getCurrentUser();
            console.log('✅ Found existing authenticated session:', currentUser);
            
            // Show welcome back message
            showSessionRestoreToast();
            
            return true;
        } else if (authenticatedWallet.isConnected && !authenticatedWallet.siwe.isAuthenticated) {
            console.log('🔗 Wallet connected but not authenticated');
            // Wallet is connected but user isn't signed in
            setTimeout(() => showSignInPrompt(), 1000);
        } else {
            console.log('📝 No existing session found');
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Session check failed:', error);
        return false;
    }
}

// ========================================
// WALLET CONNECTION HANDLER
// ========================================
async function handleCreatorWalletConnect() {
    try {
        const walletBtn = document.getElementById('walletBtn');
        
        if (authenticatedWallet.isConnected && authenticatedWallet.siwe.isAuthenticated) {
            // Already fully authenticated, show user menu
            showCreatorUserMenu();
            return;
        }
        
        if (authenticatedWallet.isConnected) {
            // Wallet connected but not authenticated, sign in
            await handleCreatorAuth();
            return;
        }
        
        // Not connected, start connection process
        walletBtn.disabled = true;
        walletBtn.textContent = 'Connecting...';
        
        const result = await authenticatedWallet.connectWallet();
        
        if (result.success) {
            updateCreatorUI();
            
            // Prompt for authentication after connection
            setTimeout(() => {
                showSignInPrompt();
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Wallet connection failed:', error);
        authenticatedWallet.showToast('❌ Connection failed: ' + error.message, 'error');
    } finally {
        const walletBtn = document.getElementById('walletBtn');
        walletBtn.disabled = false;
    }
}

// ========================================
// AUTHENTICATION HANDLER
// ========================================
async function handleCreatorAuth() {
    try {
        console.log('🔐 Starting creator authentication...');
        
        if (!authenticatedWallet.isConnected) {
            throw new Error('Wallet must be connected first');
        }
        
        const result = await authenticatedWallet.siwe.signIn();
        
        if (result.success) {
            currentUser = result.user;
            updateCreatorUI();
            showAuthSuccessToast();
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        authenticatedWallet.showToast('❌ Authentication failed: ' + error.message, 'error');
    }
}

// ========================================
// UI UPDATE FUNCTIONS
// ========================================
function updateCreatorUI() {
    const walletBtn = document.getElementById('walletBtn');
    if (!walletBtn) return;
    
    if (authenticatedWallet.isConnected && authenticatedWallet.siwe.isAuthenticated) {
        // Fully authenticated
        const displayName = currentUser.username || authenticatedWallet.getShortAddress();
        walletBtn.textContent = `👤 ${displayName}`;
        walletBtn.classList.add('authenticated');
        walletBtn.title = `Signed in as ${displayName} - Click for options`;
        
    } else if (authenticatedWallet.isConnected) {
        // Connected but not authenticated
        const shortAddress = authenticatedWallet.getShortAddress();
        walletBtn.textContent = `🔐 ${shortAddress}`;
        walletBtn.classList.add('connected');
        walletBtn.classList.remove('authenticated');
        walletBtn.title = 'Wallet connected - Click to sign in';
        
    } else {
        // Not connected
        walletBtn.textContent = 'Connect Wallet';
        walletBtn.classList.remove('connected', 'authenticated');
        walletBtn.title = 'Connect your Web3 wallet';
    }
}

// ========================================
// USER INTERFACE MODALS
// ========================================
function showCreatorUserMenu() {
    const displayName = currentUser.username || 'Creator';
    
    const modal = createCreatorModal(`Welcome, ${displayName}!`, `
        <div style="text-align: center;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 20px 0;">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.2); margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: bold;">
                    ${currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '👤'}
                </div>
                <strong style="color: white;">${displayName}</strong>
                <div style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-top: 5px;">
                    ${authenticatedWallet.getShortAddress()}
                </div>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 5px;">
                    ${authenticatedWallet.getNetworkName()}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;">
                <button onclick="goToMyWorlds()" class="modal-btn-primary">
                    🌍 My Worlds
                </button>
                <button onclick="goToDashboard()" class="modal-btn-secondary">
                    🏠 Dashboard
                </button>
                <button onclick="goToProfile()" class="modal-btn-secondary">
                    ⚙️ Profile
                </button>
                <button onclick="signOutUser()" class="modal-btn-danger">
                    🚪 Sign Out
                </button>
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background: #f8f9ff; border-radius: 8px;">
                <small style="color: #666;">
                    💡 <strong>Tip:</strong> Your wallet and username are now linked to this world creation session.
                </small>
            </div>
        </div>
    `);
    
    document.body.appendChild(modal);
}

function showSignInPrompt() {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 100px; right: 20px; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
        color: white; padding: 20px; border-radius: 15px; z-index: 10000;
        max-width: 350px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <div style="font-size: 1.5rem; margin-right: 10px;">🔐</div>
            <strong>Sign In to Save Your Work</strong>
        </div>
        <p style="margin: 0 0 15px 0; font-size: 0.9rem; opacity: 0.9;">
            Authenticate with your wallet to save and publish your creations.
        </p>
        <div style="display: flex; gap: 10px;">
            <button onclick="handleCreatorAuth(); this.parentElement.parentElement.parentElement.remove();" 
                    style="background: white; color: #667eea; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; flex: 1;">
                Sign In Now
            </button>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 8px; cursor: pointer;">
                Skip
            </button>
        </div>
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 8000);
}

function showSessionRestoreToast() {
    if (!currentUser) return;
    
    const displayName = currentUser.username || 'Creator';
    authenticatedWallet.showToast(`✅ Welcome back, ${displayName}! Your session has been restored.`, 'success');
}

function showAuthSuccessToast() {
    if (!currentUser) return;
    
    const displayName = currentUser.username || 'Creator';
    authenticatedWallet.showToast(`🎉 Signed in as ${displayName}! You can now save and publish your creations.`, 'success');
}

// ========================================
// NAVIGATION FUNCTIONS
// ========================================
function goToDashboard() {
    window.location.href = 'dashboard.html';
}

function goToProfile() {
    window.location.href = 'profile-setup.html';
}

function goToMyWorlds() {
    window.location.href = 'my-worlds.html';
}

async function signOutUser() {
    try {
        console.log('🚪 Signing out from creator page...');
        document.querySelector('.modal-overlay')?.remove();
        
        await authenticatedWallet.siwe.signOut();
        currentUser = null;
        updateCreatorUI();
        
        authenticatedWallet.showToast('✅ Successfully signed out!', 'success');
        
    } catch (error) {
        console.error('❌ Sign out failed:', error);
    }
}

// ========================================
// ENHANCED SAVE/PUBLISH FUNCTIONS
// ========================================
// Override the original save function to include user authentication
const originalSaveLayout = window.saveLayout;
window.saveLayout = function() {
    if (authenticatedWallet.isConnected && authenticatedWallet.siwe.isAuthenticated) {
        console.log('💾 Saving layout for authenticated user:', currentUser);
        
        // Add user info to saved data
        const userMetadata = {
            walletAddress: currentUser.walletAddress,
            username: currentUser.username,
            savedAt: new Date().toISOString()
        };
        
        // Call original save function with user context
        if (originalSaveLayout) {
            originalSaveLayout.call(this, userMetadata);
        }
        
        authenticatedWallet.showToast('💾 Layout saved to your profile!', 'success');
    } else {
        // Show prompt to sign in first
        showSignInPrompt();
    }
};

// Override the original publish function
const originalPublishLayout = window.publishLayout;
window.publishLayout = function() {
    if (authenticatedWallet.isConnected && authenticatedWallet.siwe.isAuthenticated) {
        console.log('🚀 Publishing layout for authenticated user:', currentUser);
        
        if (originalPublishLayout) {
            originalPublishLayout.call(this, currentUser);
        }
        
        authenticatedWallet.showToast('🚀 Layout published! Others can now view your world.', 'success');
    } else {
        // Show prompt to sign in first
        showSignInPrompt();
    }
};

// ========================================
// NETWORK CHANGE HANDLER
// ========================================
function handleNetworkChange(event) {
    console.log('🌐 Network changed in creator page:', event.detail);
    
    // Update UI to reflect new network
    updateCreatorUI();
    
    // If user is authenticated, check if session is still valid
    if (authenticatedWallet.siwe.isAuthenticated) {
        // Just update the UI, don't disrupt the user's work
        const networkName = event.detail.networkName;
        authenticatedWallet.showToast(`Switched to ${networkName}`, 'info');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function createCreatorModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="color: #2D374B; margin-bottom: 20px; text-align: center;">${title}</h3>
            ${content}
        </div>
    `;
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .modal-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .modal-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }
        .modal-btn-secondary {
            background: #f8f9ff;
            color: #667eea;
            border: 2px solid #e8f0ff;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .modal-btn-secondary:hover {
            background: #e8f0ff;
            transform: translateY(-2px);
        }
        .modal-btn-danger {
            background: #ff4757;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .modal-btn-danger:hover {
            background: #ff3838;
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(style);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

// Make functions globally available
window.handleCreatorAuth = handleCreatorAuth;
window.showCreatorUserMenu = showCreatorUserMenu;