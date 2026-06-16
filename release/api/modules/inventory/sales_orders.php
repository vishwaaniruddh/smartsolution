<?php
// api/modules/inventory/sales_orders.php - Customer Sales Orders API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;

        try {
            if ($id) {
                // Fetch single sales order details
                $stmt = $pdo->prepare("SELECT so.* 
                    FROM inventory_sales_orders so 
                    WHERE so.id = ? AND so.tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $so = $stmt->fetch();

                if ($so) {
                    // Fetch items
                    $istmt = $pdo->prepare("SELECT soi.*, p.name as product_name, p.sku as product_sku 
                        FROM inventory_sales_order_items soi 
                        JOIN inventory_products p ON soi.product_id = p.id AND soi.tenant_id = p.tenant_id
                        WHERE soi.sales_order_id = ?");
                    $istmt->execute([$id]);
                    $so['items'] = $istmt->fetchAll();

                    // Fetch linked courier tracking if exists
                    $cstmt = $pdo->prepare("SELECT * FROM inventory_couriers WHERE sales_id = ? AND tenant_id = ? LIMIT 1");
                    $cstmt->execute([$id, $tenant_id]);
                    $so['courier'] = $cstmt->fetch() ?: null;

                    echo json_encode(["success" => true, "data" => $so]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Sales Order not found."]);
                }
            } else {
                // Fetch all Sales Orders
                $stmt = $pdo->prepare("SELECT * 
                    FROM inventory_sales_orders 
                    WHERE tenant_id = ? 
                    ORDER BY created_at DESC");
                $stmt->execute([$tenant_id]);
                echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $customer_name = isset($input['customer_name']) ? trim($input['customer_name']) : '';
        $order_date = isset($input['order_date']) ? $input['order_date'] : date('Y-m-d');
        $status = isset($input['status']) ? $input['status'] : 'Draft';
        $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];

        if (empty($customer_name) || empty($items)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Customer name and at least one item are required."]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Calculate total Sales Order amount
            $total_amount = 0.00;
            foreach ($items as $item) {
                $qty = isset($item['quantity']) ? intval($item['quantity']) : 0;
                $price = isset($item['unit_price']) ? floatval($item['unit_price']) : 0.00;
                $total_amount += ($qty * $price);
            }

            // Insert Sales Order
            $stmtSo = $pdo->prepare("INSERT INTO inventory_sales_orders (customer_name, order_date, status, total_amount, tenant_id) VALUES (?, ?, ?, ?, ?)");
            $stmtSo->execute([$customer_name, $order_date, $status, $total_amount, $tenant_id]);
            $so_id = $pdo->lastInsertId();

            // Insert Items
            $stmtItem = $pdo->prepare("INSERT INTO inventory_sales_order_items (sales_order_id, product_id, quantity, unit_price, tenant_id) VALUES (?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $pid = intval($item['product_id']);
                $qty = intval($item['quantity']);
                $price = floatval($item['unit_price']);
                $stmtItem->execute([$so_id, $pid, $qty, $price, $tenant_id]);
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Sales Order created successfully.", "id" => $so_id]);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = isset($input['id']) ? intval($input['id']) : null;
        $status = isset($input['status']) ? trim($input['status']) : '';
        $warehouse_id = isset($input['warehouse_id']) ? intval($input['warehouse_id']) : null; // Required for dispatching/shipping

        if (!$id || empty($status)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Sales Order ID and status are required."]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Fetch current status of Sales Order
            $stmtSoCheck = $pdo->prepare("SELECT status, customer_name FROM inventory_sales_orders WHERE id = ? AND tenant_id = ?");
            $stmtSoCheck->execute([$id, $tenant_id]);
            $so_record = $stmtSoCheck->fetch();

            if (!$so_record) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Sales Order not found."]);
                $pdo->rollBack();
                exit;
            }

            $old_status = $so_record['status'];

            if ($old_status === 'Shipped') {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Sales Order has already been shipped. Cannot alter status."]);
                $pdo->rollBack();
                exit;
            }

            // Update status
            $stmtUpdate = $pdo->prepare("UPDATE inventory_sales_orders SET status = ? WHERE id = ? AND tenant_id = ?");
            $stmtUpdate->execute([$status, $id, $tenant_id]);

            // Dispatch Stock OUT automation
            if ($status === 'Shipped') {
                if (!$warehouse_id) {
                    // Default to first active warehouse if none provided
                    $wstmt = $pdo->prepare("SELECT id FROM inventory_warehouses WHERE tenant_id = ? AND status = 'Active' ORDER BY name ASC LIMIT 1");
                    $wstmt->execute([$tenant_id]);
                    $w_row = $wstmt->fetch();
                    if ($w_row) {
                        $warehouse_id = intval($w_row['id']);
                    } else {
                        http_response_code(400);
                        echo json_encode(["success" => false, "error" => "No active warehouse found to dispatch stock."]);
                        $pdo->rollBack();
                        exit;
                    }
                }

                // Fetch Sales Order Items
                $istmt = $pdo->prepare("SELECT product_id, quantity FROM inventory_sales_order_items WHERE sales_order_id = ?");
                $istmt->execute([$id]);
                $items = $istmt->fetchAll();

                $stmtStockCheck = $pdo->prepare("SELECT quantity FROM inventory_warehouse_stock WHERE warehouse_id = ? AND product_id = ? AND tenant_id = ?");
                $stmtStockUpdate = $pdo->prepare("UPDATE inventory_warehouse_stock SET quantity = ? WHERE warehouse_id = ? AND product_id = ? AND tenant_id = ?");
                $stmtLog = $pdo->prepare("INSERT INTO inventory_stock_logs (product_id, warehouse_id, quantity_changed, type, remarks, tenant_id) 
                    VALUES (?, ?, ?, ?, ?, ?)");

                // Validate stock availability first
                foreach ($items as $item) {
                    $pid = intval($item['product_id']);
                    $qty = intval($item['quantity']);

                    $stmtStockCheck->execute([$warehouse_id, $pid, $tenant_id]);
                    $rowStock = $stmtStockCheck->fetch();
                    $current_qty = $rowStock ? intval($rowStock['quantity']) : 0;

                    if ($current_qty < $qty) {
                        // Get product name for clear error message
                        $p_stmt = $pdo->prepare("SELECT name FROM inventory_products WHERE id = ?");
                        $p_stmt->execute([$pid]);
                        $prod_name = $p_stmt->fetch()['name'] ?? 'Product ID #' . $pid;

                        http_response_code(400);
                        echo json_encode(["success" => false, "error" => "Insufficient stock in warehouse for product '$prod_name'. Available: $current_qty, required: $qty."]);
                        $pdo->rollBack();
                        exit;
                    }
                }

                // Deduct stock and log OUT transactions
                foreach ($items as $item) {
                    $pid = intval($item['product_id']);
                    $qty = intval($item['quantity']);

                    $stmtStockCheck->execute([$warehouse_id, $pid, $tenant_id]);
                    $rowStock = $stmtStockCheck->fetch();
                    $current_qty = intval($rowStock['quantity']);
                    $new_qty = $current_qty - $qty;

                    $stmtStockUpdate->execute([$new_qty, $warehouse_id, $pid, $tenant_id]);

                    // Log OUT stock movement
                    $stmtLog->execute([
                        $pid,
                        $warehouse_id,
                        -$qty,
                        'OUT',
                        "Dispatched for Sales Order #$id to customer '{$so_record['customer_name']}'",
                        $tenant_id
                    ]);
                }

                // Auto-create courier delivery tracking
                $tracking_num = 'TRK-SO' . str_pad($id, 4, '0', STR_PAD_LEFT) . rand(10, 99);
                
                $w_stmt = $pdo->prepare("SELECT name FROM inventory_warehouses WHERE id = ? LIMIT 1");
                $w_stmt->execute([$warehouse_id]);
                $warehouse = $w_stmt->fetch();
                $origin = $warehouse ? $warehouse['name'] : 'Primary Warehouse';
                
                $destination = 'Customer: ' . $so_record['customer_name'];

                $cstmt = $pdo->prepare("INSERT INTO inventory_couriers (name, tracking_number, courier_name, status, origin, destination, sales_id, tenant_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $cstmt->execute([
                    "Sales Order #$id Dispatch Shipment",
                    $tracking_num,
                    "FedEx Logistics",
                    "Dispatched",
                    $origin,
                    $destination,
                    $id,
                    $tenant_id
                ]);
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Sales Order status updated to $status successfully."]);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Sales Order ID is required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("SELECT status FROM inventory_sales_orders WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            $status = $stmt->fetchColumn();

            if ($status === 'Shipped') {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Cannot delete a Sales Order that has already been shipped."]);
                exit;
            }

            $stmtDel = $pdo->prepare("DELETE FROM inventory_sales_orders WHERE id = ? AND tenant_id = ?");
            $stmtDel->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Sales Order deleted."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
}
?>
