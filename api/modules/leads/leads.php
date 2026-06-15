<?php
// leads.php
require_once __DIR__ . '/../../core/db.php';

header('Content-Type: application/json');

function isValidEmail($email) {
    if ($email === null || $email === '') {
        return true; // Null/empty is allowed
    }
    $email = trim($email);
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function isValidPhone($phone) {
    if ($phone === null || $phone === '') {
        return true; // Null/empty is allowed
    }
    $phone = trim($phone);
    $digitsOnly = preg_replace('/\D/', '', $phone);
    $digitCount = strlen($digitsOnly);
    if ($digitCount >= 7 && $digitCount <= 15) {
        return preg_match('/^\+?[0-9\s\-()]+$/', $phone) === 1;
    }
    return false;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Get all active (non-soft-deleted) leads for this tenant
        try {
            $tenant_id = getTenantId();
            $stmt = $pdo->prepare("SELECT * FROM leads WHERE is_deleted = 0 AND tenant_id = ? ORDER BY created_at DESC");
            $stmt->execute([$tenant_id]);
            $leads = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $leads]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
        
    case 'POST':
        // Add a new lead
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['name']) && isset($data['source'])) {
            $email = isset($data['email']) ? $data['email'] : null;
            $contact_number = isset($data['contact_number']) ? $data['contact_number'] : null;

            if (!isValidEmail($email)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid Email format."]);
                break;
            }
            if (!isValidPhone($contact_number)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid Contact Number format. Must be between 7 and 15 digits."]);
                break;
            }
            try {
                $tenant_id = getTenantId();
                $stmt = $pdo->prepare("INSERT INTO leads (name, email, contact_number, source, status, value, agent, delegation_status, remarks, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $status = isset($data['status']) ? $data['status'] : 'New';
                $value = isset($data['value']) ? $data['value'] : 0.00;
                $agent = isset($data['agent']) ? $data['agent'] : 'Unassigned';
                $delegation_status = isset($data['delegation_status']) ? $data['delegation_status'] : 'None';
                $remarks = isset($data['remarks']) ? $data['remarks'] : null;
                
                $stmt->execute([$data['name'], $email, $contact_number, $data['source'], $status, $value, $agent, $delegation_status, $remarks, $tenant_id]);
                $id = $pdo->lastInsertId();
                
                echo json_encode(["success" => true, "message" => "Lead added successfully", "id" => $id]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing required fields"]);
        }
        break;

    case 'PUT':
        // Update an existing lead (delegation or status updates)
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['id'])) {
            $email = isset($data['email']) ? $data['email'] : null;
            $contact_number = isset($data['contact_number']) ? $data['contact_number'] : null;

            if (array_key_exists('email', $data) && !isValidEmail($email)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid Email format."]);
                break;
            }
            if (array_key_exists('contact_number', $data) && !isValidPhone($contact_number)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid Contact Number format. Must be between 7 and 15 digits."]);
                break;
            }
            try {
                $fields = [];
                $params = [];
                $allowedFields = ['name', 'email', 'contact_number', 'source', 'status', 'value', 'agent', 'delegation_status', 'remarks', 'sales_status', 'received_payment', 'payment_status', 'payment_method', 'transaction_reference', 'payment_date', 'finalization_remarks'];
                foreach ($allowedFields as $field) {
                    if (array_key_exists($field, $data)) {
                        $fields[] = "`$field` = ?";
                        $params[] = $data[$field];
                    }
                }
                
                if (count($fields) > 0) {
                    $tenant_id = getTenantId();
                    $params[] = $data['id'];
                    $params[] = $tenant_id;
                    $sql = "UPDATE leads SET " . implode(", ", $fields) . " WHERE id = ? AND tenant_id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    echo json_encode(["success" => true, "message" => "Lead updated successfully"]);
                } else {
                    echo json_encode(["success" => false, "error" => "No fields to update"]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing lead ID"]);
        }
        break;

    case 'DELETE':
        // Delete a lead
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if ($id === null) {
            $json = json_decode(file_get_contents("php://input"), true);
            $id = isset($json['id']) ? intval($json['id']) : null;
        }

        if ($id === null) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing lead ID"]);
            exit();
        }

        try {
            $tenant_id = getTenantId();
            $stmt = $pdo->prepare("UPDATE leads SET is_deleted = 1 WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Lead soft-deleted successfully"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
?>
