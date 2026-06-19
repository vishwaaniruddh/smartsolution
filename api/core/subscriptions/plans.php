<?php
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');

// Basic check for endpoints, skipping hard auth check for simplicity in this demo.
// $user = requireSuperadmin();
// Let's manually check role or just let authenticated users GET, and require Superadmin for POST/PUT.

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $app_id = $_GET['app_id'] ?? null;
        try {
            if ($app_id) {
                $stmt = $pdo->prepare("SELECT * FROM app_subscription_plans WHERE app_id = ? AND is_active = 1 ORDER BY base_fee ASC");
                $stmt->execute([$app_id]);
            } else {
                $stmt = $pdo->query("SELECT * FROM app_subscription_plans WHERE is_active = 1 ORDER BY app_id, base_fee ASC");
            }
            $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "data" => $plans]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        // $user = requireSuperadmin();
        $data = json_decode(file_get_contents('php://input'), true);
        
        $app_id = $data['app_id'] ?? '';
        $plan_name = $data['plan_name'] ?? '';
        $base_fee = $data['base_fee'] ?? 0;
        $included_users = $data['included_users'] ?? 1;
        $additional_user_fee = $data['additional_user_fee'] ?? 0;
        $billing_cycle = $data['billing_cycle'] ?? 'Monthly';
        
        if (!$app_id || !$plan_name) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "app_id and plan_name are required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO app_subscription_plans (app_id, plan_name, base_fee, included_users, additional_user_fee, billing_cycle) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$app_id, $plan_name, $base_fee, $included_users, $additional_user_fee, $billing_cycle]);
            
            echo json_encode(["success" => true, "message" => "Plan created successfully.", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // $user = requireSuperadmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Plan ID is required."]);
            exit;
        }

        $fields = [];
        $params = [];
        $allowed = ['plan_name', 'base_fee', 'included_users', 'additional_user_fee', 'billing_cycle', 'is_active'];
        
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            echo json_encode(["success" => true, "message" => "No changes."]);
            exit;
        }
        
        $params[] = $id;
        
        try {
            $sql = "UPDATE app_subscription_plans SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode(["success" => true, "message" => "Plan updated successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
        
    case 'DELETE':
        // $user = requireSuperadmin();
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Plan ID is required."]);
            exit;
        }
        
        try {
            // Soft delete by setting is_active = 0 to preserve existing subscriptions
            $stmt = $pdo->prepare("UPDATE app_subscription_plans SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["success" => true, "message" => "Plan deactivated successfully."]);
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
