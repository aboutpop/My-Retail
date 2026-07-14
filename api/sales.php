<?php
/**
 * Sales API - จัดการบิลขาย
 * Endpoint: /api/sales.php
 * Version: 1.8 (PostgreSQL + Void Bill + no_stock_count + current_stock - Fixed)
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getSales();
        break;
    case 'POST':
        createSale();
        break;
    default:
        sendResponse('error', [], 'Method not allowed');
        http_response_code(405);
}

function convertEmptyToZero($value) {
    if ($value === '' || $value === null) {
        return 0;
    }
    return floatval($value);
}

function generateBillNo($isVoid = false) {
    global $pdo;
    
    $datePrefix = date('Ymd');
    $prefix = $isVoid ? "VOID-{$datePrefix}-%" : "BV-{$datePrefix}-%";
    
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM sales WHERE bill_no LIKE :prefix");
        $stmt->execute(['prefix' => $prefix]);
        $result = $stmt->fetch();
        $count = intval($result['count']);
        
        $sequence = str_pad($count + 1, 3, '0', STR_PAD_LEFT);
        $billPrefix = $isVoid ? "VOID-{$datePrefix}" : "BV-{$datePrefix}";
        return "{$billPrefix}-{$sequence}";
        
    } catch (PDOException $e) {
        logError('generateBillNo failed', ['error' => $e->getMessage()]);
        throw new Exception('Cannot generate bill number');
    }
}

function getSales() {
    global $pdo;
    
    if (isset($_GET['bill_no']) || isset($_GET['id'])) {
        try {
            if (isset($_GET['bill_no'])) {
                $stmt = $pdo->prepare("SELECT * FROM sales WHERE bill_no = :bill_no");
                $stmt->execute(['bill_no' => $_GET['bill_no']]);
            } else {
                $stmt = $pdo->prepare("SELECT * FROM sales WHERE id = :id");
                $stmt->execute(['id' => intval($_GET['id'])]);
            }
            
            $sale = $stmt->fetch();
            
            if (!$sale) {
                sendResponse('error', [], 'Bill not found');
                http_response_code(404);
                return;
            }
            
            $sale['total_amount'] = floatval($sale['total_amount']);
            $sale['discount'] = floatval($sale['discount']);
            $sale['net_total'] = floatval($sale['net_total']);
            $sale['profit'] = floatval($sale['profit']);
            
            $itemsStmt = $pdo->prepare("SELECT * FROM sale_items WHERE sale_id = :sale_id");
            $itemsStmt->execute(['sale_id' => $sale['id']]);
            $items = $itemsStmt->fetchAll();
            
            foreach ($items as &$item) {
                $item['quantity'] = floatval($item['quantity']);
                $item['price_snapshot'] = floatval($item['price_snapshot']);
                $item['cost_snapshot'] = floatval($item['cost_snapshot']);
                $item['subtotal'] = floatval($item['subtotal']);
            }
            
            $sale['items'] = $items;
            
            sendResponse('success', $sale, 'Success');
            return;
            
        } catch (PDOException $e) {
            logError('getSales by bill_no/id failed', ['error' => $e->getMessage()]);
            sendResponse('error', [], 'Query failed: ' . $e->getMessage());
            http_response_code(500);
            return;
        }
    }
    
    $where = [];
    $params = [];
    
    if (isset($_GET['date_from'])) {
        $where[] = "sale_date::date >= :date_from::date";
        $params['date_from'] = $_GET['date_from'];
    }
    
    if (isset($_GET['date_to'])) {
        $where[] = "sale_date::date <= :date_to::date";
        $params['date_to'] = $_GET['date_to'];
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    try {
        $sql = "SELECT * FROM sales {$whereClause} ORDER BY sale_date DESC LIMIT :limit OFFSET :offset";
        $stmt = $pdo->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $sales = $stmt->fetchAll();
        
        foreach ($sales as &$sale) {
            $sale['total_amount'] = floatval($sale['total_amount']);
            $sale['discount'] = floatval($sale['discount']);
            $sale['net_total'] = floatval($sale['net_total']);
            $sale['profit'] = floatval($sale['profit']);
        }
        
        $countSql = "SELECT COUNT(*) as total FROM sales {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        foreach ($params as $key => $value) {
            $countStmt->bindValue($key, $value);
        }
        $countStmt->execute();
        $total = $countStmt->fetch()['total'];
        
        $summarySql = "SELECT
                        COUNT(*) as bill_count,
                        SUM(total_amount) as total_sales,
                        SUM(discount) as total_discount,
                        SUM(net_total) as total_net,
                        SUM(profit) as total_profit
                       FROM sales {$whereClause}";
        
        $summaryStmt = $pdo->prepare($summarySql);
        foreach ($params as $key => $value) {
            $summaryStmt->bindValue($key, $value);
        }
        $summaryStmt->execute();
        $summary = $summaryStmt->fetch();
        
        sendResponse('success', [
            'sales' => $sales,
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'summary' => [
                'bill_count' => intval($summary['bill_count']),
                'total_sales' => floatval($summary['total_sales'] ?? 0),
                'total_discount' => floatval($summary['total_discount'] ?? 0),
                'total_net' => floatval($summary['total_net'] ?? 0),
                'total_profit' => floatval($summary['total_profit'] ?? 0)
            ]
        ], 'Success');
        
    } catch (PDOException $e) {
        logError('getSales failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

function createSale() {
    global $pdo;
    
    $data = getJSONInput();
    
    if (!$data) {
        sendResponse('error', [], 'Invalid JSON data');
        http_response_code(400);
        return;
    }
    
    if (empty($data['items']) || !is_array($data['items'])) {
        sendResponse('error', [], 'Items are required and must be an array');
        http_response_code(400);
        return;
    }
    
    $isVoid = isset($data['is_void']) && $data['is_void'] === true;
    $originalBillNo = isset($data['original_bill_no']) ? $data['original_bill_no'] : null;
    
    $pdo->beginTransaction();
    
    try {
        $billNo = generateBillNo($isVoid);
        
        $totalAmount = 0;
        $totalProfit = 0;
        $saleItems = [];
        
        foreach ($data['items'] as $item) {
            if (empty($item['product_id']) || !isset($item['quantity'])) {
                throw new Exception('Each item must have product_id and quantity');
            }
            
            $productId = intval($item['product_id']);
            $quantity = floatval($item['quantity']);
            
            if (!$isVoid && $quantity <= 0) {
                throw new Exception('Quantity must be greater than 0');
            }
            
            $productStmt = $pdo->prepare("SELECT *, no_stock_count FROM products WHERE id = :id");
            $productStmt->execute(['id' => $productId]);
            $product = $productStmt->fetch();
            
            if (!$product) {
                throw new Exception("Product ID {$productId} not found");
            }
            
            $price = isset($item['price']) ? floatval($item['price']) : floatval($product['price']);
            $cost = floatval($product['cost']);
            $noStockCount = ($product['no_stock_count'] > 0);
            
            $subtotal = $price * $quantity;
            $profit = ($price - $cost) * $quantity;
            
            $totalAmount += $subtotal;
            $totalProfit += $profit;
            
            $saleItems[] = [
                'product_id' => $productId,
                'product_name_snapshot' => $product['name'],
                'barcode_snapshot' => $product['barcode'],
                'quantity' => $quantity,
                'price_snapshot' => $price,
                'cost_snapshot' => $cost,
                'subtotal' => $subtotal,
                'no_stock_count' => $noStockCount,
                'current_stock' => intval($product['stock'])
            ];
        }
        
        $discount = convertEmptyToZero($data['discount'] ?? 0);
        $netTotal = $totalAmount - $discount;
        $paymentMethod = isset($data['payment_method']) ? $data['payment_method'] : 'cash';
        
        if (!in_array($paymentMethod, ['cash', 'transfer', 'other'])) {
            throw new Exception('Invalid payment method');
        }
        
        $saleSql = "INSERT INTO sales (bill_no, total_amount, discount, net_total, payment_method, profit, original_bill_no)
                    VALUES (:bill_no, :total_amount, :discount, :net_total, :payment_method, :profit, :original_bill_no)
                    RETURNING id";
        
        $saleStmt = $pdo->prepare($saleSql);
        $saleStmt->execute([
            'bill_no' => $billNo,
            'total_amount' => $totalAmount,
            'discount' => $discount,
            'net_total' => $netTotal,
            'payment_method' => $paymentMethod,
            'profit' => $totalProfit,
            'original_bill_no' => $originalBillNo
        ]);
        
        $saleResult = $saleStmt->fetch();
        $saleId = $saleResult['id'];
        
        foreach ($saleItems as $item) {
            $itemSql = "INSERT INTO sale_items (sale_id, product_id, product_name_snapshot, barcode_snapshot, quantity, price_snapshot, cost_snapshot, subtotal)
                        VALUES (:sale_id, :product_id, :product_name_snapshot, :barcode_snapshot, :quantity, :price_snapshot, :cost_snapshot, :subtotal)";
            
            $itemStmt = $pdo->prepare($itemSql);
            $itemStmt->execute([
                'sale_id' => $saleId,
                'product_id' => $item['product_id'],
                'product_name_snapshot' => $item['product_name_snapshot'],
                'barcode_snapshot' => $item['barcode_snapshot'],
                'quantity' => $item['quantity'],
                'price_snapshot' => $item['price_snapshot'],
                'cost_snapshot' => $item['cost_snapshot'],
                'subtotal' => $item['subtotal']
            ]);
            
            if (!$item['no_stock_count']) {
                $updateStock = $pdo->prepare("UPDATE products SET stock = stock - :quantity WHERE id = :id");
                $updateStock->execute([
                    'quantity' => $item['quantity'],
                    'id' => $item['product_id']
                ]);
                
                if ($isVoid) {
                    $reason = "คืนสินค้า (Void บิล {$originalBillNo})";
                    $changeType = 'return';
                } else {
                    $reason = "ขายสินค้า (บิล {$billNo})";
                    $changeType = 'sale';
                }
                
                $quantityChange = -$item['quantity'];
                
                $logSql = "INSERT INTO stock_logs (product_id, change_type, quantity_change, reason, reference_id, current_stock)
                           VALUES (:product_id, :change_type, :quantity_change, :reason, :reference_id, :current_stock)";
                
                $logStmt = $pdo->prepare($logSql);
                $logStmt->execute([
                    'product_id' => $item['product_id'],
                    'change_type' => $changeType,
                    'quantity_change' => $quantityChange,
                    'reason' => $reason,
                    'reference_id' => $saleId,
                    'current_stock' => $item['current_stock']
                ]);
            }
        }
        
        $pdo->commit();
        
        $selectStmt = $pdo->prepare("SELECT * FROM sales WHERE id = :id");
        $selectStmt->execute(['id' => $saleId]);
        $sale = $selectStmt->fetch();
        
        $sale['total_amount'] = floatval($sale['total_amount']);
        $sale['discount'] = floatval($sale['discount']);
        $sale['net_total'] = floatval($sale['net_total']);
        $sale['profit'] = floatval($sale['profit']);
        $sale['items'] = $saleItems;
        
        $message = $isVoid ? 'Void bill created successfully' : 'Sale created successfully';
        sendResponse('success', $sale, $message);
        http_response_code(201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        logError('createSale failed', ['error' => $e->getMessage(), 'data' => $data]);
        sendResponse('error', [], $e->getMessage());
        http_response_code(500);
    }
}
?>