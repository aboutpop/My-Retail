-- ============================================================
-- My Retail - PostgreSQL Schema
-- Target: Neon.tech PostgreSQL
-- Version: 1.8 (Updated: 2026-07-13)
-- ============================================================

-- ============================================================
-- Trigger function for updated_at (แทน ON UPDATE CURRENT_TIMESTAMP)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ตาราง 1: categories (หมวดหมู่สินค้า)
-- ============================================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes สำหรับ categories
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Trigger สำหรับ updated_at ของ categories
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ตาราง 2: products (สินค้า)
-- ============================================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    barcode_status BOOLEAN,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    price NUMERIC(10, 2),
    cost NUMERIC(10, 2),
    stock INTEGER,
    unit VARCHAR(50),
    category VARCHAR(100),
    category_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    no_stock_count INTEGER DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    has_serial BOOLEAN DEFAULT FALSE,
    min_stock INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Indexes สำหรับ products
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_no_stock_count ON products(no_stock_count);

-- Trigger สำหรับ updated_at ของ products
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ตาราง 3: sales (ใบขาย)
-- ============================================================
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    bill_no VARCHAR(50) UNIQUE NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    discount NUMERIC(15, 2) DEFAULT 0,
    net_total NUMERIC(15, 2) DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'other')),
    profit NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    original_bill_no VARCHAR(50)
);

-- Indexes สำหรับ sales
CREATE INDEX idx_sales_bill_no ON sales(bill_no);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_sales_original_bill_no ON sales(original_bill_no);

-- ============================================================
-- ตาราง 4: sale_items (รายการสินค้าในบิล)
-- ============================================================
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name_snapshot VARCHAR(255) NOT NULL,
    barcode_snapshot VARCHAR(100),
    quantity NUMERIC(15, 2) NOT NULL,
    price_snapshot NUMERIC(15, 2) NOT NULL,
    cost_snapshot NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Indexes สำหรับ sale_items
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- ============================================================
-- ตาราง 5: stock_logs (ประวัติการเปลี่ยนแปลงสต็อก)
-- ============================================================
CREATE TABLE stock_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('sale', 'adjustment', 'import', 'return')),
    quantity_change INTEGER NOT NULL,
    reason VARCHAR(255),
    reference_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_stock INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes สำหรับ stock_logs
CREATE INDEX idx_stock_logs_product_id ON stock_logs(product_id);
CREATE INDEX idx_stock_logs_created_at ON stock_logs(created_at);
CREATE INDEX idx_stock_logs_current_stock ON stock_logs(current_stock);

-- ============================================================
-- ตาราง 6: settings (ตั้งค่าระบบ) - key-value store
-- ============================================================
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger สำหรับ updated_at ของ settings
CREATE TRIGGER trigger_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ตาราง 7: held_bills (บิลที่พักไว้)
-- ============================================================
CREATE TABLE held_bills (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    bill_index INTEGER NOT NULL,
    items JSONB NOT NULL,
    discount NUMERIC(15, 2) DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'other')),
    customer_name VARCHAR(255) DEFAULT NULL,
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_bill UNIQUE (session_id, bill_index)
);

-- Trigger สำหรับ updated_at ของ held_bills
CREATE TRIGGER trigger_held_bills_updated_at
    BEFORE UPDATE ON held_bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes สำหรับ held_bills
CREATE INDEX idx_held_bills_session ON held_bills(session_id);

-- ============================================================
-- Default Settings Data (ค่าเริ่มต้น)
-- ============================================================
INSERT INTO settings (key, value) VALUES
    ('store_name', 'สวนลุงพร'),
    ('store_address', '1263 หมู่10 วัฒนานคร สระแก้ว 27160'),
    ('receipt_footer', 'ขอบคุณที่อุดหนุน'),
    ('welcome_message', 'สวัสดีครับ'),
    ('quick_items_per_row', '6'),
    ('quick_items_count', '30'),
    ('quick_items_days', '30');

-- ============================================================
-- End of Schema
-- ============================================================