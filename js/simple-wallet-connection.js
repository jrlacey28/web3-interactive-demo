// Simple Wallet Connection for GENESIS App
// Replaces broken Moralis authentication

class GenesisWallet {
    constructor() {
        this.connected = false;
        this.account = null;
        this.chainId = null;
        this.isAuthenticated = false;
        console.log('🚀 GENESIS Wallet System Ready');
    }

    // Check if MetaMask is available
    isMetaMaskAvailable() {
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    // Connect wallet
    async connect() {
        try {
            if (!this.isMetaMaskAvailable()) {
                throw new Error('MetaMask not detected. Please install MetaMask to continue.');
            }

            console.log('🔗 Connecting to wallet...');
            
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No accounts found. Please unlock MetaMask.');
            }

            this.account = accounts[0];
            this.connected = true;

            // Get current network
            this.chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });

            console.log('✅ Wallet connected:', this.account);
            console.log('🌐 Network:', this.getNetworkName());

            // Update UI
            this.updateWalletUI();

            return {
                success: true,
                account: this.account,
                network: this.getNetworkName()
            };

        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            this.showError('Connection failed: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Authenticate with signature
    async authenticate() {
        try {
            if (!this.connected) {
                const connectResult = await this.connect();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
            }

            console.log('✍️ Requesting authentication signature...');

            const message = `Welcome to GENESIS!

Please sign this message to authenticate your account and access the platform.

Wallet: ${this.account}
Network: ${this.getNetworkName()}
Timestamp: ${new Date().toISOString()}`;

            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, this.account]
            });

            this.isAuthenticated = true;

            // Save session
            this.saveSession({
                account: this.account,
                chainId: this.chainId,
                signature: signature,
                authenticatedAt: new Date().toISOString()
            });

            console.log('✅ Authentication successful!');
            this.showSuccess('Successfully connected to GENESIS!');
            
            // Update UI
            this.updateWalletUI();

            return {
                success: true,
                account: this.account,
                signature: signature
            };

        } catch (error) {
            console.error('❌ Authentication failed:', error);
            if (error.code === 4001) {
                this.showError('Authentication cancelled by user');
            } else {
                this.showError('Authentication failed: ' + error.message);
            }
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Switch to Arbitrum Sepolia
    async switchToArbitrum() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x66eee' }],
            });
            
            this.chainId = '0x66eee';
            this.showSuccess('Switched to Arbitrum Sepolia testnet!');
            
        } catch (switchError) {
            if (switchError.code === 4902) {
                // Add network if it doesn't exist
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x66eee',
                            chainName: 'Arbitrum Sepolia',
                            nativeCurrency: {
                                name: 'ETH',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                            blockExplorerUrls: ['https://sepolia.arbiscan.io/']
                        }]
                    });
                    
                    this.chainId = '0x66eee';
                    this.showSuccess('Added and switched to Arbitrum Sepolia!');
                    
                } catch (addError) {
                    this.showError('Failed to add Arbitrum network: ' + addError.message);
                }
            } else {
                this.showError('Failed to switch network: ' + switchError.message);
            }
        }
    }

    // Disconnect wallet
    disconnect() {
        this.connected = false;
        this.account = null;
        this.chainId = null;
        this.isAuthenticated = false;
        
        // Clear session
        localStorage.removeItem('genesis_wallet_session');
        
        // Update UI
        this.updateWalletUI();
        
        console.log('🚪 Wallet disconnected');
        this.showSuccess('Wallet disconnected');
    }

    // Get network name
    getNetworkName() {
        const networks = {
            '0x1': 'Ethereum Mainnet',
            '0x89': 'Polygon',
            '0xa4b1': 'Arbitrum One',
            '0x66eee': 'Arbitrum Sepolia Testnet'
        };
        return networks[this.chainId] || `Unknown Network (${this.chainId})`;
    }

    // Get short address
    getShortAddress() {
        if (!this.account) return '';
        return `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
    }

    // Update wallet UI
    updateWalletUI() {
        const walletBtn = document.getElementById('walletBtn');
        if (!walletBtn) return;

        if (this.connected && this.isAuthenticated) {
            walletBtn.textContent = this.getShortAddress();
            walletBtn.className = 'wallet-btn connected';
            walletBtn.onclick = () => this.showWalletMenu();
        } else {
            walletBtn.textContent = 'Connect Wallet';
            walletBtn.className = 'wallet-btn';
            walletBtn.onclick = () => handleWalletConnect();
        }
    }

    // Show wallet menu (dropdown)
    showWalletMenu() {
        // Simple implementation - you can enhance this
        const menu = confirm(`Connected: ${this.getShortAddress()}\nNetwork: ${this.getNetworkName()}\n\nDisconnect wallet?`);
        if (menu) {
            this.disconnect();
        }
    }

    // Save session to localStorage
    saveSession(sessionData) {
        try {
            localStorage.setItem('genesis_wallet_session', JSON.stringify(sessionData));
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }

    // Load session from localStorage
    loadSession() {
        try {
            const sessionData = localStorage.getItem('genesis_wallet_session');
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.error('Failed to load session:', error);
            return null;
        }
    }

    // Check for existing session on page load
    async checkExistingSession() {
        const session = this.loadSession();
        if (session && session.account) {
            // Verify wallet is still connected
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.includes(session.account)) {
                    this.account = session.account;
                    this.chainId = session.chainId;
                    this.connected = true;
                    this.isAuthenticated = true;
                    this.updateWalletUI();
                    console.log('🔄 Restored wallet session:', this.getShortAddress());
                    return true;
                }
            } catch (error) {
                console.log('Failed to restore session:', error);
            }
        }
        return false;
    }

    // Toast notifications
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#00ff88' : 
                       type === 'error' ? '#ff4757' : '#667eea';
        
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; 
            background: ${bgColor}; color: white; 
            padding: 15px 20px; border-radius: 10px; 
            z-index: 10001; font-weight: 600; 
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            transform: translateX(100%); 
            transition: transform 0.3s ease;
            max-width: 350px; font-size: 14px;
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

    // Setup event listeners for account/network changes
    setupEventListeners() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else if (accounts[0] !== this.account) {
                    console.log('🔄 Account changed, updating...');
                    this.account = accounts[0];
                    this.updateWalletUI();
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                console.log('🌐 Network changed to:', chainId);
                this.chainId = chainId;
                this.updateWalletUI();
            });
        }
    }
}

// Create global instance
window.genesisWallet = new GenesisWallet();

// Main wallet connect function (called by UI)
async function handleWalletConnect() {
    console.log('🎯 GENESIS wallet connection initiated...');
    
    const connectResult = await window.genesisWallet.connect();
    if (connectResult.success) {
        // Auto-authenticate after connection
        await window.genesisWallet.authenticate();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 GENESIS Wallet System initializing...');
    
    // Setup event listeners
    window.genesisWallet.setupEventListeners();
    
    // Check for existing session
    await window.genesisWallet.checkExistingSession();
    
    console.log('✅ GENESIS Wallet System ready');
});

// Make wallet available globally
window.handleWalletConnect = handleWalletConnect;