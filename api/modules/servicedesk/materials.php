<?php
// materials.php - Service Desk Material Requests API
require_once __DIR__ . '/../../core/db.php';

$method    = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();
header('Content-Type: application/json');

function logActivity($pdo, $ticket_id, $actor_name, $action, $old_value, $new_value, $tenant_id) {
    $stmt = $pdo->prepare("INSERT INTO servicedesk_activity_log (ticket_id, actor_name, action, old_value, new_value, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$ticket_id, $actor_name, $action, $old_value, $new_value, $tenant_id]);
}

switch ($method) {
    case 'GET':
        $ticket_id = isset($_GET['ticket_id']) ? intval($_GET['ticket_id']) : 0;
        try {
            if ($ticket_id) {
                $stmt = $pdo->prepare("SELECT * FROM servicedesk_material_requests WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at DESC");
                $stmt->execute([$ticket_id, $tenant_id]);
            } else {
                $stmt = $pdo->prepare("SELECT * FROM servicedesk_material_requests WHERE tenant_id = ? ORDER BY created_at DESC");
                $stmt->execute([$tenant_id]);
            }
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true) ?? [];
        $ticket_id    = intval($input['ticket_id'] ?? 0);
        $material     = trim($input['material_name'] ?? '');
        $quantity     = floatval($input['quantity'] ?? 1);
        $unit         = trim($input['unit'] ?? 'pcs');
        $remarks      = trim($input['remarks'] ?? '');
        $req_by       = intval($input['requested_by'] ?? 1);
        $req_by_name  = trim($input['requested_by_name'] ?? 'User');

        if (!$ticket_id || empty($material)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "ticket_id and material_name are required."]);
            exit;
        }

        try {
            // Verify ticket exists
            $tchk = $pdo->prepare("SELECT ticket_number FROM servicedesk_tickets WHERE id = ? AND tenant_id = ?");
            $tchk->execute([$ticket_id, $tenant_id]);
            $tnum = $tchk->fetchColumn();
            if (!$tnum) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Ticket not found."]);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO servicedesk_material_requests (ticket_id, material_name, quantity, unit, status, requested_by, requested_by_name, remarks, tenant_id) VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?)");
            $stmt->execute([$ticket_id, $material, $quantity, $unit, $req_by, $req_by_name, $remarks, $tenant_id]);
            $req_id = $pdo->lastInsertId();

            logActivity($pdo, $ticket_id, $req_by_name, 'material_requested', null, "$material ($quantity $unit)", $tenant_id);

            echo json_encode(["success" => true, "id" => $req_id, "message" => "Material request added."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true) ?? [];
        $id         = intval($input['id'] ?? 0);
        $actor_name = trim($input['actor_name'] ?? 'System');

        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Request ID is required."]);
            exit;
        }

        try {
            // Fetch current request
            $rstmt = $pdo->prepare("SELECT * FROM servicedesk_material_requests WHERE id = ? AND tenant_id = ?");
            $rstmt->execute([$id, $tenant_id]);
            $current = $rstmt->fetch();

            if (!$current) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Material request not found."]);
                exit;
            }

            $fields = [];
            $params = [];

            if (isset($input['status']) && $input['status'] !== $current['status']) {
                $fields[] = "status = ?";
                $params[] = $input['status'];
                logActivity($pdo, $current['ticket_id'], $actor_name, 'material_status_changed', $current['material_name'] . ': ' . $current['status'], $input['status'], $tenant_id);
            }
            if (isset($input['material_name'])) {
                $fields[] = "material_name = ?";
                $params[] = trim($input['material_name']);
            }
            if (isset($input['quantity'])) {
                $fields[] = "quantity = ?";
                $params[] = floatval($input['quantity']);
            }
            if (isset($input['unit'])) {
                $fields[] = "unit = ?";
                $params[] = trim($input['unit']);
            }
            if (isset($input['remarks'])) {
                $fields[] = "remarks = ?";
                $params[] = trim($input['remarks']);
            }

            if (empty($fields)) {
                echo json_encode(["success" => true, "message" => "No changes to apply."]);
                exit;
            }

            $params[] = $id;
            $params[] = $tenant_id;
            $stmt = $pdo->prepare("UPDATE servicedesk_material_requests SET " . implode(', ', $fields) . " WHERE id = ? AND tenant_id = ?");
            $stmt->execute($params);

            echo json_encode(["success" => true, "message" => "Material request updated."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Request ID is required."]);
            exit;
        }

        try {
            $rstmt = $pdo->prepare("SELECT * FROM servicedesk_material_requests WHERE id = ? AND tenant_id = ?");
            $rstmt->execute([$id, $tenant_id]);
            $req = $rstmt->fetch();

            if ($req) {
                $stmt = $pdo->prepare("DELETE FROM servicedesk_material_requests WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                logActivity($pdo, $req['ticket_id'], 'System', 'material_request_deleted', $req['material_name'], null, $tenant_id);
            }
            echo json_encode(["success" => true, "message" => "Material request deleted."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
}
