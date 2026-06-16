<?php
// stock.php - Stock adjustment, transfer, and transaction logs API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        // If logs parameter is present, fetch stock logs
        $fetchLogs = isset($_GET['logs']) && $_GET['logs'] === 'true';
        $warehouse_id = isset($_GET['warehouse_id']) ? intval($_GET['warehouse_id']) : null;

        try {
            if ($fetchLogs) {
                // Get stock transaction logs
                $query = "SELECT l.*, p.name as product_name, p.sku as product_sku, w.name as warehouse_name
                    FROM inventory_stock_logs l 
                    LEFT JOIN inventory_products p ON l.product_id = p.id AND l.tenant_id = p.tenant_id
                    LEFT JOIN inventory_warehouses w ON l.warehouse_id = w.id AND l.tenant_id = w.tenant_id
                    WHERE l.tenant_id = ?";
                $params = [$tenant_id];
                if ($warehouse_id) {
                    $query .= " AND l.warehouse_id = ?";
                    $params[] = $warehouse_id;
                }
                $query .= " ORDER BY l.logged_at DESC LIMIT 100";
                
                // Note: logged_at is actually created_at in database table
                $query = str_replace('l.logged_at', 'l.created_at', $query);

                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
            } else {
                // Get current stock levels
                if ($warehouse_id) {
                    // Stocks in a specific warehouse
                    $stmt = $pdo->prepare("SELECT ws.*, p.name as product_name, p.sku as product_sku, p.category as product_category, p.reorder_level
                        FROM inventory_warehouse_stock ws 
                        JOIN inventory_products p ON ws.product_id = p.id AND ws.tenant_id = p.tenant_id
                        WHERE ws.warehouse_id = ? AND ws.tenant_id = ? 
                        ORDER BY p.name ASC");
                    $stmt->execute([$warehouse_id, $tenant_id]);
                    echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
                } else {
                    // Total aggregated stocks across all warehouses
                    $stmt = $pdo->prepare("SELECT p.id as product_id, p.name as product_name, p.sku as product_sku, p.category as product_category, p.reorder_level,
                        COALESCE(SUM(ws.quantity), 0) as total_quantity
                        FROM inventory_products p 
                        LEFT JOIN inventory_warehouse_stock ws ON p.id = ws.product_id AND p.tenant_id = ws.tenant_id
                        WHERE p.tenant_id = ?
                        GROUP BY p.id
                        ORDER BY p.name ASC");
                    $stmt->execute([$tenant_id]);
                    echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
                }
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $type = isset($input['type']) ? trim($input['type']) : ''; // 'ADJUSTMENT' or 'TRANSFER'
        $product_id = isset($input['product_id']) ? intval($input['product_id']) : null;
        $remarks = isset($input['remarks']) ? trim($input['remarks']) : '';

        if (empty($type) || !$product_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Transaction type and Product ID are required."]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            if ($type === 'ADJUSTMENT') {
                $warehouse_id = isset($input['warehouse_id']) ? intval($input['warehouse_id']) : null;
                $quantity_changed = isset($input['quantity_changed']) ? intval($input['quantity_changed']) : 0; // Negative for reduction, positive for addition

                if (!$warehouse_id || $quantity_changed == 0) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "Warehouse ID and non-zero quantity change are required for stock adjustments."]);
                    $pdo->rollBack();
                    exit;
                }

                // Check existing quantity
                $stmtCheck = $pdo->prepare("SELECT quantity FROM inventory_warehouse_stock WHERE warehouse_id = ? AND product_id = ? AND tenant_id = ?");
                $stmtCheck->execute([$warehouse_id, $product_id, $tenant_id]);
                $row = $stmtCheck->fetch();
                $current_qty = $row ? intval($row['quantity']) : 0;
                $new_qty = $current_qty + $quantity_changed;

                if ($new_qty < 0) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "Insufficient stock. Current stock: $current_qty, change: $quantity_changed."]);
                    $pdo->rollBack();
                    exit;
                }

                // Insert or Update stock mapping
                $stmtStock = $pdo->prepare("INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id) 
                    VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = ?");
                $stmtStock->execute([$warehouse_id, $product_id, $new_qty, $tenant_id, $new_qty]);

                // Create log entry
                $stmtLog = $pdo->prepare("INSERT INTO inventory_stock_logs (product_id, warehouse_id, quantity_changed, type, remarks, tenant_id) 
                    VALUES (?, ?, ?, ?, ?, ?)");
                $stmtLog->execute([$product_id, $warehouse_id, $quantity_changed, 'ADJUSTMENT', $remarks, $tenant_id]);

                $pdo->commit();
                echo json_encode(["success" => true, "message" => "Stock adjustment completed successfully.", "new_quantity" => $new_qty]);

            } else if ($type === 'TRANSFER') {
                $from_warehouse_id = isset($input['from_warehouse_id']) ? intval($input['from_warehouse_id']) : null;
                $to_warehouse_id = isset($input['to_warehouse_id']) ? intval($input['to_warehouse_id']) : null;
                $quantity = isset($input['quantity']) ? intval($input['quantity']) : 0;

                if (!$from_warehouse_id || !$to_warehouse_id || $quantity <= 0) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "Valid Source, Target warehouse IDs and positive transfer quantity are required."]);
                    $pdo->rollBack();
                    exit;
                }

                if ($from_warehouse_id === $to_warehouse_id) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "Source and target warehouses must be different."]);
                    $pdo->rollBack();
                    exit;
                }

                // Check existing quantity in source warehouse
                $stmtCheck = $pdo->prepare("SELECT quantity FROM inventory_warehouse_stock WHERE warehouse_id = ? AND product_id = ? AND tenant_id = ?");
                $stmtCheck->execute([$from_warehouse_id, $product_id, $tenant_id]);
                $row = $stmtCheck->fetch();
                $source_qty = $row ? intval($row['quantity']) : 0;

                if ($source_qty < $quantity) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "Insufficient stock in source warehouse. Available: $source_qty, requested transfer: $quantity."]);
                    $pdo->rollBack();
                    exit;
                }

                // Deduct from source warehouse
                $new_source_qty = $source_qty - $quantity;
                $stmtDeduct = $pdo->prepare("UPDATE inventory_warehouse_stock SET quantity = ? WHERE warehouse_id = ? AND product_id = ? AND tenant_id = ?");
                $stmtDeduct->execute([$new_source_qty, $from_warehouse_id, $product_id, $tenant_id]);

                // Add to target warehouse
                $stmtCheckTarget = $pdo->prepare("SELECT quantity FROM inventory_warehouse_stock WHERE warehouse_id = ? AND product_id = ? AND tenant_id = ?");
                $stmtCheckTarget->execute([$to_warehouse_id, $product_id, $tenant_id]);
                $rowTarget = $stmtCheckTarget->fetch();
                $target_qty = $rowTarget ? intval($rowTarget['quantity']) : 0;
                $new_target_qty = $target_qty + $quantity;

                $stmtAdd = $pdo->prepare("INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id) 
                    VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = ?");
                $stmtAdd->execute([$to_warehouse_id, $product_id, $new_target_qty, $tenant_id, $new_target_qty]);

                // Create stock log for transfer
                $stmtLog = $pdo->prepare("INSERT INTO inventory_stock_logs (product_id, warehouse_id, quantity_changed, type, remarks, tenant_id) 
                    VALUES (?, ?, ?, ?, ?, ?)");
                
                // We'll log two entries or one entry summarizing the transfer. Let's log two entries to balance the logs per warehouse.
                // 1. DEDUCT OUT log for source warehouse
                $stmtLog->execute([$product_id, $from_warehouse_id, -$quantity, 'TRANSFER', "Transferred to warehouse ID #$to_warehouse_id. $remarks", $tenant_id]);
                // 2. ADD IN log for target warehouse
                $stmtLog->execute([$product_id, $to_warehouse_id, $quantity, 'TRANSFER', "Transferred from warehouse ID #$from_warehouse_id. $remarks", $tenant_id]);

                $pdo->commit();
                echo json_encode(["success" => true, "message" => "Stock transfer completed successfully."]);
            } else {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid transaction type. Allowed types: ADJUSTMENT, TRANSFER."]);
                $pdo->rollBack();
            }
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed."]);
        break;
}
?>
