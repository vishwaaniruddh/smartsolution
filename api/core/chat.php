<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

$token = getBearerToken();
if (!$token) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized - No token provided"]);
    exit();
}

$decoded = jwt_decode($token);
if (!$decoded || !isset($decoded->id)) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized - Invalid token"]);
    exit();
}

$current_user_id = $decoded->id;

switch ($method) {
    case 'GET':
        $contact_id = isset($_GET['contact_id']) ? intval($_GET['contact_id']) : 0;
        if (!$contact_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Contact ID is required"]);
            exit();
        }
        
        try {
            $stmt = $pdo->prepare("
                SELECT * FROM chat_messages 
                WHERE (sender_id = ? AND receiver_id = ?) 
                   OR (sender_id = ? AND receiver_id = ?) 
                ORDER BY created_at ASC
            ");
            $stmt->execute([$current_user_id, $contact_id, $contact_id, $current_user_id]);
            $messages = $stmt->fetchAll();
            
            // Mark received messages as read
            $updateStmt = $pdo->prepare("UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0");
            $updateStmt->execute([$contact_id, $current_user_id]);
            
            echo json_encode(["success" => true, "data" => $messages]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $receiver_id = isset($input['receiver_id']) ? intval($input['receiver_id']) : 0;
        $message = isset($input['message']) ? trim($input['message']) : '';
        
        if (!$receiver_id || empty($message)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Receiver ID and message are required"]);
            exit();
        }
        
        try {
            $stmt = $pdo->prepare("INSERT INTO chat_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)");
            $stmt->execute([$current_user_id, $receiver_id, $message]);
            
            $msg_id = $pdo->lastInsertId();
            
            $getStmt = $pdo->prepare("SELECT * FROM chat_messages WHERE id = ?");
            $getStmt->execute([$msg_id]);
            $newMsg = $getStmt->fetch();
            
            echo json_encode(["success" => true, "data" => $newMsg]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
