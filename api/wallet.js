// MetaMask Wallet Integration
// Documentation: https://docs.metamask.io/

class WalletManager {
    constructor() {
        this.isConnected = false;
        this.currentAccount = null;
        this.chainId = null;
        this.init();
    }

    async init() {
        // Check if MetaMask is installed
        if (typeof window.ethereum !== 'undefined') {
            console.log('MetaMask is installed!');
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                this.handleAccountsChanged(accounts);
            });

            // Listen for chain changes
            window.ethereum.on('chainChanged', (chainId) => {
                this.handleChainChanged(chainId);
            });

            // Check if already connected
            await this.checkConnection();
        } else {
            console.log('MetaMask is not installed');
        }
    }

    // ========================================
    // CONNECTION METHODS
    // ========================================
    async connectWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                // Show inline modal instead of redirecting
                this.showMetaMaskInstallModal();
                return { success: false, error: 'MetaMask not installed' };
            }

            // Request account access - this opens MetaMask popup, doesn't redirect
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.isConnected = true;
                
                // Get chain ID
                this.chainId = await window.ethereum.request({
                    method: 'eth_chainId'
                });

                console.log('Wallet connected:', this.currentAccount);
                console.log('Chain ID detected:', this.chainId);
                console.log('Network name:', this.getNetworkName());
                this.updateWalletUI();
                this.showConnectionSuccess();
                
                // Prompt network switch if needed
                setTimeout(() => {
                    if (!this.isCorrectNetwork()) {
                        this.promptNetworkSwitch();
                    }
                }, 1000);
                
                return { success: true, account: this.currentAccount };
            }
        } catch (error) {
            if (error.code === 4001) {
                // User rejected request
                this.showConnectionError('Connection cancelled by user');
            } else {
                this.showConnectionError('Failed to connect: ' + error.message);
            }
            console.error('Failed to connect wallet:', error);
            return { success: false, error: error.message };
        }
    }

    showMetaMaskInstallModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
            align-items: center; justify-content: center;
        `;
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px;">
                <h3>MetaMask Required</h3>
                <p style="margin: 15px 0;">You need MetaMask to connect your wallet</p>
                <button onclick="window.open('https://metamask.io/download/', '_blank')" 
                        style="background: #f6851b; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 10px;">
                    Install MetaMask
                </button>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #ccc; color: black; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 10px;">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showConnectionSuccess() {
        this.showToast('✅ Wallet connected successfully!', 'success');
    }

    showConnectionError(message) {
        this.showToast('❌ ' + message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#00ff88' : type === 'error' ? '#ff4757' : '#00d4ff';
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${bgColor}; 
            color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000;
            font-weight: bold; animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async checkConnection() {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });

            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.isConnected = true;
                
                // Get chain ID
                this.chainId = await window.ethereum.request({
                    method: 'eth_chainId'
                });
                
                console.log('Existing connection - Chain ID:', this.chainId);
                console.log('Network name:', this.getNetworkName());
                
                this.updateWalletUI();
            }
        } catch (error) {
            console.error('Error checking connection:', error);
        }
    }

    disconnect() {
        this.isConnected = false;
        this.currentAccount = null;
        this.chainId = null;
        this.updateWalletUI();
    }

    // ========================================
    // TRANSACTION METHODS
    // ========================================
    async sendTip(recipientAddress, amountInEth, message = '') {
        try {
            if (!this.isConnected) {
                throw new Error('Wallet not connected');
            }

            // Convert ETH to Wei (1 ETH = 10^18 Wei)
            const amountInWei = '0x' + (BigInt(Math.floor(amountInEth * 1e18))).toString(16);

            const transactionParameters = {
                to: recipientAddress,
                from: this.currentAccount,
                value: amountInWei,
                gas: '0x5208', // 21000 gas for simple transfer
                gasPrice: await this.getGasPrice(),
                data: message ? this.encodeMessage(message) : '0x'
            };

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters],
            });

            console.log('Transaction sent:', txHash);
            return { success: true, txHash: txHash };

        } catch (error) {
            console.error('Transaction failed:', error);
            return { success: false, error: error.message };
        }
    }

    async getGasPrice() {
        try {
            return await window.ethereum.request({
                method: 'eth_gasPrice',
            });
        } catch (error) {
            // Fallback gas price
            return '0x9502f9000'; // 40 gwei
        }
    }

    encodeMessage(message) {
        // Browser-safe hex encoding for message
        const encoder = new TextEncoder();
        const bytes = encoder.encode(message || '');
        let hex = '0x';
        for (let i = 0; i < bytes.length; i++) {
            hex += bytes[i].toString(16).padStart(2, '0');
        }
        return hex;
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================
    handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            // User disconnected wallet
            this.disconnect();
            console.log('Wallet disconnected');
        } else if (accounts[0] !== this.currentAccount) {
            // User switched accounts
            this.currentAccount = accounts[0];
            this.updateWalletUI();
            console.log('Account changed to:', this.currentAccount);
        }
    }

    handleChainChanged(chainId) {
        this.chainId = chainId;
        console.log('Chain changed to:', chainId);
        this.updateWalletUI();
        
        // Show network change notification instead of reloading
        this.showToast(`Network switched to ${this.getNetworkName(chainId)}`, 'info');
        
        // Dispatch custom event for other components to handle
        window.dispatchEvent(new CustomEvent('networkChanged', {
            detail: { chainId: chainId, networkName: this.getNetworkName(chainId) }
        }));
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    getShortAddress(address = this.currentAccount) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    async getBalance() {
        try {
            if (!this.currentAccount) return null;

            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [this.currentAccount, 'latest']
            });

            // Convert from Wei to ETH
            return parseInt(balance, 16) / Math.pow(10, 18);
        } catch (error) {
            console.error('Error getting balance:', error);
            return null;
        }
    }

    getNetworkName(chainId = this.chainId) {
        const networks = {
            '0x1': 'Ethereum Mainnet',
            '0x5': 'Goerli Testnet', 
            '0x11155111': 'Sepolia Testnet',
            '0x89': 'Polygon Mainnet',
            '0x13881': 'Polygon Mumbai',
            '0xa': 'Optimism Mainnet',
            '0xa4b1': 'Arbitrum One',
            '0x66eed': 'Arbitrum Goerli (Deprecated)',
            '0x66eee': 'Arbitrum Sepolia Testnet',
            // Add more common networks
            '0x38': 'BSC Mainnet',
            '0x61': 'BSC Testnet',
            '0xfa': 'Fantom Opera',
            '0xa86a': 'Avalanche C-Chain',
            // Add common hex variations that might be returned
            '66eee': 'Arbitrum Sepolia Testnet',  // Without 0x prefix
            '421614': 'Arbitrum Sepolia Testnet'  // Decimal format
        };
        
        // Enhanced debugging
        console.log(`🔍 Chain ID Detection Debug:`);
        console.log(`  Raw chainId parameter: ${chainId}`);
        console.log(`  Type: ${typeof chainId}`);
        console.log(`  this.chainId: ${this.chainId}`);
        console.log(`  Available networks:`, Object.keys(networks));
        
        // Try multiple formats to ensure we match the network
        let networkName = null;
        const searchChainIds = [
            chainId,                    // Original format
            chainId?.toString(),        // String conversion
            '0x' + chainId?.toString(), // Add 0x prefix
            chainId?.replace?.('0x', ''), // Remove 0x prefix if present
        ];
        
        // Also try converting from decimal to hex if it's a number
        if (!isNaN(chainId)) {
            const hexChainId = '0x' + parseInt(chainId).toString(16);
            searchChainIds.push(hexChainId);
        }
        
        console.log(`  Trying chain ID variations:`, searchChainIds);
        
        for (const searchId of searchChainIds) {
            if (networks[searchId]) {
                networkName = networks[searchId];
                console.log(`  ✅ Found match with format: ${searchId} -> ${networkName}`);
                break;
            }
        }
        
        if (!networkName) {
            networkName = `Unknown Network (${chainId})`;
            console.log(`  ❌ No match found for any format`);
        }
        
        return networkName;
    }

    isTestnet(chainId = this.chainId) {
        const testnets = ['0x5', '0x11155111', '0x13881', '0x66eed', '0x66eee', '0x61'];
        return testnets.includes(chainId);
    }

    // ========================================
    // ARBITRUM NETWORK MANAGEMENT
    // ========================================
    async switchToArbitrumSepolia() {
        try {
            // Try to switch to Arbitrum Sepolia Testnet
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x66eee' }],
            });
            return true;
        } catch (switchError) {
            // If Arbitrum Sepolia isn't added to MetaMask, add it
            if (switchError.code === 4902) {
                return await this.addArbitrumSepoliaNetwork();
            }
            throw switchError;
        }
    }

    async addArbitrumSepoliaNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x66eee',
                    chainName: 'Arbitrum Sepolia',
                    nativeCurrency: {
                        name: 'Ethereum',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                    blockExplorerUrls: ['https://sepolia.arbiscan.io/']
                }]
            });
            return true;
        } catch (addError) {
            console.error('Failed to add Arbitrum Sepolia network:', addError);
            return false;
        }
    }

    // Legacy method - kept for backward compatibility but updated to use Sepolia
    async switchToArbitrum() {
        return await this.switchToArbitrumSepolia();
    }

    async addArbitrumNetwork() {
        return await this.addArbitrumSepoliaNetwork();
    }

    async switchToArbitrumTestnet() {
        // Redirect to Arbitrum Sepolia instead of deprecated Goerli
        return await this.switchToArbitrumSepolia();
    }

    async addArbitrumTestnet() {
        // Redirect to Arbitrum Sepolia instead of deprecated Goerli
        return await this.addArbitrumSepoliaNetwork();
    }

    isArbitrumNetwork() {
        return this.chainId === '0xa4b1' || this.chainId === '0x66eed' || this.chainId === '0x66eee';
    }

    isCorrectNetwork() {
        // For development, we want Arbitrum Sepolia
        return this.chainId === '0x66eee';
    }

    async promptNetworkSwitch() {
        if (!this.isCorrectNetwork()) {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
                align-items: center; justify-content: center;
            `;
            modal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 500px;">
                    <h3 style="color: #2D374B; margin-bottom: 15px;">🧪 Switch to Arbitrum Sepolia Testnet</h3>
                    <p style="margin: 15px 0; color: #666;">GENESIS is currently running on Arbitrum Sepolia testnet for development and testing.</p>
                    
                    <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
                            <span style="font-size: 1.2rem;">🧪</span>
                            <strong style="color: #856404;">TESTNET MODE</strong>
                        </div>
                        <small style="color: #856404;">
                            • Free testnet ETH for transactions<br>
                            • Safe testing environment<br>
                            • No real money involved
                        </small>
                    </div>
                    
                    <div style="margin: 20px 0; padding: 15px; background: #f8f9ff; border-radius: 8px;">
                        <strong>Network Details:</strong><br>
                        <small style="color: #666;">
                            • Name: Arbitrum Sepolia<br>
                            • RPC: sepolia-rollup.arbitrum.io<br>
                            • Chain ID: 421614<br>
                            • Explorer: sepolia.arbiscan.io
                        </small>
                    </div>
                    
                    <button onclick="this.switchToCorrectNetwork()" 
                            style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 10px; font-weight: 600;">
                        🔄 Switch to Arbitrum Sepolia
                    </button>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: #f8f9ff; color: #667eea; border: 2px solid #e8f0ff; padding: 10px 24px; border-radius: 8px; cursor: pointer; margin: 10px;">
                        Continue on ${this.getNetworkName()}
                    </button>
                </div>
            `;
            
            // Add switch functionality to the button
            modal.querySelector('button').onclick = async () => {
                const success = await this.switchToArbitrumSepolia();
                if (success) {
                    modal.remove();
                    this.showToast('✅ Switched to Arbitrum Sepolia Testnet!', 'success');
                } else {
                    this.showToast('❌ Failed to switch networks', 'error');
                }
            };
            
            document.body.appendChild(modal);
        }
    }

    // Legacy method for backward compatibility
    async promptArbitrumSwitch() {
        return await this.promptNetworkSwitch();
    }

    // ========================================
    // UI UPDATE METHODS
    // ========================================
    updateWalletUI() {
        const walletBtn = document.getElementById('walletBtn');
        if (!walletBtn) return;

        if (this.isConnected) {
            const networkName = this.getNetworkName();
            const isTestnet = this.isTestnet();
            const testnetIndicator = isTestnet ? ' 🧪' : '';
            
            walletBtn.textContent = `✅ ${this.getShortAddress()}${testnetIndicator}`;
            walletBtn.classList.add('connected');
            
            if (isTestnet) {
                walletBtn.classList.add('testnet');
            } else {
                walletBtn.classList.remove('testnet');
            }
            
            walletBtn.title = `Connected to ${networkName}${isTestnet ? ' (Testnet)' : ''}`;
            
            // Check if user is on wrong network
            if (!this.isCorrectNetwork()) {
                walletBtn.classList.add('wrong-network');
                walletBtn.title += '\n⚠️ Click to switch to the correct network';
            } else {
                walletBtn.classList.remove('wrong-network');
            }
        } else {
            walletBtn.textContent = 'Connect Wallet';
            walletBtn.classList.remove('connected', 'testnet', 'wrong-network');
            walletBtn.title = 'Connect your MetaMask wallet';
        }
        
        // Add testnet indicator to page
        this.updateTestnetIndicator();
    }

    updateTestnetIndicator() {
        // Add or update testnet banner
        let banner = document.getElementById('testnet-banner');
        
        if (this.isConnected && this.isTestnet()) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'testnet-banner';
                banner.style.cssText = `
                    position: fixed; top: 0; left: 0; right: 0; z-index: 99; 
                    background: linear-gradient(90deg, #ff9500, #ff6b00); 
                    color: white; padding: 8px; text-align: center; font-weight: 600; 
                    font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.3);
                    backdrop-filter: blur(10px);
                `;
                banner.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>🧪</span>
                        <span>TESTNET MODE - ${this.getNetworkName()} - No real funds at risk</span>
                        <button onclick="this.parentElement.parentElement.remove()" 
                                style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 2px 8px; border-radius: 3px; margin-left: 15px; cursor: pointer; font-size: 0.8rem;">
                            ✕
                        </button>
                    </div>
                `;
                document.body.insertBefore(banner, document.body.firstChild);
                
                // Adjust body padding to account for banner
                document.body.style.paddingTop = '40px';
            }
        } else {
            if (banner) {
                banner.remove();
                document.body.style.paddingTop = '';
            }
        }
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================
    showToast(message, type = 'info', duration = 4000) {
        const toastId = 'wallet-toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `wallet-toast toast-${type}`;
        
        const colors = {
            success: '#10b981',
            error: '#ef4444', 
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10001;
            background: ${colors[type] || colors.info}; color: white;
            padding: 15px 20px; border-radius: 10px; font-weight: 500;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            transform: translateX(100%); transition: transform 0.3s ease;
            max-width: 400px; font-size: 0.9rem;
            display: flex; align-items: center; gap: 10px;
        `;
        
        toast.innerHTML = `
            <span style="font-size: 1.1rem;">${icons[type] || icons.info}</span>
            <span>${message}</span>
            <button onclick="document.getElementById('${toastId}').remove()" 
                    style="background: transparent; border: none; color: white; cursor: pointer; font-size: 1.2rem; margin-left: 10px;">
                ×
            </button>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
        
        return toast;
    }

    // ========================================
    // STATIC METHODS FOR VALIDATION
    // ========================================
    static isValidAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    static async installMetaMask() {
        if (typeof window !== 'undefined') {
            window.open('https://metamask.io/download/', '_blank');
        }
    }
}

