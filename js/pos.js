/**
 * POS (Point of Sale) Logic
 * Handles all POS-specific functionality
 */

// ========================================
// Thai to Number Mapping
// ========================================
const THAI_TO_NUMBER = {
    'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5',
    'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0'
};

function convertThaiToNumber(text) {
    const normalized = text.normalize('NFD');
    let result = '';
    for (let char of normalized) {
        if (/[0-9]/.test(char)) result += char;
        else if (THAI_TO_NUMBER[char]) result += THAI_TO_NUMBER[char];
    }
    return result;
}

// ========================================
// Global Variables
// ========================================
let cart = [];
let heldBills = [];
let currentHeldBillId = null;
let settings = {};
let categories = [];
let quickItems = [];
let allProducts = [];
let selectedCategory = 'all';
let paymentMethod = 'cash';
let searchTimeout = null;
let pendingBarcode = null;

// ========================================
// Session Management
// ========================================
function getSessionId() {
    let sessionId = localStorage.getItem('pos_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('pos_session_id', sessionId);
    }
    return sessionId;
}

// ========================================
// Initialize POS
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    setCurrentDate();
    await Promise.all([
        loadSettings(),
        loadCategories(),
        loadAllProducts(),
        loadHeldBills()
    ]);
    setupEventListeners();
    focusBarcode();
    
    console.log('✅ POS initialized');
});

function setCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('th-TH', options);
    }
}

// ========================================
// Load Settings
// ========================================
async function loadSettings() {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.SETTINGS);
        if (res.success && res.data && res.data.settings) {
            settings = res.data.settings;
            const storeName = settings.store_name || 'ร้านค้า';
            const storeNameElement = document.getElementById('store-name');
            if (storeNameElement) {
                storeNameElement.textContent = storeName;
            }
            document.title = `POS - ${storeName}`;
            document.documentElement.style.setProperty('--items-per-row', settings.quick_items_per_row || 6);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
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
            renderCategoryFilter();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategoryFilter() {
    const container = document.getElementById('category-filter');
    if (!container) return;
    
    container.innerHTML = '<button class="category-btn active" data-category="all">⭐ ขายดี</button>';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.category = cat.id;
        btn.textContent = cat.name;
        container.appendChild(btn);
    });

    container.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCategory = btn.dataset.category;

            if (selectedCategory === 'all') {
                renderQuickItems();
            } else {
                const catId = parseInt(selectedCategory);
                const filtered = allProducts.filter(p => parseInt(p.category_id) === catId);
                renderCategoryItems(filtered);
            }
            
            focusBarcode();
        });
    });
}

// ========================================
// Load Products
// ========================================
async function loadAllProducts() {
    try {
        const [productsRes, topSellingRes] = await Promise.all([
            apiGet(API_CONFIG.ENDPOINTS.PRODUCTS, { limit: 9999 }),
            apiGet(API_CONFIG.ENDPOINTS.PRODUCTS, { 
                top_selling: settings.quick_items_count || 30, 
                days: settings.quick_items_days || 30 
            })
        ]);

        if (productsRes.success && productsRes.data && productsRes.data.products) {
            allProducts = productsRes.data.products;
            console.log(`✅ โหลดสินค้าทั้งหมด ${allProducts.length} รายการ`);
        }

        if (topSellingRes.success && topSellingRes.data && topSellingRes.data.products) {
            quickItems = topSellingRes.data.products;
        } else {
            quickItems = allProducts.slice(0, parseInt(settings.quick_items_count) || 30);
        }

        renderQuickItems();

    } catch (error) {
        console.error('Error loading products:', error);
        const grid = document.getElementById('quick-items-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>ไม่สามารถโหลดสินค้าได้ กรุณารีเฟรชหน้า</p>
                </div>
            `;
        }
    }
}

function renderQuickItems() {
    const container = document.getElementById('quick-items-grid');
    if (!container) return;

    if (quickItems.length === 0) {
        container.innerHTML = `
            <div class="cart-empty" style="grid-column: 1/-1;">
                <i class="fas fa-box-open"></i>
                <p>ยังไม่มีข้อมูลการขาย</p>
            </div>
        `;
        return;
    }

    container.innerHTML = quickItems.map(item => `
        <button class="quick-item-btn" data-product-id="${item.id}">
            <div class="quick-item-name">${escapeHtml(item.name)}</div>
            <div class="quick-item-price">${formatMoney(item.price)}</div>
        </button>
    `).join('');

    container.querySelectorAll('.quick-item-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            addProductToCart(quickItems[index]);
        });
    });
    
    focusBarcode();
}

function renderCategoryItems(items) {
    const container = document.getElementById('quick-items-grid');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `
            <div class="cart-empty" style="grid-column: 1/-1;">
                <i class="fas fa-box-open"></i>
                <p>ไม่มีสินค้าในหมวดนี้</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => `
        <button class="quick-item-btn" data-product-id="${item.id}">
            <div class="quick-item-name">${escapeHtml(item.name)}</div>
            <div class="quick-item-price">${formatMoney(item.price)}</div>
        </button>
    `).join('');

    container.querySelectorAll('.quick-item-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            addProductToCart(items[index]);
        });
    });
    
    focusBarcode();
}

