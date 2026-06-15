<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Get tenant ID from query param (for GET/DELETE) or JSON body (for POST/PUT)
$tenant_id = 1; // Default fallback
if (isset($_GET['tenant_id'])) {
    $tenant_id = (int)$_GET['tenant_id'];
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['tenant_id'])) {
        $tenant_id = (int)$input['tenant_id'];
    }
}

if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT * FROM lead_sources WHERE tenant_id = ? ORDER BY name ASC");
        $stmt->execute([$tenant_id]);
        $sources = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "data" => $sources]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $name = $input['name'] ?? '';

    if (!$name) {
        echo json_encode(["success" => false, "error" => "Source name is required."]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO lead_sources (name, tenant_id) VALUES (?, ?)");
        $stmt->execute([$name, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Lead source added successfully.", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => "Failed to add lead source: " . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;
    $name = $input['name'] ?? '';

    if (!$id || !$name) {
        echo json_encode(["success" => false, "error" => "ID and new name are required."]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("UPDATE lead_sources SET name = ? WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$name, $id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Lead source updated successfully."]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => "Failed to update lead source."]);
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        echo json_encode(["success" => false, "error" => "ID is required."]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM lead_sources WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Lead source deleted successfully."]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => "Failed to delete lead source."]);
    }
} else {
    echo json_encode(["success" => false, "error" => "Invalid method."]);
}
?>
