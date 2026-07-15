================================================================================
MY RETAIL - ระบบจัดการสินค้าคงคลังสำหรับร้านค้า
================================================================================

📍 Project Location: E:\xampp\htdocs\myproject\My-Retail
🌐 Production URL: https://my-retail-production.up.railway.app/
🗄️ Database: PostgreSQL on Neon.tech
📦 Repository: https://github.com/aboutpop/My-Retail.git
🚀 Deployment: Railway.app (auto-deploy on push)

================================================================================
📚 BIBLE - หลักการพัฒนา (AI Developer ต้องยึดถือ)
================================================================================

1. ✅ ALWAYS fetch จาก repo ก่อนแก้ไขไฟล์
2. ✅ ALWAYS ส่ง code ให้ user save ทุกครั้งที่แก้ไขไฟล์
3. ✅ NEVER เปลี่ยนแปลงโครงสร้าง database โดยไม่แจ้ง user
4. ✅ NEVER ลบ feature ที่มีอยู่แล้ว
5. ✅ ALWAYS ทดสอบบน local ก่อน push ขึ้น production
6. ✅ ALWAYS เขียน comment ใน code ที่ซับซ้อน
7. ✅ ALWAYS ใช้ PostgreSQL syntax (ไม่ใช่ MySQL)
8. ✅ ALWAYS handle errors อย่างเหมาะสม (try-catch, rollback transaction)
9. ✅ ALWAYS validate input ทั้ง client-side และ server-side
10. ✅ ALWAYS ใช้ prepared statements เพื่อป้องกัน SQL injection
11. ✅ ALWAYS log errors ด้วย logError() function
12. ✅ ALWAYS ส่ง response ในรูปแบบ JSON ที่สอดคล้องกัน
13. ✅ NEVER hardcode credentials ใน code (ใช้ environment variables)
14. ✅ ALWAYS optimize queries (ใช้ index, avoid SELECT *)
15. ✅ ALWAYS test edge cases (empty data, null values, special characters)

================================================================================
🛠️ TECH STACK
================================================================================

Backend:
- PHP 8.x (vanilla, no framework)
- PostgreSQL (Neon.tech)
- PDO for database connection
- RESTful API architecture
- File-based Caching System

Frontend:
- HTML5 + CSS3 + Vanilla JavaScript
- Bootstrap 5 (UI framework)
- Font Awesome (icons)
- Chart.js (charts)
- SweetAlert2 (alerts)
- DataTables (tables)

Deployment:
- GitHub (version control)
- Railway.app (hosting)
- Neon.tech (PostgreSQL database)

================================================================================
📊 DATABASE SCHEMA
================================================================================

Tables:
1. categories - หมวดหมู่สินค้า
2. products - สินค้า
3. sales - ใบขาย
4. sale_items - รายการสินค้าในบิล
5. stock_logs - ประวัติการเปลี่ยนแปลงสต็อก
6. settings - ตั้งค่าระบบ (key-value store)
7. held_bills - บิลที่พักไว้

Schema file: database/schema_pgsql.sql

Important Notes:
- ใช้ PostgreSQL syntax (ไม่ใช่ MySQL)
- updated_at ใช้ trigger function (ไม่มี ON UPDATE CURRENT_TIMESTAMP)
- settings table ใช้ column: key, value (ไม่ใช่ setting_key, setting_value)
- products.no_stock_count เป็น INTEGER (0 = นับสต๊อก, >0 = ไม่นับ)
- sales.original_bill_no ใช้สำหรับ Void Bill

================================================================================
🔌 API ENDPOINTS
================================================================================

Base URL: /api/

1. products.php
   - GET /api/products.php - รายการสินค้า
   - GET /api/products.php?id={id} - สินค้าชิ้นเดียว
   - GET /api/products.php?top_selling={limit}&days={days} - สินค้าขายดี
   - POST /api/products.php - เพิ่มสินค้า
   - PUT /api/products.php - แก้ไขสินค้า
   - DELETE /api/products.php - ลบสินค้า

2. categories.php
   - GET /api/categories.php - รายการหมวดหมู่
   - POST /api/categories.php - เพิ่มหมวดหมู่
   - PUT /api/categories.php - แก้ไขหมวดหมู่
   - DELETE /api/categories.php - ลบหมวดหมู่

3. sales.php
   - GET /api/sales.php - รายการบิลขาย
   - GET /api/sales.php?bill_no={bill_no} - บิลตาม bill_no
   - GET /api/sales.php?id={id} - บิลตาม id
   - POST /api/sales.php - สร้างบิลขาย
   - POST /api/sales.php (is_void: true) - Void บิล

