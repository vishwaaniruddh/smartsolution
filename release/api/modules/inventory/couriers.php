<?php
// couriers.php - Courier Shipment Tracking & Simulation API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        try {
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM inventory_couriers WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $courier = $stmt->fetch();
                if ($courier) {
                    echo json_encode(["success" => true, "data" => $courier]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Courier tracking entry not found."]);
                }
            } else {
                $stmt = $pdo->prepare("SELECT * FROM inventory_couriers WHERE tenant_id = ? ORDER BY created_at DESC");
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
        
        // Check if this is a simulation trigger
        $action = isset($_GET['action']) ? trim($_GET['action']) : (isset($input['action']) ? trim($input['action']) : '');

        if ($action === 'simulate') {
            $id = isset($input['id']) ? intval($input['id']) : null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Courier ID is required for simulation."]);
                exit;
            }

            try {
                $stmt = $pdo->prepare("SELECT status FROM inventory_couriers WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $courier = $stmt->fetch();

                if (!$courier) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Courier entry not found."]);
                    exit;
                }

                $current_status = $courier['status'];
                $next_status = $current_status;

                switch ($current_status) {
                    case 'Dispatched':
                        $next_status = 'In Transit';
                        break;
                    case 'In Transit':
                        $next_status = 'Out for Delivery';
                        break;
                    case 'Out for Delivery':
                        $next_status = 'Delivered';
                        break;
                }

                if ($next_status !== $current_status) {
                    $stmtUpdate = $pdo->prepare("UPDATE inventory_couriers SET status = ? WHERE id = ? AND tenant_id = ?");
                    $stmtUpdate->execute([$next_status, $id, $tenant_id]);
                    echo json_encode(["success" => true, "message" => "Simulation update: Status advanced to $next_status.", "status" => $next_status]);
                } else {
                    echo json_encode(["success" => true, "message" => "Courier is already Delivered.", "status" => 'Delivered']);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
            break;
        }

        // Standard Create shipment
        $name = isset($input['name']) ? trim($input['name']) : '';
        $tracking_number = isset($input['tracking_number']) ? trim($input['tracking_number']) : '';
        $courier_name = isset($input['courier_name']) ? trim($input['courier_name']) : '';
        $status = isset($input['status']) ? $input['status'] : 'Dispatched';
        $origin = isset($input['origin']) ? trim($input['origin']) : '';
        $destination = isset($input['destination']) ? trim($input['destination']) : '';
        $purchase_order_id = isset($input['purchase_order_id']) ? intval($input['purchase_order_id']) : null;

        if (empty($tracking_number) || empty($courier_name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Tracking number and Courier name are required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO inventory_couriers (name, tracking_number, courier_name, status, origin, destination, purchase_order_id, tenant_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $tracking_number, $courier_name, $status, $origin, $destination, $purchase_order_id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Courier tracker created successfully.", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = isset($input['id']) ? intval($input['id']) : null;
        $name = isset($input['name']) ? trim($input['name']) : '';
        $tracking_number = isset($input['tracking_number']) ? trim($input['tracking_number']) : '';
        $courier_name = isset($input['courier_name']) ? trim($input['courier_name']) : '';
        $status = isset($input['status']) ? $input['status'] : 'Dispatched';
        $origin = isset($input['origin']) ? trim($input['origin']) : '';
        $destination = isset($input['destination']) ? trim($input['destination']) : '';

        if (!$id || empty($tracking_number) || empty($courier_name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "ID, Tracking number, and Courier name are required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE inventory_couriers SET name = ?, tracking_number = ?, courier_name = ?, status = ?, origin = ?, destination = ? 
                WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$name, $tracking_number, $courier_name, $status, $origin, $destination, $id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Courier tracker updated successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Courier ID is required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM inventory_couriers WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Courier tracker deleted successfully."]);
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
