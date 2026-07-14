# My Retail - AI Developer Skills & Guidelines

## 🎯 Project Overview

**System:** ระบบจัดการสินค้าคงคลังสำหรับร้านค้า (Inventory Management System)
**Stack:** PHP 8.x + PostgreSQL (Neon.tech) + Vanilla JavaScript + Bootstrap 5
**Location:** E:\xampp\htdocs\myproject\My-Retail
**Production:** https://my-retail-production.up.railway.app/
**Repository:** https://github.com/aboutpop/My-Retail.git

---

## 📚 Core Skills Required

### 1. Backend Development (PHP 8.x)

#### Essential Skills
- **PHP 8.x Syntax**: Type hints, nullable types, named arguments, match expressions
- **PDO (PHP Data Objects)**: Prepared statements, transactions, error handling
- **RESTful API Design**: HTTP methods, status codes, JSON responses
- **Error Handling**: Try-catch blocks, custom exceptions, logging
- **Security**: Input validation, SQL injection prevention, XSS protection

#### Code Standards
```php
// ✅ DO: Use type hints
function createProduct(string $name, float $price): int {
    // ...
}

// ❌ DON'T: Omit type hints
function createProduct($name, $price) {
    // ...
}

// ✅ DO: Use prepared statements
$stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id");
$stmt->execute(['id' => $id]);

// ❌ DON'T: Concatenate SQL
$stmt = $pdo->query("SELECT * FROM products WHERE id = " . $id);

// ✅ DO: Handle errors properly
try {
    // ... code ...
} catch (PDOException $e) {
    logError('Operation failed', ['error' => $e->getMessage()]);
    sendResponse('error', [], 'Database error');
    http_response_code(500);
}

// ❌ DON'T: Ignore errors
$result = $pdo->query("SELECT * FROM products");
```

#### Required Functions
```php
// Must implement in every API file
function getJSONInput(): array {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function sendResponse(string $status, $data, string $message = ''): void {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => $status,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function logError(string $context, array $data = []): void {
    $logFile = __DIR__ . '/logs/error.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] {$context}: " . json_encode($data) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}
```

---

### 2. Database Management (PostgreSQL)

#### Essential Skills
- **PostgreSQL Syntax**: NOT MySQL (critical difference!)
- **Schema Design**: Tables, indexes, constraints, foreign keys
- **Query Optimization**: EXPLAIN ANALYZE, indexes, joins
- **Transactions**: BEGIN, COMMIT, ROLLBACK
- **Data Types**: SERIAL, NUMERIC, JSONB, TIMESTAMP

#### Schema Conventions
```sql
-- ✅ DO: Use PostgreSQL syntax
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ❌ DON'T: Use MySQL syntax
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- WRONG!
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()  -- WRONG!
);

-- ✅ DO: Create indexes for frequently queried columns
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category_id ON products(category_id);

-- ✅ DO: Use triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### Important Notes
- **Settings table**: Uses `key` and `value` columns (NOT `setting_key` and `setting_value`)
- **no_stock_count**: INTEGER type (0 = count stock, >0 = don't count)
- **updated_at**: Must use trigger function (no ON UPDATE CURRENT_TIMESTAMP)
- **JSONB**: Use for complex nested data (e.g., held_bills.items)

---

### 3. Frontend Development (JavaScript + Bootstrap 5)

#### Essential Skills
- **Vanilla JavaScript**: ES6+, async/await, fetch API, DOM manipulation
- **Bootstrap 5**: Grid system, components, utilities
- **AJAX**: Fetch API, error handling, loading states
- **Event Handling**: Event delegation, custom events
- **Form Validation**: Client-side validation, error messages

#### Code Standards
```javascript
// ✅ DO: Use async/await
async function loadProducts() {
    try {
        const response = await fetch('/api/products.php');
        const data = await response.json();
        
        if (data.status === 'success') {
            renderProducts(data.data.products);
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        showError('Cannot load products');
    }
}

// ❌ DON'T: Use callbacks
function loadProducts(callback) {
    fetch('/api/products.php')
        .then(response => response.json())
        .then(data => callback(data))
        .catch(error => console.error(error));
}

// ✅ DO: Handle loading states
async function saveProduct(product) {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    
    try {
        const response = await fetch('/api/products.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccess('Product saved');
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Failed to save product');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save';
    }
}

// ✅ DO: Use event delegation
document.getElementById('product-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-edit')) {
        const productId = e.target.dataset.id;
        editProduct(productId);
    }
});

// ❌ DON'T: Add event listeners to each element
document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
        editProduct(btn.dataset.id);
    });
});
```

---

### 4. API Development

#### RESTful Conventions
```
GET    /api/products.php          - List products
GET    /api/products.php?id=1     - Get single product
POST   /api/products.php          - Create product
PUT    /api/products.php          - Update product
DELETE /api/products.php?id=1     - Delete product
```

#### Response Format
```json
// ✅ DO: Consistent response format
{
    "status": "success",
    "message": "Product created successfully",
    "data": {
        "id": 1,
        "name": "Product Name",
        "price": 100.00
    }
}

