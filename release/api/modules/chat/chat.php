<?php
// api/modules/chat/chat.php
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/jwt.php'; // ensure authentication functions are loaded

header('Content-Type: application/json');

$token = getBearerToken();
if (!$token) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized"]);
    exit();
}
$decoded = jwt_decode($token);
if (!$decoded || !isset($decoded['user_id'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Invalid token"]);
    exit();
}

$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$decoded['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized user"]);
    exit();
}

$action = $_GET['action'] ?? '';

try {
    if ($action === 'contacts') {
        // Fetch contacts based on role
        $role = $user['role'];
        $tenant_id = $user['tenant_id'];
        $user_id = $user['id'];
        
        $contacts = [];
        
        if ($role === 'Superadmin') {
            // Superadmin can see everyone
            $stmt = $pdo->prepare("
                SELECT u.id, u.first_name, u.last_name, u.role, u.email, u.profile_photo,
                    (SELECT MAX(created_at) FROM chat_messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)) as last_message_time
                FROM users u 
                WHERE u.id != ?
                ORDER BY last_message_time DESC, u.first_name ASC
            ");
            $stmt->execute([$user_id, $user_id, $user_id]);
            $contacts = $stmt->fetchAll();
        } else {
            // Tenant Users can see users in their tenant OR Superadmins
            $stmt = $pdo->prepare("
                SELECT u.id, u.first_name, u.last_name, u.role, u.email, u.profile_photo,
                    (SELECT MAX(created_at) FROM chat_messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)) as last_message_time
                FROM users u 
                WHERE (u.tenant_id = ? OR u.role = 'Superadmin') AND u.id != ?
                ORDER BY last_message_time DESC, u.first_name ASC
            ");
            $stmt->execute([$user_id, $user_id, $tenant_id, $user_id]);
            $contacts = $stmt->fetchAll();
        }
        
        // Fetch unread counts for these contacts
        $unread_stmt = $pdo->prepare("SELECT sender_id, COUNT(*) as unread_count FROM chat_messages WHERE receiver_id = ? AND is_read = 0 GROUP BY sender_id");
        $unread_stmt->execute([$user_id]);
        $unreads = $unread_stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        foreach ($contacts as &$contact) {
            $contact['unread_count'] = isset($unreads[$contact['id']]) ? (int)$unreads[$contact['id']] : 0;
        }
        
        echo json_encode(["success" => true, "data" => $contacts]);
    }
    
    elseif ($action === 'history') {
        $other_user_id = $_GET['user_id'] ?? null;
        if (!$other_user_id) {
            throw new Exception("user_id required");
        }
        
        // Mark messages as read
        $update_stmt = $pdo->prepare("UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?");
        $update_stmt->execute([$other_user_id, $user['id']]);
        
        $stmt = $pdo->prepare("
            SELECT * FROM chat_messages 
            WHERE (sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?) 
            ORDER BY created_at ASC
        ");
        $stmt->execute([$user['id'], $other_user_id, $other_user_id, $user['id']]);
        $messages = $stmt->fetchAll();
        
        echo json_encode(["success" => true, "data" => $messages]);
    }
    
    elseif ($action === 'message' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $receiver_id = $input['receiver_id'] ?? $_POST['receiver_id'] ?? null;
        $message = $input['message'] ?? $_POST['message'] ?? '';
        
        if (!$receiver_id && (!isset($_FILES['attachment']) || $_FILES['attachment']['error'] !== UPLOAD_ERR_OK)) {
            throw new Exception("receiver_id is required");
        }
        
        $attachment_path = null;
        $attachment_name = null;
        
        if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
            $file_tmp = $_FILES['attachment']['tmp_name'];
            $file_name = $_FILES['attachment']['name'];
            $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
            
            // Build directory: uploads/tenant-{tenant_id}/chat/user-{user_id}/
            $tenant_dir = $user['tenant_id'] ? "tenant-" . $user['tenant_id'] : "superadmin";
            $upload_dir = __DIR__ . '/../../uploads/' . $tenant_dir . '/chat/user-' . $user['id'];
            
            if (!file_exists($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }
            
            $new_file_name = uniqid('file_', true) . '.' . $file_ext;
            $dest_path = $upload_dir . '/' . $new_file_name;
            
            if (move_uploaded_file($file_tmp, $dest_path)) {
                $attachment_path = 'uploads/' . $tenant_dir . '/chat/user-' . $user['id'] . '/' . $new_file_name;
                $attachment_name = $file_name;
            }
        }
        
        $stmt = $pdo->prepare("INSERT INTO chat_messages (sender_id, receiver_id, message, attachment_path, attachment_name) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$user['id'], $receiver_id, trim($message), $attachment_path, $attachment_name]);
        $last_id = $pdo->lastInsertId();
        
        $fetch_stmt = $pdo->prepare("SELECT * FROM chat_messages WHERE id = ?");
        $fetch_stmt->execute([$last_id]);
        $new_msg = $fetch_stmt->fetch();
        
        echo json_encode(["success" => true, "data" => $new_msg]);
    }
    
    elseif ($action === 'sync') {
        // Fetch new messages since last_id
        $last_id = isset($_GET['last_id']) ? intval($_GET['last_id']) : 0;
        
        $stmt = $pdo->prepare("
            SELECT * FROM chat_messages 
            WHERE (receiver_id = ? OR sender_id = ?) AND id > ? 
            ORDER BY created_at ASC
        ");
        $stmt->execute([$user['id'], $user['id'], $last_id]);
        $messages = $stmt->fetchAll();
        
        echo json_encode(["success" => true, "data" => $messages]);
    }
    
    elseif ($action === 'mark_read') {
        $input = json_decode(file_get_contents('php://input'), true);
        $sender_id = $input['sender_id'] ?? null;
        if ($sender_id) {
            $update_stmt = $pdo->prepare("UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?");
            $update_stmt->execute([$sender_id, $user['id']]);
            echo json_encode(["success" => true]);
        } else {
            throw new Exception("sender_id required");
        }
    }
    
    else {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid action"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
