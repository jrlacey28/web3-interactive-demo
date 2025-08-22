// GENESIS Wallet System - Complete End-to-End Solution
// This handles: wallet connection, profile creation, data persistence, and navigation

class GenesisWalletSystem {
    constructor() {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.account = null;
        this.username = null;
        this.currentUser = null;
        this.sessionData = null;
        this.multiWalletManager = null;
        
        console.log('🚀 Initializing GENESIS Wallet System...');
        this.initialize();
    }
    
    async initialize() {
        // Check for existing session on load
        await this.restoreSession();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize multi-wallet system
        await this.initializeMultiWalletSystem();
        
        console.log('✅ GENESIS Wallet System ready');
    }
    
    // ========================================
    // MULTI-WALLET SYSTEM INTEGRATION
    // ========================================
    
    async initializeMultiWalletSystem() {
        try {
            // Wait for multi-wallet manager to be available
            let attempts = 0;
            while (!window.MultiWalletManager && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (window.MultiWalletManager) {
                this.multiWalletManager = new window.MultiWalletManager();
                await this.multiWalletManager.initialize(this);
                
                // If authenticated, set up primary wallet
                if (this.isAuthenticated && this.account) {
                    this.multiWalletManager.setPrimaryWallet(this.account);
                }
                
                // Make available globally
                window.multiWalletManager = this.multiWalletManager;
                
                console.log('✅ Multi-wallet system initialized');
            } else {
                console.warn('⚠️ Multi-wallet system not available');
            }
        } catch (error) {
            console.error('❌ Multi-wallet initialization failed:', error);
        }
    }
    
    // ========================================
    // WALLET CONNECTION
    // ========================================
    async connect() {
        try {
            console.log('🔗 Starting wallet connection...');
            
            if (!window.ethereum) {
                throw new Error('MetaMask not detected. Please install MetaMask.');
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
            const message = `Welcome to GENESIS!\\n\\nSign this message to authenticate.\\n\\nWallet: ${address}\\nTimestamp: ${Date.now()}`;
            
            // Sign the message
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, address]
            });
            
            console.log('✅ Message signed successfully');
            
            // Create session
            this.account = address;
            this.isConnected = true;
            this.isAuthenticated = true;
            
            // Check for existing user profile
            const existingProfile = this.getUserProfile(address);
            
            this.sessionData = {
                address: address,
                signature: signature,
                message: message,
                chainId: chainId,
                timestamp: Date.now(),
                authenticated: true
            };
            
            if (existingProfile) {
                // User already has a profile
                this.username = existingProfile.username;
                this.currentUser = existingProfile;
                this.sessionData.username = existingProfile.username;
                
                console.log('✅ Existing profile loaded:', existingProfile.username);
            } else {
                console.log('ℹ️ No existing profile found');
            }
            
            // Set up primary wallet in multi-wallet system
            if (this.multiWalletManager) {
                this.multiWalletManager.setPrimaryWallet(address);
            }
            
            // Save session
            this.saveSession();
            
            return {
                success: true,
                address: address,
                username: this.username,
                hasProfile: !!existingProfile
            };
            
        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // ========================================
    // PROFILE MANAGEMENT
    // ========================================
    createProfile(profileData) {
        try {
            if (!this.isAuthenticated || !this.account) {
                throw new Error('Wallet not authenticated');
            }
            
            console.log('👤 Creating user profile:', profileData);
            
            // Create complete user profile
            const userProfile = {
                id: `user_${Date.now()}`,
                walletAddress: this.account,
                username: profileData.username,
                displayName: profileData.username,
                bio: profileData.bio || '',
                profileImage: profileData.profileImage || null,
                theme: profileData.theme || 'dark',
                notifications: profileData.notifications !== false,
                analytics: profileData.analytics !== false,
                isVerified: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                worlds: [],
                stats: {
                    worldsCreated: 0,
                    totalViews: 0,
                    totalTips: 0
                }
            };
            
            // Save to database (localStorage for now)
            const users = JSON.parse(localStorage.getItem('genesis_users') || '{}');
            users[this.account] = userProfile;
            localStorage.setItem('genesis_users', JSON.stringify(users));
            
            // Also save in old format for compatibility
            const siweUsers = JSON.parse(localStorage.getItem('siwe_users') || '{}');
            siweUsers[this.account] = userProfile;
            localStorage.setItem('siwe_users', JSON.stringify(siweUsers));
            
            // Update current user
            this.username = profileData.username;
            this.currentUser = userProfile;
            this.sessionData.username = profileData.username;
            
            // Update session
            this.saveSession();
            
            console.log('✅ Profile created successfully:', userProfile);
            
            return {
                success: true,
                user: userProfile
            };
            
        } catch (error) {
            console.error('❌ Profile creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    updateProfile(updates) {
        try {
            if (!this.currentUser) {
                throw new Error('No current user found');
            }
            
            console.log('📝 Updating profile:', updates);
            
            // Update current user object
            const updatedUser = {
                ...this.currentUser,
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            // Save to database
            const users = JSON.parse(localStorage.getItem('genesis_users') || '{}');
            users[this.account] = updatedUser;
            localStorage.setItem('genesis_users', JSON.stringify(users));
            
            // Also update compatibility format
            const siweUsers = JSON.parse(localStorage.getItem('siwe_users') || '{}');
            siweUsers[this.account] = updatedUser;
            localStorage.setItem('siwe_users', JSON.stringify(siweUsers));
            
            // Update current user and session
            this.currentUser = updatedUser;
            this.username = updatedUser.username;
            this.sessionData.username = updatedUser.username;
            this.saveSession();
            
            console.log('✅ Profile updated successfully');
            
            return {
                success: true,
                user: updatedUser
            };
            
        } catch (error) {
            console.error('❌ Profile update failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    getUserProfile(walletAddress = null) {
        const address = walletAddress || this.account;
        if (!address) return null;
        
        // Try new format first
        const users = JSON.parse(localStorage.getItem('genesis_users') || '{}');
        if (users[address]) {
            return users[address];
        }
        
        // Fallback to old format
        const siweUsers = JSON.parse(localStorage.getItem('siwe_users') || '{}');
        return siweUsers[address] || null;
    }
    
    // ========================================
    // SESSION MANAGEMENT
    // ========================================
    saveSession() {
        const session = {
            ...this.sessionData,
            isConnected: this.isConnected,
            isAuthenticated: this.isAuthenticated,
            account: this.account,
            username: this.username,
            currentUser: this.currentUser,
            savedAt: Date.now()
        };
        
        // Save to multiple locations for redundancy
        localStorage.setItem('genesis_session', JSON.stringify(session));
        sessionStorage.setItem('genesis_session', JSON.stringify(session));
        
        console.log('💾 Session saved');
    }
    
    async restoreSession() {
        try {
            // Try to restore from storage
            const sessionData = localStorage.getItem('genesis_session') || 
                               sessionStorage.getItem('genesis_session');
            
            if (!sessionData) {
                console.log('ℹ️ No existing session found');
                return false;
            }
            
            const session = JSON.parse(sessionData);
            
            // Check if session is recent (within 7 days)
            const age = Date.now() - (session.savedAt || 0);
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (age > maxAge) {
                console.log('⏰ Session expired');
                this.clearSession();
                return false;
            }
            
            // Restore session
            this.isConnected = session.isConnected;
            this.isAuthenticated = session.isAuthenticated;
            this.account = session.account;
            this.username = session.username;
            this.currentUser = session.currentUser;
            this.sessionData = session;
            
            // If currentUser is missing but we have account, try to load user data
            if (!this.currentUser && this.account) {
                this.currentUser = this.getUserProfile(this.account);
                if (this.currentUser) {
                    this.username = this.currentUser.username;
                    console.log('📋 Loaded user profile from storage:', this.currentUser);
                }
            }
            
            console.log('✅ Session restored:', this.account);
            return true;
            
        } catch (error) {
            console.error('❌ Session restoration failed:', error);
            this.clearSession();
            return false;
        }
    }
    
    clearSession() {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.account = null;
        this.username = null;
        this.currentUser = null;
        this.sessionData = null;
        
        localStorage.removeItem('genesis_session');
        sessionStorage.removeItem('genesis_session');
        
        console.log('🧹 Session cleared');
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    getCurrentUser() {
        return this.currentUser ? {
            ...this.currentUser,
            walletAddress: this.account,
            sessionToken: this.sessionData?.signature
        } : null;
    }
    
    getShortAddress() {
        return this.account ? `${this.account.slice(0, 6)}...${this.account.slice(-4)}` : '';
    }
    
    // ========================================
    // EVENT HANDLERS
    // ========================================
    setupEventListeners() {
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    console.log('👋 MetaMask disconnected');
                    this.clearSession();
                    window.location.reload();
                } else if (accounts[0] !== this.account) {
                    console.log('🔄 Account changed');
                    this.clearSession();
                    window.location.reload();
                }
            });
        }
    }
    
    // ========================================
    // NAVIGATION HELPERS
    // ========================================
    requireAuth() {
        if (!this.isAuthenticated) {
            console.log('🔐 Authentication required, redirecting to home');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
    
    requireProfile() {
        if (!this.requireAuth()) return false;
        
        if (!this.username) {
            console.log('👤 Profile required, redirecting to profile setup');
            window.location.href = 'profile-setup.html?from=auth';
            return false;
        }
        return true;
    }
}

// Create global instance
window.genesis = new GenesisWalletSystem();

// Backward compatibility
window.persistentWallet = window.genesis;
window.walletManager = window.genesis;

console.log('🌟 GENESIS Wallet System loaded');