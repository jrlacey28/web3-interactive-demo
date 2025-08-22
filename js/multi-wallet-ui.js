// GENESIS Multi-Wallet UI Manager
// Handles all UI interactions for the multi-wallet system

class MultiWalletUI {
    constructor() {
        this.isInitialized = false;
        this.currentModal = null;
        this.selectedWalletType = null;
        this.isAddingWallet = false;
        
        console.log('🎨 Multi-Wallet UI Manager initializing...');
    }
    
    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            // Wait for dependencies
            await this.waitForDependencies();
            
            // Initialize UI components
            this.createMultiWalletModal();
            this.updateDropdownWalletSection();
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Multi-Wallet UI Manager initialized');
            return true;
            
        } catch (error) {
            console.error('❌ Multi-Wallet UI initialization failed:', error);
            return false;
        }
    }
    
    async waitForDependencies() {
        let attempts = 0;
        while ((!window.multiWalletManager || !window.bitcoinWallet || !window.genesis) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.multiWalletManager || !window.bitcoinWallet || !window.genesis) {
            throw new Error('Required dependencies not available');
        }
    }
    
    // ========================================
    // MODAL CREATION & MANAGEMENT
    // ========================================
    
    createMultiWalletModal() {
        const modal = document.createElement('div');
        modal.id = 'multiWalletModal';
        modal.className = 'multi-wallet-modal';
        
        modal.innerHTML = `
            <div class="wallet-modal-content">
                <div class="wallet-modal-header">
                    <h2 class="wallet-modal-title">🪙 Manage Wallets</h2>
                    <button class="wallet-modal-close" onclick="multiWalletUI.closeModal()">&times;</button>
                </div>
                
                <div class="add-wallet-form">
                    <h3 style="color: #ffffff; margin-bottom: 15px;">Add New Wallet</h3>
                    
                    <div class="form-section">
                        <label class="form-label">Select Wallet Type</label>
                        <div id="walletTypeOptions"></div>
                    </div>
                    
                    <div class="form-section" id="addressSection" style="display: none;">
                        <label class="form-label">Wallet Address</label>
                        <input type="text" id="walletAddressInput" class="form-input" 
                               placeholder="Enter wallet address..." 
                               oninput="multiWalletUI.validateAddressInput()">
                        <div id="addressValidation" class="address-validation" style="display: none;"></div>
                    </div>
                    
                    <div class="form-section" id="labelSection" style="display: none;">
                        <label class="form-label">Wallet Label (Optional)</label>
                        <input type="text" id="walletLabelInput" class="form-input" 
                               placeholder="e.g., Main Bitcoin Wallet">
                    </div>
                    
                    <div class="form-section" id="networkSection" style="display: none;">
                        <label class="form-label">Network</label>
                        <select id="networkSelect" class="form-select">
                            <option value="mainnet">Mainnet</option>
                            <option value="testnet">Testnet</option>
                        </select>
                    </div>
                    
                    <button id="addWalletBtn" class="add-wallet-button" disabled 
                            onclick="multiWalletUI.addWallet()">Add Wallet</button>
                </div>
                
                <div class="wallet-list">
                    <div class="wallet-list-header">
                        <h3 class="wallet-list-title">Your Wallets</h3>
                        <span class="wallet-count" id="walletCount">0 wallets</span>
                    </div>
                    <div id="walletListContainer"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.populateWalletTypes();
        this.updateWalletList();
    }
    
    populateWalletTypes() {
        const container = document.getElementById('walletTypeOptions');
        if (!container) return;
        
        const supportedTypes = window.multiWalletManager.getSupportedWalletTypes();
        
        container.innerHTML = '';
        
        supportedTypes.forEach(walletType => {
            if (walletType.isPrimary) return; // Skip primary wallet types
            
            const option = document.createElement('div');
            option.className = 'wallet-type-option';
            option.dataset.type = walletType.type;
            option.onclick = () => this.selectWalletType(walletType.type);
            
            option.innerHTML = `
                <div class="wallet-type-icon">${walletType.icon}</div>
                <div class="wallet-type-info">
                    <h4 class="wallet-type-name">${walletType.name}</h4>
                    <p class="wallet-type-description">For receiving ${walletType.symbol} payments</p>
                </div>
            `;
            
            container.appendChild(option);
        });
    }
    
    selectWalletType(type) {
        // Clear previous selection
        document.querySelectorAll('.wallet-type-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Select new type
        const selectedElement = document.querySelector(`[data-type="${type}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
        
        this.selectedWalletType = type;
        
        // Show address input section
        document.getElementById('addressSection').style.display = 'block';
        document.getElementById('labelSection').style.display = 'block';
        
        // Show network section for Bitcoin
        if (type === 'bitcoin') {
            document.getElementById('networkSection').style.display = 'block';
        } else {
            document.getElementById('networkSection').style.display = 'none';
        }
        
        // Clear previous input
        document.getElementById('walletAddressInput').value = '';
        document.getElementById('walletLabelInput').value = '';
        document.getElementById('addressValidation').style.display = 'none';
        document.getElementById('addWalletBtn').disabled = true;
        
        // Focus on address input
        setTimeout(() => {
            document.getElementById('walletAddressInput').focus();
        }, 100);
    }
    
    validateAddressInput() {
        const addressInput = document.getElementById('walletAddressInput');
        const validationDiv = document.getElementById('addressValidation');
        const addBtn = document.getElementById('addWalletBtn');
        
        if (!addressInput || !validationDiv || !addBtn) return;
        
        const address = addressInput.value.trim();
        
        if (!address) {
            validationDiv.style.display = 'none';
            addBtn.disabled = true;
            return;
        }
        
        if (!this.selectedWalletType) {
            validationDiv.style.display = 'none';
            addBtn.disabled = true;
            return;
        }
        
        let validation;
        
        if (this.selectedWalletType === 'bitcoin') {
            const network = document.getElementById('networkSelect')?.value || 'mainnet';
            validation = window.bitcoinWallet.validateAddress(address, network);
            
            if (validation.valid) {
                const addressInfo = window.bitcoinWallet.getAddressInfo(address, network);
                validationDiv.innerHTML = `
                    ✅ Valid ${addressInfo.description} on ${network}
                    <br><small>Network: ${addressInfo.network}</small>
                `;
                validationDiv.className = 'address-validation valid';
                addBtn.disabled = false;
            } else {
                validationDiv.innerHTML = `❌ ${validation.error}`;
                validationDiv.className = 'address-validation invalid';
                addBtn.disabled = true;
            }
        } else {
            // Use generic validation for other wallet types
            validation = window.multiWalletManager.isValidAddress(address, this.selectedWalletType);
            
            if (validation) {
                validationDiv.innerHTML = `✅ Valid ${this.selectedWalletType} address`;
                validationDiv.className = 'address-validation valid';
                addBtn.disabled = false;
            } else {
                validationDiv.innerHTML = `❌ Invalid ${this.selectedWalletType} address format`;
                validationDiv.className = 'address-validation invalid';
                addBtn.disabled = true;
            }
        }
        
        validationDiv.style.display = 'block';
    }
    
    async addWallet() {
        if (this.isAddingWallet) return;
        
        try {
            this.isAddingWallet = true;
            
            const addBtn = document.getElementById('addWalletBtn');
            const originalText = addBtn.textContent;
            addBtn.textContent = 'Adding...';
            addBtn.disabled = true;
            
            const walletData = {
                type: this.selectedWalletType,
                address: document.getElementById('walletAddressInput').value.trim(),
                label: document.getElementById('walletLabelInput').value.trim(),
                network: document.getElementById('networkSelect')?.value || 'mainnet'
            };
            
            const result = await window.multiWalletManager.addSecondaryWallet(walletData);
            
            if (result.success) {
                this.showToast('🎉 Wallet added successfully!', 'success');
                this.clearAddWalletForm();
                this.updateWalletList();
                this.updateDropdownWalletSection();
            } else {
                this.showToast(`❌ ${result.error}`, 'error');
            }
            
            addBtn.textContent = originalText;
            
        } catch (error) {
            console.error('❌ Error adding wallet:', error);
            this.showToast('❌ Failed to add wallet', 'error');
        } finally {
            this.isAddingWallet = false;
        }
    }
    
    clearAddWalletForm() {
        // Clear selections
        document.querySelectorAll('.wallet-type-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Clear inputs
        document.getElementById('walletAddressInput').value = '';
        document.getElementById('walletLabelInput').value = '';
        document.getElementById('networkSelect').value = 'mainnet';
        
        // Hide sections
        document.getElementById('addressSection').style.display = 'none';
        document.getElementById('labelSection').style.display = 'none';
        document.getElementById('networkSection').style.display = 'none';
        document.getElementById('addressValidation').style.display = 'none';
        
        // Reset state
        this.selectedWalletType = null;
        document.getElementById('addWalletBtn').disabled = true;
    }
    
    updateWalletList() {
        const container = document.getElementById('walletListContainer');
        const countElement = document.getElementById('walletCount');
        
        if (!container || !countElement) return;
        
        const wallets = window.multiWalletManager.getAllWallets();
        
        countElement.textContent = `${wallets.length} wallet${wallets.length !== 1 ? 's' : ''}`;
        
        if (wallets.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.6);">
                    No additional wallets added yet
                </div>
            `;
            return;
        }
        
        container.innerHTML = wallets.map(wallet => this.createWalletItemHTML(wallet)).join('');
    }
    
    createWalletItemHTML(wallet) {
        const config = window.multiWalletManager.supportedWalletTypes.get(wallet.type);
        const isPrimary = wallet.isPrimary;
        
        return `
            <div class="wallet-item ${isPrimary ? 'primary' : ''}" data-wallet-id="${wallet.id}">
                <div class="wallet-info">
                    <div class="wallet-icon">${wallet.metadata?.icon || config?.icon || '🪙'}</div>
                    <div class="wallet-details">
                        <h4 class="wallet-label">
                            ${wallet.label}
                            ${isPrimary ? '<span class="wallet-type-badge">Primary</span>' : ''}
                        </h4>
                        <p class="wallet-address">${wallet.address}</p>
                    </div>
                </div>
                <div class="wallet-actions">
                    ${!isPrimary ? `
                        <button class="wallet-action-btn" onclick="multiWalletUI.editWalletLabel('${wallet.id}')">
                            ✏️
                        </button>
                        <button class="wallet-action-btn danger" onclick="multiWalletUI.removeWallet('${wallet.id}')">
                            🗑️
                        </button>
                    ` : ''}
                    <button class="wallet-action-btn" onclick="multiWalletUI.copyWalletAddress('${wallet.address}')">
                        📋
                    </button>
                </div>
            </div>
        `;
    }
    
    // ========================================
    // WALLET ACTIONS
    // ========================================
    
    async removeWallet(walletId) {
        if (!confirm('Are you sure you want to remove this wallet?')) {
            return;
        }
        
        const result = await window.multiWalletManager.removeSecondaryWallet(walletId);
        
        if (result.success) {
            this.showToast('🗑️ Wallet removed', 'info');
            this.updateWalletList();
            this.updateDropdownWalletSection();
        } else {
            this.showToast(`❌ ${result.error}`, 'error');
        }
    }
    
    async editWalletLabel(walletId) {
        const wallet = window.multiWalletManager.getWalletById(walletId);
        if (!wallet) return;
        
        const newLabel = prompt('Enter new wallet label:', wallet.label);
        if (!newLabel || newLabel.trim() === wallet.label) {
            return;
        }
        
        const result = await window.multiWalletManager.updateWalletLabel(walletId, newLabel.trim());
        
        if (result.success) {
            this.showToast('✏️ Wallet updated', 'success');
            this.updateWalletList();
            this.updateDropdownWalletSection();
        } else {
            this.showToast(`❌ ${result.error}`, 'error');
        }
    }
    
    copyWalletAddress(address) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(address).then(() => {
                this.showToast('📋 Address copied to clipboard', 'success');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = address;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('📋 Address copied to clipboard', 'success');
        }
    }
    
    // ========================================
    // DROPDOWN INTEGRATION
    // ========================================
    
    updateDropdownWalletSection() {
        // Disabled: Payment wallets section removed from dropdown per user request
        // Wallets are now managed through the profile setup page
        return;
    }
    
    // ========================================
    // MODAL CONTROLS
    // ========================================
    
    openModal() {
        const modal = document.getElementById('multiWalletModal');
        if (modal) {
            modal.classList.add('show');
            this.currentModal = modal;
            this.updateWalletList();
            
            // Close dropdown if open
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) {
                dropdown.style.display = 'none';
            }
        }
    }
    
    closeModal() {
        const modal = document.getElementById('multiWalletModal');
        if (modal) {
            modal.classList.remove('show');
            this.currentModal = null;
            this.clearAddWalletForm();
        }
    }
    
    // ========================================
    // EVENT LISTENERS
    // ========================================
    
    setupEventListeners() {
        // Close modal on outside click
        document.addEventListener('click', (e) => {
            if (this.currentModal && e.target === this.currentModal) {
                this.closeModal();
            }
        });
        
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeModal();
            }
        });
        
        // Listen for multi-wallet events
        window.addEventListener('multiWalletEvent', (e) => {
            this.handleMultiWalletEvent(e.detail);
        });
    }
    
    handleMultiWalletEvent(eventData) {
        switch (eventData.type) {
            case 'walletAdded':
            case 'walletRemoved':
            case 'walletUpdated':
                this.updateWalletList();
                this.updateDropdownWalletSection();
                break;
        }
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#00ff88' : 
                       type === 'error' ? '#ff4757' : '#667eea';
        
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${bgColor}; 
            color: white; padding: 15px 20px; border-radius: 10px; z-index: 10002;
            font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            transform: translateX(100%); transition: transform 0.3s ease;
            max-width: 350px; word-wrap: break-word;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// Create global instance
window.multiWalletUI = new MultiWalletUI();

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎨 Initializing Multi-Wallet UI...');
    await window.multiWalletUI.initialize();
});

console.log('🎨 Multi-Wallet UI Manager loaded');