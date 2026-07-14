<?php
/**
 * Held Bills API - จัดการบิลที่พักไว้ (Hold Bills)
 * Endpoint: /api/hold_bills.php
 * Version: 1.4 (PostgreSQL)
 *
 * ฟีเจอร์:
 * - พักบิลไว้ชั่วคราว (สูงสุด 5 บิลต่อ session)
 * - ดึงรายการบิลที่พักไว้
 * - อัปเดตบิลที่พักไว้
 * - ยกเลิกบิลที่พักไว้
 *
 * หมายเหตุ:
 * - items เก็บเป็น JSONB ใน PostgreSQL
 * - แต่ละ session สามารถพักบิลได้สูงสุด 5 บิล
 * - bill_index ใช้เพื่อระบุตำแหน่ง (1-5)
 */

require_once 'config.php';

// ค่าคงที่: จำนวนบิลสูงสุดที่พักได้ต่อ session
define('MAX_HELD_BILLS', 5);

$method = $_SERVER['REQUEST_METHOD'];
$sessionId = $_GET['session_id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            handleGet($sessionId);
            break;
        case 'POST':
            handlePost($sessionId);
            break;
        case 'PUT':
            handlePut($sessionId);
            break;
        case 'DELETE':
            handleDelete($sessionId);
            break;
        default:
            sendResponse('error', [], 'Method not allowed');
            http_response_code(405);
    }
} catch (Exception $e) {
    logError('Held Bills API error', ['error' => $e->getMessage()]);
    sendResponse('error', [], $e->getMessage());
    http_response_code(500);
}

/**
 * GET: ดึงรายการบิลที่พักไว้ของ session นั้น
 */
