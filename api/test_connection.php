<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

try {
    $version = $pdo->query("SELECT version()")->fetch();
    $tables = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")->fetchAll();
    
    echo json_encode([
        'status' => 'success',
        'postgresql_version' => $version['version'],
        'tables' => array_column($tables, 'table_name'),
        'table_count' => count($tables)
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>