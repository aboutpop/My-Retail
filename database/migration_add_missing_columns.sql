-- ============================================================
-- Migration Script: เพิ่มคอลัมน์ที่ขาดหายในฐานข้อมูล
-- Version: 1.0
-- Date: 2026-07-13
-- 
-- คำอธิบาย:
-- - เพิ่มคอลัมน์ที่โค้ดต้องการแต่ไม่มีใน DB
-- - เปลี่ยนชื่อคอลัมน์ใน settings ให้ตรงกับโค้ด
-- - เปลี่ยน type ของ no_stock_count จาก boolean เป็น integer
-- ============================================================

-- ============================================================
-- 1. แก้ไขตาราง products
-- ============================================================

-- เพิ่ม cost_price (ถ้ามี cost อยู่แล้ว ให้ copy ข้อมูลมา)
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;

-- ถ้ามีข้อมูลใน cost อยู่แล้ว ให้ copy ไปที่ cost_price
UPDATE products SET cost_price = cost WHERE cost IS NOT NULL AND cost_price = 0;

-- เพิ่ม is_active (default true = สินค้าทั้งหมด active)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- เพิ่ม has_serial (default false = สินค้าส่วนใหญ่ไม่มี serial)
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_serial BOOLEAN DEFAULT false;

-- เพิ่ม min_stock (default 0 = ไม่มีการแจ้งเตือน stock ต่ำ)
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;

-- เพิ่ม updated_at (default current timestamp)
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- เปลี่ยน no_stock_count จาก boolean เป็น integer
-- ถ้าเป็น true → 1, ถ้าเป็น false → 0
ALTER TABLE products ALTER COLUMN no_stock_count TYPE INTEGER 
USING CASE 
    WHEN no_stock_count = true THEN 1 
    WHEN no_stock_count = false THEN 0 
    ELSE 0 
END;

-- ตั้ง default เป็น 0 สำหรับค่าใหม่
ALTER TABLE products ALTER COLUMN no_stock_count SET DEFAULT 0;

-- ============================================================
-- 2. แก้ไขตาราง settings
-- ============================================================

-- เปลี่ยนชื่อ setting_key → key
-- ตรวจสอบว่ามีคอลัมน์ key อยู่แล้วหรือไม่
DO $$
BEGIN
    -- ลบคอลัมน์ key ถ้ามีอยู่แล้ว (เพื่อป้องกัน conflict)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settings' AND column_name = 'key') THEN
        ALTER TABLE settings DROP COLUMN key;
    END IF;
    
    -- Rename setting_key → key
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settings' AND column_name = 'setting_key') THEN
        ALTER TABLE settings RENAME COLUMN setting_key TO key;
    END IF;
END $$;

-- เปลี่ยนชื่อ setting_value → value
DO $$
BEGIN
    -- ลบคอลัมน์ value ถ้ามีอยู่แล้ว (เพื่อป้องกัน conflict)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settings' AND column_name = 'value') THEN
        ALTER TABLE settings DROP COLUMN value;
    END IF;
    
    -- Rename setting_value → value
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settings' AND column_name = 'setting_value') THEN
        ALTER TABLE settings RENAME COLUMN setting_value TO value;
    END IF;
END $$;

-- ============================================================
-- 3. ตรวจสอบผลลัพธ์
-- ============================================================

-- แสดงโครงสร้างตาราง products หลัง migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- แสดงโครงสร้างตาราง settings หลัง migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'settings'
ORDER BY ordinal_position;

-- ============================================================
-- 4. ทดสอบข้อมูล
-- ============================================================

-- ตรวจสอบว่าข้อมูลเดิมยังอยู่ครบ
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_settings FROM settings;

-- ตรวจสอบค่า default ที่ถูกตั้งค่า
SELECT 
    COUNT(*) as total,
    COUNT(is_active) as has_is_active,
    COUNT(has_serial) as has_has_serial,
    COUNT(min_stock) as has_min_stock,
    COUNT(updated_at) as has_updated_at,
    COUNT(cost_price) as has_cost_price
FROM products;

-- ============================================================
-- เสร็จสิ้น!
-- ============================================================