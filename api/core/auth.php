<?php
// auth.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

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

        // --- Custom Log ---
        $logFile = __DIR__ . '/../api_log.txt';
        $logData = "[" . date('Y-m-d H:i:s') . "] AUTH REQUEST\nPayload: " . json_encode($data) . "\n";
        file_put_contents($logFile, $logData, FILE_APPEND);
        // ------------------

        if (empty($email) || empty($password)) {
            http_response_code(400);
            $res = ["success" => false, "error" => "Email and Password are required."];
            file_put_contents($logFile, "Response (400): " . json_encode($res) . "\n\n", FILE_APPEND);
            echo json_encode($res);
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
                    $res = ["success" => false, "error" => "This organization workspace has been suspended. Please contact system administrator."];
                    file_put_contents($logFile, "Response (403): " . json_encode($res) . "\n\n", FILE_APPEND);
                    echo json_encode($res);
                    exit();
                }
                
                // Create JWT Payload
                $payload = [
                    'user_id' => $user['id'],
                    'tenant_id' => $user['tenant_id'],
                    'role' => $user['role']
                ];
                
                // Remove password before returning
                unset($user['password']);
                
                $token = jwt_encode($payload);
                
                $res = [
                    "success" => true,
                    "message" => "Login successful",
                    "token" => $token,
                    "user" => $user
                ];
                file_put_contents($logFile, "Response (200): " . json_encode($res) . "\n\n", FILE_APPEND);
                echo json_encode($res);
            } else {
                http_response_code(401);
                $res = ["success" => false, "error" => "Invalid email or password."];
                file_put_contents($logFile, "Response (401): " . json_encode($res) . "\n\n", FILE_APPEND);
                echo json_encode($res);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            $res = ["success" => false, "error" => $e->getMessage()];
            file_put_contents($logFile, "Response (500): " . json_encode($res) . "\n\n", FILE_APPEND);
            echo json_encode($res);
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
