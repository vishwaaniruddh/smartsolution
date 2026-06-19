<?php
// sla.php - Service Desk SLA Policies API
require_once __DIR__ . '/../../core/db.php';

$method    = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();
header('Content-Type: application/json');

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->prepare("SELECT * FROM servicedesk_sla_policies WHERE tenant_id = ? ORDER BY FIELD(priority, 'Critical','High','Medium','Low')");
            $stmt->execute([$tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true) ?? [];
        // Accepts array of { priority, first_response_hours, resolution_hours }
        $policies = $input['policies'] ?? [];
        if (empty($policies) || !is_array($policies)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "policies array is required."]);
            exit;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO servicedesk_sla_policies (priority, first_response_hours, resolution_hours, tenant_id)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE first_response_hours = VALUES(first_response_hours), resolution_hours = VALUES(resolution_hours)");
            foreach ($policies as $p) {
                $stmt->execute([
                    trim($p['priority']),
                    intval($p['first_response_hours']),
                    intval($p['resolution_hours']),
                    $tenant_id
                ]);
            }
            echo json_encode(["success" => true, "message" => "SLA policies updated."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
}
