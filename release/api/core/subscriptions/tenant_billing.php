<?php
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');
// $user = requireAuth();

$tenant_id = getTenantId();
if (!$tenant_id) {
    // If Superadmin is requesting with an explicit tenant ID
    $tenant_id = $_GET['tenant_id'] ?? null;
    if (!$tenant_id) {
        echo json_encode(["success" => false, "error" => "Tenant ID required for superadmin."]);
        exit;
    }
}

// Calculate the bill
try {
    // 1. Get all apps assigned to this tenant, and their associated subscription plan
    $stmt = $pdo->prepare("
        SELECT 
            ta.app_id, 
            a.name as app_name,
            ta.plan_id, 
            ta.status,
            p.plan_name,
            p.base_fee,
            p.included_users,
            p.additional_user_fee,
            p.billing_cycle
        FROM tenant_apps ta
        JOIN apps a ON ta.app_id = a.id
        LEFT JOIN app_subscription_plans p ON ta.plan_id = p.id
        WHERE ta.tenant_id = ?
    ");
    $stmt->execute([$tenant_id]);
    $tenant_apps = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Count active users per app for this tenant
    $stmtUsers = $pdo->prepare("
        SELECT app_id, COUNT(user_id) as assigned_users
        FROM user_apps 
        WHERE tenant_id = ? 
        GROUP BY app_id
    ");
    $stmtUsers->execute([$tenant_id]);
    $user_counts_raw = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);
    $user_counts = [];
    foreach ($user_counts_raw as $row) {
        $user_counts[$row['app_id']] = (int)$row['assigned_users'];
    }

    // 3. Calculate billing
    $subscriptions = [];
    $total_monthly = 0;
    $total_yearly = 0;

    foreach ($tenant_apps as $app) {
        $assigned = $user_counts[$app['app_id']] ?? 0;
        
        $sub = [
            "app_id" => $app['app_id'],
            "app_name" => $app['app_name'],
            "status" => $app['status'],
            "assigned_users" => $assigned,
            "has_plan" => false
        ];

        if ($app['plan_id']) {
            $sub['has_plan'] = true;
            $sub['plan_name'] = $app['plan_name'];
            $sub['base_fee'] = (float)$app['base_fee'];
            $sub['included_users'] = (int)$app['included_users'];
            $sub['additional_user_fee'] = (float)$app['additional_user_fee'];
            $sub['billing_cycle'] = $app['billing_cycle'];
            
            $additional_users = max(0, $assigned - $sub['included_users']);
            $sub['additional_users'] = $additional_users;
            
            $total_fee = $sub['base_fee'] + ($additional_users * $sub['additional_user_fee']);
            $sub['total_fee'] = $total_fee;
            
            if ($app['status'] === 'Active') {
                if ($sub['billing_cycle'] === 'Monthly') {
                    $total_monthly += $total_fee;
                } else {
                    $total_yearly += $total_fee;
                }
            }
        } else {
            // No plan assigned yet (legacy or misconfigured)
            $sub['plan_name'] = 'No Plan Assigned';
            $sub['total_fee'] = 0;
        }
        
        $subscriptions[] = $sub;
    }

    echo json_encode([
        "success" => true, 
        "data" => [
            "subscriptions" => $subscriptions,
            "totals" => [
                "monthly" => $total_monthly,
                "yearly" => $total_yearly
            ]
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
