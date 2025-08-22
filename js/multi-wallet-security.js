// GENESIS Multi-Wallet Security Module
// Comprehensive security utilities and best practices for multi-wallet management

class MultiWalletSecurity {
    constructor() {
        this.securityPolicies = {
            maxWalletsPerUser: 10,
            addressValidationTimeout: 5000,
            sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
            rateLimiting: {
                addWallet: { attempts: 5, window: 60000 }, // 5 attempts per minute
                validateAddress: { attempts: 20, window: 60000 } // 20 validations per minute
            }
        };
        
        this.rateLimiters = new Map();
        this.securityLog = [];
        
        console.log('🛡️ Multi-Wallet Security Module initialized');
    }
    
    // ========================================
    // INPUT VALIDATION & SANITIZATION
    // ========================================
    
    sanitizeWalletInput(input) {
        if (typeof input !== 'string') {
            throw new Error('Wallet input must be a string');
        }
        
        // Remove potential harmful characters
        const sanitized = input
            .trim()
            .replace(/[<>\"'&]/g, '') // Remove HTML/script injection characters
            .replace(/[\x00-\x1f\x7f-\x9f]/g, ''); // Remove control characters
        
        // Length validation
        if (sanitized.length === 0) {
            throw new Error('Empty input not allowed');
        }
        
        if (sanitized.length > 200) {
            throw new Error('Input too long (max 200 characters)');
        }
        
        return sanitized;
    }
    
    validateWalletLabel(label) {
        if (!label || typeof label !== 'string') {
            return false;
        }
        
        const sanitized = label.trim();
        
        // Length check
        if (sanitized.length < 1 || sanitized.length > 50) {
            return false;
        }
        
        // Allow alphanumeric, spaces, and common symbols
        const validPattern = /^[a-zA-Z0-9\s\-_\.]+$/;
        if (!validPattern.test(sanitized)) {
            return false;
        }
        
        // Check for suspicious patterns
        const suspiciousPatterns = [
            /script/i,
            /javascript:/i,
            /data:/i,
            /vbscript/i,
            /onload/i,
            /onerror/i
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(sanitized)) {
                return false;
            }
        }
        
        return true;
    }
    
    // ========================================
    // ADDRESS SECURITY VALIDATION
    // ========================================
    
    performSecurityChecks(address, walletType) {
        const checks = {
            passed: true,
            warnings: [],
            errors: [],
            riskLevel: 'low'
        };
        
        try {
            // Basic format validation
            if (!this.isValidAddressFormat(address, walletType)) {
                checks.errors.push('Invalid address format');
                checks.passed = false;
                checks.riskLevel = 'high';
                return checks;
            }
            
            // Check for known malicious patterns
            const maliciousChecks = this.checkMaliciousPatterns(address);
            if (maliciousChecks.isMalicious) {
                checks.errors.push(`Potentially malicious address: ${maliciousChecks.reason}`);
                checks.passed = false;
                checks.riskLevel = 'high';
                return checks;
            }
            
            // Check for suspicious characteristics
            const suspiciousChecks = this.checkSuspiciousCharacteristics(address, walletType);
            if (suspiciousChecks.length > 0) {
                checks.warnings.push(...suspiciousChecks);
                checks.riskLevel = 'medium';
            }
            
            // Rate limiting check
            if (!this.checkRateLimit('validateAddress')) {
                checks.errors.push('Rate limit exceeded for address validation');
                checks.passed = false;
                checks.riskLevel = 'high';
                return checks;
            }
            
            return checks;
            
        } catch (error) {
            checks.errors.push('Security validation failed');
            checks.passed = false;
            checks.riskLevel = 'high';
            return checks;
        }
    }
    
    isValidAddressFormat(address, walletType) {
        const sanitizedAddress = this.sanitizeWalletInput(address);
        
        switch (walletType) {
            case 'bitcoin':
                return window.bitcoinWallet?.validateAddress(sanitizedAddress).valid || false;
            case 'ethereum':
                return /^0x[a-fA-F0-9]{40}$/.test(sanitizedAddress);
            case 'solana':
                return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(sanitizedAddress);
            default:
                return false;
        }
    }
    
    checkMaliciousPatterns(address) {
        // Known malicious patterns or addresses (placeholder - in production use threat intelligence)
        const knownMaliciousPatterns = [
            // Example malicious Bitcoin addresses (these would come from threat intelligence)
            /^1111111111111111111114oLvT2$/, // Known scam address pattern
            /^bc1000000000000000000000000000/, // Suspicious pattern
        ];
        
        for (const pattern of knownMaliciousPatterns) {
            if (pattern.test(address)) {
                return {
                    isMalicious: true,
                    reason: 'Address matches known malicious pattern'
                };
            }
        }
        
        return { isMalicious: false };
    }
    
    checkSuspiciousCharacteristics(address, walletType) {
        const warnings = [];
        
        // Check for addresses with too many repeated characters
        const repeatedCharPattern = /(.)\1{6,}/; // 7+ consecutive identical characters
        if (repeatedCharPattern.test(address)) {
            warnings.push('Address contains unusual repeated character patterns');
        }
        
        // Check for addresses that look like they might be typos of common addresses
        if (walletType === 'bitcoin') {
            // Check for addresses starting with suspicious patterns
            if (address.startsWith('bc1000') || address.startsWith('111111')) {
                warnings.push('Address pattern looks potentially suspicious');
            }
        }
        
        // Check for very short or very long addresses (edge cases)
        if (walletType === 'bitcoin') {
            if (address.length < 26 || address.length > 90) {
                warnings.push('Address length is outside normal range');
            }
        }
        
        return warnings;
    }
    
    // ========================================
    // RATE LIMITING
    // ========================================
    
    checkRateLimit(operation) {
        const now = Date.now();
        const policy = this.securityPolicies.rateLimiting[operation];
        
        if (!policy) return true;
        
        if (!this.rateLimiters.has(operation)) {
            this.rateLimiters.set(operation, {
                attempts: [],
                lastReset: now
            });
        }
        
        const limiter = this.rateLimiters.get(operation);
        
        // Clean old attempts
        limiter.attempts = limiter.attempts.filter(
            timestamp => now - timestamp < policy.window
        );
        
        // Check if limit exceeded
        if (limiter.attempts.length >= policy.attempts) {
            this.logSecurityEvent('rateLimitExceeded', {
                operation: operation,
                attempts: limiter.attempts.length,
                window: policy.window
            });
            return false;
        }
        
        // Record this attempt
        limiter.attempts.push(now);
        return true;
    }
    
    // ========================================
    // STORAGE SECURITY
    // ========================================
    
    encryptSensitiveData(data, userAddress) {
        try {
            // Simple encryption using user address as salt (in production, use proper encryption)
            const jsonString = JSON.stringify(data);
            const encoded = btoa(jsonString); // Base64 encoding (NOT secure, use proper encryption)
            
            // Add checksum for integrity
            const checksum = this.calculateChecksum(encoded + userAddress);
            
            return {
                data: encoded,
                checksum: checksum,
                version: '1.0',
                encrypted: true
            };
            
        } catch (error) {
            console.error('❌ Encryption failed:', error);
            throw new Error('Failed to encrypt sensitive data');
        }
    }
    
    decryptSensitiveData(encryptedData, userAddress) {
        try {
            if (!encryptedData.encrypted) {
                return encryptedData.data; // Not encrypted
            }
            
            // Verify checksum
            const expectedChecksum = this.calculateChecksum(encryptedData.data + userAddress);
            if (encryptedData.checksum !== expectedChecksum) {
                throw new Error('Data integrity check failed');
            }
            
            // Decrypt (decode)
            const decoded = atob(encryptedData.data);
            return JSON.parse(decoded);
            
        } catch (error) {
            console.error('❌ Decryption failed:', error);
            throw new Error('Failed to decrypt sensitive data');
        }
    }
    
    calculateChecksum(data) {
        // Simple checksum (in production, use proper hashing like SHA-256)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }
    
    // ========================================
    // SESSION SECURITY
    // ========================================
    
    validateSession(sessionData) {
        if (!sessionData) return false;
        
        try {
            // Check session age
            const sessionAge = Date.now() - (sessionData.savedAt || 0);
            if (sessionAge > this.securityPolicies.sessionTimeout) {
                this.logSecurityEvent('sessionExpired', {
                    age: sessionAge,
                    maxAge: this.securityPolicies.sessionTimeout
                });
                return false;
            }
            
            // Validate required fields
            const requiredFields = ['account', 'isAuthenticated'];
            for (const field of requiredFields) {
                if (!sessionData[field]) {
                    return false;
                }
            }
            
            // Check for session tampering
            if (sessionData.account && typeof sessionData.account !== 'string') {
                return false;
            }
            
            if (sessionData.account && !this.isValidAddressFormat(sessionData.account, 'ethereum')) {
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Session validation failed:', error);
            return false;
        }
    }
    
    // ========================================
    // WALLET LIMITS & POLICIES
    // ========================================
    
    enforceWalletLimits(currentWallets) {
        const totalWallets = currentWallets.length;
        
        if (totalWallets >= this.securityPolicies.maxWalletsPerUser) {
            throw new Error(`Maximum wallet limit reached (${this.securityPolicies.maxWalletsPerUser})`);
        }
        
        // Check for duplicate addresses
        const addresses = new Set();
        const duplicates = [];
        
        for (const wallet of currentWallets) {
            const normalizedAddress = wallet.address.toLowerCase();
            if (addresses.has(normalizedAddress)) {
                duplicates.push(normalizedAddress);
            }
            addresses.add(normalizedAddress);
        }
        
        if (duplicates.length > 0) {
            throw new Error(`Duplicate wallet addresses detected: ${duplicates.join(', ')}`);
        }
        
        return true;
    }
    
    // ========================================
    // SECURITY LOGGING & MONITORING
    // ========================================
    
    logSecurityEvent(eventType, details = {}) {
        const event = {
            type: eventType,
            timestamp: new Date().toISOString(),
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.securityLog.push(event);
        
        // Keep only last 100 events to prevent memory bloat
        if (this.securityLog.length > 100) {
            this.securityLog = this.securityLog.slice(-100);
        }
        
        // Log to console for development
        console.warn('🛡️ Security Event:', event);
        
        // In production, send to security monitoring service
        // this.sendToSecurityService(event);
    }
    
    getSecurityLog() {
        return [...this.securityLog]; // Return copy
    }
    
    clearSecurityLog() {
        this.securityLog = [];
    }
    
    // ========================================
    // SECURITY RECOMMENDATIONS
    // ========================================
    
    getSecurityRecommendations() {
        return {
            userGuidelines: [
                'Always verify wallet addresses before adding them',
                'Use hardware wallets for storing large amounts',
                'Never share your private keys or seed phrases',
                'Double-check addresses when receiving payments',
                'Keep your browser and extensions updated',
                'Use strong, unique passwords for wallet accounts'
            ],
            developerGuidelines: [
                'Implement proper input validation for all user inputs',
                'Use HTTPS for all communications',
                'Regularly update dependencies and security libraries',
                'Implement rate limiting for sensitive operations',
                'Log security events for monitoring and analysis',
                'Use Content Security Policy (CSP) headers',
                'Validate all data from localStorage before using it'
            ],
            bestPractices: [
                'Primary wallet (ETH) handles authentication only',
                'Secondary wallets are for receiving payments only',
                'All address validation happens client-side',
                'No private keys are stored or transmitted',
                'Session data is encrypted and time-limited',
                'Rate limiting prevents abuse and spam'
            ]
        };
    }
    
    // ========================================
    // EMERGENCY PROCEDURES
    // ========================================
    
    emergencyCleanup() {
        try {
            // Clear rate limiters
            this.rateLimiters.clear();
            
            // Clear security log (keep only critical events)
            const criticalEvents = this.securityLog.filter(
                event => ['rateLimitExceeded', 'sessionExpired'].includes(event.type)
            );
            this.securityLog = criticalEvents;
            
            console.log('🧹 Emergency security cleanup completed');
            return true;
            
        } catch (error) {
            console.error('❌ Emergency cleanup failed:', error);
            return false;
        }
    }
    
    // ========================================
    // TESTING UTILITIES
    // ========================================
    
    runSecurityTests() {
        console.log('🧪 Running security tests...');
        
        const tests = [
            () => this.testInputSanitization(),
            () => this.testRateLimiting(),
            () => this.testAddressValidation(),
            () => this.testSessionValidation()
        ];
        
        let passed = 0;
        let total = tests.length;
        
        for (const test of tests) {
            try {
                if (test()) {
                    passed++;
                } else {
                    console.error('❌ Security test failed');
                }
            } catch (error) {
                console.error('❌ Security test error:', error);
            }
        }
        
        console.log(`🧪 Security tests completed: ${passed}/${total} passed`);
        return { passed, total, success: passed === total };
    }
    
    testInputSanitization() {
        const maliciousInputs = [
            '<script>alert("xss")</script>',
            'javascript:alert(1)',
            '\x00\x01\x02',
            'a'.repeat(300)
        ];
        
        for (const input of maliciousInputs) {
            try {
                const sanitized = this.sanitizeWalletInput(input);
                if (sanitized.includes('<script>') || sanitized.includes('javascript:')) {
                    return false;
                }
            } catch (error) {
                // Expected for malicious inputs
            }
        }
        
        return true;
    }
    
    testRateLimiting() {
        // Test rate limiting
        for (let i = 0; i < 25; i++) {
            const allowed = this.checkRateLimit('validateAddress');
            if (i < 20 && !allowed) return false; // Should allow first 20
            if (i >= 20 && allowed) return false; // Should block after 20
        }
        return true;
    }
    
    testAddressValidation() {
        const testCases = [
            { address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', type: 'bitcoin', shouldPass: true },
            { address: '0x742d35Cc6634C0532925a3b8D73C018DC98B96CE', type: 'ethereum', shouldPass: true },
            { address: 'invalid-address', type: 'bitcoin', shouldPass: false },
            { address: '<script>', type: 'bitcoin', shouldPass: false }
        ];
        
        for (const testCase of testCases) {
            try {
                const result = this.isValidAddressFormat(testCase.address, testCase.type);
                if (result !== testCase.shouldPass) {
                    return false;
                }
            } catch (error) {
                if (testCase.shouldPass) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    testSessionValidation() {
        const validSession = {
            account: '0x742d35Cc6634C0532925a3b8D73C018DC98B96CE',
            isAuthenticated: true,
            savedAt: Date.now()
        };
        
        const invalidSession = {
            account: 'invalid',
            isAuthenticated: true,
            savedAt: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days old
        };
        
        return this.validateSession(validSession) && !this.validateSession(invalidSession);
    }
}

// Export for global use
window.MultiWalletSecurity = MultiWalletSecurity;

// Create global instance
window.multiWalletSecurity = new MultiWalletSecurity();

console.log('🛡️ Multi-Wallet Security Module loaded');