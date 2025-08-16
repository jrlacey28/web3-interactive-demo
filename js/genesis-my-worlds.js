// GENESIS My Worlds - Clean Implementation

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌍 Initializing GENESIS My Worlds...');
    
    try {
        // Wait for GENESIS system
        await waitForGenesis();
        
        // Require authentication and profile
        if (!window.genesis.requireProfile()) {
            return;
        }
        
        // Initialize my worlds
        await initializeMyWorlds();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide loading screen
        hideLoading();
        
        console.log('✅ My Worlds ready');
        
    } catch (error) {
        console.error('❌ My Worlds initialization failed:', error);
        window.location.href = 'index.html';
    }
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

async function initializeMyWorlds() {
    console.log('🎨 Starting My Worlds initialization...');
    console.log('Genesis system:', window.genesis);
    console.log('Current user:', window.genesis?.currentUser);
    console.log('Username:', window.genesis?.username);
    
    let user = window.genesis.currentUser;
    
    // If no currentUser but we have username, try to load from storage
    if (!user && window.genesis.username && window.genesis.account) {
        console.log('🔄 Attempting to load user profile from storage...');
        user = window.genesis.getUserProfile(window.genesis.account);
        if (user) {
            window.genesis.currentUser = user;
            console.log('✅ Loaded user from storage:', user);
        }
    }
    
    // If still no user, create a minimal user object
    if (!user && window.genesis.username) {
        console.log('🔄 Creating minimal user object...');
        user = {
            username: window.genesis.username,
            walletAddress: window.genesis.account,
            bio: 'Welcome to my creator space!',
            avatar: null,
            worlds: []
        };
        window.genesis.currentUser = user;
        console.log('✅ Created minimal user object:', user);
    }
    
    if (!user) {
        console.error('❌ No current user found and cannot create one');
        console.log('Available data:', {
            isConnected: window.genesis?.isConnected,
            isAuthenticated: window.genesis?.isAuthenticated,
            account: window.genesis?.account,
            username: window.genesis?.username
        });
        throw new Error('No current user found');
    }
    
    console.log('🎨 Setting up My Worlds for:', user.username);
    
    // Update UI with user data
    updateUserInterface(user);
    
    // Load user worlds
    loadUserWorlds(user);
}

function updateUserInterface(user) {
    // Update user menu in header
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) {
        userName.textContent = user.username;
    }
    
    if (userAvatar) {
        userAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
    
    // Update public URL
    const publicUrl = document.getElementById('publicUrl');
    if (publicUrl) {
        publicUrl.textContent = `genesis.app/world/${user.username}`;
    }
    
    // Update main world info
    const mainWorldTitle = document.getElementById('mainWorldTitle');
    const mainWorldDescription = document.getElementById('mainWorldDescription');
    const mainWorldAvatar = document.getElementById('mainWorldAvatar');
    
    if (mainWorldTitle) {
        mainWorldTitle.textContent = `${user.username}'s World`;
    }
    
    if (mainWorldDescription) {
        mainWorldDescription.textContent = user.bio || 'Welcome to my creator space!';
    }
    
    if (mainWorldAvatar) {
        mainWorldAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
    
    console.log('✅ User interface updated');
}

function loadUserWorlds(user) {
    const subWorldsGrid = document.getElementById('subWorldsGrid');
    const emptyState = document.getElementById('emptyState');
    
    // Get user's worlds (this would come from database in production)
    const worlds = user.worlds || [];
    
    if (worlds.length === 0) {
        // Show empty state
        if (subWorldsGrid) subWorldsGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        // Show worlds grid
        if (emptyState) emptyState.style.display = 'none';
        if (subWorldsGrid) {
            subWorldsGrid.style.display = 'grid';
            renderWorlds(worlds, subWorldsGrid);
        }
    }
    
    console.log(`🌍 Loaded ${worlds.length} worlds`);
}

function renderWorlds(worlds, container) {
    container.innerHTML = '';
    
    worlds.forEach(world => {
        const worldCard = createWorldCard(world);
        container.appendChild(worldCard);
    });
}

function createWorldCard(world) {
    const card = document.createElement('div');
    card.className = 'world-card';
    card.innerHTML = `
        <div class="world-preview">
            <div class="world-banner" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="world-overlay">
                    <h4>${world.name}</h4>
                </div>
            </div>
            <div class="world-info">
                <p class="world-description">${world.description}</p>
                <div class="world-stats">
                    <span>👥 ${world.views || 0} views</span>
                    <span>🌟 ${world.privacy || 'Public'}</span>
                </div>
            </div>
        </div>
        <div class="world-actions">
            <button class="action-btn secondary" onclick="viewWorld('${world.id}')">
                👁️ View
            </button>
            <button class="action-btn primary" onclick="editWorld('${world.id}')">
                ✏️ Edit
            </button>
            <button class="action-btn danger" onclick="deleteWorld('${world.id}')">
                🗑️ Delete
            </button>
        </div>
    `;
    
    return card;
}

function setupEventListeners() {
    // User menu toggle
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.addEventListener('click', toggleUserDropdown);
    }
    
    console.log('👂 Event listeners set up');
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        // Update dropdown info
        updateDropdownInfo();
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOnOutsideClick);
        }, 100);
    }
}

