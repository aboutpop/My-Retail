<?php
/**
* Cache Manager API
* Endpoint: /api/cache_manager.php
* Version: 1.1 (Fixed: Support GET for clear action)
*
* Methods:
* - GET ?action=stats: ดูสถิติ cache
* - GET ?action=clear: ล้าง cache ทั้งหมด (เพิ่มใน v1.1)
* - GET ?action=clear&key={key}: ล้าง cache เฉพาะ key (เพิ่มใน v1.1)
* - POST ?action=clear: ล้าง cache ทั้งหมด
* - POST ?action=clear&key={key}: ล้าง cache เฉพาะ key
*/

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'stats';

try {
    switch ($method) {
        case 'GET':
            if ($action === 'stats') {
                getCacheStats();
            } elseif ($action === 'clear') {
                clearCache();
            } else {
                sendResponse('error', [], 'Invalid action. Use: stats or clear');
                http_response_code(400);
            }
            break;
            
        case 'POST':
            if ($action === 'clear') {
                clearCache();
            } else {
                sendResponse('error', [], 'Invalid action. Use: clear');
                http_response_code(400);
            }
            break;
            
        default:
            sendResponse('error', [], 'Method not allowed');
            http_response_code(405);
    }
} catch (Exception $e) {
    logError('Cache Manager error', ['error' => $e->getMessage()]);
    sendResponse('error', [], $e->getMessage());
    http_response_code(500);
}

/**
* GET: ดูสถิติ cache
*/
function getCacheStats() {
    if (!CACHE_ENABLED) {
        sendResponse('success', [
            'enabled' => false,
            'message' => 'Cache system is disabled'
        ], 'Success');
        return;
    }
    
    $cacheDir = CACHE_DIR;
    
    if (!is_dir($cacheDir)) {
        sendResponse('success', [
            'enabled' => true,
            'cache_dir' => $cacheDir,
            'total_files' => 0,
            'total_size' => 0,
            'total_size_human' => '0 B',
            'files' => []
        ], 'Success');
        return;
    }
    
    $files = glob($cacheDir . '*.cache');
    $totalSize = 0;
    $fileDetails = [];
    
    foreach ($files as $file) {
        $size = filesize($file);
        $totalSize += $size;
        
        $fileDetails[] = [
            'name' => basename($file),
            'size' => $size,
            'size_human' => formatBytes($size),
            'modified' => date('Y-m-d H:i:s', filemtime($file)),
            'age_seconds' => time() - filemtime($file)
        ];
    }
    
    sendResponse('success', [
        'enabled' => true,
        'cache_dir' => $cacheDir,
        'total_files' => count($files),
        'total_size' => $totalSize,
        'total_size_human' => formatBytes($totalSize),
        'files' => $fileDetails
    ], 'Success');
}

/**
* GET/POST: ล้าง cache
*/
function clearCache() {
    if (!CACHE_ENABLED) {
        sendResponse('error', [], 'Cache system is disabled');
        http_response_code(400);
        return;
    }
    
    $key = $_GET['key'] ?? null;
    
    if ($key) {
        // Clear specific key
        $deleted = cache_delete($key);
        
        sendResponse('success', [
            'key' => $key,
            'deleted' => $deleted
        ], $deleted ? 'Cache cleared for key' : 'Cache key not found');
    } else {
        // Clear all cache
        $count = cache_clear();
        
        sendResponse('success', [
            'cleared_files' => $count
        ], "Cleared {$count} cache files");
    }
}

/**
* Helper: Format bytes to human readable
*/
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}
?>