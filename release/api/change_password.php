<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $input['user_id'] ?? null;
    $current_password = $input['current_password'] ?? '';
    $new_password = $input['new_password'] ?? '';

    if (!$user_id || !$current_password || !$new_password) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "User ID, current password, and new password are required."]);
        exit();
    }

    try {
        // Get current user data
        $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "User not found."]);
            exit();
        }

        // Verify current password
        if (!password_verify($current_password, $user['password'])) {
            http_response_code(401);
            echo json_encode(["success" => false, "error" => "Incorrect current password."]);
            exit();
        }

        // Update with new password
        $hashed_password = password_hash($new_password, PASSWORD_BCRYPT);
        $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $updateStmt->execute([$hashed_password, $user_id]);

        echo json_encode(["success" => true, "message" => "Password changed successfully."]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Failed to change password: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>
