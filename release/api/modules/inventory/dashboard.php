<?php
// dashboard.php - Inventory Dashboard Metrics API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed."]);
    exit;
}

try {
    // 1. Total Products
    $stmtProd = $pdo->prepare("SELECT COUNT(*) as cnt FROM inventory_products WHERE tenant_id = ?");
    $stmtProd->execute([$tenant_id]);
    $total_products = intval($stmtProd->fetch()['cnt']);

    // 2. Stock Valuation
    $stmtVal = $pdo->prepare("SELECT SUM(ws.quantity * p.cost_price) as valuation
        FROM inventory_warehouse_stock ws
        JOIN inventory_products p ON ws.product_id = p.id AND ws.tenant_id = p.tenant_id
        WHERE ws.tenant_id = ?");
    $stmtVal->execute([$tenant_id]);
    $valuation = floatval($stmtVal->fetch()['valuation'] ?: 0.00);

    // 3. Low Stock Items Count
    $stmtLow = $pdo->prepare("SELECT COUNT(*) as cnt FROM (
        SELECT p.id, p.reorder_level, COALESCE(SUM(ws.quantity), 0) as total_stock
        FROM inventory_products p
        LEFT JOIN inventory_warehouse_stock ws ON p.id = ws.product_id AND p.tenant_id = ws.tenant_id
        WHERE p.tenant_id = ?
        GROUP BY p.id, p.reorder_level
        HAVING total_stock <= p.reorder_level
    ) as low_stock_summary");
    $stmtLow->execute([$tenant_id]);
    $low_stock_count = intval($stmtLow->fetch()['cnt']);

    // 4. Active Shipments Count
    $stmtShip = $pdo->prepare("SELECT COUNT(*) as cnt FROM inventory_couriers WHERE tenant_id = ? AND status NOT IN ('Delivered', 'Returned')");
    $stmtShip->execute([$tenant_id]);
    $active_shipments = intval($stmtShip->fetch()['cnt']);

    // 5. Stock Distribution by Warehouse
    $stmtDist = $pdo->prepare("SELECT w.name as warehouse_name, COALESCE(SUM(ws.quantity), 0) as total_quantity, COALESCE(SUM(ws.quantity * p.cost_price), 0) as stock_value
        FROM inventory_warehouses w
        LEFT JOIN inventory_warehouse_stock ws ON w.id = ws.warehouse_id AND w.tenant_id = ws.tenant_id
        LEFT JOIN inventory_products p ON ws.product_id = p.id AND ws.tenant_id = p.tenant_id
        WHERE w.tenant_id = ? AND w.status = 'Active'
        GROUP BY w.id
        ORDER BY warehouse_name ASC");
    $stmtDist->execute([$tenant_id]);
    $distribution = $stmtDist->fetchAll();

    // 6. Recent Logs
    $stmtLogs = $pdo->prepare("SELECT l.*, p.name as product_name, p.sku as product_sku, w.name as warehouse_name
        FROM inventory_stock_logs l
        LEFT JOIN inventory_products p ON l.product_id = p.id AND l.tenant_id = p.tenant_id
        LEFT JOIN inventory_warehouses w ON l.warehouse_id = w.id AND l.tenant_id = w.tenant_id
        WHERE l.tenant_id = ?
        ORDER BY l.created_at DESC
        LIMIT 5");
    $stmtLogs->execute([$tenant_id]);
    $recent_logs = $stmtLogs->fetchAll();

    // 7. Low Stock Alerts Details (Top 5 for immediate action)
    $stmtLowDetails = $pdo->prepare("SELECT p.id, p.name, p.sku, p.reorder_level, p.cost_price, COALESCE(SUM(ws.quantity), 0) as total_stock
        FROM inventory_products p
        LEFT JOIN inventory_warehouse_stock ws ON p.id = ws.product_id AND p.tenant_id = ws.tenant_id
        WHERE p.tenant_id = ?
        GROUP BY p.id, p.name, p.sku, p.reorder_level, p.cost_price
        HAVING total_stock <= p.reorder_level
        ORDER BY total_stock ASC
        LIMIT 5");
    $stmtLowDetails->execute([$tenant_id]);
    $low_stock_details = $stmtLowDetails->fetchAll();

    echo json_encode([
        "success" => true,
        "data" => [
            "total_products" => $total_products,
            "stock_valuation" => $valuation,
            "low_stock_count" => $low_stock_count,
            "active_shipments" => $active_shipments,
            "distribution" => $distribution,
            "recent_logs" => $recent_logs,
            "low_stock_details" => $low_stock_details
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
