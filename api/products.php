<?php
/**
* Products API - จัดการข้อมูลสินค้า (CRUD)
* Endpoint: /api/products.php
* Version: 2.1 (Query Optimization: Category Map from Cache)
*/

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['top_selling'])) {
            handleTopSelling();
        } elseif (isset($_GET['id'])) {
            getProductById();
        } else {
            getProducts();
        }
        break;
    case 'POST':
        createProduct();
        break;
    case 'PUT':
        updateProduct();
        break;
    case 'DELETE':
        deleteProduct();
        break;
    default:
        sendResponse('error', [], 'Method not allowed');
        http_response_code(405);
}

function convertEmptyToZero($value) {
    if ($value === '' || $value === null) return 0;
    return floatval($value);
}

function convertToBoolean($value) {
    if ($value === 'true' || $value === true || $value === 1 || $value === '1') return true;
    return false;
}

function handleTopSelling() {
    global $pdo;
    $limit = isset($_GET['top_selling']) ? intval($_GET['top_selling']) : 30;
    $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
    
    $cacheKey = "products:top_selling:{$limit}:{$days}";
    $products = cache_get($cacheKey);
    
    if ($products !== false) {
        sendResponse('success', ['products' => $products, 'total' => count($products), 'days' => $days, 'limit' => $limit, 'cached' => true], 'Success');
        return;
    }
    
    try {
        $sql = "SELECT p.id, p.name, p.barcode, p.price, p.cost, p.stock, p.category_id, p.no_stock_count, c.name as category_name, COALESCE(SUM(si.quantity), 0) as total_sold, COUNT(DISTINCT si.sale_id) as times_sold
                FROM products p
                LEFT JOIN sale_items si ON p.id = si.product_id
                LEFT JOIN sales s ON si.sale_id = s.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE s.sale_date >= NOW() - (:days * INTERVAL '1 day') OR s.sale_date IS NULL
                GROUP BY p.id, p.name, p.barcode, p.price, p.cost, p.stock, p.category_id, p.no_stock_count, c.name
                ORDER BY times_sold DESC, total_sold DESC
                LIMIT :limit";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue('days', $days, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $products = [];
        while ($row = $stmt->fetch()) {
            $products[] = [
                'id' => (int)$row['id'], 'name' => $row['name'], 'barcode' => $row['barcode'],
                'price' => (float)$row['price'], 'cost' => (float)$row['cost'], 'stock' => (int)$row['stock'],
                'category_id' => $row['category_id'] ? (int)$row['category_id'] : null,
                'no_stock_count' => ($row['no_stock_count'] > 0), 'category_name' => $row['category_name'],
                'total_sold' => (float)$row['total_sold'], 'times_sold' => (int)$row['times_sold']
            ];
        }
        
        cache_set($cacheKey, $products, 300);
        sendResponse('success', ['products' => $products, 'total' => count($products), 'days' => $days, 'limit' => $limit, 'cached' => false], 'Success');
    } catch (PDOException $e) {
        logError('handleTopSelling failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

function getProductById() {
    global $pdo;
    $id = intval($_GET['id']);
    if ($id <= 0) { sendResponse('error', [], 'Invalid product ID'); http_response_code(400); return; }
    
    try {
        $sql = "SELECT p.id, p.name, p.barcode_status, p.barcode, p.price, p.cost, p.stock, p.unit, p.category, p.category_id, p.no_stock_count, c.name as category_name, p.created_at
                FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = :id LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $id]);
        $product = $stmt->fetch();
        
        if (!$product) { sendResponse('error', [], 'Product not found'); http_response_code(404); return; }
        
        $product['price'] = floatval($product['price']);
        $product['cost'] = floatval($product['cost']);
        $product['stock'] = intval($product['stock']);
        $product['barcode_status'] = intval($product['barcode_status']);
        $product['no_stock_count'] = ($product['no_stock_count'] > 0);
        
        sendResponse('success', ['products' => [$product], 'total' => 1], 'Success');
    } catch (PDOException $e) {
        logError('getProductById failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

function getProducts() {
    global $pdo;
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $category_id = isset($_GET['category_id']) ? intval($_GET['category_id']) : 0;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    $useCache = empty($search) && $category_id === 0;
    $cacheKey = "products:list:{$limit}:{$offset}";
    
    if ($useCache) {
        $result = cache_get($cacheKey);
        if ($result !== false) {
            sendResponse('success', array_merge($result, ['cached' => true]), 'Success');
            return;
        }
    }
    
    try {
        $where = [];
        $params = [];
        
        if ($search) {
            $where[] = "(p.name ILIKE :search OR p.barcode ILIKE :search2)";
            $params['search'] = "%{$search}%";
            $params['search2'] = "%{$search}%";
        }
        if ($category_id > 0) {
            $where[] = "p.category_id = :category_id";
            $params['category_id'] = $category_id;
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        // OPTIMIZATION: Removed LEFT JOIN categories
        $sql = "SELECT p.id, p.name, p.barcode_status, p.barcode, p.price, p.cost, p.stock, p.unit, p.category, p.category_id, p.no_stock_count, p.created_at
                FROM products p {$whereClause} ORDER BY p.id DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) $stmt->bindValue($key, $value);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        // OPTIMIZATION: Map category_name from cache
        $categoryMap = [];
        $categoriesCache = cache_get('categories:list');
        if ($categoriesCache !== false && isset($categoriesCache['categories'])) {
            foreach ($categoriesCache['categories'] as $cat) {
                $categoryMap[$cat['id']] = $cat['name'];
            }
        }
        
        $products = [];
        while ($row = $stmt->fetch()) {
            $row['price'] = floatval($row['price']);
            $row['cost'] = floatval($row['cost']);
            $row['stock'] = intval($row['stock']);
            $row['barcode_status'] = intval($row['barcode_status']);
            $row['no_stock_count'] = ($row['no_stock_count'] > 0);
            $row['category_name'] = isset($categoryMap[$row['category_id']]) ? $categoryMap[$row['category_id']] : null;
            $products[] = $row;
        }
        
        $countSql = "SELECT COUNT(*) as total FROM products p {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        foreach ($params as $key => $value) $countStmt->bindValue($key, $value);
        $countStmt->execute();
        $total = $countStmt->fetch()['total'];
        
        $result = ['products' => $products, 'total' => (int)$total, 'limit' => $limit, 'offset' => $offset];
        
        if ($useCache) cache_set($cacheKey, $result, 300);
        
        sendResponse('success', array_merge($result, ['cached' => false]), 'Success');
    } catch (PDOException $e) {
        logError('getProducts failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

function createProduct() {
    global $pdo;
    $data = getJSONInput();
    if (!$data) { sendResponse('error', [], 'Invalid JSON data'); http_response_code(400); return; }
    if (empty($data['name']) || empty($data['barcode'])) { sendResponse('error', [], 'Name and barcode are required'); http_response_code(400); return; }
    
    try {
        $checkStmt = $pdo->prepare("SELECT id FROM products WHERE barcode = :barcode");
        $checkStmt->execute(['barcode' => $data['barcode']]);
        if ($checkStmt->fetch()) { sendResponse('error', [], 'Barcode already exists'); http_response_code(400); return; }
        
        $barcode_status = isset($data['barcode_status']) ? intval($data['barcode_status']) : 0;
        $price = convertEmptyToZero($data['price'] ?? 0);
        $cost = convertEmptyToZero($data['cost'] ?? 0);
        $stock = convertEmptyToZero($data['stock'] ?? 0);
        $unit = isset($data['unit']) ? $data['unit'] : '';
        $category = isset($data['category']) ? $data['category'] : '';
        $category_id = !empty($data['category_id']) ? intval($data['category_id']) : null;
        $no_stock_count = isset($data['no_stock_count']) ? convertToBoolean($data['no_stock_count']) : false;
        
        if ($no_stock_count) $stock = 0;
        
        $sql = "INSERT INTO products (name, barcode_status, barcode, price, cost, stock, unit, category, category_id, no_stock_count)
                VALUES (:name, :barcode_status, :barcode, :price, :cost, :stock, :unit, :category, :category_id, :no_stock_count) RETURNING id";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['name' => $data['name'], 'barcode_status' => $barcode_status, 'barcode' => $data['barcode'], 'price' => $price, 'cost' => $cost, 'stock' => (int)$stock, 'unit' => $unit, 'category' => $category, 'category_id' => $category_id, 'no_stock_count' => $no_stock_count ? 1 : 0]);
        
        $newId = $stmt->fetch()['id'];
        $selectStmt = $pdo->prepare("SELECT * FROM products WHERE id = :id");
        $selectStmt->execute(['id' => $newId]);
        $product = $selectStmt->fetch();
        $product['no_stock_count'] = ($product['no_stock_count'] > 0);
        
        clearProductCaches();
        sendResponse('success', $product, 'Product created successfully');
        http_response_code(201);
    } catch (PDOException $e) {
        logError('createProduct failed', ['error' => $e->getMessage(), 'data' => $data]);
        sendResponse('error', [], 'Failed to create product: ' . $e->getMessage());
        http_response_code(500);
    }
}

function updateProduct() {
    global $pdo;
    $data = getJSONInput();
    if (!$data || empty($data['id'])) { sendResponse('error', [], 'Product ID is required'); http_response_code(400); return; }
    
    $id = intval($data['id']);
    try {
        $checkStmt = $pdo->prepare("SELECT id, barcode FROM products WHERE id = :id");
        $checkStmt->execute(['id' => $id]);
        $oldProduct = $checkStmt->fetch();
        if (!$oldProduct) { sendResponse('error', [], 'Product not found'); http_response_code(404); return; }
        
        if (isset($data['barcode']) && $data['barcode'] !== $oldProduct['barcode']) {
            $barcodeCheckStmt = $pdo->prepare("SELECT id FROM products WHERE barcode = :barcode AND id != :id");
            $barcodeCheckStmt->execute(['barcode' => $data['barcode'], 'id' => $id]);
            if ($barcodeCheckStmt->fetch()) { sendResponse('error', [], 'Barcode already exists'); http_response_code(400); return; }
        }
        
        $updates = [];
        $params = ['id' => $id];
        
        if (isset($data['name'])) { $updates[] = "name = :name"; $params['name'] = $data['name']; }
        if (isset($data['barcode_status'])) { $updates[] = "barcode_status = :barcode_status"; $params['barcode_status'] = intval($data['barcode_status']); }
        if (isset($data['barcode'])) { $updates[] = "barcode = :barcode"; $params['barcode'] = $data['barcode']; }
        if (isset($data['price'])) { $updates[] = "price = :price"; $params['price'] = convertEmptyToZero($data['price']); }
        if (isset($data['cost'])) { $updates[] = "cost = :cost"; $params['cost'] = convertEmptyToZero($data['cost']); }
        
        $noStockCount = null;
        if (isset($data['no_stock_count'])) $noStockCount = convertToBoolean($data['no_stock_count']);
        
        if (isset($data['stock'])) {
            if ($noStockCount === true) $updates[] = "stock = 0";
            else { $updates[] = "stock = :stock"; $params['stock'] = intval(convertEmptyToZero($data['stock'])); }
        } elseif ($noStockCount === true) { $updates[] = "stock = 0"; }
        
        if (isset($data['unit'])) { $updates[] = "unit = :unit"; $params['unit'] = $data['unit']; }
        if (isset($data['category'])) { $updates[] = "category = :category"; $params['category'] = $data['category']; }
        if (isset($data['category_id'])) { $updates[] = "category_id = :category_id"; $params['category_id'] = !empty($data['category_id']) ? intval($data['category_id']) : null; }
        if ($noStockCount !== null) { $updates[] = "no_stock_count = :no_stock_count"; $params['no_stock_count'] = $noStockCount ? 1 : 0; }
        
        if (empty($updates)) { sendResponse('error', [], 'No data to update'); http_response_code(400); return; }
        
        $sql = "UPDATE products SET " . implode(', ', $updates) . " WHERE id = :id";
        $pdo->prepare($sql)->execute($params);
        
        $selectStmt = $pdo->prepare("SELECT * FROM products WHERE id = :id");
        $selectStmt->execute(['id' => $id]);
        $product = $selectStmt->fetch();
        $product['no_stock_count'] = ($product['no_stock_count'] > 0);
        
        clearProductCaches();
        sendResponse('success', $product, 'Product updated successfully');
    } catch (PDOException $e) {
        logError('updateProduct failed', ['error' => $e->getMessage(), 'data' => $data]);
        sendResponse('error', [], 'Failed to update product: ' . $e->getMessage());
        http_response_code(500);
    }
}

function deleteProduct() {
    global $pdo;
    $data = getJSONInput();
    $id = isset($data['id']) ? intval($data['id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);
    
    if ($id <= 0) { sendResponse('error', [], 'Product ID is required'); http_response_code(400); return; }
    
    try {
        $checkStmt = $pdo->prepare("SELECT id, name FROM products WHERE id = :id");
        $checkStmt->execute(['id' => $id]);
        $product = $checkStmt->fetch();
        if (!$product) { sendResponse('error', [], 'Product not found'); http_response_code(404); return; }
        
        $pdo->prepare("DELETE FROM products WHERE id = :id")->execute(['id' => $id]);
        clearProductCaches();
        sendResponse('success', ['id' => $id, 'name' => $product['name']], 'Product deleted successfully');
    } catch (PDOException $e) {
        logError('deleteProduct failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Failed to delete product: ' . $e->getMessage());
        http_response_code(500);
    }
}

function clearProductCaches() {
    cache_delete('products:list:100:0');
    for ($limit = 10; $limit <= 50; $limit += 10) {
        for ($days = 7; $days <= 90; $days += 7) {
            cache_delete("products:top_selling:{$limit}:{$days}");
        }
    }
    $cacheDir = CACHE_DIR;
    if (is_dir($cacheDir)) {
        $files = glob($cacheDir . 'products*.cache');
        if ($files) {
            foreach ($files as $file) { if (is_file($file)) unlink($file); }
        }
    }
}
?>