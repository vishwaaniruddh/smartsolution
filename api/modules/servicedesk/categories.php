<?php
// categories.php - Service Desk Categories API
require_once __DIR__ . '/../../core/db.php';

$method    = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();
header('Content-Type: application/json');

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->prepare("SELECT * FROM servicedesk_categories WHERE tenant_id = ? ORDER BY name ASC");
            $stmt->execute([$tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true) ?? [];
        $name  = trim($input['name'] ?? '');
        $desc  = trim($input['description'] ?? '');
        $color = trim($input['color'] ?? '#6366f1');

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Category name is required."]);
            exit;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO servicedesk_categories (name, description, color, tenant_id) VALUES (?, ?, ?, ?)");
            $stmt->execute([$name, $desc, $color, $tenant_id]);
            echo json_encode(["success" => true, "id" => $pdo->lastInsertId(), "message" => "Category '$name' created."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true) ?? [];
        $id    = intval($input['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Category ID is required."]);
            exit;
        }
        try {
            $fields = []; $params = [];
            if (isset($input['name']))        { $fields[] = "name = ?";        $params[] = trim($input['name']); }
            if (isset($input['description'])) { $fields[] = "description = ?"; $params[] = trim($input['description']); }
            if (isset($input['color']))       { $fields[] = "color = ?";       $params[] = trim($input['color']); }
            if (isset($input['is_active']))   { $fields[] = "is_active = ?";   $params[] = intval($input['is_active']); }
            $params[] = $id; $params[] = $tenant_id;
            $pdo->prepare("UPDATE servicedesk_categories SET " . implode(', ', $fields) . " WHERE id = ? AND tenant_id = ?")->execute($params);
            echo json_encode(["success" => true, "message" => "Category updated."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Category ID is required."]);
            exit;
        }
        try {
            $pdo->prepare("DELETE FROM servicedesk_categories WHERE id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Category deleted."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
}
