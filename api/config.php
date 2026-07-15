<?php
/**
* My Retail - Database Configuration (PostgreSQL - Neon.tech)
* Version: 2.2 (Added cache system + Neon.tech SNI support)
*/

// ================================================================================
// LOAD ENVIRONMENT VARIABLES FROM .env (FOR LOCAL DEVELOPMENT)
// ================================================================================

function loadEnvFile() {
    $envFile = __DIR__ . '/../.env';
    
    if (!file_exists($envFile)) {
        return;
    }
    
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            if (preg_match('/^(["\'])(.*)\1$/', $value, $matches)) {
                $value = $matches[2];
            }
            
            if (getenv($key) === false) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}

loadEnvFile();

// ================================================================================
// Database Configuration (PostgreSQL - Neon.tech)
// ================================================================================

$pg_host = getenv('PGHOST');
$pg_port = getenv('PGPORT') ?: '5432';
$pg_dbname = getenv('PGDATABASE');
$pg_user = getenv('PGUSER');
$pg_password = getenv('PGPASSWORD');

if (empty($pg_host) || empty($pg_dbname) || empty($pg_user) || empty($pg_password)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'Database configuration error: Missing environment variables',
        'error' => (getenv('APP_ENV') !== 'production')
            ? 'Required: PGHOST, PGDATABASE, PGUSER, PGPASSWORD'
            : null,
        'data' => []
    ], JSON_UNESCAPED_UNICODE));
    exit;
}

// ================================================================================
// NEON.TECH SNI SUPPORT
// ================================================================================

$endpoint_id = explode('.', $pg_host)[0];
$dsn = "pgsql:host={$pg_host};port={$pg_port};dbname={$pg_dbname};sslmode=require;options=endpoint={$endpoint_id}";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

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

// ================================================================================
// Cache System (File-based)
// ================================================================================

define('CACHE_DIR', __DIR__ . '/cache/');
define('CACHE_ENABLED', getenv('CACHE_ENABLED') === 'true');
define('CACHE_TTL', (int)(getenv('CACHE_TTL') ?: 3600));

if (CACHE_ENABLED && !is_dir(CACHE_DIR)) {
    mkdir(CACHE_DIR, 0755, true);
}

function cache_get($key, $ttl = CACHE_TTL) {
    if (!CACHE_ENABLED) {
        return false;
    }
    
    $cacheFile = CACHE_DIR . md5($key) . '.cache';
    
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $ttl) {
        $content = file_get_contents($cacheFile);
        return json_decode($content, true);
    }
    
    return false;
}

function cache_set($key, $data, $ttl = CACHE_TTL) {
    if (!CACHE_ENABLED) {
        return false;
    }
    
    $cacheFile = CACHE_DIR . md5($key) . '.cache';
    return file_put_contents($cacheFile, json_encode($data, JSON_UNESCAPED_UNICODE)) !== false;
}

function cache_delete($key) {
    if (!CACHE_ENABLED) {
        return false;
    }
    
    $cacheFile = CACHE_DIR . md5($key) . '.cache';
    if (file_exists($cacheFile)) {
        return unlink($cacheFile);
    }
    return true;
}

function cache_clear() {
    if (!CACHE_ENABLED || !is_dir(CACHE_DIR)) {
        return 0;
    }
    
    $files = glob(CACHE_DIR . '*.cache');
    $count = 0;
    foreach ($files as $file) {
        if (unlink($file)) {
            $count++;
        }
    }
    return $count;
}

// ================================================================================
// Helper Functions
// ================================================================================

function sendResponse($status, $messageOrData = [], $dataOrMessage = '', $httpCode = null) {
    if (is_bool($status)) {
        $successBool = $status;
        $statusStr = $status ? 'success' : 'error';
        $message = is_string($messageOrData) ? $messageOrData : '';
        $data = is_array($dataOrMessage) ? $dataOrMessage : [];
    } else {
        $statusStr = $status;
        $successBool = ($status === 'success');
        $data = is_array($messageOrData) ? $messageOrData : [];
        $message = is_string($dataOrMessage) ? $dataOrMessage : '';
    }
    
    if ($httpCode !== null) {
        http_response_code($httpCode);
    } else {
        http_response_code($successBool ? 200 : 400);
    }
    
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => $successBool,
        'status' => $statusStr,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function getJSONInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function logError($message, $context = []) {
    error_log('[MyRetail] ' . $message . ' ' . json_encode($context));
}

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

function db_begin_transaction() {
    global $pdo;
    return $pdo->beginTransaction();
}

function db_commit() {
    global $pdo;
    return $pdo->commit();
}

function db_rollback() {
    global $pdo;
    return $pdo->rollBack();
}

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