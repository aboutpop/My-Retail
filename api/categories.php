<?php
/**
 * Categories API - จัดการหมวดหมู่สินค้า (CRUD + Reorder)
 * Endpoint: /api/categories.php
 * Version: 1.5 (PostgreSQL + sort_order)
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'GET':
        getCategories();
        break;
    case 'POST':
        if ($action === 'reorder') {
            reorderCategories();
        } else {
            createCategory();
        }
        break;
    case 'PUT':
        updateCategory();
        break;
    case 'DELETE':
        deleteCategory();
        break;
    default:
        sendResponse('error', [], 'Method not allowed');
        http_response_code(405);
}

/**
 * GET: ดึงรายการหมวดหมู่ (เรียงตาม sort_order)
 */
function getCategories() {
    global $pdo;
    
    $includeCount = isset($_GET['include_count']) && $_GET['include_count'] === 'true';
    
    try {
        if ($includeCount) {
            $sql = "SELECT 
                        c.id,
                        c.name,
                        c.description,
                        c.sort_order,
                        c.created_at,
                        COUNT(p.id) as product_count
                    FROM categories c
                    LEFT JOIN products p ON c.id = p.category_id
                    GROUP BY c.id, c.name, c.description, c.sort_order, c.created_at
                    ORDER BY c.sort_order ASC, c.id ASC";
        } else {
            $sql = "SELECT * FROM categories ORDER BY sort_order ASC, id ASC";
        }
        
        $stmt = $pdo->query($sql);
        $categories = $stmt->fetchAll();
        
        if ($includeCount) {
            foreach ($categories as &$category) {
                $category['product_count'] = intval($category['product_count']);
                $category['sort_order'] = intval($category['sort_order']);
            }
        } else {
            foreach ($categories as &$category) {
                $category['sort_order'] = intval($category['sort_order']);
            }
        }
        
        sendResponse('success', [
            'categories' => $categories,
            'total' => count($categories)
        ], 'Success');
        
    } catch (PDOException $e) {
        logError('getCategories failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Query failed: ' . $e->getMessage());
        http_response_code(500);
    }
}

/**
 * POST: เพิ่มหมวดหมู่ใหม่
 */
function createCategory() {
    global $pdo;
    
    $data = getJSONInput();
    
    if (!$data) {
        sendResponse('error', [], 'Invalid JSON data');
        http_response_code(400);
        return;
    }
    
    if (empty($data['name'])) {
        sendResponse('error', [], 'Category name is required');
        http_response_code(400);
        return;
    }
    
    try {
        // ตรวจสอบว่าชื่อซ้ำหรือไม่
        $checkSql = "SELECT id FROM categories WHERE name = :name";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute(['name' => $data['name']]);
        
        if ($checkStmt->fetch()) {
            sendResponse('error', [], 'Category name already exists');
            http_response_code(400);
            return;
        }
        
        // 🆕 หา sort_order สุดท้าย (ถ้าไม่ได้ส่งมา)
        $sortOrder = isset($data['sort_order']) ? intval($data['sort_order']) : null;
        
        if ($sortOrder === null) {
            $maxSql = "SELECT COALESCE(MAX(sort_order), 0) as max_order FROM categories";
            $maxStmt = $pdo->query($maxSql);
            $maxRow = $maxStmt->fetch();
            $sortOrder = intval($maxRow['max_order']) + 1;
        }
        
        // เพิ่มหมวดหมู่ใหม่
        $sql = "INSERT INTO categories (name, description, sort_order) 
                VALUES (:name, :description, :sort_order) 
                RETURNING id";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'name' => $data['name'],
            'description' => $data['description'] ?? '',
            'sort_order' => $sortOrder
        ]);
        
        $result = $stmt->fetch();
        $newId = $result['id'];
        
        // ดึงข้อมูลที่เพิ่งสร้าง
        $selectStmt = $pdo->prepare("SELECT * FROM categories WHERE id = :id");
        $selectStmt->execute(['id' => $newId]);
        $category = $selectStmt->fetch();
        $category['sort_order'] = intval($category['sort_order']);
        
        sendResponse('success', $category, 'Category created successfully');
        http_response_code(201);
        
    } catch (PDOException $e) {
        logError('createCategory failed', ['error' => $e->getMessage(), 'data' => $data]);
        sendResponse('error', [], 'Failed to create category: ' . $e->getMessage());
        http_response_code(500);
    }
}

/**
 * PUT: แก้ไขหมวดหมู่
 */
