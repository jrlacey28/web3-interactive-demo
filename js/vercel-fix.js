// Vercel Deployment Fix
// This ensures authentication works on fresh deployments without pre-existing localStorage

// Override the home page connect function to handle fresh deployments
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the original scripts to load
    setTimeout(() => {
        if (typeof window.handleWalletConnect !== 'undefined') {
            // Override the original function with a Vercel-compatible version
            window.handleWalletConnect = handleWalletConnectVercel;
        }
    }, 1000);
});

// Vercel-compatible wallet connection
async function handleWalletConnectVercel() {
    try {
        console.log('🔗 Vercel-compatible wallet connection starting...');
        const walletBtn = document.getElementById('walletBtn');
        
        if (!window.walletManager) {
            // Wait for wallet manager to load
            await waitForWalletManager();
        }
        
        // Check if already authenticated
        if (window.walletManager.isAuthenticated) {
            console.log('✅ Already authenticated, checking for existing profile...');
            
            // Check if user has a profile
            const currentUser = window.walletManager.getCurrentUser();
            if (currentUser && currentUser.username) {
                // Has profile, go to dashboard
                window.location.href = 'dashboard.html';
                return;
            } else {
                // No profile, go to profile setup
                window.location.href = 'profile-setup.html?from=auth';
                return;
            }
        }
        
        // Update button state
        walletBtn.disabled = true;
        walletBtn.textContent = 'Connecting...';
        
        // Authenticate with Moralis
        const result = await window.walletManager.authenticate();
        
        if (result.success) {
            console.log('✅ Wallet connected successfully');
            walletBtn.textContent = '✅ Connected!';
            
            // Show success message
            showToast('🎉 Wallet connected! Setting up your profile...', 'success');
            
            // Always go to profile setup for fresh deployments
            // This ensures users can set up their profile even on new domains
            setTimeout(() => {
                window.location.href = 'profile-setup.html?from=auth&fresh=true';
            }, 1500);
            
        } else {
            throw new Error(result.error || 'Connection failed');
        }
        
    } catch (error) {
        console.error('❌ Wallet connection failed:', error);
        
        const walletBtn = document.getElementById('walletBtn');
        walletBtn.disabled = false;
        walletBtn.textContent = 'Connect Wallet';
        
        showToast('❌ Connection failed: ' + error.message, 'error');
    }
}

// Wait for wallet manager with longer timeout for Vercel
async function waitForWalletManager() {
    console.log('⏳ Waiting for wallet manager (Vercel mode)...');
    let attempts = 0;
    while (!window.walletManager && attempts < 100) { // Longer timeout for Vercel
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.walletManager) {
        throw new Error('Wallet manager not available after waiting');
    }
    console.log('✅ Wallet manager ready');
    return window.walletManager;
}

// Enhanced toast for better UX
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#00ff88' : 
                   type === 'error' ? '#ff4757' : 
                   '#667eea';
    
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${bgColor}; 
        color: white; padding: 15px 20px; border-radius: 10px; z-index: 10001;
        font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        transform: translateX(100%); transition: transform 0.3s ease;
        max-width: 350px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}