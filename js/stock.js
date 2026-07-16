/**
 * Stock Management Logic
 * Handles all stock-specific functionality
 */

// ========================================
// Global Variables
// ========================================
let allProducts = [];
let categories = [];
let stockLogs = [];
let stockInItems = []; // รายการสินค้าที่จะรับเข้า
let currentProduct = null; // สินค้าที่กำลังดูรายละเอียด
let pendingBarcode = null;

// ========================================
// Initialize Stock Page
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    setCurrentDate();
    await Promise.all([
        loadStoreName(),
        loadCategories(),
        loadProducts(),
        loadStockLogs()
    ]);
    setupEventListeners();
    updateStats();
    
    console.log('✅ Stock page initialized');
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
            document.title = `การจัดการสต๊อก - ${storeName}`;
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
            populateCategorySelect();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateCategorySelect() {
    const categorySelect = document.getElementById('quick-add-category');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">-- เลือกหมวดหมู่ --</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
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
            renderLowStockTable();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('ไม่สามารถโหลดข้อมูลสินค้าได้', 'error');
    }
}

// ========================================
// Load Stock Logs
// ========================================
async function loadStockLogs() {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.STOCK_LOGS, { limit: 1000 });
        if (res.success && res.data && res.data.logs) {
            stockLogs = res.data.logs;
            renderStockLogsTable();
        }
    } catch (error) {
        console.error('Error loading stock logs:', error);
    }
}

// ========================================
// Update Stats
// ========================================
function updateStats() {
    const totalProducts = allProducts.length;
    const lowStock = allProducts.filter(p => !p.no_stock_count && parseInt(p.stock || 0) < 10 && parseInt(p.stock || 0) >= 0).length;
    
    // นับการรับเข้าวันนี้
    const today = new Date().toISOString().split('T')[0];
    const stockInToday = stockLogs.filter(log => 
        log.change_type === 'stock_in' && 
        log.created_at && log.created_at.startsWith(today)
    ).length;
    
    // ปรับสต็อกครั้งล่าสุด
    const lastAdjustment = stockLogs.find(log => log.change_type === 'adjustment');
    const lastAdjustmentDate = lastAdjustment ? formatDate(lastAdjustment.created_at, { showYear: false }) : '-';
    
    const statTotalProducts = document.getElementById('stat-total-products');
    const statLowStock = document.getElementById('stat-low-stock');
    const statStockInToday = document.getElementById('stat-stock-in-today');
    const statLastAdjustment = document.getElementById('stat-last-adjustment');
    
    if (statTotalProducts) statTotalProducts.textContent = totalProducts.toLocaleString();
    if (statLowStock) statLowStock.textContent = lowStock.toLocaleString();
    if (statStockInToday) statStockInToday.textContent = stockInToday.toLocaleString();
    if (statLastAdjustment) statLastAdjustment.textContent = lastAdjustmentDate;
}

