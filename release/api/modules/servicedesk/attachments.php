<?php
// attachments.php - Service Desk File Attachments API
require_once __DIR__ . '/../../core/db.php';

$method    = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();
header('Content-Type: application/json');

$upload_dir = __DIR__ . '/../../../uploads/servicedesk/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

switch ($method) {
    case 'GET':
        $ticket_id = isset($_GET['ticket_id']) ? intval($_GET['ticket_id']) : 0;
        try {
            $stmt = $pdo->prepare("SELECT * FROM servicedesk_attachments WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at ASC");
            $stmt->execute([$ticket_id, $tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $ticket_id   = intval($_POST['ticket_id'] ?? 0);
        $comment_id  = !empty($_POST['comment_id']) ? intval($_POST['comment_id']) : null;
        $uploaded_by = intval($_POST['uploaded_by'] ?? 0);
        $attachment_type = trim($_POST['attachment_type'] ?? 'General');
        $description     = !empty($_POST['description']) ? trim($_POST['description']) : null;

        if (!$ticket_id || !isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "ticket_id and file are required."]);
            exit;
        }

        $file     = $_FILES['file'];
        $allowed  = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain',
            'video/mp4', 'video/quicktime', 'video/webm', 'video/ogg'
        ];
        $max_size = 20 * 1024 * 1024; // 20MB

        if (!in_array($file['type'], $allowed)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "File type not allowed: " . $file['type']]);
            exit;
        }
        if ($file['size'] > $max_size) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "File exceeds 20MB size limit."]);
            exit;
        }

        $ext       = pathinfo($file['name'], PATHINFO_EXTENSION);
        $safe_name = 'sd_' . $ticket_id . '_' . time() . '_' . rand(100, 999) . '.' . $ext;
        $dest      = $upload_dir . $safe_name;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to save uploaded file."]);
            exit;
        }

        $file_path = 'uploads/servicedesk/' . $safe_name;

        try {
            $stmt = $pdo->prepare("INSERT INTO servicedesk_attachments (ticket_id, comment_id, file_name, file_path, file_type, file_size, uploaded_by, attachment_type, description, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$ticket_id, $comment_id, $file['name'], $file_path, $file['type'], $file['size'], $uploaded_by, $attachment_type, $description, $tenant_id]);
            echo json_encode([
                "success" => true, 
                "id" => $pdo->lastInsertId(), 
                "file_path" => $file_path, 
                "file_name" => $file['name'],
                "attachment_type" => $attachment_type,
                "description" => $description
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        try {
            $stmt = $pdo->prepare("SELECT file_path FROM servicedesk_attachments WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            $att = $stmt->fetch();
            if ($att) {
                $full_path = __DIR__ . '/../../../' . $att['file_path'];
                if (file_exists($full_path)) unlink($full_path);
                $pdo->prepare("DELETE FROM servicedesk_attachments WHERE id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);
            }
            echo json_encode(["success" => true, "message" => "Attachment deleted."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
}
