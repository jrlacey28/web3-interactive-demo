// Profile Setup JavaScript
let currentStep = 1;
const totalSteps = 4;
let profileData = {
    username: '',
    bio: '',
    profileImage: null,
    theme: 'dark',
    notifications: true,
    analytics: true
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    await initializeAuth();
    
    // Set up form event listeners
    setupFormListeners();
    
    // Initialize step 1
    updateProgressIndicator();
    
    // Set initial avatar
    updateAvatarDisplay();
});

// ========================================
// AUTHENTICATION SETUP
// ========================================
async function initializeAuth() {
    try {
        console.log('🔐 Initializing profile setup authentication...');
        
        // Wait for modern Moralis auth to be ready
        if (typeof window.walletManager === 'undefined') {
            setTimeout(initializeAuth, 100);
            return;
        }

        // Use the modern Moralis auth system
        window.authenticatedWallet = window.walletManager;
            
        console.log('🔍 Checking wallet authentication state...');
        console.log('authenticatedWallet exists:', !!window.authenticatedWallet);
        console.log('Connected:', window.authenticatedWallet?.isConnected);
        console.log('Authenticated:', window.authenticatedWallet?.isAuthenticated);
        console.log('Account:', window.authenticatedWallet?.account);
        console.log('Username:', window.authenticatedWallet?.getCurrentUser()?.username);
        
        // SIMPLIFIED CHECK: If we have an authenticated wallet, proceed
        if (window.authenticatedWallet && window.authenticatedWallet.isAuthenticated) {
            console.log('✅ Wallet authenticated, checking for existing profile...');
            
            // Check for existing profile using wallet address
            const walletAddress = window.authenticatedWallet.account;
            const existingProfile = checkForExistingProfile(walletAddress);
            
            // Check if this is edit mode or first-time setup
            const urlParams = new URLSearchParams(window.location.search);
            const editMode = urlParams.get('edit') === 'true';
            
            if (existingProfile && !editMode) {
                console.log(`👤 Found existing profile: ${existingProfile.username}`);
                // Update the current user with existing profile data
                window.authenticatedWallet.currentUser = {
                    ...window.authenticatedWallet.currentUser,
                    username: existingProfile.username,
                    bio: existingProfile.bio,
                    displayName: existingProfile.displayName
                };
                // Instead of showing popup, redirect to dashboard
                console.log('ℹ️ Profile exists, redirecting to dashboard');
                window.location.href = 'dashboard.html';
                return;
            }
            
            console.log('🎨 Showing profile creation/edit form');
            // Continue with normal profile setup flow below
            
        } else {
            console.log('⚠️ No wallet authentication found');
            const urlParams = new URLSearchParams(window.location.search);
            const fromAuth = urlParams.get('from') === 'auth' || urlParams.get('auth') === 'true';
            const fresh = urlParams.get('fresh') === 'true';
            
            // If this is from auth flow, wait a bit longer for session to restore
            if (fromAuth || fresh) {
                console.log('🔄 Coming from auth flow, waiting for session restoration...');
                const restored = await waitForAuthentication(5000);
                if (!restored) {
                    console.log('ℹ️ Session not restored, showing connect option');
                    showConnectOnProfilePage();
                    return;
                }
            } else {
                console.log('ℹ️ Direct access without auth - showing connect option');
                showConnectOnProfilePage();
                return;
            }
        }
            
        // Load existing user data if available
        loadExistingUserData();

        // Update wallet status
        updateWalletStatus();

        // Check if user is coming from authentication flow
        const urlParams = new URLSearchParams(window.location.search);
        const fromAuth = urlParams.get('from') === 'auth' || urlParams.get('auth') === 'true';
        
        if (fromAuth) {
            console.log('✅ User came from authentication flow');
            showWelcomeMessage();
        }

        // Listen for wallet changes
        if (typeof window.ethereum !== 'undefined') {
            // Do not forcibly redirect on account change; just update status
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    updateWalletStatus();
                } else {
                    updateWalletStatus();
                }
            });
        }

        console.log('✅ Profile setup authentication initialized');

    } catch (error) {
        console.error('❌ Error initializing auth:', error);
    }
}

// Wait up to maxWaitMs for wallet session to restore after redirect
async function waitForAuthentication(maxWaitMs = 3000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        try {
            // Check if wallet is authenticated
            if (window.authenticatedWallet?.isAuthenticated) {
                return true;
            }
            // Try to restore existing session
            await window.authenticatedWallet?.checkExistingSession?.();
        } catch (e) {
            // ignore transient errors
        }
        await new Promise(r => setTimeout(r, 300));
    }
    return window.authenticatedWallet?.isAuthenticated === true;
}

