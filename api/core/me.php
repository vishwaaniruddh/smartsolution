<?php
// me.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit();
}

$token = getBearerToken();
if (!$token) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized - No token provided"]);
    exit();
}

$decoded = jwt_decode($token);
if (!$decoded) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized - Invalid or expired token"]);
    exit();
}

$user_id = $decoded['user_id'];

try {
    $stmt = $pdo->prepare("SELECT u.*, t.name as tenant_name, t.currency_name, t.currency_symbol, t.is_deleted as tenant_deleted FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE u.id = ? LIMIT 1");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "User not found"]);
        exit();
    }

    if ($user['role'] !== 'Superadmin' && isset($user['tenant_deleted']) && intval($user['tenant_deleted']) === 1) {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "This organization workspace has been suspended. Please contact system administrator."]);
        exit();
    }

    unset($user['password']); // security

    // Fetch allowed apps
    if ($user['role'] === 'Superadmin') {
        $user['apps'] = ['crm', 'hrms', 'accounting', 'inventory', 'servicedesk'];
    } else if ($user['role'] === 'Admin') {
        $astmt = $pdo->prepare("SELECT app_id FROM tenant_apps WHERE tenant_id = ?");
        $astmt->execute([$user['tenant_id']]);
        $user['apps'] = $astmt->fetchAll(PDO::FETCH_COLUMN);
    } else {
        $astmt = $pdo->prepare("SELECT app_id FROM user_apps WHERE user_id = ?");
        $astmt->execute([$user['id']]);
        $user['apps'] = $astmt->fetchAll(PDO::FETCH_COLUMN);
    }

    echo json_encode([
        "success" => true,
        "user" => $user
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error"]);
}
