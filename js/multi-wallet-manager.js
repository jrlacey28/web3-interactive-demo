// GENESIS Multi-Wallet Manager
// Manages multiple blockchain wallets (ETH primary + secondary wallets like Bitcoin)
// Designed for frontend-only implementation with localStorage persistence

class MultiWalletManager {
    constructor() {
        this.primaryWallet = null; // ETH wallet (authentication & account owner)
        this.secondaryWallets = new Map(); // Other wallets (Bitcoin, etc.)
        this.supportedWalletTypes = new Map();
        this.isInitialized = false;
        
        console.log('🪙 Initializing Multi-Wallet Manager...');
        this.initializeSupportedWallets();
    }
    
    // ========================================
    // INITIALIZATION & CONFIGURATION
    // ========================================
    
    initializeSupportedWallets() {
        // Define supported wallet types and their configurations
        this.supportedWalletTypes.set('ethereum', {
            name: 'Ethereum',
            symbol: 'ETH',
            icon: '🔷',
            addressPattern: /^0x[a-fA-F0-9]{40}$/,
            isPrimary: true,
            canAuthenticate: true,
            canReceivePayments: true,
            networkInfo: {
                mainnet: { name: 'Ethereum Mainnet', chainId: '0x1' },
                arbitrum: { name: 'Arbitrum', chainId: '0xa4b1' },
                polygon: { name: 'Polygon', chainId: '0x89' }
            }
        });
        
        this.supportedWalletTypes.set('bitcoin', {
            name: 'Bitcoin',
            symbol: 'BTC',
            icon: '₿',
            addressPattern: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/,
            isPrimary: false,
            canAuthenticate: false,
            canReceivePayments: true,
            networkInfo: {
                mainnet: { name: 'Bitcoin Mainnet' },
                testnet: { name: 'Bitcoin Testnet' }
            }
        });
        
        // Future wallet types can be easily added here
        this.supportedWalletTypes.set('solana', {
            name: 'Solana',
            symbol: 'SOL',
            icon: '⚡',
            addressPattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
            isPrimary: false,
            canAuthenticate: false,
            canReceivePayments: true,
            networkInfo: {
                mainnet: { name: 'Solana Mainnet' }
            }
        });
        
        console.log('✅ Supported wallet types initialized');
    }
    
    async initialize(genesisWalletSystem) {
        try {
            if (this.isInitialized) return true;
            
            // Link to the main GENESIS wallet system
            this.genesisSystem = genesisWalletSystem;
            
            // Load existing wallet data
            await this.loadWalletsFromStorage();
            
            // Set up primary wallet if authenticated
            if (this.genesisSystem.isAuthenticated) {
                this.setPrimaryWallet(this.genesisSystem.account);
            }
            
            this.isInitialized = true;
            console.log('✅ Multi-Wallet Manager initialized');
            return true;
            
        } catch (error) {
            console.error('❌ Multi-Wallet Manager initialization failed:', error);
            return false;
        }
    }
    
    // ========================================
    // WALLET MANAGEMENT
    // ========================================
    
    setPrimaryWallet(ethAddress) {
        if (!this.isValidAddress(ethAddress, 'ethereum')) {
            throw new Error('Invalid Ethereum address for primary wallet');
        }
        
        this.primaryWallet = {
            id: `eth_${Date.now()}`,
            type: 'ethereum',
            address: ethAddress.toLowerCase(),
            label: 'Primary Wallet',
            isVerified: true,
            isPrimary: true,
            addedAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };
        
        console.log('🔷 Primary wallet set:', this.primaryWallet.address);
    }
    
