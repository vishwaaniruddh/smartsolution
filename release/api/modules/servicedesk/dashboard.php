<?php
// dashboard.php - Service Desk Dashboard KPIs
require_once __DIR__ . '/../../core/db.php';

$tenant_id = getTenantId();
header('Content-Type: application/json');

try {
    // KPI counts
    $kpis = [];
    $statuses = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];
    foreach ($statuses as $s) {
        $st = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_tickets WHERE tenant_id = ? AND status = ?");
        $st->execute([$tenant_id, $s]);
        $kpis[strtolower(str_replace(' ', '_', $s))] = intval($st->fetchColumn());
    }

    // Total open (Open + In Progress + On Hold)
    $kpis['total_open'] = $kpis['open'] + $kpis['in_progress'] + $kpis['on_hold'];

    // SLA breached
    $sla = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_tickets WHERE tenant_id = ? AND is_sla_breached = 1 AND status NOT IN ('Resolved','Closed')");
    $sla->execute([$tenant_id]);
    $kpis['sla_breached'] = intval($sla->fetchColumn());

    // Unassigned
    $ua = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_tickets WHERE tenant_id = ? AND assigned_to IS NULL AND status NOT IN ('Resolved','Closed')");
    $ua->execute([$tenant_id]);
    $kpis['unassigned'] = intval($ua->fetchColumn());

    // Resolved today
    $rt = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_tickets WHERE tenant_id = ? AND DATE(resolved_at) = CURDATE()");
    $rt->execute([$tenant_id]);
    $kpis['resolved_today'] = intval($rt->fetchColumn());

    // Priority breakdown
    $priorities = ['Critical', 'High', 'Medium', 'Low'];
    $priority_counts = [];
    foreach ($priorities as $p) {
        $st = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_tickets WHERE tenant_id = ? AND priority = ? AND status NOT IN ('Resolved','Closed')");
        $st->execute([$tenant_id, $p]);
        $priority_counts[$p] = intval($st->fetchColumn());
    }

    // Category breakdown
    $cat = $pdo->prepare("SELECT category, COUNT(*) as cnt FROM servicedesk_tickets WHERE tenant_id = ? AND status NOT IN ('Resolved','Closed') GROUP BY category ORDER BY cnt DESC LIMIT 6");
    $cat->execute([$tenant_id]);
    $category_counts = $cat->fetchAll();

    // Recent activity (last 10)
    $act = $pdo->prepare("SELECT a.*, t.ticket_number, t.subject FROM servicedesk_activity_log a JOIN servicedesk_tickets t ON t.id = a.ticket_id WHERE a.tenant_id = ? ORDER BY a.created_at DESC LIMIT 10");
    $act->execute([$tenant_id]);
    $recent_activity = $act->fetchAll();

    // My queue — for agent (passed as requester_id or assigned_to)
    $agent_id = isset($_GET['agent_id']) ? intval($_GET['agent_id']) : 0;
    $my_queue = [];
    if ($agent_id) {
        $mq = $pdo->prepare("SELECT * FROM servicedesk_tickets WHERE tenant_id = ? AND assigned_to = ? AND status NOT IN ('Resolved','Closed') ORDER BY priority DESC, created_at DESC LIMIT 10");
        $mq->execute([$tenant_id, $agent_id]);
        $my_queue = $mq->fetchAll();
    }

    // Trend: tickets created per day for last 14 days
    $trend = $pdo->prepare("SELECT DATE(created_at) as day, COUNT(*) as cnt FROM servicedesk_tickets WHERE tenant_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) GROUP BY DATE(created_at) ORDER BY day ASC");
    $trend->execute([$tenant_id]);
    $daily_trend = $trend->fetchAll();

    // Materials report
    $mr_req = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_material_requests WHERE tenant_id = ?");
    $mr_req->execute([$tenant_id]);
    $total_materials_requested = intval($mr_req->fetchColumn());

    $mr_del = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_material_requests WHERE tenant_id = ? AND status = 'Delivered'");
    $mr_del->execute([$tenant_id]);
    $total_materials_delivered = intval($mr_del->fetchColumn());

    // Funds report
    $fr_req = $pdo->prepare("SELECT SUM(amount) FROM servicedesk_fund_requests WHERE tenant_id = ?");
    $fr_req->execute([$tenant_id]);
    $total_funds_requested = floatval($fr_req->fetchColumn() ?? 0);

    $fr_paid = $pdo->prepare("SELECT SUM(amount) FROM servicedesk_fund_requests WHERE tenant_id = ? AND status = 'Paid'");
    $fr_paid->execute([$tenant_id]);
    $total_funds_paid = floatval($fr_paid->fetchColumn() ?? 0);

    // SLA report
    $sla_m = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_tickets WHERE tenant_id = ? AND is_sla_breached = 0 AND status IN ('Resolved','Closed')");
    $sla_m->execute([$tenant_id]);
    $sla_met = intval($sla_m->fetchColumn());

    $sla_b = $pdo->prepare("SELECT COUNT(*) FROM servicedesk_tickets WHERE tenant_id = ? AND is_sla_breached = 1");
    $sla_b->execute([$tenant_id]);
    $sla_breached = intval($sla_b->fetchColumn());

    echo json_encode([
        "success"          => true,
        "kpis"             => $kpis,
        "priority_counts"  => $priority_counts,
        "category_counts"  => $category_counts,
        "recent_activity"  => $recent_activity,
        "my_queue"         => $my_queue,
        "daily_trend"      => $daily_trend,
        "reports"          => [
            "total_materials_requested" => $total_materials_requested,
            "total_materials_delivered" => $total_materials_delivered,
            "total_funds_requested"     => $total_funds_requested,
            "total_funds_paid"          => $total_funds_paid,
            "sla_met"                   => $sla_met,
            "sla_breached"              => $sla_breached
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
