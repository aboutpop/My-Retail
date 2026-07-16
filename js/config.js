/**
 * API Configuration
 * Central configuration for all API endpoints
 * Version: 2.0 - Dynamic BASE_URL (Auto-detect Environment)
 */

const API_CONFIG = {
    // ✅ Dynamic BASE_URL - ทำงานได้ทั้ง Local และ Production
    // Local (XAMPP): ตรวจจับ /myproject/ → ใช้ /myproject/My-Retail/api
    // Production (Railway): ไม่พบ /myproject/ → ใช้ /api
    BASE_URL: window.location.pathname.includes('/myproject/') 
        ? '/myproject/My-Retail/api' 
        : '/api',
    
    // API Endpoints
    ENDPOINTS: {
        // Products
        PRODUCTS: '/products.php',
        PRODUCT_BY_ID: '/products.php?id=',
        TOP_SELLING: '/products.php?top_selling=',
        
        // Categories
        CATEGORIES: '/categories.php',
        CATEGORY_BY_ID: '/categories.php?id=',
        
        // Sales
        SALES: '/sales.php',
        SALE_BY_ID: '/sales.php?id=',
        SALE_BY_BILL_NO: '/sales.php?bill_no=',
        
        // Held Bills
        HELD_BILLS: '/hold_bills.php',
        
        // Stock
        STOCK_LOGS: '/stock_logs.php',
        STOCK_IN: '/stock_in.php',
        
        // Settings
        SETTINGS: '/settings.php',
        
        // Reports (ใช้ endpoint เดียวกัน ส่ง type เป็น parameter)
        REPORTS: '/reports.php',
        
        // Test Connection
        TEST_CONNECTION: '/test_connection.php'
    },
    
    // Default Settings
    DEFAULTS: {
        ITEMS_PER_PAGE: 50,
        QUICK_ITEMS_PER_ROW: 6,
        TOP_PRODUCTS_COUNT: 5,
        LOOKBACK_DAYS: 30,
        LOW_STOCK_THRESHOLD: 10
    },
    
    // Request Headers
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Helper function to get full API URL
function getApiUrl(endpoint, params = {}) {
    let url = API_CONFIG.BASE_URL + endpoint;
    
    // Add query parameters
    const queryParams = new URLSearchParams(params);
    if (queryParams.toString()) {
        url += '?' + queryParams.toString();
    }
    
    return url;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, getApiUrl };
}