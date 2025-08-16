// Home Page JavaScript
let walletManager = null;

// Wait for persistent wallet manager to be available
async function waitForWalletManager() {
    console.log('⏳ Waiting for persistent wallet manager...');
    let attempts = 0;
    while (!window.persistentWallet && !window.walletManager && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    const manager = window.persistentWallet || window.walletManager;
    if (!manager) {
        throw new Error('Persistent wallet manager not available after waiting');
    }
    console.log('✅ Persistent wallet manager ready');
    return manager;
}

// Handle wallet connection from homepage
async function handleWalletConnect() {
    try {
        console.log('🔗 Connecting wallet from homepage...');
        const walletBtn = document.getElementById('walletBtn');
        
        if (!walletManager) {
            walletManager = await waitForWalletManager();
        }
        
        // Check if already authenticated
        if (walletManager.isAuthenticated) {
            // Already connected, show dropdown instead of redirecting
            console.log('✅ Already authenticated, showing dropdown');
            toggleUserDropdown();
            return;
        }
        
        // Update button state
        walletBtn.disabled = true;
        walletBtn.textContent = 'Connecting...';
        
        // Authenticate with persistent wallet manager
        const result = await walletManager.connect();
        
        if (result.success) {
            console.log('✅ Wallet connected successfully');
            walletBtn.textContent = '✅ Connected!';
            
            // Show success message
            showToast('🎉 Wallet connected! Setting up your profile...', 'success');
            
            // Redirect to profile setup after short delay
            setTimeout(() => {
                window.location.href = 'profile-setup.html?from=auth';
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

// Show toast notification
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

// Dropdown functionality
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block';
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOnOutsideClick);
        }, 100);
    } else {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdownOnOutsideClick);
    }
}

function closeDropdownOnOutsideClick(e) {
    const dropdown = document.getElementById('userDropdown');
    const walletBtn = document.getElementById('walletBtn');
    
    if (dropdown && walletBtn && !dropdown.contains(e.target) && !walletBtn.contains(e.target)) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdownOnOutsideClick);
    }
}

function updateDropdownInfo(manager) {
    const dropdownWalletAddress = document.getElementById('dropdownWalletAddress');
    const dropdownNetwork = document.getElementById('dropdownNetwork');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const dropdownUsername = document.getElementById('dropdownUsername');
    
    // Update wallet address
    if (dropdownWalletAddress) {
        dropdownWalletAddress.textContent = manager.getShortAddress();
    }
    
    // Update network info (detect current chain)
    if (dropdownNetwork) {
        dropdownNetwork.textContent = 'Arbitrum Sepolia Testnet';
    }
    
    // Show username if available
    if (manager.username && usernameDisplay && dropdownUsername) {
        dropdownUsername.textContent = manager.username;
        usernameDisplay.style.display = 'block';
    } else if (usernameDisplay) {
        usernameDisplay.style.display = 'none';
    }
}

function switchToArbitrum() {
    // Add network switching functionality
    if (window.ethereum) {
        window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x66eee' }] // Arbitrum Sepolia
        }).catch((error) => {
            console.log('Network switch failed:', error);
            showToast('\ud83d\udd04 Please switch to Arbitrum Sepolia manually', 'info');
        });
    }
}

function signOut() {
    if (walletManager) {
        walletManager.disconnect();
        // Hide dropdown
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) dropdown.style.display = 'none';
        
        // Reset wallet button
        const walletBtn = document.getElementById('walletBtn');
        if (walletBtn) {
            walletBtn.textContent = 'Connect Wallet';
            walletBtn.onclick = handleWalletConnect;
        }
        
        showToast('👋 Wallet disconnected', 'info');
    }
}

// Make functions globally available
window.handleWalletConnect = handleWalletConnect;
window.toggleUserDropdown = toggleUserDropdown;
window.signOut = signOut;
window.switchToArbitrum = switchToArbitrum;

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize wallet manager when page loads
    try {
        walletManager = await waitForWalletManager();
        
        // Check if user is already authenticated and update UI
        if (walletManager.isAuthenticated) {
            const walletBtn = document.getElementById('walletBtn');
            const displayName = walletManager.username || walletManager.getShortAddress();
            
            walletBtn.textContent = `👤 ${displayName}`;
            walletBtn.onclick = toggleUserDropdown;
            
            // Update dropdown info
            updateDropdownInfo(walletManager);
        }
    } catch (error) {
        console.log('Wallet manager not ready yet, will be available when user clicks connect');
    }
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Remove navigation scroll effects since header is removed

    // Animate feature cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards and steps
    document.querySelectorAll('.feature-card, .step').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    // Add parallax effect to hero visual
    const heroVisual = document.querySelector('.hero-visual');
    let ticking = false;

    function updateParallax() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        if (heroVisual) {
            heroVisual.style.transform = `translateY(${rate}px)`;
        }
        
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    });

    // Add loading animation
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});