// Simple Wallet Connection for GENESIS App
// Replaces broken Moralis authentication

class GenesisWallet {
    constructor() {
        this.connected = false;
        this.account = null;
        this.chainId = null;
        this.isAuthenticated = false;
        this.allowAutoConnection = false; // Flag to prevent unwanted auto-connections
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

            console.log('🔗 Manual wallet connection initiated...');
            
            // Always allow manual connections (this overrides the auto-connection flag)
            this.allowAutoConnection = true;
            
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
            
            // Check if user has a username/profile
            const username = this.checkUsernameAssociation();
            if (!username) {
                console.log('🆕 No username found - redirecting to profile setup');
                this.showSuccess('Wallet connected! Setting up your profile...');
                setTimeout(() => {
                    window.location.href = 'profile-setup.html';
                }, 2000);
                return {
                    success: true,
                    account: this.account,
                    signature: signature,
                    redirecting: true
                };
            }
            
            this.showSuccess(`Welcome back, ${username}!`);
            
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
        this.allowAutoConnection = false; // Prevent auto-reconnection after manual disconnect
        
        // Clear session
        this.clearSession();
        
        // Update UI
        this.updateWalletUI();
        
        console.log('🚪 Wallet disconnected');
        this.showSuccess('Wallet disconnected');
    }

    // Force clear all wallet data (for debugging/reset purposes)
    async forceReset() {
        console.log('🧹 Force resetting all wallet data...');
        
        // Clear local state
        this.connected = false;
        this.account = null;
        this.chainId = null;
        this.isAuthenticated = false;
        this.allowAutoConnection = false; // Prevent any future auto-connections
        
        // Clear all localStorage data
        this.clearSession();
        localStorage.removeItem('siwe_users');
        localStorage.removeItem('web3_session');
        localStorage.removeItem('wallet_session');
        localStorage.removeItem('moralis_session');
        
        // Try to revoke MetaMask permissions
        try {
            if (window.ethereum) {
                await window.ethereum.request({
                    method: 'wallet_revokePermissions',
                    params: [{ eth_accounts: {} }]
                });
                console.log('✅ MetaMask permissions revoked');
            }
        } catch (error) {
            console.log('⚠️ Could not revoke MetaMask permissions (this is normal for some wallets)');
        }
        
        // Update UI to show disconnected state
        this.updateWalletUI();
        
        console.log('🎉 Complete wallet reset performed - auto-connection disabled');
        this.showSuccess('All wallet data cleared! Refresh the page for a completely fresh start.');
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

    // Send tip functionality
    async sendTip(recipientAddress, amountInEth, message = '') {
        try {
            if (!this.connected || !this.isAuthenticated) {
                throw new Error('Please connect and authenticate your wallet first');
            }

            console.log(`💰 Sending tip: ${amountInEth} ETH to ${recipientAddress}`);

            // Convert ETH to Wei (smallest unit)
            const amountInWei = window.ethereum.utils?.toWei?.(amountInEth.toString(), 'ether') 
                              || (BigInt(Math.floor(amountInEth * 1e18))).toString(16);

            // Prepare transaction
            const transactionParams = {
                to: recipientAddress,
                from: this.account,
                value: '0x' + BigInt(Math.floor(amountInEth * 1e18)).toString(16),
                gas: '0x5208', // 21000 gas for simple transfer
                gasPrice: '0x' + (1e9).toString(16), // 1 gwei
            };

            console.log('📡 Sending transaction:', transactionParams);

            // Send transaction
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParams],
            });

            console.log('✅ Transaction sent! Hash:', txHash);

            this.showSuccess(`Tip sent! Transaction: ${txHash.slice(0, 10)}...`);

