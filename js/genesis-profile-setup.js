// GENESIS Profile Setup - Clean Implementation

let currentStep = 1;
const totalSteps = 4;
let formData = {
    username: '',
    bio: '',
    profileImage: null,
    theme: 'dark',
    notifications: true,
    analytics: true
};

// Initialize profile setup
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📝 Initializing GENESIS Profile Setup...');
    
    // Wait for GENESIS system to be ready
    await waitForGenesis();
    
    // Check authentication
    if (!window.genesis.requireAuth()) {
        return;
    }
    
    // Check if editing existing profile
    const urlParams = new URLSearchParams(window.location.search);
    const isEdit = urlParams.get('edit') === 'true';
    
    if (isEdit) {
        console.log('✏️ Edit mode detected');
        loadExistingProfile();
    } else if (window.genesis.username) {
        // User already has profile, redirect to dashboard
        console.log('👤 Profile exists, redirecting to dashboard');
        window.location.href = 'dashboard.html';
        return;
    }
    
    setupForm();
    updateProgress();
});

async function waitForGenesis() {
    let attempts = 0;
    while (!window.genesis && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.genesis) {
        throw new Error('GENESIS system not available');
    }
}

function setupForm() {
    console.log('🎨 Setting up profile form...');
    
    // Username validation
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('input', validateUsername);
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
        form.addEventListener('submit', handleSubmit);
    }
    
    // Theme selection
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    themeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            formData.theme = e.target.value;
            updateSummary();
        });
    });
    
    // Preferences
    const notificationsInput = document.querySelector('input[name="notifications"]');
    const analyticsInput = document.querySelector('input[name="analytics"]');
    
    if (notificationsInput) {
        notificationsInput.addEventListener('change', (e) => {
            formData.notifications = e.target.checked;
        });
    }
    
    if (analyticsInput) {
        analyticsInput.addEventListener('change', (e) => {
            formData.analytics = e.target.checked;
        });
    }
    
    console.log('✅ Profile form setup complete');
}

function loadExistingProfile() {
    const user = window.genesis.currentUser;
    if (!user) return;
    
    console.log('📋 Loading existing profile data:', user);
    
    // Populate form fields
    const usernameInput = document.getElementById('username');
    const bioInput = document.getElementById('bio');
    
    if (usernameInput && user.username) {
        usernameInput.value = user.username;
        formData.username = user.username;
    }
    
    if (bioInput && user.bio) {
        bioInput.value = user.bio;
        formData.bio = user.bio;
        
        // Update bio counter
        const bioCounter = document.getElementById('bioCount');
        if (bioCounter) {
            bioCounter.textContent = user.bio.length;
        }
    }
    
    // Set theme
    if (user.theme) {
        formData.theme = user.theme;
        const themeInput = document.querySelector(`input[name="theme"][value="${user.theme}"]`);
        if (themeInput) {
            themeInput.checked = true;
        }
    }
    
    // Set preferences
    if (typeof user.notifications !== 'undefined') {
        formData.notifications = user.notifications;
        const notificationsInput = document.querySelector('input[name="notifications"]');
        if (notificationsInput) {
            notificationsInput.checked = user.notifications;
        }
    }
    
    if (typeof user.analytics !== 'undefined') {
        formData.analytics = user.analytics;
        const analyticsInput = document.querySelector('input[name="analytics"]');
        if (analyticsInput) {
            analyticsInput.checked = user.analytics;
        }
    }
}

// ========================================
// STEP NAVIGATION
// ========================================
function nextStep() {
    console.log(`📍 Attempting to go to step ${currentStep + 1}`);
    
    if (!validateCurrentStep()) {
        console.log('❌ Validation failed for current step');
        return;
    }
    
    if (currentStep < totalSteps) {
        // Hide current step
        const currentStepEl = document.getElementById(`step${currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.remove('active');
        }
        
        // Show next step
        currentStep++;
        const nextStepEl = document.getElementById(`step${currentStep}`);
        if (nextStepEl) {
            nextStepEl.classList.add('active');
        }
        
        updateProgress();
        
        if (currentStep === 4) {
            updateSummary();
        }
        
        console.log(`✅ Moved to step ${currentStep}`);
    }
}

function prevStep() {
    if (currentStep > 1) {
        // Hide current step
        const currentStepEl = document.getElementById(`step${currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.remove('active');
        }
        
        // Show previous step
        currentStep--;
        const prevStepEl = document.getElementById(`step${currentStep}`);
        if (prevStepEl) {
            prevStepEl.classList.add('active');
        }
        
        updateProgress();
        
        console.log(`⬅️ Moved to step ${currentStep}`);
    }
}

function updateProgress() {
    // Update progress indicator
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        if (index + 1 <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

// ========================================
// VALIDATION
// ========================================
function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            return validateStep1();
        case 2:
            return validateStep2();
        case 3:
            return validateStep3();
        case 4:
            return validateStep4();
        default:
            return true;
    }
}

function validateStep1() {
    const usernameInput = document.getElementById('username');
    const bioInput = document.getElementById('bio');
    
    if (!usernameInput) {
        console.error('Username input not found');
        return false;
    }
    
    const username = usernameInput.value.trim();
    const bio = bioInput ? bioInput.value.trim() : '';
    
    if (!username) {
        alert('Please enter a username');
        usernameInput.focus();
        return false;
    }
    
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
        alert('Username must be 3-50 characters, letters, numbers, and underscores only');
        usernameInput.focus();
        return false;
    }
    
    // Save step 1 data
    formData.username = username;
    formData.bio = bio;
    
    console.log('✅ Step 1 validated:', { username, bio: bio.substring(0, 50) + '...' });
    return true;
}

