// Modern Web3 Authentication Manager
// Direct wallet connection with message signing authentication

class Web3WalletManager {
    constructor() {
        this.isConnected = false;
        this.currentUser = null;
        this.account = null;
        this.chainId = null;
        this.isAuthenticated = false;
        this.initialized = false;
        
        // Initialize wallet manager
        this.initializeWallet().catch(error => {
            console.error('❌ Wallet initialization failed:', error);
            this.initialized = false;
        });
    }

    async initializeWallet() {
        try {
            console.log('🔐 Web3 Wallet Manager initializing...');
            
            // Check if MetaMask is available
            if (!window.ethereum) {
                console.warn('⚠️ MetaMask not detected');
            }
            
            this.initialized = true;
            console.log('✅ Wallet manager initialized successfully');
            
            // Check for existing authentication
            await this.checkExistingSession();
            
        } catch (error) {
            console.error('❌ Failed to initialize wallet manager:', error);
            this.initialized = false;
            throw error;
        }
    }

    async checkExistingSession() {
        try {
            const sessionData = this.loadSession();
            if (sessionData && sessionData.isAuthenticated) {
                console.log('✅ Found existing session:', sessionData.currentUser.walletAddress);
                this.isAuthenticated = sessionData.isAuthenticated;
                this.currentUser = sessionData.currentUser;
                this.account = sessionData.account;
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
            console.log('🔗 Connecting wallet...');
            
            if (!this.initialized) {
                await this.initializeWallet();
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
            console.log('🔐 Authenticating with wallet signature...');
            
            if (!this.isConnected) {
                const connectResult = await this.connectWallet();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
            }

            // Create authentication message
            const message = `Welcome to GENESIS!\n\nPlease sign this message to authenticate your account.\n\nWallet: ${this.account}\nTimestamp: ${new Date().toISOString()}`;
            
            // Request signature
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, this.account]
            });
            
            console.log('✅ Message signed successfully');

            this.isAuthenticated = true;
            this.currentUser = {
                walletAddress: this.account,
                username: null,
                bio: null,
                createdAt: new Date().toISOString(),
                signature: signature,
                authenticatedAt: new Date().toISOString()
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

            // Update local user data (no backend needed for now)
            this.currentUser = {
                ...this.currentUser,
                username: profileData.username || this.currentUser.username,
                bio: profileData.bio || this.currentUser.bio,
                updatedAt: new Date().toISOString()
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
            localStorage.setItem('web3_session', JSON.stringify(sessionData));
        } catch (error) {
            console.error('❌ Failed to save session:', error);
        }
    }

    loadSession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem('web3_session'));
            if (sessionData) {
                return sessionData;
            }
            return null;
        } catch (error) {
            console.error('❌ Failed to load session:', error);
            return null;
        }
    }

    clearSession() {
        try {
            localStorage.removeItem('web3_session');
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
let web3Wallet = null;

// Initialize when called by Web3InitializationManager
function createWeb3WalletManager() {
    if (!web3Wallet) {
        console.log('🔄 Creating Web3 wallet manager instance...');
        web3Wallet = new Web3WalletManager();
        
        // Set up event listeners
        web3Wallet.setupEventListeners();
        
        // Make available globally
        window.walletManager = web3Wallet;
        window.AuthenticatedWalletManager = Web3WalletManager;
        
        console.log('✅ Web3 wallet manager instance created');
    }
    return web3Wallet;
}

// Legacy DOM initialization (will be replaced by Web3InitializationManager)
document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚠️ Legacy Web3 initialization - this should be replaced by Web3InitializationManager');
    
    // Only initialize if Web3InitializationManager hasn't already done it
    if (!window.web3Init || !window.web3Init.isReady()) {
        createWeb3WalletManager();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Web3WalletManager;
}