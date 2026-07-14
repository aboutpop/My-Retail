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

================================================================================
🎯 DEVELOPMENT PHASES
================================================================================

--------------------------------------------------------------------------------
PHASE 1: BUG FIXES & PERFORMANCE OPTIMIZATION
--------------------------------------------------------------------------------

Priority: 🔴 HIGH
Timeline: 1-2 weeks
Goal: ทำให้ระบบเสถียรและเร็วขึ้น โดยไม่เปลี่ยน feature

1.1 BUG FIXES
    ✅ [DONE] แก้ไข settings.php column name (setting_key → key)
    ✅ [DONE] แก้ไข products.php no_stock_count type
    ✅ [DONE] แก้ไข sales.php no_stock_count type
    ⏳ [TODO] ตรวจสอบและแก้ไข bug อื่นๆ ที่พบ
    
    Testing Checklist:
    - [ ] Dashboard โหลด store_name ได้
    - [ ] POS ดึง Quick Items settings ได้
    - [ ] Products ติ๊ก "ไม่นับสต๊อก" ทำงานถูกต้อง
    - [ ] Sales Void Bill ทำงานถูกต้อง
    - [ ] Stock logs แสดง current_stock ถูกต้อง
    - [ ] Held bills พัก/เรียกบิลได้

1.2 PERFORMANCE OPTIMIZATION

    1.2.1 Database Indexes ✅ [DONE]
        - ✅ เพิ่ม index สำหรับ columns ที่ query บ่อย
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

    1.2.2 Caching System ⏳ [TODO]
        Priority: MEDIUM
        
        Option A: Redis (แนะนำ)
        - ติดตั้ง Redis บน Railway
        - Cache settings table (read บ่อย, change น้อย)
        - Cache products list (TTL: 5 minutes)
        - Cache categories (TTL: 10 minutes)
        
        Implementation:
        ```php
        // api/config.php
        $redis = new Redis();
        $redis->connect(getenv('REDIS_HOST'), getenv('REDIS_PORT'));
        
        // api/settings.php
        function handleGet() {
            global $pdo, $redis;
            
            $cacheKey = 'settings:all';
            $cached = $redis->get($cacheKey);
            
            if ($cached) {
                $settings = json_decode($cached, true);
            } else {
                // Query from database
                $stmt = $pdo->query("SELECT key, value FROM settings");
                $settings = [];
                while ($row = $stmt->fetch()) {
                    $settings[$row['key']] = $row['value'];
                }
                
                // Cache for 1 hour
                $redis->setex($cacheKey, 3600, json_encode($settings));
            }
            
            sendResponse('success', ['settings' => $settings], 'Success');
        }
        
        // Invalidate cache on update
        function handlePut() {
            global $redis;
            // ... update logic ...
            $redis->del('settings:all');
        }
        ```
        
        Option B: File-based Cache (ถ้าไม่มี Redis)
        ```php
        // api/cache.php
        function cache_get($key, $ttl = 3600) {
            $cacheFile = __DIR__ . '/cache/' . md5($key) . '.cache';
            
            if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $ttl) {
                return json_decode(file_get_contents($cacheFile), true);
            }
            
            return false;
        }
        
        function cache_set($key, $data) {
            $cacheFile = __DIR__ . '/cache/' . md5($key) . '.cache';
            file_put_contents($cacheFile, json_encode($data));
        }
        
        function cache_delete($key) {
            $cacheFile = __DIR__ . '/cache/' . md5($key) . '.cache';
            if (file_exists($cacheFile)) {
                unlink($cacheFile);
            }
        }
        ```

    1.2.3 Query Optimization ⏳ [TODO]
        
        Slow Queries to Fix:
        
        1. products.php - getProducts()
           Problem: LEFT JOIN categories ทุกครั้ง
           Solution: ใช้ cache หรือ eager loading
           
           ```php
           // ก่อน
           $sql = "SELECT p.*, c.name as category_name 
                   FROM products p 
                   LEFT JOIN categories c ON p.category_id = c.id";
           
           // หลัง (ใช้ cache)
           $categories = cache_get('categories:all', 600);
           if (!$categories) {
               $stmt = $pdo->query("SELECT id, name FROM categories");
               $categories = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
               cache_set('categories:all', $categories);
           }
           
           $sql = "SELECT * FROM products";
           // ... query products ...
           // Map category_name in PHP
           foreach ($products as &$product) {
               $product['category_name'] = $categories[$product['category_id']] ?? null;
           }
           ```
        
        2. sales.php - getSales()
           Problem: คำนวณ summary ทุกครั้ง
           Solution: ใช้ materialized view หรือ cache
           
           ```sql
           -- สร้าง materialized view
           CREATE MATERIALIZED VIEW sales_summary AS
           SELECT 
               DATE(sale_date) as sale_date,
               COUNT(*) as bill_count,
               SUM(total_amount) as total_sales,
               SUM(discount) as total_discount,
               SUM(net_total) as total_net,
               SUM(profit) as total_profit
           FROM sales
           GROUP BY DATE(sale_date);
           
           -- Refresh ทุก 5 นาที
           REFRESH MATERIALIZED VIEW sales_summary;
           ```
        
        3. reports.php - รายงานยอดขาย
           Problem: คำนวณจาก sale_items ทุกครั้ง
           Solution: ใช้ aggregate table
           
           ```sql
           -- สร้าง table สำหรับเก็บยอดขายรายวัน
           CREATE TABLE daily_sales_summary (
               date DATE PRIMARY KEY,
               bill_count INTEGER DEFAULT 0,
               total_sales NUMERIC(15, 2) DEFAULT 0,
               total_discount NUMERIC(15, 2) DEFAULT 0,
               total_net NUMERIC(15, 2) DEFAULT 0,
               total_profit NUMERIC(15, 2) DEFAULT 0,
               updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
           );
           
           -- Trigger เพื่ออัปเดตอัตโนมัติ
           CREATE OR REPLACE FUNCTION update_daily_sales_summary()
           RETURNS TRIGGER AS $$
           BEGIN
               INSERT INTO daily_sales_summary (date, bill_count, total_sales, total_discount, total_net, total_profit)
               VALUES (
                   DATE(NEW.sale_date),
                   1,
                   NEW.total_amount,
                   NEW.discount,
                   NEW.net_total,
                   NEW.profit
               )
               ON CONFLICT (date) DO UPDATE SET
                   bill_count = daily_sales_summary.bill_count + 1,
                   total_sales = daily_sales_summary.total_sales + EXCLUDED.total_sales,
                   total_discount = daily_sales_summary.total_discount + EXCLUDED.total_discount,
                   total_net = daily_sales_summary.total_net + EXCLUDED.total_net,
                   total_profit = daily_sales_summary.total_profit + EXCLUDED.total_profit,
                   updated_at = CURRENT_TIMESTAMP;
               RETURN NEW;
           END;
           $$ LANGUAGE plpgsql;
           
           CREATE TRIGGER trigger_sales_summary
               AFTER INSERT ON sales
               FOR EACH ROW
               EXECUTE FUNCTION update_daily_sales_summary();
           ```

    1.2.4 CSS Optimization ⏳ [TODO]
        
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
           ```css
           /* แทนที่จะเขียน */
           .button {
               background-color: #007bff;
               color: white;
               padding: 10px 20px;
           }
           
           /* ใช้ */
           .button {
               background-color: var(--primary-color);
               color: white;
               padding: var(--spacing-sm) var(--spacing-md);
           }
           ```
        
        3. Minify CSS สำหรับ production
           ```bash
           # ใช้ tools เช่น cssnano, clean-css
           npx cssnano assets/css/style.css assets/css/style.min.css
           ```
        
        4. ตรวจสอบ CSS ที่ซ้ำซ้อน
           ```bash
           # ใช้ tools เช่น uncss, purgecss
           npx uncss assets/css/style.css --ignore '.dynamic-class'
           ```

    1.2.5 Code Cleanup ⏳ [TODO]
        
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

