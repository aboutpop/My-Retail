<?php
/**
 * My Retail - Database Configuration (PostgreSQL - Neon.tech)
 * Version: 2.0 (SECURITY FIX - No hardcoded credentials)
 *
 * ⚠️ SECURITY NOTE:
 * - ไม่มีการ hardcode credentials ในไฟล์นี้
 * - ใช้ environment variables เท่านั้น
 * - ตั้งค่า variables ใน Railway Dashboard
 */

// ============================================================
// Database Configuration (PostgreSQL - Neon.tech)
// ============================================================

// ดึงค่าจาก environment variables เท่านั้น
$pg_host = getenv('PGHOST');
$pg_port = getenv('PGPORT') ?: '5432';
$pg_dbname = getenv('PGDATABASE');
$pg_user = getenv('PGUSER');
$pg_password = getenv('PGPASSWORD');

// ตรวจสอบว่ามีค่าที่จำเป็นครบหรือไม่
if (empty($pg_host) || empty($pg_dbname) || empty($pg_user) || empty($pg_password)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'Database configuration error: Missing environment variables',
        'error' => (getenv('APP_ENV') !== 'production') 
            ? 'Required: PGHOST, PGDATABASE, PGUSER, PGPASSWORD. Got: HOST=' . ($pg_host ?: 'null') . ', DB=' . ($pg_dbname ?: 'null') . ', USER=' . ($pg_user ?: 'null')
            : null,
        'data' => []
    ], JSON_UNESCAPED_UNICODE));
    exit;
}

// สร้าง DSN สำหรับ PostgreSQL PDO
$dsn = "pgsql:host={$pg_host};port={$pg_port};dbname={$pg_dbname};sslmode=require";

// Options สำหรับ PDO
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

// เชื่อมต่อ PostgreSQL
try {
    $pdo = new PDO($dsn, $pg_user, $pg_password, $options);
    $pdo->exec("SET timezone = 'Asia/Bangkok'");
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'Database connection failed',
        'error' => (getenv('APP_ENV') !== 'production') ? $e->getMessage() : null,
        'data' => []
    ], JSON_UNESCAPED_UNICODE));
    exit;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * ส่ง JSON response (backward compatible กับ frontend เดิม)
 */
function sendResponse($status, $messageOrData = [], $dataOrMessage = '', $httpCode = null) {
    // ตรวจสอบรูปแบบการเรียก
    if (is_bool($status)) {
        // แบบเก่า: sendResponse(true/false, 'message', $data)
        $successBool = $status;
        $statusStr = $status ? 'success' : 'error';
        $message = is_string($messageOrData) ? $messageOrData : '';
        $data = is_array($dataOrMessage) ? $dataOrMessage : [];
    } else {
        // แบบใหม่: sendResponse('success'/'error', $data, 'message')
        $statusStr = $status;
        $successBool = ($status === 'success');
        $data = is_array($messageOrData) ? $messageOrData : [];
        $message = is_string($dataOrMessage) ? $dataOrMessage : '';
    }
    
    // ตั้ง HTTP status code
    if ($httpCode !== null) {
        http_response_code($httpCode);
    } else {
        http_response_code($successBool ? 200 : 400);
    }
    
    // ส่ง response ที่มีทั้ง success (boolean) และ status (string)
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => $successBool,
        'status' => $statusStr,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * รับ JSON input จาก request body
 */
function getJSONInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

/**
 * Log error
 */
function logError($message, $context = []) {
    error_log('[MyRetail] ' . $message . ' ' . json_encode($context));
}

/**
 * ดึงข้อมูลแถวเดียว
 */
function db_query_one($sql, $params = []) {
    global $pdo;
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    } catch (PDOException $e) {
        logError("Query Error: " . $e->getMessage(), ['sql' => $sql]);
        return false;
    }
}

/**
 * ดึงข้อมูลหลายแถว
 */
function db_query($sql, $params = []) {
    global $pdo;
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        logError("Query Error: " . $e->getMessage(), ['sql' => $sql]);
        return false;
    }
}

/**
 * Execute query (INSERT/UPDATE/DELETE)
 */
function db_execute($sql, $params = []) {
    global $pdo;
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    } catch (PDOException $e) {
        logError("Execute Error: " . $e->getMessage(), ['sql' => $sql]);
        return false;
    }
}

/**
 * Insert และคืนค่า ID (PostgreSQL ใช้ RETURNING)
 */
function db_insert($sql, $params = []) {
    global $pdo;
    try {
        if (stripos($sql, 'RETURNING') === false) {
            $sql .= ' RETURNING id';
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ? $result['id'] : false;
    } catch (PDOException $e) {
        logError("Insert Error: " . $e->getMessage(), ['sql' => $sql]);
        return false;
    }
}

/**
 * เริ่ม transaction
 */
function db_begin_transaction() {
    global $pdo;
    return $pdo->beginTransaction();
}

/**
 * Commit transaction
 */
function db_commit() {
    global $pdo;
    return $pdo->commit();
}

/**
 * Rollback transaction
 */
function db_rollback() {
    global $pdo;
    return $pdo->rollBack();
}

/**
 * ตรวจสอบการเชื่อมต่อ (สำหรับ debug)
 */
function db_ping() {
    global $pdo;
    try {
        $pdo->query("SELECT 1");
        return true;
    } catch (PDOException $e) {
        return false;
    }
}
?>