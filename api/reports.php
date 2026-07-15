<?php
/**
 * Reports API - รายงานยอดขายและสรุปข้อมูล
 * Endpoint: /api/reports.php
 * Version: 1.0 (Optimized with daily_sales_summary table)
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendResponse('error', [], 'Method not allowed');
    http_response_code(405);
    exit;
}

$type = isset($_GET['type']) ? $_GET['type'] : 'daily_summary';

switch ($type) {
    case 'daily_summary': getDailySummary(); break;
    case 'monthly_summary': getMonthlySummary(); break;
    case 'category_summary': getCategorySummary(); break;
    case 'top_products': getTopProducts(); break;
    default:
        sendResponse('error', [], 'Invalid report type');
        http_response_code(400);
}

function getDailySummary() {
    global $pdo;
    $dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : date('Y-m-d', strtotime('-30 days'));
    $dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : date('Y-m-d');
    
    $cacheKey = "reports:daily:{$dateFrom}:{$dateTo}";
    $cached = cache_get($cacheKey);
    if ($cached !== false) {
        sendResponse('success', array_merge($cached, ['cached' => true]), 'Success');
        return;
    }
    
    try {
        $sql = "SELECT summary_date, bill_count, total_sales, total_discount, total_net, total_profit
                FROM daily_sales_summary
                WHERE summary_date BETWEEN :date_from AND :date_to
                ORDER BY summary_date ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['date_from' => $dateFrom, 'date_to' => $dateTo]);
        $rows = $stmt->fetchAll();
        
        $summary = ['total_bills' => 0, 'total_sales' => 0, 'total_discount' => 0, 'total_net' => 0, 'total_profit' => 0];
        $data = [];
        foreach ($rows as $row) {
            $data[] = [
                'date' => $row['summary_date'],
                'bill_count' => intval($row['bill_count']),
                'total_sales' => floatval($row['total_sales']),
                'total_discount' => floatval($row['total_discount']),
                'total_net' => floatval($row['total_net']),
                'total_profit' => floatval($row['total_profit'])
            ];
            $summary['total_bills'] += intval($row['bill_count']);
            $summary['total_sales'] += floatval($row['total_sales']);
            $summary['total_discount'] += floatval($row['total_discount']);
            $summary['total_net'] += floatval($row['total_net']);
            $summary['total_profit'] += floatval($row['total_profit']);
        }
        
        $result = ['data' => $data, 'summary' => $summary];
        cache_set($cacheKey, $result, 300);
        sendResponse('success', array_merge($result, ['cached' => false]), 'Success');
    } catch (PDOException $e) {
        logError('getDailySummary failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

function getMonthlySummary() {
    global $pdo;
    $year = isset($_GET['year']) ? intval($_GET['year']) : intval(date('Y'));
    
    $cacheKey = "reports:monthly:{$year}";
    $cached = cache_get($cacheKey);
    if ($cached !== false) {
        sendResponse('success', array_merge($cached, ['cached' => true]), 'Success');
        return;
    }
    
    try {
        $sql = "SELECT EXTRACT(MONTH FROM summary_date) as month, 
                       SUM(bill_count) as bill_count, SUM(total_sales) as total_sales, 
                       SUM(total_discount) as total_discount, SUM(total_net) as total_net, 
                       SUM(total_profit) as total_profit
                FROM daily_sales_summary
                WHERE EXTRACT(YEAR FROM summary_date) = :year
                GROUP BY EXTRACT(MONTH FROM summary_date)
                ORDER BY month ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['year' => $year]);
        $rows = $stmt->fetchAll();
        
        $data = [];
        $summary = ['total_bills' => 0, 'total_sales' => 0, 'total_discount' => 0, 'total_net' => 0, 'total_profit' => 0];
        foreach ($rows as $row) {
            $data[] = [
                'month' => intval($row['month']),
                'bill_count' => intval($row['bill_count']),
                'total_sales' => floatval($row['total_sales']),
                'total_discount' => floatval($row['total_discount']),
                'total_net' => floatval($row['total_net']),
                'total_profit' => floatval($row['total_profit'])
            ];
            $summary['total_bills'] += intval($row['bill_count']);
            $summary['total_sales'] += floatval($row['total_sales']);
            $summary['total_discount'] += floatval($row['total_discount']);
            $summary['total_net'] += floatval($row['total_net']);
            $summary['total_profit'] += floatval($row['total_profit']);
        }
        
        $result = ['data' => $data, 'summary' => $summary];
        cache_set($cacheKey, $result, 3600);
        sendResponse('success', array_merge($result, ['cached' => false]), 'Success');
    } catch (PDOException $e) {
        logError('getMonthlySummary failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

function getCategorySummary() {
    global $pdo;
    $dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : date('Y-m-d', strtotime('-30 days'));
    $dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : date('Y-m-d');
    
    $cacheKey = "reports:category:{$dateFrom}:{$dateTo}";
    $cached = cache_get($cacheKey);
    if ($cached !== false) {
        sendResponse('success', array_merge($cached, ['cached' => true]), 'Success');
        return;
    }
    
    try {
        $sql = "SELECT c.id as category_id, c.name as category_name, 
                       SUM(si.quantity) as total_quantity, SUM(si.subtotal) as total_sales, 
                       SUM((si.price_snapshot - si.cost_snapshot) * si.quantity) as total_profit
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id
                JOIN products p ON si.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE s.sale_date::date BETWEEN :date_from AND :date_to
                GROUP BY c.id, c.name
                ORDER BY total_sales DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['date_from' => $dateFrom, 'date_to' => $dateTo]);
        $rows = $stmt->fetchAll();
        
        $data = [];
        foreach ($rows as $row) {
            $data[] = [
                'category_id' => $row['category_id'] ? intval($row['category_id']) : null,
                'category_name' => $row['category_name'] ?? 'Uncategorized',
                'total_quantity' => floatval($row['total_quantity']),
                'total_sales' => floatval($row['total_sales']),
                'total_profit' => floatval($row['total_profit'])
            ];
        }
        
        $result = ['data' => $data];
        cache_set($cacheKey, $result, 300);
        sendResponse('success', array_merge($result, ['cached' => false]), 'Success');
    } catch (PDOException $e) {
        logError('getCategorySummary failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

function getTopProducts() {
    global $pdo;
    $dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : date('Y-m-d', strtotime('-30 days'));
    $dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : date('Y-m-d');
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
    
    $cacheKey = "reports:top_products:{$dateFrom}:{$dateTo}:{$limit}";
    $cached = cache_get($cacheKey);
    if ($cached !== false) {
        sendResponse('success', array_merge($cached, ['cached' => true]), 'Success');
        return;
    }
    
    try {
        $sql = "SELECT p.id, p.name, p.barcode, 
                       SUM(si.quantity) as total_quantity, SUM(si.subtotal) as total_sales, 
                       SUM((si.price_snapshot - si.cost_snapshot) * si.quantity) as total_profit
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id
                JOIN products p ON si.product_id = p.id
                WHERE s.sale_date::date BETWEEN :date_from AND :date_to
                GROUP BY p.id, p.name, p.barcode
                ORDER BY total_sales DESC
                LIMIT :limit";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['date_from' => $dateFrom, 'date_to' => $dateTo]);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $rows = $stmt->fetchAll();
        
        $data = [];
        foreach ($rows as $row) {
            $data[] = [
                'id' => intval($row['id']), 'name' => $row['name'], 'barcode' => $row['barcode'],
                'total_quantity' => floatval($row['total_quantity']),
                'total_sales' => floatval($row['total_sales']),
                'total_profit' => floatval($row['total_profit'])
            ];
        }
        
        $result = ['data' => $data];
        cache_set($cacheKey, $result, 300);
        sendResponse('success', array_merge($result, ['cached' => false]), 'Success');
    } catch (PDOException $e) {
        logError('getTopProducts failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}
?>