    async addSecondaryWallet(walletData) {
        try {
            const { type, address, label, network = 'mainnet' } = walletData;
            
            // Security validation
            if (window.multiWalletSecurity) {
                // Check rate limiting
                if (!window.multiWalletSecurity.checkRateLimit('addWallet')) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                
                // Sanitize inputs
                const sanitizedAddress = window.multiWalletSecurity.sanitizeWalletInput(address);
                const sanitizedLabel = label ? window.multiWalletSecurity.sanitizeWalletInput(label) : null;
                
                // Validate label if provided
                if (sanitizedLabel && !window.multiWalletSecurity.validateWalletLabel(sanitizedLabel)) {
                    throw new Error('Invalid wallet label format');
                }
                
                // Perform comprehensive security checks
                const securityChecks = window.multiWalletSecurity.performSecurityChecks(sanitizedAddress, type);
                if (!securityChecks.passed) {
                    throw new Error(`Security validation failed: ${securityChecks.errors.join(', ')}`);
                }
                
                // Log warnings if any
                if (securityChecks.warnings.length > 0) {
                    console.warn('⚠️ Security warnings for wallet address:', securityChecks.warnings);
                }
                
                // Update wallet data with sanitized inputs
                walletData.address = sanitizedAddress;
                walletData.label = sanitizedLabel || label;
            }
            
            // Validate wallet type
            if (!this.supportedWalletTypes.has(type)) {
                throw new Error(`Unsupported wallet type: ${type}`);
            }
            
            const walletConfig = this.supportedWalletTypes.get(type);
            
            // Prevent adding primary wallet types as secondary
            if (walletConfig.isPrimary) {
                throw new Error(`${walletConfig.name} can only be used as primary wallet`);
            }
            
            // Validate address format
            if (!this.isValidAddress(walletData.address, type)) {
                throw new Error(`Invalid ${walletConfig.name} address format`);
            }
            
            // Check for duplicates
            if (this.hasWallet(type, walletData.address)) {
                throw new Error(`${walletConfig.name} wallet already exists`);
            }
            
            // Enforce wallet limits
            if (window.multiWalletSecurity) {
                const currentWallets = this.getAllWallets();
                window.multiWalletSecurity.enforceWalletLimits(currentWallets);
            }
            
            // Create wallet entry
            const wallet = {
                id: `${type}_${Date.now()}`,
                type: type,
                address: address.trim(),
                label: label || `${walletConfig.name} Wallet`,
                network: network,
                isVerified: false, // Can be verified later through small transactions
                isPrimary: false,
                addedAt: new Date().toISOString(),
                lastUsed: null,
                metadata: {
                    icon: walletConfig.icon,
                    symbol: walletConfig.symbol,
                    canReceivePayments: walletConfig.canReceivePayments
                }
            };
            
            // Add to secondary wallets
            this.secondaryWallets.set(wallet.id, wallet);
            
            // Save to storage
            await this.saveWalletsToStorage();
            
            console.log(`✅ ${walletConfig.name} wallet added:`, wallet.address);
            
            // Emit event for UI updates
            this.emitWalletEvent('walletAdded', { wallet });
            
            return {
                success: true,
                wallet: wallet
            };
            
        } catch (error) {
            console.error('❌ Failed to add secondary wallet:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async removeSecondaryWallet(walletId) {
        try {
            if (!this.secondaryWallets.has(walletId)) {
                throw new Error('Wallet not found');
            }
            
            const wallet = this.secondaryWallets.get(walletId);
            this.secondaryWallets.delete(walletId);
            
            // Save to storage
            await this.saveWalletsToStorage();
            
            console.log('🗑️ Wallet removed:', wallet.address);
            
            // Emit event for UI updates
            this.emitWalletEvent('walletRemoved', { wallet });
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to remove wallet:', error);
            return { success: false, error: error.message };
        }
    }
    
    async updateWalletLabel(walletId, newLabel) {
        try {
            if (!this.secondaryWallets.has(walletId)) {
                throw new Error('Wallet not found');
            }
            
            const wallet = this.secondaryWallets.get(walletId);
            wallet.label = newLabel.trim();
            wallet.updatedAt = new Date().toISOString();
            
            await this.saveWalletsToStorage();
            
            // Emit event for UI updates
            this.emitWalletEvent('walletUpdated', { wallet });
            
            return { success: true, wallet };
            
        } catch (error) {
            console.error('❌ Failed to update wallet label:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========================================
    // WALLET QUERIES & UTILITIES
    // ========================================
    
    getAllWallets() {
        const wallets = [];
        
        // Add primary wallet first
        if (this.primaryWallet) {
            wallets.push(this.primaryWallet);
        }
        
        // Add secondary wallets
        this.secondaryWallets.forEach(wallet => {
            wallets.push(wallet);
        });
        
        return wallets;
    }
    
    getWalletsByType(type) {
        const wallets = [];
        
        if (this.primaryWallet && this.primaryWallet.type === type) {
            wallets.push(this.primaryWallet);
        }
        
        this.secondaryWallets.forEach(wallet => {
            if (wallet.type === type) {
                wallets.push(wallet);
            }
        });
        
        return wallets;
    }
    
    getWalletById(walletId) {
        if (this.primaryWallet && this.primaryWallet.id === walletId) {
            return this.primaryWallet;
        }
        return this.secondaryWallets.get(walletId) || null;
    }
    
    hasWallet(type, address) {
        const normalizedAddress = address.toLowerCase();
        
        // Check primary wallet
        if (this.primaryWallet && 
            this.primaryWallet.type === type && 
            this.primaryWallet.address === normalizedAddress) {
            return true;
        }
        
        // Check secondary wallets
        for (let wallet of this.secondaryWallets.values()) {
            if (wallet.type === type && wallet.address.toLowerCase() === normalizedAddress) {
                return true;
            }
        }
        
        return false;
    }
    
    getPaymentWallets() {
        return this.getAllWallets().filter(wallet => 
            wallet.metadata?.canReceivePayments !== false
        );
    }
    
    // ========================================
    // ADDRESS VALIDATION
    // ========================================
    
    isValidAddress(address, type) {
        if (!address || typeof address !== 'string') return false;
        
        const walletConfig = this.supportedWalletTypes.get(type);
        if (!walletConfig) return false;
        
        return walletConfig.addressPattern.test(address.trim());
    }
    
    validateBitcoinAddress(address) {
        // Enhanced Bitcoin address validation
        const trimmedAddress = address.trim();
        
        // Basic format check
        if (!this.isValidAddress(trimmedAddress, 'bitcoin')) {
            return { valid: false, error: 'Invalid Bitcoin address format' };
        }
        
        // Additional validation for different Bitcoin address types
        if (trimmedAddress.startsWith('bc1')) {
            // Bech32 (SegWit) address
            if (trimmedAddress.length < 42 || trimmedAddress.length > 62) {
                return { valid: false, error: 'Invalid Bech32 address length' };
            }
        } else if (trimmedAddress.startsWith('3')) {
            // P2SH address
            if (trimmedAddress.length !== 34) {
                return { valid: false, error: 'Invalid P2SH address length' };
            }
        } else if (trimmedAddress.startsWith('1')) {
            // P2PKH address
            if (trimmedAddress.length !== 34) {
                return { valid: false, error: 'Invalid P2PKH address length' };
            }
        }
        
        return { valid: true };
    }
    
    // ========================================
    // STORAGE MANAGEMENT
    // ========================================
    
    async saveWalletsToStorage() {
        try {
            const walletData = {
                primaryWallet: this.primaryWallet,
                secondaryWallets: Array.from(this.secondaryWallets.entries()),
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };
            
            // Save to localStorage
            localStorage.setItem('genesis_multi_wallets', JSON.stringify(walletData));
            
            // Also save to current user profile if available
            if (this.genesisSystem?.currentUser) {
                const userProfile = this.genesisSystem.currentUser;
                userProfile.wallets = walletData;
                userProfile.updatedAt = new Date().toISOString();
                
                // Update user in storage
                const users = JSON.parse(localStorage.getItem('genesis_users') || '{}');
                users[this.genesisSystem.account] = userProfile;
                localStorage.setItem('genesis_users', JSON.stringify(users));
            }
            
            console.log('💾 Multi-wallet data saved to storage');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to save wallet data:', error);
            return false;
        }
    }
    
    async loadWalletsFromStorage() {
        try {
            // Try to load from user profile first
            if (this.genesisSystem?.currentUser?.wallets) {
                const walletData = this.genesisSystem.currentUser.wallets;
                this.restoreWalletsFromData(walletData);
                return true;
            }
            
            // Fallback to generic storage
            const storedData = localStorage.getItem('genesis_multi_wallets');
            if (storedData) {
                const walletData = JSON.parse(storedData);
                this.restoreWalletsFromData(walletData);
                return true;
            }
            
            console.log('ℹ️ No existing wallet data found');
            return false;
            
        } catch (error) {
            console.error('❌ Failed to load wallet data:', error);
            return false;
        }
    }
    
    restoreWalletsFromData(walletData) {
        if (walletData.primaryWallet) {
            this.primaryWallet = walletData.primaryWallet;
        }
        
        if (walletData.secondaryWallets && Array.isArray(walletData.secondaryWallets)) {
            this.secondaryWallets = new Map(walletData.secondaryWallets);
        }
        
        console.log('📋 Wallet data restored from storage');
    }
    
    // ========================================
    // EVENT SYSTEM
    // ========================================
    
    emitWalletEvent(eventType, data) {
        const event = new CustomEvent('multiWalletEvent', {
            detail: { type: eventType, ...data }
        });
        window.dispatchEvent(event);
    }
    
    // ========================================
    // INTEGRATION HELPERS
    // ========================================
    
    getSupportedWalletTypes() {
        return Array.from(this.supportedWalletTypes.entries()).map(([key, config]) => ({
            type: key,
            ...config
        }));
    }
    
    getWalletSummary() {
        const summary = {
            total: this.getAllWallets().length,
            primary: this.primaryWallet ? 1 : 0,
            secondary: this.secondaryWallets.size,
            byType: {}
        };
        
        this.supportedWalletTypes.forEach((config, type) => {
            summary.byType[type] = this.getWalletsByType(type).length;
        });
        
        return summary;
    }
    
    // ========================================
    // UTILITIES
    // ========================================
    
    formatAddress(address, type) {
        if (!address) return '';
        
        // Different formatting for different wallet types
        switch (type) {
            case 'ethereum':
                return `${address.slice(0, 6)}...${address.slice(-4)}`;
            case 'bitcoin':
                return `${address.slice(0, 8)}...${address.slice(-6)}`;
            case 'solana':
                return `${address.slice(0, 4)}...${address.slice(-4)}`;
            default:
                return `${address.slice(0, 6)}...${address.slice(-4)}`;
        }
    }
    
    getWalletDisplayName(wallet) {
        const config = this.supportedWalletTypes.get(wallet.type);
        return `${config?.icon || ''} ${wallet.label}`.trim();
    }
}

// Export for global use
window.MultiWalletManager = MultiWalletManager;

console.log('🪙 Multi-Wallet Manager loaded');