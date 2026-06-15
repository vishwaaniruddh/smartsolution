<?php
// activities.php
require_once 'db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Retrieve activities.
        // Optional filter: ?lead_id=X or ?agent_name=Y
        $lead_id = isset($_GET['lead_id']) ? intval($_GET['lead_id']) : null;
        $agent_name = isset($_GET['agent_name']) ? $_GET['agent_name'] : null;

        try {
            $tenant_id = getTenantId();
            if ($lead_id !== null) {
                $stmt = $pdo->prepare("SELECT * FROM lead_activities WHERE lead_id = ? AND tenant_id = ? ORDER BY logged_at DESC");
                $stmt->execute([$lead_id, $tenant_id]);
            } elseif ($agent_name !== null) {
                $stmt = $pdo->prepare("SELECT * FROM lead_activities WHERE agent_name = ? AND tenant_id = ? ORDER BY logged_at DESC");
                $stmt->execute([$agent_name, $tenant_id]);
            } else {
                $stmt = $pdo->prepare("SELECT * FROM lead_activities WHERE tenant_id = ? ORDER BY logged_at DESC");
                $stmt->execute([$tenant_id]);
            }
            $activities = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $activities]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Log a new activity
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['lead_id']) && isset($data['agent_name']) && isset($data['activity_type']) && isset($data['details'])) {
            try {
                $tenant_id = getTenantId();
                $stmt = $pdo->prepare("INSERT INTO lead_activities (lead_id, agent_name, activity_type, details, tenant_id) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([
                    intval($data['lead_id']),
                    $data['agent_name'],
                    $data['activity_type'],
                    $data['details'],
                    $tenant_id
                ]);
                $id = $pdo->lastInsertId();
                echo json_encode(["success" => true, "message" => "Activity logged successfully", "id" => $id]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing required fields"]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
?>
