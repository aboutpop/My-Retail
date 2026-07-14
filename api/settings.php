<?php
/**
 * Settings API
 * จัดการค่าตั้งค่าระบบ (Store info, Receipt, UI settings)
 * Version: 1.5 (PostgreSQL - Fixed for new schema)
 *
 * Methods:
 * - GET: ดึง settings ทั้งหมด หรือ ดึงเฉพาะ key
 * - PUT: อัปเดต settings (multiple keys)
 *
 * Response Format:
 * {
 *   "status": "success",
 *   "message": "...",
 *   "data": {
 *     "settings": { "key1": "value1", "key2": "value2" }
 *   }
 * }
 *
 * ⚠️ Schema Update (2025):
 * - เปลี่ยนชื่อ column จาก setting_key → key
 * - เปลี่ยนชื่อ column จาก setting_value → value
 */

// Include database connection & helper functions
require_once 'config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            handleGet();
            break;
        case 'PUT':
            handlePut();
            break;
        default:
            sendResponse('error', [], 'Method not supported');
            http_response_code(405);
    }
} catch (Exception $e) {
    logError('Settings API error', ['error' => $e->getMessage()]);
    sendResponse('error', [], $e->getMessage());
    http_response_code(500);
}

/**
 * GET: ดึงค่าตั้งค่า
 *
 * Parameters:
 * - key (optional): ถ้าระบุจะดึงเฉพาะ key นั้น
 */
function handleGet() {
    global $pdo;
    
    $key = $_GET['key'] ?? null;
    
    try {
        if ($key) {
            // ดึงเฉพาะ key (ใช้ column name ใหม่: key, value)
            $stmt = $pdo->prepare("SELECT value FROM settings WHERE key = :key");
            $stmt->execute(['key' => $key]);
            $row = $stmt->fetch();
            
            if ($row) {
                sendResponse('success', [
                    'settings' => [
                        $key => $row['value']
                    ]
                ], 'Success');
            } else {
                sendResponse('error', [], 'ไม่พบค่า key: ' . $key);
                http_response_code(404);
            }
        } else {
            // ดึงทั้งหมด (ใช้ column name ใหม่: key, value)
            $stmt = $pdo->query("SELECT key, value FROM settings");
            $settings = [];
            
            while ($row = $stmt->fetch()) {
                $settings[$row['key']] = $row['value'];
            }
            
            sendResponse('success', [
                'settings' => $settings
            ], 'Success');
        }
    } catch (PDOException $e) {
        logError('handleGet failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

/**
 * PUT: อัปเดตค่าตั้งค่า
 *
 * Body (JSON):
 * {
 *   "settings": {
 *     "store_name": "ชื่อร้านใหม่",
 *     "store_address": "ที่อยู่ใหม่"
 *   }
 * }
 */
function handlePut() {
    global $pdo;
    
    $input = getJSONInput();
    
    if (!$input || !isset($input['settings']) || !is_array($input['settings'])) {
        sendResponse('error', [], 'ข้อมูลไม่ถูกต้อง: ต้องมี settings เป็น object');
        http_response_code(400);
        return;
    }
    
    $settings = $input['settings'];
    
    if (empty($settings)) {
        sendResponse('error', [], 'ไม่มีข้อมูลที่ต้องการอัปเดต');
        http_response_code(400);
        return;
    }
    
    // ตรวจสอบว่า keys ที่ส่งมาถูกต้อง
    $allowedKeys = [
        'store_name',
        'store_address',
        'receipt_footer',
        'welcome_message',
        'quick_items_per_row',
        'quick_items_count',
        'quick_items_days'
    ];
    
    $updatedKeys = [];
    
    // Begin transaction
    $pdo->beginTransaction();
    
    try {
        foreach ($settings as $key => $value) {
            // ตรวจสอบว่า key อยู่ในรายการที่อนุญาต
            if (!in_array($key, $allowedKeys)) {
                throw new Exception('ไม่อนุญาตให้ตั้งค่า key: ' . $key);
            }
            
            // ตรวจสอบประเภทข้อมูล
            if (!is_string($value) && !is_numeric($value)) {
                throw new Exception('ค่าของ ' . $key . ' ต้องเป็น string หรือ number');
            }
            
            // อัปเดตหรือเพิ่มค่า (PostgreSQL ใช้ ON CONFLICT)
            // ⚠️ ใช้ column name ใหม่: key, value
            $sql = "INSERT INTO settings (key, value) 
                    VALUES (:key, :value)
                    ON CONFLICT (key) DO UPDATE SET 
                    value = EXCLUDED.value,
                    updated_at = CURRENT_TIMESTAMP";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'key' => $key,
                'value' => (string)$value
            ]);
            
            $updatedKeys[] = $key;
        }
        
        // Commit transaction
        $pdo->commit();
        
        sendResponse('success', [
            'updated_keys' => $updatedKeys,
            'count' => count($updatedKeys)
        ], 'อัปเดตการตั้งค่าสำเร็จ');
        
    } catch (Exception $e) {
        // Rollback transaction
        $pdo->rollBack();
        logError('handlePut failed', ['error' => $e->getMessage(), 'input' => $input]);
        sendResponse('error', [], $e->getMessage());
        http_response_code(500);
    }
}
?>