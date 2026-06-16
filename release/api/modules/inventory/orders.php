<?php
// orders.php - Purchase Orders & Automated Reordering API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        $suggestions = isset($_GET['reorder_suggestions']) && $_GET['reorder_suggestions'] === 'true';

        try {
            if ($suggestions) {
                // Fetch low stock products recommending reorder
                $stmt = $pdo->prepare("SELECT p.id as product_id, p.name as product_name, p.sku as product_sku, p.cost_price, p.reorder_level,
                    COALESCE(SUM(ws.quantity), 0) as total_stock
                    FROM inventory_products p 
                    LEFT JOIN inventory_warehouse_stock ws ON p.id = ws.product_id AND p.tenant_id = ws.tenant_id
                    WHERE p.tenant_id = ?
                    GROUP BY p.id
                    HAVING total_stock <= p.reorder_level
                    ORDER BY p.name ASC");
                $stmt->execute([$tenant_id]);
                $lowStock = $stmt->fetchAll();

                // Format recommendations
                foreach ($lowStock as &$item) {
                    $item['total_stock'] = intval($item['total_stock']);
                    $item['reorder_level'] = intval($item['reorder_level']);
                    $item['recommended_quantity'] = ($item['reorder_level'] * 2) - $item['total_stock'];
                    if ($item['recommended_quantity'] <= 0) {
                        $item['recommended_quantity'] = 10;
                    }
                }
                echo json_encode(["success" => true, "data" => $lowStock]);

            } else if ($id) {
                // Fetch single PO detail with items
                $stmt = $pdo->prepare("SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.phone as supplier_phone
                    FROM inventory_purchase_orders po 
                    JOIN inventory_suppliers s ON po.supplier_id = s.id AND po.tenant_id = s.tenant_id
                    WHERE po.id = ? AND po.tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $po = $stmt->fetch();

                if ($po) {
                    $istmt = $pdo->prepare("SELECT poi.*, p.name as product_name, p.sku as product_sku 
                        FROM inventory_purchase_order_items poi 
                        JOIN inventory_products p ON poi.product_id = p.id AND poi.tenant_id = p.tenant_id
                        WHERE poi.purchase_order_id = ?");
                    $istmt->execute([$id]);
                    $po['items'] = $istmt->fetchAll();
                    
                    // Fetch linked courier tracking if exists
                    $cstmt = $pdo->prepare("SELECT * FROM inventory_couriers WHERE purchase_order_id = ? AND tenant_id = ? LIMIT 1");
                    $cstmt->execute([$id, $tenant_id]);
                    $po['courier'] = $cstmt->fetch() ?: null;

                    echo json_encode(["success" => true, "data" => $po]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Purchase order not found."]);
                }
            } else {
                // Fetch all POs
                $stmt = $pdo->prepare("SELECT po.*, s.name as supplier_name
                    FROM inventory_purchase_orders po
                    JOIN inventory_suppliers s ON po.supplier_id = s.id AND po.tenant_id = s.tenant_id
                    WHERE po.tenant_id = ?
                    ORDER BY po.created_at DESC");
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
        $supplier_id = isset($input['supplier_id']) ? intval($input['supplier_id']) : null;
        $order_date = isset($input['order_date']) ? $input['order_date'] : date('Y-m-d');
        $status = isset($input['status']) ? $input['status'] : 'Draft';
        $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];

        if (!$supplier_id || empty($items)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Supplier and at least one item are required."]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Calculate total PO amount
            $total_amount = 0.00;
            foreach ($items as $item) {
                $qty = isset($item['quantity']) ? intval($item['quantity']) : 0;
                $cost = isset($item['unit_cost']) ? floatval($item['unit_cost']) : 0.00;
                $total_amount += ($qty * $cost);
            }

            // Insert Purchase Order
            $stmtPo = $pdo->prepare("INSERT INTO inventory_purchase_orders (supplier_id, order_date, status, total_amount, tenant_id) VALUES (?, ?, ?, ?, ?)");
            $stmtPo->execute([$supplier_id, $order_date, $status, $total_amount, $tenant_id]);
            $po_id = $pdo->lastInsertId();

            // Insert PO Items
            $stmtItem = $pdo->prepare("INSERT INTO inventory_purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, tenant_id) VALUES (?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $pid = intval($item['product_id']);
                $qty = intval($item['quantity']);
                $cost = floatval($item['unit_cost']);
                $stmtItem->execute([$po_id, $pid, $qty, $cost, $tenant_id]);
            }

            // Auto-create courier if status is 'Sent'
            if ($status === 'Sent') {
                $tracking_num = 'TRK-PO' . str_pad($po_id, 4, '0', STR_PAD_LEFT) . rand(10, 99);
                $supp_stmt = $pdo->prepare("SELECT name, address FROM inventory_suppliers WHERE id = ? LIMIT 1");
                $supp_stmt->execute([$supplier_id]);
                $supplier = $supp_stmt->fetch();
                
                $origin = $supplier ? $supplier['name'] : 'Supplier Location';
                $dest_stmt = $pdo->prepare("SELECT name FROM inventory_warehouses WHERE tenant_id = ? AND status = 'Active' LIMIT 1");
                $dest_stmt->execute([$tenant_id]);
                $warehouse = $dest_stmt->fetch();
                $destination = $warehouse ? $warehouse['name'] : 'Primary Warehouse';

                $cstmt = $pdo->prepare("INSERT INTO inventory_couriers (name, tracking_number, courier_name, status, origin, destination, purchase_order_id, tenant_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $cstmt->execute([
                    "PO #$po_id Supply Shipment",
                    $tracking_num,
                    "DHL Express",
                    "Dispatched",
                    $origin,
                    $destination,
                    $po_id,
                    $tenant_id
                ]);
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Purchase Order created successfully.", "id" => $po_id]);
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
        $warehouse_id = isset($input['warehouse_id']) ? intval($input['warehouse_id']) : null; // Required when status is 'Received'

        if (!$id || empty($status)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Purchase Order ID and new status are required."]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Fetch current status of PO
            $stmtPoCheck = $pdo->prepare("SELECT status, supplier_id FROM inventory_purchase_orders WHERE id = ? AND tenant_id = ?");
            $stmtPoCheck->execute([$id, $tenant_id]);
            $po_record = $stmtPoCheck->fetch();

            if (!$po_record) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Purchase order not found."]);
                $pdo->rollBack();
                exit;
            }

            $old_status = $po_record['status'];

            if ($old_status === 'Received') {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Purchase Order is already received. Cannot change status."]);
                $pdo->rollBack();
                exit;
            }

            // Update status
            $stmtUpdate = $pdo->prepare("UPDATE inventory_purchase_orders SET status = ? WHERE id = ? AND tenant_id = ?");
            $stmtUpdate->execute([$status, $id, $tenant_id]);

            // Auto courier generation if transitioning Draft -> Sent
            if ($old_status === 'Draft' && $status === 'Sent') {
                $tracking_num = 'TRK-PO' . str_pad($id, 4, '0', STR_PAD_LEFT) . rand(10, 99);
                $supp_stmt = $pdo->prepare("SELECT name FROM inventory_suppliers WHERE id = ? LIMIT 1");
                $supp_stmt->execute([$po_record['supplier_id']]);
                $supplier = $supp_stmt->fetch();
                $origin = $supplier ? $supplier['name'] : 'Supplier Location';

                $dest_stmt = $pdo->prepare("SELECT name FROM inventory_warehouses WHERE tenant_id = ? AND status = 'Active' LIMIT 1");
                $dest_stmt->execute([$tenant_id]);
                $warehouse = $dest_stmt->fetch();
                $destination = $warehouse ? $warehouse['name'] : 'Primary Warehouse';

                $cstmt = $pdo->prepare("INSERT INTO inventory_couriers (name, tracking_number, courier_name, status, origin, destination, purchase_order_id, tenant_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $cstmt->execute([
                    "PO #$id Supply Shipment",
                    $tracking_num,
                    "DHL Express",
                    "Dispatched",
                    $origin,
                    $destination,
                    $id,
                    $tenant_id
                ]);
            }

            // Automation: Stock receiving trigger
            if ($status === 'Received') {
                if (!$warehouse_id) {
                    // Default to first active warehouse if none provided
                    $wstmt = $pdo->prepare("SELECT id FROM inventory_warehouses WHERE tenant_id = ? AND status = 'Active' ORDER BY name ASC LIMIT 1");
                    $wstmt->execute([$tenant_id]);
                    $w_row = $wstmt->fetch();
                    if ($w_row) {
                        $warehouse_id = intval($w_row['id']);
                    } else {
                        http_response_code(400);
                        echo json_encode(["success" => false, "error" => "No active warehouse found to receive stock."]);
                        $pdo->rollBack();
                        exit;
                    }
                }

                // Fetch PO items
                $istmt = $pdo->prepare("SELECT product_id, quantity FROM inventory_purchase_order_items WHERE purchase_order_id = ?");
                $istmt->execute([$id]);
                $items = $istmt->fetchAll();

                $stmtStockCheck = $pdo->prepare("SELECT quantity FROM inventory_warehouse_stock WHERE warehouse_id = ? AND product_id = ? AND tenant_id = ?");
                $stmtStockUpdate = $pdo->prepare("INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id) 
                    VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = ?");
                $stmtLog = $pdo->prepare("INSERT INTO inventory_stock_logs (product_id, warehouse_id, quantity_changed, type, remarks, tenant_id) 
                    VALUES (?, ?, ?, ?, ?, ?)");

                foreach ($items as $item) {
                    $pid = intval($item['product_id']);
                    $qty = intval($item['quantity']);

                    $stmtStockCheck->execute([$warehouse_id, $pid, $tenant_id]);
                    $rowStock = $stmtStockCheck->fetch();
                    $current_qty = $rowStock ? intval($rowStock['quantity']) : 0;
                    $new_qty = $current_qty + $qty;

                    $stmtStockUpdate->execute([$warehouse_id, $pid, $new_qty, $tenant_id, $new_qty]);
                    
                    // Create supply log (type 'IN')
                    $stmtLog->execute([
                        $pid,
                        $warehouse_id,
                        $qty,
                        'IN',
                        "Received stock from Purchase Order #$id",
                        $tenant_id
                    ]);
                }

                // Automatically update linked Courier tracking status to Delivered
                $cstmt = $pdo->prepare("UPDATE inventory_couriers SET status = 'Delivered' WHERE purchase_order_id = ? AND tenant_id = ?");
                $cstmt->execute([$id, $tenant_id]);
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Purchase Order status updated to $status successfully."]);
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
