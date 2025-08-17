// GENESIS Wallet UI Utilities
// Shared utilities for consistent wallet UI behavior across all pages

class WalletUIManager {
    constructor() {
        this.isInitialized = false;
        this.initializationPromise = null;
    }
    
    async initialize() {
        if (this.isInitialized) return true;
        if (this.initializationPromise) return this.initializationPromise;
        
        this.initializationPromise = this._doInitialize();
        return this.initializationPromise;
    }
    
    async _doInitialize() {
        try {
            // Wait for GENESIS system to be available
            await this.waitForGenesis();
            
            // Initialize UI based on current authentication state
            this.updateWalletUI();
            
            // Set up event listeners
            this.setupGlobalEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Wallet UI Manager initialized');
            return true;
        } catch (error) {
            console.error('❌ Wallet UI Manager initialization failed:', error);
            return false;
        }
    }
    
    async waitForGenesis() {
        let attempts = 0;
        while (!window.genesis && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (!window.genesis) {
            throw new Error('GENESIS system not available');
        }
    }
    
    updateWalletUI() {
        const walletBtn = document.getElementById('walletBtn');
        if (!walletBtn) return;
        
        if (window.genesis.isAuthenticated) {
            const displayName = window.genesis.username || window.genesis.getShortAddress();
            walletBtn.textContent = displayName;
            this.updateDropdownInfo();
        } else {
            walletBtn.textContent = 'Connect Wallet';
        }
    }
    
    updateDropdownInfo() {
        if (!window.genesis.isAuthenticated) return;
        
        const dropdownWalletAddress = document.getElementById('dropdownWalletAddress');
        const dropdownUsername = document.getElementById('dropdownUsername');
        const usernameDisplay = document.getElementById('usernameDisplay');
        
        if (dropdownWalletAddress) {
            dropdownWalletAddress.textContent = window.genesis.getShortAddress();
        }
        
        if (window.genesis.username && usernameDisplay && dropdownUsername) {
            dropdownUsername.textContent = window.genesis.username;
            usernameDisplay.style.display = 'block';
        } else if (usernameDisplay) {
            usernameDisplay.style.display = 'none';
        }
    }
    
    async handleWalletConnect() {
        const walletBtn = document.getElementById('walletBtn');
        
        // If already authenticated, toggle dropdown instead of reconnecting
        if (window.genesis.isAuthenticated) {
            this.toggleUserDropdown();
            return;
        }
        
        try {
            walletBtn.disabled = true;
            walletBtn.textContent = 'Connecting...';
            
            const result = await window.genesis.connect();
            
            if (result.success) {
                console.log('Wallet connected successfully');
                this.updateWalletUI();
                this.showToast('🎉 Welcome back!', 'success');
            } else {
                throw new Error(result.error || 'Connection failed');
            }
            
        } catch (error) {
            console.error('Wallet connection error:', error);
            walletBtn.textContent = 'Connect Wallet';
            this.showToast('❌ Failed to connect wallet', 'error');
        } finally {
            walletBtn.disabled = false;
        }
    }
    
    toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (!dropdown) return;
        
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            // Update dropdown info before showing
            this.updateDropdownInfo();
            
            // Close on outside click
            setTimeout(() => {
                document.addEventListener('click', this.closeDropdownOnOutsideClick.bind(this));
            }, 100);
        }
    }
    
    closeDropdownOnOutsideClick(e) {
        const dropdown = document.getElementById('userDropdown');
        const walletBtn = document.getElementById('walletBtn');
        
        if (dropdown && walletBtn && 
            !dropdown.contains(e.target) && 
            !walletBtn.contains(e.target)) {
            dropdown.style.display = 'none';
            document.removeEventListener('click', this.closeDropdownOnOutsideClick.bind(this));
        }
    }
    
    signOut() {
        if (window.genesis) {
            window.genesis.clearSession();
        }
        
        const walletBtn = document.getElementById('walletBtn');
        if (walletBtn) {
            walletBtn.textContent = 'Connect Wallet';
        }
        
        // Hide dropdown
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        
        this.showToast('👋 Wallet disconnected', 'info');
    }
    
    switchToArbitrum() {
        if (window.ethereum) {
            window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x66eee' }]
            }).catch(() => {
                this.showToast('🔄 Please switch to Arbitrum Sepolia manually', 'info');
            });
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#00ff88' : 
                       type === 'error' ? '#ff4757' : '#667eea';
        
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${bgColor}; 
            color: white; padding: 15px 20px; border-radius: 10px; z-index: 10001;
            font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            transform: translateX(100%); transition: transform 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    
    setupGlobalEventListeners() {
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0 || 
                    (window.genesis.account && accounts[0].toLowerCase() !== window.genesis.account.toLowerCase())) {
                    console.log('🔄 Account changed, refreshing...');
                    window.location.reload();
                }
            });
        }
        
        // Listen for network changes
        if (window.ethereum) {
            window.ethereum.on('chainChanged', (chainId) => {
                console.log('🔗 Network changed:', chainId);
                this.updateDropdownInfo();
            });
        }
    }
}

// Create global instance
window.walletUI = new WalletUIManager();

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Initializing Wallet UI Manager...');
    await window.walletUI.initialize();
});

// Export functions globally for backward compatibility
window.handleWalletConnect = () => window.walletUI.handleWalletConnect();
window.signOut = () => window.walletUI.signOut();
window.switchToArbitrum = () => window.walletUI.switchToArbitrum();
window.toggleUserDropdown = () => window.walletUI.toggleUserDropdown();

console.log('✅ GENESIS Wallet UI Utilities loaded');