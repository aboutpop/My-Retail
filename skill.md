## 📄 ไฟล์ `skill.md` (ฉบับปรับปรุง - ครบถ้วน)

```markdown
# 📘 Skill Documentation - POS & Stock Retail Manager

เอกสารนี้รวบรวม workflow, logic, และขั้นตอนการทำงานที่สำคัญทั้งหมดของระบบ

---

## 📋 สารบัญ

- [1. Smart Barcode Scanner](#1-smart-barcode-scanner)
- [2. POS Workflow](#2-pos-workflow)
- [3. Hold Bills System](#3-hold-bills-system)
- [4. Stock Management](#4-stock-management)
- [5. Sales & Void Logic](#5-sales--void-logic)
- [6. Dashboard Logic](#6-dashboard-logic)
- [7. API Architecture](#7-api-architecture)
- [8. Database Design](#8-database-design)
- [9. CSS Architecture](#9-css-architecture)
- [10. JavaScript Architecture](#10-javascript-architecture)
- [11. Performance Optimization](#11-performance-optimization)

---

## 1. 🎯 Smart Barcode Scanner

### 1.1 Thai to Number Mapping

**ปัญหา:** เครื่องสแกนบาร์โค้ดบางรุ่นส่งค่าเป็นภาษาไทยแทนตัวเลข

**วิธีแก้:** สร้าง mapping table เพื่อแปลงตัวอักษรไทยเป็นตัวเลข

```javascript
const THAI_TO_NUMBER = {
    'ๅ': '1',  // แป้นพิมพ์: 1
    '/': '2',  // แป้นพิมพ์: 2
    '-': '3',  // แป้นพิมพ์: 3
    'ภ': '4',  // แป้นพิมพ์: 4
    'ถ': '5',  // แป้นพิมพ์: 5
    'ุ': '6',  // แป้นพิมพ์: 6
    'ึ': '7',  // แป้นพิมพ์: 7
    'ค': '8',  // แป้นพิมพ์: 8
    'ต': '9',  // แป้นพิมพ์: 9
    'จ': '0'   // แป้นพิมพ์: 0
};
```

**ตัวอย่างการใช้งาน:**
```
Input:  ๅ/-ภถุึคตจ
Output: 1234567890
```

**โค้ดแปลง:**
```javascript
function convertThaiToNumber(text) {
    const normalized = text.normalize('NFD');
    let result = '';
    for (let char of normalized) {
        if (/[0-9]/.test(char)) result += char;
        else if (THAI_TO_NUMBER[char]) result += THAI_TO_NUMBER[char];
    }
    return result;
}
```

### 1.2 Auto-focus Logic

**Workflow:**
1. ผู้ใช้สแกนบาร์โค้ด → กด Enter
2. ระบบค้นหาสินค้าใน `allProducts` array
3. ถ้าพบ → เพิ่มลงตะกร้า → เคลียร์ช่องบาร์โค้ด → โฟกัสกลับ
4. ถ้าไม่พบ → เปิด Modal "เพิ่มสินค้าด่วน"

**โค้ด:**
```javascript
function searchByBarcode(barcode) {
    if (!barcode) return;
    
    const matches = allProducts.filter(p => p.barcode === barcode);
    
    if (matches.length === 1) {
        addProductToCart(matches[0]);
        document.getElementById('barcode-input').value = ''; // เคลียร์ค่า
        focusBarcode(); // โฟกัสกลับ
    } else if (matches.length > 1) {
        showToast('พบสินค้าหลายรายการ', 'warning');
        document.getElementById('barcode-input').value = '';
        focusBarcode();
    } else {
        document.getElementById('barcode-input').value = '';
        showBarcodeNotFoundModal(barcode);
    }
}

