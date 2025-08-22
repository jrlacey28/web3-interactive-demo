// Bitcoin Wallet Integration for GENESIS Multi-Wallet System
// Provides Bitcoin address validation, QR code generation, and payment utilities

class BitcoinWalletIntegration {
    constructor() {
        this.networkTypes = {
            mainnet: {
                name: 'Bitcoin Mainnet',
                symbol: 'BTC',
                explorerUrl: 'https://blockstream.info',
                addressFormats: ['1', '3', 'bc1']
            },
            testnet: {
                name: 'Bitcoin Testnet',
                symbol: 'tBTC',
                explorerUrl: 'https://blockstream.info/testnet',
                addressFormats: ['m', 'n', '2', 'tb1']
            }
        };
        
        console.log('₿ Bitcoin Wallet Integration initialized');
    }
    
    // ========================================
    // ADDRESS VALIDATION
    // ========================================
    
    validateAddress(address, network = 'mainnet') {
        try {
            const trimmedAddress = address.trim();
            
            if (!trimmedAddress) {
                return { valid: false, error: 'Address cannot be empty' };
            }
            
            // Basic length check
            if (trimmedAddress.length < 26 || trimmedAddress.length > 90) {
                return { valid: false, error: 'Invalid address length' };
            }
            
            // Network-specific validation
            const networkConfig = this.networkTypes[network];
            if (!networkConfig) {
                return { valid: false, error: 'Unsupported network' };
            }
            
            // Check address format based on network
            const addressType = this.detectAddressType(trimmedAddress, network);
            if (!addressType.valid) {
                return addressType;
            }
            
            // Additional format validation
            return this.validateAddressFormat(trimmedAddress, addressType.type, network);
            
        } catch (error) {
            console.error('❌ Bitcoin address validation error:', error);
            return { valid: false, error: 'Address validation failed' };
        }
    }
    
    detectAddressType(address, network = 'mainnet') {
        const networkConfig = this.networkTypes[network];
        
        if (network === 'mainnet') {
            if (address.startsWith('1')) {
                return { valid: true, type: 'P2PKH', description: 'Legacy Address' };
            } else if (address.startsWith('3')) {
                return { valid: true, type: 'P2SH', description: 'Script Address' };
            } else if (address.startsWith('bc1q')) {
                return { valid: true, type: 'P2WPKH', description: 'SegWit v0 Address' };
            } else if (address.startsWith('bc1p')) {
                return { valid: true, type: 'P2TR', description: 'Taproot Address' };
            }
        } else if (network === 'testnet') {
            if (address.startsWith('m') || address.startsWith('n')) {
                return { valid: true, type: 'P2PKH', description: 'Testnet Legacy Address' };
            } else if (address.startsWith('2')) {
                return { valid: true, type: 'P2SH', description: 'Testnet Script Address' };
            } else if (address.startsWith('tb1q')) {
                return { valid: true, type: 'P2WPKH', description: 'Testnet SegWit v0 Address' };
            } else if (address.startsWith('tb1p')) {
                return { valid: true, type: 'P2TR', description: 'Testnet Taproot Address' };
            }
        }
        
        return { valid: false, error: `Invalid address format for ${network}` };
    }
    
    validateAddressFormat(address, type, network) {
        try {
            switch (type) {
                case 'P2PKH':
                    return this.validateLegacyAddress(address, network);
                case 'P2SH':
                    return this.validateScriptAddress(address, network);
                case 'P2WPKH':
                case 'P2TR':
                    return this.validateBech32Address(address, network);
                default:
                    return { valid: false, error: 'Unsupported address type' };
            }
        } catch (error) {
            return { valid: false, error: 'Address format validation failed' };
        }
    }
    
    validateLegacyAddress(address, network) {
        // P2PKH addresses should be exactly 34 characters for mainnet
        // or 34 characters for testnet
        if (address.length !== 34) {
            return { valid: false, error: 'Invalid legacy address length' };
        }
        
        // Check for valid base58 characters
        const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
        if (!base58Regex.test(address)) {
            return { valid: false, error: 'Invalid characters in legacy address' };
        }
        
        return { valid: true, type: 'legacy', network };
    }
    
    validateScriptAddress(address, network) {
        // P2SH addresses should be exactly 34 characters
        if (address.length !== 34) {
            return { valid: false, error: 'Invalid script address length' };
        }
        
        // Check for valid base58 characters
        const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
        if (!base58Regex.test(address)) {
            return { valid: false, error: 'Invalid characters in script address' };
        }
        
        return { valid: true, type: 'script', network };
    }
    
    validateBech32Address(address, network) {
        // Bech32 addresses have specific length requirements
        if (address.length < 42 || address.length > 90) {
            return { valid: false, error: 'Invalid bech32 address length' };
        }
        
        // Check for valid bech32 characters (lowercase only)
        const bech32Regex = /^[a-z0-9]+$/;
        const addressBody = address.slice(address.indexOf('1') + 1);
        if (!bech32Regex.test(addressBody)) {
            return { valid: false, error: 'Invalid characters in bech32 address' };
        }
        
        // Exclude ambiguous characters
        if (/[bio]/.test(addressBody)) {
            return { valid: false, error: 'Bech32 address contains invalid characters (b, i, o)' };
        }
        
        return { valid: true, type: 'bech32', network };
    }
    
