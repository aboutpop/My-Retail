/**
 * Categories Management Logic
 * Handles all categories-specific functionality
 */

// ========================================
// Global Variables
// ========================================
let allCategories = [];
let allProducts = [];

// ========================================
// Initialize Categories Page
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    setCurrentDate();
    await Promise.all([
        loadStoreName(),
        loadCategories(),
        loadProducts()
    ]);
    setupEventListeners();
    
    console.log('✅ Categories page initialized');
});

function setCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('th-TH', options);
    }
}

async function loadStoreName() {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.SETTINGS);
        if (res.success && res.data && res.data.settings) {
            const storeName = res.data.settings.store_name || 'ร้านค้า';
            const storeNameElement = document.getElementById('store-name');
            if (storeNameElement) {
                storeNameElement.textContent = storeName;
            }
            document.title = `จัดการหมวดหมู่ - ${storeName}`;
        }
    } catch (error) {
        console.error('Error loading store name:', error);
    }
}

// ========================================
// Load Categories
// ========================================
async function loadCategories() {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.CATEGORIES);
        if (res.success && res.data && res.data.categories) {
            allCategories = res.data.categories;
            updateStats();
            renderCategories();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('ไม่สามารถโหลดข้อมูลหมวดหมู่ได้', 'error');
    }
}

