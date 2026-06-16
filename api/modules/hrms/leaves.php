<?php
// HRMS Leave Management API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'types') {
            // Get leave types
            $stmt = $pdo->prepare("SELECT * FROM hrms_leave_types WHERE tenant_id = ? ORDER BY name ASC");
            $stmt->execute([$tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
            
        } elseif ($action === 'balances') {
            // Get leave balances for an employee
            $employee_id = $_GET['employee_id'] ?? null;
            $year = $_GET['year'] ?? date('Y');
            
            $sql = "SELECT lb.*, lt.name as leave_type_name, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.emp_code
                FROM hrms_leave_balances lb
                JOIN hrms_leave_types lt ON lb.leave_type_id = lt.id
                JOIN hrms_employees e ON lb.employee_id = e.id
                WHERE lb.tenant_id = ? AND lb.year = ?";
            $params = [$tenant_id, $year];
            
            if ($employee_id) {
                $sql .= " AND lb.employee_id = ?";
                $params[] = $employee_id;
            }
            
            $sql .= " ORDER BY e.first_name, lt.name";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
            
        } else {
            // Get leave requests
            $employee_id = $_GET['employee_id'] ?? null;
            $status = $_GET['status'] ?? null;
            
            $sql = "SELECT lr.*, lt.name as leave_type_name, 
                CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.emp_code,
                d.name as department_name,
                (SELECT CONCAT(a.first_name, ' ', a.last_name) FROM hrms_employees a WHERE a.id = lr.approved_by) as approver_name
                FROM hrms_leave_requests lr
                JOIN hrms_leave_types lt ON lr.leave_type_id = lt.id
                JOIN hrms_employees e ON lr.employee_id = e.id
                LEFT JOIN hrms_departments d ON e.department_id = d.id
                WHERE lr.tenant_id = ?";
            $params = [$tenant_id];
            
            if ($employee_id) {
                $sql .= " AND lr.employee_id = ?";
                $params[] = $employee_id;
            }
            
            if ($status) {
                $sql .= " AND lr.status = ?";
                $params[] = $status;
            }
            
            $sql .= " ORDER BY lr.created_at DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        
        if ($action === 'types') {
            // Create leave type
            $name = $input['name'] ?? '';
            $default_days = $input['default_days'] ?? 12;
            
            if (empty($name)) {
                echo json_encode(["success" => false, "error" => "Leave type name is required."]);
                exit;
            }
            
            $stmt = $pdo->prepare("INSERT INTO hrms_leave_types (name, default_days, tenant_id) VALUES (?, ?, ?)");
            $stmt->execute([$name, $default_days, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Leave type created.", "id" => $pdo->lastInsertId()]);
            
        } else {
            // Apply for leave
            $employee_id = $input['employee_id'] ?? null;
            $leave_type_id = $input['leave_type_id'] ?? null;
            $from_date = $input['from_date'] ?? null;
            $to_date = $input['to_date'] ?? null;
            $reason = $input['reason'] ?? '';
            
            if (!$employee_id || !$leave_type_id || !$from_date || !$to_date) {
                echo json_encode(["success" => false, "error" => "Employee, leave type, from date, and to date are required."]);
                exit;
            }
            
            // Calculate days
            $d1 = new DateTime($from_date);
            $d2 = new DateTime($to_date);
            $days = $d1->diff($d2)->days + 1;
            
            // Check leave balance
            $year = date('Y', strtotime($from_date));
            $balance = $pdo->prepare("SELECT remaining FROM hrms_leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ? AND tenant_id = ?");
            $balance->execute([$employee_id, $leave_type_id, $year, $tenant_id]);
            $bal = $balance->fetch();
            
            // For Unpaid Leave, skip balance check
            $lt_check = $pdo->prepare("SELECT name FROM hrms_leave_types WHERE id = ? AND tenant_id = ?");
            $lt_check->execute([$leave_type_id, $tenant_id]);
            $lt_name = $lt_check->fetch()['name'] ?? '';
            
            if ($lt_name !== 'Unpaid Leave' && $bal && $bal['remaining'] < $days) {
                echo json_encode(["success" => false, "error" => "Insufficient leave balance. Available: {$bal['remaining']} days, Requested: $days days."]);
                exit;
            }
            
            $stmt = $pdo->prepare("INSERT INTO hrms_leave_requests (employee_id, leave_type_id, from_date, to_date, days, reason, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$employee_id, $leave_type_id, $from_date, $to_date, $days, $reason, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Leave request submitted.", "id" => $pdo->lastInsertId()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        
        if ($action === 'types') {
            // Update leave type
            $id = $input['id'] ?? null;
            $name = $input['name'] ?? '';
            $default_days = $input['default_days'] ?? 12;
            
            $stmt = $pdo->prepare("UPDATE hrms_leave_types SET name = ?, default_days = ? WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$name, $default_days, $id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Leave type updated."]);
            
        } else {
            // Approve or reject leave
            $id = $input['id'] ?? null;
            $status = $input['status'] ?? null; // 'Approved' or 'Rejected'
            $approved_by = $input['approved_by'] ?? null;
            
            if (!$id || !$status) {
                echo json_encode(["success" => false, "error" => "Leave request ID and status are required."]);
                exit;
            }
            
            // Get the leave request details
            $req = $pdo->prepare("SELECT * FROM hrms_leave_requests WHERE id = ? AND tenant_id = ?");
            $req->execute([$id, $tenant_id]);
            $leave = $req->fetch();
            
            if (!$leave) {
                echo json_encode(["success" => false, "error" => "Leave request not found."]);
                exit;
            }
            
            // Update status
            $stmt = $pdo->prepare("UPDATE hrms_leave_requests SET status = ?, approved_by = ? WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$status, $approved_by, $id, $tenant_id]);
            
            // If approved, deduct from balance
            if ($status === 'Approved') {
                $year = date('Y', strtotime($leave['from_date']));
                $pdo->prepare("UPDATE hrms_leave_balances SET used = used + ?, remaining = remaining - ? WHERE employee_id = ? AND leave_type_id = ? AND year = ? AND tenant_id = ?")
                    ->execute([$leave['days'], $leave['days'], $leave['employee_id'], $leave['leave_type_id'], $year, $tenant_id]);
            }
            
            echo json_encode(["success" => true, "message" => "Leave request $status."]);
        }
        break;

    case 'DELETE':
        if ($action === 'types') {
            $id = $_GET['id'] ?? null;
            $stmt = $pdo->prepare("DELETE FROM hrms_leave_types WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Leave type deleted."]);
        } else {
            $id = $_GET['id'] ?? null;
            // Can only delete pending requests
            $stmt = $pdo->prepare("DELETE FROM hrms_leave_requests WHERE id = ? AND tenant_id = ? AND status = 'Pending'");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Leave request cancelled."]);
        }
        break;
}
?>
