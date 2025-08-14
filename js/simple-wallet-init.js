// Simple, Bulletproof Wallet Initialization
// No complex dependency management - just works

let walletManager = null;
let initializationComplete = false;

// Simple function to initialize everything
async function initializeWallet() {
    console.log('🔧 Simple wallet initialization starting...');
    
    // Step 1: Wait for all dependencies with a simple loop
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max
    
    while (attempts < maxAttempts) {
        // Check if everything we need is available
        if (typeof API_CONFIG !== 'undefined' && 
            typeof Moralis !== 'undefined' && 
            API_CONFIG.MORALIS && 
            API_CONFIG.MORALIS.API_KEY) {
            
            console.log('✅ All dependencies found');
            break;
        }
        
        console.log(`⏳ Waiting for dependencies... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (attempts >= maxAttempts) {
        console.error('❌ Dependencies failed to load');
        alert('Failed to initialize wallet system. Please refresh the page.');
        return false;
    }
    
    try {
        // Step 2: Initialize Moralis directly
        console.log('🚀 Starting Moralis with API key:', API_CONFIG.MORALIS.API_KEY.substring(0, 20) + '...');
        
        await Moralis.start({
            apiKey: API_CONFIG.MORALIS.API_KEY,
        });
        
        console.log('✅ Moralis started successfully');
        
        // Step 3: Create wallet manager
        walletManager = {
            isConnected: false,
            isAuthenticated: false,
            currentUser: null,
            account: null,
            
            async authenticate() {
                try {
                    console.log('🔐 Authenticating with Moralis...');
                    
                    // Authenticate with Moralis
                    const user = await Moralis.authenticate({
                        signingMessage: "Welcome to GENESIS! Please sign to authenticate your account.",
                        provider: "metamask"
                    });
                    
                    console.log('✅ Authentication successful:', user);
                    
                    this.isAuthenticated = true;
                    this.isConnected = true;
                    this.currentUser = {
                        walletAddress: user.get('ethAddress'),
                        username: user.get('username') || null,
                        bio: user.get('bio') || null,
                        createdAt: user.get('createdAt'),
                        sessionToken: user.getSessionToken()
                    };
                    this.account = user.get('ethAddress');
                    
                    return {
                        success: true,
                        user: this.currentUser
                    };
                    
                } catch (error) {
                    console.error('❌ Authentication failed:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
            
            async checkExistingSession() {
                try {
                    const user = Moralis.User.current();
                    if (user) {
                        console.log('✅ Found existing session:', user);
                        this.isAuthenticated = true;
                        this.isConnected = true;
                        this.currentUser = {
                            walletAddress: user.get('ethAddress'),
                            username: user.get('username') || null,
                            bio: user.get('bio') || null,
                            createdAt: user.get('createdAt'),
                            sessionToken: user.getSessionToken()
                        };
                        this.account = user.get('ethAddress');
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error('❌ Error checking session:', error);
                    return false;
                }
            },
            
            async signOut() {
                try {
                    await Moralis.User.logOut();
                    this.isAuthenticated = false;
                    this.isConnected = false;
                    this.currentUser = null;
                    this.account = null;
                    console.log('✅ Signed out successfully');
                    return { success: true };
                } catch (error) {
                    console.error('❌ Sign out failed:', error);
                    return { success: false, error: error.message };
                }
            },
            
            getCurrentUser() {
                return this.currentUser;
            },
            
            getShortAddress() {
                if (!this.account) return '';
                return `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
            },
            
            showToast(message, type = 'info') {
                console.log(`🔔 ${type.toUpperCase()}: ${message}`);
                
                const toast = document.createElement('div');
                const colors = {
                    success: '#00ff88',
                    error: '#ff4757', 
                    info: '#00d4ff'
                };
                
                toast.style.cssText = `
                    position: fixed; top: 20px; right: 20px; background: ${colors[type] || colors.info}; 
                    color: white; padding: 15px 20px; border-radius: 10px; z-index: 10001;
                    font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                    transform: translateX(100%); transition: transform 0.3s ease;
                    max-width: 350px;
                `;
                toast.textContent = message;
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.style.transform = 'translateX(0)';
                }, 100);
                
                setTimeout(() => {
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => toast.remove(), 300);
                }, 4000);
            }
        };
        
        // Check for existing session
        await walletManager.checkExistingSession();
        
        // Make globally available
        window.walletManager = walletManager;
        
        initializationComplete = true;
        console.log('✅ Wallet manager ready');
        
        return true;
        
    } catch (error) {
        console.error('❌ Wallet initialization failed:', error);
        alert(`Wallet initialization failed: ${error.message}`);
        return false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const success = await initializeWallet();
    if (!success) {
        console.error('❌ Failed to initialize wallet system');
    }
});

// Helper function for other scripts to wait for wallet to be ready
window.waitForWallet = async function() {
    let attempts = 0;
    while (!initializationComplete && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    return initializationComplete;
};