// ========================================
// Cart Management
// ========================================
function addProductToCart(product) {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
        existingItem.quantity++;
        existingItem.subtotal = existingItem.quantity * existingItem.price;
    } else {
        cart.push({
            product_id: product.id,
            name: product.name,
            barcode: product.barcode,
            price: parseFloat(product.price),
            quantity: 1,
            subtotal: parseFloat(product.price)
        });
    }

    renderCart();
    updateSummary();
    focusBarcode();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>ตะกร้าว่างเปล่า</p>
                <small>สแกนบาร์โค้ดหรือคลิกสินค้าเพื่อเพิ่มลงตะกร้า</small>
            </div>
        `;
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                <div class="cart-item-price">${formatMoney(item.price)} / ชิ้น</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateQuantity(${index}, -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="cart-item-qty">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${index}, 1)">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="cart-item-subtotal">${formatMoney(item.subtotal)}</div>
        </div>
    `).join('');
}

function updateQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    } else {
        cart[index].subtotal = cart[index].quantity * cart[index].price;
    }
    renderCart();
    updateSummary();
}

function updateSummary() {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discountInput = document.getElementById('discount-input');
    const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
    const total = Math.max(0, subtotal - discount);

    const subtotalElement = document.getElementById('summary-subtotal');
    const totalElement = document.getElementById('summary-total');
    
    if (subtotalElement) subtotalElement.textContent = formatMoney(subtotal);
    if (totalElement) totalElement.textContent = formatMoney(total);
}

// ========================================
// Held Bills
// ========================================
async function loadHeldBills() {
    try {
        const sessionId = getSessionId();
        const res = await apiGet(API_CONFIG.ENDPOINTS.HELD_BILLS, { session_id: sessionId });
        if (res.success && res.data && res.data.held_bills) {
            heldBills = res.data.held_bills;
            renderHeldBills();
        }
    } catch (error) {
        console.error('Error loading held bills:', error);
    }
}

function renderHeldBills() {
    const container = document.getElementById('held-bills-list');
    if (!container) return;

    if (heldBills.length === 0) {
        container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">ยังไม่มีบิลที่พักไว้</span>';
        return;
    }

    container.innerHTML = heldBills.map(bill => `
        <div class="held-bill-badge ${bill.id === currentHeldBillId ? 'active' : ''}" 
             data-bill-id="${bill.id}" 
             title="บิลที่ ${bill.bill_index} - ${bill.item_count} รายการ - ${formatMoney(bill.total_amount)}">
            ${bill.bill_index}
        </div>
    `).join('');

    container.querySelectorAll('.held-bill-badge').forEach(badge => {
        badge.addEventListener('click', () => {
            const billId = parseInt(badge.dataset.billId);
            resumeHeldBill(billId);
        });
    });
}

async function holdBill() {
    if (cart.length === 0) {
        showToast('ไม่มีสินค้าในตะกร้า', 'warning');
        focusBarcode();
        return;
    }

    try {
        const sessionId = getSessionId();
        const res = await apiPost(API_CONFIG.ENDPOINTS.HELD_BILLS, {
            session_id: sessionId,
            items: cart,
            discount: parseFloat(document.getElementById('discount-input')?.value) || 0,
            payment_method: paymentMethod
        });

        if (res.success) {
            cart = [];
            currentHeldBillId = null;
            const discountInput = document.getElementById('discount-input');
            if (discountInput) discountInput.value = 0;
            renderCart();
            updateSummary();
            await loadHeldBills();
            showToast('พักบิลสำเร็จ', 'success');
            focusBarcode();
        } else {
            showToast('ไม่สามารถพักบิลได้: ' + res.message, 'error');
            focusBarcode();
        }
    } catch (error) {
        console.error('Error holding bill:', error);
        showToast('เกิดข้อผิดพลาดในการพักบิล', 'error');
        focusBarcode();
    }
}

