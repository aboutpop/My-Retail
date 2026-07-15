// assets/js/api-config.js
// กำหนด API Base URL อัตโนมัติตาม environment
const API_BASE = window.location.pathname.includes('/myproject/') 
    ? '/myproject/My-Retail/api' 
    : '/api';

// หรือใช้ relative path
// const API_BASE = './api';