// Check for existing profile in localStorage
function checkForExistingProfile(walletAddress) {
    try {
        console.log('🔍 Checking for existing profile for wallet:', walletAddress);
        
        // Check the siwe_users storage format
        const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
        
        // First check if wallet address exists as a key
        if (users[walletAddress]) {
            console.log('✅ Found profile by wallet address:', users[walletAddress]);
            return users[walletAddress];
        }
        
        // Also check if any user has this wallet address
        for (const [key, userData] of Object.entries(users)) {
            if (userData.walletAddress === walletAddress) {
                console.log('✅ Found profile by matching wallet address:', userData);
                return userData;
            }
        }
        
        console.log('❌ No existing profile found for wallet:', walletAddress);
        return null;
        
    } catch (error) {
        console.error('❌ Error checking for existing profile:', error);
        return null;
    }
}

function updateWalletStatus() {
    const walletStatus = document.getElementById('walletStatus');
    if (!walletStatus) return;

    if (window.authenticatedWallet && window.authenticatedWallet.isConnected) {
        const shortAddress = window.authenticatedWallet.getShortAddress();
        const networkName = window.authenticatedWallet.getNetworkName();
        // Check if it's a testnet by looking at the network name
        const isTestnet = networkName && networkName.toLowerCase().includes('testnet');
        const testnetIndicator = isTestnet ? ' 🧪' : '';
        
        walletStatus.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #00ff88; font-weight: 600;">✅ ${shortAddress}${testnetIndicator}</span>
                <small style="color: #666; font-size: 0.8rem;">${networkName}</small>
            </div>
        `;
    } else {
        walletStatus.innerHTML = `<span style="color: #ff4757;">❌ Not Connected</span>`;
    }
}

function loadExistingUserData() {
    try {
        // Check if we have an authenticated wallet (new Genesis wallet system)
        if (!window.authenticatedWallet || !window.authenticatedWallet.isAuthenticated) {
            return;
        }

        const currentUser = window.authenticatedWallet.getCurrentUser();
        if (!currentUser) return;

        console.log('📋 Loading existing user data:', currentUser);

        // Pre-fill form with existing data
        if (currentUser.username) {
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.value = currentUser.username;
                profileData.username = currentUser.username;
            }
        }

        if (currentUser.bio) {
            const bioInput = document.getElementById('bio');
            const bioCounter = document.getElementById('bioCount');
            if (bioInput) {
                bioInput.value = currentUser.bio;
                profileData.bio = currentUser.bio;
                if (bioCounter) {
                    bioCounter.textContent = currentUser.bio.length;
                }
            }
        }

        if (currentUser.preferences) {
            // Set theme
            if (currentUser.preferences.theme) {
                const themeRadio = document.querySelector(`input[name="theme"][value="${currentUser.preferences.theme}"]`);
                if (themeRadio) {
                    themeRadio.checked = true;
                    profileData.theme = currentUser.preferences.theme;
                }
            }

            // Set notifications preference
            if (typeof currentUser.preferences.notifications === 'boolean') {
                const notificationsCheckbox = document.querySelector('input[name="notifications"]');
                if (notificationsCheckbox) {
                    notificationsCheckbox.checked = currentUser.preferences.notifications;
                    profileData.notifications = currentUser.preferences.notifications;
                }
            }

            // Set analytics preference
            if (typeof currentUser.preferences.analytics === 'boolean') {
                const analyticsCheckbox = document.querySelector('input[name="analytics"]');
                if (analyticsCheckbox) {
                    analyticsCheckbox.checked = currentUser.preferences.analytics;
                    profileData.analytics = currentUser.preferences.analytics;
                }
            }
        }

        // Set profile image if exists
        if (currentUser.profileImage) {
            profileData.profileImage = currentUser.profileImage;
        }

        // Update avatar display
        updateAvatarDisplay();

    } catch (error) {
        console.error('❌ Error loading existing user data:', error);
    }
}

// Removed showExistingProfileOptions - no longer showing popup

// Removed editExistingProfile - no longer needed

function showConnectOnProfilePage() {
    // Instead of showing an error, show a connect wallet option right on the profile page
    const setupCard = document.querySelector('.setup-card');
    if (setupCard) {
        setupCard.innerHTML = `
            <div class="setup-header-content" style="text-align: center;">
                <h1>🔗 Connect Your Wallet</h1>
                <p>Connect your wallet to create your GENESIS profile</p>
            </div>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">👛</div>
                <h3 style="color: #2D374B; margin-bottom: 15px;">Wallet Connection Required</h3>
                <p style="margin: 15px 0; color: #666; max-width: 400px; margin-left: auto; margin-right: auto;">
                    To create your profile, we need to connect to your Web3 wallet first. This will authenticate your account securely.
                </p>
                <div style="margin-top: 30px;">
                    <button onclick="connectWalletOnProfile()" 
                            style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 30px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 16px; margin: 10px;">
                        Connect Wallet
                    </button>
                    <button onclick="window.location.href='index.html'" 
                            style="background: #6c757d; color: white; border: none; padding: 15px 30px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 16px; margin: 10px;">
                        Go Back Home
                    </button>
                </div>
            </div>
        `;
    }
}

// Add wallet connection function for profile page
async function connectWalletOnProfile() {
    try {
        console.log('🔗 Connecting wallet from profile page...');
        const result = await window.walletManager.authenticate();
        
        if (result.success) {
            console.log('✅ Wallet connected and authenticated, refreshing page...');
            // Refresh the page to reinitialize with authenticated state
            window.location.reload();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Wallet connection failed:', error);
        alert('Failed to connect wallet: ' + error.message);
    }
}

function showAuthRequiredMessage() {
    // This function is kept for backwards compatibility but shouldn't be used anymore
    showConnectOnProfilePage();
}

function showWelcomeMessage() {
    setTimeout(() => {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 100px; right: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 20px; border-radius: 15px; z-index: 10000;
            max-width: 350px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="font-size: 1.5rem; margin-right: 10px;">🎉</div>
                <strong>Welcome to GENESIS!</strong>
            </div>
            <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">
                Let's set up your creator profile to get started.
            </p>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }, 1000);
}

// ========================================
// FORM LISTENERS
// ========================================
function setupFormListeners() {
    // Username validation
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('input', debounce(validateUsername, 500));
        usernameInput.addEventListener('blur', validateUsername);
    }

    // Bio character counter
    const bioInput = document.getElementById('bio');
    const bioCounter = document.getElementById('bioCount');
    if (bioInput && bioCounter) {
        bioInput.addEventListener('input', () => {
            const count = bioInput.value.length;
            bioCounter.textContent = count;
            bioCounter.style.color = count > 450 ? '#ff4757' : '#667eea';
        });
    }

    // Form submission
    const form = document.getElementById('profileSetupForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Theme selection
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            profileData.theme = e.target.value;
            updateSummary();
        });
    });

    // Checkbox preferences
    const notificationsCheckbox = document.querySelector('input[name="notifications"]');
    const analyticsCheckbox = document.querySelector('input[name="analytics"]');
    
    if (notificationsCheckbox) {
        notificationsCheckbox.addEventListener('change', (e) => {
            profileData.notifications = e.target.checked;
        });
    }
    
    if (analyticsCheckbox) {
        analyticsCheckbox.addEventListener('change', (e) => {
            profileData.analytics = e.target.checked;
        });
    }
}

// ========================================
// USERNAME VALIDATION
// ========================================
async function validateUsername() {
    const usernameInput = document.getElementById('username');
    const statusDiv = document.getElementById('usernameStatus');
    
    if (!usernameInput || !statusDiv) return;

    const username = usernameInput.value.trim();
    
    // Clear status if empty
    if (!username) {
        statusDiv.style.display = 'none';
        return;
    }

    // Basic validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
        showUsernameStatus('Invalid format. Use 3-50 characters, letters, numbers, and underscores only.', 'error');
        return;
    }

    // Check availability
    showUsernameStatus('Checking availability...', 'checking');
    
    try {
        const isAvailable = await checkUsernameAvailability(username);
        
        if (isAvailable) {
            showUsernameStatus('✅ Username is available!', 'available');
            profileData.username = username;
        } else {
            showUsernameStatus('❌ Username is already taken', 'taken');
        }
        
    } catch (error) {
        showUsernameStatus('Error checking availability', 'error');
    }
}

async function checkUsernameAvailability(username) {
    // Simulate API call - in production, this would be a real backend call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check against localStorage for existing usernames
    const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
    const existingUsernames = Object.values(users)
        .map(user => user.username)
        .filter(Boolean)
        .map(name => name.toLowerCase());
    
    return !existingUsernames.includes(username.toLowerCase());
}

function showUsernameStatus(message, type) {
    const statusDiv = document.getElementById('usernameStatus');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.className = `username-status ${type}`;
    statusDiv.style.display = 'block';
}

// ========================================
// STEP NAVIGATION
// ========================================
function nextStep() {
    if (!validateCurrentStep()) return;
    
    if (currentStep < totalSteps) {
        // Hide current step
        document.getElementById(`step${currentStep}`).classList.remove('active');
        
        // Show next step
        currentStep++;
        document.getElementById(`step${currentStep}`).classList.add('active');
        
        // Update progress
        updateProgressIndicator();
        
        // Update summary if on final step
        if (currentStep === 4) {
            updateSummary();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        // Hide current step
        document.getElementById(`step${currentStep}`).classList.remove('active');
        
        // Show previous step
        currentStep--;
        document.getElementById(`step${currentStep}`).classList.add('active');
        
        // Update progress
        updateProgressIndicator();
    }
}

function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            const username = document.getElementById('username').value.trim();
            if (!username) {
                alert('Please enter a username');
                return false;
            }
            if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
                alert('Username must be 3-50 characters, letters, numbers, and underscores only');
                return false;
            }
            
            profileData.username = username;
            profileData.bio = document.getElementById('bio').value.trim();
            break;
            
        case 2:
            // Avatar is optional, just save selection
            break;
            
        case 3:
            // Preferences are already saved via event listeners
            break;
            
        case 4:
            const acceptTerms = document.getElementById('acceptTerms');
            if (!acceptTerms.checked) {
                alert('Please accept the Terms of Service and Privacy Policy');
                return false;
            }
            break;
    }
    
    return true;
}

function updateProgressIndicator() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

// ========================================
// AVATAR MANAGEMENT
// ========================================
function generateAvatar(type) {
    // Remove previous selection
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Mark current selection
    event.currentTarget.classList.add('selected');
    
    profileData.profileImage = {
        type: type,
        style: getAvatarStyle(type)
    };
    
    updateAvatarDisplay();
}

function getAvatarStyle(type) {
    const username = profileData.username || 'User';
    const initials = username.charAt(0).toUpperCase();
    
    switch (type) {
        case 'geometric':
            return {
                background: 'conic-gradient(from 0deg, #667eea, #764ba2, #f093fb, #f5576c, #667eea)',
                content: initials
            };
        case 'gradient':
            return {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                content: initials
            };
        case 'initials':
            return {
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                content: initials
            };
        case 'wallet':
            return {
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                content: '🔗'
            };
        default:
            return {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                content: initials
            };
    }
}

function updateAvatarDisplay() {
    const currentAvatar = document.querySelector('.avatar-placeholder');
    const summaryAvatar = document.getElementById('summaryAvatar');
    
    if (!currentAvatar) return;
    
    const style = profileData.profileImage ? 
        profileData.profileImage.style : 
        getAvatarStyle('gradient');
    
    const initials = profileData.username ? 
        profileData.username.charAt(0).toUpperCase() : 
        '?';
    
    // Update current avatar
    currentAvatar.style.background = style.background;
    currentAvatar.querySelector('.avatar-initials').textContent = style.content || initials;
    
    // Update summary avatar
    if (summaryAvatar) {
        summaryAvatar.style.background = style.background;
        summaryAvatar.textContent = style.content || initials;
    }
}

// ========================================
// SUMMARY UPDATE
// ========================================
function updateSummary() {
    const summaryUsername = document.getElementById('summaryUsername');
    const summaryBio = document.getElementById('summaryBio');
    const summaryWallet = document.getElementById('summaryWallet');
    
    if (summaryUsername) {
        summaryUsername.textContent = profileData.username || 'Username';
    }
    
    if (summaryBio) {
        summaryBio.textContent = profileData.bio || 'No bio provided';
        summaryBio.style.fontStyle = profileData.bio ? 'normal' : 'italic';
        summaryBio.style.opacity = profileData.bio ? '1' : '0.6';
    }
    
    if (summaryWallet && window.authenticatedWallet && window.authenticatedWallet.isConnected) {
        summaryWallet.textContent = window.authenticatedWallet.getShortAddress();
    }
    
    updateAvatarDisplay();
}

// ========================================
// FORM SUBMISSION
// ========================================
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateCurrentStep()) return;
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    const completeBtn = document.getElementById('completeBtn');
    
    try {
        // Show loading
        loadingOverlay.style.display = 'flex';
        completeBtn.disabled = true;
        
        // Validate wallet connection
        if (!window.authenticatedWallet || !window.authenticatedWallet.isAuthenticated || !window.authenticatedWallet.account) {
            throw new Error('Wallet not authenticated. Please reconnect your wallet.');
        }
        
        // Create user profile
        const result = await createUserProfile();
        
        if (result.success) {
            // Success! Show completion message
            showCompletionSuccess();
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
            
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Profile creation failed:', error);
        alert('Failed to create profile: ' + error.message);
        
    } finally {
        loadingOverlay.style.display = 'none';
        completeBtn.disabled = false;
    }
}

async function createUserProfile() {
    try {
        // Update user profile with collected data
        const profileUpdates = {
            username: profileData.username,
            bio: profileData.bio,
            profileImage: profileData.profileImage,
            preferences: {
                theme: profileData.theme,
                notifications: profileData.notifications,
                analytics: profileData.analytics
            },
            profileComplete: true,
            updatedAt: new Date().toISOString()
        };
        
        // Save to localStorage (in production, this would be sent to backend)
        const users = JSON.parse(localStorage.getItem('siwe_users') || '{}');
        const walletAddress = window.authenticatedWallet.account;
        
        if (!walletAddress) {
            throw new Error('Wallet address not found');
        }
        
        // Create user record (using OLD format for compatibility - wallet address as key)
        const userRecord = {
            id: 'user_' + Date.now(),
            walletAddress: walletAddress,
            username: profileData.username,
            displayName: profileData.username,
            bio: profileData.bio,
            profileImage: profileData.profileImage,
            isVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            worlds: [],
            preferences: { 
                theme: profileData.theme, 
                notifications: profileData.notifications, 
                analytics: profileData.analytics 
            },
            ...profileUpdates
        };
        
        // Save using old format (wallet address as key) for compatibility
        users[walletAddress] = userRecord;
        
        // ALSO save using new format (username as key) for new system
        users[profileData.username] = {
            username: profileData.username,
            walletAddress: walletAddress,
            displayName: profileData.username,
            bio: profileData.bio,
            createdAt: new Date().toISOString(),
            verified: true
        };
        
        localStorage.setItem('siwe_users', JSON.stringify(users));
        
        // Note: With Moralis, user data is automatically synced to the backend
        // No need to manually update session like with the old system
        
        console.log('✅ Profile created successfully:', userRecord);
        
        return { success: true, user: userRecord };
        
    } catch (error) {
        console.error('❌ Profile creation failed:', error);
        return { success: false, error: error.message };
    }
}

function showCompletionSuccess() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingContent = loadingOverlay.querySelector('.loading-content');
    
    loadingContent.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
            <h3 style="color: #2D374B; margin-bottom: 15px;">Profile Created Successfully!</h3>
            <p style="color: #666; margin-bottom: 20px;">Welcome to GENESIS, ${profileData.username}!</p>
            <div style="width: 50px; height: 4px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 2px; margin: 0 auto;"></div>
            <p style="color: #666; margin-top: 15px; font-size: 0.9rem;">Redirecting to your dashboard...</p>
        </div>
    `;
}

// ========================================
// TERMS AND PRIVACY
// ========================================
function showTerms() {
    const modal = createModal('Terms of Service', `
        <div style="max-height: 400px; overflow-y: auto; text-align: left;">
            <h4>1. Acceptance of Terms</h4>
            <p>By using GENESIS, you agree to these terms and conditions.</p>
            
            <h4>2. Use of Service</h4>
            <p>You may use GENESIS to create and share digital worlds. You are responsible for your content.</p>
            
            <h4>3. Web3 Integration</h4>
            <p>GENESIS integrates with Web3 technologies. You are responsible for your wallet and transactions.</p>
            
            <h4>4. Privacy</h4>
            <p>We respect your privacy and handle your data according to our Privacy Policy.</p>
            
            <h4>5. Limitations</h4>
            <p>GENESIS is provided "as is" without warranties. We are not liable for any damages.</p>
        </div>
    `);
    document.body.appendChild(modal);
}

function showPrivacy() {
    const modal = createModal('Privacy Policy', `
        <div style="max-height: 400px; overflow-y: auto; text-align: left;">
            <h4>1. Information We Collect</h4>
            <p>We collect wallet addresses, usernames, and profile information you provide.</p>
            
            <h4>2. How We Use Information</h4>
            <p>We use your information to provide and improve our services.</p>
            
            <h4>3. Data Storage</h4>
            <p>Your data is stored locally and optionally on decentralized networks.</p>
            
            <h4>4. Sharing</h4>
            <p>We don't share your personal information with third parties without consent.</p>
            
            <h4>5. Your Rights</h4>
            <p>You can delete your profile and data at any time.</p>
        </div>
    `);
    document.body.appendChild(modal);
}

function createModal(title, content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10002; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="color: #2D374B; margin-bottom: 20px;">${title}</h3>
            ${content}
            <div style="text-align: center; margin-top: 30px;">
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}