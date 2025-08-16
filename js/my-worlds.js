// My Worlds Management JavaScript
let authenticatedWallet = null;
let currentUser = null;
let userWorlds = {};
let selectedTemplate = 'gallery';
let selectedTheme = 'purple';

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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await initializeAuth();
    await loadUserWorlds();
    setupEventListeners();
    hideLoadingScreen();
    
    // Make functions globally accessible for onclick handlers
    window.createNewWorld = createNewWorld;
    window.editMainWorld = editMainWorld;
    window.viewMainWorld = viewMainWorld;
    window.viewSubWorld = viewSubWorld;
    window.editSubWorld = editSubWorld;
    window.deleteSubWorld = deleteSubWorld;
    window.copyPublicUrl = copyPublicUrl;
    window.toggleView = toggleView;
    window.closeCreateModal = closeCreateModal;
    window.closeEditMainModal = closeEditMainModal;
});

// ========================================
// AUTHENTICATION & INITIALIZATION
// ========================================
async function initializeAuth() {
    try {
        console.log('🔐 Initializing my-worlds authentication...');
        
        // Wait for persistent wallet manager to be ready
        authenticatedWallet = await waitForWalletManager();
        
        if (!authenticatedWallet.isAuthenticated) {
            console.log('❌ User not authenticated, redirecting to home');
            redirectToHome();
            return;
        }

        currentUser = authenticatedWallet.getCurrentUser();
        console.log('✅ User authenticated:', currentUser);
        
        // If no username, redirect to profile setup
        if (!currentUser?.username) {
            console.log('ℹ️ No username found, redirecting to profile setup');
            window.location.href = 'profile-setup.html?from=auth';
            return;
        }

        updateUserUI();
        
    } catch (error) {
        console.error('Authentication failed:', error);
        redirectToHome();
    }
}

function redirectToHome() {
    alert('Please sign in to access your worlds.');
    window.location.href = 'index.html';
}

function updateUserUI() {
    if (!currentUser) return;

    console.log('\ud83c\udfa8 Updating My Worlds UI for user:', currentUser);

    // Update user menu
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) {
        userName.textContent = currentUser.username || 'User';
    }
    
    if (userAvatar) {
        if (currentUser.username) {
            userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        }
    }

    // Update public URL
    const publicUrl = document.getElementById('publicUrl');
    if (publicUrl) {
        if (currentUser.username) {
            publicUrl.textContent = `genesis.app/world/${currentUser.username}`;
        } else {
            publicUrl.textContent = 'Complete profile setup to get your URL';
        }
    }
    
    // Update main world info
    const mainWorldTitle = document.getElementById('mainWorldTitle');
    const mainWorldDescription = document.getElementById('mainWorldDescription');
    const mainWorldAvatar = document.getElementById('mainWorldAvatar');
    
    if (mainWorldTitle && currentUser.username) {
        mainWorldTitle.textContent = `${currentUser.username}'s World`;
    }
    
    if (mainWorldDescription && currentUser.bio) {
        mainWorldDescription.textContent = currentUser.bio;
    }
    
    if (mainWorldAvatar && currentUser.username) {
        mainWorldAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    }
}

// ========================================
// WORLD DATA MANAGEMENT
// ========================================
async function loadUserWorlds() {
    try {
        if (!currentUser) return;

        // Get user's worlds from localStorage
        const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
        const userWorldsData = allWorlds[currentUser.walletAddress] || {};
        
        // Ensure user has a main world
        if (!userWorldsData.main) {
            await createMainWorld();
        }

        userWorlds = userWorldsData;
        updateMainWorldDisplay();
        updateSubWorldsDisplay();
        
    } catch (error) {
        console.error('Failed to load worlds:', error);
    }
}

