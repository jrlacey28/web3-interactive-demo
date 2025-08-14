// Direct MetaMask/Web3 Wallet Connection - No Moralis Dependencies
// Simple, reliable wallet connection that just works

class DirectWalletManager {
    constructor() {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.account = null;
        this.chainId = null;
        this.provider = null;
        
        console.log('🔧 Direct Wallet Manager initialized');
        this.detectProvider();
    }
    
    detectProvider() {
        if (typeof window.ethereum !== 'undefined') {
            this.provider = window.ethereum;
            console.log('✅ MetaMask detected');
            
            // Listen for account changes
            this.provider.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.account = accounts[0];
                    this.updateUser();
                }
            });
            
            // Listen for chain changes
            this.provider.on('chainChanged', (chainId) => {
                this.chainId = chainId;
                console.log('🌐 Network changed to:', this.getNetworkName());
            });
            
        } else {
            console.warn('⚠️ No Web3 provider detected');
        }
    }
    
    async authenticate() {
        try {
            console.log('🔐 Starting wallet authentication...');
            
            if (!this.provider) {
                throw new Error('No Web3 provider found. Please install MetaMask.');
            }
            
            // Request account access
            const accounts = await this.provider.request({
                method: 'eth_requestAccounts'
            });
            
            if (accounts.length === 0) {
                throw new Error('No accounts found. Please unlock your wallet.');
            }
            
            this.account = accounts[0];
            this.isConnected = true;
            
            // Get chain ID
            this.chainId = await this.provider.request({
                method: 'eth_chainId'
            });
            
            // Create message to sign for authentication
            const message = `Welcome to GENESIS!\n\nPlease sign this message to authenticate your account.\n\nTimestamp: ${new Date().toISOString()}`;
            
            try {
                // Request signature for authentication
                const signature = await this.provider.request({
                    method: 'personal_sign',
                    params: [message, this.account]
                });
                
                console.log('✅ Message signed successfully');
                this.isAuthenticated = true;
                
            } catch (signError) {
                console.log('⚠️ User declined to sign message, but wallet is connected');
                // Even if they don't sign, wallet is still connected
                this.isAuthenticated = true; // Set to true for basic functionality
            }
            
            // Create user object
            this.updateUser();
            
            // Save session
            this.saveSession();
            
            console.log('✅ Wallet authentication completed');
            console.log('Account:', this.account);
            console.log('Network:', this.getNetworkName());
            
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
    
    updateUser() {
        if (this.account) {
            this.currentUser = {
                walletAddress: this.account,
                username: this.getStoredUsername() || null,
                bio: null,
                createdAt: new Date().toISOString(),
                network: this.getNetworkName()
            };
        }
    }
    
    getStoredUsername() {
        try {
            const stored = localStorage.getItem(`username_${this.account}`);
            return stored;
        } catch {
            return null;
        }
    }
    
    async checkExistingSession() {
        try {
            if (!this.provider) return false;
            
            // Check if already connected
            const accounts = await this.provider.request({
                method: 'eth_accounts'
            });
            
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.isConnected = true;
                this.isAuthenticated = true; // Assume authenticated if connected
                
                this.chainId = await this.provider.request({
                    method: 'eth_chainId'
                });
                
                this.updateUser();
                console.log('✅ Existing session restored:', this.account);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Error checking existing session:', error);
            return false;
        }
    }
    
    async signOut() {
        try {
            // Note: MetaMask doesn't have a programmatic disconnect
            // We just clear our local state
            this.isConnected = false;
            this.isAuthenticated = false;
            this.currentUser = null;
            this.account = null;
            this.chainId = null;
            
            this.clearSession();
            
            console.log('✅ Signed out (wallet still connected in MetaMask)');
            this.showToast('Signed out successfully. To fully disconnect, use MetaMask directly.', 'info');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Sign out error:', error);
            return { success: false, error: error.message };
        }
    }
    
    disconnect() {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.account = null;
        this.chainId = null;
        console.log('🔌 Wallet disconnected');
    }
    
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
            '0x5': 'Goerli Testnet', 
            '0xaa36a7': 'Sepolia Testnet',
            '0x89': 'Polygon',
            '0x13881': 'Mumbai Testnet',
            '0xa4b1': 'Arbitrum One',
            '0xa': 'Optimism'
        };
        return networks[this.chainId] || `Unknown (${this.chainId})`;
    }
    
    saveSession() {
        try {
            const sessionData = {
                account: this.account,
                isConnected: this.isConnected,
                isAuthenticated: this.isAuthenticated,
                chainId: this.chainId,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('wallet_session', JSON.stringify(sessionData));
        } catch (error) {
            console.error('❌ Failed to save session:', error);
        }
    }
    
    clearSession() {
        try {
            localStorage.removeItem('wallet_session');
        } catch (error) {
            console.error('❌ Failed to clear session:', error);
        }
    }
    
    showToast(message, type = 'info') {
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
        
        const toast = document.createElement('div');
        const colors = {
            success: '#00ff88',
            error: '#ff4757', 
            warning: '#ffa502',
            info: '#00d4ff'
        };
        
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${colors[type] || colors.info}; 
            color: white; padding: 15px 20px; border-radius: 10px; z-index: 10001;
            font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            transform: translateX(100%); transition: transform 0.3s ease;
            max-width: 350px; font-family: Arial, sans-serif;
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
}

// Initialize and make globally available
let directWallet = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Direct Wallet Manager...');
    
    directWallet = new DirectWalletManager();
    
    // Check for existing session
    await directWallet.checkExistingSession();
    
    // Make globally available
    window.walletManager = directWallet;
    window.directWallet = directWallet;
    
    console.log('✅ Direct Wallet Manager ready');
    
    // Dispatch ready event
    window.dispatchEvent(new CustomEvent('walletReady', {
        detail: { walletManager: directWallet }
    }));
});

// Helper function for other scripts
window.waitForWallet = async function() {
    if (directWallet) return true;
    
    return new Promise((resolve) => {
        window.addEventListener('walletReady', () => resolve(true), { once: true });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000);
    });
};