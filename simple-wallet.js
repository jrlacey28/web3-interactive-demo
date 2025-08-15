// ULTRA-SIMPLE WALLET CONNECTION
// No Moralis auth, just pure MetaMask connection

class SimpleWallet {
    constructor() {
        this.connected = false;
        this.account = null;
        this.chainId = null;
        this.isArbitrumTestnet = false;
    }

    // Step 1: Check if MetaMask is installed
    isMetaMaskInstalled() {
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    // Step 2: Connect to wallet
    async connect() {
        try {
            console.log('🔗 Connecting to MetaMask...');
            
            if (!this.isMetaMaskInstalled()) {
                throw new Error('MetaMask not installed. Please install MetaMask extension.');
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No accounts found. Please unlock MetaMask.');
            }

            this.account = accounts[0];
            this.connected = true;

            // Get network info
            this.chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });

            // Check if on Arbitrum Sepolia testnet (chain ID 421614)
            this.isArbitrumTestnet = (this.chainId === '0x66eee');

            console.log('✅ Wallet connected:', this.account);
            console.log('🌐 Network:', this.getNetworkName());

            return {
                success: true,
                account: this.account,
                network: this.getNetworkName(),
                isArbitrumTestnet: this.isArbitrumTestnet
            };

        } catch (error) {
            console.error('❌ Connection failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Step 3: Sign authentication message
    async authenticate() {
        try {
            if (!this.connected) {
                const connectResult = await this.connect();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
            }

            const message = `Welcome to GENESIS!

Sign this message to authenticate your account.

Wallet: ${this.account}
Network: ${this.getNetworkName()}
Time: ${new Date().toISOString()}`;

            console.log('✍️ Requesting signature...');

            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, this.account]
            });

            console.log('✅ Authentication successful!');

            // Save to localStorage
            localStorage.setItem('wallet_session', JSON.stringify({
                account: this.account,
                chainId: this.chainId,
                authenticatedAt: new Date().toISOString(),
                signature: signature
            }));

            return {
                success: true,
                account: this.account,
                signature: signature,
                network: this.getNetworkName()
            };

        } catch (error) {
            console.error('❌ Authentication failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Step 4: Switch to Arbitrum testnet if needed
    async switchToArbitrumTestnet() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x66eee' }], // Arbitrum Sepolia (421614)
            });
            
            this.chainId = '0x66eee';
            this.isArbitrumTestnet = true;
            
            return { success: true };
        } catch (error) {
            // If network doesn't exist, add it
            if (error.code === 4902) {
                return await this.addArbitrumTestnet();
            }
            return { success: false, error: error.message };
        }
    }

    // Add Arbitrum testnet to MetaMask
    async addArbitrumTestnet() {
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
            this.isArbitrumTestnet = true;
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
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

    // Disconnect wallet
    disconnect() {
        this.connected = false;
        this.account = null;
        this.chainId = null;
        this.isArbitrumTestnet = false;
        localStorage.removeItem('wallet_session');
        console.log('🚪 Wallet disconnected');
    }

    // Check for existing session
    loadSession() {
        try {
            const session = JSON.parse(localStorage.getItem('wallet_session'));
            if (session && session.account) {
                this.account = session.account;
                this.chainId = session.chainId;
                this.connected = true;
                this.isArbitrumTestnet = (this.chainId === '0x66eee');
                return session;
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        }
        return null;
    }
}

// Create global instance
window.wallet = new SimpleWallet();

console.log('✅ Simple Wallet System Ready!');