async function createMainWorld() {
    try {
        const mainWorld = {
            id: 'main',
            type: 'main',
            name: currentUser.username ? `${currentUser.username}'s World` : 'My World',
            description: currentUser.bio || 'Welcome to my creator space!',
            theme: 'purple',
            privacy: 'public',
            banner: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stats: {
                views: 0,
                likes: 0,
                tips: 0
            },
            content: {
                widgets: [],
                layout: 'default'
            }
        };

        // Save to localStorage
        const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
        if (!allWorlds[currentUser.walletAddress]) {
            allWorlds[currentUser.walletAddress] = {};
        }
        allWorlds[currentUser.walletAddress].main = mainWorld;
        localStorage.setItem('user_worlds', JSON.stringify(allWorlds));

        userWorlds.main = mainWorld;
        
    } catch (error) {
        console.error('Failed to create main world:', error);
    }
}

function saveWorldsData() {
    try {
        const allWorlds = JSON.parse(localStorage.getItem('user_worlds') || '{}');
        allWorlds[currentUser.walletAddress] = userWorlds;
        localStorage.setItem('user_worlds', JSON.stringify(allWorlds));
    } catch (error) {
        console.error('Failed to save worlds data:', error);
    }
}

// ========================================
// UI UPDATE FUNCTIONS
// ========================================
function updateMainWorldDisplay() {
    if (!userWorlds.main) return;

    const mainWorld = userWorlds.main;
    
    // Update main world card
    const mainWorldTitle = document.getElementById('mainWorldTitle');
    const mainWorldDescription = document.getElementById('mainWorldDescription');
    const mainWorldViews = document.getElementById('mainWorldViews');
    const mainWorldBanner = document.getElementById('mainWorldBanner');
    const mainWorldAvatar = document.getElementById('mainWorldAvatar');

    if (mainWorldTitle) {
        mainWorldTitle.textContent = mainWorld.name;
    }
    
    if (mainWorldDescription) {
        mainWorldDescription.textContent = mainWorld.description;
    }
    
    if (mainWorldViews) {
        mainWorldViews.textContent = mainWorld.stats.views || 0;
    }

    if (mainWorldBanner && mainWorld.banner) {
        mainWorldBanner.style.backgroundImage = `url(${mainWorld.banner})`;
        mainWorldBanner.style.backgroundSize = 'cover';
        mainWorldBanner.style.backgroundPosition = 'center';
    }

    if (mainWorldAvatar && currentUser.username) {
        mainWorldAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    }
}

