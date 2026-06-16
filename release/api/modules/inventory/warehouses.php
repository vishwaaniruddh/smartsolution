<?php
// warehouses.php - Warehouse Management API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->prepare("SELECT w.*, 
                (SELECT COALESCE(SUM(quantity), 0) FROM inventory_warehouse_stock s WHERE s.warehouse_id = w.id AND s.tenant_id = w.tenant_id) as total_items,
                (SELECT COUNT(DISTINCT product_id) FROM inventory_warehouse_stock s WHERE s.warehouse_id = w.id AND s.tenant_id = w.tenant_id) as unique_products
                FROM inventory_warehouses w 
                WHERE w.tenant_id = ? 
                ORDER BY w.name ASC");
            $stmt->execute([$tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $name = isset($input['name']) ? trim($input['name']) : '';
        $location = isset($input['location']) ? trim($input['location']) : '';
        $status = isset($input['status']) ? $input['status'] : 'Active';

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Warehouse name is required."]);
            exit;
        }

        try {
            // Check for duplicate names
            $check = $pdo->prepare("SELECT id FROM inventory_warehouses WHERE name = ? AND tenant_id = ?");
            $check->execute([$name, $tenant_id]);
            if ($check->fetch()) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Warehouse name already exists."]);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO inventory_warehouses (name, location, status, tenant_id) VALUES (?, ?, ?, ?)");
            $stmt->execute([$name, $location, $status, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Warehouse created successfully.", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = isset($input['id']) ? intval($input['id']) : null;
        $name = isset($input['name']) ? trim($input['name']) : '';
        $location = isset($input['location']) ? trim($input['location']) : '';
        $status = isset($input['status']) ? $input['status'] : 'Active';

        if (!$id || empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Warehouse ID and name are required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE inventory_warehouses SET name = ?, location = ?, status = ? WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$name, $location, $status, $id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Warehouse updated successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Warehouse ID is required."]);
            exit;
        }

        try {
            // Check if there is active stock in this warehouse
            $check = $pdo->prepare("SELECT SUM(quantity) as qty FROM inventory_warehouse_stock WHERE warehouse_id = ? AND tenant_id = ?");
            $check->execute([$id, $tenant_id]);
            $result = $check->fetch();
            if ($result && $result['qty'] > 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Cannot delete warehouse containing stock. Reassign or clear inventory first."]);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM inventory_warehouses WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Warehouse deleted successfully."]);
        } catch (PDOException $e) {
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