// Error response
{
    "status": "error",
    "message": "Product not found",
    "data": []
}

// ❌ DON'T: Inconsistent formats
{
    "success": true,
    "product": { ... }
}
```

#### HTTP Status Codes
```php
// ✅ DO: Use appropriate status codes
http_response_code(200);  // OK
http_response_code(201);  // Created
http_response_code(400);  // Bad Request
http_response_code(401);  // Unauthorized
http_response_code(404);  // Not Found
http_response_code(500);  // Internal Server Error
```

---

### 5. Security Best Practices

#### Input Validation
```php
// ✅ DO: Validate all inputs
function validateProduct($data) {
    $errors = [];
    
    if (empty($data['name'])) {
        $errors[] = 'Name is required';
    }
    
    if (empty($data['barcode'])) {
        $errors[] = 'Barcode is required';
    }
    
    if (isset($data['price']) && !is_numeric($data['price'])) {
        $errors[] = 'Price must be numeric';
    }
    
    if (isset($data['price']) && $data['price'] < 0) {
        $errors[] = 'Price cannot be negative';
    }
    
    return $errors;
}

// ✅ DO: Sanitize inputs
$name = htmlspecialchars($data['name'], ENT_QUOTES, 'UTF-8');
$barcode = preg_replace('/[^a-zA-Z0-9]/', '', $data['barcode']);

// ❌ DON'T: Trust user input
$name = $data['name'];  // DANGEROUS!
```

#### SQL Injection Prevention
```php
// ✅ DO: Use prepared statements
$stmt = $pdo->prepare("SELECT * FROM products WHERE barcode = :barcode");
$stmt->execute(['barcode' => $barcode]);

// ❌ DON'T: Concatenate SQL
$query = "SELECT * FROM products WHERE barcode = '" . $barcode . "'";
$result = $pdo->query($query);  // DANGEROUS!
```

#### XSS Prevention
```php
// ✅ DO: Escape output
echo htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8');

// ✅ DO: Use textContent in JavaScript
element.textContent = product.name;

// ❌ DON'T: Use innerHTML with user data
element.innerHTML = product.name;  // DANGEROUS!
```

---

### 6. Performance Optimization

#### Database Optimization
```php
// ✅ DO: Use indexes
CREATE INDEX idx_products_barcode ON products(barcode);

// ✅ DO: Limit result sets
$sql = "SELECT * FROM products LIMIT :limit OFFSET :offset";

// ✅ DO: Use caching for frequently accessed data
function getSettings() {
    global $pdo, $redis;
    
    $cacheKey = 'settings:all';
    $cached = $redis->get($cacheKey);
    
    if ($cached) {
        return json_decode($cached, true);
    }
    
    $stmt = $pdo->query("SELECT key, value FROM settings");
    $settings = [];
    while ($row = $stmt->fetch()) {
        $settings[$row['key']] = $row['value'];
    }
    
    $redis->setex($cacheKey, 3600, json_encode($settings));
    return $settings;
}

// ❌ DON'T: Query without limits
$sql = "SELECT * FROM products";  // DANGEROUS for large datasets!
```

#### Query Optimization
```php
// ✅ DO: Select only needed columns
$sql = "SELECT id, name, price FROM products";

// ❌ DON'T: Use SELECT *
$sql = "SELECT * FROM products";  // Wastes memory!

// ✅ DO: Use JOINs efficiently
$sql = "SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.is_active = TRUE";

// ❌ DON'T: Query in loops
foreach ($products as $product) {
    $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
    $stmt->execute([$product['category_id']]);  // SLOW!
    $category = $stmt->fetch();
}

// ✅ DO: Batch queries
$categoryIds = array_column($products, 'category_id');
$placeholders = str_repeat('?,', count($categoryIds) - 1) . '?';
$stmt = $pdo->prepare("SELECT * FROM categories WHERE id IN ($placeholders)");
$stmt->execute($categoryIds);
$categories = $stmt->fetchAll(PDO::FETCH_GROUP | PDO::FETCH_UNIQUE);
```

---

### 7. Testing & Debugging

#### Manual Testing Checklist
```markdown
## API Testing
- [ ] Test all endpoints with valid data
- [ ] Test with missing required fields
- [ ] Test with invalid data types
- [ ] Test with special characters
- [ ] Test with empty strings
- [ ] Test with null values
- [ ] Test with very long strings
- [ ] Test with negative numbers
- [ ] Test with zero values

## Database Testing
- [ ] Verify data is saved correctly
- [ ] Verify foreign key constraints
- [ ] Verify unique constraints
- [ ] Verify indexes are used (EXPLAIN ANALYZE)
- [ ] Verify transactions work correctly

