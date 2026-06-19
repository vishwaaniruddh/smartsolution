<?php
// activity.php - Service Desk Activity Log API
require_once __DIR__ . '/../../core/db.php';

$tenant_id = getTenantId();
header('Content-Type: application/json');

$ticket_id = isset($_GET['ticket_id']) ? intval($_GET['ticket_id']) : 0;

try {
    if ($ticket_id) {
        $stmt = $pdo->prepare("SELECT * FROM servicedesk_activity_log WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at ASC");
        $stmt->execute([$ticket_id, $tenant_id]);
    } else {
        $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 20;
        $stmt  = $pdo->prepare("SELECT a.*, t.ticket_number, t.subject FROM servicedesk_activity_log a JOIN servicedesk_tickets t ON t.id = a.ticket_id WHERE a.tenant_id = ? ORDER BY a.created_at DESC LIMIT $limit");
        $stmt->execute([$tenant_id]);
    }
    echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
