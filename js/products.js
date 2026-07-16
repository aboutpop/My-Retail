/**
 * Products Management Logic
 * Handles all products-specific functionality
 */

// ========================================
// Global Variables
// ========================================
let allProducts = [];
let categories = [];
let currentSort = { field: 'id', order: 'desc' };
let currentFilters = {
    search: '',
    category: 'all',
    stock: 'all'
};

// ========================================
// Initialize Products Page
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    setCurrentDate();
    await Promise.all([
        loadStoreName(),
        loadCategories(),
        loadProducts()
    ]);
    setupEventListeners();
    
    console.log('✅ Products page initialized');
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
            document.title = `จัดการสินค้า - ${storeName}`;
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
            categories = res.data.categories;
            populateCategoryFilters();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateCategoryFilters() {
    // Toolbar category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="all">ทุกหมวดหมู่</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        });
    }
    
    // Modal category select
    const productCategory = document.getElementById('product-category');
    if (productCategory) {
        productCategory.innerHTML = '<option value="">-- เลือกหมวดหมู่ --</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            productCategory.appendChild(option);
        });
    }
}

// ========================================
// Load Products
// ========================================
async function loadProducts() {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.PRODUCTS, { limit: 10000 });
        if (res.success && res.data && res.data.products) {
            allProducts = res.data.products;
            updateStats();
            renderProducts();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('ไม่สามารถโหลดข้อมูลสินค้าได้', 'error');
    }
}

function updateStats() {
    const total = allProducts.length;
    const inStock = allProducts.filter(p => !p.no_stock_count && parseInt(p.stock || 0) > 0).length;
    const lowStock = allProducts.filter(p => !p.no_stock_count && parseInt(p.stock || 0) > 0 && parseInt(p.stock || 0) < 10).length;
    const outOfStock = allProducts.filter(p => !p.no_stock_count && parseInt(p.stock || 0) === 0).length;
    
    const statTotal = document.getElementById('stat-total');
    const statInStock = document.getElementById('stat-in-stock');
    const statLowStock = document.getElementById('stat-low-stock');
    const statOutOfStock = document.getElementById('stat-out-of-stock');
    
    if (statTotal) statTotal.textContent = total.toLocaleString();
    if (statInStock) statInStock.textContent = inStock.toLocaleString();
    if (statLowStock) statLowStock.textContent = lowStock.toLocaleString();
    if (statOutOfStock) statOutOfStock.textContent = outOfStock.toLocaleString();
}

