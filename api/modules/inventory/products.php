<?php
// products.php - Product Catalog & Barcode/RFID API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        // Check for specific search query (barcode, rfid, sku, search term)
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $barcode = isset($_GET['barcode']) ? trim($_GET['barcode']) : '';
        $rfid = isset($_GET['rfid']) ? trim($_GET['rfid']) : '';
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;

        try {
            if ($id) {
                // Get single product detail including warehouse stocks
                $stmt = $pdo->prepare("SELECT p.*, 
                    (SELECT COALESCE(SUM(quantity), 0) FROM inventory_warehouse_stock s WHERE s.product_id = p.id AND s.tenant_id = p.tenant_id) as total_stock
                    FROM inventory_products p 
                    WHERE p.id = ? AND p.tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $product = $stmt->fetch();

                if ($product) {
                    // Fetch stocks breakdown per warehouse
                    $wstmt = $pdo->prepare("SELECT w.name as warehouse_name, COALESCE(s.quantity, 0) as quantity 
                        FROM inventory_warehouses w 
                        LEFT JOIN inventory_warehouse_stock s ON s.warehouse_id = w.id AND s.product_id = ? 
                        WHERE w.tenant_id = ? AND w.status = 'Active'");
                    $wstmt->execute([$id, $tenant_id]);
                    $product['warehouses'] = $wstmt->fetchAll();
                    echo json_encode(["success" => true, "data" => $product]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Product not found."]);
                }
            } else if (!empty($barcode)) {
                // Barcode lookup
                $stmt = $pdo->prepare("SELECT p.*, 
                    (SELECT COALESCE(SUM(quantity), 0) FROM inventory_warehouse_stock s WHERE s.product_id = p.id AND s.tenant_id = p.tenant_id) as total_stock
                    FROM inventory_products p 
                    WHERE p.barcode = ? AND p.tenant_id = ? LIMIT 1");
                $stmt->execute([$barcode, $tenant_id]);
                $product = $stmt->fetch();
                if ($product) {
                    echo json_encode(["success" => true, "data" => $product]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "No product found with barcode: " . $barcode]);
                }
            } else if (!empty($rfid)) {
                // RFID lookup
                $stmt = $pdo->prepare("SELECT p.*, 
                    (SELECT COALESCE(SUM(quantity), 0) FROM inventory_warehouse_stock s WHERE s.product_id = p.id AND s.tenant_id = p.tenant_id) as total_stock
                    FROM inventory_products p 
                    WHERE p.rfid_tag = ? AND p.tenant_id = ? LIMIT 1");
                $stmt->execute([$rfid, $tenant_id]);
                $product = $stmt->fetch();
                if ($product) {
                    echo json_encode(["success" => true, "data" => $product]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "No product found with RFID tag: " . $rfid]);
                }
            } else {
                // Get all products
                $queryStr = "SELECT p.*, 
                    (SELECT COALESCE(SUM(quantity), 0) FROM inventory_warehouse_stock s WHERE s.product_id = p.id AND s.tenant_id = p.tenant_id) as total_stock
                    FROM inventory_products p 
                    WHERE p.tenant_id = ?";
                $params = [$tenant_id];

                if (!empty($search)) {
                    $queryStr .= " AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.rfid_tag LIKE ? OR p.category LIKE ?)";
                    $searchTerm = "%$search%";
                    array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
                }

                $queryStr .= " ORDER BY p.name ASC";
                $stmt = $pdo->prepare($queryStr);
                $stmt->execute($params);
                echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $name = isset($input['name']) ? trim($input['name']) : '';
        $sku = isset($input['sku']) ? trim($input['sku']) : '';
        $barcode = isset($input['barcode']) ? trim($input['barcode']) : null;
        $rfid_tag = isset($input['rfid_tag']) ? trim($input['rfid_tag']) : null;
        $category = isset($input['category']) ? trim($input['category']) : 'General';
        $description = isset($input['description']) ? trim($input['description']) : '';
        $cost_price = isset($input['cost_price']) ? floatval($input['cost_price']) : 0.00;
        $sale_price = isset($input['sale_price']) ? floatval($input['sale_price']) : 0.00;
        $reorder_level = isset($input['reorder_level']) ? intval($input['reorder_level']) : 10;

        if (empty($name) || empty($sku)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Product name and SKU are required."]);
            exit;
        }

        try {
            // Check for duplicate SKU
            $checkSku = $pdo->prepare("SELECT id FROM inventory_products WHERE sku = ? AND tenant_id = ?");
            $checkSku->execute([$sku, $tenant_id]);
            if ($checkSku->fetch()) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Product SKU already exists in database."]);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO inventory_products (name, sku, barcode, rfid_tag, category, description, cost_price, sale_price, reorder_level, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $sku, $barcode, $rfid_tag, $category, $description, $cost_price, $sale_price, $reorder_level, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Product created successfully.", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = isset($input['id']) ? intval($input['id']) : null;
        $name = isset($input['name']) ? trim($input['name']) : '';
        $sku = isset($input['sku']) ? trim($input['sku']) : '';
        $barcode = isset($input['barcode']) ? trim($input['barcode']) : null;
        $rfid_tag = isset($input['rfid_tag']) ? trim($input['rfid_tag']) : null;
        $category = isset($input['category']) ? trim($input['category']) : 'General';
        $description = isset($input['description']) ? trim($input['description']) : '';
        $cost_price = isset($input['cost_price']) ? floatval($input['cost_price']) : 0.00;
        $sale_price = isset($input['sale_price']) ? floatval($input['sale_price']) : 0.00;
        $reorder_level = isset($input['reorder_level']) ? intval($input['reorder_level']) : 10;

        if (!$id || empty($name) || empty($sku)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Product ID, Name, and SKU are required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE inventory_products SET name = ?, sku = ?, barcode = ?, rfid_tag = ?, category = ?, description = ?, cost_price = ?, sale_price = ?, reorder_level = ? WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$name, $sku, $barcode, $rfid_tag, $category, $description, $cost_price, $sale_price, $reorder_level, $id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Product updated successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Product ID is required."]);
            exit;
        }

        try {
            // Check if there is active stock in any warehouse
            $check = $pdo->prepare("SELECT SUM(quantity) as qty FROM inventory_warehouse_stock WHERE product_id = ? AND tenant_id = ?");
            $check->execute([$id, $tenant_id]);
            $result = $check->fetch();
            if ($result && $result['qty'] > 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Cannot delete product with active stock. Sell or adjust quantities to 0 first."]);
                exit;
            }

            // Begin transaction to clean up related mappings
            $pdo->beginTransaction();
            $stmtStock = $pdo->prepare("DELETE FROM inventory_warehouse_stock WHERE product_id = ? AND tenant_id = ?");
            $stmtStock->execute([$id, $tenant_id]);

            $stmtProd = $pdo->prepare("DELETE FROM inventory_products WHERE id = ? AND tenant_id = ?");
            $stmtProd->execute([$id, $tenant_id]);
            
            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Product deleted successfully."]);
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