1.3 TESTING & VERIFICATION
    
    Manual Testing:
    - [ ] ทดสอบทุก API endpoint ด้วย Postman
    - [ ] ทดสอบ edge cases (empty data, null values)
    - [ ] ทดสอบ concurrent requests
    - [ ] ทดสอบ error handling
    
    Performance Testing:
    - [ ] ใช้ Apache JMeter ทดสอบ load
    - [ ] ตรวจสอบ slow queries ด้วย pg_stat_statements
    - [ ] ตรวจสอบ memory usage
    - [ ] ตรวจสอบ response time
    
    Tools:
    ```bash
    # ตรวจสอบ slow queries
    SELECT * FROM pg_stat_statements 
    WHERE total_time > 1000 
    ORDER BY total_time DESC;
    
    # ตรวจสอบ index usage
    SELECT schemaname, tablename, attname, n_distinct, correlation
    FROM pg_stats
    WHERE schemaname = 'public';
    ```

--------------------------------------------------------------------------------
PHASE 2: NEW FEATURES & SECURITY
--------------------------------------------------------------------------------

Priority: 🟡 MEDIUM
Timeline: 3-4 weeks
Goal: เพิ่มฟีเจอร์ใหม่และระบบ security

2.1 NEW FEATURES

    2.1.1 Database Backup ⏳ [TODO]
        Priority: 🔴 HIGH
        
        Requirements:
        - Backup อัตโนมัติทุกวัน (cron job)
        - เก็บ backup ไว้ 30 วัน
        - รองรับ manual backup
        - ส่ง email แจ้งเตือนเมื่อ backup สำเร็จ/ล้มเหลว
        
        Implementation:
        ```php
        // api/backup.php
        function createBackup() {
            $backupDir = __DIR__ . '/../backups/';
            $filename = 'backup_' . date('Y-m-d_H-i-s') . '.sql';
            $filepath = $backupDir . $filename;
            
            // ใช้ pg_dump
            $command = sprintf(
                'pg_dump -h %s -U %s -d %s -F c -b -v -f %s',
                getenv('DB_HOST'),
                getenv('DB_USER'),
                getenv('DB_NAME'),
                escapeshellarg($filepath)
            );
            
            exec($command, $output, $returnCode);
            
            if ($returnCode !== 0) {
                throw new Exception('Backup failed: ' . implode("\n", $output));
            }
            
            // ลบ backup เก่า (>30 วัน)
            $oldBackups = glob($backupDir . 'backup_*.sql');
            foreach ($oldBackups as $file) {
                if (filemtime($file) < strtotime('-30 days')) {
                    unlink($file);
                }
            }
            
            return $filename;
        }
        
        // Cron job (Railway)
        // เพิ่มใน railway.toml
        [build]
        builder = "nixpacks"
        
        [deploy]
        startCommand = "php -S 0.0.0.0:8000 -t public"
        restartPolicyType = "always"
        
        [[deploy.jobs]]
        schedule = "0 2 * * *"  # ทุกวัน 2:00 AM
        command = "php /app/api/backup.php"
        ```
        
        Frontend:
        - เพิ่มปุ่ม "Backup Database" ใน Settings
        - แสดงรายการ backup ที่มี
        - รองรับ download backup

    2.1.2 Export/Import CSV/Excel ⏳ [TODO]
        Priority: 🟡 MEDIUM
        
        Requirements:
        - Export สินค้าเป็น CSV/Excel
        - Import สินค้าจาก CSV/Excel
        - Validate ข้อมูลก่อน import
        - แสดง preview ก่อน import
        - รองรับ bulk update
        
        Implementation:
        ```php
        // api/export.php
        function exportProducts() {
            global $pdo;
            
            $stmt = $pdo->query("SELECT * FROM products ORDER BY id");
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // สร้าง CSV
            $filename = 'products_' . date('Y-m-d_H-i-s') . '.csv';
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            
            $output = fopen('php://output', 'w');
            
            // UTF-8 BOM สำหรับ Excel
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Header
            fputcsv($output, ['ID', 'ชื่อสินค้า', 'Barcode', 'ราคา', 'ต้นทุน', 'สต๊อก', 'หน่วย', 'หมวดหมู่']);
            
            // Data
            foreach ($products as $product) {
                fputcsv($output, [
                    $product['id'],
                    $product['name'],
                    $product['barcode'],
                    $product['price'],
                    $product['cost'],
                    $product['stock'],
                    $product['unit'],
                    $product['category']
                ]);
            }
            
            fclose($output);
        }
        
        // api/import.php
        function importProducts() {
            global $pdo;
            
            if (!isset($_FILES['file'])) {
                sendResponse('error', [], 'No file uploaded');
                return;
            }
            
            $file = $_FILES['file'];
            
            if ($file['error'] !== UPLOAD_ERR_OK) {
                sendResponse('error', [], 'Upload failed');
                return;
            }
            
            // อ่าน CSV
            $handle = fopen($file['tmp_name'], 'r');
            
            // ข้าม header
            fgetcsv($handle);
            
            $imported = 0;
            $errors = [];
            
            $pdo->beginTransaction();
            
            try {
                while (($row = fgetcsv($handle)) !== false) {
                    // Validate
                    if (empty($row[1]) || empty($row[2])) {
                        $errors[] = "Row {$imported}: Name and barcode required";
                        continue;
                    }
                    
                    // Check duplicate barcode
                    $checkStmt = $pdo->prepare("SELECT id FROM products WHERE barcode = ?");
                    $checkStmt->execute([$row[2]]);
                    
                    if ($checkStmt->fetch()) {
                        $errors[] = "Row {$imported}: Barcode {$row[2]} already exists";
                        continue;
                    }
                    
                    // Insert
                    $insertStmt = $pdo->prepare("
                        INSERT INTO products (name, barcode, price, cost, stock, unit, category)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $insertStmt->execute([
                        $row[1],  // name
                        $row[2],  // barcode
                        $row[3],  // price
                        $row[4],  // cost
                        $row[5],  // stock
                        $row[6],  // unit
                        $row[7]   // category
                    ]);
                    
                    $imported++;
                }
                
                $pdo->commit();
                
                sendResponse('success', [
                    'imported' => $imported,
                    'errors' => $errors
                ], 'Import completed');
                
            } catch (Exception $e) {
                $pdo->rollBack();
                sendResponse('error', [], 'Import failed: ' . $e->getMessage());
            }
            
            fclose($handle);
        }
        ```
        
        Frontend:
        - เพิ่มปุ่ม "Export" ในหน้า Products
        - เพิ่มปุ่ม "Import" พร้อม file upload
        - แสดง preview ก่อน import
        - แสดงสรุปผลหลัง import (success/errors)

    2.1.3 Barcode Scanner Support ⏳ [TODO]
        Priority: 🟡 MEDIUM
        
        Requirements:
        - รองรับ USB barcode scanner (HID keyboard)
        - Auto-focus input field
        - Auto-submit เมื่อ scan เสร็จ
        - แสดง sound feedback
        - รองรับ multiple scanners
        
        Implementation:
        ```javascript
        // assets/js/barcode-scanner.js
        class BarcodeScanner {
            constructor(inputElement, options = {}) {
                this.input = inputElement;
                this.options = {
                    soundEnabled: options.soundEnabled ?? true,
                    autoSubmit: options.autoSubmit ?? true,
                    minLength: options.minLength ?? 3,
                    onScan: options.onScan || null
                };
                
                this.buffer = '';
                this.lastKeyTime = 0;
                this.threshold = 50; // ms between keys
                
                this.init();
            }
            
            init() {
                // Auto-focus
                this.input.focus();
                
                // Listen for keydown
                this.input.addEventListener('keydown', (e) => {
                    this.handleKeyDown(e);
                });
                
                // Listen for paste (some scanners paste)
                this.input.addEventListener('paste', (e) => {
                    this.handlePaste(e);
                });
            }
            
            handleKeyDown(e) {
                const currentTime = Date.now();
                
                // Enter key
                if (e.key === 'Enter') {
                    e.preventDefault();
                    
                    if (this.buffer.length >= this.options.minLength) {
                        this.processBarcode(this.buffer);
                        this.buffer = '';
                    }
                    
                    return;
                }
                
                // Ignore special keys
                if (e.key.length > 1) {
                    return;
                }
                
                // Check if typing too fast (scanner)
                const timeDiff = currentTime - this.lastKeyTime;
                
                if (timeDiff < this.threshold) {
                    this.buffer += e.key;
                } else {
                    this.buffer = e.key;
                }
                
                this.lastKeyTime = currentTime;
            }
            
            handlePaste(e) {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                this.processBarcode(pastedText);
            }
            
            processBarcode(barcode) {
                // Sound feedback
                if (this.options.soundEnabled) {
                    this.playBeep();
                }
                
                // Set value
                this.input.value = barcode;
                
                // Auto-submit
                if (this.options.autoSubmit) {
                    this.input.form.submit();
                }
                
                // Callback
                if (this.options.onScan) {
                    this.options.onScan(barcode);
                }
            }
            
            playBeep() {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZTpvb/82AJBQoXs7n04YgBShj0OvNgx4CKWbR7NKIHAUpYtDu04cWByln0e7ThxUHKWjS7tOIFQYpZ9Lu04gVBilo0u7TiBUCKWfS7tOIFQYpZ9Lu04gVBilo0u7TiBUHKWfS7tOIFQYpZ9Lu04gVBg==');
                audio.play().catch(e => console.log('Audio play failed:', e));
            }
        }
        
        // Usage
        const scanner = new BarcodeScanner(document.getElementById('barcode-input'), {
            soundEnabled: true,
            autoSubmit: false,
            onScan: (barcode) => {
                // Add product to cart
                addProductToCart(barcode);
            }
        });
        ```
        
        Frontend:
        - เพิ่ม barcode input field ใน POS
        - เพิ่ม settings สำหรับ scanner (sound, auto-submit)
        - แสดง indicator เมื่อ scanner พร้อมใช้งาน

    2.1.4 Receipt Printer Support ⏳ [TODO]
        Priority: 🟡 MEDIUM
        
        Requirements:
        - รองรับ thermal printer (58mm, 80mm)
        - ESC/POS commands
        - Print logo, barcode, QR code
        - Auto-cut paper
        - Print preview
        
        Implementation:
        ```javascript
        // assets/js/receipt-printer.js
        class ReceiptPrinter {
            constructor(options = {}) {
                this.paperWidth = options.paperWidth || 80; // mm
                this.charPerLine = this.paperWidth === 58 ? 32 : 48;
            }
            
            printReceipt(sale, storeInfo) {
                let receipt = '';
                
                // Header
                receipt += this.centerText(storeInfo.name) + '\n';
                receipt += this.centerText(storeInfo.address) + '\n';
                receipt += this.centerText('Tel: ' + storeInfo.phone) + '\n';
                receipt += this.line() + '\n';
                
                // Bill info
                receipt += `Bill No: ${sale.bill_no}\n`;
                receipt += `Date: ${this.formatDate(sale.sale_date)}\n`;
                receipt += `Cashier: ${sale.cashier || 'N/A'}\n`;
                receipt += this.line() + '\n';
                
                // Items
                receipt += 'Item          Qty    Price    Total\n';
                receipt += this.line() + '\n';
                
                sale.items.forEach(item => {
                    receipt += this.formatItem(item);
                });
                
                receipt += this.line() + '\n';
                
                // Totals
                receipt += this.rightText(`Subtotal: ${this.formatMoney(sale.total_amount)}\n`);
                receipt += this.rightText(`Discount: ${this.formatMoney(sale.discount)}\n`);
                receipt += this.rightText(`Net Total: ${this.formatMoney(sale.net_total)}\n`);
                receipt += this.line() + '\n';
                
                // Payment
                receipt += `Payment: ${sale.payment_method.toUpperCase()}\n`;
                receipt += this.line() + '\n';
                
                // Footer
                receipt += this.centerText('Thank you!') + '\n';
                receipt += this.centerText('Welcome back again') + '\n';
                
                // Barcode
                receipt += this.barcode(sale.bill_no);
                
                // Print
                this.sendToPrinter(receipt);
            }
            
            centerText(text) {
                const padding = Math.floor((this.charPerLine - text.length) / 2);
                return ' '.repeat(padding) + text;
            }
            
            rightText(text) {
                const padding = this.charPerLine - text.length;
                return ' '.repeat(padding) + text;
            }
            
            line() {
                return '-'.repeat(this.charPerLine);
            }
            
            formatItem(item) {
                let line = '';
                line += item.product_name_snapshot.substring(0, 14).padEnd(14);
                line += item.quantity.toString().padStart(5);
                line += this.formatMoney(item.price_snapshot).padStart(8);
                line += this.formatMoney(item.subtotal).padStart(8);
                return line + '\n';
            }
            
            formatMoney(amount) {
                return parseFloat(amount).toFixed(2);
            }
            
            formatDate(date) {
                return new Date(date).toLocaleString('th-TH');
            }
            
            barcode(text) {
                // ESC/POS barcode command
                return `\x1D\x68\x50\x1D\x77\x02\x1D\x48\x01\x1D\x6B\x49${text.length}${text}\n`;
            }
            
            sendToPrinter(receipt) {
                // Option 1: Web Print API (Chrome)
                if (window.print) {
                    const printWindow = window.open('', '', 'width=300,height=600');
                    printWindow.document.write('<pre>' + receipt + '</pre>');
                    printWindow.document.close();
                    printWindow.print();
                    printWindow.close();
                }
                
                // Option 2: Send to backend (for network printers)
                fetch('/api/print.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ receipt })
                });
            }
        }
        
        // Usage
        const printer = new ReceiptPrinter({ paperWidth: 80 });
        printer.printReceipt(saleData, storeInfo);
        ```
        
        Backend:
        ```php
        // api/print.php
        function printReceipt() {
            $data = getJSONInput();
            $receipt = $data['receipt'] ?? '';
            
            // Send to network printer
            $printerIp = getenv('PRINTER_IP');
            $printerPort = 9100;
            
            $socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
            socket_connect($socket, $printerIp, $printerPort);
            socket_write($socket, $receipt, strlen($receipt));
            socket_close($socket);
            
            sendResponse('success', [], 'Printed successfully');
        }
        ```
        
        Frontend:
        - เพิ่มปุ่ม "Print Receipt" ใน POS
        - เพิ่ม settings สำหรับ printer (paper size, IP address)
        - แสดง print preview

    2.1.5 UX/UI Improvements ⏳ [TODO]
        Priority: 🟡 MEDIUM
        
        Tasks:
        - [ ] ปรับปรุง responsive design
        - [ ] เพิ่ม dark mode
        - [ ] ปรับปรุง form validation
        - [ ] เพิ่ม loading states
        - [ ] ปรับปรุง error messages
        - [ ] เพิ่ม keyboard shortcuts
        - [ ] ปรับปรุง navigation
        - [ ] เพิ่ม breadcrumbs
        
        Implementation:
        ```css
        /* Dark mode */
        [data-theme="dark"] {
            --bg-color: #1a1a1a;
            --text-color: #ffffff;
            --card-bg: #2d2d2d;
            --border-color: #404040;
        }
        
        /* Loading states */
        .loading {
            position: relative;
            pointer-events: none;
            opacity: 0.6;
        }
        
        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 30px;
            height: 30px;
            margin: -15px 0 0 -15px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Keyboard shortcuts */
        .shortcut {
            display: inline-block;
            padding: 2px 6px;
            font-size: 12px;
            font-family: monospace;
            color: #666;
            background: #f5f5f5;
            border: 1px solid #ccc;
            border-radius: 3px;
        }
        ```
        
        ```javascript
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl + N: New sale
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                newSale();
            }
            
            // Ctrl + P: Print receipt
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                printReceipt();
            }
            
            // Ctrl + S: Save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveForm();
            }
            
            // Escape: Close modal
            if (e.key === 'Escape') {
                closeModal();
            }
        });
        ```