## Frontend Testing
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on different screen sizes (mobile, tablet, desktop)
- [ ] Test with slow network (throttling)
- [ ] Test with JavaScript disabled
- [ ] Test accessibility (keyboard navigation, screen reader)
```

#### Debugging Tools
```php
// ✅ DO: Use error logging
function logDebug($message, $data = []) {
    $logFile = __DIR__ . '/logs/debug.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] {$message}: " . json_encode($data) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

// Usage
logDebug('Processing sale', ['items' => $items, 'total' => $total]);

// ✅ DO: Use PostgreSQL query analysis
EXPLAIN ANALYZE SELECT * FROM products WHERE barcode = '123456';

// ✅ DO: Use browser developer tools
// - Console: Check JavaScript errors
// - Network: Check API requests/responses
// - Elements: Inspect DOM
// - Performance: Analyze page load
```

---

### 8. Git Workflow

#### Commit Message Convention
```
<type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code style (formatting, etc.)
- refactor: Code refactoring
- perf: Performance improvement
- test: Adding tests
- chore: Maintenance tasks

Examples:
feat: Add barcode scanner support
fix: Correct settings API column names
docs: Update README with deployment guide
perf: Add database indexes for products table
```

#### Branch Strategy
```bash
# Main branch (production)
main

# Feature branches
feature/barcode-scanner
feature/receipt-printer

# Bug fix branches
fix/settings-api-error
fix/stock-calculation

# Release branches
release/v1.0.0
```

#### Workflow Steps
```bash
# 1. Always fetch before starting
git fetch origin

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Make changes and test locally

# 4. Commit changes
git add .
git commit -m "feat: Add new feature"

# 5. Push to GitHub
git push origin feature/new-feature

# 6. Create pull request on GitHub

# 7. After approval, merge to main

# 8. Railway auto-deploys
```

---

### 9. Deployment (Railway)

#### Environment Variables
```bash
# Required in Railway
DATABASE_URL=postgresql://user:pass@host:port/dbname
REDIS_URL=redis://user:pass@host:port

# Optional
DEBUG=false
LOG_LEVEL=error
```

#### Deployment Checklist
```markdown
## Pre-Deployment
- [ ] All tests pass locally
- [ ] No console errors
- [ ] No PHP warnings/errors
- [ ] Database schema is up to date
- [ ] Environment variables are set

## Post-Deployment
- [ ] Check Railway logs for errors
- [ ] Test critical functionality
- [ ] Verify database connections
- [ ] Check API endpoints
- [ ] Monitor performance
```

---

## 🚫 Critical Don'ts

### Database
- ❌ DON'T use MySQL syntax (use PostgreSQL!)
- ❌ DON'T change schema without informing user
- ❌ DON'T drop tables without backup
- ❌ DON'T use SELECT * in production code

### Security
- ❌ DON'T trust user input
- ❌ DON'T concatenate SQL queries
- ❌ DON'T store passwords in plain text
- ❌ DON'T expose sensitive data in logs

### Code Quality
- ❌ DON'T commit without testing
- ❌ DON'T ignore error messages
- ❌ DON'T hardcode credentials
- ❌ DON'T use magic numbers (use constants)

### Deployment
- ❌ DON'T push untested code
- ❌ DON'T deploy on Friday afternoon
- ❌ DON'T skip backup before major changes
- ❌ DON'T ignore Railway logs

---

## ✅ Critical Do's

### Always
- ✅ Fetch from repo before editing
- ✅ Send code to user for saving
- ✅ Test on local before push
- ✅ Write comments for complex code
- ✅ Use prepared statements
- ✅ Handle errors properly
- ✅ Log errors with context
- ✅ Validate all inputs
- ✅ Use consistent response format
- ✅ Follow PSR-12 coding standards

### Testing
- ✅ Test happy path
- ✅ Test edge cases
- ✅ Test error scenarios
- ✅ Test concurrent requests
- ✅ Test with empty data
- ✅ Test with special characters
- ✅ Test on different browsers
- ✅ Test on mobile devices

---

## 📖 Reference Documentation

- **Full Documentation**: See `readme.txt` for complete guide
- **Database Schema**: `database/schema_pgsql.sql`
- **API Endpoints**: See API section in `readme.txt`
- **Deployment Guide**: See Deployment section in `readme.txt`

---

## 🎯 Current Development Phases

### Phase 1: Bug Fixes & Performance (IN PROGRESS)
- [x] Fix settings API column names
- [x] Fix no_stock_count type handling
- [ ] Add Redis caching
- [ ] Optimize slow queries
- [ ] Clean up CSS
- [ ] Code cleanup

### Phase 2: New Features & Security (PLANNED)
- [ ] Database backup system
- [ ] CSV/Excel import/export
- [ ] Barcode scanner support
- [ ] Receipt printer support
- [ ] Authentication system
- [ ] API key management
- [ ] PWA mobile app

---

## 📞 Support

For questions or issues:
- Check `readme.txt` first
- Review code comments
- Check error logs
- Ask user for clarification

---

**Last Updated**: 2026-07-13
**Version**: 1.8
```

---
