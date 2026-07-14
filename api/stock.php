<?php
/**
 * Stock API - จัดการสต็อกและประวัติการเคลื่อนไหว
 * Endpoint: /api/stock.php
 * Version: 1.5 (PostgreSQL + current_stock tracking)
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getStockLogs();
        break;
    case 'POST':
        adjustStock();
        break;
    default:
        sendResponse('error', [], 'Method not allowed');
        http_response_code(405);
}

function getStockLogs() {
    global $pdo;
    
    $where = [];
    $params = [];
    
    if (isset($_GET['product_id'])) {
        $where[] = "sl.product_id = :product_id";
        $params['product_id'] = intval($_GET['product_id']);
    }
    
    if (isset($_GET['change_type'])) {
        $where[] = "sl.change_type = :change_type";
        $params['change_type'] = $_GET['change_type'];
    }
    
    if (isset($_GET['date_from'])) {
        $where[] = "sl.created_at::date >= :date_from::date";
        $params['date_from'] = $_GET['date_from'];
    }
    
    if (isset($_GET['date_to'])) {
        $where[] = "sl.created_at::date <= :date_to::date";
        $params['date_to'] = $_GET['date_to'];
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    try {
        $sql = "SELECT
                    sl.id,
                    sl.product_id,
                    p.name as product_name,
                    p.barcode,
                    sl.change_type,
                    sl.quantity_change,
                    sl.reason,
                    sl.reference_id,
                    sl.current_stock,
                    sl.created_at
                FROM stock_logs sl
                LEFT JOIN products p ON sl.product_id = p.id
                {$whereClause}
                ORDER BY sl.created_at DESC
                LIMIT :limit OFFSET :offset";
        
        $stmt = $pdo->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        
        $logs = [];
        while ($row = $stmt->fetch()) {
            $row['quantity_change'] = intval($row['quantity_change']);
            $row['current_stock'] = intval($row['current_stock'] ?? 0);
            $logs[] = $row;
        }
        
        $countSql = "SELECT COUNT(*) as total FROM stock_logs sl {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        foreach ($params as $key => $value) {
            $countStmt->bindValue($key, $value);
        }
        $countStmt->execute();
        $total = $countStmt->fetch()['total'];
        
        $summarySql = "SELECT
                        COUNT(*) as total_logs,
                        SUM(CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END) as total_in,
                        SUM(CASE WHEN quantity_change < 0 THEN ABS(quantity_change) ELSE 0 END) as total_out
                       FROM stock_logs sl {$whereClause}";
        
        $summaryStmt = $pdo->prepare($summarySql);
        foreach ($params as $key => $value) {
            $summaryStmt->bindValue($key, $value);
        }
        $summaryStmt->execute();
        $summary = $summaryStmt->fetch();
        
        sendResponse('success', [
            'logs' => $logs,
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'summary' => [
                'total_logs' => intval($summary['total_logs']),
                'total_in' => intval($summary['total_in'] ?? 0),
                'total_out' => intval($summary['total_out'] ?? 0)
            ]
        ], 'Success');
        
    } catch (PDOException $e) {
        logError('getStockLogs failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

function adjustStock() {
    global $pdo;
    
    $data = getJSONInput();
    
    if (!$data) {
        sendResponse('error', [], 'Invalid JSON data');
        http_response_code(400);
        return;
    }
    
    if (empty($data['product_id'])) {
        sendResponse('error', [], 'Product ID is required');
        http_response_code(400);
        return;
    }
    
    if (empty($data['change_type'])) {
        sendResponse('error', [], 'Change type is required');
        http_response_code(400);
        return;
    }
    
    if (!isset($data['quantity_change'])) {
        sendResponse('error', [], 'Quantity change is required');
        http_response_code(400);
        return;
    }
    
    $productId = intval($data['product_id']);
    $changeType = $data['change_type'];
    $quantityChange = intval($data['quantity_change']);
    $reason = isset($data['reason']) ? $data['reason'] : '';
    $referenceId = isset($data['reference_id']) ? intval($data['reference_id']) : null;
    
    if (!in_array($changeType, ['adjustment', 'import', 'return'])) {
        sendResponse('error', [], 'Invalid change type. Must be: adjustment, import, or return');
        http_response_code(400);
        return;
    }
    
    try {
        $checkStmt = $pdo->prepare("SELECT id, name, stock FROM products WHERE id = :id");
        $checkStmt->execute(['id' => $productId]);
        $product = $checkStmt->fetch();
        
        if (!$product) {
            sendResponse('error', [], 'Product not found');
            http_response_code(404);
            return;
        }
        
        $oldStock = intval($product['stock']);
        
        $pdo->beginTransaction();
        
        try {
            $updateSql = "UPDATE products SET stock = stock + :quantity WHERE id = :id";
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([
                'quantity' => $quantityChange,
                'id' => $productId
            ]);
            
            // 🆕 บันทึก current_stock (สต๊อกก่อนเปลี่ยนแปลง)
            $logSql = "INSERT INTO stock_logs (product_id, change_type, quantity_change, reason, reference_id, current_stock)
                       VALUES (:product_id, :change_type, :quantity_change, :reason, :reference_id, :current_stock)
                       RETURNING id";
            
            $logStmt = $pdo->prepare($logSql);
            $logStmt->execute([
                'product_id' => $productId,
                'change_type' => $changeType,
                'quantity_change' => $quantityChange,
                'reason' => $reason,
                'reference_id' => $referenceId,
                'current_stock' => $oldStock
            ]);
            
            $logResult = $logStmt->fetch();
            $logId = $logResult['id'];
            
            $pdo->commit();
            
            $selectStmt = $pdo->prepare("SELECT id, name, stock FROM products WHERE id = :id");
            $selectStmt->execute(['id' => $productId]);
            $updatedProduct = $selectStmt->fetch();
            
            sendResponse('success', [
                'product' => $updatedProduct,
                'log' => [
                    'id' => $logId,
                    'product_id' => $productId,
                    'change_type' => $changeType,
                    'quantity_change' => $quantityChange,
                    'reason' => $reason,
                    'reference_id' => $referenceId,
                    'current_stock' => $oldStock
                ],
                'old_stock' => $oldStock,
                'new_stock' => intval($updatedProduct['stock'])
            ], 'Stock adjusted successfully');
            http_response_code(201);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } catch (PDOException $e) {
        logError('adjustStock failed', ['error' => $e->getMessage(), 'data' => $data]);
        sendResponse('error', [], 'Failed to adjust stock: ' . $e->getMessage());
        http_response_code(500);
    }
}
?>