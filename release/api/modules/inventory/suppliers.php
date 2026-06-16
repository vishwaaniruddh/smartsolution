<?php
// suppliers.php - Suppliers Registry API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        try {
            $id = isset($_GET['id']) ? intval($_GET['id']) : null;
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM inventory_suppliers WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $supplier = $stmt->fetch();
                if ($supplier) {
                    echo json_encode(["success" => true, "data" => $supplier]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Supplier not found."]);
                }
            } else {
                $stmt = $pdo->prepare("SELECT * FROM inventory_suppliers WHERE tenant_id = ? ORDER BY name ASC");
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
        $name = isset($input['name']) ? trim($input['name']) : '';
        $contact_name = isset($input['contact_name']) ? trim($input['contact_name']) : '';
        $email = isset($input['email']) ? trim($input['email']) : '';
        $phone = isset($input['phone']) ? trim($input['phone']) : '';
        $address = isset($input['address']) ? trim($input['address']) : '';

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Supplier organization name is required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO inventory_suppliers (name, contact_name, email, phone, address, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $contact_name, $email, $phone, $address, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Supplier added successfully.", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = isset($input['id']) ? intval($input['id']) : null;
        $name = isset($input['name']) ? trim($input['name']) : '';
        $contact_name = isset($input['contact_name']) ? trim($input['contact_name']) : '';
        $email = isset($input['email']) ? trim($input['email']) : '';
        $phone = isset($input['phone']) ? trim($input['phone']) : '';
        $address = isset($input['address']) ? trim($input['address']) : '';

        if (!$id || empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Supplier ID and name are required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE inventory_suppliers SET name = ?, contact_name = ?, email = ?, phone = ?, address = ? WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$name, $contact_name, $email, $phone, $address, $id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Supplier updated successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Supplier ID is required."]);
            exit;
        }

        try {
            // Check if there are purchase orders linked to this supplier
            $check = $pdo->prepare("SELECT COUNT(*) as cnt FROM inventory_purchase_orders WHERE supplier_id = ? AND tenant_id = ?");
            $check->execute([$id, $tenant_id]);
            $result = $check->fetch();
            if ($result && $result['cnt'] > 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Cannot delete supplier with active Purchase Orders."]);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM inventory_suppliers WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Supplier deleted successfully."]);
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
