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
