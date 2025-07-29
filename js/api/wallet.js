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
                this.updateWalletUI();
                this.showConnectionSuccess();
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
        // Simple hex encoding for message
        return '0x' + Buffer.from(message, 'utf8').toString('hex');
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
        
        // Reload page to reset state (recommended by MetaMask)
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
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
            '0x3': 'Ropsten Testnet',
            '0x4': 'Rinkeby Testnet',
            '0x5': 'Goerli Testnet',
            '0x89': 'Polygon Mainnet',
            '0x13881': 'Polygon Mumbai Testnet',
            '0xa': 'Optimism Mainnet',
            '0xa4b1': 'Arbitrum One'
        };
        return networks[chainId] || 'Unknown Network';
    }

    // ========================================
    // UI UPDATE METHODS
    // ========================================
    updateWalletUI() {
        const walletBtn = document.getElementById('walletBtn');
        if (!walletBtn) return;

        if (this.isConnected) {
            walletBtn.textContent = `✅ ${this.getShortAddress()}`;
            walletBtn.classList.add('connected');
            walletBtn.title = `Connected to ${this.getNetworkName()}`;
        } else {
            walletBtn.textContent = 'Connect Wallet';
            walletBtn.classList.remove('connected');
            walletBtn.title = 'Connect your MetaMask wallet';
        }
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