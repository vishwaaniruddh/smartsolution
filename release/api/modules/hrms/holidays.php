<?php
// HRMS Holidays API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $year = $_GET['year'] ?? date('Y');
        $stmt = $pdo->prepare("SELECT * FROM hrms_holidays WHERE tenant_id = ? AND YEAR(date) = ? ORDER BY date ASC");
        $stmt->execute([$tenant_id, $year]);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $name = $input['name'] ?? '';
        $date = $input['date'] ?? null;

        if (empty($name) || !$date) {
            echo json_encode(["success" => false, "error" => "Holiday name and date are required."]);
            exit;
        }

        // Check duplicate
        $check = $pdo->prepare("SELECT id FROM hrms_holidays WHERE date = ? AND tenant_id = ?");
        $check->execute([$date, $tenant_id]);
        if ($check->fetch()) {
            echo json_encode(["success" => false, "error" => "A holiday already exists on this date."]);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO hrms_holidays (name, date, tenant_id) VALUES (?, ?, ?)");
        $stmt->execute([$name, $date, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Holiday added.", "id" => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = $input['id'] ?? null;
        $name = $input['name'] ?? '';
        $date = $input['date'] ?? null;

        if (!$id) {
            echo json_encode(["success" => false, "error" => "Holiday ID is required."]);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE hrms_holidays SET name = ?, date = ? WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$name, $date, $id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Holiday updated."]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            echo json_encode(["success" => false, "error" => "Holiday ID is required."]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM hrms_holidays WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Holiday deleted."]);
        break;
}
?>