function validateStep2() {
    // Avatar is optional
    console.log('✅ Step 2 validated (avatar optional)');
    return true;
}

function validateStep3() {
    // Preferences are already saved via event listeners
    console.log('✅ Step 3 validated (preferences)');
    return true;
}

function validateStep4() {
    const acceptTerms = document.getElementById('acceptTerms');
    if (!acceptTerms || !acceptTerms.checked) {
        alert('Please accept the Terms of Service and Privacy Policy');
        if (acceptTerms) acceptTerms.focus();
        return false;
    }
    
    console.log('✅ Step 4 validated (terms accepted)');
    return true;
}

function validateUsername() {
    const usernameInput = document.getElementById('username');
    const statusDiv = document.getElementById('usernameStatus');
    
    if (!usernameInput || !statusDiv) return;
    
    const username = usernameInput.value.trim();
    
    if (!username) {
        statusDiv.innerHTML = '';
        return;
    }
    
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
        statusDiv.innerHTML = '<span style="color: #ff4757;">❌ Invalid format</span>';
        return;
    }
    
    // Check if username is taken (simple check)
    const users = JSON.parse(localStorage.getItem('genesis_users') || '{}');
    const taken = Object.values(users).some(user => 
        user.username === username && user.walletAddress !== window.genesis.account
    );
    
    if (taken) {
        statusDiv.innerHTML = '<span style="color: #ff4757;">❌ Username taken</span>';
    } else {
        statusDiv.innerHTML = '<span style="color: #00ff88;">✅ Available</span>';
    }
}

// ========================================
// FORM SUBMISSION
// ========================================
async function handleSubmit(event) {
    event.preventDefault();
    
    console.log('🚀 Submitting profile form...');
    
    if (!validateCurrentStep()) {
        console.log('❌ Final validation failed');
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    const submitBtn = document.getElementById('completeBtn');
    
    try {
        // Show loading
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (submitBtn) submitBtn.disabled = true;
        
        console.log('📝 Creating profile with data:', formData);
        
        // Create or update profile
        const result = window.genesis.username ? 
            window.genesis.updateProfile(formData) : 
            window.genesis.createProfile(formData);
        
        if (result.success) {
            console.log('✅ Profile saved successfully');
            
            // Show success message
            showSuccess();
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Profile creation failed');
        }
        
    } catch (error) {
        console.error('❌ Profile submission failed:', error);
        alert('Failed to save profile: ' + error.message);
        
        // Hide loading
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
    }
}

function showSuccess() {
    const setupCard = document.querySelector('.setup-card');
    if (setupCard) {
        setupCard.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
                <h2 style="color: #00ff88; margin-bottom: 15px;">Profile Created!</h2>
                <p style="color: #666; margin-bottom: 30px;">
                    Welcome to GENESIS! Your profile has been saved and you're ready to start creating.
                </p>
                <div style="color: #667eea;">
                    Redirecting to dashboard...
                </div>
            </div>
        `;
    }
}

function updateSummary() {
    // Update summary on final step
    const summaryUsername = document.getElementById('summaryUsername');
    const summaryBio = document.getElementById('summaryBio');
    const summaryWallet = document.getElementById('summaryWallet');
    
    if (summaryUsername) summaryUsername.textContent = formData.username || 'Username';
    if (summaryBio) summaryBio.textContent = formData.bio || 'No bio provided';
    if (summaryWallet) summaryWallet.textContent = window.genesis.getShortAddress();
}

// ========================================
// AVATAR FUNCTIONS
// ========================================
function generateAvatar(type) {
    console.log('🎨 Generating avatar:', type);
    // Avatar generation logic here
    formData.profileImage = type;
}

function showTerms() {
    alert('Terms of Service: By using GENESIS, you agree to our terms and conditions.');
}

function showPrivacy() {
    alert('Privacy Policy: We respect your privacy and protect your data.');
}

// ========================================
// MAKE FUNCTIONS GLOBAL
// ========================================
window.nextStep = nextStep;
window.prevStep = prevStep;
window.generateAvatar = generateAvatar;
window.showTerms = showTerms;
window.showPrivacy = showPrivacy;
window.validateUsername = validateUsername;

console.log('✅ GENESIS Profile Setup loaded');