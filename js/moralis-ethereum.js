// Moralis Web3 Authentication for Ethereum/Arbitrum Networks
// Properly configured for EVM chains (not Solana)

class MoralisEthereumManager {
    constructor() {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.account = null;
        this.chainId = null;
        this.initialized = false;
        
        console.log('🔧 Moralis Ethereum Manager starting...');
        this.initializeMoralis();
    }
    
    async initializeMoralis() {
        try {
            console.log('🚀 Initializing Moralis for Ethereum...');
            
            // Wait for dependencies
            await this.waitForDependencies();
            
            // Initialize Moralis with proper configuration
            await Moralis.start({
                apiKey: API_CONFIG.MORALIS.API_KEY,
                // No serverUrl needed for Moralis v2
            });
            
            console.log('✅ Moralis initialized for Ethereum networks');
            this.initialized = true;
            
            // Check for existing session
            await this.checkExistingSession();
            
        } catch (error) {
            console.error('❌ Moralis initialization failed:', error);
            this.initialized = false;
            throw error;
        }
    }
    
    async waitForDependencies() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (typeof API_CONFIG !== 'undefined' && 
                typeof Moralis !== 'undefined' && 
                API_CONFIG.MORALIS?.API_KEY) {
                console.log('✅ All dependencies ready');
                return;
            }
            
            console.log(`⏳ Waiting for dependencies... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Dependencies failed to load');
    }
    
    async authenticate() {
        try {
            console.log('🔐 Starting Moralis authentication...');
            
            if (!this.initialized) {
                throw new Error('Moralis not initialized');
            }
            
            // Connect to MetaMask first
            if (!window.ethereum) {
                throw new Error('MetaMask not detected. Please install MetaMask.');
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
            
            // Get current chain ID
            this.chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });
            
            console.log('🔗 Connected to:', this.getNetworkName());
            console.log('📍 Account:', this.account);
            
            // Check if on preferred network (Arbitrum Sepolia)
            if (this.chainId !== API_CONFIG.MORALIS.PREFERRED_CHAIN) {
                console.log('⚠️ Not on preferred network, suggesting switch...');
                await this.suggestNetworkSwitch();
            }
            
            // Authenticate with Moralis
            const user = await Moralis.authenticate({
                signingMessage: "Welcome to GENESIS!\n\nPlease sign this message to authenticate your account.\n\nThis will not trigger any blockchain transaction or cost gas fees.",
                provider: "metamask"
            });
            
            console.log('✅ Moralis authentication successful');
            
            this.isAuthenticated = true;
            this.currentUser = {
                walletAddress: user.get('ethAddress'),
                username: user.get('username') || null,
                bio: user.get('bio') || null,
                createdAt: user.get('createdAt'),
                sessionToken: user.getSessionToken(),
                network: this.getNetworkName(),
                chainId: this.chainId
            };
            
            // Save session
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
    
    async checkExistingSession() {
        try {
            const user = Moralis.User.current();
            if (user) {
                console.log('✅ Found existing Moralis session');
                
                // Verify MetaMask is still connected
                if (window.ethereum) {
                    const accounts = await window.ethereum.request({
                        method: 'eth_accounts'
                    });
                    
                    if (accounts.length > 0 && accounts[0].toLowerCase() === user.get('ethAddress').toLowerCase()) {
                        this.isAuthenticated = true;
                        this.isConnected = true;
                        this.account = accounts[0];
                        this.chainId = await window.ethereum.request({
                            method: 'eth_chainId'
                        });
                        
                        this.currentUser = {
                            walletAddress: user.get('ethAddress'),
                            username: user.get('username') || null,
                            bio: user.get('bio') || null,
                            createdAt: user.get('createdAt'),
                            sessionToken: user.getSessionToken(),
                            network: this.getNetworkName(),
                            chainId: this.chainId
                        };
                        
                        console.log('✅ Session restored for:', this.getShortAddress());
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('❌ Error checking session:', error);
            return false;
        }
    }
    
    async signOut() {
        try {
            console.log('🚪 Signing out...');
            
            await Moralis.User.logOut();
            
            this.isAuthenticated = false;
            this.isConnected = false;
            this.currentUser = null;
            this.account = null;
            this.chainId = null;
            
            this.clearSession();
            
            console.log('✅ Signed out successfully');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async suggestNetworkSwitch() {
        try {
            console.log('🌐 Suggesting network switch to Arbitrum Sepolia...');
            
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: API_CONFIG.MORALIS.PREFERRED_CHAIN }],
            });
            
            console.log('✅ Switched to Arbitrum Sepolia');
            this.chainId = API_CONFIG.MORALIS.PREFERRED_CHAIN;
            
        } catch (switchError) {
            // If the chain is not added, add it
            if (switchError.code === 4902) {
                await this.addArbitrumSepolia();
            } else {
                console.log('⚠️ User declined network switch');
            }
        }
    }
    
    async addArbitrumSepolia() {
        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x66eed',
                    chainName: 'Arbitrum Sepolia',
                    nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18,
                    },
                    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                    blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
                }],
            });
            
            console.log('✅ Arbitrum Sepolia added to MetaMask');
        } catch (addError) {
            console.error('❌ Failed to add Arbitrum Sepolia:', addError);
        }
    }
    
    getNetworkName() {
        const networks = {
            '0x1': 'Ethereum Mainnet',
            '0x5': 'Goerli Testnet',
            '0xaa36a7': 'Sepolia Testnet',
            '0x89': 'Polygon Mainnet',
            '0x13881': 'Mumbai Testnet',
            '0xa4b1': 'Arbitrum One',
            '0x66eed': 'Arbitrum Sepolia', // Your target network
            '0xa': 'Optimism',
        };
        return networks[this.chainId] || `Unknown Network (${this.chainId})`;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getShortAddress() {
        if (!this.account) return '';
        return `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
    }
    
    saveSession() {
        try {
            const sessionData = {
                isAuthenticated: this.isAuthenticated,
                account: this.account,
                chainId: this.chainId,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('moralis_ethereum_session', JSON.stringify(sessionData));
        } catch (error) {
            console.error('❌ Failed to save session:', error);
        }
    }
    
    clearSession() {
        try {
            localStorage.removeItem('moralis_ethereum_session');
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

// Initialize when DOM is ready
let moralisEthereum = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Moralis Ethereum Manager...');
    
    try {
        moralisEthereum = new MoralisEthereumManager();
        
        // Wait for initialization
        let attempts = 0;
        while (!moralisEthereum.initialized && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (moralisEthereum.initialized) {
            // Make globally available
            window.walletManager = moralisEthereum;
            window.moralisEthereum = moralisEthereum;
            
            console.log('✅ Moralis Ethereum Manager ready');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('walletReady', {
                detail: { walletManager: moralisEthereum }
            }));
        } else {
            console.error('❌ Moralis Ethereum Manager failed to initialize');
        }
        
    } catch (error) {
        console.error('❌ Failed to create Moralis Ethereum Manager:', error);
    }
});

// Helper function
window.waitForWallet = async function() {
    if (moralisEthereum && moralisEthereum.initialized) return true;
    
    return new Promise((resolve) => {
        window.addEventListener('walletReady', () => resolve(true), { once: true });
        setTimeout(() => resolve(false), 5000);
    });
};