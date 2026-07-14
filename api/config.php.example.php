<?php
/**
 * Configuration Template
 * Copy เป็น config.php แล้วแก้ไขค่าให้ถูกต้อง
 */

// Database
$pg_host = 'your-host.neon.tech';
$pg_port = '5432';
$pg_dbname = 'neondb';
$pg_user = 'neondb_owner';
$pg_password = 'your-password-here';

// Application
$app_env = 'development';
$debug = true;

// API
$rate_limit = 100;
$cors_origins = ['http://localhost'];
?>