function focusBarcode() {
    setTimeout(() => {
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput) barcodeInput.focus();
    }, 100); // delay 100ms เพื่อให้ UI update ก่อน
}
```

### 1.3 Quick Add Product (เมื่อไม่พบบาร์โค้ด)

**Workflow:**
1. สแกนบาร์โค้ด → ไม่พบสินค้า
2. แสดง Modal "ไม่พบสินค้า"
3. ผู้ใช้กด "เพิ่มสินค้าชิ้นนี้"
4. เปิด Modal "เพิ่มสินค้าด่วน" (กรอกข้อมูลล่วงหน้า: บาร์โค้ด)
5. กรอกข้อมูล: ชื่อ, ราคา, ต้นทุน, สต๊อก, หมวดหมู่, หน่วย
6. กด "บันทึกและเพิ่มลงตะกร้า"
7. API: POST /api/products.php
8. เพิ่มสินค้าใหม่ลง `allProducts` array
9. เพิ่มลงตะกร้าทันที
10. โฟกัสกลับที่ช่องบาร์โค้ด

**โค้ด:**
```javascript
async function saveNewProduct() {
    const formData = {
        barcode: document.getElementById('new-product-barcode').value,
        name: document.getElementById('new-product-name').value,
        price: document.getElementById('new-product-price').value,
        cost: document.getElementById('new-product-cost').value || 0,
        stock: document.getElementById('new-product-stock').value || 0,
        category_id: document.getElementById('new-product-category').value || null,
        unit: document.getElementById('new-product-unit').value || 'ชิ้น'
    };
    
    try {
        const res = await apiPost(API_CONFIG.ENDPOINTS.PRODUCTS, formData);
        if (res.success) {
            const newProduct = res.data;
            allProducts.push(newProduct); // เพิ่มลง array
            hideNewProductModal();
            addProductToCart(newProduct); // เพิ่มลงตะกร้า
            showToast(`เพิ่มสินค้า "${newProduct.name}" สำเร็จ`, 'success');
            focusBarcode();
        }
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}
```

---

## 2. 🛒 POS Workflow

### 2.1 Add to Cart Logic

**Workflow:**
1. ผู้ใช้คลิกสินค้า / สแกนบาร์โค้ด
2. ตรวจสอบว่ามีสินค้านี้ในตะกร้าแล้วหรือยัง
3. ถ้ามี → เพิ่ม quantity + 1
4. ถ้าไม่มี → เพิ่มรายการใหม่ (quantity = 1)
5. คำนวณ subtotal = price × quantity
6. Render ตะกร้าใหม่
7. อัปเดตสรุปยอด (ยอดรวม, ส่วนลด, ยอดสุทธิ)
8. โฟกัสกลับที่ช่องบาร์โค้ด

**โค้ด:**
```javascript
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

function updateSummary() {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = parseFloat(document.getElementById('discount-input').value) || 0;
    const total = Math.max(0, subtotal - discount);
    
    document.getElementById('summary-subtotal').textContent = formatMoney(subtotal);
    document.getElementById('summary-total').textContent = formatMoney(total);
}
```

### 2.2 Checkout Process

**Workflow:**
1. ผู้ใช้กด "ชำระเงิน"
2. ตรวจสอบว่ามีสินค้าในตะกร้าหรือไม่
3. แสดง confirm dialog
4. เตรียมข้อมูล: items, discount, payment_method
5. API: POST /api/sales.php
6. Backend:
   - สร้างเลขบิล (BV-YYYYMMDD-XXX)
   - คำนวณยอดรวม, กำไร
   - INSERT sales + sale_items
   - ตัดสต๊อก (ถ้า no_stock_count = false)
   - บันทึก stock_logs
7. Frontend:
   - แสดง toast "ชำระเงินสำเร็จ"
   - ล้างตะกร้า
   - รีเซ็ตส่วนลด
   - โหลดสินค้าใหม่ (อัปเดตสต๊อก)
   - โฟกัสกลับที่ช่องบาร์โค้ด

**โค้ด:**
```javascript
async function checkout() {
    if (cart.length === 0) {
        showToast('ไม่มีสินค้าในตะกร้า', 'warning');
        return;
    }
    
    if (!confirm('ยืนยันการชำระเงิน?')) return;
    
    try {
        const discount = parseFloat(document.getElementById('discount-input').value) || 0;
        
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
            document.getElementById('discount-input').value = 0;
            renderCart();
            updateSummary();
            await loadAllProducts(); // อัปเดตสต๊อก
            focusBarcode();
        }
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}
```

---

## 3. 📦 Hold Bills System

### 3.1 Architecture

**Database Schema:**
```sql
CREATE TABLE held_bills (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    bill_index INT NOT NULL, -- 1-5
    items JSONB NOT NULL,
    discount DECIMAL(15,2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    customer_name VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**ข้อจำกัด:**
- แต่ละ session พักบิลได้สูงสุด 5 บิล
- `items` เก็บเป็น JSONB (PostgreSQL)
- `bill_index` ใช้ระบุตำแหน่ง (1-5)

### 3.2 Hold Bill Workflow

**Workflow:**
1. ผู้ใช้กด "พักบิล"
2. ตรวจสอบว่ามีสินค้าในตะกร้าหรือไม่
3. API: POST /api/hold_bills.php
   - Body: { session_id, items, discount, payment_method }
4. Backend:
   - ตรวจสอบจำนวนบิลที่พักไว้ (< 5)
   - หา bill_index ว่าง (1-5)
   - INSERT ลง held_bills
5. Frontend:
   - ล้างตะกร้า
   - รีเซ็ตส่วนลด
   - โหลด held bills ใหม่
   - แสดง toast "พักบิลสำเร็จ"
   - โฟกัสกลับที่ช่องบาร์โค้ด

**โค้ด:**
```javascript
async function holdBill() {
    if (cart.length === 0) {
        showToast('ไม่มีสินค้าในตะกร้า', 'warning');
        return;
    }
    
    try {
        const sessionId = getSessionId();
        const res = await apiPost(API_CONFIG.ENDPOINTS.HELD_BILLS, {
            session_id: sessionId,
            items: cart,
            discount: parseFloat(document.getElementById('discount-input').value) || 0,
            payment_method: paymentMethod
        });
        
        if (res.success) {
            cart = [];
            document.getElementById('discount-input').value = 0;
            renderCart();
            updateSummary();
            await loadHeldBills();
            showToast('พักบิลสำเร็จ', 'success');
            focusBarcode();
        }
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}
```

### 3.3 Resume Held Bill Workflow

**Workflow:**
1. ผู้ใช้คลิก badge ของบิลที่พักไว้
2. ตรวจสอบว่ามีสินค้าในตะกร้าปัจจุบันหรือไม่
3. ถ้ามี → แสดง confirm "ต้องการพักบิลปัจจุบันก่อนหรือไม่?"
4. API: DELETE /api/hold_bills.php?id=X&session_id=Y
5. Backend: DELETE จาก held_bills
6. Frontend:
   - โหลดข้อมูลบิลใส่ตะกร้า
   - โหลด held bills ใหม่ (บิลที่โหลดจะหายไป)
   - แสดง toast "โหลดบิลที่พักสำเร็จ"
   - โฟกัสกลับที่ช่องบาร์โค้ด

**โค้ด:**
```javascript
async function resumeHeldBill(billId) {
    const bill = heldBills.find(b => b.id === billId);
    if (!bill) return;
    
    if (cart.length > 0 && currentHeldBillId !== billId) {
        if (!confirm('ต้องการพักบิลปัจจุบันก่อนหรือไม่?')) return;
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
            showToast('ไม่สามารถลบบิลที่พักได้', 'error');
            return;
        }
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
        return;
    }
    
    // ✅ โหลดข้อมูลบิลใส่ตะกร้า
    cart = bill.items;
    currentHeldBillId = bill.id;
    document.getElementById('discount-input').value = bill.discount;
    paymentMethod = bill.payment_method;
    renderCart();
    updateSummary();
    updatePaymentMethodUI();
    
    // ✅ โหลด held bills ใหม่ (บิลที่โหลดจะหายไป)
    await loadHeldBills();
    
    showToast('โหลดบิลที่พักสำเร็จ', 'success');
    focusBarcode();
}
```

---

## 4. 📊 Stock Management

### 4.1 Stock Cut Logic (เมื่อขายสินค้า)

**Workflow:**
1. ขายสินค้า (checkout)
2. ตรวจสอบ no_stock_count ของสินค้า
3. ถ้า no_stock_count = false:
   - UPDATE products SET stock = stock - quantity
   - INSERT stock_logs (change_type = 'sale', quantity_change = -quantity)
4. ถ้า no_stock_count = true:
   - ไม่ตัดสต๊อก
   - ไม่บันทึก stock_logs

**โค้ด (sales.php):**
```php
foreach ($saleItems as $item) {
    // INSERT sale_items
    $itemSql = "INSERT INTO sale_items ...";
    $pdo->prepare($itemSql)->execute([...]);
    
    // ตัดสต๊อก (ถ้า no_stock_count = false)
    if (!$item['no_stock_count']) {
        $pdo->prepare("UPDATE products SET stock = stock - :quantity WHERE id = :id")
            ->execute(['quantity' => $item['quantity'], 'id' => $item['product_id']]);
        
        // บันทึก stock_logs
        $logSql = "INSERT INTO stock_logs (product_id, change_type, quantity_change, reason, reference_id, current_stock)
                   VALUES (:product_id, 'sale', :quantity_change, :reason, :reference_id, :current_stock)";
        $pdo->prepare($logSql)->execute([
            'product_id' => $item['product_id'],
            'quantity_change' => -$item['quantity'],
            'reason' => "ขายสินค้า (บิล {$billNo})",
            'reference_id' => $saleId,
            'current_stock' => $item['current_stock']
        ]);
    }
}
```

### 4.2 Stock Return Logic (เมื่อ Void บิล)

**Workflow:**
1. Void บิล (คืนสินค้า)
2. ดึงข้อมูล sale_items จากบิลเดิม
3. สำหรับแต่ละรายการ:
   - ถ้า no_stock_count = false:
     - UPDATE products SET stock = stock + quantity
     - INSERT stock_logs (change_type = 'return', quantity_change = +quantity)
4. สร้างบิลใหม่ (is_void = true)
   - bill_no = "VOID-YYYYMMDD-XXX"
   - original_bill_no = เลขบิลเดิม

**โค้ด (sales.php):**
```php
$isVoid = isset($data['is_void']) && $data['is_void'] === true;
$originalBillNo = isset($data['original_bill_no']) ? $data['original_bill_no'] : null;

foreach ($saleItems as $item) {
    if (!$item['no_stock_count']) {
        $pdo->prepare("UPDATE products SET stock = stock + :quantity WHERE id = :id")
            ->execute(['quantity' => $item['quantity'], 'id' => $item['product_id']]);
        
        $reason = $isVoid ? "คืนสินค้า (Void บิล {$originalBillNo})" : "ขายสินค้า (บิล {$billNo})";
        $changeType = $isVoid ? 'return' : 'sale';
        
        $logSql = "INSERT INTO stock_logs ...";
        $pdo->prepare($logSql)->execute([
            'change_type' => $changeType,
            'quantity_change' => $isVoid ? $item['quantity'] : -$item['quantity'],
            'reason' => $reason,
            ...
        ]);
    }
}
```

### 4.3 Stock In Logic (รับสินค้าเข้า)

**Workflow:**
1. ผู้ใช้สแกนบาร์โค้ดหรือค้นหาสินค้า
2. เปิด Modal รายละเอียดสินค้า
3. กรอกจำนวนรับเข้า + หมายเหตุ
4. กด "เพิ่มเข้ารายการ" → เพิ่มลง `stockInItems` array
5. กด "บันทึกการรับเข้า"
6. API: POST /api/stock_in.php (สำหรับแต่ละรายการ)
7. Backend:
   - UPDATE products SET stock = stock + quantity
   - UPDATE products SET cost = new_cost (ถ้าระบุ)
   - INSERT stock_logs (change_type = 'stock_in', quantity_change = +quantity)
8. Frontend:
   - ล้าง `stockInItems` array
   - โหลดสินค้าใหม่
   - โหลด stock logs ใหม่

**โค้ด (stock_in.php):**
```php
$productId = $data['product_id'];
$quantity = $data['quantity'];
$cost = $data['cost'] ?? null;
$reason = $data['reason'] ?? 'รับเข้าสต๊อก';

// ดึงข้อมูลสินค้าปัจจุบัน
$product = $pdo->prepare("SELECT * FROM products WHERE id = :id")->execute(['id' => $productId]);
$currentStock = intval($product['stock']);
$newStock = $currentStock + $quantity;

// อัปเดตสต๊อก
$pdo->prepare("UPDATE products SET stock = :stock WHERE id = :id")
    ->execute(['stock' => $newStock, 'id' => $productId]);

// อัปเดตต้นทุนถ้ามี
if ($cost !== null) {
    $pdo->prepare("UPDATE products SET cost = :cost WHERE id = :id")
        ->execute(['cost' => $cost, 'id' => $productId]);
}

// บันทึก stock_logs
$logSql = "INSERT INTO stock_logs (product_id, change_type, quantity_change, reason, current_stock)
           VALUES (:product_id, 'stock_in', :quantity_change, :reason, :current_stock)";
$pdo->prepare($logSql)->execute([
    'product_id' => $productId,
    'quantity_change' => $quantity,
    'reason' => $reason,
    'current_stock' => $newStock
]);
```

### 4.4 No Stock Count Logic

**แนวคิด:** สินค้าบางประเภทไม่ต้องนับสต๊อก เช่น:
- บริการ (ตัดผม, ซ่อมคอมพิวเตอร์)
- สินค้าที่ผลิตได้ไม่จำกัด
- สินค้าที่นับสต๊อกไม่ได้

**Database:**
```sql
ALTER TABLE products ADD COLUMN no_stock_count BOOLEAN DEFAULT false;
```

**Logic:**
```php
// เมื่อเพิ่มสินค้า
if ($noStockCount) {
    $stock = 0; // บังคับให้เป็น 0
}

// เมื่อขายสินค้า
if (!$item['no_stock_count']) {
    // ตัดสต๊อก
} else {
    // ไม่ตัดสต๊อก
}
```

---

## 5. 💰 Sales & Void Logic

### 5.1 Bill Number Generation

**รูปแบบ:**
- บิลปกติ: `BV-YYYYMMDD-XXX`
- บิล Void: `VOID-YYYYMMDD-XXX`

**ตัวอย่าง:**
```
BV-20240115-001  → บิลที่ 1 ของวันที่ 15 ม.ค. 2024
VOID-20240115-001 → บิล Void ที่ 1 ของวันที่ 15 ม.ค. 2024
```

**โค้ด:**
```php
function generateBillNo($isVoid = false) {
    global $pdo;
    $datePrefix = date('Ymd');
    $prefix = $isVoid ? "VOID-{$datePrefix}-%" : "BV-{$datePrefix}-%";
    
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM sales WHERE bill_no LIKE :prefix");
    $stmt->execute(['prefix' => $prefix]);
    $count = intval($stmt->fetch()['count']);
    
    $sequence = str_pad($count + 1, 3, '0', STR_PAD_LEFT);
    
    return ($isVoid ? "VOID-{$datePrefix}" : "BV-{$datePrefix}") . "-{$sequence}";
}
```

### 5.2 Profit Calculation

**สูตร:**
```
profit = (price - cost) × quantity
```

**โค้ด:**
```php
foreach ($saleItems as $item) {
    $price = floatval($item['price']);
    $cost = floatval($item['cost']);
    $quantity = floatval($item['quantity']);
    
    $subtotal = $price * $quantity;
    $profit = ($price - $cost) * $quantity;
    
    $totalAmount += $subtotal;
    $totalProfit += $profit;
}
```

### 5.3 Snapshot Data

**แนวคิด:** บันทึกข้อมูลสินค้าตอนขาย (snapshot) เพื่อป้องกันปัญหาเมื่อแก้ไขข้อมูลสินค้าภายหลัง

**Database:**
```sql
CREATE TABLE sale_items (
    ...
    product_name_snapshot VARCHAR(255),
    barcode_snapshot VARCHAR(50),
    price_snapshot DECIMAL(15,2),
    cost_snapshot DECIMAL(15,2),
    ...
);
```

**Logic:**
```php
$saleItems[] = [
    'product_id' => $productId,
    'product_name_snapshot' => $product['name'],
    'barcode_snapshot' => $product['barcode'],
    'price_snapshot' => $price,
    'cost_snapshot' => $cost,
    ...
];
```

---

## 6. 📈 Dashboard Logic

### 6.1 Stats Cards (8 Cards)

**Card 1: สินค้าทั้งหมด**
```javascript
const productsRes = await apiGet(API_CONFIG.ENDPOINTS.PRODUCTS, { limit: 10000 });
const totalProducts = productsRes.data.products.length;
```

**Card 2: ยอดขายวันนี้**
```javascript
const today = new Date().toISOString().split('T')[0];
const todayRes = await apiGet(API_CONFIG.ENDPOINTS.SALES, { 
    date_from: today, 
    date_to: today 
});
const todaySales = todayRes.data.summary.total_net;
```

**Card 3: สินค้าสต็อกต่ำ**
```javascript
const lowStock = products.filter(p => 
    parseInt(p.stock || 0) < 10 && 
    parseInt(p.stock || 0) >= 0 &&
    !p.no_stock_count
).length;
```

**Card 4: บิลวันนี้**
```javascript
const todayBills = todayRes.data.summary.bill_count;
```

**Card 5-8: รายสัปดาห์/รายเดือน**
```javascript
// 7 วันล่าสุด
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
const weeklyRes = await apiGet(API_CONFIG.ENDPOINTS.SALES, { 
    date_from: sevenDaysAgo.toISOString().split('T')[0],
    date_to: today 
});

// เดือนนี้
const firstDayOfMonth = new Date();
firstDayOfMonth.setDate(1);
const monthlyRes = await apiGet(API_CONFIG.ENDPOINTS.SALES, { 
    date_from: firstDayOfMonth.toISOString().split('T')[0],
    date_to: today 
});
```

### 6.2 Sales Chart (ใช้ Materialized View)

**Workflow:**
1. ผู้ใช้เลือกช่วงเวลา (7 วัน / 30 วัน / กำหนดเอง)
2. API: GET /api/reports.php?type=daily_summary&date_from=...&date_to=...
3. Backend: ดึงข้อมูลจาก daily_sales_summary (Materialized View)
4. Frontend: วาดกราฟด้วย Chart.js

**โค้ด:**
```javascript
async function loadSalesChart() {
    const period = document.getElementById('chart-period').value;
    let startDate, endDate;
    
    if (period === '7days') {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
    } else if (period === '30days') {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 29);
    } else {
        // custom date range
        startDate = new Date(document.getElementById('chart-date-from').value);
        endDate = new Date(document.getElementById('chart-date-to').value);
    }
    
    const res = await apiGet(API_CONFIG.ENDPOINTS.REPORTS, {
        type: 'daily_summary',
        date_from: startDate.toISOString().split('T')[0],
        date_to: endDate.toISOString().split('T')[0]
    });
    
    const dailyData = res.data.data;
    
    // สร้าง labels และ data ให้ครบทุกวัน
    const labels = [];
    const salesData = [];
    const profitData = [];
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        labels.push(currentDate.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }));
        
        const dayData = dailyData.find(d => d.date === dateStr) || { total_net: 0, total_profit: 0 };
        salesData.push(dayData.total_net);
        profitData.push(dayData.total_profit);
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // วาดกราฟ
    renderSalesChart(labels, salesData, profitData);
}
```

---

## 7. 🔌 API Architecture

### 7.1 RESTful Design

**Endpoints:**
```
GET    /api/products.php          → ดึงสินค้าทั้งหมด
GET    /api/products.php?id=1     → ดึงสินค้าตาม ID
POST   /api/products.php          → เพิ่มสินค้า
PUT    /api/products.php          → แก้ไขสินค้า
DELETE /api/products.php?id=1     → ลบสินค้า

GET    /api/sales.php             → ดึงบิลทั้งหมด
GET    /api/sales.php?id=1        → ดึงบิลตาม ID
POST   /api/sales.php             → สร้างบิลขาย

GET    /api/hold_bills.php?session_id=xxx  → ดึงบิลที่พักไว้
POST   /api/hold_bills.php                 → พักบิลใหม่
PUT    /api/hold_bills.php?id=1            → แก้ไขบิลที่พัก
DELETE /api/hold_bills.php?id=1            → ลบบิลที่พัก

GET    /api/categories.php        → ดึงหมวดหมู่ทั้งหมด
POST   /api/categories.php        → เพิ่มหมวดหมู่
PUT    /api/categories.php        → แก้ไขหมวดหมู่
DELETE /api/categories.php?id=1   → ลบหมวดหมู่

GET    /api/settings.php          → ดึงการตั้งค่า
PUT    /api/settings.php          → แก้ไขการตั้งค่า

GET    /api/reports.php?type=daily_summary    → สรุปยอดขายรายวัน
GET    /api/reports.php?type=monthly_summary  → สรุปยอดขายรายเดือน
GET    /api/reports.php?type=category_summary → สรุปตามหมวดหมู่
GET    /api/reports.php?type=top_products     → สินค้าขายดี

GET    /api/stock_logs.php        → ดึงประวัติการเปลี่ยนแปลงสต๊อก
POST   /api/stock_in.php          → รับสินค้าเข้าสต๊อก
```

**Response Format:**
```json
{
    "status": "success",
    "data": { ... },
    "message": "Success"
}
```

**Error Response:**
```json
{
    "status": "error",
    "data": [],
    "message": "Error message"
}
```

### 7.2 Caching Strategy

**File-based Cache:**
```php
function cache_get($key) {
    $cacheFile = CACHE_DIR . md5($key) . '.cache';
    if (!file_exists($cacheFile)) return false;
    
    $data = json_decode(file_get_contents($cacheFile), true);
    if (time() - filemtime($cacheFile) > $data['ttl']) {
        unlink($cacheFile);
        return false;
    }
    
    return $data['data'];
}

function cache_set($key, $data, $ttl = 300) {
    $cacheFile = CACHE_DIR . md5($key) . '.cache';
    file_put_contents($cacheFile, json_encode([
        'data' => $data,
        'ttl' => $ttl,
        'time' => time()
    ]));
}
```

**Cache Keys:**
```
'products:list:100:0'           → รายการสินค้า (limit 100, offset 0)
'products:top_selling:30:30'    → สินค้าขายดี 30 อันดับ (30 วัน)
'sales:summary:all'             → สรุปยอดขายทั้งหมด
'sales:summary:filtered'        → สรุปยอดขาย (filter ตามวันที่)
'categories:list'               → รายการหมวดหมู่ทั้งหมด
```

---

## 8. 🗄️ Database Design

### 8.1 Indexes

**Products:**
```sql
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_stock ON products(stock);
```

**Sales:**
```sql
CREATE INDEX idx_sales_bill_no ON sales(bill_no);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
```

**Sale Items:**
```sql
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
```

**Stock Logs:**
```sql
CREATE INDEX idx_stock_logs_product_id ON stock_logs(product_id);
CREATE INDEX idx_stock_logs_change_type ON stock_logs(change_type);
```

### 8.2 Materialized View

**Table:**
```sql
CREATE TABLE daily_sales_summary (
    id SERIAL PRIMARY KEY,
    summary_date DATE UNIQUE NOT NULL,
    bill_count INT DEFAULT 0,
    total_sales DECIMAL(15,2) DEFAULT 0,
    total_discount DECIMAL(15,2) DEFAULT 0,
    total_net DECIMAL(15,2) DEFAULT 0,
    total_profit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Trigger:**
```sql
CREATE OR REPLACE FUNCTION update_daily_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO daily_sales_summary (summary_date, bill_count, total_sales, total_discount, total_net, total_profit)
    VALUES (
        NEW.sale_date::date,
        1,
        NEW.total_amount,
        NEW.discount,
        NEW.net_total,
        NEW.profit
    )
    ON CONFLICT (summary_date) 
    DO UPDATE SET 
        bill_count = daily_sales_summary.bill_count + 1,
        total_sales = daily_sales_summary.total_sales + EXCLUDED.total_sales,
        total_discount = daily_sales_summary.total_discount + EXCLUDED.total_discount,
        total_net = daily_sales_summary.total_net + EXCLUDED.total_net,
        total_profit = daily_sales_summary.total_profit + EXCLUDED.total_profit,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_sales_summary
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_daily_sales_summary();
```

---

## 9. 🎨 CSS Architecture

### 9.1 Type A / Type B System

**Type A: Standard Pages**
- **ไฟล์:** `common.css` + `style.css`
- **หน้า:** products, categories, sales, stock
- **ลักษณะ:** ใช้ styles มาตรฐานร่วมกัน

```html
<link rel="stylesheet" href="css/common.css">
<link rel="stylesheet" href="css/style.css">
```

**Type B: Special Pages**
- **ไฟล์:** `common.css` + `pos.css` หรือ `dashboard.css`
- **หน้า:** pos, index (dashboard)
- **ลักษณะ:** มี styles เฉพาะที่ซับซ้อน

```html
<!-- POS -->
<link rel="stylesheet" href="css/common.css">
<link rel="stylesheet" href="css/pos.css">

<!-- Dashboard -->
<link rel="stylesheet" href="css/common.css">
<link rel="stylesheet" href="css/dashboard.css">
```

### 9.2 CSS Variables

```css
:root {
    /* Brand Colors */
    --primary: #2563eb;
    --primary-hover: #1d4ed8;
    --primary-light: #dbeafe;
    
    /* Status Colors */
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --info: #0ea5e9;
    
    /* Backgrounds */
    --bg-main: #f1f5f9;
    --bg-sidebar: #1e293b;
    --bg-card: #ffffff;
    
    /* Text */
    --text-main: #0f172a;
    --text-muted: #64748b;
    
    /* Layout */
    --sidebar-width: 260px;
    --topbar-height: 60px;
    --radius: 8px;
}
```

### 9.3 Common Components

**ไฟล์ `common.css` ประกอบด้วย:**
- CSS Variables
- Reset & Base
- Sidebar + Branch Menu
- Topbar
- Cards
- Grid System
- Stat Cards
- Buttons (primary, success, danger, warning, outline)
- Icon Buttons
- Tables
- Forms
- Toolbar
- Search Results (autocomplete)
- Tab Group
- Badges
- Modals
- Empty & Loading States
- Pagination
- Charts
- Alerts
- Utilities

---

## 10. 📜 JavaScript Architecture

### 10.1 File Structure

```
js/
├── config.js       # API Configuration (BASE_URL, ENDPOINTS)
├── utils.js        # Utility Functions (API calls, formatters)
├── dashboard.js    # Dashboard Logic
├── pos.js          # POS Logic (Cart, Held Bills, Barcode)
├── products.js     # Products Management
├── sales.js        # Sales Management
├── categories.js   # Categories Management
└── stock.js        # Stock Management
```

### 10.2 config.js - API Configuration

```javascript
const API_CONFIG = {
    BASE_URL: 'https://my-retail-production.up.railway.app/api',
    
    ENDPOINTS: {
        PRODUCTS: '/products.php',
        SALES: '/sales.php',
        CATEGORIES: '/categories.php',
        HELD_BILLS: '/hold_bills.php',
        SETTINGS: '/settings.php',
        REPORTS: '/reports.php',
        STOCK_LOGS: '/stock_logs.php',
        STOCK_IN: '/stock_in.php'
    },
    
    DEFAULTS: {
        ITEMS_PER_PAGE: 50,
        QUICK_ITEMS_PER_ROW: 6,
        TOP_PRODUCTS_COUNT: 5,
        LOOKBACK_DAYS: 30,
        LOW_STOCK_THRESHOLD: 10
    },
    
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};
```

### 10.3 utils.js - Utility Functions

**API Helpers:**
```javascript
apiGet(endpoint, params)              // GET request
apiPost(endpoint, body)               // POST request
apiPut(endpoint, body)                // PUT request
apiDelete(endpoint, body)             // DELETE request (body)
apiDeleteWithParams(endpoint, params) // DELETE request (query params)
```

**Format Functions:**
```javascript
formatMoney(amount, decimals)     // Format ตัวเงิน (฿1,234.56)
formatDate(date, options)         // Format วันที่ (15 ม.ค. 2567)
formatDateFull(date)              // Format วันที่แบบเต็ม
formatDateForInput(date)          // Format สำหรับ input date (YYYY-MM-DD)
getToday()                        // วันที่วันนี้
getYesterday()                    // วันที่เมื่อวาน
```

**UI Helpers:**
```javascript
showToast(message, type, duration)  // แสดง Toast notification
showLoading(element, message)       // แสดง Loading state
showEmptyState(element, message)    // แสดง Empty state
showErrorState(element, message)    // แสดง Error state
openModal(modalId)                  // เปิด Modal
closeModal(modalId)                 // ปิด Modal
confirmAction(message)              // ยืนยันการกระทำ
```

**Validation Functions:**
```javascript
isEmpty(value)              // ตรวจสอบค่าว่าง
isValidEmail(email)         // ตรวจสอบ email format
isValidPhone(phone)         // ตรวจสอบเบอร์โทร format
isValidAmount(value)        // ตรวจสอบจำนวนเงิน
```

**Storage Functions:**
```javascript
saveToStorage(key, value)   // บันทึกลง localStorage
getFromStorage(key)         // ดึงข้อมูลจาก localStorage
removeFromStorage(key)      // ลบข้อมูลจาก localStorage
clearStorage()              // ล้างข้อมูลทั้งหมด
```

**Utility Functions:**
```javascript
debounce(func, wait)        // Debounce function
escapeHtml(text)            // Escape HTML special characters
truncateText(text, max)     // ตัดข้อความที่ยาว
copyToClipboard(text)       // Copy ข้อความ
scrollToElement(element)    // Scroll ไปยัง element
```

### 10.4 Page-specific Files

แต่ละหน้ามี logic ของตัวเอง:

- **dashboard.js** - โหลด stats, วาดกราฟ, จัดการ settings
- **pos.js** - จัดการตะกร้า, พักบิล, สแกนบาร์โค้ด, ค้นหาสินค้า
- **products.js** - CRUD สินค้า, ค้นหา, กรอง, เรียงลำดับ
- **sales.js** - ดูรายการบิล, กรองตามวันที่, Void บิล
- **categories.js** - CRUD หมวดหมู่, เลื่อนลำดับ
- **stock.js** - รับสินค้าเข้า, ดูประวัติ, คำนวณต้นทุน

---

## 11. ⚡ Performance Optimization

### 11.1 Query Optimization

**Problem:** ดึงข้อมูลสินค้าพร้อม category_name ต้อง JOIN ทุกครั้ง

**Solution:** ดึง categories จาก cache แล้ว map ใน PHP

```php
// ดึงสินค้า (ไม่ JOIN categories)
$sql = "SELECT * FROM products ...";
$products = $pdo->query($sql)->fetchAll();

// ดึง categories จาก cache
$categoriesCache = cache_get('categories:list');
$categoryMap = [];
foreach ($categoriesCache['categories'] as $cat) {
    $categoryMap[$cat['id']] = $cat['name'];
}

// Map category_name ใน PHP
foreach ($products as &$product) {
    $product['category_name'] = $categoryMap[$product['category_id']] ?? null;
}
```

### 11.2 Summary Caching

**Problem:** คำนวณ SUM() ทุกครั้งที่โหลดหน้า

**Solution:** Cache ผลลัพธ์ 60 วินาที

```php
$summaryCacheKey = 'sales:summary:all';
$summary = cache_get($summaryCacheKey);

if ($summary === false) {
    $summarySql = "SELECT COUNT(*) as bill_count, SUM(total_amount) as total_sales ...";
    $summary = $pdo->query($summarySql)->fetch();
    cache_set($summaryCacheKey, $summary, 60);
}
```

### 11.3 Clear Cache on Update

```php
// หลังสร้างบิลใหม่
cache_delete('sales:summary:all');
cache_delete('sales:summary:filtered');

// หลังเพิ่ม/แก้ไข/ลบสินค้า
cache_delete('products:list:100:0');
cache_delete('products:top_selling:30:30');

// หลังแก้ไขหมวดหมู่
cache_delete('categories:list');
```

### 11.4 Database Indexes

```sql
-- Products
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_stock ON products(stock);

-- Sales
CREATE INDEX idx_sales_bill_no ON sales(bill_no);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);

-- Sale Items
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- Stock Logs
CREATE INDEX idx_stock_logs_product_id ON stock_logs(product_id);
CREATE INDEX idx_stock_logs_change_type ON stock_logs(change_type);
```

---

## 📝 สรุป

เอกสารนี้ครอบคลุม workflow และ logic สำคัญทั้งหมดของระบบ POS & Stock Retail Manager

**ฟีเจอร์หลัก:**
- ✅ Smart Barcode Scanner (Thai to Number)
- ✅ Hold Bills System (JSONB)
- ✅ Stock Management (no_stock_count, stock_in)
- ✅ Materialized View (daily_sales_summary)
- ✅ File-based Cache
- ✅ CSS Architecture (Type A / Type B)
- ✅ JavaScript Architecture (Modular)

**พัฒนาโดย:** About Pop  
**อัปเดตล่าสุด:** 2026-07-09

---
```

บันทึกไฟล์ `skill.md` นี้ได้เลยครับ! เอกสารนี้ครอบคลุมทุก workflow และ logic ของระบบ รวมถึงส่วนที่เพิ่มเข้ามาใหม่ เช่น Stock In, Stock Logs, JavaScript Architecture 🚀