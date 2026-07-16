<?php
/**
 * Stock In API - รับสินค้าเข้าสต๊อก
 * Endpoint: /api/stock_in.php
 * Version: 1.0
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    sendResponse('error', [], 'Method not allowed');
    http_response_code(405);
    exit;
}

$data = getJSONInput();
if (!$data) {
    sendResponse('error', [], 'Invalid JSON data');
    http_response_code(400);
    exit;
}

$productId = isset($data['product_id']) ? intval($data['product_id']) : 0;
$quantity = isset($data['quantity']) ? floatval($data['quantity']) : 0;
$cost = isset($data['cost']) ? floatval($data['cost']) : null;
$reason = isset($data['reason']) ? $data['reason'] : 'รับเข้าสต๊อก';
$referenceId = isset($data['reference_id']) ? $data['reference_id'] : null;

if ($productId <= 0 || $quantity <= 0) {
    sendResponse('error', [], 'Product ID and quantity are required');
    http_response_code(400);
    exit;
}

try {
    // ดึงข้อมูลสินค้าปัจจุบัน
    $productStmt = $pdo->prepare("SELECT * FROM products WHERE id = :id");
    $productStmt->execute(['id' => $productId]);
    $product = $productStmt->fetch();
    
    if (!$product) {
        sendResponse('error', [], 'Product not found');
        http_response_code(404);
        exit;
    }
    
    $currentStock = intval($product['stock']);
    $newStock = $currentStock + $quantity;
    
    // อัปเดตสต๊อก
    $updateStmt = $pdo->prepare("UPDATE products SET stock = :stock WHERE id = :id");
    $updateStmt->execute(['stock' => $newStock, 'id' => $productId]);
    
    // อัปเดตต้นทุนถ้ามี
    if ($cost !== null) {
        $costStmt = $pdo->prepare("UPDATE products SET cost = :cost WHERE id = :id");
        $costStmt->execute(['cost' => $cost, 'id' => $productId]);
    }
    
    // บันทึก stock_logs
    $logSql = "INSERT INTO stock_logs (product_id, change_type, quantity_change, reason, reference_id, current_stock)
               VALUES (:product_id, 'stock_in', :quantity_change, :reason, :reference_id, :current_stock)";
    $logStmt = $pdo->prepare($logSql);
    $logStmt->execute([
        'product_id' => $productId,
        'quantity_change' => $quantity,
        'reason' => $reason,
        'reference_id' => $referenceId,
        'current_stock' => $newStock
    ]);
    
    // Clear cache
    cache_delete('products:list:100:0');
    
    sendResponse('success', [
        'product_id' => $productId,
        'quantity_added' => $quantity,
        'new_stock' => $newStock,
        'cost_updated' => $cost !== null
    ], 'Stock in successful');
    
    http_response_code(201);
    
} catch (PDOException $e) {
    logError('stockIn failed', ['error' => $e->getMessage(), 'data' => $data]);
    sendResponse('error', [], 'Failed to process stock in: ' . $e->getMessage());
    http_response_code(500);
}
?>