async function resumeHeldBill(billId) {
    const bill = heldBills.find(b => b.id === billId);
    if (!bill) return;

    if (cart.length > 0 && currentHeldBillId !== billId) {
        if (!confirm('ต้องการพักบิลปัจจุบันก่อนหรือไม่?')) {
            return;
        }
        await holdBill();
    }

    // ✅ ลบบิลออกจาก DB ก่อน (ส่งเป็น query string)
    try {
        const sessionId = getSessionId();
        const deleteRes = await apiDeleteWithParams(API_CONFIG.ENDPOINTS.HELD_BILLS, {
            id: billId,
            session_id: sessionId
        });
        
        if (!deleteRes.success) {
            showToast('ไม่สามารถลบบิลที่พักได้: ' + deleteRes.message, 'error');
            return;
        }
    } catch (error) {
        console.error('Error deleting held bill:', error);
        showToast('เกิดข้อผิดพลาดในการลบบิลที่พัก', 'error');
        return;
    }

    // ✅ โหลดข้อมูลบิลใส่ตะกร้า
    cart = bill.items;
    currentHeldBillId = bill.id;
    const discountInput = document.getElementById('discount-input');
    if (discountInput) discountInput.value = bill.discount;
    paymentMethod = bill.payment_method;
    renderCart();
    updateSummary();
    updatePaymentMethodUI();

    // ✅ โหลด held bills ใหม่ (บิลที่โหลดจะหายไป)
    await loadHeldBills();
    
    showToast('โหลดบิลที่พักสำเร็จ', 'success');
    focusBarcode();
}

// ========================================
// Focus Management
// ========================================
function focusBarcode() {
    setTimeout(() => {
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput) {
            barcodeInput.focus();
        }
    }, 100);
}

// ========================================
// Cart Actions
// ========================================
async function clearCart() {
    if (cart.length === 0) {
        focusBarcode();
        return;
    }

    if (!confirm('ต้องการล้างตะกร้าหรือไม่?')) {
        focusBarcode();
        return;
    }

    // ✅ ลบบิลที่พักที่โหลดมา (ถ้ามี)
    if (currentHeldBillId) {
        try {
            const sessionId = getSessionId();
            await apiDeleteWithParams(API_CONFIG.ENDPOINTS.HELD_BILLS, {
                id: currentHeldBillId,
                session_id: sessionId
            });
            await loadHeldBills();
        } catch (error) {
            console.error('Error deleting held bill:', error);
        }
    }

    cart = [];
    currentHeldBillId = null;
    const discountInput = document.getElementById('discount-input');
    if (discountInput) discountInput.value = 0;
    renderCart();
    updateSummary();
    focusBarcode();
}

async function checkout() {
    if (cart.length === 0) {
        showToast('ไม่มีสินค้าในตะกร้า', 'warning');
        focusBarcode();
        return;
    }

    if (!confirm('ยืนยันการชำระเงิน?')) {
        focusBarcode();
        return;
    }

    try {
        const discountInput = document.getElementById('discount-input');
        const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;

        const res = await apiPost(API_CONFIG.ENDPOINTS.SALES, {
            items: cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price
            })),
            discount: discount,
            payment_method: paymentMethod
        });

        if (res.success) {
            showToast(`ชำระเงินสำเร็จ! เลขบิล: ${res.data.bill_no}`, 'success');
            cart = [];
            currentHeldBillId = null;
            if (discountInput) discountInput.value = 0;
            renderCart();
            updateSummary();
            await loadAllProducts();
            focusBarcode();
        } else {
            showToast('ไม่สามารถชำระเงินได้: ' + res.message, 'error');
            focusBarcode();
        }
    } catch (error) {
        console.error('Error checking out:', error);
        showToast('เกิดข้อผิดพลาดในการชำระเงิน', 'error');
        focusBarcode();
    }
}

function updatePaymentMethodUI() {
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === paymentMethod);
    });
}

