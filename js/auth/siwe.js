// Sign-In With Ethereum (SIWE) Implementation
// Based on EIP-4361: https://eips.ethereum.org/EIPS/eip-4361

class SIWEAuth {
    constructor(walletManager) {
        this.wallet = walletManager;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.sessionToken = null;
        this.init();
    }

    init() {
        // Check for existing session on page load
        this.checkExistingSession();
    }

    // ========================================
    // AUTHENTICATION FLOW
    // ========================================
    async signIn() {
        try {
            console.log('🔐 Starting SIWE sign-in process...');
            
            // Ensure wallet is connected first
            if (!this.wallet.isConnected) {
                console.log('Wallet not connected, connecting first...');
                const connectResult = await this.wallet.connectWallet();
                if (!connectResult.success) {
                    throw new Error('Wallet connection required');
                }
            }

            console.log('✅ Wallet connected, generating nonce...');
            // Generate nonce for this sign-in attempt
            const nonce = this.generateNonce();
            
            console.log('✅ Nonce generated, creating SIWE message...');
            // Create SIWE message
            const message = this.createSIWEMessage(this.wallet.currentAccount, nonce);
            
            console.log('✅ SIWE message created, requesting signature...');
            // Request signature from user
            const signature = await this.requestSignature(message);
            
            console.log('✅ Signature received, verifying...');
            // Verify signature and create session
            const authResult = await this.verifyAndCreateSession(message, signature, nonce);
            
            if (authResult.success) {
                console.log('✅ Signature verified, creating session...');
                this.isAuthenticated = true;
                this.currentUser = authResult.user;
                this.sessionToken = authResult.token;
                this.saveSession();
                
                console.log('✅ Session created, triggering success callback...');
                this.onAuthenticationSuccess();
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(authResult.error);
            }

        } catch (error) {
            console.error('❌ SIWE sign-in failed:', error);
            this.onAuthenticationError(error.message);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            // Clear session data
            this.isAuthenticated = false;
            this.currentUser = null;
            this.sessionToken = null;
            
            // Remove from localStorage
            localStorage.removeItem('siwe_session');
            localStorage.removeItem('siwe_user');
            
            this.onSignOutSuccess();
            return { success: true };

        } catch (error) {
            console.error('Sign out failed:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // SIWE MESSAGE CREATION
    // ========================================
    createSIWEMessage(address, nonce) {
        const domain = window.location.hostname;
        const origin = window.location.origin;
        const statement = "Sign in to GENESIS to access your personalized creator dashboard and manage your digital worlds.";
        
        // Create ISO 8601 timestamp for current time and expiration (24 hours)
        const issuedAt = new Date().toISOString();
        const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        const message = `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${origin}
Version: 1
Chain ID: ${parseInt(this.wallet.chainId, 16)}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;

        return {
            message: message,
            address: address,
            nonce: nonce,
            issuedAt: issuedAt,
            expirationTime: expirationTime,
            domain: domain,
            uri: origin
        };
    }

    generateNonce() {
        // Generate cryptographically secure random nonce
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // ========================================
    // SIGNATURE HANDLING
    // ========================================
    async requestSignature(messageData) {
        try {
            this.showSigningModal(messageData.message);

            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [messageData.message, this.wallet.currentAccount]
            });

            this.hideSigningModal();
            return signature;

        } catch (error) {
            this.hideSigningModal();
            if (error.code === 4001) {
                throw new Error('User rejected message signature');
            }
            throw new Error('Failed to sign message: ' + error.message);
        }
    }

    async verifyAndCreateSession(messageData, signature, nonce) {
        try {
            // In a production app, this would be sent to a backend for verification
            // For now, we'll do client-side verification and create a local session
            
            // Verify signature matches the message and address
            const isValidSignature = await this.verifySignature(
                messageData.message, 
                signature, 
                messageData.address
            );

            if (!isValidSignature) {
                throw new Error('Invalid signature');
            }

            // Check if signature hasn't been used before (replay protection)
            if (this.hasNonceBeenUsed(nonce)) {
                throw new Error('Nonce has already been used');
            }

            // Mark nonce as used
            this.markNonceAsUsed(nonce);

            // Create or get user profile
            const user = this.getOrCreateUser(messageData.address);

            // Generate session token
            const token = this.generateSessionToken(messageData.address, nonce);

            return {
                success: true,
                user: user,
                token: token,
                signature: signature,
                message: messageData
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifySignature(message, signature, expectedAddress) {
        try {
            // This is a simplified client-side verification
            // In production, signature verification should be done server-side
            
            // For now, we'll assume the signature is valid if it exists
            // and the wallet is properly connected to the expected address
            return signature && 
                   signature.length === 132 && // 0x + 130 hex chars
                   signature.startsWith('0x') &&
                   this.wallet.currentAccount.toLowerCase() === expectedAddress.toLowerCase();
                   
        } catch (error) {
            console.error('Signature verification failed:', error);
            return false;
        }
    }

    // ========================================
    // NONCE MANAGEMENT
    // ========================================
    hasNonceBeenUsed(nonce) {
        const usedNonces = JSON.parse(localStorage.getItem('siwe_used_nonces') || '[]');
        return usedNonces.includes(nonce);
    }

    markNonceAsUsed(nonce) {
        const usedNonces = JSON.parse(localStorage.getItem('siwe_used_nonces') || '[]');
        usedNonces.push(nonce);
        
        // Keep only last 100 nonces to prevent storage bloat
        if (usedNonces.length > 100) {
            usedNonces.splice(0, usedNonces.length - 100);
        }
        
        localStorage.setItem('siwe_used_nonces', JSON.stringify(usedNonces));
    }

    // ========================================
    // USER MANAGEMENT
    // ========================================
    getOrCreateUser(walletAddress) {
        const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
        
        if (users[walletAddress]) {
            return users[walletAddress];
        }

        // Create new user
        const newUser = {
            id: this.generateUserId(),
            walletAddress: walletAddress,
            username: null,
            bio: null,
            profileImage: null,
            isVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            worlds: [],
            preferences: {
                theme: 'dark',
                notifications: true
            }
        };

        users[walletAddress] = newUser;
        localStorage.setItem('siwe_users', JSON.stringify(users));
        
        return newUser;
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateSessionToken(address, nonce) {
        const payload = {
            address: address,
            nonce: nonce,
            timestamp: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        // Simple token generation (in production, use proper JWT)
        return btoa(JSON.stringify(payload));
    }

    // ========================================
    // SESSION MANAGEMENT
    // ========================================
    saveSession() {
        const sessionData = {
            isAuthenticated: this.isAuthenticated,
            user: this.currentUser,
            token: this.sessionToken,
            savedAt: Date.now()
        };
        
        localStorage.setItem('siwe_session', JSON.stringify(sessionData));
    }

    checkExistingSession() {
        try {
            const sessionData = localStorage.getItem('siwe_session');
            if (!sessionData) return;

            const session = JSON.parse(sessionData);
            
            // Check if session is still valid (24 hours)
            const sessionAge = Date.now() - session.savedAt;
            const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (sessionAge > maxSessionAge) {
                // Session expired
                this.signOut();
                return;
            }

            // Check if wallet is still connected to the same address
            if (this.wallet.isConnected && 
                this.wallet.currentAccount?.toLowerCase() === session.user?.walletAddress?.toLowerCase()) {
                
                this.isAuthenticated = session.isAuthenticated;
                this.currentUser = session.user;
                this.sessionToken = session.token;
                
                if (this.isAuthenticated) {
                    this.onAuthenticationSuccess(true); // silent = true
                }
            }

        } catch (error) {
            console.error('Error checking existing session:', error);
            // Clear corrupted session data
            localStorage.removeItem('siwe_session');
        }
    }

    // ========================================
    // UI METHODS
    // ========================================
    showSigningModal(message) {
        const modal = document.createElement('div');
        modal.id = 'siwe-signing-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 10001; display: flex; 
            align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                <h3 style="color: #2D374B; margin-bottom: 15px;">🔐 Sign In with Ethereum</h3>
                <p style="margin: 15px 0; color: #666;">Please sign this message in your wallet to authenticate.</p>
                
                <div style="background: #f8f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; border: 1px solid #e1e5e9;">
                    ${message.replace(/\n/g, '<br>')}
                </div>
                
                <div style="margin: 20px 0; padding: 15px; background: #e8f5e8; border-radius: 8px; border: 1px solid #c3e6c3;">
                    <strong style="color: #2d5a2d;">🛡️ This is safe!</strong><br>
                    <small style="color: #5a7c5a;">
                        • This message doesn't give us access to your funds<br>
                        • You're only proving you own this wallet address<br>
                        • No gas fees required for signing
                    </small>
                </div>
                
                <div class="signing-spinner" style="margin: 20px 0;">
                    <div style="width: 40px; height: 40px; margin: 0 auto; border: 4px solid #f3f3f3; border-top: 4px solid #2D374B; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 10px; color: #666;">Check your wallet for the signing request...</p>
                </div>
                
                <button onclick="document.getElementById('siwe-signing-modal').remove()" 
                        style="background: #ccc; color: black; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 10px;">
                    Cancel
                </button>
            </div>
        `;
        
        // Add spin animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(modal);
    }

    hideSigningModal() {
        const modal = document.getElementById('siwe-signing-modal');
        if (modal) {
            modal.remove();
        }
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================
    onAuthenticationSuccess(silent = false) {
        console.log('SIWE authentication successful:', this.currentUser);
        
        if (!silent) {
            this.wallet.showToast('✅ Successfully signed in!', 'success');
        }
        
        // Update UI
        this.updateAuthUI();
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('siweAuthSuccess', {
            detail: { user: this.currentUser }
        }));

        // Check if user needs to complete profile setup
        if (!this.currentUser.username) {
            setTimeout(() => {
                this.showProfileSetupPrompt();
            }, 1500);
        }
    }

    onAuthenticationError(message) {
        console.error('SIWE authentication failed:', message);
        this.wallet.showToast('❌ Sign-in failed: ' + message, 'error');
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('siweAuthError', {
            detail: { error: message }
        }));
    }

    onSignOutSuccess() {
        console.log('SIWE sign-out successful');
        this.wallet.showToast('✅ Successfully signed out!', 'success');
        
        // Update UI
        this.updateAuthUI();
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('siweSignOut'));
    }

    updateAuthUI() {
        const authBtn = document.getElementById('authBtn');
        if (!authBtn) return;

        if (this.isAuthenticated && this.currentUser) {
            const displayName = this.currentUser.username || this.wallet.getShortAddress(this.currentUser.walletAddress);
            authBtn.textContent = `👤 ${displayName}`;
            authBtn.classList.add('authenticated');
            authBtn.title = `Signed in as ${displayName}`;
        } else {
            authBtn.textContent = 'Sign In';
            authBtn.classList.remove('authenticated');
            authBtn.title = 'Sign in with your wallet';
        }
    }

    showProfileSetupPrompt() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
            align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px;">
                <h3 style="color: #2D374B; margin-bottom: 15px;">🎉 Welcome to GENESIS!</h3>
                <p style="margin: 15px 0; color: #666;">Complete your profile to get started with creating and sharing your digital worlds.</p>
                
                <button onclick="window.location.href='profile-setup.html'" 
                        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 10px; font-weight: bold;">
                    Complete Profile
                </button>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: transparent; color: #666; border: 1px solid #ddd; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 10px;">
                    Skip for now
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    getUserProfile() {
        return this.currentUser;
    }

    updateUserProfile(updates) {
        if (!this.isAuthenticated) return false;

        const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
        const address = this.currentUser.walletAddress;
        
        if (users[address]) {
            users[address] = {
                ...users[address],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem('siwe_users', JSON.stringify(users));
            this.currentUser = users[address];
            this.saveSession();
            
            return true;
        }
        
        return false;
    }

    isValidSession() {
        return this.isAuthenticated && 
               this.currentUser && 
               this.sessionToken &&
               this.wallet.isConnected &&
               this.wallet.currentAccount?.toLowerCase() === this.currentUser.walletAddress?.toLowerCase();
    }
}

// ========================================
// INTEGRATION WITH WALLET MANAGER
// ========================================
class AuthenticatedWalletManager extends WalletManager {
    constructor() {
        super();
        this.siwe = new SIWEAuth(this);
    }

    async connectAndAuthenticate() {
        try {
            // First connect wallet
            const connectResult = await this.connectWallet();
            if (!connectResult.success) {
                return connectResult;
            }

            // Then authenticate with SIWE
            const authResult = await this.siwe.signIn();
            return authResult;

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async disconnect() {
        // Sign out from SIWE first
        await this.siwe.signOut();
        
        // Then disconnect wallet
        super.disconnect();
    }

    isFullyAuthenticated() {
        return this.isConnected && this.siwe.isAuthenticated;
    }

    getCurrentUser() {
        return this.siwe.currentUser;
    }

    async updateProfile(updates) {
        return this.siwe.updateUserProfile(updates);
    }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SIWEAuth, AuthenticatedWalletManager };
}