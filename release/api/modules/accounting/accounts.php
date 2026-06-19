<?php
// accounts.php - Chart of Accounts CRUD API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

header('Content-Type: application/json');

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->prepare("SELECT * FROM accounting_accounts WHERE tenant_id = ? ORDER BY code ASC");
            $stmt->execute([$tenant_id]);
            $accounts = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $accounts]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $code = isset($input['code']) ? trim($input['code']) : '';
        $name = isset($input['name']) ? trim($input['name']) : '';
        $type = isset($input['type']) ? trim($input['type']) : '';
        $parent_id = isset($input['parent_id']) && intval($input['parent_id']) > 0 ? intval($input['parent_id']) : null;

        if (empty($code) || empty($name) || empty($type)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Account code, name, and type are required."]);
            exit;
        }

        $allowed_types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
        if (!in_main($type, $allowed_types) && !in_array($type, $allowed_types)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid account type. Allowed: Asset, Liability, Equity, Revenue, Expense."]);
            exit;
        }

        try {
            // Check for duplicate code
            $check = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = ? AND tenant_id = ?");
            $check->execute([$code, $tenant_id]);
            if ($check->fetch()) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Account code '$code' already exists."]);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO accounting_accounts (code, name, type, parent_id, tenant_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$code, $name, $type, $parent_id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Account created successfully.", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = isset($input['id']) ? intval($input['id']) : null;
        $name = isset($input['name']) ? trim($input['name']) : '';
        $is_active = isset($input['is_active']) ? intval($input['is_active']) : 1;

        if (!$id || empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Account ID and name are required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE accounting_accounts SET name = ?, is_active = ? WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$name, $is_active, $id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Account updated successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Account ID is required."]);
            exit;
        }

        try {
            // Check if there are journal items posted to this account
            $check = $pdo->prepare("SELECT COUNT(*) as cnt FROM accounting_journal_items WHERE account_id = ? AND tenant_id = ?");
            $check->execute([$id, $tenant_id]);
            if (intval($check->fetch()['cnt']) > 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Cannot delete account with existing transactions in ledger."]);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM accounting_accounts WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Account deleted successfully."]);
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
?>