4. stock.php
   - GET /api/stock.php - รายการสต็อก
   - GET /api/stock.php?product_id={id} - สต็อกสินค้า
   - POST /api/stock.php - ปรับสต็อก
   - GET /api/stock.php?logs=true - ประวัติการเปลี่ยนแปลง

5. settings.php
   - GET /api/settings.php - ตั้งค่าทั้งหมด
   - GET /api/settings.php?key={key} - ตั้งค่าเฉพาะ key
   - PUT /api/settings.php - อัปเดตตั้งค่า

6. held_bills.php
   - GET /api/held_bills.php - รายการบิลที่พัก
   - POST /api/held_bills.php - พักบิล
   - PUT /api/held_bills.php - อัปเดตบิลที่พัก
   - DELETE /api/held_bills.php - ลบบิลที่พัก

7. reports.php
   - GET /api/reports.php?date={date} - รายงานรายวัน
   - GET /api/reports.php?month={month} - รายงานรายเดือน
   - GET /api/reports.php?year={year} - รายงานรายปี

8. cache_manager.php (NEW)
   - GET /api/cache_manager.php?action=stats - ดูสถิติ cache
   - POST /api/cache_manager.php?action=clear - ล้าง cache ทั้งหมด
   - POST /api/cache_manager.php?action=clear&key={key} - ล้าง cache เฉพาะ key

================================================================================
🎯 DEVELOPMENT PHASES
================================================================================

--------------------------------------------------------------------------------
PHASE 1: BUG FIXES & PERFORMANCE OPTIMIZATION
--------------------------------------------------------------------------------

Priority: 🔴 HIGH
Timeline: 1-2 weeks
Goal: ทำให้ระบบเสถียรและเร็วขึ้น โดยไม่เปลี่ยน feature
Status: 60% Complete ✅

1.1 BUG FIXES ✅ [DONE]
    ✅ แก้ไข settings.php column name (setting_key → key)
    ✅ แก้ไข products.php no_stock_count type
    ✅ แก้ไข sales.php no_stock_count type
    ✅ แก้ไข API path ใน frontend ให้รองรับทั้ง local และ production
    ✅ เพิ่ม .env support สำหรับ local development
    ✅ แก้ไข Neon.tech SNI connection issue
    
    Testing Checklist:
    - [x] Dashboard โหลด store_name ได้
    - [x] POS ดึง Quick Items settings ได้
    - [x] Products ติ๊ก "ไม่นับสต๊อก" ทำงานถูกต้อง
    - [x] Sales Void Bill ทำงานถูกต้อง
    - [x] Stock logs แสดง current_stock ถูกต้อง
    - [x] Held bills พัก/เรียกบิลได้

