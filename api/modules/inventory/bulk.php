<?php
// api/modules/inventory/bulk.php - Bulk Inventory Import & Stocktake API
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/validation.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed. Only POST is supported."]);
    exit;
}

$type = $_GET['type'] ?? '';

if (empty($type)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Bulk type parameter is required (products or stock)."]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);

try {
    if ($type === 'products') {
        $products = $input['products'] ?? [];
        if (!is_array($products) || empty($products)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "No product records found in payload."]);
            exit;
        }

        $pdo->beginTransaction();
        $imported_count = 0;
        $errors = [];

        $stmtCheckSku = $pdo->prepare("SELECT id FROM inventory_products WHERE sku = ? AND tenant_id = ?");
        $stmtInsertProduct = $pdo->prepare("INSERT INTO inventory_products 
            (name, sku, barcode, rfid_tag, category, description, cost_price, sale_price, reorder_level, tenant_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        foreach ($products as $index => $prod) {
            $name = trim($prod['name'] ?? '');
            $sku = trim($prod['sku'] ?? '');
            $barcode = trim($prod['barcode'] ?? '');
            $rfid_tag = trim($prod['rfid_tag'] ?? '');
            $category = trim($prod['category'] ?? 'General');
            $description = trim($prod['description'] ?? '');
            $cost_price = floatval($prod['cost_price'] ?? 0.00);
            $sale_price = floatval($prod['sale_price'] ?? 0.00);
            $reorder_level = intval($prod['reorder_level'] ?? 10);

            if (empty($name) || empty($sku)) {
                $errors[] = "Row " . ($index + 1) . ": Name and SKU are required.";
                continue;
            }

            // Check SKU uniqueness
            $stmtCheckSku->execute([$sku, $tenant_id]);
            if ($stmtCheckSku->fetch()) {
                $errors[] = "Row " . ($index + 1) . " ($name): SKU '$sku' already exists.";
                continue;
            }

            $stmtInsertProduct->execute([
                $name, $sku, $barcode ?: null, $rfid_tag ?: null,
                $category, $description ?: null, $cost_price, $sale_price,
                $reorder_level, $tenant_id
            ]);
            $imported_count++;
        }

        if (count($errors) > 0 && $imported_count === 0) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "error" => "All rows failed validation.", "errors" => $errors]);
        } else {
            $pdo->commit();
            echo json_encode([
                "success" => true,
                "message" => "Product catalog imported successfully.",
                "imported" => $imported_count,
                "errors" => $errors
            ]);
        }

    } elseif ($type === 'stock') {
        $stock = $input['stock'] ?? [];
        if (!is_array($stock) || empty($stock)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "No stock records found in payload."]);
            exit;
        }

        $pdo->beginTransaction();
        $reconciled_count = 0;
        $errors = [];

        $stmtCheckWarehouse = $pdo->prepare("SELECT id FROM inventory_warehouses WHERE id = ? AND tenant_id = ?");
        $stmtCheckProduct = $pdo->prepare("SELECT id FROM inventory_products WHERE id = ? AND tenant_id = ?");
        
        $stmtCurrentStock = $pdo->prepare("SELECT quantity FROM inventory_warehouse_stock WHERE warehouse_id = ? AND product_id = ? AND tenant_id = ?");
        $stmtUpdateStock = $pdo->prepare("INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id) 
            VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = ?");
        $stmtLog = $pdo->prepare("INSERT INTO inventory_stock_logs (product_id, warehouse_id, quantity_changed, type, remarks, tenant_id) 
            VALUES (?, ?, ?, ?, ?, ?)");

        foreach ($stock as $index => $row) {
            $warehouse_id = intval($row['warehouse_id'] ?? 0);
            $product_id = intval($row['product_id'] ?? 0);
            $counted_qty = intval($row['quantity'] ?? 0);

            if (!$warehouse_id || !$product_id) {
                $errors[] = "Row " . ($index + 1) . ": Product ID and Warehouse ID are required.";
                continue;
            }

            if ($counted_qty < 0) {
                $errors[] = "Row " . ($index + 1) . ": Counted quantity cannot be negative.";
                continue;
            }

            // Verify warehouse exists
            $stmtCheckWarehouse->execute([$warehouse_id, $tenant_id]);
            if (!$stmtCheckWarehouse->fetch()) {
                $errors[] = "Row " . ($index + 1) . ": Warehouse ID $warehouse_id does not exist for this tenant.";
                continue;
            }

            // Verify product exists
            $stmtCheckProduct->execute([$product_id, $tenant_id]);
            if (!$stmtCheckProduct->fetch()) {
                $errors[] = "Row " . ($index + 1) . ": Product ID $product_id does not exist for this tenant.";
                continue;
            }

            // Fetch current stock
            $stmtCurrentStock->execute([$warehouse_id, $product_id, $tenant_id]);
            $stock_row = $stmtCurrentStock->fetch();
            $current_qty = $stock_row ? intval($stock_row['quantity']) : 0;

            $quantity_changed = $counted_qty - $current_qty;

            if ($quantity_changed !== 0) {
                // Update stock levels
                $stmtUpdateStock->execute([$warehouse_id, $product_id, $counted_qty, $tenant_id, $counted_qty]);
                // Log discrepancy
                $stmtLog->execute([
                    $product_id,
                    $warehouse_id,
                    $quantity_changed,
                    'ADJUSTMENT',
                    "Bulk Stocktake Audit Reconciliation: counted $counted_qty vs system $current_qty",
                    $tenant_id
                ]);
                $reconciled_count++;
            }
        }

        if (count($errors) > 0 && $reconciled_count === 0 && count($stock) === count($errors)) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "error" => "All rows failed validation.", "errors" => $errors]);
        } else {
            $pdo->commit();
            echo json_encode([
                "success" => true,
                "message" => "Stock reconciliation completed successfully.",
                "reconciled" => $reconciled_count,
                "errors" => $errors
            ]);
        }

    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid bulk type. Supported: products, stock."]);
    }

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
}
?>
