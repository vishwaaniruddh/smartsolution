<?php
// tickets.php - Service Desk Tickets API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

header('Content-Type: application/json');

// Helper: log activity
function logActivity($pdo, $ticket_id, $actor_name, $action, $old_value, $new_value, $tenant_id) {
    $stmt = $pdo->prepare("INSERT INTO servicedesk_activity_log (ticket_id, actor_name, action, old_value, new_value, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$ticket_id, $actor_name, $action, $old_value, $new_value, $tenant_id]);
}

// Helper: calculate SLA due date
function calcSlaDue($pdo, $priority, $tenant_id) {
    $stmt = $pdo->prepare("SELECT resolution_hours FROM servicedesk_sla_policies WHERE priority = ? AND tenant_id = ? LIMIT 1");
    $stmt->execute([$priority, $tenant_id]);
    $sla = $stmt->fetch();
    $hours = $sla ? intval($sla['resolution_hours']) : 48;
    return date('Y-m-d H:i:s', strtotime("+{$hours} hours"));
}

// Helper: generate ticket number
function genTicketNumber($pdo, $tenant_id) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_tickets WHERE tenant_id = ?");
    $stmt->execute([$tenant_id]);
    $count = intval($stmt->fetchColumn()) + 1;
    return 'TKT-' . str_pad($count, 6, '0', STR_PAD_LEFT);
}