2.2 SECURITY

    Priority: 🔴 HIGH
    Timeline: 1-2 weeks
    
    2.2.1 Authentication System ⏳ [TODO]
        
        Requirements:
        - User registration & login
        - Password hashing (bcrypt)
        - Session management
        - Remember me
        - Password reset
        
        Implementation:
        ```php
        // api/auth.php
        session_start();
        
        function register($data) {
            global $pdo;
            
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            $email = $data['email'] ?? '';
            
            // Validate
            if (empty($username) || empty($password) || empty($email)) {
                sendResponse('error', [], 'All fields required');
                return;
            }
            
            // Check duplicate
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
            $checkStmt->execute([$username, $email]);
            
            if ($checkStmt->fetch()) {
                sendResponse('error', [], 'Username or email already exists');
                return;
            }
            
            // Hash password
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            
            // Insert
            $insertStmt = $pdo->prepare("
                INSERT INTO users (username, email, password, role, created_at)
                VALUES (?, ?, ?, 'cashier', NOW())
            ");
            
            $insertStmt->execute([$username, $email, $hashedPassword]);
            
            sendResponse('success', [], 'Registration successful');
        }
        
        function login($data) {
            global $pdo;
            
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            $remember = $data['remember'] ?? false;
            
            // Find user
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
            $stmt->execute([$username, $username]);
            $user = $stmt->fetch();
            
            if (!$user || !password_verify($password, $user['password'])) {
                sendResponse('error', [], 'Invalid credentials');
                return;
            }
            
            // Create session
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            
            // Remember me
            if ($remember) {
                $token = bin2hex(random_bytes(32));
                setcookie('remember_token', $token, time() + (86400 * 30), '/');
                
                // Save token to database
                $updateStmt = $pdo->prepare("UPDATE users SET remember_token = ? WHERE id = ?");
                $updateStmt->execute([$token, $user['id']]);
            }
            
            sendResponse('success', [
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role']
                ]
            ], 'Login successful');
        }
        
        function logout() {
            session_destroy();
            setcookie('remember_token', '', time() - 3600, '/');
            sendResponse('success', [], 'Logout successful');
        }
        
        function checkAuth() {
            if (!isset($_SESSION['user_id'])) {
                // Check remember token
                if (isset($_COOKIE['remember_token'])) {
                    global $pdo;
                    $stmt = $pdo->prepare("SELECT * FROM users WHERE remember_token = ?");
                    $stmt->execute([$_COOKIE['remember_token']]);
                    $user = $stmt->fetch();
                    
                    if ($user) {
                        $_SESSION['user_id'] = $user['id'];
                        $_SESSION['username'] = $user['username'];
                        $_SESSION['role'] = $user['role'];
                        return true;
                    }
                }
                
                return false;
            }
            
            return true;
        }
        ```
        
        Database:
        ```sql
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier')),
            remember_token VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        );
        ```
        
        Frontend:
        - สร้างหน้า login (login.html)
        - สร้างหน้า register (register.html)
        - เพิ่ม middleware ตรวจสอบ auth ในทุก API
        - Redirect to login ถ้าไม่ได้ login

    2.2.2 API Key Authentication ⏳ [TODO]
        
        Requirements:
        - Generate API keys
        - Validate API keys
        - Rate limiting per API key
        - Revoke API keys
        
        Implementation:
        ```php
        // api/middleware.php
        function validateApiKey() {
            $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? null;
            
            if (!$apiKey) {
                sendResponse('error', [], 'API key required');
                http_response_code(401);
                exit;
            }
            
            global $pdo;
            $stmt = $pdo->prepare("SELECT * FROM api_keys WHERE api_key = ? AND is_active = TRUE");
            $stmt->execute([$apiKey]);
            $key = $stmt->fetch();
            
            if (!$key) {
                sendResponse('error', [], 'Invalid API key');
                http_response_code(401);
                exit;
            }
            
            // Check rate limit
            $rateLimitStmt = $pdo->prepare("
                SELECT COUNT(*) as count 
                FROM api_logs 
                WHERE api_key_id = ? 
                AND created_at > NOW() - INTERVAL '1 hour'
            ");
            $rateLimitStmt->execute([$key['id']]);
            $count = $rateLimitStmt->fetch()['count'];
            
            if ($count >= $key['rate_limit']) {
                sendResponse('error', [], 'Rate limit exceeded');
                http_response_code(429);
                exit;
            }
            
            // Log request
            $logStmt = $pdo->prepare("
                INSERT INTO api_logs (api_key_id, endpoint, method, ip_address, created_at)
                VALUES (?, ?, ?, ?, NOW())
            ");
            $logStmt->execute([
                $key['id'],
                $_SERVER['REQUEST_URI'],
                $_SERVER['REQUEST_METHOD'],
                $_SERVER['REMOTE_ADDR']
            ]);
            
            return $key;
        }
        
        function generateApiKey($userId, $name, $rateLimit = 1000) {
            global $pdo;
            
            $apiKey = bin2hex(random_bytes(32));
            
            $stmt = $pdo->prepare("
                INSERT INTO api_keys (user_id, name, api_key, rate_limit, is_active, created_at)
                VALUES (?, ?, ?, ?, TRUE, NOW())
                RETURNING id
            ");
            
            $stmt->execute([$userId, $name, $apiKey, $rateLimit]);
            
            return $apiKey;
        }
        ```
        
        Database:
        ```sql
        CREATE TABLE api_keys (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            name VARCHAR(100) NOT NULL,
            api_key VARCHAR(255) UNIQUE NOT NULL,
            rate_limit INTEGER DEFAULT 1000,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP
        );
        
        CREATE TABLE api_logs (
            id SERIAL PRIMARY KEY,
            api_key_id INTEGER REFERENCES api_keys(id),
            endpoint VARCHAR(255) NOT NULL,
            method VARCHAR(10) NOT NULL,
            ip_address VARCHAR(45),
            response_code INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ```

    2.2.3 CORS Configuration ⏳ [TODO]
        
        Implementation:
        ```php
        // api/config.php
        $allowedOrigins = [
            'https://my-retail-production.up.railway.app',
            'http://localhost:8000',
            'http://localhost:5500'
        ];
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if (in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
            header("Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key");
            header("Access-Control-Max-Age: 86400");
        }
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
        ```

    2.2.4 Rate Limiting ⏳ [TODO]
        
        Implementation:
        ```php
        // api/rate-limit.php
        function checkRateLimit($identifier, $limit = 100, $window = 3600) {
            global $pdo;
            
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as count 
                FROM rate_limits 
                WHERE identifier = ? 
                AND created_at > NOW() - INTERVAL '{$window} seconds'
            ");
            $stmt->execute([$identifier]);
            $count = $stmt->fetch()['count'];
            
            if ($count >= $limit) {
                sendResponse('error', [], 'Rate limit exceeded');
                http_response_code(429);
                exit;
            }
            
            // Log request
            $logStmt = $pdo->prepare("
                INSERT INTO rate_limits (identifier, created_at)
                VALUES (?, NOW())
            ");
            $logStmt->execute([$identifier]);
        }
        
        // Usage
        $ip = $_SERVER['REMOTE_ADDR'];
        checkRateLimit($ip, 100, 3600); // 100 requests per hour
        ```
        
        Database:
        ```sql
        CREATE TABLE rate_limits (
            id SERIAL PRIMARY KEY,
            identifier VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
        CREATE INDEX idx_rate_limits_created_at ON rate_limits(created_at);
        ```