// ========================================
// Barcode Search
// ========================================
function searchByBarcode(barcode) {
    if (!barcode) return;

    const matches = allProducts.filter(p => p.barcode === barcode);

    if (matches.length === 1) {
        addProductToCart(matches[0]);
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput) barcodeInput.value = ''; // ✅ เคลียร์ค่าหลังสแกนสำเร็จ
        focusBarcode();
    } else if (matches.length > 1) {
        showToast('พบสินค้าหลายรายการ กรุณาระบุบาร์โค้ดให้ชัดเจน', 'warning');
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput) barcodeInput.value = '';
        focusBarcode();
    } else {
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput) barcodeInput.value = '';
        showBarcodeNotFoundModal(barcode);
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
    
    setTimeout(() => {
        const btnAddNewProduct = document.getElementById('btn-add-new-product');
        if (btnAddNewProduct) btnAddNewProduct.focus();
    }, 100);
}

function hideBarcodeNotFoundModal() {
    const barcodeNotFoundModal = document.getElementById('barcode-not-found-modal');
    if (barcodeNotFoundModal) barcodeNotFoundModal.style.display = 'none';
    pendingBarcode = null;
}

function showNewProductModal(barcode) {
    hideBarcodeNotFoundModal();
    
    const newProductBarcode = document.getElementById('new-product-barcode');
    const newProductName = document.getElementById('new-product-name');
    const newProductPrice = document.getElementById('new-product-price');
    const newProductCost = document.getElementById('new-product-cost');
    const newProductStock = document.getElementById('new-product-stock');
    const newProductUnit = document.getElementById('new-product-unit');
    
    if (newProductBarcode) newProductBarcode.value = barcode;
    if (newProductName) newProductName.value = '';
    if (newProductPrice) newProductPrice.value = '';
    if (newProductCost) newProductCost.value = '0';
    if (newProductStock) newProductStock.value = '1';
    if (newProductUnit) newProductUnit.value = 'ชิ้น';
    
    const categorySelect = document.getElementById('new-product-category');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">-- เลือกหมวดหมู่ --</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
    }
    
    const newProductModal = document.getElementById('new-product-modal');
    if (newProductModal) newProductModal.style.display = 'flex';
    
    setTimeout(() => {
        if (newProductName) newProductName.focus();
    }, 100);
}

function hideNewProductModal() {
    const newProductModal = document.getElementById('new-product-modal');
    if (newProductModal) newProductModal.style.display = 'none';
}

async function saveNewProduct() {
    const newProductBarcode = document.getElementById('new-product-barcode');
    const newProductName = document.getElementById('new-product-name');
    const newProductPrice = document.getElementById('new-product-price');
    const newProductCost = document.getElementById('new-product-cost');
    const newProductStock = document.getElementById('new-product-stock');
    const newProductCategory = document.getElementById('new-product-category');
    const newProductUnit = document.getElementById('new-product-unit');
    
    const barcode = newProductBarcode ? newProductBarcode.value.trim() : '';
    const name = newProductName ? newProductName.value.trim() : '';
    const price = newProductPrice ? parseFloat(newProductPrice.value) || 0 : 0;
    const cost = newProductCost ? parseFloat(newProductCost.value) || 0 : 0;
    const stock = newProductStock ? parseInt(newProductStock.value) || 0 : 0;
    const categoryId = newProductCategory ? newProductCategory.value : '';
    const unit = newProductUnit ? newProductUnit.value.trim() || 'ชิ้น' : 'ชิ้น';
    
    if (!barcode) {
        showToast('กรุณากรอกบาร์โค้ด', 'warning');
        return;
    }
    if (!name) {
        showToast('กรุณากรอกชื่อสินค้า', 'warning');
        if (newProductName) newProductName.focus();
        return;
    }
    if (price <= 0) {
        showToast('กรุณากรอกราคาขายมากกว่า 0', 'warning');
        if (newProductPrice) newProductPrice.focus();
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
            const newProduct = res.data;
            allProducts.push({
                id: newProduct.id,
                name: newProduct.name,
                barcode: newProduct.barcode,
                price: parseFloat(newProduct.price),
                cost: parseFloat(newProduct.cost),
                stock: parseInt(newProduct.stock),
                unit: newProduct.unit,
                category_id: newProduct.category_id,
                barcode_status: parseInt(newProduct.barcode_status)
            });
            
            hideNewProductModal();
            addProductToCart(allProducts[allProducts.length - 1]);
            showToast(`เพิ่มสินค้า "${name}" สำเร็จ และเพิ่มลงตะกร้าแล้ว`, 'success');
            focusBarcode();
        } else {
            showToast('ไม่สามารถเพิ่มสินค้าได้: ' + res.message, 'error');
        }
    } catch (error) {
        console.error('Error saving new product:', error);
        showToast('เกิดข้อผิดพลาดในการบันทึกสินค้า', 'error');
    }
}