            return {
                success: true,
                transactionHash: txHash,
                amount: amountInEth,
                recipient: recipientAddress,
                message: message
            };

        } catch (error) {
            console.error('❌ Tip failed:', error);
            
            if (error.code === 4001) {
                this.showError('Transaction cancelled by user');
            } else {
                this.showError('Failed to send tip: ' + error.message);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get current user (compatibility with old system)
    getCurrentUser() {
        if (!this.isAuthenticated) return null;
        
        return {
            walletAddress: this.account,
            username: null,
            bio: null,
            isAuthenticated: this.isAuthenticated
        };
    }

    // Check if connected (compatibility)
    get isConnected() {
        return this.connected && this.isAuthenticated;
    }

    // Update wallet UI
    updateWalletUI() {
        const walletBtn = document.getElementById('walletBtn');
        if (!walletBtn) return;

        if (this.connected && this.isAuthenticated) {
            const displayName = this.getDisplayName();
            const shortAddress = this.getShortAddress();
            
            // Show username if available, otherwise show address
            walletBtn.textContent = displayName ? `${displayName} (${shortAddress})` : shortAddress;
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
        // Remove any existing dropdown
        this.removeWalletDropdown();
        
        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.id = 'walletDropdown';
        dropdown.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,240,255,0.95) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 280px;
            overflow: hidden;
            animation: slideDown 0.3s ease;
        `;
        
        dropdown.innerHTML = `
            <style>
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .wallet-menu-header {
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                }
                .wallet-menu-item {
                    padding: 15px 20px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-bottom: 1px solid rgba(0,0,0,0.1);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #333;
                    font-weight: 500;
                }
                .wallet-menu-item:hover {
                    background: rgba(102,126,234,0.1);
                    transform: translateX(5px);
                }
                .wallet-menu-item:last-child {
                    border-bottom: none;
                    color: #ff4757;
                }
                .wallet-menu-item:last-child:hover {
                    background: rgba(255,71,87,0.1);
                }
                .wallet-address {
                    font-family: monospace;
                    font-size: 14px;
                    opacity: 0.8;
                    margin-top: 5px;
                }
                .wallet-network {
                    font-size: 12px;
                    opacity: 0.7;
                    margin-top: 3px;
                }
            </style>
            <div class="wallet-menu-header">
                <div style="font-weight: 600; font-size: 16px;">
                    ${this.getDisplayName() ? this.getDisplayName() : 'Wallet Connected'}
                </div>
                <div class="wallet-address">${this.getShortAddress()}</div>
                <div class="wallet-network">${this.getNetworkName()}</div>
            </div>
            <div class="wallet-menu-item" onclick="window.location.href='dashboard.html'">
                <span>📊</span>
                <span>Dashboard</span>
            </div>
            <div class="wallet-menu-item" onclick="window.location.href='my-worlds.html'">
                <span>🌍</span>
                <span>My Worlds</span>
            </div>
            <div class="wallet-menu-item" onclick="window.location.href='profile-setup.html'">
                <span>✏️</span>
                <span>Edit Profile</span>
            </div>
            <div class="wallet-menu-item" onclick="window.genesisWallet.switchToArbitrum()">
                <span>🔄</span>
                <span>Switch to Arbitrum</span>
            </div>
            <div class="wallet-menu-item" onclick="window.genesisWallet.handleDisconnect()">
                <span>🚪</span>
                <span>Disconnect Wallet</span>
            </div>
        `;
        
        document.body.appendChild(dropdown);
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside.bind(this), { once: true });
        }, 100);
    }
    
    // Handle disconnect from dropdown
    handleDisconnect() {
        this.removeWalletDropdown();
        this.disconnect();
    }
    
    // Remove dropdown
    removeWalletDropdown() {
        const existing = document.getElementById('walletDropdown');
        if (existing) {
            existing.remove();
        }
    }
    
    // Handle clicking outside dropdown
    handleClickOutside(event) {
        const dropdown = document.getElementById('walletDropdown');
        const walletBtn = document.getElementById('walletBtn');
        
        if (dropdown && !dropdown.contains(event.target) && !walletBtn.contains(event.target)) {
            this.removeWalletDropdown();
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

    // Clear session from localStorage
    clearSession() {
        try {
            localStorage.removeItem('genesis_wallet_session');
            console.log('🧹 Session cleared from localStorage');
        } catch (error) {
            console.error('Failed to clear session:', error);
        }
    }

    // Check for existing session on page load
    async checkExistingSession() {
        console.log('🔍 Checking for existing session...');
        
        // First, check if we have ANY user data at all
        const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
        const hasAnyUsers = Object.keys(users).length > 0;
        console.log('👥 Users in localStorage:', Object.keys(users).length);
        
        const session = this.loadSession();
        console.log('💾 Session in localStorage:', !!session);
        
        // If no session exists in localStorage, absolutely do not auto-connect
        if (!session) {
            console.log('ℹ️ No session found in localStorage - will not auto-connect');
            this.allowAutoConnection = false;
            return false;
        }
        
        // Only restore if we have a complete, valid session with authentication signature
        if (session && session.account && session.signature && session.authenticatedAt) {
            console.log('🔍 Found existing session, verifying...', session.account);
            
            // FIRST: Check if there's a valid username association for this wallet
            // This prevents orphaned sessions from auto-connecting
            const hasValidUser = this.hasValidUserAssociation(session.account);
            console.log('👤 User association check:', hasValidUser);
            
            if (!hasValidUser) {
                console.log('⚠️ No valid user profile found for wallet, clearing session and preventing auto-connect');
                this.clearSession();
                this.allowAutoConnection = false;
                return false;
            }
            
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                console.log('🦊 MetaMask connected accounts:', accounts);
                
                // Only auto-restore if the session account is still connected in MetaMask
                if (accounts.includes(session.account)) {
                    console.log('✅ All checks passed - allowing auto-connection');
                    this.allowAutoConnection = true;
                    
                    this.account = session.account;
                    this.chainId = session.chainId;
                    this.connected = true;
                    this.isAuthenticated = true;
                    
                    // Check for username association
                    this.checkUsernameAssociation();
                    
                    this.updateWalletUI();
                    console.log('🔄 Restored authenticated session with valid user profile:', this.getShortAddress());
                    return true;
                } else {
                    console.log('⚠️ Session account not in connected accounts, clearing session');
                    this.clearSession();
                    this.allowAutoConnection = false;
                }
            } catch (error) {
                console.log('❌ Failed to verify session:', error);
                this.clearSession();
                this.allowAutoConnection = false;
            }
        } else {
            console.log('ℹ️ Invalid session data found, clearing...');
            this.clearSession();
            this.allowAutoConnection = false;
        }
        
        return false;
    }

    // Check if a wallet has a valid user association (helper method)
    hasValidUserAssociation(walletAddress) {
        try {
            const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
            const address = walletAddress.toLowerCase();
            
            // Method 1: Check new format - username as key
            for (const [username, userData] of Object.entries(users)) {
                if (userData.walletAddress && userData.walletAddress.toLowerCase() === address) {
                    return true;
                }
            }
            
            // Method 2: Check old format - wallet address as key
            const userByAddress = users[walletAddress] || users[address];
            if (userByAddress && userByAddress.username) {
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking user association:', error);
            return false;
        }
    }

    // Check if wallet is associated with a username
    checkUsernameAssociation() {
        try {
            const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
            const walletAddress = this.account.toLowerCase();
            
            console.log('🔍 Checking username association for:', this.getShortAddress());
            console.log('📊 Current users data:', users);
            
            // Method 1: New format - username as key
            for (const [username, userData] of Object.entries(users)) {
                if (userData.walletAddress && userData.walletAddress.toLowerCase() === walletAddress) {
                    console.log(`✅ Found username "${username}" for wallet (new format)`);
                    
                    // Update session with username
                    const session = this.loadSession();
                    if (session) {
                        session.username = username;
                        session.displayName = userData.displayName || username;
                        this.saveSession(session);
                    }
                    
                    return username;
                }
            }
            
            // Method 2: Old format - wallet address as key
            const userByAddress = users[this.account] || users[walletAddress];
            if (userByAddress && userByAddress.username) {
                const username = userByAddress.username;
                console.log(`✅ Found username "${username}" for wallet (old format)`);
                
                // Update session with username
                const session = this.loadSession();
                if (session) {
                    session.username = username;
                    session.displayName = userByAddress.displayName || username;
                    this.saveSession(session);
                }
                
                return username;
            }
            
            console.log('⚠️ No username associated with wallet', this.getShortAddress());
            return null;
        } catch (error) {
            console.error('Error checking username association:', error);
            return null;
        }
    }

    // Get username from session
    getUsername() {
        const session = this.loadSession();
        return session?.username || null;
    }

    // Get display name
    getDisplayName() {
        const session = this.loadSession();
        return session?.displayName || session?.username || null;
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

    // Debug method to check current state (call from browser console)
    async debug() {
        console.log('🐛 GENESIS Wallet Debug Info:');
        console.log('Connected:', this.connected);
        console.log('Authenticated:', this.isAuthenticated);
        console.log('Account:', this.account);
        console.log('Allow Auto Connection:', this.allowAutoConnection);
        
        const session = this.loadSession();
        console.log('Session in localStorage:', session);
        
        const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
        console.log('Users in localStorage:', users);
        
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                console.log('MetaMask connected accounts:', accounts);
            } catch (error) {
                console.log('Error getting MetaMask accounts:', error);
            }
        }
        
        if (this.account) {
            const hasValidUser = this.hasValidUserAssociation(this.account);
            console.log('Has valid user association:', hasValidUser);
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