2.3 MOBILE APP (PWA)

    Priority: 🟢 LOW
    Timeline: 2-3 weeks
    
    Requirements:
    - Progressive Web App
    - Offline support
    - Push notifications
    - Installable on mobile
    - Responsive design
    
    Implementation:
    
    1. manifest.json
    ```json
    {
        "name": "My Retail",
        "short_name": "MyRetail",
        "description": "ระบบจัดการสินค้าคงคลัง",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#007bff",
        "orientation": "portrait-primary",
        "icons": [
            {
                "src": "/assets/icons/icon-72x72.png",
                "sizes": "72x72",
                "type": "image/png"
            },
            {
                "src": "/assets/icons/icon-96x96.png",
                "sizes": "96x96",
                "type": "image/png"
            },
            {
                "src": "/assets/icons/icon-128x128.png",
                "sizes": "128x128",
                "type": "image/png"
            },
            {
                "src": "/assets/icons/icon-144x144.png",
                "sizes": "144x144",
                "type": "image/png"
            },
            {
                "src": "/assets/icons/icon-152x152.png",
                "sizes": "152x152",
                "type": "image/png"
            },
            {
                "src": "/assets/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/assets/icons/icon-384x384.png",
                "sizes": "384x384",
                "type": "image/png"
            },
            {
                "src": "/assets/icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    }
    ```
    
    2. service-worker.js
    ```javascript
    const CACHE_NAME = 'my-retail-v1';
    const urlsToCache = [
        '/',
        '/index.html',
        '/pos.html',
        '/products.html',
        '/sales.html',
        '/assets/css/style.css',
        '/assets/js/main.js'
    ];
    
    // Install
    self.addEventListener('install', (event) => {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => cache.addAll(urlsToCache))
        );
    });
    
    // Fetch
    self.addEventListener('fetch', (event) => {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Cache hit
                    if (response) {
                        return response;
                    }
                    
                    // Cache miss
                    return fetch(event.request).then((response) => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone response
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
                })
        );
    });
    
    // Activate
    self.addEventListener('activate', (event) => {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        );
    });
    
    // Push notifications
    self.addEventListener('push', (event) => {
        const data = event.data ? event.data.json() : {};
        const title = data.title || 'Notification';
        const options = {
            body: data.body || 'You have a new notification',
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/icon-72x72.png',
            data: data
        };
        
        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    });
    ```
    
    3. Register service worker
    ```javascript
    // assets/js/pwa.js
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('Notification permission granted');
            }
        });
    }
    ```
    
    4. Offline support
    ```javascript
    // Check online status
    window.addEventListener('online', () => {
        document.body.classList.remove('offline');
        showAlert('Back online', 'success');
    });
    
    window.addEventListener('offline', () => {
        document.body.classList.add('offline');
        showAlert('You are offline. Some features may not work.', 'warning');
    });
    
    // Sync data when back online
    window.addEventListener('online', () => {
        syncPendingData();
    });
    
    function syncPendingData() {
        const pending = JSON.parse(localStorage.getItem('pending_data') || '[]');
        
        pending.forEach((item) => {
            fetch(item.url, {
                method: item.method,
                headers: item.headers,
                body: item.body
            })
            .then((response) => response.json())
            .then((data) => {
                console.log('Synced:', data);
            })
            .catch((error) => {
                console.error('Sync failed:', error);
            });
        });
        
        localStorage.removeItem('pending_data');
    }
    ```

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
feat: Add barcode scanner support
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
   - Check DATABASE_URL environment variable
   - Verify Neon.tech credentials
   - Check network connectivity

2. API Returns 500 Error
   - Check PHP error logs
   - Verify database schema matches code
   - Check file permissions

3. CORS Errors
   - Verify allowed origins in config.php
   - Check preflight OPTIONS request
   - Ensure headers are set correctly

4. Slow Performance
   - Check slow queries with pg_stat_statements
   - Verify indexes are created
   - Enable caching for frequently accessed data

5. Deployment Failed
   - Check Railway logs
   - Verify environment variables
   - Check build logs for errors

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