// ========================================
// INTEGRATION NOTES FOR DEVELOPERS
// ========================================
/*
TO INTEGRATE METAMASK:

1. BASIC SETUP:
   - Include this file in your HTML
   - Create wallet instance: const wallet = new WalletManager();

2. CONNECT WALLET:
   - Call wallet.connectWallet() on button click
   - Handle success/error responses

3. SEND TRANSACTIONS:
   - Use wallet.sendTip(address, amount, message)
   - Always validate recipient address
   - Handle transaction confirmations

4. PRODUCTION CONSIDERATIONS:
   - Add proper error handling
   - Implement transaction status tracking
   - Add gas estimation
   - Support multiple networks
   - Add transaction history

5. SECURITY NOTES:
   - Never store private keys
   - Always validate user inputs
   - Use HTTPS in production
   - Implement rate limiting for transactions

6. TESTING:
   - Test on testnets first (Goerli, Mumbai)
   - Use small amounts for testing
   - Test network switching
   - Test account switching

EXAMPLE USAGE:
```javascript
// Initialize wallet
const wallet = new WalletManager();

// Connect wallet
async function connectWallet() {
    const result = await wallet.connectWallet();
    if (result.success) {
        console.log('Connected to:', result.account);
    } else {
        alert('Failed to connect: ' + result.error);
    }
}

// Send tip
async function sendTip() {
    const result = await wallet.sendTip(
        '0x742d35Cc6635C0532925a3b8D9c79E8aB382d76B', // recipient
        0.01, // 0.01 ETH
        'Thanks for the awesome content!' // message
    );
    
    if (result.success) {
        alert('Tip sent! Transaction: ' + result.txHash);
    } else {
        alert('Transaction failed: ' + result.error);
    }
}
```
*/

// Create global wallet instance
let walletManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    walletManager = new WalletManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletManager;
}