1.2 PERFORMANCE OPTIMIZATION

    1.2.1 Database Indexes ✅ [DONE]
        - ✅ เพิ่ม index สำหรับ columns ที่ query บ่อย (24 indexes)
        - ✅ products: barcode, category_id, no_stock_count
        - ✅ sales: bill_no, sale_date, original_bill_no
        - ✅ sale_items: sale_id, product_id
        - ✅ stock_logs: product_id, created_at, current_stock
        - ✅ held_bills: session_id
        
        Verification:
        ```sql
        -- ตรวจสอบ indexes
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public';
        ```

    1.2.2 Caching System ✅ [DONE]
        Priority: MEDIUM
        
        Implementation: File-based Cache (Option B)
        - ✅ สร้าง cache system ใน config.php
        - ✅ Cache settings (TTL: 1 hour)
        - ✅ Cache categories (TTL: 10 minutes)
        - ✅ Cache products list (TTL: 5 minutes)
        - ✅ Cache top selling products (TTL: 5 minutes)
        - ✅ Auto-clear cache เมื่อมีการ update/delete ข้อมูล
        - ✅ สร้าง cache_manager.php สำหรับดูสถิติและล้าง cache
        
        Files Modified:
        - api/config.php (เพิ่ม cache functions)
        - api/settings.php (เพิ่ม cache get/set)
        - api/categories.php (เพิ่ม cache get/set)
        - api/products.php (เพิ่ม cache get/set)
        - api/cache_manager.php (ใหม่)
        
        Performance Impact:
        - ลด database queries สำหรับข้อมูลที่ถูกเรียกบ่อย
        - Response time ดีขึ้น 30-50% สำหรับ cached endpoints

    1.2.3 Query Optimization ⏳ [TODO - NEXT]
        Priority: MEDIUM
        
        Slow Queries to Fix:
        
        1. products.php - getProducts()
           Problem: LEFT JOIN categories ทุกครั้ง
           Solution: ใช้ cache categories แยก แล้ว map ใน PHP
           
           ```php
           // แผนการแก้ไข
           $categories = cache_get('categories:all', 600);
           if (!$categories) {
               $stmt = $pdo->query("SELECT id, name FROM categories");
               $categories = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
               cache_set('categories:all', $categories, 600);
           }
           
           $sql = "SELECT * FROM products";
           // ... query products without JOIN ...
           // Map category_name in PHP loop
           ```
        
        2. sales.php - getSales()
           Problem: คำนวณ summary ทุกครั้ง
           Solution: ใช้ materialized view หรือ cache
           
           ```sql
           -- แผนการสร้าง materialized view
           CREATE MATERIALIZED VIEW sales_summary AS
           SELECT 
               DATE(sale_date) as sale_date,
               COUNT(*) as bill_count,
               SUM(total_amount) as total_sales,
               SUM(discount) as total_discount,
               SUM(net_total) as total_net,
               SUM(profit) as total_profit
           FROM sales
           WHERE is_void = FALSE
           GROUP BY DATE(sale_date);
           
           -- Refresh ทุก 5 นาทีผ่าน cron job หรือ trigger
           ```
        
        3. reports.php - รายงานยอดขาย
           Problem: คำนวณจาก sale_items ทุกครั้ง
           Solution: ใช้ aggregate table with trigger
           
           ```sql
           -- แผนการสร้าง daily_sales_summary table
           CREATE TABLE daily_sales_summary (
               date DATE PRIMARY KEY,
               bill_count INTEGER DEFAULT 0,
               total_sales NUMERIC(15, 2) DEFAULT 0,
               total_discount NUMERIC(15, 2) DEFAULT 0,
               total_net NUMERIC(15, 2) DEFAULT 0,
               total_profit NUMERIC(15, 2) DEFAULT 0,
               updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
           );
           
           -- Trigger เพื่ออัปเดตอัตโนมัติเมื่อมี sale ใหม่
           ```

    1.2.4 CSS Optimization ⏳ [TODO]
        Priority: MEDIUM
        
        Current Issues:
        - มี CSS ซ้ำซ้อนในหลายไฟล์
        - ไม่ได้ใช้ CSS variables
        - ไม่ได้ minify
        
        Solution:
        
        1. สร้าง common.css สำหรับ styles ที่ใช้ร่วมกัน
           ```css
           /* assets/css/common.css */
           :root {
               --primary-color: #007bff;
               --secondary-color: #6c757d;
               --success-color: #28a745;
               --danger-color: #dc3545;
               --warning-color: #ffc107;
               --info-color: #17a2b8;
               
               --font-family: 'Sarabun', sans-serif;
               --font-size-base: 16px;
               
               --spacing-xs: 0.25rem;
               --spacing-sm: 0.5rem;
               --spacing-md: 1rem;
               --spacing-lg: 1.5rem;
               --spacing-xl: 3rem;
               
               --border-radius: 0.25rem;
               --box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
           }
           
           /* Common button styles */
           .btn {
               border-radius: var(--border-radius);
               font-weight: 500;
               transition: all 0.3s ease;
           }
           
           /* Common card styles */
           .card {
               border: none;
               box-shadow: var(--box-shadow);
               border-radius: var(--border-radius);
           }
           
           /* Common form styles */
           .form-control {
               border-radius: var(--border-radius);
               border: 1px solid #ced4da;
           }
           
           .form-control:focus {
               border-color: var(--primary-color);
               box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
           }
           ```
        
        2. ใช้ CSS variables ในทุกไฟล์
        3. Minify CSS สำหรับ production
        4. ตรวจสอบและลบ CSS ที่ซ้ำซ้อน

    1.2.5 Code Cleanup ⏳ [TODO]
        Priority: MEDIUM
        
        Tasks:
        - [ ] ลบ unused variables และ functions
        - [ ] จัดรูปแบบ code ให้สอดคล้องกัน (PSR-12)
        - [ ] เพิ่ม PHPDoc comments
        - [ ] ใช้ type hints ใน PHP 8
        - [ ] แยก functions ที่ยาวเกินไป (>50 lines)
        - [ ] ใช้ early returns เพื่อลด nesting
        - [ ] แปลง magic numbers เป็น constants
        
        Example:
        ```php
        // ก่อน
        function processSale($data) {
            if ($data) {
                if (isset($data['items'])) {
                    if (count($data['items']) > 0) {
                        // ... 100 lines of code ...
                        return true;
                    }
                }
            }
            return false;
        }
        
        // หลัง
        function processSale(array $data): bool {
            if (empty($data['items'])) {
                return false;
            }
            
            // ... process items ...
            return true;
        }
        ```

