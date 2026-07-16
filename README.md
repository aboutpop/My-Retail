# 🛒 POS & Stock Retail Manager

ระบบจัดการหน้าร้าน (Point of Sale) และสต๊อกสินค้าแบบครบวงจร รองรับการทำงานแบบ Real-time บน Cloud

---

## 📋 สารบัญ

- [ภาพรวมโปรเจกต์](#-ภาพรวมโปรเจกต์)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [โครงสร้างไฟล์](#-โครงสร้างไฟล์)
- [Database Schema](#-database-schema)
- [การติดตั้ง](#-การติดตั้ง)
- [ฟีเจอร์หลัก](#-ฟีเจอร์หลัก)
- [API Endpoints](#-api-endpoints)
- [CSS Architecture](#-css-architecture)

---

## 🎯 ภาพรวมโปรเจกต์

**POS & Stock Retail Manager** เป็นระบบจัดการหน้าร้านที่พัฒนาด้วย:
- **Backend**: PHP (RESTful API)
- **Frontend**: HTML5 + CSS3 + JavaScript (ES6+)
- **Database**: PostgreSQL (JSONB support)
- **Hosting**: Railway (Auto-deploy จาก GitHub)
- **Database Hosting**: Neon.tech (Serverless PostgreSQL)

### ลักษณะเด่น:
- ✅ **Single Page Application (SPA) feel** - โหลดหน้าเร็ว ไม่ refresh
- ✅ **Real-time Stock Management** - ตัดสต๊อกทันทีเมื่อขาย
- ✅ **Smart Barcode Scanner** - รองรับคีย์บอร์ดภาษาไทย → ตัวเลขอัตโนมัติ
- ✅ **Hold Bills System** - พักบิลได้สูงสุด 5 บิลต่อ session
- ✅ **Performance Optimization** - ใช้ Cache + Materialized View
- ✅ **Responsive Design** - ใช้งานได้ทุกขนาดหน้าจอ
- ✅ **Multi-language Support** - รองรับภาษาไทยเต็มรูปแบบ

---

## 🏗️ Architecture

### Production Environment
```
┌─────────────┐
│   GitHub    │ ← Source Code Repository
│  (main)     │
└──────┬──────┘
       │ Auto-deploy on push
       ▼
┌─────────────────┐
│    Railway      │ ← PHP Backend Hosting
│  (Production)   │
│  - Apache/PHP   │
│  - Static Files │
└──────┬──────────┘
       │ Database Connection
       ▼
┌─────────────────┐
│   Neon.tech     │ ← Serverless PostgreSQL
│   (Database)    │
│  - 8 Tables     │
│  - JSONB        │
│  - Triggers     │
└─────────────────┘
```

### Development Environment
```
┌─────────────────┐
│   Localhost     │ ← XAMPP (Apache + PHP)
│  (XAMPP)        │
│  - Offline      │
│  - Testing      │
└──────┬──────────┘
       │ Database Connection
       ▼
┌─────────────────┐
│   Neon.tech     │ ← Serverless PostgreSQL (Same as Production)
│   (Database)    │
│  - Shared DB    │
└─────────────────┘
```

### Data Flow
```
User → Browser → HTML/JS → API Call → PHP (Railway/Local) → PostgreSQL (Neon.tech)
                                      ↓
                              Return JSON Response
                                      ↓
                              Update UI (No Refresh)
```

---

## 🛠️ Tech Stack

### Backend
| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|---------|
| **PHP** | 8.0+ | RESTful API, Business Logic |
| **PostgreSQL** | 14+ | Database, JSONB Storage |
| **PDO** | - | Database Connection |

### Frontend
| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|---------|
| **HTML5** | - | Structure |
| **CSS3** | - | Styling (Custom + Variables) |
| **JavaScript (ES6+)** | - | Frontend Logic, API Calls |
| **Chart.js** | 4.x | กราฟยอดขาย |
| **Font Awesome** | 6.x | Icons |

### Infrastructure
| บริการ | หน้าที่ | URL |
|--------|---------|-----|
| **GitHub** | Version Control | https://github.com/aboutpop/My-Retail |
| **Railway** | Production Hosting | https://my-retail-production.up.railway.app |
| **Neon.tech** | Database Hosting | (Connection string in config.php) |
| **XAMPP** | Local Development | http://localhost/myproject/My-Retail |

---

## 📁 โครงสร้างไฟล์

```
My-Retail/
├── 📄 index.html              # Dashboard - ภาพรวมยอดขาย
├── 📄 pos.html                # POS - หน้าคิดบิลขาย
├── 📄 products.html           # จัดการสินค้า
├── 📄 categories.html         # จัดการหมวดหมู่
├── 📄 sales.html              # จัดการบิลขาย
├── 📄 stock.html              # จัดการสต๊อก (รับของ)
│
├── 📁 api/                    # Backend APIs
│   ├── 📄 config.php          # Database Connection + Helper Functions
│   ├── 📄 products.php        # CRUD สินค้า
│   ├── 📄 categories.php      # CRUD หมวดหมู่
│   ├── 📄 sales.php           # CRUD บิลขาย
│   ├── 📄 hold_bills.php      # พักบิลชั่วคราว (JSONB)
│   ├── 📄 settings.php        # ตั้งค่าระบบ
│   ├── 📄 reports.php         # รายงานยอดขาย
│   ├── 📄 stock_logs.php      # บันทึกการเปลี่ยนแปลงสต๊อก
│   └── 📄 test_connection.php # ทดสอบ Database Connection
│
├── 📁 js/                     # Frontend JavaScript
│   ├── 📄 config.js           # API Configuration (BASE_URL, ENDPOINTS)
│   ├── 📄 utils.js            # Utility Functions (API calls, formatters)
│   ├── 📄 dashboard.js        # Dashboard Logic
│   └── 📄 pos.js              # POS Logic (Cart, Held Bills, Barcode)
│
├── 📁 css/                    # Stylesheets
│   ├── 📄 common.css          # Shared Styles (Type A)
│   ├── 📄 style.css           # Core Styles
│   ├── 📄 pos.css             # POS Specific (Type B)
│   ├── 📄 dashboard.css       # Dashboard Specific (Type B)
│   └── 📄 fonts.css           # Local Fonts (Sarabun)
│
├── 📁 assets/                 # Static Assets
│   └── 📁 css/                # Font Awesome
│
├── 📄 readme.md               # เอกสารนี้
├── 📄 skill.md                # Workflow & Logic Documentation
└── 📄 .gitignore              # Git Ignore
```

---

## 🗄️ Database Schema

### 1. **products** - ตารางสินค้า
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `name` | VARCHAR | ชื่อสินค้า |
| `barcode` | VARCHAR(50) | บาร์โค้ด (Unique) |
| `barcode_status` | INT | 0=ไม่มี, 1=มี |
| `price` | DECIMAL(15,2) | ราคาขาย |
| `cost` | DECIMAL(15,2) | ต้นทุน |
| `stock` | INT | จำนวนสต๊อก |
| `unit` | VARCHAR | หน่วย (ชิ้น, กล่อง) |
| `category` | VARCHAR | ชื่อหมวดหมู่ (deprecated) |
| `category_id` | INT | Foreign Key → categories |
| `no_stock_count` | BOOLEAN | true = ไม่นับสต๊อก |
| `created_at` | TIMESTAMP | วันที่สร้าง |
| `updated_at` | TIMESTAMP | วันที่แก้ไข |

**Indexes:**
- `idx_products_barcode` - เร่งการค้นหาด้วยบาร์โค้ด
- `idx_products_category_id` - เร่งการ filter ตามหมวดหมู่
- `idx_products_stock` - เร่งการตรวจสอบสต๊อกต่ำ

---

### 2. **categories** - ตารางหมวดหมู่
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `name` | VARCHAR | ชื่อหมวดหมู่ |
| `description` | TEXT | คำอธิบาย |
| `sort_order` | INT | ลำดับการแสดงผล |
| `created_at` | TIMESTAMP | วันที่สร้าง |

---

### 3. **sales** - ตารางบิลขาย
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `bill_no` | VARCHAR | เลขบิล (BV-YYYYMMDD-XXX) |
| `total_amount` | DECIMAL(15,2) | ยอดรวมก่อนหักส่วนลด |
| `discount` | DECIMAL(15,2) | ส่วนลด |
| `net_total` | DECIMAL(15,2) | ยอดสุทธิ |
| `payment_method` | VARCHAR | cash/transfer/other |
| `profit` | DECIMAL(15,2) | กำไร (คำนวณอัตโนมัติ) |
| `original_bill_no` | VARCHAR | เลขบิลเดิม (สำหรับ Void) |
| `sale_date` | TIMESTAMP | วันที่ขาย |
| `created_at` | TIMESTAMP | วันที่สร้าง |

**Indexes:**
- `idx_sales_bill_no` - เร่งการค้นหาด้วยเลขบิล
- `idx_sales_sale_date` - เร่งการ filter ตามวันที่

---

### 4. **sale_items** - ตารางรายการสินค้าในบิล
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `sale_id` | INT | Foreign Key → sales |
| `product_id` | INT | Foreign Key → products |
| `product_name_snapshot` | VARCHAR | ชื่อสินค้า (snapshot) |
| `barcode_snapshot` | VARCHAR | บาร์โค้ด (snapshot) |
| `quantity` | DECIMAL(15,2) | จำนวนที่ขาย |
| `price_snapshot` | DECIMAL(15,2) | ราคาตอนขาย |
| `cost_snapshot` | DECIMAL(15,2) | ต้นทุนตอนขาย |
| `subtotal` | DECIMAL(15,2) | ยอดรวม (price × quantity) |
| `no_stock_count` | BOOLEAN | ไม่นับสต๊อก |
| `created_at` | TIMESTAMP | วันที่สร้าง |

**Indexes:**
- `idx_sale_items_sale_id` - เร่งการ JOIN กับ sales
- `idx_sale_items_product_id` - เร่งการ JOIN กับ products

---

### 5. **held_bills** - ตารางบิลที่พักไว้ (JSONB)
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `session_id` | VARCHAR | Session ID ของผู้ใช้ |
| `bill_index` | INT | ลำดับที่ (1-5) |
| `items` | JSONB | รายการสินค้า (JSON) |
| `discount` | DECIMAL(15,2) | ส่วนลด |
| `payment_method` | VARCHAR | วิธีชำระเงิน |
| `customer_name` | VARCHAR | ชื่อลูกค้า (optional) |
| `note` | TEXT | หมายเหตุ |
| `created_at` | TIMESTAMP | วันที่สร้าง |
| `updated_at` | TIMESTAMP | วันที่แก้ไข |

**หมายเหตุ:**
- แต่ละ session พักบิลได้สูงสุด 5 บิล
- `items` เก็บเป็น JSONB เพื่อความยืดหยุ่น
- `bill_index` ใช้ระบุตำแหน่ง (1-5)

---

### 6. **settings** - ตารางตั้งค่าระบบ
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `store_name` | VARCHAR | ชื่อร้าน |
| `store_address` | TEXT | ที่อยู่ร้าน |
| `receipt_footer` | TEXT | ข้อความท้ายใบเสร็จ |
| `welcome_message` | TEXT | ข้อความต้อนรับ |
| `quick_items_per_row` | INT | จำนวนปุ่ม Quick Items ต่อแถว |
| `quick_items_count` | INT | จำนวนสินค้าขายดีที่แสดง |
| `quick_items_days` | INT | ระยะเวลาย้อนดู (วัน) |
| `updated_at` | TIMESTAMP | วันที่แก้ไข |

---

### 7. **stock_logs** - ตารางบันทึกการเปลี่ยนแปลงสต๊อก
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `product_id` | INT | Foreign Key → products |
| `change_type` | VARCHAR | sale/return/adjustment/stock_in |
| `quantity_change` | DECIMAL(15,2) | จำนวนที่เปลี่ยน (+/-) |
| `reason` | TEXT | เหตุผล |
| `reference_id` | INT | ID ของบิล/เอกสารอ้างอิง |
| `current_stock` | INT | สต๊อกหลังจากเปลี่ยน |
| `created_at` | TIMESTAMP | วันที่บันทึก |

**Indexes:**
- `idx_stock_logs_product_id` - เร่งการ filter ตามสินค้า
- `idx_stock_logs_change_type` - เร่งการ filter ตามประเภท

---

### 8. **daily_sales_summary** - ตารางสรุปยอดขายรายวัน (Materialized View)
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `summary_date` | DATE | วันที่ (Unique) |
| `bill_count` | INT | จำนวนบิล |
| `total_sales` | DECIMAL(15,2) | ยอดขายรวม |
| `total_discount` | DECIMAL(15,2) | ส่วนลดรวม |
| `total_net` | DECIMAL(15,2) | ยอดสุทธิรวม |
| `total_profit` | DECIMAL(15,2) | กำไรรวม |
| `created_at` | TIMESTAMP | วันที่สร้าง |
| `updated_at` | TIMESTAMP | วันที่แก้ไข |

**Trigger:**
- อัปเดตอัตโนมัติเมื่อมีการ INSERT/UPDATE/DELETE ใน `sales`
- ลดภาระการคำนวณ SUM() แบบ Real-time

---

## 🚀 การติดตั้ง

### 🖥️ Local Development (XAMPP)

#### 1. ติดตั้ง XAMPP
- ดาวน์โหลด: https://www.apachefriends.org/
- เปิด Apache และ MySQL

#### 2. Clone Repository
```bash
cd C:\xampp\htdocs
git clone https://github.com/aboutpop/My-Retail.git
cd My-Retail
```

#### 3. ตั้งค่า Database (Neon.tech)
```php
// api/config.php
define('DB_HOST', 'your-neon-host.neon.tech');
define('DB_NAME', 'your-database');
define('DB_USER', 'your-username');
define('DB_PASS', 'your-password');
```

#### 4. เข้าใช้งาน
```
http://localhost/myproject/My-Retail/
```

---

### ☁️ Production (Railway)

#### 1. สร้าง Project บน Railway
- เข้า: https://railway.app/
- New Project → Deploy from GitHub
- เลือก Repository: `aboutpop/My-Retail`

#### 2. ตั้งค่า Environment Variables
```bash
DB_HOST=<neon-host>
DB_NAME=<database-name>
DB_USER=<username>
DB_PASS=<password>
```

#### 3. Deploy
- Railway จะ deploy อัตโนมัติเมื่อ push ไป GitHub
- URL: `https://my-retail-production.up.railway.app`

---

## ✨ ฟีเจอร์หลัก

### 1. 🎯 Smart Barcode Scanner
- **Thai to Number Mapping** - แปลงคีย์บอร์ดไทยเป็นตัวเลขอัตโนมัติ
- **Auto-focus** - กลับไปโฟกัสช่องบาร์โค้ดหลังสแกน
- **Quick Add Product** - เพิ่มสินค้าใหม่ทันทีถ้าไม่พบบาร์โค้ด

**ตัวอย่าง:**
```
พิมพ์: ๅ/-ภถ  →  แปลงเป็น: 12345
```

---

### 2. 📊 Dashboard แบบ Real-time
- **8 Stat Cards** - สินค้าทั้งหมด, ยอดขายวันนี้, สต๊อกต่ำ, บิลวันนี้, ฯลฯ
- **Sales Chart** - กราฟยอดขาย 7/30 วัน หรือกำหนดเอง
- **Top Products** - สินค้าขายดี 10 อันดับ
- **Low Stock Alert** - แจ้งเตือนสินค้าใกล้หมด

---

### 3. 🛒 POS (Point of Sale)
- **Quick Items Grid** - ปุ่มสินค้าขายดี (ปรับจำนวนได้)
- **Category Filter** - กรองตามหมวดหมู่
- **Cart Management** - เพิ่ม/ลด/ลบสินค้า
- **Hold Bills** - พักบิลได้ 5 บิล (ใช้ JSONB)
- **Payment Methods** - เงินสด/โอนเงิน/อื่นๆ

---

### 4. 📦 Stock Management
- **Stock In** - รับสินค้าเข้าสต๊อก
- **Stock Adjustment** - ปรับสต๊อกด้วยตนเอง
- **Stock Logs** - บันทึกประวัติการเปลี่ยนแปลง
- **No Stock Count** - สินค้าที่ไม่ต้องนับสต๊อก (เช่น บริการ)

---

### 5. 📈 Reports & Analytics
- **Daily Sales Summary** - สรุปยอดขายรายวัน (Materialized View)
- **Monthly Summary** - สรุปยอดขายรายเดือน
- **Category Summary** - สรุปยอดขายตามหมวดหมู่
- **Top Products** - สินค้าขายดี

---

### 6. ⚡ Performance Optimization
- **File-based Cache** - Cache ข้อมูลที่ใช้บ่อย (5 นาที)
- **Database Indexes** - 24+ indexes สำหรับ columns ที่ query บ่อย
- **Materialized View** - `daily_sales_summary` อัปเดตอัตโนมัติ
- **Query Optimization** - ลด JOIN, ใช้ cache mapping

---

## 🔌 API Endpoints

### Products
```http
GET    /api/products.php                    # ดึงสินค้าทั้งหมด
GET    /api/products.php?id=1               # ดึงสินค้าตาม ID
GET    /api/products.php?top_selling=10     # สินค้าขายดี
POST   /api/products.php                    # เพิ่มสินค้า
PUT    /api/products.php                    # แก้ไขสินค้า
DELETE /api/products.php?id=1               # ลบสินค้า
```

### Sales
```http
GET    /api/sales.php                       # ดึงบิลทั้งหมด
GET    /api/sales.php?id=1                  # ดึงบิลตาม ID
GET    /api/sales.php?bill_no=BV-20240101-001  # ดึงบิลตามเลขบิล
POST   /api/sales.php                       # สร้างบิลขาย
```

### Hold Bills
```http
GET    /api/hold_bills.php?session_id=xxx   # ดึงบิลที่พักไว้
POST   /api/hold_bills.php                  # พักบิลใหม่
PUT    /api/hold_bills.php?id=1             # แก้ไขบิลที่พัก
DELETE /api/hold_bills.php?id=1             # ลบบิลที่พัก
```

### Categories
```http
GET    /api/categories.php                  # ดึงหมวดหมู่ทั้งหมด
POST   /api/categories.php                  # เพิ่มหมวดหมู่
PUT    /api/categories.php                  # แก้ไขหมวดหมู่
DELETE /api/categories.php?id=1             # ลบหมวดหมู่
```

### Settings
```http
GET    /api/settings.php                    # ดึงการตั้งค่า
PUT    /api/settings.php                    # แก้ไขการตั้งค่า
```

### Reports
```http
GET    /api/reports.php?type=daily_summary     # สรุปยอดขายรายวัน
GET    /api/reports.php?type=monthly_summary   # สรุปยอดขายรายเดือน
GET    /api/reports.php?type=category_summary  # สรุปตามหมวดหมู่
GET    /api/reports.php?type=top_products      # สินค้าขายดี
```

---

## 🎨 CSS Architecture

### Type A: Standard Pages
**ไฟล์:** `common.css` + `style.css`  
**หน้า:** products, categories, sales, stock

```html
<link rel="stylesheet" href="css/common.css">
<link rel="stylesheet" href="css/style.css">
```

---

### Type B: Special Pages
**ไฟล์:** `common.css` + `pos.css` หรือ `dashboard.css`  
**หน้า:** pos, index (dashboard)

```html
<!-- POS -->
<link rel="stylesheet" href="css/common.css">
<link rel="stylesheet" href="css/pos.css">

<!-- Dashboard -->
<link rel="stylesheet" href="css/common.css">
<link rel="stylesheet" href="css/dashboard.css">
```

---

### CSS Variables
```css
:root {
    --primary: #2563eb;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --info: #0ea5e9;
    
    --bg-main: #f1f5f9;
    --bg-sidebar: #1e293b;
    --bg-card: #ffffff;
    
    --text-main: #0f172a;
    --text-muted: #64748b;
    
    --sidebar-width: 260px;
    --topbar-height: 60px;
    --radius: 8px;
}
```

---

## 📝 License

MIT License - ใช้งานได้อย่างอิสระ

---

## 👨‍💻 Developer

**About Pop**  
GitHub: [@aboutpop](https://github.com/aboutpop)

---

**Made with ❤️ in Thailand**
```
