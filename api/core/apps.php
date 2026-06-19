<?php
// apps.php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->query("SELECT id, name, description, category, is_active FROM apps WHERE is_active = 1 ORDER BY weight ASC");
            $apps = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $apps]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed."]);
        break;
}
?>
