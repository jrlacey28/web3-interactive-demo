// Environment Detection and Configuration
// Automatically detects if running on localhost vs production and adjusts behavior

window.GENESIS_ENV = {
    // Detect environment
    isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isVercel: window.location.hostname.includes('vercel.app'),
    isProduction: window.location.protocol === 'https:' && !window.location.hostname.includes('localhost'),
    
    // Configuration based on environment
    get config() {
        return {
            // Session timeout (longer for production to handle network delays)
            sessionTimeout: this.isLocalhost ? 2000 : 5000,
            
            // Authentication retry attempts
            authRetries: this.isLocalhost ? 3 : 8,
            
            // Wallet connection timeout
            walletTimeout: this.isLocalhost ? 10000 : 20000,
            
            // Debug logging
            debug: this.isLocalhost,
            
            // Storage keys (domain-specific to avoid conflicts)
            storagePrefix: this.isLocalhost ? 'local_' : 'prod_',
            
            // Moralis settings
            moralis: {
                retries: this.isLocalhost ? 2 : 5,
                timeout: this.isLocalhost ? 5000 : 15000
            }
        };
    },
    
    // Logging helper
    log: function(message, ...args) {
        if (this.config.debug) {
            console.log(`[${this.isLocalhost ? 'LOCAL' : 'PROD'}] ${message}`, ...args);
        }
    },
    
    // Error reporting
    error: function(message, error) {
        console.error(`[${this.isLocalhost ? 'LOCAL' : 'PROD'}] ${message}`, error);
        
        // In production, you might want to send to error tracking service
        if (this.isProduction) {
            // Example: Sentry, LogRocket, etc.
            // window.Sentry?.captureException(error);
        }
    }
};

// Initialize environment-specific settings
document.addEventListener('DOMContentLoaded', () => {
    const env = window.GENESIS_ENV;
    env.log('Environment detected:', {
        isLocalhost: env.isLocalhost,
        isVercel: env.isVercel,
        isProduction: env.isProduction,
        hostname: window.location.hostname,
        config: env.config
    });
    
    // Set up global error handling for production
    if (env.isProduction) {
        window.addEventListener('error', (event) => {
            env.error('Global error:', event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            env.error('Unhandled promise rejection:', event.reason);
        });
    }
});

// Export for use in other modules
window.ENV = window.GENESIS_ENV;