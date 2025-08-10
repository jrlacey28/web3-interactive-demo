// Moralis Web3 Authentication Manager
// Replaces the previous SIWE system with Moralis SDK

class MoralisWalletManager {
    constructor() {
        this.isConnected = false;
        this.currentUser = null;
        this.account = null;
        this.chainId = null;
        this.isAuthenticated = false;
        this.initialized = false;
        
        // Initialize Moralis
        this.initializeMoralis();
    }

    async initializeMoralis() {
        try {
            console.log('🚀 Initializing Moralis...');
            
            // Check if API_CONFIG is available
            if (typeof API_CONFIG === 'undefined') {
                console.log('⏳ Waiting for API_CONFIG to load...');
                // Wait a bit for API config to load
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // If still not available, throw error
                if (typeof API_CONFIG === 'undefined') {
                    throw new Error('API_CONFIG not found. Make sure config/api-keys.js is loaded before moralis-wallet.js');
                }
            }
            
            // Initialize Moralis with API key
            await Moralis.start({
                apiKey: API_CONFIG.MORALIS.API_KEY,
            });
            
            this.initialized = true;
            console.log('✅ Moralis initialized successfully');
            
            // Check for existing authentication
            await this.checkExistingSession();
            
        } catch (error) {
            console.error('❌ Failed to initialize Moralis:', error);
            throw error;
        }
    }

    async checkExistingSession() {
        try {
            const user = Moralis.User.current();
            if (user) {
                console.log('✅ Found existing Moralis session:', user);
                this.isAuthenticated = true;
                this.currentUser = {
                    walletAddress: user.get('ethAddress'),
                    username: user.get('username') || null,
                    bio: user.get('bio') || null,
                    createdAt: user.get('createdAt'),
                    sessionToken: user.getSessionToken()
                };
                this.account = user.get('ethAddress');
                this.isConnected = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error checking existing session:', error);
            return false;
        }
    }

    async connectWallet() {
        try {
            console.log('🔗 Connecting wallet with Moralis...');
            
            if (!this.initialized) {
                await this.initializeMoralis();
            }

            // Connect with MetaMask
            if (!window.ethereum) {
                throw new Error('MetaMask not detected. Please install MetaMask to continue.');
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No accounts found. Please unlock MetaMask.');
            }

            this.account = accounts[0];
            this.isConnected = true;

            // Get chain ID
            this.chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });

            console.log('✅ Wallet connected:', this.account);
            
            return {
                success: true,
                account: this.account,
                chainId: this.chainId
            };

        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async authenticate() {
        try {
            console.log('🔐 Authenticating with Moralis...');
            
            if (!this.isConnected) {
                const connectResult = await this.connectWallet();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
            }

            // Authenticate with Moralis using wallet
            const user = await Moralis.authenticate({
                signingMessage: "Welcome to GENESIS! Please sign to authenticate your account.",
                provider: "metamask"
            });

            console.log('✅ Moralis authentication successful:', user);

            this.isAuthenticated = true;
            this.currentUser = {
                walletAddress: user.get('ethAddress'),
                username: user.get('username') || null,
                bio: user.get('bio') || null,
                createdAt: user.get('createdAt'),
                sessionToken: user.getSessionToken()
            };

            // Save to localStorage for session persistence
            this.saveSession();

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
    }

    async updateUserProfile(profileData) {
        try {
            if (!this.isAuthenticated) {
                throw new Error('User must be authenticated to update profile');
            }

            const user = Moralis.User.current();
            if (!user) {
                throw new Error('No current user found');
            }

            // Update user attributes
            if (profileData.username) {
                user.set('username', profileData.username);
            }
            if (profileData.bio) {
                user.set('bio', profileData.bio);
            }

            await user.save();

            // Update local user data
            this.currentUser = {
                ...this.currentUser,
                username: profileData.username || this.currentUser.username,
                bio: profileData.bio || this.currentUser.bio
            };

            this.saveSession();

            console.log('✅ Profile updated successfully');
            return { success: true, user: this.currentUser };

        } catch (error) {
            console.error('❌ Profile update failed:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            console.log('🚪 Signing out...');
            
            await Moralis.User.logOut();
            
            // Clear local state
            this.isAuthenticated = false;
            this.currentUser = null;
            this.account = null;
            this.isConnected = false;
            
            // Clear localStorage
            this.clearSession();
            
            console.log('✅ Successfully signed out');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            return { success: false, error: error.message };
        }
    }

    saveSession() {
        try {
            const sessionData = {
                isAuthenticated: this.isAuthenticated,
                currentUser: this.currentUser,
                account: this.account,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('moralis_session', JSON.stringify(sessionData));
        } catch (error) {
            console.error('❌ Failed to save session:', error);
        }
    }

    loadSession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem('moralis_session'));
            if (sessionData) {
                this.isAuthenticated = sessionData.isAuthenticated;
                this.currentUser = sessionData.currentUser;
                this.account = sessionData.account;
                this.isConnected = !!sessionData.account;
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Failed to load session:', error);
            return false;
        }
    }

    clearSession() {
        try {
            localStorage.removeItem('moralis_session');
        } catch (error) {
            console.error('❌ Failed to clear session:', error);
        }
    }

    // Utility methods
    getCurrentUser() {
        return this.currentUser;
    }

    getShortAddress() {
        if (!this.account) return '';
        return `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
    }

    getNetworkName() {
        const networks = {
            '0x1': 'Ethereum Mainnet',
            '0x89': 'Polygon',
            '0xa86a': 'Avalanche',
            '0x38': 'BSC',
            '0xa4b1': 'Arbitrum'
        };
        return networks[this.chainId] || 'Unknown Network';
    }

    // Event listeners for account/network changes
    setupEventListeners() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.signOut();
                } else if (accounts[0] !== this.account) {
                    console.log('🔄 Account changed, re-authenticating...');
                    this.account = accounts[0];
                    // Could trigger re-authentication here if needed
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                console.log('🌐 Network changed to:', chainId);
                this.chainId = chainId;
                // Emit custom event for components to handle
                window.dispatchEvent(new CustomEvent('networkChanged', {
                    detail: { chainId, networkName: this.getNetworkName() }
                }));
            });
        }
    }

    // Toast notification helper
    showToast(message, type = 'info') {
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
}

// Create global instance
let moralisWallet = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔄 Starting Moralis wallet manager initialization...');
        moralisWallet = new MoralisWalletManager();
        
        // Wait for Moralis initialization to complete
        let attempts = 0;
        while (!moralisWallet.initialized && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!moralisWallet.initialized) {
            console.error('❌ Moralis failed to initialize after 2 seconds');
        } else {
            moralisWallet.setupEventListeners();
            console.log('✅ Moralis wallet manager ready');
        }
        
        // Make available globally for backward compatibility
        window.walletManager = moralisWallet;
        window.AuthenticatedWalletManager = MoralisWalletManager;
    } catch (error) {
        console.error('❌ Failed to initialize Moralis wallet manager:', error);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoralisWalletManager;
}