async function loadProducts() {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.PRODUCTS, { limit: 10000 });
        if (res.success && res.data && res.data.products) {
            allProducts = res.data.products;
            updateStats();
            renderCategories();
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function updateStats() {
    const totalCategories = allCategories.length;
    const totalProducts = allProducts.length;
    
    // นับหมวดหมู่ที่ไม่มีสินค้า
    const categoryProductCount = {};
    allProducts.forEach(p => {
        const catId = p.category_id;
        if (catId) {
            categoryProductCount[catId] = (categoryProductCount[catId] || 0) + 1;
        }
    });
    
    const emptyCategories = allCategories.filter(cat => !categoryProductCount[cat.id]).length;
    
    const statTotalCategories = document.getElementById('stat-total-categories');
    const statTotalProducts = document.getElementById('stat-total-products');
    const statEmptyCategories = document.getElementById('stat-empty-categories');
    
    if (statTotalCategories) statTotalCategories.textContent = totalCategories.toLocaleString();
    if (statTotalProducts) statTotalProducts.textContent = totalProducts.toLocaleString();
    if (statEmptyCategories) statEmptyCategories.textContent = emptyCategories.toLocaleString();
}

function renderCategories() {
    const tbody = document.getElementById('categories-table');
    if (!tbody) return;
    
    if (allCategories.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <p>ยังไม่มีหมวดหมู่</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // เรียงตาม sort_order
    const sorted = [...allCategories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    // นับจำนวนสินค้าในแต่ละหมวดหมู่
    const categoryProductCount = {};
    allProducts.forEach(p => {
        const catId = p.category_id;
        if (catId) {
            categoryProductCount[catId] = (categoryProductCount[catId] || 0) + 1;
        }
    });
    
    tbody.innerHTML = sorted.map((category, index) => {
        const productCount = categoryProductCount[category.id] || 0;
        const isFirst = index === 0;
        const isLast = index === sorted.length - 1;
        
        return `
            <tr>
                <td style="text-align: center; font-weight: 600;">${category.sort_order || index + 1}</td>
                <td><strong>${escapeHtml(category.name)}</strong></td>
                <td class="text-muted">${escapeHtml(category.description || '-')}</td>
                <td style="text-align: center;">
                    <span class="badge ${productCount > 0 ? 'badge-success' : 'badge-warning'}">
                        ${productCount}
                    </span>
                </td>
                <td style="text-align: center;">
                    <div class="btn-icon-group">
                        <button class="btn-icon move-up" onclick="moveCategory(${category.id}, 'up')" 
                                ${isFirst ? 'disabled' : ''} title="เลื่อนขึ้น">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="btn-icon move-down" onclick="moveCategory(${category.id}, 'down')" 
                                ${isLast ? 'disabled' : ''} title="เลื่อนลง">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button class="btn-icon edit" onclick="editCategory(${category.id})" title="แก้ไข">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteCategory(${category.id}, '${escapeHtml(category.name)}')" title="ลบ">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ========================================
// Category CRUD Operations
// ========================================
function openCategoryModal(category = null) {
    const modal = document.getElementById('category-modal');
    const modalTitle = document.getElementById('modal-title');
    const categoryId = document.getElementById('category-id');
    const categoryName = document.getElementById('category-name');
    const categoryDescription = document.getElementById('category-description');
    
    if (category) {
        // Edit mode
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> แก้ไขหมวดหมู่';
        if (categoryId) categoryId.value = category.id;
        if (categoryName) categoryName.value = category.name || '';
        if (categoryDescription) categoryDescription.value = category.description || '';
    } else {
        // Add mode
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> เพิ่มหมวดหมู่';
        if (categoryId) categoryId.value = '';
        if (categoryName) categoryName.value = '';
        if (categoryDescription) categoryDescription.value = '';
    }
    
    if (modal) modal.style.display = 'flex';
}

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.style.display = 'none';
}

async function saveCategory() {
    const categoryId = document.getElementById('category-id')?.value;
    const name = document.getElementById('category-name')?.value.trim();
    const description = document.getElementById('category-description')?.value.trim();
    
    // Validation
    if (!name) {
        showToast('กรุณากรอกชื่อหมวดหมู่', 'warning');
        return;
    }
    
    const categoryData = {
        name: name,
        description: description
    };
    
    try {
        let res;
        if (categoryId) {
            // Update
            categoryData.id = parseInt(categoryId);
            res = await apiPut(API_CONFIG.ENDPOINTS.CATEGORIES, categoryData);
        } else {
            // Create
            res = await apiPost(API_CONFIG.ENDPOINTS.CATEGORIES, categoryData);
        }
        
        if (res.success) {
            showToast(categoryId ? 'แก้ไขหมวดหมู่สำเร็จ' : 'เพิ่มหมวดหมู่สำเร็จ', 'success');
            closeCategoryModal();
            await loadCategories();
        } else {
            showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
}

function editCategory(categoryId) {
    const category = allCategories.find(c => c.id === categoryId);
    if (category) {
        openCategoryModal(category);
    }
}

async function deleteCategory(categoryId, categoryName) {
    // ตรวจสอบว่ามีสินค้าในหมวดหมู่นี้หรือไม่
    const productCount = allProducts.filter(p => p.category_id === categoryId).length;
    
    let confirmMsg = `ต้องการลบหมวดหมู่ "${categoryName}" หรือไม่?`;
    if (productCount > 0) {
        confirmMsg += `\n\n⚠️ มีสินค้า ${productCount} รายการในหมวดหมู่นี้\nสินค้าจะถูกลบหมวดหมู่ (กลายเป็น Uncategorized)`;
    }
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        const res = await apiDeleteWithParams(API_CONFIG.ENDPOINTS.CATEGORIES, { id: categoryId });
        
        if (res.success) {
            showToast('ลบหมวดหมู่สำเร็จ', 'success');
            await Promise.all([loadCategories(), loadProducts()]);
        } else {
            showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
}

// ========================================
// Move Category (Reorder)
// ========================================
async function moveCategory(categoryId, direction) {
    const sorted = [...allCategories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const currentIndex = sorted.findIndex(c => c.id === categoryId);
    
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'up') {
        newIndex = currentIndex - 1;
        if (newIndex < 0) return;
    } else {
        newIndex = currentIndex + 1;
        if (newIndex >= sorted.length) return;
    }
    
    // สลับ sort_order
    const currentCategory = sorted[currentIndex];
    const swapCategory = sorted[newIndex];
    
    const currentOrder = currentCategory.sort_order;
    const swapOrder = swapCategory.sort_order;
    
    try {
        // อัปเดตทั้งสองหมวดหมู่
        await Promise.all([
            apiPut(API_CONFIG.ENDPOINTS.CATEGORIES, {
                id: currentCategory.id,
                sort_order: swapOrder
            }),
            apiPut(API_CONFIG.ENDPOINTS.CATEGORIES, {
                id: swapCategory.id,
                sort_order: currentOrder
            })
        ]);
        
        showToast('เปลี่ยนลำดับสำเร็จ', 'success');
        await loadCategories();
    } catch (error) {
        console.error('Error moving category:', error);
        showToast('เกิดข้อผิดพลาดในการเปลี่ยนลำดับ', 'error');
    }
}

// ========================================
// Reset Order
// ========================================
async function resetOrder() {
    if (!confirm('ต้องการรีเซ็ตลำดับหมวดหมู่เป็นค่าเริ่มต้นหรือไม่?')) {
        return;
    }
    
    try {
        const res = await apiPost(API_CONFIG.ENDPOINTS.CATEGORIES + '?action=reset_order', {});
        
        if (res.success) {
            showToast('รีเซ็ตลำดับสำเร็จ', 'success');
            await loadCategories();
        } else {
            showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (error) {
        console.error('Error resetting order:', error);
        showToast('เกิดข้อผิดพลาดในการรีเซ็ตลำดับ', 'error');
    }
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    // Add category button
    const btnAddCategory = document.getElementById('btn-add-category');
    if (btnAddCategory) {
        btnAddCategory.addEventListener('click', () => openCategoryModal());
    }
    
    // Reset order button
    const btnResetOrder = document.getElementById('btn-reset-order');
    if (btnResetOrder) {
        btnResetOrder.addEventListener('click', resetOrder);
    }
    
    // Category modal
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const btnSaveCategory = document.getElementById('btn-save-category');
    const categoryModal = document.getElementById('category-modal');
    
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeCategoryModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeCategoryModal);
    if (btnSaveCategory) btnSaveCategory.addEventListener('click', saveCategory);
    if (categoryModal) {
        categoryModal.addEventListener('click', (e) => {
            if (e.target === categoryModal) closeCategoryModal();
        });
    }
    
    // Settings modal
    const settingsModal = document.getElementById('settings-modal');
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnCancelSettings = document.getElementById('btn-cancel-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsContents = document.querySelectorAll('.settings-content');

    if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', async (e) => {
            e.preventDefault();
            if (settingsModal) settingsModal.style.display = 'flex';
            await loadSettingsForModal();
        });
    }

    if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }

    if (btnCancelSettings) {
        btnCancelSettings.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.style.display = 'none';
        });
    }

    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            settingsTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            settingsContents.forEach(content => content.style.display = 'none');
            const tabContent = document.getElementById(`tab-${tabName}`);
            if (tabContent) tabContent.style.display = 'block';
        });
    });

    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', async () => {
            const settingStoreName = document.getElementById('setting-store-name');
            const settingStoreAddress = document.getElementById('setting-store-address');
            const settingReceiptFooter = document.getElementById('setting-receipt-footer');
            const settingWelcomeMessage = document.getElementById('setting-welcome-message');
            const settingQuickItemsPerRow = document.getElementById('setting-quick-items-per-row');
            const settingQuickItemsCount = document.getElementById('setting-quick-items-count');
            const settingQuickItemsDays = document.getElementById('setting-quick-items-days');
            
            const newSettings = {
                store_name: settingStoreName ? settingStoreName.value : '',
                store_address: settingStoreAddress ? settingStoreAddress.value : '',
                receipt_footer: settingReceiptFooter ? settingReceiptFooter.value : '',
                welcome_message: settingWelcomeMessage ? settingWelcomeMessage.value : '',
                quick_items_per_row: settingQuickItemsPerRow ? settingQuickItemsPerRow.value : '6',
                quick_items_count: settingQuickItemsCount ? settingQuickItemsCount.value : '30',
                quick_items_days: settingQuickItemsDays ? settingQuickItemsDays.value : '30'
            };

            try {
                const res = await apiPut(API_CONFIG.ENDPOINTS.SETTINGS, { settings: newSettings });
                
                if (res.success) {
                    showToast('บันทึกการตั้งค่าสำเร็จ', 'success');
                    if (settingsModal) settingsModal.style.display = 'none';
                    await loadStoreName();
                } else {
                    showToast('เกิดข้อผิดพลาด: ' + res.message, 'error');
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                showToast('ไม่สามารถบันทึกการตั้งค่าได้', 'error');
            }
        });
    }
}

async function loadSettingsForModal() {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.SETTINGS);
        if (res.success && res.data && res.data.settings) {
            const s = res.data.settings;
            const settingStoreName = document.getElementById('setting-store-name');
            const settingStoreAddress = document.getElementById('setting-store-address');
            const settingReceiptFooter = document.getElementById('setting-receipt-footer');
            const settingWelcomeMessage = document.getElementById('setting-welcome-message');
            const settingQuickItemsPerRow = document.getElementById('setting-quick-items-per-row');
            const settingQuickItemsCount = document.getElementById('setting-quick-items-count');
            const settingQuickItemsDays = document.getElementById('setting-quick-items-days');
            
            if (settingStoreName) settingStoreName.value = s.store_name || '';
            if (settingStoreAddress) settingStoreAddress.value = s.store_address || '';
            if (settingReceiptFooter) settingReceiptFooter.value = s.receipt_footer || '';
            if (settingWelcomeMessage) settingWelcomeMessage.value = s.welcome_message || '';
            if (settingQuickItemsPerRow) settingQuickItemsPerRow.value = s.quick_items_per_row || '6';
            if (settingQuickItemsCount) settingQuickItemsCount.value = s.quick_items_count || '30';
            if (settingQuickItemsDays) settingQuickItemsDays.value = s.quick_items_days || '30';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}