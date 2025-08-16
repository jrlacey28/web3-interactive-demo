// Persistent Wallet Session Manager
// Ensures wallet stays connected across ALL pages until manual disconnect

(function() {
    'use strict';
    
    console.log('🔗 Loading Persistent Wallet Manager...');
    
    // Global wallet state that persists across pages
    window.WALLET_STATE = {
        isConnected: false,
        isAuthenticated: false,
        account: null,
        username: null,
        signature: null,
        sessionData: null,
        lastUpdate: null
    };
    
    // Session storage keys
    const SESSION_KEY = 'genesis_wallet_session';
    const AUTH_KEY = 'genesis_auth_data';
    const USER_KEY = 'genesis_user_data';
    
    // Save session to multiple storage locations for redundancy
    function saveSession(sessionData) {
        try {
            const timestamp = Date.now();
            const session = {
                ...sessionData,
                timestamp: timestamp,
                domain: window.location.hostname,
                version: '1.0.0'
            };
            
            // Save to multiple locations
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
            localStorage.setItem(AUTH_KEY, JSON.stringify(session));
            
            // Update global state
            window.WALLET_STATE = {
                isConnected: true,
                isAuthenticated: true,
                account: session.address,
                username: session.username || null,
                signature: session.signature,
                sessionData: session,
                lastUpdate: timestamp
            };
            
            console.log('💾 Session saved to all storage locations:', session.address);
            
            // Broadcast to other tabs/windows
            localStorage.setItem('wallet_broadcast', JSON.stringify({
                type: 'wallet_connected',
                data: session,
                timestamp: timestamp
            }));
            
        } catch (error) {
            console.error('❌ Failed to save session:', error);
        }
    }
    
    // Load session from storage (checks all locations)
    function loadSession() {
        try {
            // Check all storage locations
            const sources = [
                localStorage.getItem(SESSION_KEY),
                sessionStorage.getItem(SESSION_KEY),
                localStorage.getItem(AUTH_KEY),
                localStorage.getItem('vercel_auth'),
                localStorage.getItem('moralis_session')
            ];
            
            for (const source of sources) {
                if (!source) continue;
                
                try {
                    const session = JSON.parse(source);
                    
                    // Validate session
                    if (session && session.address && session.authenticated !== false) {
                        // Check if session is not too old (7 days max)
                        const age = Date.now() - (session.timestamp || 0);
                        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                        
                        if (age < maxAge) {
                            console.log('✅ Valid session loaded from storage:', session.address);
                            
                            // Update global state
                            window.WALLET_STATE = {
                                isConnected: true,
                                isAuthenticated: true,
                                account: session.address,
                                username: session.username || null,
                                signature: session.signature,
                                sessionData: session,
                                lastUpdate: Date.now()
                            };
                            
                            return session;
                        } else {
                            console.log('⏰ Session expired, will need to reconnect');
                        }
                    }
                } catch (parseError) {
                    // Skip invalid JSON
                    continue;
                }
            }
            
            console.log('❌ No valid session found in storage');
            return null;
            
        } catch (error) {
            console.error('❌ Failed to load session:', error);
            return null;
        }
    }
    
    // Clear all session data
    function clearSession() {
        try {
            // Clear all storage locations
            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem('vercel_auth');
            localStorage.removeItem('moralis_session');
            
            // Reset global state
            window.WALLET_STATE = {
                isConnected: false,
                isAuthenticated: false,
                account: null,
                username: null,
                signature: null,
                sessionData: null,
                lastUpdate: Date.now()
            };
            
            console.log('🧹 All session data cleared');
            
            // Broadcast disconnect to other tabs
            localStorage.setItem('wallet_broadcast', JSON.stringify({
                type: 'wallet_disconnected',
                timestamp: Date.now()
            }));
            
        } catch (error) {
            console.error('❌ Failed to clear session:', error);
        }
    }
    
    // Connect wallet with MetaMask
    async function connectWallet() {
        try {
            console.log('🔗 Starting wallet connection...');
            
            // Check if MetaMask is available
            if (!window.ethereum) {
                throw new Error('MetaMask not detected. Please install MetaMask to continue.');
            }
            
            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found. Please connect your MetaMask wallet.');
            }
            
            const address = accounts[0];
            console.log('✅ MetaMask connected:', address);
            
            // Get chain info
            const chainId = await window.ethereum.request({ 
                method: 'eth_chainId' 
            });
            
            // Create authentication message
            const message = `Welcome to GENESIS!\n\nSign this message to authenticate your wallet.\n\nWallet: ${address}\nTimestamp: ${Date.now()}\nDomain: ${window.location.hostname}`;
            
            // Sign the message
            console.log('✍️ Requesting signature...');
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, address]
            });
            
            console.log('✅ Message signed successfully');
            
            // Check for existing user data - prioritize jordan profile
            const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
            let existingUser = users[address] || {};
            
            // Special case: if this wallet should be associated with jordan
            // Check if jordan profile exists and should be linked to this wallet
            const jordanProfile = Object.values(users).find(user => user.username === 'jordan');
            if (jordanProfile && !existingUser.username) {
                // Link this wallet to jordan's existing profile
                existingUser = {
                    ...jordanProfile,
                    walletAddress: address
                };
                users[address] = existingUser;
                localStorage.setItem('siwe_users', JSON.stringify(users));
                console.log('\u2705 Linked wallet to existing jordan profile');
            }
            
            // Create session data
            const sessionData = {
                address: address,
                signature: signature,
                message: message,
                chainId: chainId,
                username: existingUser.username || null,
                bio: existingUser.bio || null,
                displayName: existingUser.displayName || existingUser.username || null,
                createdAt: existingUser.createdAt || new Date().toISOString(),
                authenticated: true,
                timestamp: Date.now()
            };
            
            // Save session
            saveSession(sessionData);
            
            console.log('✅ Wallet connection complete:', address);
            
            return {
                success: true,
                address: address,
                username: sessionData.username,
                sessionData: sessionData
            };
            
        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Initialize persistent wallet manager
    function initializePersistentWallet() {
        console.log('🚀 Initializing Persistent Wallet Manager...');
        
        // Load existing session
        const existingSession = loadSession();
        
        // Set up cross-tab communication
        window.addEventListener('storage', (event) => {
            if (event.key === 'wallet_broadcast') {
                try {
                    const broadcast = JSON.parse(event.newValue);
                    if (broadcast.type === 'wallet_disconnected') {
                        console.log('📢 Received disconnect broadcast from another tab');
                        clearSession();
                        // Refresh page to update UI
                        window.location.reload();
                    } else if (broadcast.type === 'wallet_connected') {
                        console.log('📢 Received connect broadcast from another tab');
                        loadSession(); // Reload session
                    }
                } catch (error) {
                    // Ignore invalid broadcasts
                }
            }
        });
        
        // Create global wallet manager that all pages can use
        window.persistentWallet = {
            // State getters
            get isConnected() { return window.WALLET_STATE.isConnected; },
            get isAuthenticated() { return window.WALLET_STATE.isAuthenticated; },
            get account() { return window.WALLET_STATE.account; },
            get username() { return window.WALLET_STATE.username; },
            
            // Methods
            connect: connectWallet,
            disconnect: clearSession,
            getSession: () => window.WALLET_STATE.sessionData,
            getCurrentUser: () => ({
                walletAddress: window.WALLET_STATE.account,
                username: window.WALLET_STATE.username,
                sessionToken: window.WALLET_STATE.signature
            }),
            getShortAddress: () => {
                const addr = window.WALLET_STATE.account;
                return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
            },
            
            // Update user profile
            updateUser: (userData) => {
                if (window.WALLET_STATE.sessionData) {
                    const updated = {
                        ...window.WALLET_STATE.sessionData,
                        username: userData.username || window.WALLET_STATE.username,
                        bio: userData.bio,
                        displayName: userData.displayName || userData.username
                    };
                    saveSession(updated);
                    
                    // Also update siwe_users storage
                    const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
                    users[window.WALLET_STATE.account] = {
                        ...users[window.WALLET_STATE.account],
                        ...userData,
                        walletAddress: window.WALLET_STATE.account,
                        updatedAt: new Date().toISOString()
                    };
                    localStorage.setItem('siwe_users', JSON.stringify(users));
                    
                    // Update global state with new username
                    window.WALLET_STATE.username = userData.username || window.WALLET_STATE.username;
                }
            },
            
            // Force refresh session from storage
            refresh: loadSession
        };
        
        // Make it available globally (for backward compatibility)
        window.walletManager = window.persistentWallet;
        
        // Initialize UI if wallet is connected
        if (window.WALLET_STATE.isConnected) {
            console.log('✅ Persistent session restored:', window.WALLET_STATE.account);
            updateWalletUI();
        }
        
        console.log('✅ Persistent Wallet Manager ready');
    }
    
    // Update wallet UI across all pages
    function updateWalletUI() {
        try {
            const walletBtn = document.getElementById('walletBtn');
            if (walletBtn && window.WALLET_STATE.isConnected) {
                const displayName = window.WALLET_STATE.username || 
                                 window.persistentWallet.getShortAddress();
                
                walletBtn.textContent = `👤 ${displayName}`;
                walletBtn.onclick = () => {
                    // If has username, go to dashboard; otherwise go to profile setup
                    if (window.WALLET_STATE.username) {
                        window.location.href = 'dashboard.html';
                    } else {
                        window.location.href = 'profile-setup.html?from=auth';
                    }
                };
            }
        } catch (error) {
            console.error('❌ Failed to update wallet UI:', error);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePersistentWallet);
    } else {
        initializePersistentWallet();
    }
    
    // Also initialize immediately for dynamic content
    setTimeout(initializePersistentWallet, 100);
    
})();