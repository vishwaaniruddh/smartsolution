<?php
// HRMS Departments API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare("SELECT d.*, 
            (SELECT COUNT(*) FROM hrms_employees e WHERE e.department_id = d.id AND e.tenant_id = d.tenant_id) as employee_count,
            (SELECT CONCAT(emp.first_name, ' ', emp.last_name) FROM hrms_employees emp WHERE emp.id = d.head_employee_id LIMIT 1) as head_name
            FROM hrms_departments d WHERE d.tenant_id = ? ORDER BY d.name ASC");
        $stmt->execute([$tenant_id]);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $name = $input['name'] ?? '';
        $description = $input['description'] ?? '';
        $head_employee_id = $input['head_employee_id'] ?? null;

        if (empty($name)) {
            echo json_encode(["success" => false, "error" => "Department name is required."]);
            exit;
        }

        // Check duplicate
        $check = $pdo->prepare("SELECT id FROM hrms_departments WHERE name = ? AND tenant_id = ?");
        $check->execute([$name, $tenant_id]);
        if ($check->fetch()) {
            echo json_encode(["success" => false, "error" => "Department already exists."]);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO hrms_departments (name, description, head_employee_id, tenant_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $description, $head_employee_id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Department created.", "id" => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = $input['id'] ?? null;
        $name = $input['name'] ?? '';
        $description = $input['description'] ?? '';
        $head_employee_id = $input['head_employee_id'] ?? null;

        if (!$id || empty($name)) {
            echo json_encode(["success" => false, "error" => "Department ID and name are required."]);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE hrms_departments SET name = ?, description = ?, head_employee_id = ? WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$name, $description, $head_employee_id, $id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Department updated."]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            echo json_encode(["success" => false, "error" => "Department ID is required."]);
            exit;
        }

        // Check if employees exist in this department
        $check = $pdo->prepare("SELECT COUNT(*) as cnt FROM hrms_employees WHERE department_id = ? AND tenant_id = ?");
        $check->execute([$id, $tenant_id]);
        $result = $check->fetch();
        if ($result['cnt'] > 0) {
            echo json_encode(["success" => false, "error" => "Cannot delete department with active employees. Reassign employees first."]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM hrms_departments WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Department deleted."]);
        break;
}
?>
