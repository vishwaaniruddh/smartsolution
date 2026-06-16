<?php
// HRMS Designations API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $department_id = $_GET['department_id'] ?? null;
        
        if ($department_id) {
            $stmt = $pdo->prepare("SELECT des.*, d.name as department_name FROM hrms_designations des 
                LEFT JOIN hrms_departments d ON des.department_id = d.id 
                WHERE des.department_id = ? AND des.tenant_id = ? ORDER BY des.name ASC");
            $stmt->execute([$department_id, $tenant_id]);
        } else {
            $stmt = $pdo->prepare("SELECT des.*, d.name as department_name FROM hrms_designations des 
                LEFT JOIN hrms_departments d ON des.department_id = d.id 
                WHERE des.tenant_id = ? ORDER BY des.name ASC");
            $stmt->execute([$tenant_id]);
        }
        echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $name = $input['name'] ?? '';
        $department_id = $input['department_id'] ?? null;

        if (empty($name)) {
            echo json_encode(["success" => false, "error" => "Designation name is required."]);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO hrms_designations (name, department_id, tenant_id) VALUES (?, ?, ?)");
        $stmt->execute([$name, $department_id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Designation created.", "id" => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = $input['id'] ?? null;
        $name = $input['name'] ?? '';
        $department_id = $input['department_id'] ?? null;

        if (!$id || empty($name)) {
            echo json_encode(["success" => false, "error" => "Designation ID and name are required."]);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE hrms_designations SET name = ?, department_id = ? WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$name, $department_id, $id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Designation updated."]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            echo json_encode(["success" => false, "error" => "Designation ID is required."]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM hrms_designations WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Designation deleted."]);
        break;
}
?>
