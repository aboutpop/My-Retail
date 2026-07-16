/**
 * Dashboard Logic
 * Handles all dashboard-specific functionality
 */

// ========================================
// Global Variables
// ========================================
let salesChart = null;

// ========================================
// Initialize Dashboard
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    setCurrentDate();
    await loadStoreName();
    await loadStats();
    await loadTopProducts();
    await loadTopProfitProducts();
    await loadRecentSales();
    await loadSalesChart();
    setupEventListeners();
    
    console.log('✅ Dashboard initialized');
});

// ========================================
// Utility Functions
// ========================================
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
        const res = await apiGet(API_CONFIG.ENDPOINTS.SETTINGS, { key: 'store_name' });
        if (res.success && res.data && res.data.settings) {
            const storeName = res.data.settings.store_name || 'ร้านค้า';
            const storeNameElement = document.getElementById('store-name');
            if (storeNameElement) {
                storeNameElement.textContent = storeName;
            }
            document.title = `Dashboard - ${storeName}`;
        }
    } catch (error) {
        console.error('Error loading store name:', error);
    }
}

// ========================================
// Load Stats (8 Cards)
// ========================================
async function loadStats() {
    try {
        // Load products data
        const productsRes = await apiGet(API_CONFIG.ENDPOINTS.PRODUCTS, { limit: 10000 });
        
        if (productsRes.success && productsRes.data && productsRes.data.products) {
            const products = productsRes.data.products;
            
            // Card 1: สินค้าทั้งหมด
            document.getElementById('stat-total-products').textContent = products.length.toLocaleString();
            
            // Card 3: สินค้าสต็อกต่ำ (ไม่รวม no_stock_count)
            const lowStock = products.filter(p => 
                !p.no_stock_count && 
                parseInt(p.stock || 0) < 10 && 
                parseInt(p.stock || 0) >= 0
            ).length;
            document.getElementById('stat-low-stock').textContent = lowStock.toLocaleString();
            
            // Card 8: มูลค่าสต็อกทั้งร้าน
            const totalInventory = products.reduce((sum, p) => {
                return sum + (parseFloat(p.cost || 0) * parseInt(p.stock || 0));
            }, 0);
            document.getElementById('stat-total-inventory').textContent = `฿${totalInventory.toFixed(2)}`;
        }

        // Card 2 & 4: ยอดขายวันนี้ + บิลวันนี้
        const today = new Date().toISOString().split('T')[0];
        const todayRes = await apiGet(API_CONFIG.ENDPOINTS.SALES, { 
            date_from: today, 
            date_to: today 
        });
        
        if (todayRes.success && todayRes.data && todayRes.data.summary) {
            const summary = todayRes.data.summary;
            document.getElementById('stat-today-sales').textContent = `฿${(summary.total_net || 0).toFixed(2)}`;
            document.getElementById('stat-today-bills').textContent = summary.bill_count || 0;
        }

        // Card 5: รายการขาย 7 วัน
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        const weeklyRes = await apiGet(API_CONFIG.ENDPOINTS.SALES, { 
            date_from: sevenDaysAgoStr, 
            date_to: today 
        });
        
        if (weeklyRes.success && weeklyRes.data && weeklyRes.data.summary) {
            document.getElementById('stat-weekly-bills').textContent = weeklyRes.data.summary.bill_count || 0;
        }

        // Card 6 & 7: ยอดขายเดือนนี้ + กำไรเดือนนี้
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        
        const monthlyRes = await apiGet(API_CONFIG.ENDPOINTS.SALES, { 
            date_from: firstDayStr, 
            date_to: today 
        });
        
        if (monthlyRes.success && monthlyRes.data && monthlyRes.data.summary) {
            const summary = monthlyRes.data.summary;
            document.getElementById('stat-monthly-sales').textContent = `฿${(summary.total_net || 0).toFixed(2)}`;
            document.getElementById('stat-monthly-profit').textContent = `฿${(summary.total_profit || 0).toFixed(2)}`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ========================================
// Load Top Products (30 Days)
// ========================================
async function loadTopProducts() {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.PRODUCTS, { 
            top_selling: 10, 
            days: 30 
        });
        
        if (res.success && res.data && res.data.products) {
            const products = res.data.products;
            const tbody = document.getElementById('top-products-table');
            
            if (!tbody) return;
            
            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">ยังไม่มีข้อมูลการขาย</td></tr>';
                return;
            }
            
            tbody.innerHTML = products.slice(0, 10).map((p, index) => {
                const totalSales = p.total_sales || (p.total_sold * parseFloat(p.price || 0));
                return `
                    <tr>
                        <td><strong>#${index + 1}</strong></td>
                        <td>${escapeHtml(p.name)}</td>
                        <td style="text-align: right;">${p.total_sold || 0}</td>
                        <td style="text-align: right;">${formatMoney(totalSales)}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading top products:', error);
    }
}

// ========================================
// Load Top Profit Products (This Month)
// ========================================
async function loadTopProfitProducts() {
    try {
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        
        // Load all products for cost/price mapping
        const productsRes = await apiGet(API_CONFIG.ENDPOINTS.PRODUCTS, { limit: 10000 });
        
        if (!productsRes.success || !productsRes.data || !productsRes.data.products) {
            return;
        }
        
        const products = productsRes.data.products;
        const productMap = {};
        products.forEach(p => {
            productMap[p.id] = {
                name: p.name,
                cost: parseFloat(p.cost || 0),
                price: parseFloat(p.price || 0)
            };
        });
        
        // Load all sales for this month
        const salesRes = await apiGet(API_CONFIG.ENDPOINTS.SALES, { 
            date_from: firstDayStr, 
            date_to: today, 
            limit: 10000 
        });
        
        if (!salesRes.success || !salesRes.data || !salesRes.data.sales) {
            const tbody = document.getElementById('top-profit-table');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">ยังไม่มีข้อมูลการขาย</td></tr>';
            }
            return;
        }
        
        const sales = salesRes.data.sales;
        const profitByProduct = {};
        
        // Load sale details in parallel
        const detailPromises = sales.map(sale => 
            apiGet(API_CONFIG.ENDPOINTS.SALES, { id: sale.id })
        );
        const detailResults = await Promise.all(detailPromises);
        
        for (const detailData of detailResults) {
            if (detailData.success && detailData.data && detailData.data.items) {
                for (const item of detailData.data.items) {
                    const productId = item.product_id;
                    const quantity = parseFloat(item.quantity || 0);
                    const price = parseFloat(item.price_snapshot || 0);
                    const cost = parseFloat(item.cost_snapshot || 0);
                    const profit = (price - cost) * quantity;
                    
                    if (!profitByProduct[productId]) {
                        profitByProduct[productId] = {
                            name: item.product_name_snapshot || productMap[productId]?.name || 'ไม่ทราบ',
                            quantity: 0,
                            profit: 0
                        };
                    }
                    
                    profitByProduct[productId].quantity += quantity;
                    profitByProduct[productId].profit += profit;
                }
            }
        }
        
        const sorted = Object.entries(profitByProduct)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);
        
        const tbody = document.getElementById('top-profit-table');
        if (!tbody) return;
        
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">ยังไม่มีข้อมูลกำไร</td></tr>';
            return;
        }
        
        tbody.innerHTML = sorted.map((p, index) => `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${escapeHtml(p.name)}</td>
                <td style="text-align: right;">${p.quantity.toFixed(0)}</td>
                <td style="text-align: right; color: var(--success); font-weight: bold;">${formatMoney(p.profit)}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading top profit products:', error);
        const tbody = document.getElementById('top-profit-table');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
        }
    }
}

// ========================================
// Load Recent Sales
// ========================================
async function loadRecentSales() {
    try {
        const res = await apiGet(API_CONFIG.ENDPOINTS.SALES, { limit: 5 });
        
        if (res.success && res.data && res.data.sales) {
            const sales = res.data.sales;
            const tbody = document.getElementById('recent-sales-table');
            
            if (!tbody) return;
            
            if (sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">ยังไม่มีข้อมูลการขาย</td></tr>';
                return;
            }
            
            const paymentMethods = {
                'cash': 'เงินสด',
                'transfer': 'โอนเงิน',
                'other': 'อื่นๆ'
            };
            
            tbody.innerHTML = sales.map(sale => {
                const date = new Date(sale.sale_date).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return `
                    <tr>
                        <td><strong>${escapeHtml(sale.bill_no)}</strong></td>
                        <td>${date}</td>
                        <td style="text-align: right;">${formatMoney(sale.total_amount)}</td>
                        <td style="text-align: right;">${formatMoney(sale.discount)}</td>
                        <td style="text-align: right; font-weight: bold;">${formatMoney(sale.net_total)}</td>
                        <td>${paymentMethods[sale.payment_method] || sale.payment_method}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading recent sales:', error);
    }
}

// ========================================
// Load Sales Chart (ใช้ reports.php แทนการเรียกทีละวัน)
// ========================================
async function loadSalesChart() {
    try {
        const period = document.getElementById('chart-period')?.value || '7days';
        const today = new Date();
        let startDate, endDate;
        
        if (period === 'custom') {
            const fromVal = document.getElementById('chart-date-from')?.value;
            const toVal = document.getElementById('chart-date-to')?.value;
            
            if (!fromVal || !toVal) {
                showToast('กรุณาเลือกช่วงเวลา', 'warning');
                return;
            }
            
            startDate = new Date(fromVal);
            endDate = new Date(toVal);
        } else if (period === '7days') {
            endDate = new Date(today);
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
        } else { // 30days
            endDate = new Date(today);
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 29);
        }
        
        const dateFrom = startDate.toISOString().split('T')[0];
        const dateTo = endDate.toISOString().split('T')[0];
        
        console.log('📊 Loading chart data:', { dateFrom, dateTo, period });
        
        // ใช้ reports.php?type=daily_summary ดึงข้อมูลทั้งช่วงใน call เดียว
        const res = await apiGet(API_CONFIG.ENDPOINTS.REPORTS, {
            type: 'daily_summary',
            date_from: dateFrom,
            date_to: dateTo
        });
        
        if (!res.success) {
            console.error('❌ Error loading chart data:', res.message);
            showToast('ไม่สามารถโหลดข้อมูลกราฟได้', 'error');
            return;
        }
        
        const dailyData = res.data.data || [];
        
        console.log(`📥 API returned ${dailyData.length} records`);
        
        // สร้าง map ของข้อมูลที่ได้รับ
        const dataMap = {};
        dailyData.forEach(d => {
            dataMap[d.date] = {
                sales: parseFloat(d.total_net) || 0,
                profit: parseFloat(d.total_profit) || 0
            };
        });
        
        // สร้าง labels และ data ให้ครบทุกวันในช่วง
        const labels = [];
        const salesData = [];
        const profitData = [];
        
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            labels.push(currentDate.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }));
            
            const dayData = dataMap[dateStr] || { sales: 0, profit: 0 };
            salesData.push(dayData.sales);
            profitData.push(dayData.profit);
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`✅ Chart ready: ${labels.length} days`);
        console.log('📈 Sales:', salesData);
        console.log('💰 Profit:', profitData);
        
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;
        
        if (salesChart) {
            salesChart.destroy();
        }
        
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'ยอดขาย',
                        data: salesData,
                        borderColor: 'rgb(37, 99, 235)',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'กำไร',
                        data: profitData,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += '฿' + context.parsed.y.toLocaleString();
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '฿' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Error loading sales chart:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดกราฟ', 'error');
    }
}

// ========================================
// Setup Event Listeners
// ========================================
function setupEventListeners() {
    // Chart period selector
    const chartPeriod = document.getElementById('chart-period');
    if (chartPeriod) {
        chartPeriod.addEventListener('change', (e) => {
            const dateRange = document.getElementById('chart-date-range');
            if (e.target.value === 'custom') {
                if (dateRange) dateRange.style.display = 'flex';
            } else {
                if (dateRange) dateRange.style.display = 'none';
                loadSalesChart();
            }
        });
    }
    
    const btnUpdateChart = document.getElementById('btn-update-chart');
    if (btnUpdateChart) {
        btnUpdateChart.addEventListener('click', loadSalesChart);
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
            await loadSettings();
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
            settingsContents.forEach(c => c.style.display = 'none');
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

// ========================================
// Load Settings
// ========================================
async function loadSettings() {
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