function updateCategory() {
    global $pdo;
    
    $data = getJSONInput();
    
    if (!$data) {
        sendResponse('error', [], 'Invalid JSON data');
        http_response_code(400);
        return;
    }
    
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['id']) ? intval($data['id']) : 0);
    
    if ($id <= 0) {
        sendResponse('error', [], 'Category ID is required');
        http_response_code(400);
        return;
    }
    
    try {
        // ตรวจสอบว่ามีหมวดหมู่นี้หรือไม่
        $checkStmt = $pdo->prepare("SELECT id, name FROM categories WHERE id = :id");
        $checkStmt->execute(['id' => $id]);
        $oldCategory = $checkStmt->fetch();
        
        if (!$oldCategory) {
            sendResponse('error', [], 'Category not found');
            http_response_code(404);
            return;
        }
        
        $updates = [];
        $params = ['id' => $id];
        
        if (isset($data['name'])) {
            // ตรวจสอบว่าชื่อซ้ำหรือไม่
            $nameCheckStmt = $pdo->prepare("SELECT id FROM categories WHERE name = :name AND id != :id");
            $nameCheckStmt->execute(['name' => $data['name'], 'id' => $id]);
            
            if ($nameCheckStmt->fetch()) {
                sendResponse('error', [], 'Category name already exists');
                http_response_code(400);
                return;
            }
            
            $updates[] = "name = :name";
            $params['name'] = $data['name'];
        }
        
        if (isset($data['description'])) {
            $updates[] = "description = :description";
            $params['description'] = $data['description'];
        }
        
        // 🆕 อัปเดต sort_order
        if (isset($data['sort_order'])) {
            $updates[] = "sort_order = :sort_order";
            $params['sort_order'] = intval($data['sort_order']);
        }
        
        if (empty($updates)) {
            sendResponse('error', [], 'No data to update');
            http_response_code(400);
            return;
        }
        
        $sql = "UPDATE categories SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // ดึงข้อมูลที่อัปเดตแล้ว
        $selectStmt = $pdo->prepare("SELECT * FROM categories WHERE id = :id");
        $selectStmt->execute(['id' => $id]);
        $category = $selectStmt->fetch();
        $category['sort_order'] = intval($category['sort_order']);
        
        sendResponse('success', $category, 'Category updated successfully');
        
    } catch (PDOException $e) {
        logError('updateCategory failed', ['error' => $e->getMessage(), 'data' => $data]);
        sendResponse('error', [], 'Failed to update category: ' . $e->getMessage());
        http_response_code(500);
    }
}

/**
 * DELETE: ลบหมวดหมู่
 */
function deleteCategory() {
    global $pdo;
    
    $data = getJSONInput();
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['id']) ? intval($data['id']) : 0);
    
    if ($id <= 0) {
        sendResponse('error', [], 'Category ID is required');
        http_response_code(400);
        return;
    }
    
    try {
        $checkStmt = $pdo->prepare("SELECT id, name FROM categories WHERE id = :id");
        $checkStmt->execute(['id' => $id]);
        $category = $checkStmt->fetch();
        
        if (!$category) {
            sendResponse('error', [], 'Category not found');
            http_response_code(404);
            return;
        }
        
        // ตรวจสอบว่ามีสินค้าในหมวดหมู่หรือไม่
        $productCheckStmt = $pdo->prepare("SELECT COUNT(*) as count FROM products WHERE category_id = :id");
        $productCheckStmt->execute(['id' => $id]);
        $productCount = $productCheckStmt->fetch()['count'];
        
        if ($productCount > 0) {
            sendResponse('error', [], "Cannot delete: There are {$productCount} products in this category");
            http_response_code(400);
            return;
        }
        
        $deleteStmt = $pdo->prepare("DELETE FROM categories WHERE id = :id");
        $deleteStmt->execute(['id' => $id]);
        
        sendResponse('success', [
            'id' => $id,
            'name' => $category['name']
        ], 'Category deleted successfully');
        
    } catch (PDOException $e) {
        logError('deleteCategory failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Failed to delete category: ' . $e->getMessage());
        http_response_code(500);
    }
}

/**
 * 🆕 POST: สลับลำดับหมวดหมู่
 * 
 * Request body:
 * {
 *   "id1": 8,
 *   "id2": 9
 * }
 * 
 * จะสลับ sort_order ของ id1 กับ id2
 */
function reorderCategories() {
    global $pdo;
    
    $data = getJSONInput();
    
    if (!isset($data['id1']) || !isset($data['id2'])) {
        sendResponse('error', [], 'id1 and id2 are required');
        http_response_code(400);
        return;
    }
    
    $id1 = intval($data['id1']);
    $id2 = intval($data['id2']);
    
    if ($id1 <= 0 || $id2 <= 0 || $id1 === $id2) {
        sendResponse('error', [], 'Invalid IDs');
        http_response_code(400);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // ดึง sort_order ของทั้ง 2 รายการ
        $stmt = $pdo->prepare("SELECT id, sort_order FROM categories WHERE id IN (:id1, :id2)");
        $stmt->execute(['id1' => $id1, 'id2' => $id2]);
        $rows = $stmt->fetchAll();
        
        if (count($rows) !== 2) {
            throw new Exception('One or both categories not found');
        }
        
        $sort1 = null;
        $sort2 = null;
        
        foreach ($rows as $row) {
            if ($row['id'] == $id1) {
                $sort1 = intval($row['sort_order']);
            } else {
                $sort2 = intval($row['sort_order']);
            }
        }
        
        // สลับ sort_order
        $update1 = $pdo->prepare("UPDATE categories SET sort_order = :sort WHERE id = :id");
        $update1->execute(['sort' => $sort2, 'id' => $id1]);
        
        $update2 = $pdo->prepare("UPDATE categories SET sort_order = :sort WHERE id = :id");
        $update2->execute(['sort' => $sort1, 'id' => $id2]);
        
        $pdo->commit();
        
        sendResponse('success', [
            'id1' => $id1,
            'sort_order1' => $sort2,
            'id2' => $id2,
            'sort_order2' => $sort1
        ], 'Categories reordered successfully');
        
    } catch (Exception $e) {
        $pdo->rollBack();
        logError('reorderCategories failed', ['error' => $e->getMessage()]);
        sendResponse('error', [], 'Failed to reorder: ' . $e->getMessage());
        http_response_code(500);
    }
}
?>