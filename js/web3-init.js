// Production-Grade Web3 Initialization System
// Handles dependency loading, wallet management, and error recovery

class Web3InitializationManager {
    constructor() {
        this.dependencies = {
            apiConfig: false,
            moralisSDK: false,
            walletManager: false
        };
        
        this.retryAttempts = {
            apiConfig: 0,
            moralisSDK: 0,
            walletManager: 0
        };
        
        this.maxRetries = 30; // 3 seconds max per dependency
        this.initialized = false;
        this.initializationPromise = null;
        
        console.log('🔧 Web3 Initialization Manager started');
    }

    // Main initialization method - call this from HTML
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    async _performInitialization() {
        try {
            console.log('🚀 Starting Web3 initialization sequence...');
            
            // Step 1: Wait for API Config
            await this._waitForDependency('apiConfig', () => typeof API_CONFIG !== 'undefined');
            
            // Step 2: Wait for Moralis SDK
            await this._waitForDependency('moralisSDK', () => typeof Moralis !== 'undefined');
            
            // Step 3: Initialize Moralis Wallet Manager
            await this._initializeMoralisWallet();
            
            // Step 4: Setup global references
            this._setupGlobalReferences();
            
            this.initialized = true;
            console.log('✅ Web3 initialization completed successfully');
            
            // Dispatch global event for other components
            window.dispatchEvent(new CustomEvent('web3Initialized', {
                detail: { walletManager: window.walletManager }
            }));
            
            return true;
            
        } catch (error) {
            console.error('❌ Web3 initialization failed:', error);
            this._handleInitializationError(error);
            throw error;
        }
    }

    async _waitForDependency(name, checkFunction) {
        console.log(`⏳ Waiting for ${name}...`);
        
        while (!checkFunction() && this.retryAttempts[name] < this.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.retryAttempts[name]++;
        }
        
        if (!checkFunction()) {
            throw new Error(`${name} failed to load after ${this.maxRetries * 100}ms`);
        }
        
        this.dependencies[name] = true;
        console.log(`✅ ${name} loaded successfully`);
    }

    async _initializeMoralisWallet() {
        console.log('🔐 Initializing Moralis Wallet Manager...');
        
        if (!API_CONFIG?.MORALIS?.API_KEY) {
            throw new Error('Moralis API key not found in configuration');
        }

        // Use the createMoralisWalletManager function if available, otherwise create directly
        let walletManager;
        if (typeof createMoralisWalletManager === 'function') {
            walletManager = createMoralisWalletManager();
        } else {
            console.log('⚠️ createMoralisWalletManager not found, creating directly');
            walletManager = new MoralisWalletManager();
            window.walletManager = walletManager;
        }
        
        // Wait for Moralis to initialize
        let attempts = 0;
        while (!walletManager.initialized && attempts < this.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!walletManager.initialized) {
            throw new Error('Moralis Wallet Manager failed to initialize');
        }
        
        this.dependencies.walletManager = true;
        console.log('✅ Moralis Wallet Manager initialized');
        
        return walletManager;
    }

    _setupGlobalReferences() {
        // Ensure global walletManager is available
        if (!window.walletManager) {
            console.log('🔧 Setting up global wallet manager reference...');
            // Find the wallet manager instance
            if (typeof moralisWallet !== 'undefined' && moralisWallet) {
                window.walletManager = moralisWallet;
            } else {
                throw new Error('Wallet manager instance not found');
            }
        }
        
        console.log('✅ Global references configured');
    }

    _handleInitializationError(error) {
        console.error('🚨 Web3 Initialization Error Details:');
        console.error('Dependencies status:', this.dependencies);
        console.error('Retry attempts:', this.retryAttempts);
        console.error('Error:', error);
        
        // Show user-friendly error
        this._showUserError(error);
        
        // Dispatch error event
        window.dispatchEvent(new CustomEvent('web3InitializationError', {
            detail: { error, dependencies: this.dependencies }
        }));
    }

    _showUserError(error) {
        const errorMessages = {
            'apiConfig': 'Configuration files failed to load. Please refresh the page.',
            'moralisSDK': 'Blockchain SDK failed to load. Check your internet connection.',
            'walletManager': 'Wallet system failed to initialize. Please refresh the page.'
        };
        
        let userMessage = 'Web3 initialization failed. Please refresh the page and try again.';
        
        // Find which dependency failed
        for (const [dep, loaded] of Object.entries(this.dependencies)) {
            if (!loaded && errorMessages[dep]) {
                userMessage = errorMessages[dep];
                break;
            }
        }
        
        // Show toast notification
        if (typeof showToast === 'function') {
            showToast(userMessage, 'error', 8000);
        } else {
            alert(userMessage);
        }
    }

    // Utility method to check if Web3 is ready
    isReady() {
        return this.initialized && 
               this.dependencies.apiConfig && 
               this.dependencies.moralisSDK && 
               this.dependencies.walletManager &&
               window.walletManager;
    }

    // Method to wait for Web3 to be ready
    async waitForReady() {
        if (this.isReady()) {
            return true;
        }
        
        if (!this.initializationPromise) {
            await this.initialize();
        } else {
            await this.initializationPromise;
        }
        
        return this.isReady();
    }
}

// Create global instance
window.web3Init = new Web3InitializationManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.web3Init.initialize();
    } catch (error) {
        console.error('Failed to auto-initialize Web3:', error);
    }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Web3InitializationManager;
}