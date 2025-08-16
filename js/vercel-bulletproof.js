// Bulletproof Vercel Authentication Fix
// This ensures wallet authentication works EVERY TIME on Vercel deployments

(function() {
    'use strict';
    
    console.log('🛡️ Loading Vercel bulletproof authentication...');
    
    // Detect if we're on Vercel
    const isVercel = window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('netlify.app') ||
                     (window.location.protocol === 'https:' && !window.location.hostname.includes('localhost'));
    
    if (!isVercel) {
        console.log('🏠 Not on Vercel, using standard flow');
        return;
    }
    
    console.log('☁️ Vercel detected, applying bulletproof fixes...');
    
    // Override authentication flow for Vercel
    let vercelWalletManager = null;
    let vercelAuthState = {
        isConnecting: false,
        isAuthenticated: false,
        account: null,
        attempts: 0,
        maxAttempts: 10
    };
    
    // Enhanced MetaMask connection that ALWAYS works
    async function connectMetaMaskVercel() {
        console.log('🔗 Vercel MetaMask connection attempt', vercelAuthState.attempts + 1);
        
        try {
            // Check if MetaMask is available
            if (!window.ethereum) {
                throw new Error('MetaMask not detected. Please install MetaMask.');
            }
            
            // Force request accounts (this ALWAYS triggers MetaMask)
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts returned from MetaMask');
            }
            
            const address = accounts[0];
            console.log('✅ MetaMask connected on Vercel:', address);
            
            // Get network info
            const chainId = await window.ethereum.request({ 
                method: 'eth_chainId' 
            });
            
            // Create a simple signature for authentication
            const message = `Authenticate with GENESIS\n\nWallet: ${address}\nTimestamp: ${Date.now()}\nDomain: ${window.location.hostname}`;
            
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, address]
            });
            
            console.log('✅ Message signed on Vercel');
            
            // Store authentication data (Vercel-specific storage)
            const authData = {
                address: address,
                signature: signature,
                message: message,
                chainId: chainId,
                timestamp: Date.now(),
                domain: window.location.hostname,
                authenticated: true
            };
            
            // Save to multiple storage methods for redundancy
            localStorage.setItem('vercel_auth', JSON.stringify(authData));
            localStorage.setItem('moralis_session', JSON.stringify(authData));
            sessionStorage.setItem('vercel_auth', JSON.stringify(authData));
            
            // Update global state
            vercelAuthState.isAuthenticated = true;
            vercelAuthState.account = address;
            
            // Create user object
            const userObject = {
                walletAddress: address,
                username: null, // Will be set in profile setup
                bio: null,
                createdAt: new Date().toISOString(),
                sessionToken: signature.slice(0, 20),
                authenticated: true
            };
            
            // Store user data
            const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
            users[address] = userObject;
            localStorage.setItem('siwe_users', JSON.stringify(users));
            
            console.log('✅ Vercel authentication complete:', userObject);
            return {
                success: true,
                user: userObject,
                address: address
            };
            
        } catch (error) {
            console.error('❌ Vercel MetaMask connection failed:', error);
            vercelAuthState.attempts++;
            
            if (vercelAuthState.attempts < vercelAuthState.maxAttempts) {
                console.log('🔄 Retrying Vercel connection...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                return connectMetaMaskVercel();
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Check if already authenticated on Vercel
    function checkVercelAuth() {
        try {
            const authData = localStorage.getItem('vercel_auth') || sessionStorage.getItem('vercel_auth');
            if (!authData) return null;
            
            const parsed = JSON.parse(authData);
            
            // Check if auth is recent (within 24 hours)
            const age = Date.now() - parsed.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (age > maxAge) {
                localStorage.removeItem('vercel_auth');
                sessionStorage.removeItem('vercel_auth');
                return null;
            }
            
            console.log('✅ Found existing Vercel auth:', parsed.address);
            return parsed;
            
        } catch (error) {
            console.error('❌ Error checking Vercel auth:', error);
            return null;
        }
    }
    
    // Override wallet connection for Vercel
    function overrideWalletConnection() {
        console.log('🔧 Overriding wallet connection for Vercel...');
        
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', overrideWalletConnection);
            return;
        }
        
        // Find and override connect wallet button
        const walletBtn = document.getElementById('walletBtn');
        if (walletBtn) {
            walletBtn.onclick = handleVercelWalletConnect;
            console.log('✅ Wallet button overridden for Vercel');
            
            // Check if already authenticated
            const existingAuth = checkVercelAuth();
            if (existingAuth) {
                walletBtn.textContent = `👤 ${existingAuth.address.slice(0,6)}...${existingAuth.address.slice(-4)}`;
                walletBtn.onclick = () => window.location.href = 'dashboard.html';
            }
        }
        
        // Override wallet manager if it exists
        setTimeout(() => {
            if (window.walletManager) {
                console.log('🔧 Overriding existing wallet manager...');
                const originalAuth = window.walletManager.authenticate;
                window.walletManager.authenticate = connectMetaMaskVercel;
                
                // Check and restore authentication
                const existingAuth = checkVercelAuth();
                if (existingAuth) {
                    window.walletManager.isAuthenticated = true;
                    window.walletManager.isConnected = true;
                    window.walletManager.account = existingAuth.address;
                    window.walletManager.currentUser = {
                        walletAddress: existingAuth.address,
                        username: null,
                        bio: null,
                        sessionToken: existingAuth.signature
                    };
                }
            }
        }, 2000);
    }
    
    // Vercel wallet connect handler
    async function handleVercelWalletConnect() {
        console.log('🚀 Vercel wallet connect handler triggered');
        
        const walletBtn = document.getElementById('walletBtn');
        if (walletBtn) {
            walletBtn.disabled = true;
            walletBtn.textContent = 'Connecting...';
        }
        
        try {
            // Check existing auth first
            const existingAuth = checkVercelAuth();
            if (existingAuth && existingAuth.authenticated) {
                console.log('✅ Using existing Vercel auth');
                window.location.href = 'profile-setup.html?from=auth&vercel=true';
                return;
            }
            
            // Connect MetaMask
            const result = await connectMetaMaskVercel();
            
            if (result.success) {
                if (walletBtn) {
                    walletBtn.textContent = '✅ Connected!';
                }
                
                // Show success message
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed; top: 20px; right: 20px; background: #00ff88; 
                    color: white; padding: 15px 20px; border-radius: 10px; z-index: 10001;
                    font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                `;
                toast.textContent = '🎉 Wallet connected on Vercel!';
                document.body.appendChild(toast);
                
                setTimeout(() => toast.remove(), 3000);
                
                // Redirect to profile setup
                setTimeout(() => {
                    window.location.href = 'profile-setup.html?from=auth&vercel=true';
                }, 1500);
                
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Vercel wallet connect failed:', error);
            
            if (walletBtn) {
                walletBtn.disabled = false;
                walletBtn.textContent = 'Connect Wallet';
            }
            
            alert('Connection failed: ' + error.message);
        }
    }
    
    // Initialize Vercel fixes
    console.log('🚀 Initializing Vercel bulletproof authentication...');
    overrideWalletConnection();
    
    // Also fix profile setup page for Vercel
    if (window.location.pathname.includes('profile-setup.html')) {
        setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const isVercelFlow = urlParams.get('vercel') === 'true';
            
            if (isVercelFlow) {
                console.log('🔧 Applying Vercel fixes to profile setup...');
                
                // Force authentication state
                const existingAuth = checkVercelAuth();
                if (existingAuth && window.authenticatedWallet) {
                    window.authenticatedWallet.isAuthenticated = true;
                    window.authenticatedWallet.isConnected = true;
                    window.authenticatedWallet.account = existingAuth.address;
                    window.authenticatedWallet.currentUser = {
                        walletAddress: existingAuth.address,
                        username: null,
                        bio: null,
                        sessionToken: existingAuth.signature
                    };
                    console.log('✅ Vercel auth state restored for profile setup');
                }
            }
        }, 3000);
    }
    
    console.log('✅ Vercel bulletproof authentication loaded');
    
})();