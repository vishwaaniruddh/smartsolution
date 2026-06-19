<?php
// comments.php - Service Desk Comments API
require_once __DIR__ . '/../../core/db.php';

$method    = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();
header('Content-Type: application/json');

switch ($method) {
    case 'GET':
        $ticket_id = isset($_GET['ticket_id']) ? intval($_GET['ticket_id']) : 0;
        if (!$ticket_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "ticket_id is required."]);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT * FROM servicedesk_comments WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at ASC");
            $stmt->execute([$ticket_id, $tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input      = json_decode(file_get_contents("php://input"), true) ?? [];
        $ticket_id  = intval($input['ticket_id'] ?? 0);
        $author_id  = intval($input['author_id'] ?? 0);
        $author_name = trim($input['author_name'] ?? '');
        $author_role = trim($input['author_role'] ?? 'User');
        $body       = trim($input['body'] ?? '');
        $is_internal = intval($input['is_internal'] ?? 0);

        if (!$ticket_id || !$author_id || empty($body)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "ticket_id, author_id, and body are required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO servicedesk_comments (ticket_id, author_id, author_name, author_role, body, is_internal, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$ticket_id, $author_id, $author_name, $author_role, $body, $is_internal, $tenant_id]);
            $comment_id = $pdo->lastInsertId();

            // Update ticket updated_at
            $pdo->prepare("UPDATE servicedesk_tickets SET updated_at = NOW() WHERE id = ? AND tenant_id = ?")->execute([$ticket_id, $tenant_id]);

            // Log activity
            $note = $is_internal ? 'internal_note_added' : 'comment_added';
            $pdo->prepare("INSERT INTO servicedesk_activity_log (ticket_id, actor_name, action, old_value, new_value, tenant_id) VALUES (?, ?, ?, NULL, ?, ?)")
                ->execute([$ticket_id, $author_name, $note, substr($body, 0, 100), $tenant_id]);

            echo json_encode(["success" => true, "id" => $comment_id, "message" => "Comment added."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Comment ID is required."]);
            exit;
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM servicedesk_comments WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Comment deleted."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
}
