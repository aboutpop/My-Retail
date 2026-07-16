/**
 * Sales Management Logic
 * Handles all sales-specific functionality
 */

// ========================================
// Global Variables
// ========================================
let allSales = [];
let currentSaleId = null;
let currentFilters = {
    dateFrom: null,
    dateTo: null
};

// ========================================
// Initialize Sales Page
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    setCurrentDate();
    await Promise.all([
        loadStoreName(),
        loadSales()
    ]);
    setupEventListeners();
    setDefaultDateFilter();
    
    console.log('✅ Sales page initialized');
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
            document.title = `จัดการบิล - ${storeName}`;
        }
    } catch (error) {
        console.error('Error loading store name:', error);
    }
}

function setDefaultDateFilter() {
    // Set default to "วันนี้"
    const today = new Date();
    const todayStr = formatDateForInput(today);
    
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    
    if (dateFromInput) dateFromInput.value = todayStr;
    if (dateToInput) dateToInput.value = todayStr;
    
    currentFilters.dateFrom = todayStr;
    currentFilters.dateTo = todayStr;
}

// ========================================
// Load Sales
// ========================================
async function loadSales() {
    const tbody = document.getElementById('sales-table');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">กำลังโหลดข้อมูล...</td></tr>';
    }
    
    try {
        const params = { limit: 1000 };
        
        if (currentFilters.dateFrom && currentFilters.dateTo) {
            params.date_from = currentFilters.dateFrom;
            params.date_to = currentFilters.dateTo;
        }
        
        const res = await apiGet(API_CONFIG.ENDPOINTS.SALES, params);
        
        if (res.success && res.data) {
            allSales = res.data.sales || [];
            updateStats(res.data.summary);
            renderSales();
        } else {
            showToast('ไม่สามารถโหลดข้อมูลบิลได้', 'error');
        }
    } catch (error) {
        console.error('Error loading sales:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

function updateStats(summary) {
    if (!summary) return;
    
    const statBillCount = document.getElementById('stat-bill-count');
    const statTotalSales = document.getElementById('stat-total-sales');
    const statTotalDiscount = document.getElementById('stat-total-discount');
    const statNetTotal = document.getElementById('stat-net-total');
    
    if (statBillCount) statBillCount.textContent = (summary.bill_count || 0).toLocaleString();
    if (statTotalSales) statTotalSales.textContent = formatMoney(summary.total_sales || 0);
    if (statTotalDiscount) statTotalDiscount.textContent = formatMoney(summary.total_discount || 0);
    if (statNetTotal) statNetTotal.textContent = formatMoney(summary.total_net || 0);
}

function renderSales() {
    const tbody = document.getElementById('sales-table');
    if (!tbody) return;
    
    if (allSales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <p>ไม่พบข้อมูลบิลขาย</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const paymentMethods = {
        'cash': 'เงินสด',
        'transfer': 'โอนเงิน',
        'other': 'อื่นๆ'
    };
    
    tbody.innerHTML = allSales.map(sale => {
        const date = new Date(sale.sale_date).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const isVoid = sale.bill_no.startsWith('VOID-');
        const rowClass = isVoid ? 'style="background: var(--danger-light);"' : '';
        
        return `
            <tr ${rowClass}>
                <td>
                    <strong>${escapeHtml(sale.bill_no)}</strong>
                    ${isVoid ? '<span class="badge badge-danger" style="margin-left: 8px;">VOID</span>' : ''}
                </td>
                <td>${date}</td>
                <td style="text-align: right;">${formatMoney(sale.total_amount)}</td>
                <td style="text-align: right;">${formatMoney(sale.discount)}</td>
                <td style="text-align: right; font-weight: bold;">${formatMoney(sale.net_total)}</td>
                <td>${paymentMethods[sale.payment_method] || sale.payment_method}</td>
                <td style="text-align: center;">
                    <div class="btn-icon-group">
                        <button class="btn-icon view" onclick="viewSaleDetail(${sale.id})" title="ดูรายละเอียด">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!isVoid ? `
                            <button class="btn-icon delete" onclick="voidSale(${sale.id}, '${escapeHtml(sale.bill_no)}')" title="คืนเงิน">
                                <i class="fas fa-undo"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
// ========================================
// Sale Detail
// ========================================
async function viewSaleDetail(saleId) {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.SALES, { id: saleId });
        
        if (!res.success || !res.data) {
            showToast('ไม่สามารถโหลดรายละเอียดบิลได้', 'error');
            return;
        }
        
        const sale = res.data;
        currentSaleId = saleId;
        
        // Update modal content
        const detailBillNo = document.getElementById('detail-bill-no');
        const detailDate = document.getElementById('detail-date');
        const detailPaymentMethod = document.getElementById('detail-payment-method');
        const detailTotalAmount = document.getElementById('detail-total-amount');
        const detailDiscount = document.getElementById('detail-discount');
        const detailNetTotal = document.getElementById('detail-net-total');
        const detailItems = document.getElementById('detail-items');
        const btnVoidSale = document.getElementById('btn-void-sale');
        
        if (detailBillNo) detailBillNo.textContent = sale.bill_no;
        if (detailDate) detailDate.textContent = new Date(sale.sale_date).toLocaleString('th-TH');
        
        const paymentMethods = {
            'cash': 'เงินสด',
            'transfer': 'โอนเงิน',
            'other': 'อื่นๆ'
        };
        if (detailPaymentMethod) detailPaymentMethod.textContent = paymentMethods[sale.payment_method] || sale.payment_method;
        
        if (detailTotalAmount) detailTotalAmount.textContent = formatMoney(sale.total_amount);
        if (detailDiscount) detailDiscount.textContent = formatMoney(sale.discount);
        if (detailNetTotal) detailNetTotal.textContent = formatMoney(sale.net_total);
        
        // Render items
        if (detailItems && sale.items) {
            detailItems.innerHTML = sale.items.map(item => `
                <tr>
                    <td>${escapeHtml(item.product_name_snapshot)}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">${formatMoney(item.price_snapshot)}</td>
                    <td style="text-align: right;">${formatMoney(item.subtotal)}</td>
                </tr>
            `).join('');
        }
        
        // Hide void button if already voided
        const isVoid = sale.bill_no.startsWith('VOID-');
        if (btnVoidSale) {
            btnVoidSale.style.display = isVoid ? 'none' : 'inline-flex';
        }
        
        // Show modal
        const modal = document.getElementById('sale-detail-modal');
        if (modal) modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading sale detail:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดรายละเอียด', 'error');
    }
}

function closeSaleDetailModal() {
    const modal = document.getElementById('sale-detail-modal');
    if (modal) modal.style.display = 'none';
    currentSaleId = null;
}

// ========================================
// Void Sale
// ========================================
async function voidSale(saleId, billNo) {
    if (!confirm(`ต้องการคืนเงินบิล ${billNo} หรือไม่?\n\nสินค้าจะถูกคืนสต๊อก และสร้างบิล VOID ใหม่`)) {
        return;
    }
    
    try {
        // ดึงข้อมูลบิลเดิม
        const detailRes = await apiGet(API_CONFIG.ENDPOINTS.SALES, { id: saleId });
        
        if (!detailRes.success || !detailRes.data) {
            showToast('ไม่สามารถดึงข้อมูลบิลได้', 'error');
            return;
        }
        
        const originalSale = detailRes.data;
        
        // สร้างบิล Void
        const voidData = {
            items: originalSale.items.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price_snapshot
            })),
            discount: originalSale.discount,
            payment_method: originalSale.payment_method,
            is_void: true,
            original_bill_no: originalSale.bill_no
        };
        
        const res = await apiPost(API_CONFIG.ENDPOINTS.SALES, voidData);
        
        if (res.success) {
            showToast(`คืนเงินสำเร็จ! เลขบิล VOID: ${res.data.bill_no}`, 'success');
            closeSaleDetailModal();
            await loadSales();
        } else {
            showToast(res.message || 'เกิดข้อผิดพลาดในการคืนเงิน', 'error');
        }
    } catch (error) {
        console.error('Error voiding sale:', error);
        showToast('เกิดข้อผิดพลาดในการคืนเงิน', 'error');
    }
}

// ========================================
// Date Filters
// ========================================
function filterByDays(days) {
    const today = new Date();
    let dateFrom, dateTo;
    
    if (days === 0) {
        // วันนี้
        dateFrom = today;
        dateTo = today;
    } else if (days === 1) {
        // เมื่อวาน
        dateFrom = new Date(today);
        dateFrom.setDate(today.getDate() - 1);
        dateTo = dateFrom;
    } else {
        // X วันล่าสุด
        dateTo = today;
        dateFrom = new Date(today);
        dateFrom.setDate(today.getDate() - (days - 1));
    }
    
    currentFilters.dateFrom = formatDateForInput(dateFrom);
    currentFilters.dateTo = formatDateForInput(dateTo);
    
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    
    if (dateFromInput) dateFromInput.value = currentFilters.dateFrom;
    if (dateToInput) dateToInput.value = currentFilters.dateTo;
    
    loadSales();
}

function filterByCustomDate() {
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    
    if (!dateFromInput || !dateToInput) return;
    
    currentFilters.dateFrom = dateFromInput.value;
    currentFilters.dateTo = dateToInput.value;
    
    if (!currentFilters.dateFrom || !currentFilters.dateTo) {
        showToast('กรุณาเลือกวันที่', 'warning');
        return;
    }
    
    loadSales();
}

function clearFilters() {
    setDefaultDateFilter();
    
    // Reset active button
    document.querySelectorAll('.date-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    const todayBtn = document.querySelector('.date-filter[data-days="0"]');
    if (todayBtn) todayBtn.classList.add('active');
    
    loadSales();
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    // Date filter buttons
    document.querySelectorAll('.date-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            const days = btn.dataset.days;
            
            // Update active state
            document.querySelectorAll('.date-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show/hide custom date range
            const customDateRange = document.getElementById('custom-date-range');
            if (days === 'custom') {
                if (customDateRange) customDateRange.style.display = 'flex';
            } else {
                if (customDateRange) customDateRange.style.display = 'none';
                filterByDays(parseInt(days));
            }
        });
    });
    
    // Search button
    const btnSearch = document.getElementById('btn-search');
    if (btnSearch) {
        btnSearch.addEventListener('click', () => {
            const activeBtn = document.querySelector('.date-filter.active');
            if (activeBtn && activeBtn.dataset.days === 'custom') {
                filterByCustomDate();
            }
        });
    }
    
    // Clear filters
    const btnClearFilters = document.getElementById('btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', clearFilters);
    }
    
    // Sale detail modal
    const btnCloseDetail = document.getElementById('btn-close-detail');
    const btnCloseDetailFooter = document.getElementById('btn-close-detail-footer');
    const btnVoidSale = document.getElementById('btn-void-sale');
    const saleDetailModal = document.getElementById('sale-detail-modal');
    
    if (btnCloseDetail) btnCloseDetail.addEventListener('click', closeSaleDetailModal);
    if (btnCloseDetailFooter) btnCloseDetailFooter.addEventListener('click', closeSaleDetailModal);
    if (btnVoidSale) btnVoidSale.addEventListener('click', () => {
        if (currentSaleId) {
            const sale = allSales.find(s => s.id === currentSaleId);
            if (sale) {
                voidSale(currentSaleId, sale.bill_no);
            }
        }
    });
    
    if (saleDetailModal) {
        saleDetailModal.addEventListener('click', (e) => {
            if (e.target === saleDetailModal) closeSaleDetailModal();
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