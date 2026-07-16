/**
 * Utility Functions
 * Shared helper functions for all pages
 */

// ========================================
// API Helper Functions
// ========================================

/**
 * เรียก API แบบ async/await พร้อม error handling
 * @param {string} endpoint - API endpoint (เช่น '/products.php')
 * @param {object} options - { method, body, params }
 * @returns {Promise<object>} - { success, data, message }
 */
async function apiCall(endpoint, options = {}) {
    const { method = 'GET', body = null, params = {} } = options;
    
    try {
        let url = API_CONFIG.BASE_URL + endpoint;
        
        // Add query parameters
        if (Object.keys(params).length > 0) {
            const queryParams = new URLSearchParams(params);
            url += '?' + queryParams.toString();
        }
        
        const config = {
            method: method,
            headers: API_CONFIG.HEADERS
        };
        
        if (body && method !== 'GET') {
            config.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, config);
        const data = await response.json();
        
        return {
            success: data.status === 'success',
            data: data.data || data,
            message: data.message || 'Success'
        };
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            data: null,
            message: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ API'
        };
    }
}

/**
 * เรียก API สำหรับ GET request
 */
async function apiGet(endpoint, params = {}) {
    return apiCall(endpoint, { method: 'GET', params });
}

/**
 * เรียก API สำหรับ POST request
 */
async function apiPost(endpoint, body = {}) {
    return apiCall(endpoint, { method: 'POST', body });
}

/**
 * เรียก API สำหรับ PUT request
 */
async function apiPut(endpoint, body = {}) {
    return apiCall(endpoint, { method: 'PUT', body });
}

/**
 * เรียก API สำหรับ DELETE request (ส่ง body)
 */
async function apiDelete(endpoint, body = {}) {
    return apiCall(endpoint, { method: 'DELETE', body });
}

/**
 * เรียก API สำหรับ DELETE request พร้อม query parameters
 * ใช้สำหรับ endpoints ที่รับ parameters ผ่าน query string
 * @param {string} endpoint - API endpoint
 * @param {object} params - Query parameters
 * @returns {Promise<object>} - { success, data, message }
 */
async function apiDeleteWithParams(endpoint, params = {}) {
    let url = API_CONFIG.BASE_URL + endpoint;
    
    // Add query parameters
    const queryParams = new URLSearchParams(params);
    if (queryParams.toString()) {
        url += '?' + queryParams.toString();
    }
    
    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: API_CONFIG.HEADERS
        });
        const data = await response.json();
        
        return {
            success: data.status === 'success',
            data: data.data || data,
            message: data.message || 'Success'
        };
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            data: null,
            message: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ API'
        };
    }
}

// ========================================
// Format Functions
// ========================================

/**
 * Format ตัวเงินเป็นรูปแบบไทย (เช่น ฿1,234.56)
 * @param {number} amount - จำนวนเงิน
 * @param {number} decimals - จำนวนทศนิยม (default: 2)
 * @returns {string} - ตัวเงินที่ format แล้ว
 */
function formatMoney(amount, decimals = 2) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '฿0.00';
    }
    
    const num = parseFloat(amount);
    const formatted = num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `฿${formatted}`;
}

/**
 * Format วันที่เป็นรูปแบบไทย (เช่น 15 ม.ค. 2567)
 * @param {string|Date} date - วันที่ (ISO string หรือ Date object)
 * @param {object} options - { showTime, showYear }
 * @returns {string} - วันที่ที่ format แล้ว
 */
function formatDate(date, options = {}) {
    const { showTime = false, showYear = true } = options;
    
    if (!date) return '-';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = showYear ? d.getFullYear() + 543 : ''; // พ.ศ.
    
    let result = `${day} ${month}`;
    if (showYear) result += ` ${year}`;
    
    if (showTime) {
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        result += ` ${hours}:${minutes} น.`;
    }
    
    return result;
}

/**
 * Format วันที่แบบเต็ม (เช่น 15 มกราคม 2567)
 */
function formatDateFull(date) {
    if (!date) return '-';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543;
    
    return `${day} ${month} ${year}`;
}

/**
 * Format วันที่สำหรับ input type="date" (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Format วันที่วันนี้
 */
function getToday() {
    return formatDateForInput(new Date());
}

/**
 * Format วันที่เมื่อวาน
 */
function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDateForInput(d);
}

// ========================================
// UI Helper Functions
// ========================================

/**
 * แสดง Toast Notification
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {string} type - ประเภท (success, error, warning, info)
 * @param {number} duration - ระยะเวลาแสดง (ms, default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
        font-family: inherit;
        font-size: 0.95rem;
        max-width: 400px;
    `;
    
    // Set colors based on type
    const colors = {
        success: { bg: '#d1fae5', color: '#065f46', border: '#10b981' },
        error: { bg: '#fee2e2', color: '#991b1b', border: '#ef4444' },
        warning: { bg: '#fef3c7', color: '#92400e', border: '#f59e0b' },
        info: { bg: '#e0f2fe', color: '#075985', border: '#0ea5e9' }
    };
    
    const color = colors[type] || colors.info;
    toast.style.backgroundColor = color.bg;
    toast.style.color = color.color;
    toast.style.borderLeft = `4px solid ${color.border}`;
    
    // Add animation keyframes
    if (!document.querySelector('#toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Get icon name for toast type
 */
