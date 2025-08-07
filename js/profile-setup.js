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
        // Wait for wallet manager to be ready
        if (typeof walletManager === 'undefined') {
            console.error('Wallet manager not found');
            return;
        }

        // Update wallet status
        updateWalletStatus();

        // Check if user is coming from authentication flow
        const urlParams = new URLSearchParams(window.location.search);
        const fromAuth = urlParams.get('auth') === 'true';
        
        if (fromAuth) {
            console.log('User came from authentication flow');
        }

        // Listen for wallet changes
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    // Wallet disconnected, redirect to home
                    window.location.href = 'index.html';
                } else {
                    updateWalletStatus();
                }
            });
        }

    } catch (error) {
        console.error('Error initializing auth:', error);
    }
}

function updateWalletStatus() {
    const walletStatus = document.getElementById('walletStatus');
    if (!walletStatus) return;

    if (walletManager && walletManager.isConnected) {
        const shortAddress = walletManager.getShortAddress();
        const networkName = walletManager.getNetworkName();
        walletStatus.innerHTML = `
            <span>✅ ${shortAddress}</span>
            <small style="display: block; opacity: 0.8; font-size: 0.8rem;">${networkName}</small>
        `;
    } else {
        walletStatus.textContent = '❌ Not Connected';
    }
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
    
    if (summaryWallet && walletManager && walletManager.isConnected) {
        summaryWallet.textContent = walletManager.getShortAddress();
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
        if (!walletManager || !walletManager.isConnected) {
            throw new Error('Wallet not connected');
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
        // Get or create SIWE auth instance
        let siweAuth;
        if (typeof walletManager.siwe !== 'undefined') {
            siweAuth = walletManager.siwe;
        } else {
            siweAuth = new SIWEAuth(walletManager);
        }
        
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
        const walletAddress = walletManager.currentAccount;
        
        if (users[walletAddress]) {
            users[walletAddress] = {
                ...users[walletAddress],
                ...profileUpdates
            };
            
            localStorage.setItem('siwe_users', JSON.stringify(users));
            
            // Update current user in SIWE auth
            if (siweAuth.currentUser) {
                siweAuth.currentUser = users[walletAddress];
                siweAuth.saveSession();
            }
            
            return { success: true, user: users[walletAddress] };
        } else {
            throw new Error('User not found');
        }
        
    } catch (error) {
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