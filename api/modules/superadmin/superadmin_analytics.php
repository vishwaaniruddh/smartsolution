<?php
// superadmin_analytics.php
require_once __DIR__ . '/../../core/db.php';
header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT id, name, currency_name, currency_symbol, created_at FROM tenants ORDER BY created_at DESC");
    $tenants = $stmt->fetchAll();
    
    $analytics = [];
    
    foreach ($tenants as $t) {
        $tenant_id = $t['id'];
        
        // 1. Fetch user counts by role
        $ustmt = $pdo->prepare("SELECT role, COUNT(*) as count FROM users WHERE tenant_id = ? GROUP BY role");
        $ustmt->execute([$tenant_id]);
        $roles = $ustmt->fetchAll();
        $user_stats = [
            'total' => 0,
            'Admin' => 0,
            'Manager' => 0,
            'Sales Associate' => 0
        ];
        foreach ($roles as $r) {
            $role_name = $r['role'];
            // Safeguard if role is somehow empty or different
            if (array_key_exists($role_name, $user_stats)) {
                $user_stats[$role_name] = intval($r['count']);
            }
            $user_stats['total'] += intval($r['count']);
        }
        
        // 2. Fetch leads status counts and values
        $lstmt = $pdo->prepare("SELECT status, COUNT(*) as count, SUM(value) as total_value FROM leads WHERE tenant_id = ? AND is_deleted = 0 GROUP BY status");
        $lstmt->execute([$tenant_id]);
        $statuses = $lstmt->fetchAll();
        
        $leads_stats = [
            'total' => 0,
            'pending' => 0,
            'won' => 0,
            'lost' => 0,
            'revenue' => 0.00
        ];
        
        foreach ($statuses as $s) {
            $count = intval($s['count']);
            $value = floatval($s['total_value']);
            $status = $s['status'];
            
            $leads_stats['total'] += $count;
            
            if ($status === 'Closed' || $status === 'Won') {
                $leads_stats['won'] += $count;
                $leads_stats['revenue'] += $value;
            } elseif ($status === 'Lost') {
                $leads_stats['lost'] += $count;
            } else {
                $leads_stats['pending'] += $count;
            }
        }
        
        // 3. Fetch activity count
        $astmt = $pdo->prepare("SELECT COUNT(*) as count FROM lead_activities WHERE tenant_id = ?");
        $astmt->execute([$tenant_id]);
        $activity_count = intval($astmt->fetchColumn());
        
        // 4. Fetch primary admin details (for impersonating directly from the reports)
        $admin_stmt = $pdo->prepare("SELECT id, first_name, last_name, email, contact, gender, address, profile_photo, role, tenant_id, is_first_login, created_at FROM users WHERE tenant_id = ? AND role = 'Admin' ORDER BY created_at ASC LIMIT 1");
        $admin_stmt->execute([$tenant_id]);
        $admin = $admin_stmt->fetch();
        if ($admin) {
            $admin['currency_name'] = $t['currency_name'] ?? 'Indian Rupee';
            $admin['currency_symbol'] = $t['currency_symbol'] ?? '₹';
        }
        
        $analytics[] = [
            'id' => $tenant_id,
            'name' => $t['name'],
            'currency_name' => $t['currency_name'] ?? 'Indian Rupee',
            'currency_symbol' => $t['currency_symbol'] ?? '₹',
            'created_at' => $t['created_at'],
            'users' => $user_stats,
            'leads' => $leads_stats,
            'activities_count' => $activity_count,
            'admin' => $admin ? $admin : null
        ];
    }
    
    echo json_encode(["success" => true, "data" => $analytics]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