function updateSubWorldsDisplay() {
    const subWorldsGrid = document.getElementById('subWorldsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!subWorldsGrid || !emptyState) return;

    // Get sub-worlds (exclude main world)
    const subWorlds = Object.values(userWorlds).filter(world => world.type !== 'main');
    
    if (subWorlds.length === 0) {
        subWorldsGrid.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        subWorldsGrid.style.display = 'grid';
        emptyState.style.display = 'none';
        
        // Render sub-world cards
        subWorldsGrid.innerHTML = subWorlds.map(world => createSubWorldCard(world)).join('');
    }
}

function createSubWorldCard(world) {
    const privacyIcon = world.privacy === 'public' ? '🌟' : '🔒';
    const privacyText = world.privacy === 'public' ? 'Public' : 'Private';
    
    return `
        <div class="sub-world-card" data-world-id="${world.id}">
            <div class="sub-world-preview">
                <div class="sub-world-banner ${world.theme}-theme">
                    <div class="banner-overlay">
                        <button class="preview-btn" onclick="viewSubWorld('${world.id}')">
                            👁️ Preview
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="sub-world-info">
                <h4 class="sub-world-title">${world.name}</h4>
                <p class="sub-world-description">${world.description || 'No description'}</p>
                
                <div class="sub-world-stats">
                    <span class="stat">👥 ${world.stats.views || 0} views</span>
                    <span class="stat">${privacyIcon} ${privacyText}</span>
                </div>
            </div>
            
            <div class="sub-world-actions">
                <button class="action-btn secondary" onclick="editSubWorld('${world.id}')">
                    ✏️ Edit
                </button>
                <button class="action-btn primary" onclick="viewSubWorld('${world.id}')">
                    👁️ View
                </button>
                <button class="action-btn danger" onclick="deleteSubWorld('${world.id}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // User menu click
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.addEventListener('click', toggleUserDropdown);
    }

    // Close modals on backdrop click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModals();
        }
    });

    // Template selection
    document.addEventListener('click', (e) => {
        if (e.target.closest('.template-option')) {
            const templateOption = e.target.closest('.template-option');
            selectTemplate(templateOption.dataset.template);
        }
    });

    // Theme selection
    document.addEventListener('click', (e) => {
        if (e.target.closest('.theme-option')) {
            const themeOption = e.target.closest('.theme-option');
            selectTheme(themeOption.dataset.theme);
        }
    });

    // Form submissions
    const createForm = document.getElementById('createWorldForm');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateWorld);
    }

    const editForm = document.getElementById('editMainWorldForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditMainWorld);
    }

    // Character counters
    const descInput = document.getElementById('worldDescription');
    if (descInput) {
        descInput.addEventListener('input', updateDescCounter);
    }

    const bioInput = document.getElementById('mainWorldBio');
    if (bioInput) {
        bioInput.addEventListener('input', updateBioCounter);
    }

    // Banner upload
    const bannerUpload = document.getElementById('bannerUpload');
    if (bannerUpload) {
        bannerUpload.addEventListener('change', handleBannerUpload);
    }
}

// ========================================
// WORLD ACTIONS
// ========================================
function createNewWorld() {
    console.log('➕ Create New World clicked');
    const modal = document.getElementById('createWorldModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error('Create World Modal not found');
    }
}

function editMainWorld() {
    console.log('📝 Edit Main World clicked', { currentUser, userWorlds });
    
    // For main world, "customize" means going to the creator page to edit the layout
    if (currentUser && currentUser.username) {
        // Check if there's a published layout to load
        const layoutId = userWorlds.main?.layoutId;
        console.log('Found layout ID:', layoutId);
        
        if (layoutId) {
            // Open creator page with the layout loaded for editing
            console.log('Opening creator with layout:', layoutId);
            window.open(`creator.html?edit=${layoutId}`, '_blank');
        } else {
            // No existing layout, just go to creator page
            console.log('No layout found, opening blank creator page');
            window.open('creator.html', '_blank');
        }
    } else if (currentUser) {
        alert('Please set up your username first to customize your world.');
        window.location.href = 'profile-setup.html?from=auth';
    } else {
        alert('Please sign in to customize your world.');
        window.location.href = 'index.html';
    }
}

function viewMainWorld() {
    console.log('👁️ View Main World clicked', { currentUser });
    
    if (currentUser && currentUser.username) {
        console.log('Opening world for user:', currentUser.username);
        window.open(`world.html?user=${currentUser.username}`, '_blank');
    } else if (currentUser) {
        alert('Please set up your username first to view your world.');
        window.location.href = 'profile-setup.html?from=auth';
    } else {
        alert('Please sign in to view your world.');
        window.location.href = 'index.html';
    }
}

function viewSubWorld(worldId) {
    const world = userWorlds[worldId];
    if (world && currentUser.username) {
        window.open(`world.html?user=${currentUser.username}&world=${worldId}`, '_blank');
    }
}

function editSubWorld(worldId) {
    // TODO: Implement sub-world editing
    alert('Sub-world editing will be available soon!');
}

function deleteSubWorld(worldId) {
    if (confirm('Are you sure you want to delete this sub-world? This action cannot be undone.')) {
        delete userWorlds[worldId];
        saveWorldsData();
        updateSubWorldsDisplay();
    }
}

// ========================================
// FORM HANDLERS
// ========================================
async function handleCreateWorld(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const worldName = formData.get('worldName').trim();
    const worldDescription = formData.get('worldDescription').trim();
    const worldPrivacy = formData.get('worldPrivacy');
    
    if (!worldName) {
        alert('Please enter a world name.');
        return;
    }

    try {
        // Generate unique ID
        const worldId = generateWorldId(worldName);
        
        // Create new world
        const newWorld = {
            id: worldId,
            type: 'sub',
            name: worldName,
            description: worldDescription,
            theme: selectedTheme,
            privacy: worldPrivacy,
            template: selectedTemplate,
            banner: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stats: {
                views: 0,
                likes: 0,
                tips: 0
            },
            content: {
                widgets: [],
                layout: selectedTemplate
            }
        };

        // Add to user worlds
        userWorlds[worldId] = newWorld;
        saveWorldsData();
        
        // Update UI
        updateSubWorldsDisplay();
        closeCreateModal();
        
        // Show success message
        showToast('✅ Sub-world created successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to create world:', error);
        alert('Failed to create world. Please try again.');
    }
}

async function handleEditMainWorld(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const worldName = formData.get('mainWorldName').trim();
    const worldBio = formData.get('mainWorldBio').trim();
    
    if (!worldName) {
        alert('Please enter a world name.');
        return;
    }

    try {
        // Update main world
        userWorlds.main.name = worldName;
        userWorlds.main.description = worldBio;
        userWorlds.main.theme = selectedTheme;
        userWorlds.main.updatedAt = new Date().toISOString();
        
        saveWorldsData();
        updateMainWorldDisplay();
        closeEditMainModal();
        
        showToast('✅ Main world updated successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to update main world:', error);
        alert('Failed to update world. Please try again.');
    }
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function closeCreateModal() {
    document.getElementById('createWorldModal').style.display = 'none';
    document.getElementById('createWorldForm').reset();
    selectTemplate('gallery');
    selectTheme('purple');
}

function closeEditMainModal() {
    document.getElementById('editMainWorldModal').style.display = 'none';
}

function closeModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// ========================================
// UI INTERACTION FUNCTIONS
// ========================================
function selectTemplate(template) {
    selectedTemplate = template;
    
    // Update UI
    document.querySelectorAll('.template-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const selectedOption = document.querySelector(`[data-template="${template}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
}

function selectTheme(theme) {
    selectedTheme = theme;
    
    // Update UI
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const selectedOption = document.querySelector(`[data-theme="${theme}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
}

function toggleView(viewType) {
    const grid = document.getElementById('subWorldsGrid');
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    
    // Update toggle buttons
    toggleBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-view="${viewType}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Update grid display
    if (grid) {
        grid.className = viewType === 'list' ? 'sub-worlds-grid list-view' : 'sub-worlds-grid';
    }
}

function toggleUserDropdown() {
    // TODO: Implement user dropdown
    console.log('User dropdown clicked');
}

function updateDescCounter() {
    const descInput = document.getElementById('worldDescription');
    const counter = document.getElementById('descCount');
    
    if (descInput && counter) {
        counter.textContent = descInput.value.length;
        counter.style.color = descInput.value.length > 180 ? '#ff4757' : '#667eea';
    }
}

function updateBioCounter() {
    const bioInput = document.getElementById('mainWorldBio');
    const counter = document.getElementById('bioCount');
    
    if (bioInput && counter) {
        counter.textContent = bioInput.value.length;
        counter.style.color = bioInput.value.length > 270 ? '#ff4757' : '#667eea';
    }
}

async function copyPublicUrl() {
    try {
        const url = `genesis.app/world/${currentUser.username}`;
        await navigator.clipboard.writeText(url);
        showToast('✅ URL copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy URL:', error);
        showToast('❌ Failed to copy URL', 'error');
    }
}

function handleBannerUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    // Read file and preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('currentBannerPreview');
        if (preview) {
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            preview.innerHTML = '';
        }
        
        // Store for saving (in production, would upload to server)
        // For now, we'll store as base64 in localStorage
        if (userWorlds.main) {
            userWorlds.main.banner = e.target.result;
        }
    };
    
    reader.readAsDataURL(file);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function generateWorldId(name) {
    // Create URL-friendly ID from name
    const baseId = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now();
    return `${baseId}-${timestamp}`;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#00ff88' : type === 'error' ? '#ff4757' : '#667eea';
    
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${bgColor}; 
        color: white; padding: 15px 20px; border-radius: 10px; z-index: 10000;
        font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        transform: translateX(100%); transition: transform 0.3s ease;
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
    }, 3000);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

// ========================================
// PLACEHOLDER FUNCTIONS
// ========================================
function showAnalytics() {
    alert('Analytics feature coming soon!');
}

function showHelp() {
    alert('Help system coming soon!');
}

function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        authenticatedWallet.signOut().then(() => {
            window.location.href = 'index.html';
        });
    }
}