function updateDropdownInfo() {
    const user = window.genesis.currentUser;
    if (!user) return;
    
    const dropdownName = document.getElementById('dropdownName');
    const dropdownWallet = document.getElementById('dropdownWallet');
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    
    if (dropdownName) {
        dropdownName.textContent = user.username;
    }
    
    if (dropdownWallet) {
        dropdownWallet.textContent = window.genesis.getShortAddress();
    }
    
    if (dropdownAvatar) {
        dropdownAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
}

function closeDropdownOnOutsideClick(e) {
    const dropdown = document.getElementById('userDropdown');
    const userMenu = document.getElementById('userMenu');
    
    if (dropdown && userMenu && 
        !dropdown.contains(e.target) && 
        !userMenu.contains(e.target)) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdownOnOutsideClick);
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

// ========================================
// WORLD MANAGEMENT FUNCTIONS
// ========================================
function createNewWorld() {
    const modal = document.getElementById('createWorldModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeCreateModal() {
    const modal = document.getElementById('createWorldModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function editMainWorld() {
    const modal = document.getElementById('editMainWorldModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Pre-fill with current data
        const user = window.genesis.currentUser;
        if (user) {
            const nameInput = document.getElementById('mainWorldName');
            const bioInput = document.getElementById('mainWorldBio');
            
            if (nameInput) nameInput.value = `${user.username}'s World`;
            if (bioInput) bioInput.value = user.bio || '';
        }
    }
}

function closeEditMainModal() {
    const modal = document.getElementById('editMainWorldModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function viewMainWorld() {
    const user = window.genesis.currentUser;
    if (user) {
        window.open(`world.html?user=${user.username}`, '_blank');
    }
}

function viewWorld(worldId) {
    console.log('👁️ Viewing world:', worldId);
    // Implementation for viewing specific world
}

function editWorld(worldId) {
    console.log('✏️ Editing world:', worldId);
    // Implementation for editing specific world
}

function deleteWorld(worldId) {
    if (confirm('Are you sure you want to delete this world?')) {
        console.log('🗑️ Deleting world:', worldId);
        // Implementation for deleting world
    }
}

function copyPublicUrl() {
    const user = window.genesis.currentUser;
    if (user) {
        const url = `https://genesis.app/world/${user.username}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('📋 URL copied to clipboard!', 'success');
        });
    }
}

function toggleView(viewType) {
    const gridBtn = document.querySelector('[data-view=\"grid\"]');
    const listBtn = document.querySelector('[data-view=\"list\"]');
    const subWorldsGrid = document.getElementById('subWorldsGrid');
    
    if (viewType === 'grid') {
        gridBtn?.classList.add('active');
        listBtn?.classList.remove('active');
        if (subWorldsGrid) subWorldsGrid.className = 'sub-worlds-grid';
    } else {
        listBtn?.classList.add('active');
        gridBtn?.classList.remove('active');
        if (subWorldsGrid) subWorldsGrid.className = 'sub-worlds-list';
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#00ff88' : 
                   type === 'error' ? '#ff4757' : '#667eea';
    
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${bgColor}; 
        color: white; padding: 15px 20px; border-radius: 10px; z-index: 10001;
        font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        transform: translateX(100%); transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ========================================
// MAKE FUNCTIONS GLOBAL
// ========================================
window.createNewWorld = createNewWorld;
window.editMainWorld = editMainWorld;
window.viewMainWorld = viewMainWorld;
window.viewSubWorld = viewWorld;
window.editSubWorld = editWorld;
window.deleteSubWorld = deleteWorld;
window.copyPublicUrl = copyPublicUrl;
window.toggleView = toggleView;
window.closeCreateModal = closeCreateModal;
window.closeEditMainModal = closeEditMainModal;

console.log('✅ GENESIS My Worlds system loaded');