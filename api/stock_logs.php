<?php
/**
 * Stock Logs API - บันทึกการเปลี่ยนแปลงสต๊อก
 * Endpoint: /api/stock_logs.php
 * Version: 1.0
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendResponse('error', [], 'Method not allowed');
    http_response_code(405);
    exit;
}

try {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $productId = isset($_GET['product_id']) ? intval($_GET['product_id']) : 0;
    $changeType = isset($_GET['change_type']) ? $_GET['change_type'] : '';
    
    $where = [];
    $params = [];
    
    if ($productId > 0) {
        $where[] = "sl.product_id = :product_id";
        $params['product_id'] = $productId;
    }
    
    if ($changeType) {
        $where[] = "sl.change_type = :change_type";
        $params['change_type'] = $changeType;
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    $sql = "SELECT sl.*, p.name as product_name, p.barcode
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
    
    $logs = $stmt->fetchAll();
    
    foreach ($logs as &$log) {
        $log['quantity_change'] = floatval($log['quantity_change']);
        $log['current_stock'] = intval($log['current_stock']);
    }
    
    // Count total
    $countSql = "SELECT COUNT(*) as total FROM stock_logs sl {$whereClause}";
    $countStmt = $pdo->prepare($countSql);
    foreach ($params as $key => $value) {
        $countStmt->bindValue($key, $value);
    }
    $countStmt->execute();
    $total = $countStmt->fetch()['total'];
    
    sendResponse('success', [
        'logs' => $logs,
        'total' => (int)$total,
        'limit' => $limit,
        'offset' => $offset
    ], 'Success');
    
} catch (PDOException $e) {
    logError('getStockLogs failed', ['error' => $e->getMessage()]);
    sendResponse('error', [], 'Query failed: ' . $e->getMessage());
    http_response_code(500);
}
?>