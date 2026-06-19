<?php
// auth.php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        // Handle User Login
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            $data = $_POST;
        }

        $email = isset($data['email']) ? trim($data['email']) : '';
        $password = isset($data['password']) ? $data['password'] : '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Email and Password are required."]);
            exit();
        }

        try {
            // Find user in database
            $stmt = $pdo->prepare("SELECT u.*, t.name as tenant_name, t.currency_name, t.currency_symbol, t.is_deleted as tenant_deleted FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE u.email = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password'])) {
                if ($user['role'] !== 'Superadmin' && isset($user['tenant_deleted']) && intval($user['tenant_deleted']) === 1) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "error" => "This organization workspace has been suspended. Please contact system administrator."]);
                    exit();
                }
                unset($user['password']); // security
                
                // Fetch allowed apps
                if ($user['role'] === 'Superadmin') {
                    $user['apps'] = ['crm', 'hrms', 'accounting', 'inventory', 'servicedesk'];
                } else if ($user['role'] === 'Admin') {
                    $astmt = $pdo->prepare("SELECT app_id FROM tenant_apps WHERE tenant_id = ?");
                    $astmt->execute([$user['tenant_id']]);
                    $user['apps'] = $astmt->fetchAll(PDO::FETCH_COLUMN);
                } else {
                    $astmt = $pdo->prepare("SELECT app_id FROM user_apps WHERE user_id = ?");
                    $astmt->execute([$user['id']]);
                    $user['apps'] = $astmt->fetchAll(PDO::FETCH_COLUMN);
                }
                
                echo json_encode([
                    "success" => true,
                    "message" => "Login successful",
                    "user" => $user
                ]);
            } else {
                http_response_code(401);
                echo json_encode(["success" => false, "error" => "Invalid email or password."]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Handle marking first login as acknowledged (is_first_login = 0)
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            $data = $_POST;
        }

        $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

        if ($user_id === null) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "User ID is required."]);
            exit();
        }

        try {
            $stmt = $pdo->prepare("UPDATE users SET is_first_login = 0 WHERE id = ?");
            $stmt->execute([$user_id]);
            echo json_encode(["success" => true, "message" => "First login flag updated successfully."]);
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
