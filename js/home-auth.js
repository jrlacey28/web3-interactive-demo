// Home Page Authentication Integration
let authenticatedWallet = null;

// Initialize authentication when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});

// ========================================
// AUTHENTICATION INITIALIZATION
// ========================================
async function initializeAuth() {
    try {
        // Wait for Moralis wallet manager to be available
        if (typeof walletManager === 'undefined') {
            setTimeout(initializeAuth, 100);
            return;
        }

        // Use Moralis wallet manager
        authenticatedWallet = walletManager;
        
        // Wait for Moralis initialization
        if (!authenticatedWallet.initialized) {
            setTimeout(initializeAuth, 100);
            return;
        }
        
        // Update UI based on current state
        updateAuthUI();
        
        // Listen for network changes
        window.addEventListener('networkChanged', handleNetworkChangeHome);
        
        console.log('✅ Moralis authentication initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize authentication:', error);
    }
}

// ========================================
// WALLET CONNECTION HANDLER
// ========================================
async function handleWalletConnect() {
    try {
        const walletBtn = document.getElementById('walletBtn');
        
        if (authenticatedWallet.isAuthenticated) {
            // Already authenticated, show user menu
            showUserMenu();
        } else if (authenticatedWallet.isConnected) {
            // Connected but not authenticated, start Moralis auth
            walletBtn.disabled = true;
            walletBtn.textContent = 'Authenticating...';
            
            const result = await authenticatedWallet.authenticate();
            if (result.success) {
                // If no username, take to profile setup
                const user = result.user;
                if (!user.username) {
                    window.location.href = 'profile-setup.html?from=auth';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } else {
                authenticatedWallet.showToast('❌ Authentication failed: ' + result.error, 'error');
            }
        } else {
            // Connect and authenticate in one step
            walletBtn.disabled = true;
            walletBtn.textContent = 'Connecting...';
            
            const authResult = await authenticatedWallet.authenticate();
            if (authResult.success) {
                const user = authResult.user;
                if (!user.username) {
                    window.location.href = 'profile-setup.html?from=auth';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } else {
                authenticatedWallet.showToast('❌ Connection failed: ' + authResult.error, 'error');
            }
        }
        
    } catch (error) {
        console.error('❌ Wallet connection failed:', error);
        authenticatedWallet.showToast('❌ Connection failed: ' + error.message, 'error');
    } finally {
        const walletBtn = document.getElementById('walletBtn');
        walletBtn.disabled = false;
        updateAuthUI();
    }
}

// ========================================
// AUTHENTICATION HANDLER
// ========================================
async function handleAuth() {
    try {
        console.log('🔐 Handle auth clicked...');
        // Deprecated: separate auth button removed
        
        if (authenticatedWallet.siwe.isAuthenticated) {
            console.log('User already authenticated, showing menu...');
            // Show user menu
            showUserMenu();
        } else {
            console.log('Starting authentication process...');
            // Sign in with SIWE via wallet connect flow
            
            const result = await authenticatedWallet.siwe.signIn();
            
            console.log('Authentication result:', result);
            
            if (result.success) {
                console.log('✅ Authentication successful:', result.user);
            } else {
                console.error('❌ Authentication failed:', result.error);
            }
        }
        
    } catch (error) {
        console.error('❌ Authentication error:', error);
    } finally {
        // No separate auth button to reset
    }
}

// ========================================
// UI UPDATE FUNCTIONS
// ========================================
function updateAuthUI() {
    const walletBtn = document.getElementById('walletBtn');
    if (!walletBtn) return;
    
    // Update wallet button
    if (authenticatedWallet.isAuthenticated) {
        // Fully authenticated with Moralis
        const currentUser = authenticatedWallet.getCurrentUser();
        const displayName = currentUser?.username || authenticatedWallet.getShortAddress();
        walletBtn.textContent = `👤 ${displayName}`;
        walletBtn.classList.add('connected');
        walletBtn.title = `Authenticated as ${displayName}`;
        
        // Update create button to show authenticated state
        const createBtn = document.getElementById('createBtn');
        if (createBtn) {
            createBtn.textContent = 'Open Creator Studio';
        }
    } else if (authenticatedWallet.isConnected) {
        // Connected but not authenticated
        const shortAddress = authenticatedWallet.getShortAddress();
        walletBtn.textContent = `🔐 ${shortAddress}`;
        walletBtn.classList.add('connected');
        walletBtn.title = 'Connected - Click to authenticate';
        
        const createBtn = document.getElementById('createBtn');
        if (createBtn) {
            createBtn.textContent = 'Authenticate to Create';
        }
    } else {
        walletBtn.textContent = 'Connect Wallet';
        walletBtn.classList.remove('connected');
        walletBtn.title = 'Connect your Web3 wallet';
        
        // Update create button text when logged out
        const createBtn = document.getElementById('createBtn');
        if (createBtn) {
            createBtn.textContent = 'Create Your World';
        }
    }
}

// ========================================
// EVENT HANDLERS
// ========================================
function handleAuthSuccess(event) {
    console.log('🎉 Authentication successful:', event.detail);
    updateAuthUI();
    
    // Check if user needs profile setup or should go to dashboard
    const user = event.detail.user;
    console.log('👤 User profile status:', user);

    // Do not auto-redirect. Show UI prompt handled by SIWE module instead.
    // This avoids unexpected navigation and white-screen flickers.
}

function handleAuthError(event) {
    console.error('Authentication error:', event.detail);
    updateAuthUI();
}

function handleSignOut(event) {
    console.log('User signed out');
    updateAuthUI();
}

// ========================================
// USER INTERFACE MODALS
// ========================================
function showWalletMenu() {
    const user = authenticatedWallet.siwe?.currentUser;
    const displayName = user?.username || authenticatedWallet.getShortAddress();
    const modal = createModal('Profile', `
        <div style="text-align: center;">
            <div style="background: #f8f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: bold;">
                    ${user?.username ? user.username.charAt(0).toUpperCase() : '👤'}
                </div>
                <strong>${displayName}</strong>
                <div style="color: #666; font-size: 0.9rem; margin-top: 5px;">
                    ${authenticatedWallet.getNetworkName()}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;">
                <button onclick="goToDashboard()" class="modal-btn-primary">🏠 Dashboard</button>
                <button onclick="goToProfile()" class="modal-btn-secondary">⚙️ Edit Profile</button>
                <button onclick="showMyWorlds()" class="modal-btn-secondary">🌍 My Worlds</button>
                <button onclick="copyAddress()" class="modal-btn-secondary">📋 Copy Address</button>
                <button onclick="disconnectWallet()" class="modal-btn-danger">🔌 Disconnect</button>
            </div>
        </div>
    `);
    
    document.body.appendChild(modal);
}

function showUserMenu() {
    const user = authenticatedWallet.getCurrentUser();
    const displayName = user.username || 'User';
    
    const modal = createModal(`Welcome, ${displayName}!`, `
        <div style="text-align: center;">
            <div style="background: #f8f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: bold;">
                    ${user.username ? user.username.charAt(0).toUpperCase() : '👤'}
                </div>
                <strong>${displayName}</strong>
                <div style="color: #666; font-size: 0.9rem; margin-top: 5px;">
                    ${authenticatedWallet.getShortAddress()}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;">
                <button onclick="goToDashboard()" class="modal-btn-primary">🏠 My Dashboard</button>
                <button onclick="goToProfile()" class="modal-btn-secondary">⚙️ Edit Profile</button>
                <button onclick="showMyWorlds()" class="modal-btn-secondary">🌍 My Worlds</button>
                <button onclick="signOutUser()" class="modal-btn-danger">🚪 Sign Out</button>
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
            <strong>Ready to Sign In?</strong>
        </div>
        <p style="margin: 0 0 15px 0; font-size: 0.9rem; opacity: 0.9;">
            Sign a message to authenticate and unlock your personalized experience.
        </p>
        <div style="display: flex; gap: 10px;">
            <button onclick="handleAuth(); this.parentElement.parentElement.parentElement.remove();" 
                    style="background: white; color: #667eea; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; flex: 1;">
                Sign In Now
            </button>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 8px; cursor: pointer;">
                Later
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

function showProfileSetupPrompt() {
    const modal = createModal('Complete Your Profile', `
        <div style="text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 20px;">🎉</div>
            <h3 style="color: #2D374B; margin-bottom: 15px;">Welcome to GENESIS!</h3>
            <p style="margin: 15px 0; color: #666;">Set up your creator profile to unlock all features and start building your digital world.</p>
            
            <div style="background: #f8f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: left;">
                <strong style="color: #2D374B;">What you'll set up:</strong>
                <ul style="margin: 10px 0; color: #666; line-height: 1.6;">
                    <li>Choose a unique username</li>
                    <li>Write a bio and select an avatar</li>
                    <li>Configure your preferences</li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                <button onclick="window.location.href='profile-setup.html?auth=true'" class="modal-btn-primary">
                    🚀 Set Up Profile
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" class="modal-btn-secondary">
                    Skip for now
                </button>
            </div>
        </div>
    `);
    
    document.body.appendChild(modal);
}

// ========================================
// ACTION HANDLERS
// ========================================
async function copyAddress() {
    try {
        await navigator.clipboard.writeText(authenticatedWallet.currentAccount);
        authenticatedWallet.showToast('✅ Address copied to clipboard!', 'success');
        document.querySelector('.modal-overlay').remove();
    } catch (error) {
        console.error('Failed to copy address:', error);
    }
}

async function disconnectWallet() {
    try {
        await authenticatedWallet.disconnect();
        updateAuthUI();
        document.querySelector('.modal-overlay').remove();
    } catch (error) {
        console.error('Failed to disconnect:', error);
    }
}

async function signOutUser() {
    try {
        await authenticatedWallet.siwe.signOut();
        document.querySelector('.modal-overlay').remove();
    } catch (error) {
        console.error('Failed to sign out:', error);
    }
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

function goToProfile() {
    // If called from user menu, user is already authenticated - just navigate
    window.location.href = 'profile-setup.html';
}

function showMyWorlds() {
    window.location.href = 'my-worlds.html';
}

// ========================================
// NETWORK CHANGE HANDLER
// ========================================
function handleNetworkChangeHome(event) {
    console.log('🌐 Network changed in home page:', event.detail);
    
    // Update UI to reflect new network
    updateAuthUI();
    
    // Show friendly notification
    const networkName = event.detail.networkName;
    if (authenticatedWallet) {
        authenticatedWallet.showToast(`Switched to ${networkName}`, 'info');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function createModal(title, content) {
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