    // ========================================
    // PAYMENT URI GENERATION
    // ========================================
    
    generatePaymentURI(address, options = {}) {
        try {
            const { amount, label, message } = options;
            
            // Validate address first
            const validation = this.validateAddress(address);
            if (!validation.valid) {
                throw new Error(`Invalid Bitcoin address: ${validation.error}`);
            }
            
            let uri = `bitcoin:${address}`;
            const params = [];
            
            if (amount && amount > 0) {
                params.push(`amount=${amount}`);
            }
            
            if (label) {
                params.push(`label=${encodeURIComponent(label)}`);
            }
            
            if (message) {
                params.push(`message=${encodeURIComponent(message)}`);
            }
            
            if (params.length > 0) {
                uri += '?' + params.join('&');
            }
            
            return { success: true, uri };
            
        } catch (error) {
            console.error('❌ Payment URI generation failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========================================
    // QR CODE UTILITIES
    // ========================================
    
    async generateQRCode(address, options = {}) {
        try {
            const paymentURI = this.generatePaymentURI(address, options);
            if (!paymentURI.success) {
                throw new Error(paymentURI.error);
            }
            
            // Create QR code data URL (simplified - in production use a proper QR library)
            const qrData = this.createSimpleQRCode(paymentURI.uri);
            
            return {
                success: true,
                qrCodeDataURL: qrData,
                uri: paymentURI.uri,
                address: address
            };
            
        } catch (error) {
            console.error('❌ QR code generation failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    createSimpleQRCode(data) {
        // Simplified QR code generation (placeholder)
        // In production, use a proper QR code library like qrcode.js
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        
        // Draw simple pattern (replace with actual QR code library)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText('QR Code', 10, 100);
        ctx.fillText('(Use QR library)', 10, 120);
        
        return canvas.toDataURL();
    }
    
    // ========================================
    // BLOCKCHAIN EXPLORER INTEGRATION
    // ========================================
    
    getExplorerURL(address, network = 'mainnet') {
        const networkConfig = this.networkTypes[network];
        if (!networkConfig) {
            return null;
        }
        
        return `${networkConfig.explorerUrl}/address/${address}`;
    }
    
    getTransactionURL(txid, network = 'mainnet') {
        const networkConfig = this.networkTypes[network];
        if (!networkConfig) {
            return null;
        }
        
        return `${networkConfig.explorerUrl}/tx/${txid}`;
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    formatSatoshis(satoshis) {
        const btc = satoshis / 100000000;
        return `${btc.toFixed(8)} BTC`;
    }
    
    convertBTCToSatoshis(btc) {
        return Math.round(btc * 100000000);
    }
    
    getAddressInfo(address, network = 'mainnet') {
        const validation = this.validateAddress(address, network);
        if (!validation.valid) {
            return { valid: false, error: validation.error };
        }
        
        const addressType = this.detectAddressType(address, network);
        const explorerURL = this.getExplorerURL(address, network);
        
        return {
            valid: true,
            address: address,
            network: network,
            type: addressType.type,
            description: addressType.description,
            explorerURL: explorerURL,
            canReceivePayments: true
        };
    }
    
    // ========================================
    // TESTING UTILITIES
    // ========================================
    
    getTestAddresses() {
        return {
            mainnet: {
                legacy: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Genesis block address
                script: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
                bech32: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
            },
            testnet: {
                legacy: 'mzBc4XEFSdzCDcTxAgf6EZXgsZWpztRhef',
                script: '2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc',
                bech32: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'
            }
        };
    }
    
    runValidationTests() {
        console.log('🧪 Running Bitcoin address validation tests...');
        
        const testAddresses = this.getTestAddresses();
        let passed = 0;
        let total = 0;
        
        // Test mainnet addresses
        Object.entries(testAddresses.mainnet).forEach(([type, address]) => {
            total++;
            const result = this.validateAddress(address, 'mainnet');
            if (result.valid) {
                console.log(`✅ Mainnet ${type}: ${address}`);
                passed++;
            } else {
                console.log(`❌ Mainnet ${type}: ${address} - ${result.error}`);
            }
        });
        
        // Test testnet addresses
        Object.entries(testAddresses.testnet).forEach(([type, address]) => {
            total++;
            const result = this.validateAddress(address, 'testnet');
            if (result.valid) {
                console.log(`✅ Testnet ${type}: ${address}`);
                passed++;
            } else {
                console.log(`❌ Testnet ${type}: ${address} - ${result.error}`);
            }
        });
        
        console.log(`🧪 Tests completed: ${passed}/${total} passed`);
        return { passed, total, success: passed === total };
    }
}

// Export for global use
window.BitcoinWalletIntegration = BitcoinWalletIntegration;

// Create global instance
window.bitcoinWallet = new BitcoinWalletIntegration();

console.log('₿ Bitcoin Wallet Integration loaded');