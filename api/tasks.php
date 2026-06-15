<?php
// tasks.php
require_once 'db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Retrieve tasks for this tenant.
        // Optional filter: ?agent_name=Y
        $agent_name = isset($_GET['agent_name']) ? $_GET['agent_name'] : null;

        try {
            $tenant_id = getTenantId();
            if ($agent_name !== null) {
                $stmt = $pdo->prepare("SELECT t.*, l.name as lead_name FROM tasks t LEFT JOIN leads l ON t.lead_id = l.id WHERE t.agent_name = ? AND t.tenant_id = ? ORDER BY t.due_date ASC, t.created_at DESC");
                $stmt->execute([$agent_name, $tenant_id]);
            } else {
                $stmt = $pdo->prepare("SELECT t.*, l.name as lead_name FROM tasks t LEFT JOIN leads l ON t.lead_id = l.id WHERE t.tenant_id = ? ORDER BY t.due_date ASC, t.created_at DESC");
                $stmt->execute([$tenant_id]);
            }
            $tasks = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $tasks]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Create a new task
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['agent_name']) && isset($data['title']) && isset($data['due_date'])) {
            try {
                $tenant_id = getTenantId();
                $lead_id = isset($data['lead_id']) && $data['lead_id'] !== '' ? intval($data['lead_id']) : null;
                $status = isset($data['status']) ? $data['status'] : 'Pending';

                $stmt = $pdo->prepare("INSERT INTO tasks (lead_id, agent_name, title, due_date, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $lead_id,
                    $data['agent_name'],
                    $data['title'],
                    $data['due_date'],
                    $status,
                    $tenant_id
                ]);
                $id = $pdo->lastInsertId();
                echo json_encode(["success" => true, "message" => "Task created successfully", "id" => $id]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing required fields"]);
        }
        break;

    case 'PUT':
        // Update task status (e.g. mark as Completed)
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['id'])) {
            try {
                $fields = [];
                $params = [];
                
                if (isset($data['status'])) {
                    $fields[] = "`status` = ?";
                    $params[] = $data['status'];
                }
                if (isset($data['title'])) {
                    $fields[] = "`title` = ?";
                    $params[] = $data['title'];
                }
                if (isset($data['due_date'])) {
                    $fields[] = "`due_date` = ?";
                    $params[] = $data['due_date'];
                }

                if (count($fields) > 0) {
                    $tenant_id = getTenantId();
                    $params[] = intval($data['id']);
                    $params[] = $tenant_id;
                    $sql = "UPDATE tasks SET " . implode(", ", $fields) . " WHERE id = ? AND tenant_id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    echo json_encode(["success" => true, "message" => "Task updated successfully"]);
                } else {
                    echo json_encode(["success" => false, "error" => "No fields to update"]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing task ID"]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
?>