function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

/**
 * แสดง Loading State ใน element
 * @param {HTMLElement} element - Element ที่ต้องการแสดง loading
 * @param {string} message - ข้อความ (default: 'กำลังโหลด...')
 */
function showLoading(element, message = 'กำลังโหลด...') {
    if (!element) return;
    
    element.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>${message}</p>
        </div>
    `;
}

/**
 * แสดง Empty State ใน element
 * @param {HTMLElement} element - Element ที่ต้องการแสดง empty state
 * @param {string} message - ข้อความ (default: 'ไม่พบข้อมูล')
 * @param {string} icon - Icon class (default: 'inbox')
 */
function showEmptyState(element, message = 'ไม่พบข้อมูล', icon = 'inbox') {
    if (!element) return;
    
    element.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-${icon}"></i>
            <h3>${message}</h3>
        </div>
    `;
}

/**
 * แสดง Error State ใน element
 * @param {HTMLElement} element - Element ที่ต้องการแสดง error
 * @param {string} message - ข้อความ error
 */
function showErrorState(element, message = 'เกิดข้อผิดพลาด') {
    if (!element) return;
    
    element.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        </div>
    `;
}

/**
 * เปิด Modal
 * @param {string} modalId - ID ของ modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * ปิด Modal
 * @param {string} modalId - ID ของ modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

/**
 * ยืนยันการกระทำ (Confirm Dialog)
 * @param {string} message - ข้อความยืนยัน
 * @returns {Promise<boolean>} - true ถ้ากด OK, false ถ้ากด Cancel
 */
function confirmAction(message = 'คุณแน่ใจหรือไม่?') {
    return new Promise((resolve) => {
        const result = confirm(message);
        resolve(result);
    });
}

// ========================================
// Validation Functions
// ========================================

/**
 * ตรวจสอบว่าค่าว่างหรือไม่
 * @param {any} value - ค่าที่ต้องการตรวจสอบ
 * @returns {boolean}
 */
function isEmpty(value) {
    return value === null || value === undefined || value === '' || 
           (typeof value === 'string' && value.trim() === '') ||
           (Array.isArray(value) && value.length === 0);
}

/**
 * ตรวจสอบ email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * ตรวจสอบเบอร์โทร format (ไทย)
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
    const regex = /^0\d{1,2}-?\d{3,4}-?\d{3,4}$/;
    return regex.test(phone.replace(/\s/g, ''));
}

/**
 * ตรวจสอบจำนวนเงิน
 * @param {any} value
 * @returns {boolean}
 */
function isValidAmount(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
}

// ========================================
// Storage Functions (localStorage)
// ========================================

/**
 * บันทึกข้อมูลลง localStorage
 * @param {string} key
 * @param {any} value
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Storage Error:', error);
    }
}

/**
 * ดึงข้อมูลจาก localStorage
 * @param {string} key
 * @returns {any}
 */
function getFromStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('Storage Error:', error);
        return null;
    }
}

/**
 * ลบข้อมูลจาก localStorage
 * @param {string} key
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Storage Error:', error);
    }
}

/**
 * ล้างข้อมูลทั้งหมดใน localStorage
 */
function clearStorage() {
    try {
        localStorage.clear();
    } catch (error) {
        console.error('Storage Error:', error);
    }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Debounce function (สำหรับ search input)
 * @param {Function} func
 * @param {number} wait - milliseconds
 * @returns {Function}
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate random string
 * @param {number} length
 * @returns {string}
 */
function generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Copy text to clipboard
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Copy Error:', error);
        return false;
    }
}

/**
 * Scroll to element
 * @param {string|HTMLElement} element
 * @param {object} options
 */
function scrollToElement(element, options = {}) {
    const { offset = 0, behavior = 'smooth' } = options;
    
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;
    
    const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior });
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Truncate text with ellipsis
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ========================================
// Export for use in other files
// ========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiCall, apiGet, apiPost, apiPut, apiDelete, apiDeleteWithParams,
        formatMoney, formatDate, formatDateFull, formatDateForInput, getToday, getYesterday,
        showToast, showLoading, showEmptyState, showErrorState, openModal, closeModal, confirmAction,
        isEmpty, isValidEmail, isValidPhone, isValidAmount,
        saveToStorage, getFromStorage, removeFromStorage, clearStorage,
        debounce, generateRandomString, copyToClipboard, scrollToElement, escapeHtml, truncateText
    };
}