// ========================================
// Render Low Stock Table
// ========================================
function renderLowStockTable() {
    const tbody = document.getElementById('low-stock-table');
    if (!tbody) return;
    
    const lowStockProducts = allProducts.filter(p => 
        !p.no_stock_count && parseInt(p.stock || 0) < 10 && parseInt(p.stock || 0) >= 0
    );
    
    if (lowStockProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-check-circle fa-2x mb-2"></i>
                    <p>สินค้าทั้งหมดมีสต็อกเพียงพอ</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = lowStockProducts.map(product => {
        const stock = parseInt(product.stock || 0);
        const statusClass = stock === 0 ? 'badge-danger' : 'badge-warning';
        const statusText = stock === 0 ? 'หมดสต็อก' : 'สต็อกต่ำ';
        
        return `
            <tr>
                <td><code>${escapeHtml(product.barcode || '-')}</code></td>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.category_name || '-')}</td>
                <td style="text-align: center;">
                    <span class="badge ${statusClass}">${stock}</span>
                </td>
                <td style="text-align: center;">
                    <span class="badge ${statusClass}">${statusText}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// ========================================
// Render Stock Logs Table
// ========================================
function renderStockLogsTable(filter = 'all', search = '') {
    const tbody = document.getElementById('stock-logs-table');
    if (!tbody) return;
    
    let filtered = stockLogs;
    
    // Apply filter
    if (filter !== 'all') {
        filtered = filtered.filter(log => log.change_type === filter);
    }
    
    // Apply search
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(log => 
            (log.product_name && log.product_name.toLowerCase().includes(searchLower)) ||
            (log.reason && log.reason.toLowerCase().includes(searchLower)) ||
            (log.reference_id && log.reference_id.toString().includes(search))
        );
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p>ไม่พบข้อมูลประวัติการเปลี่ยนแปลง</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const changeTypeLabels = {
        'sale': { label: 'ขาย', class: 'badge-danger' },
        'return': { label: 'คืนสินค้า', class: 'badge-warning' },
        'adjustment': { label: 'ปรับสต๊อก', class: 'badge-info' },
        'stock_in': { label: 'รับเข้า', class: 'badge-success' }
    };
    
    tbody.innerHTML = filtered.map(log => {
        const date = formatDate(log.created_at, { showTime: true, showYear: false });
        const changeType = changeTypeLabels[log.change_type] || { label: log.change_type, class: 'badge-info' };
        const changeClass = log.quantity_change > 0 ? 'text-success' : 'text-danger';
        const changeSign = log.quantity_change > 0 ? '+' : '';
        
        return `
            <tr>
                <td>${date}</td>
                <td>${escapeHtml(log.product_name || '-')}</td>
                <td><span class="badge ${changeType.class}">${changeType.label}</span></td>
                <td style="text-align: center;">${log.current_stock - log.quantity_change}</td>
                <td style="text-align: center;" class="${changeClass}">
                    <strong>${changeSign}${log.quantity_change}</strong>
                </td>
                <td>${escapeHtml(log.reason || '-')}</td>
                <td>${log.reference_id || '-'}</td>
            </tr>
        `;
    }).join('');
}

// ========================================
// Stock In Management
// ========================================
function renderStockInTable() {
    const tbody = document.getElementById('stock-in-table-body');
    if (!tbody) return;
    
    if (stockInItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p>ยังไม่มีรายการสินค้าเข้า</p>
                    <small>สแกนบาร์โค้ดหรือค้นหาสินค้าเพื่อเพิ่มรายการ</small>
                </td>
            </tr>
        `;
        updateStockInSummary();
        return;
    }
    
    tbody.innerHTML = stockInItems.map((item, index) => `
        <tr>
            <td><code>${escapeHtml(item.barcode || '-')}</code></td>
            <td>${escapeHtml(item.name)}</td>
            <td style="text-align: right;">${formatMoney(item.price)}</td>
            <td style="text-align: right;">${formatMoney(item.cost)}</td>
            <td style="text-align: center;">
                <input type="number" class="qty-input" value="${item.quantity}" min="1" 
                       onchange="updateStockInQty(${index}, this.value)">
            </td>
            <td style="text-align: center;">${item.current_stock}</td>
            <td>${escapeHtml(item.unit || '-')}</td>
            <td style="text-align: center;">
                <button class="action-btn edit" onclick="editStockInItem(${index})" title="แก้ไข">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td style="text-align: center;">
                <button class="action-btn delete" onclick="removeStockInItem(${index})" title="ลบ">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updateStockInSummary();
}

function updateStockInQty(index, newQty) {
    const qty = parseInt(newQty);
    if (qty > 0) {
        stockInItems[index].quantity = qty;
        renderStockInTable();
    }
}

function removeStockInItem(index) {
    stockInItems.splice(index, 1);
    renderStockInTable();
}

function clearStockIn() {
    if (stockInItems.length === 0) return;
    
    if (confirm('ต้องการล้างรายการสินค้าเข้าทั้งหมดหรือไม่?')) {
        stockInItems = [];
        renderStockInTable();
    }
}

function updateStockInSummary() {
    const itemCount = stockInItems.length;
    const totalQty = stockInItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalCost = stockInItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    
    const summaryItemCount = document.getElementById('summary-item-count');
    const summaryTotalQty = document.getElementById('summary-total-qty');
    const summaryTotalCost = document.getElementById('summary-total-cost');
    
    if (summaryItemCount) summaryItemCount.textContent = itemCount;
    if (summaryTotalQty) summaryTotalQty.textContent = totalQty;
    if (summaryTotalCost) summaryTotalCost.textContent = formatMoney(totalCost);
}

// ========================================
// Product Detail Modal
// ========================================
function showProductDetail(product) {
    currentProduct = product;
    
    const detailBarcode = document.getElementById('detail-barcode');
    const detailName = document.getElementById('detail-name');
    const detailStock = document.getElementById('detail-stock');
    const detailUnit = document.getElementById('detail-unit');
    const detailCategory = document.getElementById('detail-category');
    const detailPrice = document.getElementById('detail-price');
    const detailCost = document.getElementById('detail-cost');
    const detailStockInQty = document.getElementById('detail-stock-in-qty');
    const detailNote = document.getElementById('detail-note');
    
    if (detailBarcode) detailBarcode.textContent = product.barcode || '-';
    if (detailName) detailName.textContent = product.name || '-';
    if (detailStock) detailStock.textContent = product.stock || 0;
    if (detailUnit) detailUnit.textContent = product.unit || '-';
    if (detailCategory) detailCategory.textContent = product.category_name || '-';
    if (detailPrice) detailPrice.textContent = formatMoney(product.price);
    if (detailCost) detailCost.textContent = formatMoney(product.cost);
    if (detailStockInQty) detailStockInQty.value = 1;
    if (detailNote) detailNote.value = '';
    
    // Reset cost calculation
    const calcBoxQty = document.getElementById('calc-box-qty');
    const calcBoxPrice = document.getElementById('calc-box-price');
    const calcUnitCost = document.getElementById('calc-unit-cost');
    
    if (calcBoxQty) calcBoxQty.value = 1;
    if (calcBoxPrice) calcBoxPrice.value = 0;
    if (calcUnitCost) calcUnitCost.textContent = formatMoney(0);
    
    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.style.display = 'flex';
}

function closeProductDetailModal() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.style.display = 'none';
    currentProduct = null;
}

// ✅ แก้ไขแล้ว: บันทึกชื่อสินค้าก่อนปิด Modal
function addToStockIn() {
    if (!currentProduct) return;
    
    // ✅ บันทึกชื่อสินค้าและ ID ไว้ก่อน (เพราะ closeProductDetailModal จะตั้งค่า currentProduct = null)
    const productName = currentProduct.name;
    const productId = currentProduct.id;
    const productBarcode = currentProduct.barcode;
    const productPrice = parseFloat(currentProduct.price);
    const productCost = parseFloat(currentProduct.cost);
    const productStock = parseInt(currentProduct.stock || 0);
    const productUnit = currentProduct.unit;
    
    const qty = parseInt(document.getElementById('detail-stock-in-qty')?.value) || 0;
    const note = document.getElementById('detail-note')?.value || '';
    
    if (qty <= 0) {
        showToast('กรุณาระบุจำนวนรับเข้า', 'warning');
        return;
    }
    
    // ตรวจสอบว่ามีสินค้านี้ในรายการแล้วหรือยัง
    const existingIndex = stockInItems.findIndex(item => item.id === productId);
    
    if (existingIndex >= 0) {
        // เพิ่มจำนวนเข้าไป
        stockInItems[existingIndex].quantity += qty;
        if (note) {
            stockInItems[existingIndex].note = (stockInItems[existingIndex].note ? stockInItems[existingIndex].note + ', ' : '') + note;
        }
    } else {
        // เพิ่มรายการใหม่
        stockInItems.push({
            id: productId,
            barcode: productBarcode,
            name: productName,
            price: productPrice,
            cost: productCost,
            quantity: qty,
            current_stock: productStock,
            unit: productUnit,
            note: note
        });
    }
    
    renderStockInTable();
    closeProductDetailModal(); // ✅ ปิด Modal (currentProduct จะกลายเป็น null)
    
    // ✅ ใช้ productName ที่บันทึกไว้ แทน currentProduct.name
    showToast(`เพิ่ม "${productName}" เข้ารายการรับเข้า`, 'success');
    
    // โฟกัสกลับที่ช่องสแกน
    focusBarcodeInput();
}

// ========================================
// Cost Calculation
// ========================================
function calculateUnitCost() {
    const boxQty = parseInt(document.getElementById('calc-box-qty')?.value) || 0;
    const boxPrice = parseFloat(document.getElementById('calc-box-price')?.value) || 0;
    
    if (boxQty > 0 && boxPrice > 0) {
        const unitCost = boxPrice / boxQty;
        const calcUnitCost = document.getElementById('calc-unit-cost');
        if (calcUnitCost) calcUnitCost.textContent = formatMoney(unitCost);
    } else {
        const calcUnitCost = document.getElementById('calc-unit-cost');
        if (calcUnitCost) calcUnitCost.textContent = formatMoney(0);
    }
}

function applyCostCalculation() {
    const boxQty = parseInt(document.getElementById('calc-box-qty')?.value) || 0;
    const boxPrice = parseFloat(document.getElementById('calc-box-price')?.value) || 0;
    
    if (boxQty > 0 && boxPrice > 0) {
        const unitCost = boxPrice / boxQty;
        
        // อัปเดตต้นทุนใน currentProduct
        if (currentProduct) {
            currentProduct.cost = unitCost;
            
            // อัปเดตในฟอร์ม
            const detailCost = document.getElementById('detail-cost');
            if (detailCost) detailCost.textContent = formatMoney(unitCost);
            
            // ตั้งจำนวนรับเข้าเป็นจำนวนในลัง
            const detailStockInQty = document.getElementById('detail-stock-in-qty');
            if (detailStockInQty) detailStockInQty.value = boxQty;
            
            showToast('ใช้ค่าต้นทุนที่คำนวณได้', 'success');
        }
    } else {
        showToast('กรุณากรอกจำนวนในลังและราคาส่ง', 'warning');
    }
}

// ========================================
// Save Stock In
// ========================================
async function saveStockIn() {
    if (stockInItems.length === 0) {
        showToast('ไม่มีรายการสินค้าเข้า', 'warning');
        return;
    }
    
    if (!confirm(`ต้องการบันทึกการรับเข้า ${stockInItems.length} รายการหรือไม่?`)) {
        return;
    }
    
    try {
        // ส่งข้อมูลการรับเข้าแต่ละรายการ
        for (const item of stockInItems) {
            const res = await apiPost(API_CONFIG.ENDPOINTS.STOCK_IN, {
                product_id: item.id,
                quantity: item.quantity,
                cost: item.cost,
                reason: item.note || 'รับเข้าสต๊อก',
                reference_id: null
            });
            
            if (!res.success) {
                showToast(`ไม่สามารถรับเข้า "${item.name}": ${res.message}`, 'error');
                return;
            }
        }
        
        showToast(`บันทึกการรับเข้า ${stockInItems.length} รายการสำเร็จ`, 'success');
        stockInItems = [];
        renderStockInTable();
        
        // โหลดข้อมูลใหม่
        await Promise.all([loadProducts(), loadStockLogs()]);
        updateStats();
        
    } catch (error) {
        console.error('Error saving stock in:', error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
}

// ========================================
// Barcode & Search
// ========================================
function focusBarcodeInput() {
    setTimeout(() => {
        const barcodeInput = document.getElementById('stock-in-barcode');
        if (barcodeInput) barcodeInput.focus();
    }, 100);
}

async function handleBarcodeScan(barcode) {
    if (!barcode) return;
    
    const product = allProducts.find(p => p.barcode === barcode);
    
    if (product) {
        showProductDetail(product);
        const barcodeInput = document.getElementById('stock-in-barcode');
        if (barcodeInput) barcodeInput.value = '';
    } else {
        showBarcodeNotFoundModal(barcode);
        const barcodeInput = document.getElementById('stock-in-barcode');
        if (barcodeInput) barcodeInput.value = '';
    }
}

function searchByName(query) {
    const resultsContainer = document.getElementById('stock-in-search-results');
    if (!resultsContainer) return;
    
    if (query.length < 2) {
        resultsContainer.classList.remove('show');
        return;
    }
    
    const queryLower = query.toLowerCase();
    const products = allProducts
        .filter(p => 
            p.name.toLowerCase().includes(queryLower) ||
            (p.barcode && p.barcode.includes(query))
        )
        .slice(0, 10);
    
    if (products.length > 0) {
        resultsContainer.innerHTML = products.map(p => `
            <div class="search-result-item" data-product-id="${p.id}">
                <div class="search-result-name">${escapeHtml(p.name)}</div>
                <div class="search-result-info">
                    บาร์โค้ด: ${escapeHtml(p.barcode)} | สต็อก: ${p.stock} ${p.unit || ''}
                </div>
            </div>
        `).join('');
        resultsContainer.classList.add('show');
        
        resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                showProductDetail(products[index]);
                resultsContainer.classList.remove('show');
                const searchInput = document.getElementById('stock-in-search');
                if (searchInput) searchInput.value = '';
            });
        });
    } else {
        resultsContainer.classList.remove('show');
    }
}

// ========================================
// Modals
// ========================================
function showBarcodeNotFoundModal(barcode) {
    pendingBarcode = barcode;
    const notFoundBarcode = document.getElementById('not-found-barcode');
    const barcodeNotFoundModal = document.getElementById('barcode-not-found-modal');
    
    if (notFoundBarcode) notFoundBarcode.textContent = barcode;
    if (barcodeNotFoundModal) barcodeNotFoundModal.style.display = 'flex';
}

function hideBarcodeNotFoundModal() {
    const barcodeNotFoundModal = document.getElementById('barcode-not-found-modal');
    if (barcodeNotFoundModal) barcodeNotFoundModal.style.display = 'none';
    pendingBarcode = null;
}

function showQuickAddModal(barcode) {
    hideBarcodeNotFoundModal();
    
    const quickAddBarcode = document.getElementById('quick-add-barcode');
    const quickAddName = document.getElementById('quick-add-name');
    const quickAddPrice = document.getElementById('quick-add-price');
    const quickAddCost = document.getElementById('quick-add-cost');
    const quickAddStock = document.getElementById('quick-add-stock');
    const quickAddUnit = document.getElementById('quick-add-unit');
    
    if (quickAddBarcode) quickAddBarcode.value = barcode;
    if (quickAddName) quickAddName.value = '';
    if (quickAddPrice) quickAddPrice.value = '';
    if (quickAddCost) quickAddCost.value = '0';
    if (quickAddStock) quickAddStock.value = '0';
    if (quickAddUnit) quickAddUnit.value = 'ชิ้น';
    
    const quickAddModal = document.getElementById('quick-add-modal');
    if (quickAddModal) quickAddModal.style.display = 'flex';
    
    setTimeout(() => {
        if (quickAddName) quickAddName.focus();
    }, 100);
}

function hideQuickAddModal() {
    const quickAddModal = document.getElementById('quick-add-modal');
    if (quickAddModal) quickAddModal.style.display = 'none';
}

async function saveQuickAddProduct() {
    const barcode = document.getElementById('quick-add-barcode')?.value.trim();
    const name = document.getElementById('quick-add-name')?.value.trim();
    const price = parseFloat(document.getElementById('quick-add-price')?.value) || 0;
    const cost = parseFloat(document.getElementById('quick-add-cost')?.value) || 0;
    const stock = parseInt(document.getElementById('quick-add-stock')?.value) || 0;
    const categoryId = document.getElementById('quick-add-category')?.value;
    const unit = document.getElementById('quick-add-unit')?.value.trim() || 'ชิ้น';
    
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
    
    try {
        const res = await apiPost(API_CONFIG.ENDPOINTS.PRODUCTS, {
            name: name,
            barcode: barcode,
            barcode_status: 1,
            price: price,
            cost: cost,
            stock: stock,
            unit: unit,
            category_id: categoryId ? parseInt(categoryId) : null,
            category: ''
        });
        
        if (res.success) {
            showToast(`เพิ่มสินค้า "${name}" สำเร็จ`, 'success');
            hideQuickAddModal();
            await loadProducts();
            
            // เปิด modal รายละเอียดสินค้าเพื่อรับเข้า
            const newProduct = allProducts.find(p => p.id === res.data.id);
            if (newProduct) {
                showProductDetail(newProduct);
            }
        } else {
            showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Update active state
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show/hide tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            const tabContent = document.getElementById(`tab-${tabName}`);
            if (tabContent) tabContent.style.display = 'block';
        });
    });
    
    // Barcode input
    const barcodeInput = document.getElementById('stock-in-barcode');
    if (barcodeInput) {
        barcodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const barcode = barcodeInput.value.trim();
                if (barcode) {
                    handleBarcodeScan(barcode);
                }
            }
        });
    }
    
    // Search input
    const searchInput = document.getElementById('stock-in-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            searchByName(e.target.value.trim());
        }, 300));
    }
    
    // Click outside to close search results
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.scan-field')) {
            const searchResults = document.getElementById('stock-in-search-results');
            if (searchResults) searchResults.classList.remove('show');
        }
    });
    
    // Stock in buttons
    const btnClearStockIn = document.getElementById('btn-clear-stock-in');
    const btnSaveStockIn = document.getElementById('btn-save-stock-in');
    
    if (btnClearStockIn) btnClearStockIn.addEventListener('click', clearStockIn);
    if (btnSaveStockIn) btnSaveStockIn.addEventListener('click', saveStockIn);
    
    // Product detail modal
    const btnCloseProductDetail = document.getElementById('btn-close-product-detail');
    const btnCancelProductDetail = document.getElementById('btn-cancel-product-detail');
    const btnAddToStockIn = document.getElementById('btn-add-to-stock-in');
    const productDetailModal = document.getElementById('product-detail-modal');
    
    if (btnCloseProductDetail) btnCloseProductDetail.addEventListener('click', closeProductDetailModal);
    if (btnCancelProductDetail) btnCancelProductDetail.addEventListener('click', closeProductDetailModal);
    if (btnAddToStockIn) btnAddToStockIn.addEventListener('click', addToStockIn);
    if (productDetailModal) {
        productDetailModal.addEventListener('click', (e) => {
            if (e.target === productDetailModal) closeProductDetailModal();
        });
    }
    
    // Cost calculation
    const calcBoxQty = document.getElementById('calc-box-qty');
    const calcBoxPrice = document.getElementById('calc-box-price');
    const btnApplyCost = document.getElementById('btn-apply-cost');
    
    if (calcBoxQty) calcBoxQty.addEventListener('input', calculateUnitCost);
    if (calcBoxPrice) calcBoxPrice.addEventListener('input', calculateUnitCost);
    if (btnApplyCost) btnApplyCost.addEventListener('click', applyCostCalculation);
    
    // Barcode not found modal
    const btnCancelNewProduct = document.getElementById('btn-cancel-new-product');
    const btnAddNewProduct = document.getElementById('btn-add-new-product');
    const barcodeNotFoundModal = document.getElementById('barcode-not-found-modal');
    
    if (btnCancelNewProduct) btnCancelNewProduct.addEventListener('click', () => {
        hideBarcodeNotFoundModal();
        focusBarcodeInput();
    });
    if (btnAddNewProduct) btnAddNewProduct.addEventListener('click', () => {
        if (pendingBarcode) {
            showQuickAddModal(pendingBarcode);
        }
    });
    if (barcodeNotFoundModal) {
        barcodeNotFoundModal.addEventListener('click', (e) => {
            if (e.target === barcodeNotFoundModal) {
                hideBarcodeNotFoundModal();
                focusBarcodeInput();
            }
        });
    }
    
    // Quick add modal
    const btnCloseQuickAdd = document.getElementById('btn-close-quick-add');
    const btnCancelQuickAdd = document.getElementById('btn-cancel-quick-add');
    const btnSaveQuickAdd = document.getElementById('btn-save-quick-add');
    const quickAddModal = document.getElementById('quick-add-modal');
    
    if (btnCloseQuickAdd) btnCloseQuickAdd.addEventListener('click', () => {
        hideQuickAddModal();
        focusBarcodeInput();
    });
    if (btnCancelQuickAdd) btnCancelQuickAdd.addEventListener('click', () => {
        hideQuickAddModal();
        focusBarcodeInput();
    });
    if (btnSaveQuickAdd) btnSaveQuickAdd.addEventListener('click', saveQuickAddProduct);
    if (quickAddModal) {
        quickAddModal.addEventListener('click', (e) => {
            if (e.target === quickAddModal) {
                hideQuickAddModal();
                focusBarcodeInput();
            }
        });
    }
    
    // Stock logs filter
    const logTypeFilter = document.getElementById('log-type-filter');
    const logSearch = document.getElementById('log-search');
    const btnClearLogFilter = document.getElementById('btn-clear-log-filter');
    
    if (logTypeFilter) {
        logTypeFilter.addEventListener('change', () => {
            const search = logSearch ? logSearch.value.trim() : '';
            renderStockLogsTable(logTypeFilter.value, search);
        });
    }
    
    if (logSearch) {
        logSearch.addEventListener('input', debounce(() => {
            const filter = logTypeFilter ? logTypeFilter.value : 'all';
            renderStockLogsTable(filter, logSearch.value.trim());
        }, 300));
    }
    
    if (btnClearLogFilter) {
        btnClearLogFilter.addEventListener('click', () => {
            if (logTypeFilter) logTypeFilter.value = 'all';
            if (logSearch) logSearch.value = '';
            renderStockLogsTable('all', '');
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