function handleGet($sessionId) {
    global $pdo;
    
    if (!$sessionId) {
        sendResponse('error', [], 'session_id is required');
        http_response_code(400);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, session_id, bill_index, items, discount, payment_method,
                   customer_name, note, created_at, updated_at
            FROM held_bills
            WHERE session_id = :session_id
            ORDER BY bill_index ASC
        ");
        $stmt->execute(['session_id' => $sessionId]);
        $rows = $stmt->fetchAll();
        
        $heldBills = [];
        foreach ($rows as $row) {
            // Decode JSON items (JSONB จะคืนค่าเป็น string)
            $items = json_decode($row['items'], true) ?? [];
            
            // คำนวณจำนวนรายการและยอดรวม
            $itemCount = count($items);
            $totalAmount = 0;
            foreach ($items as $item) {
                $totalAmount += ($item['quantity'] ?? 0) * ($item['price'] ?? 0);
            }
            
            $heldBills[] = [
                'id' => (int)$row['id'],
                'bill_index' => (int)$row['bill_index'],
                'items' => $items,
                'discount' => (float)$row['discount'],
                'payment_method' => $row['payment_method'],
                'customer_name' => $row['customer_name'],
                'note' => $row['note'],
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'],
                'item_count' => $itemCount,
                'total_amount' => $totalAmount
            ];
        }
        
        sendResponse('success', [
            'held_bills' => $heldBills,
            'total' => count($heldBills),
            'max_bills' => MAX_HELD_BILLS
        ], 'Success');
        
    } catch (PDOException $e) {
        logError('handleGet failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

/**
 * POST: พักบิลใหม่
 */
function handlePost($sessionId) {
    global $pdo;
    
    if (!$sessionId) {
        sendResponse('error', [], 'session_id is required');
        http_response_code(400);
        return;
    }
    
    $input = getJSONInput();
    
    if (!$input || !isset($input['items']) || !is_array($input['items'])) {
        sendResponse('error', [], 'ข้อมูลไม่ถูกต้อง: ต้องมี items เป็น array');
        http_response_code(400);
        return;
    }
    
    $items = $input['items'];
    
    if (empty($items)) {
        sendResponse('error', [], 'ไม่สามารถพักบิลว่างได้');
        http_response_code(400);
        return;
    }
    
    try {
        // ตรวจสอบจำนวนบิลที่พักไว้
        $countStmt = $pdo->prepare("SELECT COUNT(*) as count FROM held_bills WHERE session_id = :session_id");
        $countStmt->execute(['session_id' => $sessionId]);
        $countRow = $countStmt->fetch();
        $currentCount = (int)$countRow['count'];
        
        if ($currentCount >= MAX_HELD_BILLS) {
            sendResponse('error', [], 'จำนวนบิลที่พักไว้เต็มแล้ว (สูงสุด ' . MAX_HELD_BILLS . ' บิล)');
            http_response_code(400);
            return;
        }
        
        // หา bill_index ว่าง (1-5)
        $indexStmt = $pdo->prepare("
            SELECT bill_index FROM held_bills
            WHERE session_id = :session_id
            ORDER BY bill_index ASC
        ");
        $indexStmt->execute(['session_id' => $sessionId]);
        $indexRows = $indexStmt->fetchAll();
        
        $usedIndices = array_map(function($row) { return (int)$row['bill_index']; }, $indexRows);
        
        // หา index ว่าง
        $newIndex = null;
        for ($i = 1; $i <= MAX_HELD_BILLS; $i++) {
            if (!in_array($i, $usedIndices)) {
                $newIndex = $i;
                break;
            }
        }
        
        if ($newIndex === null) {
            sendResponse('error', [], 'ไม่สามารถหา bill_index ว่างได้');
            http_response_code(500);
            return;
        }
        
        // เตรียมข้อมูล
        $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);
        $discount = isset($input['discount']) ? (float)$input['discount'] : 0;
        $paymentMethod = $input['payment_method'] ?? 'cash';
        $customerName = $input['customer_name'] ?? null;
        $note = $input['note'] ?? null;
        
        // ตรวจสอบ payment_method
        $allowedPaymentMethods = ['cash', 'transfer', 'other'];
        if (!in_array($paymentMethod, $allowedPaymentMethods)) {
            sendResponse('error', [], 'payment_method ไม่ถูกต้อง');
            http_response_code(400);
            return;
        }
        
        // Insert (ใช้ RETURNING id)
        $insertSql = "
            INSERT INTO held_bills (session_id, bill_index, items, discount, payment_method, customer_name, note)
            VALUES (:session_id, :bill_index, :items::jsonb, :discount, :payment_method, :customer_name, :note)
            RETURNING id
        ";
        
        $insertStmt = $pdo->prepare($insertSql);
        $insertStmt->execute([
            'session_id' => $sessionId,
            'bill_index' => $newIndex,
            'items' => $itemsJson,
            'discount' => $discount,
            'payment_method' => $paymentMethod,
            'customer_name' => $customerName,
            'note' => $note
        ]);
        
        $result = $insertStmt->fetch();
        $newId = $result['id'];
        
        sendResponse('success', [
            'id' => (int)$newId,
            'bill_index' => $newIndex,
            'session_id' => $sessionId
        ], 'พักบิลสำเร็จ');
        http_response_code(201);
        
    } catch (PDOException $e) {
        logError('handlePost failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'ไม่สามารถพักบิลได้: ' . $e->getMessage());
        http_response_code(500);
    }
}

/**
 * PUT: อัปเดตบิลที่พัก
 * URL: ?id=X&session_id=Y
 */
function handlePut($sessionId) {
    global $pdo;
    
    if (!$sessionId) {
        sendResponse('error', [], 'session_id is required');
        http_response_code(400);
        return;
    }
    
    $id = $_GET['id'] ?? null;
    if (!$id) {
        sendResponse('error', [], 'id is required');
        http_response_code(400);
        return;
    }
    
    $input = getJSONInput();
    if (!$input) {
        sendResponse('error', [], 'ข้อมูลไม่ถูกต้อง');
        http_response_code(400);
        return;
    }
    
    try {
        // ตรวจสอบว่าเป็นบิลของ session นี้หรือไม่
        $checkStmt = $pdo->prepare("SELECT id FROM held_bills WHERE id = :id AND session_id = :session_id");
        $checkStmt->execute(['id' => $id, 'session_id' => $sessionId]);
        
        if (!$checkStmt->fetch()) {
            sendResponse('error', [], 'ไม่พบรายการบิลที่พักไว้ หรือไม่ใช่บิลของคุณ');
            http_response_code(404);
            return;
        }
        
        // เตรียมข้อมูลสำหรับอัปเดต
        $updates = [];
        $params = ['id' => $id, 'session_id' => $sessionId];
        
        if (isset($input['items'])) {
            if (!is_array($input['items'])) {
                sendResponse('error', [], 'items ต้องเป็น array');
                http_response_code(400);
                return;
            }
            $updates[] = "items = :items::jsonb";
            $params['items'] = json_encode($input['items'], JSON_UNESCAPED_UNICODE);
        }
        
        if (isset($input['discount'])) {
            $updates[] = "discount = :discount";
            $params['discount'] = (float)$input['discount'];
        }
        
        if (isset($input['payment_method'])) {
            $allowedPaymentMethods = ['cash', 'transfer', 'other'];
            if (!in_array($input['payment_method'], $allowedPaymentMethods)) {
                sendResponse('error', [], 'payment_method ไม่ถูกต้อง');
                http_response_code(400);
                return;
            }
            $updates[] = "payment_method = :payment_method";
            $params['payment_method'] = $input['payment_method'];
        }
        
        if (isset($input['customer_name'])) {
            $updates[] = "customer_name = :customer_name";
            $params['customer_name'] = $input['customer_name'];
        }
        
        if (isset($input['note'])) {
            $updates[] = "note = :note";
            $params['note'] = $input['note'];
        }
        
        if (empty($updates)) {
            sendResponse('error', [], 'ไม่มีข้อมูลที่ต้องการอัปเดต');
            http_response_code(400);
            return;
        }
        
        // Build SQL
        $sql = "UPDATE held_bills SET " . implode(', ', $updates) . " WHERE id = :id AND session_id = :session_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        sendResponse('success', [
            'id' => (int)$id,
            'session_id' => $sessionId
        ], 'อัปเดตบิลสำเร็จ');
        
    } catch (PDOException $e) {
        logError('handlePut failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'ไม่สามารถอัปเดตบิลได้: ' . $e->getMessage());
        http_response_code(500);
    }
}

/**
 * DELETE: ยกเลิกบิลที่พัก
 * URL: ?id=X&session_id=Y
 */
function handleDelete($sessionId) {
    global $pdo;
    
    if (!$sessionId) {
        sendResponse('error', [], 'session_id is required');
        http_response_code(400);
        return;
    }
    
    $id = $_GET['id'] ?? null;
    if (!$id) {
        sendResponse('error', [], 'id is required');
        http_response_code(400);
        return;
    }
    
    try {
        // ตรวจสอบว่าเป็นบิลของ session นี้หรือไม่
        $checkStmt = $pdo->prepare("SELECT id, bill_index FROM held_bills WHERE id = :id AND session_id = :session_id");
        $checkStmt->execute(['id' => $id, 'session_id' => $sessionId]);
        $row = $checkStmt->fetch();
        
        if (!$row) {
            sendResponse('error', [], 'ไม่พบรายการบิลที่พักไว้ หรือไม่ใช่บิลของคุณ');
            http_response_code(404);
            return;
        }
        
        $billIndex = $row['bill_index'];
        
        // Delete
        $deleteStmt = $pdo->prepare("DELETE FROM held_bills WHERE id = :id AND session_id = :session_id");
        $deleteStmt->execute(['id' => $id, 'session_id' => $sessionId]);
        
        sendResponse('success', [
            'id' => (int)$id,
            'bill_index' => (int)$billIndex,
            'session_id' => $sessionId
        ], 'ยกเลิกบิลสำเร็จ');
        
    } catch (PDOException $e) {
        logError('handleDelete failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'ไม่สามารถลบบิลได้: ' . $e->getMessage());
        http_response_code(500);
    }
}
?>