function cancelNewProduct() {
    hideNewProductModal();
    focusBarcode();
}

// ========================================
// Name Search
// ========================================
function searchByName(query) {
    const resultsContainer = document.getElementById('search-results');
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
                    บาร์โค้ด: ${escapeHtml(p.barcode)} | ราคา: ${formatMoney(p.price)} | สต็อก: ${p.stock}
                </div>
            </div>
        `).join('');
        resultsContainer.classList.add('show');

        resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                addProductToCart(products[index]);
                const nameSearchInput = document.getElementById('name-search-input');
                if (nameSearchInput) nameSearchInput.value = '';
                resultsContainer.classList.remove('show');
                focusBarcode();
            });
        });
    } else {
        resultsContainer.classList.remove('show');
    }
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    // Barcode input
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
        barcodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const barcode = convertThaiToNumber(barcodeInput.value.trim());
                if (barcode) {
                    searchByBarcode(barcode);
                }
            }
        });
    }

    // Name search input
    const nameSearchInput = document.getElementById('name-search-input');
    if (nameSearchInput) {
        nameSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchByName(e.target.value.trim());
            }, 100);
        });
    }

    // Click outside to close search results
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.pos-search-field')) {
            const searchResults = document.getElementById('search-results');
            if (searchResults) searchResults.classList.remove('show');
        }
    });

    // Discount input
    const discountInput = document.getElementById('discount-input');
    if (discountInput) {
        discountInput.addEventListener('input', updateSummary);
    }

    // Payment method buttons
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            paymentMethod = btn.dataset.method;
            updatePaymentMethodUI();
        });
    });

    // Hold bill button
    const btnHoldBill = document.getElementById('btn-hold-bill');
    if (btnHoldBill) {
        btnHoldBill.addEventListener('click', holdBill);
    }

    // Clear cart button
    const btnClearCart = document.getElementById('btn-clear-cart');
    if (btnClearCart) {
        btnClearCart.addEventListener('click', clearCart);
    }

    // Checkout button
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', checkout);
    }

    // Modal: บาร์โค้ดไม่พบ
    const btnCancelNewProduct = document.getElementById('btn-cancel-new-product');
    if (btnCancelNewProduct) {
        btnCancelNewProduct.addEventListener('click', () => {
            hideBarcodeNotFoundModal();
            focusBarcode();
        });
    }

    const btnAddNewProduct = document.getElementById('btn-add-new-product');
    if (btnAddNewProduct) {
        btnAddNewProduct.addEventListener('click', () => {
            if (pendingBarcode) {
                showNewProductModal(pendingBarcode);
            }
        });
    }

    // Modal: เพิ่มสินค้าด่วน
    const btnCloseNewProduct = document.getElementById('btn-close-new-product');
    if (btnCloseNewProduct) {
        btnCloseNewProduct.addEventListener('click', cancelNewProduct);
    }

    const btnCancelSaveProduct = document.getElementById('btn-cancel-save-product');
    if (btnCancelSaveProduct) {
        btnCancelSaveProduct.addEventListener('click', cancelNewProduct);
    }

    const btnSaveNewProduct = document.getElementById('btn-save-new-product');
    if (btnSaveNewProduct) {
        btnSaveNewProduct.addEventListener('click', saveNewProduct);
    }

    const newProductModal = document.getElementById('new-product-modal');
    if (newProductModal) {
        newProductModal.addEventListener('click', (e) => {
            if (e.target.id === 'new-product-modal') {
                cancelNewProduct();
            }
        });
    }

    const newProductForm = document.getElementById('new-product-form');
    if (newProductForm) {
        newProductForm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveNewProduct();
            }
        });
    }

    // ESC to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const barcodeModal = document.getElementById('barcode-not-found-modal');
            const productModal = document.getElementById('new-product-modal');
            
            if (productModal && productModal.style.display === 'flex') {
                cancelNewProduct();
            } else if (barcodeModal && barcodeModal.style.display === 'flex') {
                hideBarcodeNotFoundModal();
                focusBarcode();
            }
        }
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
                    await Promise.all([loadSettings(), loadAllProducts()]);
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