function renderProducts() {
    const tbody = document.getElementById('products-table');
    if (!tbody) return;
    
    // Apply filters
    let filtered = allProducts;
    
    // Search filter
    if (currentFilters.search) {
        const search = currentFilters.search.toLowerCase();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) ||
            (p.barcode && p.barcode.toLowerCase().includes(search))
        );
    }
    
    // Category filter
    if (currentFilters.category !== 'all') {
        const catId = parseInt(currentFilters.category);
        filtered = filtered.filter(p => parseInt(p.category_id) === catId);
    }
    
    // Stock filter
    if (currentFilters.stock !== 'all') {
        filtered = filtered.filter(p => {
            const stock = parseInt(p.stock || 0);
            const noStockCount = p.no_stock_count;
            
            switch (currentFilters.stock) {
                case 'in-stock':
                    return !noStockCount && stock > 0;
                case 'low-stock':
                    return !noStockCount && stock > 0 && stock < 10;
                case 'out-of-stock':
                    return !noStockCount && stock === 0;
                default:
                    return true;
            }
        });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        let aVal = a[currentSort.field];
        let bVal = b[currentSort.field];
        
        // Handle numeric fields
        if (['price', 'cost', 'stock'].includes(currentSort.field)) {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        } else {
            aVal = (aVal || '').toString().toLowerCase();
            bVal = (bVal || '').toString().toLowerCase();
        }
        
        if (currentSort.order === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <p>ไม่พบข้อมูลสินค้า</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(product => `
        <tr>
            <td><code>${escapeHtml(product.barcode || '-')}</code></td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.category_name || '-')}</td>
            <td style="text-align: right;">${formatMoney(product.price)}</td>
            <td style="text-align: right;">${formatMoney(product.cost)}</td>
            <td style="text-align: center;">
                ${product.no_stock_count 
                    ? '<span class="badge badge-info">ไม่นับ</span>' 
                    : `<span class="badge ${getStockBadgeClass(product.stock)}">${product.stock}</span>`
                }
            </td>
            <td>${escapeHtml(product.unit || '-')}</td>
            <td style="text-align: center;">
                <div class="btn-icon-group">
                    <button class="btn-icon edit" onclick="editProduct(${product.id})" title="แก้ไข">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteProduct(${product.id}, '${escapeHtml(product.name)}')" title="ลบ">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getStockBadgeClass(stock) {
    const stockNum = parseInt(stock || 0);
    if (stockNum === 0) return 'badge-danger';
    if (stockNum < 10) return 'badge-warning';
    return 'badge-success';
}
// ========================================
// Product CRUD Operations
// ========================================
function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const productId = document.getElementById('product-id');
    const productBarcode = document.getElementById('product-barcode');
    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const productCost = document.getElementById('product-cost');
    const productStock = document.getElementById('product-stock');
    const productUnit = document.getElementById('product-unit');
    const productCategory = document.getElementById('product-category');
    const productNoStockCount = document.getElementById('product-no-stock-count');
    
    if (product) {
        // Edit mode
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> แก้ไขสินค้า';
        if (productId) productId.value = product.id;
        if (productBarcode) productBarcode.value = product.barcode || '';
        if (productName) productName.value = product.name || '';
        if (productPrice) productPrice.value = product.price || 0;
        if (productCost) productCost.value = product.cost || 0;
        if (productStock) productStock.value = product.stock || 0;
        if (productUnit) productUnit.value = product.unit || 'ชิ้น';
        if (productCategory) productCategory.value = product.category_id || '';
        if (productNoStockCount) productNoStockCount.checked = product.no_stock_count || false;
    } else {
        // Add mode
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> เพิ่มสินค้าใหม่';
        if (productId) productId.value = '';
        if (productBarcode) productBarcode.value = '';
        if (productName) productName.value = '';
        if (productPrice) productPrice.value = '';
        if (productCost) productCost.value = '0';
        if (productStock) productStock.value = '0';
        if (productUnit) productUnit.value = 'ชิ้น';
        if (productCategory) productCategory.value = '';
        if (productNoStockCount) productNoStockCount.checked = false;
    }
    
    if (modal) modal.style.display = 'flex';
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.style.display = 'none';
}

async function saveProduct() {
    const productId = document.getElementById('product-id')?.value;
    const barcode = document.getElementById('product-barcode')?.value.trim();
    const name = document.getElementById('product-name')?.value.trim();
    const price = parseFloat(document.getElementById('product-price')?.value) || 0;
    const cost = parseFloat(document.getElementById('product-cost')?.value) || 0;
    const stock = parseInt(document.getElementById('product-stock')?.value) || 0;
    const unit = document.getElementById('product-unit')?.value.trim() || 'ชิ้น';
    const categoryId = document.getElementById('product-category')?.value;
    const noStockCount = document.getElementById('product-no-stock-count')?.checked || false;
    
    // Validation
    if (!barcode) {
        showToast('กรุณากรอกบาร์โค้ด', 'warning');
        return;
    }
    if (!name) {
        showToast('กรุณากรอกชื่อสินค้า', 'warning');
        return;
    }
    if (price <= 0) {
        showToast('กรุณากรอกราคาขายมากกว่า 0', 'warning');
        return;
    }
    
    const productData = {
        barcode: barcode,
        name: name,
        price: price,
        cost: cost,
        stock: noStockCount ? 0 : stock,
        unit: unit,
        category_id: categoryId ? parseInt(categoryId) : null,
        no_stock_count: noStockCount
    };
    
    try {
        let res;
        if (productId) {
            // Update
            productData.id = parseInt(productId);
            res = await apiPut(API_CONFIG.ENDPOINTS.PRODUCTS, productData);
        } else {
            // Create
            res = await apiPost(API_CONFIG.ENDPOINTS.PRODUCTS, productData);
        }
        
        if (res.success) {
            showToast(productId ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ', 'success');
            closeProductModal();
            await loadProducts();
        } else {
            showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
}

function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        openProductModal(product);
    }
}

async function deleteProduct(productId, productName) {
    if (!confirm(`ต้องการลบสินค้า "${productName}" หรือไม่?`)) {
        return;
    }
    
    try {
        const res = await apiDeleteWithParams(API_CONFIG.ENDPOINTS.PRODUCTS, { id: productId });
        
        if (res.success) {
            showToast('ลบสินค้าสำเร็จ', 'success');
            await loadProducts();
        } else {
            showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            currentFilters.search = e.target.value;
            renderProducts();
        }, 300));
        
        // Barcode scanner (Enter key)
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const barcode = e.target.value.trim();
                if (barcode) {
                    const product = allProducts.find(p => p.barcode === barcode);
                    if (product) {
                        openProductModal(product);
                        searchInput.value = '';
                    } else {
                        showToast('ไม่พบสินค้าที่มีบาร์โค้ดนี้', 'warning');
                    }
                }
            }
        });
    }
    
    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            renderProducts();
        });
    }
    
    // Stock filter
    const stockFilter = document.getElementById('stock-filter');
    if (stockFilter) {
        stockFilter.addEventListener('change', (e) => {
            currentFilters.stock = e.target.value;
            renderProducts();
        });
    }
    
    // Clear filters
    const btnClearFilters = document.getElementById('btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => {
            currentFilters = { search: '', category: 'all', stock: 'all' };
            const searchInput = document.getElementById('search-input');
            const categoryFilter = document.getElementById('category-filter');
            const stockFilter = document.getElementById('stock-filter');
            
            if (searchInput) searchInput.value = '';
            if (categoryFilter) categoryFilter.value = 'all';
            if (stockFilter) stockFilter.value = 'all';
            
            renderProducts();
        });
    }
    
    // Add product button
    const btnAddProduct = document.getElementById('btn-add-product');
    if (btnAddProduct) {
        btnAddProduct.addEventListener('click', () => openProductModal());
    }
    
    // Product modal
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const btnSaveProduct = document.getElementById('btn-save-product');
    const productModal = document.getElementById('product-modal');
    
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeProductModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeProductModal);
    if (btnSaveProduct) btnSaveProduct.addEventListener('click', saveProduct);
    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) closeProductModal();
        });
    }
    
    // Sortable headers
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            if (currentSort.field === field) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.order = 'asc';
            }
            
            // Update UI
            document.querySelectorAll('.sortable').forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            header.classList.add(currentSort.order);
            
            renderProducts();
        });
    });
    
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