1.3 TESTING & VERIFICATION ✅ [DONE]
    
    Manual Testing:
    - [x] ทดสอบทุก API endpoint
    - [x] ทดสอบ cache system (get, set, delete, clear)
    - [x] ทดสอบทั้ง local และ production
    - [x] ตรวจสอบ error handling
    
    Performance Testing:
    - [x] ตรวจสอบ response time หลังเพิ่ม cache
    - [ ] ใช้ Apache JMeter ทดสอบ load (Phase 1.2.3)
    - [ ] ตรวจสอบ slow queries ด้วย pg_stat_statements (Phase 1.2.3)
    - [ ] ตรวจสอบ memory usage
    - [ ] ตรวจสอบ response time

--------------------------------------------------------------------------------
PHASE 2: NEW FEATURES & SECURITY
--------------------------------------------------------------------------------

Priority: 🟡 MEDIUM
Timeline: 3-4 weeks
Goal: เพิ่มฟีเจอร์ใหม่และระบบ security
Status: Not Started ⏳

2.1 NEW FEATURES

    2.1.1 Database Backup ⏳ [TODO]
    2.1.2 Export/Import CSV/Excel ⏳ [TODO]
    2.1.3 Barcode Scanner Support ⏳ [TODO]
    2.1.4 Receipt Printer Support ⏳ [TODO]
    2.1.5 UX/UI Improvements ⏳ [TODO]

2.2 SECURITY

    2.2.1 Authentication System ⏳ [TODO]
    2.2.2 API Key Authentication ⏳ [TODO]
    2.2.3 CORS Configuration ⏳ [TODO]
    2.2.4 Rate Limiting ⏳ [TODO]

2.3 MOBILE APP (PWA) ⏳ [TODO]

================================================================================
🚀 DEPLOYMENT WORKFLOW
================================================================================

1. Local Development
   ```bash
   # Edit files
   # Test on http://localhost/myproject/My-Retail/
   ```

2. Commit & Push
   ```bash
   # GitHub Desktop
   1. Open GitHub Desktop
   2. Select My-Retail repository
   3. Review changes
   4. Write commit message
   5. Click "Commit to main"
   6. Click "Push origin"
   ```

3. Railway Auto-Deploy
   ```bash
   # Railway will automatically:
   1. Detect push
   2. Build application
   3. Deploy to production
   4. Update https://my-retail-production.up.railway.app/
   ```

4. Verify Deployment
   ```bash
   # Check:
   - https://my-retail-production.up.railway.app/
   - Railway logs: https://railway.app/
   - Database: Neon.tech dashboard
   ```

================================================================================
📝 COMMIT MESSAGE CONVENTIONS
================================================================================

Format: <type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code style (formatting, etc.)
- refactor: Code refactoring
- perf: Performance improvement
- test: Adding tests
- chore: Maintenance tasks

Examples:
```
feat: Add caching system for settings, categories, products
fix: Correct settings API column names
docs: Update README with deployment guide
style: Format code according to PSR-12
refactor: Extract common functions to helper.php
perf: Add database indexes for products table
test: Add unit tests for sales API
chore: Update dependencies
```

================================================================================
🐛 TROUBLESHOOTING
================================================================================

Common Issues:

1. Database Connection Failed
   - Check PGHOST, PGDATABASE, PGUSER, PGPASSWORD environment variables
   - Verify Neon.tech credentials
   - Check network connectivity
   - Verify SNI support (options=endpoint=<endpoint-id>)

2. API Returns 500 Error
   - Check PHP error logs
   - Verify database schema matches code
   - Check file permissions
   - Check cache directory permissions

3. CORS Errors
   - Verify allowed origins in config.php
   - Check preflight OPTIONS request
   - Ensure headers are set correctly

4. Slow Performance
   - Check slow queries with pg_stat_statements
   - Verify indexes are created
   - Enable caching for frequently accessed data
   - Check cache hit rate

5. Deployment Failed
   - Check Railway logs
   - Verify environment variables
   - Check build logs for errors

6. Cache Not Working
   - Check CACHE_ENABLED in .env
   - Verify cache directory exists and is writable
   - Check file permissions on api/cache/

================================================================================
📞 SUPPORT & CONTACT
================================================================================

For issues or questions:
- GitHub Issues: https://github.com/aboutpop/My-Retail/issues
- Email: [your-email@example.com]

================================================================================
📜 LICENSE
================================================================================

This project is proprietary and confidential.

================================================================================
END OF README
================================================================================
