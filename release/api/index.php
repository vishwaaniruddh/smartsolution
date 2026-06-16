<?php
// index.php - Central API Gateway Router

$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

// Normalize path by stripping base directory (e.g. /lead/api)
$base_paths = ['/lead/api/', '/api/'];
$route = $path;
foreach ($base_paths as $bp) {
    if (strpos($path, $bp) === 0) {
        $route = substr($path, strlen($bp));
        break;
    }
}

$route = trim($route, '/');

// Simple router routing requests to modules or core
switch ($route) {
    case 'leads':
        require_once __DIR__ . '/modules/leads/leads.php';
        break;
    case 'payments':
        require_once __DIR__ . '/modules/leads/payments.php';
        break;
    case 'activities':
        require_once __DIR__ . '/modules/leads/activities.php';
        break;
    case 'tasks':
        require_once __DIR__ . '/modules/leads/tasks.php';
        break;
    case 'lead-sources':
        require_once __DIR__ . '/modules/leads/lead_sources.php';
        break;
    case 'auth':
        require_once __DIR__ . '/core/auth.php';
        break;
    case 'change-password':
        require_once __DIR__ . '/core/change_password.php';
        break;
    case 'reset-password':
        require_once __DIR__ . '/core/reset_password.php';
        break;
    case 'smtp-config':
        require_once __DIR__ . '/core/smtp_config.php';
        break;
    case 'email-logs':
        require_once __DIR__ . '/core/email_logs.php';
        break;
    case 'users':
        require_once __DIR__ . '/core/users.php';
        break;
    case 'tenants':
        require_once __DIR__ . '/modules/superadmin/tenants.php';
        break;
    case 'superadmin/analytics':
        require_once __DIR__ . '/modules/superadmin/superadmin_analytics.php';
        break;
    // HRMS Module Routes
    case 'hrms/departments':
        require_once __DIR__ . '/modules/hrms/departments.php';
        break;
    case 'hrms/designations':
        require_once __DIR__ . '/modules/hrms/designations.php';
        break;
    case 'hrms/employees':
        require_once __DIR__ . '/modules/hrms/employees.php';
        break;
    case 'hrms/attendance':
        require_once __DIR__ . '/modules/hrms/attendance.php';
        break;
    case 'hrms/leaves':
        require_once __DIR__ . '/modules/hrms/leaves.php';
        break;
    case 'hrms/payroll':
        require_once __DIR__ . '/modules/hrms/payroll.php';
        break;
    case 'hrms/holidays':
        require_once __DIR__ . '/modules/hrms/holidays.php';
        break;
    case 'hrms/dashboard':
        require_once __DIR__ . '/modules/hrms/hrms_dashboard.php';
        break;
    case 'hrms/bulk':
        require_once __DIR__ . '/modules/hrms/bulk.php';
        break;
    case 'hrms/jobs':
        require_once __DIR__ . '/modules/hrms/jobs.php';
        break;
    case 'hrms/candidates':
        require_once __DIR__ . '/modules/hrms/candidates.php';
        break;
    case 'hrms/interviews':
        require_once __DIR__ . '/modules/hrms/interviews.php';
        break;
    // Inventory Module Routes
    case 'inventory/dashboard':
        require_once __DIR__ . '/modules/inventory/dashboard.php';
        break;
    case 'inventory/warehouses':
        require_once __DIR__ . '/modules/inventory/warehouses.php';
        break;
    case 'inventory/products':
        require_once __DIR__ . '/modules/inventory/products.php';
        break;
    case 'inventory/stock':
        require_once __DIR__ . '/modules/inventory/stock.php';
        break;
    case 'inventory/suppliers':
        require_once __DIR__ . '/modules/inventory/suppliers.php';
        break;
    case 'inventory/orders':
        require_once __DIR__ . '/modules/inventory/orders.php';
        break;
    case 'inventory/couriers':
        require_once __DIR__ . '/modules/inventory/couriers.php';
        break;
    case 'inventory/bulk':
        require_once __DIR__ . '/modules/inventory/bulk.php';
        break;
    case 'inventory/sales-orders':
        require_once __DIR__ . '/modules/inventory/sales_orders.php';
        break;
    default:
        // Try fallback to root facades if route contains .php extension
        $file = __DIR__ . '/' . $route;
        if (file_exists($file) && is_file($file)) {
            require_once $file;
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Gateway: Route not found: " . $route]);
        }
        break;
}
