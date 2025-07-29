// Storage and Data Persistence Management
// Handles local storage, layout saving, and data management

class StorageManager {
    constructor() {
        this.storagePrefix = 'web3Demo_';
        this.layoutKey = 'layout';
        this.settingsKey = 'settings';
        this.userDataKey = 'userData';
    }

    // ========================================
    // LAYOUT MANAGEMENT
    // ========================================
    saveLayout(layoutData) {
        try {
            const layout = {
                widgets: layoutData.widgets || [],
                background: layoutData.background || '',
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            this.setItem(this.layoutKey, layout);
            console.log('Layout saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving layout:', error);
            return false;
        }
    }

    loadLayout() {
        try {
            const layout = this.getItem(this.layoutKey);
            if (layout && layout.widgets) {
                console.log('Layout loaded successfully');
                return layout;
            }
            return null;
        } catch (error) {
            console.error('Error loading layout:', error);
            return null;
        }
    }

    exportLayout() {
        const layout = this.loadLayout();
        if (layout) {
            const exportData = {
                ...layout,
                exportedAt: new Date().toISOString(),
                appVersion: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `web3-demo-layout-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        }
        return false;
    }

    importLayout(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const layoutData = JSON.parse(e.target.result);
                    if (this.validateLayoutData(layoutData)) {
                        this.saveLayout(layoutData);
                        resolve(layoutData);
                    } else {
                        reject(new Error('Invalid layout file format'));
                    }
                } catch (error) {
                    reject(new Error('Error parsing layout file: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    validateLayoutData(data) {
        return data && 
               Array.isArray(data.widgets) && 
               typeof data.background === 'string';
    }

    // ========================================
    // USER SETTINGS MANAGEMENT
    // ========================================
    saveSettings(settings) {
        try {
            const userSettings = {
                theme: settings.theme || 'default',
                autoSave: settings.autoSave !== false,
                animations: settings.animations !== false,
                notifications: settings.notifications !== false,
                defaultWidgetStyle: settings.defaultWidgetStyle || {},
                lastModified: new Date().toISOString()
            };
            
            this.setItem(this.settingsKey, userSettings);
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    loadSettings() {
        try {
            const settings = this.getItem(this.settingsKey);
            return settings || this.getDefaultSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            theme: 'default',
            autoSave: true,
            animations: true,
            notifications: true,
            defaultWidgetStyle: {
                opacity: 0.85,
                backgroundColor: '#000000',
                borderColor: '#00d4ff',
                buttonColor: '#00d4ff',
                buttonTextColor: '#ffffff'
            }
        };
    }

    // ========================================
    // USER DATA MANAGEMENT
    // ========================================
    saveUserData(userData) {
        try {
            const data = {
                walletAddress: userData.walletAddress || '',
                preferences: userData.preferences || {},
                favoriteWidgets: userData.favoriteWidgets || [],
                recentBackgrounds: userData.recentBackgrounds || [],
                lastActive: new Date().toISOString()
            };
            
            this.setItem(this.userDataKey, data);
            return true;
        } catch (error) {
            console.error('Error saving user data:', error);
            return false;
        }
    }

    loadUserData() {
        try {
            return this.getItem(this.userDataKey) || {};
        } catch (error) {
            console.error('Error loading user data:', error);
            return {};
        }
    }

    // ========================================
    // WIDGET TEMPLATES
    // ========================================
    saveWidgetTemplate(name, widgetData) {
        try {
            const templates = this.getItem('widgetTemplates') || {};
            templates[name] = {
                ...widgetData,
                createdAt: new Date().toISOString()
            };
            this.setItem('widgetTemplates', templates);
            return true;
        } catch (error) {
            console.error('Error saving widget template:', error);
            return false;
        }
    }

    loadWidgetTemplates() {
        try {
            return this.getItem('widgetTemplates') || {};
        } catch (error) {
            console.error('Error loading widget templates:', error);
            return {};
        }
    }

    deleteWidgetTemplate(name) {
        try {
            const templates = this.getItem('widgetTemplates') || {};
            delete templates[name];
            this.setItem('widgetTemplates', templates);
            return true;
        } catch (error) {
            console.error('Error deleting widget template:', error);
            return false;
        }
    }

    // ========================================
    // CORE STORAGE METHODS
    // ========================================
    setItem(key, value) {
        const fullKey = this.storagePrefix + key;
        const data = {
            value: value,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(fullKey, JSON.stringify(data));
    }

    getItem(key) {
        const fullKey = this.storagePrefix + key;
        const item = localStorage.getItem(fullKey);
        if (item) {
            try {
                const parsed = JSON.parse(item);
                return parsed.value;
            } catch (error) {
                console.error('Error parsing stored item:', error);
                return null;
            }
        }
        return null;
    }

    removeItem(key) {
        const fullKey = this.storagePrefix + key;
        localStorage.removeItem(fullKey);
    }

    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.storagePrefix)) {
                localStorage.removeItem(key);
            }
        });
    }

    // ========================================
    // AUTO-SAVE FUNCTIONALITY
    // ========================================
    enableAutoSave(callback, intervalMs = 30000) {
        // Auto-save every 30 seconds by default
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            if (typeof callback === 'function') {
                callback();
            }
        }, intervalMs);
        
        console.log(`Auto-save enabled with ${intervalMs/1000}s interval`);
    }

    disableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('Auto-save disabled');
        }
    }

    // ========================================
    // STORAGE ANALYTICS
    // ========================================
    getStorageStats() {
        let totalSize = 0;
        let itemCount = 0;
        const items = {};
        
        for (let key in localStorage) {
            if (key.startsWith(this.storagePrefix)) {
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                totalSize += size;
                itemCount++;
                
                const shortKey = key.replace(this.storagePrefix, '');
                items[shortKey] = {
                    size: size,
                    sizeFormatted: this.formatBytes(size)
                };
            }
        }
        
        return {
            totalSize: totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            itemCount: itemCount,
            items: items,
            availableSpace: this.getAvailableStorage()
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getAvailableStorage() {
        try {
            const testKey = 'storage-test';
            const testValue = 'x'.repeat(1024); // 1KB
            let availableSize = 0;
            
            // This is an approximation - actual available storage varies
            for (let i = 0; i < 10240; i++) { // Test up to ~10MB
                try {
                    localStorage.setItem(testKey, testValue.repeat(i));
                    availableSize = i * 1024;
                } catch (e) {
                    break;
                }
            }
            
            localStorage.removeItem(testKey);
            return this.formatBytes(availableSize);
        } catch (error) {
            return 'Unknown';
        }
    }

    // ========================================
    // BACKUP AND RESTORE
    // ========================================
    createBackup() {
        const backup = {
            layout: this.loadLayout(),
            settings: this.loadSettings(),
            userData: this.loadUserData(),
            widgetTemplates: this.loadWidgetTemplates(),
            createdAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `web3-demo-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    }

    restoreBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    if (this.validateBackupData(backupData)) {
                        // Restore all data
                        if (backupData.layout) this.saveLayout(backupData.layout);
                        if (backupData.settings) this.saveSettings(backupData.settings);
                        if (backupData.userData) this.saveUserData(backupData.userData);
                        if (backupData.widgetTemplates) {
                            this.setItem('widgetTemplates', backupData.widgetTemplates);
                        }
                        
                        resolve(backupData);
                    } else {
                        reject(new Error('Invalid backup file format'));
                    }
                } catch (error) {
                    reject(new Error('Error parsing backup file: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    validateBackupData(data) {
        return data && 
               typeof data === 'object' && 
               data.version && 
               data.createdAt;
    }

    // ========================================
    // MIGRATION UTILITIES
    // ========================================
    migrateData(fromVersion, toVersion) {
        console.log(`Migrating data from version ${fromVersion} to ${toVersion}`);
        
        // Add migration logic here as the app evolves
        if (fromVersion === '0.9' && toVersion === '1.0') {
            // Example migration
            const oldLayout = this.getItem('oldLayoutKey');
            if (oldLayout) {
                this.saveLayout(oldLayout);
                this.removeItem('oldLayoutKey');
            }
        }
        
        // Update version in settings
        const settings = this.loadSettings();
        settings.version = toVersion;
        this.saveSettings(settings);
    }

    // ========================================
    // CLEANUP UTILITIES
    // ========================================
    cleanupOldData(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const keys = Object.keys(localStorage);
        let removedCount = 0;
        
        keys.forEach(key => {
            if (key.startsWith(this.storagePrefix)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item.timestamp && new Date(item.timestamp) < cutoffDate) {
                        localStorage.removeItem(key);
                        removedCount++;
                    }
                } catch (error) {
                    // If we can't parse it, it might be old format - consider removing
                    console.warn('Found unparseable storage item:', key);
                }
            }
        });
        
        console.log(`Cleaned up ${removedCount} old storage items`);
        return removedCount;
    }
}

// ========================================
// INTEGRATION INSTRUCTIONS
// ========================================
/*
TO USE STORAGE MANAGER:

1. BASIC USAGE:
```javascript
const storage = new StorageManager();

// Save layout
const layoutData = {
    widgets: [...],
    background: 'url(...)'
};
storage.saveLayout(layoutData);

// Load layout
const layout = storage.loadLayout();
if (layout) {
    // Restore widgets and background
}
```

2. AUTO-SAVE SETUP:
```javascript
// Enable auto-save every 30 seconds
storage.enableAutoSave(() => {
    const currentLayout = getCurrentLayoutData();
    storage.saveLayout(currentLayout);
}, 30000);
```

3. SETTINGS MANAGEMENT:
```javascript
// Save user preferences
storage.saveSettings({
    theme: 'dark',
    autoSave: true,
    defaultWidgetStyle: {...}
});

// Load settings on app start
const settings = storage.loadSettings();
applySettings(settings);
```

4. BACKUP/RESTORE:
```javascript
// Create backup file
storage.createBackup();

// Restore from file
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    try {
        await storage.restoreBackup(file);
        location.reload(); // Reload to apply changes
    } catch (error) {
        alert('Backup restore failed: ' + error.message);
    }
});
```

5. STORAGE MONITORING:
```javascript
// Check storage usage
const stats = storage.getStorageStats();
console.log('Storage used:', stats.totalSizeFormatted);
console.log('Items stored:', stats.itemCount);

// Clean up old data
storage.cleanupOldData(30); // Remove items older than 30 days
```

PRODUCTION CONSIDERATIONS:
- Monitor localStorage quotas (usually 5-10MB)
- Implement data compression for large layouts
- Add error handling for storage quota exceeded
- Consider IndexedDB for larger data storage
- Implement cloud backup for user accounts

STORAGE LIMITS:
- localStorage: ~5-10MB per domain
- Consider chunking large data
- Compress JSON data if needed
- Monitor and clean up regularly

ERROR HANDLING:
- Always wrap storage operations in try-catch
- Provide fallbacks for storage failures
- Inform users when storage is full
- Implement graceful degradation
*/

// Create global storage instance
let storageManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    storageManager = new StorageManager();
    
    // Load saved settings on startup
    const settings = storageManager.loadSettings();
    if (settings.autoSave) {
        // Enable auto-save if user preference is set
        storageManager.enableAutoSave(() => {
            // This will be called every 30 seconds to auto-save
            console.log('Auto-saving layout...');
        });
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}