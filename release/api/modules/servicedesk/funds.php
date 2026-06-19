<?php
// funds.php - Service Desk Fund Requests API
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
                $stmt = $pdo->prepare("SELECT * FROM servicedesk_fund_requests WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at DESC");
                $stmt->execute([$ticket_id, $tenant_id]);
            } else {
                $stmt = $pdo->prepare("SELECT * FROM servicedesk_fund_requests WHERE tenant_id = ? ORDER BY created_at DESC");
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
        $amount       = floatval($input['amount'] ?? 0);
        $method_pay   = trim($input['payment_method'] ?? 'Cash');
        $pay_details  = trim($input['payment_details'] ?? '');
        $remarks      = trim($input['remarks'] ?? '');
        $req_by       = intval($input['requested_by'] ?? 1);
        $req_by_name  = trim($input['requested_by_name'] ?? 'User');

        if (!$ticket_id || $amount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "ticket_id and a valid amount are required."]);
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

            $stmt = $pdo->prepare("INSERT INTO servicedesk_fund_requests (ticket_id, amount, payment_method, payment_details, status, requested_by, requested_by_name, remarks, tenant_id) VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?)");
            $stmt->execute([$ticket_id, $amount, $method_pay, $pay_details, $req_by, $req_by_name, $remarks, $tenant_id]);
            $req_id = $pdo->lastInsertId();

            logActivity($pdo, $ticket_id, $req_by_name, 'fund_requested', null, "$amount via $method_pay", $tenant_id);

            echo json_encode(["success" => true, "id" => $req_id, "message" => "Fund request added."]);
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
            $rstmt = $pdo->prepare("SELECT * FROM servicedesk_fund_requests WHERE id = ? AND tenant_id = ?");
            $rstmt->execute([$id, $tenant_id]);
            $current = $rstmt->fetch();

            if (!$current) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Fund request not found."]);
                exit;
            }

            $fields = [];
            $params = [];

            if (isset($input['status']) && $input['status'] !== $current['status']) {
                $fields[] = "status = ?";
                $params[] = $input['status'];
                logActivity($pdo, $current['ticket_id'], $actor_name, 'fund_status_changed', 'Amount ' . $current['amount'] . ': ' . $current['status'], $input['status'], $tenant_id);
            }
            if (isset($input['amount'])) {
                $fields[] = "amount = ?";
                $params[] = floatval($input['amount']);
            }
            if (isset($input['payment_method'])) {
                $fields[] = "payment_method = ?";
                $params[] = trim($input['payment_method']);
            }
            if (isset($input['payment_details'])) {
                $fields[] = "payment_details = ?";
                $params[] = trim($input['payment_details']);
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
            $stmt = $pdo->prepare("UPDATE servicedesk_fund_requests SET " . implode(', ', $fields) . " WHERE id = ? AND tenant_id = ?");
            $stmt->execute($params);

            echo json_encode(["success" => true, "message" => "Fund request updated."]);
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
            $rstmt = $pdo->prepare("SELECT * FROM servicedesk_fund_requests WHERE id = ? AND tenant_id = ?");
            $rstmt->execute([$id, $tenant_id]);
            $req = $rstmt->fetch();

            if ($req) {
                $stmt = $pdo->prepare("DELETE FROM servicedesk_fund_requests WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                logActivity($pdo, $req['ticket_id'], 'System', 'fund_request_deleted', 'Amount: ' . $req['amount'], null, $tenant_id);
            }
            echo json_encode(["success" => true, "message" => "Fund request deleted."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
}
