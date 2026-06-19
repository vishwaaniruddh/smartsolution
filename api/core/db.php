<?php
// db.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, X-Tenant-ID, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

$host = 'localhost';

// Auto-detect environment based on HTTP Host/Server Name
$server_name = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : (isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '');

// Strip port number if any (e.g. localhost:8080)
$server_name = explode(':', $server_name)[0];

if ($server_name === 'workforce.sarsspl.com') {
    // Production Server Database Credentials
    $dbname = 'u444388293_crm_lead';
    $username = 'u444388293_crm_lead';
    $password = 'AVav@@2026';
} elseif ($server_name === 'workforce-dev.sarsspl.com') {
    // Development Server Database Credentials
    $dbname = 'u444388293_crm_lead_dev';
    $username = 'u444388293_crm_lead_dev';
    $password = 'AVav@@2026';
} else {
    // Local Testing Database Credentials (XAMPP)
    $dbname = 'crm_lead';
    $username = 'root';
    $password = '';
}


try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // If database doesn't exist, try connecting without dbname to create it
    if ($e->getCode() == 1049) {
        try {
            $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname`");
            $pdo->exec("USE `$dbname`");
        } catch (PDOException $e2) {
            die(json_encode(["error" => "Database connection failed: " . $e2->getMessage()]));
        }
    } else {
        die(json_encode(["error" => "Database connection failed: " . $e->getMessage()]));
    }
}

// Global helper to get tenant ID dynamically
function getTenantId()
{
    if (isset($_GET['tenant_id'])) {
        return intval($_GET['tenant_id']);
    }
    if (isset($_SERVER['HTTP_X_TENANT_ID'])) {
        return intval($_SERVER['HTTP_X_TENANT_ID']);
    }

    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['X-Tenant-ID'])) {
            return intval($headers['X-Tenant-ID']);
        }
        if (isset($headers['x-tenant-id'])) {
            return intval($headers['x-tenant-id']);
        }
    }

    // Check php://input fallback for JSON POST/PUT payloads
    $input = json_decode(file_get_contents("php://input"), true);
    if (isset($input['tenant_id'])) {
        return intval($input['tenant_id']);
    }

    return 1; // Fallback to Tenant 1
}

// Function to handle preflight CORS requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>