switch ($method) {
    case 'GET':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;

        try {
            if ($id) {
                // Single ticket with comments & attachments
                $stmt = $pdo->prepare("SELECT t.*, u.first_name AS agent_first, u.last_name AS agent_last FROM servicedesk_tickets t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = ? AND t.tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $ticket = $stmt->fetch();

                if ($ticket) {
                    // Comments
                    $cstmt = $pdo->prepare("SELECT * FROM servicedesk_comments WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at ASC");
                    $cstmt->execute([$id, $tenant_id]);
                    $ticket['comments'] = $cstmt->fetchAll();

                    // Attachments
                    $astmt = $pdo->prepare("SELECT * FROM servicedesk_attachments WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at ASC");
                    $astmt->execute([$id, $tenant_id]);
                    $ticket['attachments'] = $astmt->fetchAll();

                    // Material Requests
                    $mrstmt = $pdo->prepare("SELECT * FROM servicedesk_material_requests WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at DESC");
                    $mrstmt->execute([$id, $tenant_id]);
                    $ticket['material_requests'] = $mrstmt->fetchAll();

                    // Fund Requests
                    $frstmt = $pdo->prepare("SELECT * FROM servicedesk_fund_requests WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at DESC");
                    $frstmt->execute([$id, $tenant_id]);
                    $ticket['fund_requests'] = $frstmt->fetchAll();

                    // Activity log
                    $lstmt = $pdo->prepare("SELECT * FROM servicedesk_activity_log WHERE ticket_id = ? AND tenant_id = ? ORDER BY created_at ASC");
                    $lstmt->execute([$id, $tenant_id]);
                    $ticket['activity'] = $lstmt->fetchAll();

                    echo json_encode(["success" => true, "data" => $ticket]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Ticket not found."]);
                }
            } else {
                $page   = isset($_GET['page'])  ? max(1, intval($_GET['page']))  : 1;
                $limit  = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10;
                $offset = ($page - 1) * $limit;

                $where  = ["t.tenant_id = ?"];
                $params = [$tenant_id];

                if (!empty($_GET['search'])) {
                    $s = '%' . trim($_GET['search']) . '%';
                    $where[] = "(t.ticket_number LIKE ? OR t.subject LIKE ? OR t.requester_name LIKE ?)";
                    $params[] = $s; $params[] = $s; $params[] = $s;
                }
                if (!empty($_GET['status'])) {
                    $where[] = "t.status = ?";
                    $params[] = trim($_GET['status']);
                }
                if (!empty($_GET['priority'])) {
                    $where[] = "t.priority = ?";
                    $params[] = trim($_GET['priority']);
                }
                if (!empty($_GET['category'])) {
                    $where[] = "t.category = ?";
                    $params[] = trim($_GET['category']);
                }
                if (!empty($_GET['assigned_to'])) {
                    $where[] = "t.assigned_to = ?";
                    $params[] = intval($_GET['assigned_to']);
                }
                if (!empty($_GET['requester_id'])) {
                    // My Tickets filter
                    $where[] = "t.requester_id = ?";
                    $params[] = intval($_GET['requester_id']);
                }
                if (!empty($_GET['date_from'])) {
                    $where[] = "DATE(t.created_at) >= ?";
                    $params[] = $_GET['date_from'];
                }
                if (!empty($_GET['date_to'])) {
                    $where[] = "DATE(t.created_at) <= ?";
                    $params[] = $_GET['date_to'];
                }
                if (!empty($_GET['sla_breached'])) {
                    $where[] = "t.is_sla_breached = 1";
                }

                $whereClause = implode(" AND ", $where);

                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_tickets t WHERE $whereClause");
                $countStmt->execute($params);
                $total_records = intval($countStmt->fetchColumn());
                $total_pages   = max(1, ceil($total_records / $limit));

                $stmt = $pdo->prepare("SELECT t.*, u.first_name AS agent_first, u.last_name AS agent_last FROM servicedesk_tickets t LEFT JOIN users u ON u.id = t.assigned_to WHERE $whereClause ORDER BY t.created_at DESC LIMIT $limit OFFSET $offset");
                $stmt->execute($params);
                $data = $stmt->fetchAll();

                // Update SLA breach status on fetch
                $now = date('Y-m-d H:i:s');
                foreach ($data as &$row) {
                    if ($row['sla_due_at'] && $row['sla_due_at'] < $now && !in_array($row['status'], ['Resolved', 'Closed'])) {
                        if (!$row['is_sla_breached']) {
                            $upd = $pdo->prepare("UPDATE servicedesk_tickets SET is_sla_breached = 1 WHERE id = ?");
                            $upd->execute([$row['id']]);
                            $row['is_sla_breached'] = 1;
                        }
                    }
                }

                echo json_encode([
                    "success"    => true,
                    "data"       => $data,
                    "pagination" => [
                        "page"          => $page,
                        "limit"         => $limit,
                        "total_records" => $total_records,
                        "total_pages"   => $total_pages
                    ]
                ]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true) ?? [];

        // Bulk operations
        if (!empty($input['bulk_action'])) {
            $bulk_action = $input['bulk_action'];
            $ids         = isset($input['ids']) && is_array($input['ids']) ? array_map('intval', $input['ids']) : [];
            $actor_name  = isset($input['actor_name']) ? trim($input['actor_name']) : 'System';

            if (empty($ids)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "No ticket IDs provided for bulk action."]);
                exit;
            }

            try {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));

                if ($bulk_action === 'close') {
                    $stmt = $pdo->prepare("UPDATE servicedesk_tickets SET status = 'Closed', closed_at = NOW() WHERE id IN ($placeholders) AND tenant_id = ?");
                    $stmt->execute(array_merge($ids, [$tenant_id]));
                    foreach ($ids as $tid) {
                        logActivity($pdo, $tid, $actor_name, 'status_changed', null, 'Closed', $tenant_id);
                    }
                    echo json_encode(["success" => true, "message" => count($ids) . " ticket(s) closed."]);
                } elseif ($bulk_action === 'resolve') {
                    $stmt = $pdo->prepare("UPDATE servicedesk_tickets SET status = 'Resolved', resolved_at = NOW() WHERE id IN ($placeholders) AND tenant_id = ?");
                    $stmt->execute(array_merge($ids, [$tenant_id]));
                    foreach ($ids as $tid) {
                        logActivity($pdo, $tid, $actor_name, 'status_changed', null, 'Resolved', $tenant_id);
                    }
                    echo json_encode(["success" => true, "message" => count($ids) . " ticket(s) resolved."]);
                } elseif ($bulk_action === 'assign') {
                    $assign_to  = intval($input['assign_to'] ?? 0);
                    $agent_name = trim($input['agent_name'] ?? '');
                    if (!$assign_to) {
                        http_response_code(400);
                        echo json_encode(["success" => false, "error" => "assign_to user ID is required."]);
                        exit;
                    }
                    $stmt = $pdo->prepare("UPDATE servicedesk_tickets SET assigned_to = ?, agent_name = ?, status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END WHERE id IN ($placeholders) AND tenant_id = ?");
                    $stmt->execute(array_merge([$assign_to, $agent_name], $ids, [$tenant_id]));
                    foreach ($ids as $tid) {
                        logActivity($pdo, $tid, $actor_name, 'assigned', null, $agent_name, $tenant_id);
                    }
                    echo json_encode(["success" => true, "message" => count($ids) . " ticket(s) assigned to $agent_name."]);
                } elseif ($bulk_action === 'delete') {
                    $stmt = $pdo->prepare("DELETE FROM servicedesk_tickets WHERE id IN ($placeholders) AND tenant_id = ?");
                    $stmt->execute(array_merge($ids, [$tenant_id]));
                    echo json_encode(["success" => true, "message" => count($ids) . " ticket(s) deleted."]);
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "Unknown bulk action: $bulk_action"]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
            exit;
        }

        // Create new ticket
        $subject        = trim($input['subject'] ?? '');
        $description    = trim($input['description'] ?? '');
        $category       = trim($input['category'] ?? 'General');
        $priority       = trim($input['priority'] ?? 'Medium');
        $requester_id   = intval($input['requester_id'] ?? 0);
        $requester_name = trim($input['requester_name'] ?? '');
        $assigned_to    = !empty($input['assigned_to']) ? intval($input['assigned_to']) : null;
        $agent_name     = trim($input['agent_name'] ?? '');

        if (empty($subject) || empty($description) || !$requester_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Subject, description, and requester are required."]);
            exit;
        }

        try {
            $ticket_number = genTicketNumber($pdo, $tenant_id);
            $sla_due_at    = calcSlaDue($pdo, $priority, $tenant_id);
            $status        = $assigned_to ? 'In Progress' : 'Open';
            $scheduled_visit_at = !empty($input['scheduled_visit_at']) ? $input['scheduled_visit_at'] : null;
            $scheduled_status = $scheduled_visit_at ? 'Tentative' : 'None';

            $stmt = $pdo->prepare("INSERT INTO servicedesk_tickets (ticket_number, subject, description, category, priority, status, requester_id, requester_name, assigned_to, agent_name, sla_due_at, scheduled_visit_at, scheduled_status, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$ticket_number, $subject, $description, $category, $priority, $status, $requester_id, $requester_name, $assigned_to, $agent_name ?: null, $sla_due_at, $scheduled_visit_at, $scheduled_status, $tenant_id]);
            $new_id = $pdo->lastInsertId();

            logActivity($pdo, $new_id, $requester_name, 'ticket_created', null, "Ticket $ticket_number created", $tenant_id);
            if ($assigned_to && $agent_name) {
                logActivity($pdo, $new_id, 'System', 'assigned', null, $agent_name, $tenant_id);
            }

            // Create initial materials if any
            if (!empty($input['materials']) && is_array($input['materials'])) {
                $mat_stmt = $pdo->prepare("INSERT INTO servicedesk_material_requests (ticket_id, material_name, quantity, unit, status, requested_by, requested_by_name, tenant_id) VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)");
                foreach ($input['materials'] as $m) {
                    $m_name = trim($m['material_name'] ?? '');
                    $m_qty  = floatval($m['quantity'] ?? 1);
                    $m_unit = trim($m['unit'] ?? 'pcs');
                    if (!empty($m_name)) {
                        $mat_stmt->execute([$new_id, $m_name, $m_qty, $m_unit, $requester_id, $requester_name, $tenant_id]);
                    }
                }
            }

            // Create initial fund request if any
            if (!empty($input['funds']) && is_array($input['funds'])) {
                $f_amount = floatval($input['funds']['amount'] ?? 0);
                $f_method = trim($input['funds']['payment_method'] ?? 'Cash');
                $f_details = trim($input['funds']['payment_details'] ?? '');
                $f_remarks = trim($input['funds']['remarks'] ?? '');
                if ($f_amount > 0) {
                    $fund_stmt = $pdo->prepare("INSERT INTO servicedesk_fund_requests (ticket_id, amount, payment_method, payment_details, status, requested_by, requested_by_name, remarks, tenant_id) VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?)");
                    $fund_stmt->execute([$new_id, $f_amount, $f_method, $f_details, $requester_id, $requester_name, $f_remarks, $tenant_id]);
                }
            }

            echo json_encode(["success" => true, "id" => $new_id, "ticket_number" => $ticket_number, "message" => "Ticket $ticket_number created successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true) ?? [];
        $id    = intval($input['id'] ?? 0);
        $actor_name = trim($input['actor_name'] ?? 'System');

        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Ticket ID is required."]);
            exit;
        }

        try {
            // Fetch current ticket
            $cur = $pdo->prepare("SELECT * FROM servicedesk_tickets WHERE id = ? AND tenant_id = ?");
            $cur->execute([$id, $tenant_id]);
            $current = $cur->fetch();
            if (!$current) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Ticket not found."]);
                exit;
            }

            $fields = [];
            $params = [];

            if (isset($input['status']) && $input['status'] !== $current['status']) {
                $new_status = $input['status'];
                $fields[] = "status = ?"; $params[] = $new_status;
                if ($new_status === 'Resolved' && !$current['resolved_at']) {
                    $fields[] = "resolved_at = NOW()";
                }
                if ($new_status === 'Closed' && !$current['closed_at']) {
                    $fields[] = "closed_at = NOW()";
                }
                logActivity($pdo, $id, $actor_name, 'status_changed', $current['status'], $new_status, $tenant_id);
            }
            if (isset($input['assigned_to'])) {
                $new_agent    = intval($input['assigned_to']);
                $new_agent_name = trim($input['agent_name'] ?? '');
                $fields[] = "assigned_to = ?"; $params[] = $new_agent ?: null;
                $fields[] = "agent_name = ?";  $params[] = $new_agent_name ?: null;
                if ($new_agent && in_array($current['status'], ['Open'])) {
                    $fields[] = "status = 'In Progress'";
                }
                logActivity($pdo, $id, $actor_name, 'assigned', $current['agent_name'], $new_agent_name, $tenant_id);
            }
            if (isset($input['priority']) && $input['priority'] !== $current['priority']) {
                $fields[] = "priority = ?"; $params[] = $input['priority'];
                $new_sla = calcSlaDue($pdo, $input['priority'], $tenant_id);
                $fields[] = "sla_due_at = ?"; $params[] = $new_sla;
                logActivity($pdo, $id, $actor_name, 'priority_changed', $current['priority'], $input['priority'], $tenant_id);
            }
            if (isset($input['category'])) {
                $fields[] = "category = ?"; $params[] = trim($input['category']);
            }
            if (isset($input['subject'])) {
                $fields[] = "subject = ?"; $params[] = trim($input['subject']);
            }
            if (isset($input['scheduled_visit_at'])) {
                $fields[] = "scheduled_visit_at = ?"; $params[] = !empty($input['scheduled_visit_at']) ? $input['scheduled_visit_at'] : null;
                logActivity($pdo, $id, $actor_name, 'schedule_changed', $current['scheduled_visit_at'], $input['scheduled_visit_at'], $tenant_id);
            }
            if (isset($input['scheduled_status']) && $input['scheduled_status'] !== $current['scheduled_status']) {
                $fields[] = "scheduled_status = ?"; $params[] = $input['scheduled_status'];
                logActivity($pdo, $id, $actor_name, 'schedule_status_changed', $current['scheduled_status'], $input['scheduled_status'], $tenant_id);
            }
            if (isset($input['scheduled_confirmed_by'])) {
                $fields[] = "scheduled_confirmed_by = ?"; $params[] = $input['scheduled_confirmed_by'];
            }

            if (empty($fields)) {
                echo json_encode(["success" => true, "message" => "No changes to apply."]);
                exit;
            }

            $params[] = $id;
            $params[] = $tenant_id;
            $stmt = $pdo->prepare("UPDATE servicedesk_tickets SET " . implode(', ', $fields) . " WHERE id = ? AND tenant_id = ?");
            $stmt->execute($params);

            echo json_encode(["success" => true, "message" => "Ticket updated successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Ticket ID is required."]);
            exit;
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM servicedesk_tickets WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Ticket deleted."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
}
