<?php
// HRMS Attendance API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

$user_context = getCurrentUserContext();
$is_admin_or_manager = $user_context && in_array($user_context['role'], ['Admin', 'Manager', 'Superadmin']);
$current_emp_id = getCurrentEmployeeId($pdo, $tenant_id);

switch ($method) {
    case 'GET':
        $employee_id = $_GET['employee_id'] ?? null;
        
        // Enforce ESS isolation
        if (!$is_admin_or_manager) {
            if (!$current_emp_id) {
                echo json_encode(["success" => true, "data" => []]);
                exit;
            }
            $employee_id = $current_emp_id; // Force to their own
        }
        $date = $_GET['date'] ?? null;
        $from_date = $_GET['from_date'] ?? null;
        $to_date = $_GET['to_date'] ?? null;
        $month = $_GET['month'] ?? null;
        $year = $_GET['year'] ?? null;
        
        $sql = "SELECT a.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.emp_code, d.name as department_name
            FROM hrms_attendance a
            JOIN hrms_employees e ON a.employee_id = e.id
            LEFT JOIN hrms_departments d ON e.department_id = d.id
            WHERE a.tenant_id = ?";
        $params = [$tenant_id];
        
        if ($employee_id) {
            $sql .= " AND a.employee_id = ?";
            $params[] = $employee_id;
        }
        
        if ($date) {
            $sql .= " AND a.date = ?";
            $params[] = $date;
        }
        
        if ($from_date && $to_date) {
            $sql .= " AND a.date BETWEEN ? AND ?";
            $params[] = $from_date;
            $params[] = $to_date;
        }
        
        if ($month && $year) {
            $sql .= " AND MONTH(a.date) = ? AND YEAR(a.date) = ?";
            $params[] = $month;
            $params[] = $year;
        }
        
        $sql .= " ORDER BY a.date DESC, e.first_name ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        
        // Support bulk attendance
        $entries = $input['entries'] ?? null;
        
        if ($entries && is_array($entries)) {
            // Bulk insert
            if (!$is_admin_or_manager) {
                if (!$current_emp_id) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "error" => "No employee record linked to your user account."]);
                    exit;
                }
                $filtered_entries = [];
                foreach ($entries as $entry) {
                    if ($entry['employee_id'] == $current_emp_id) {
                        $filtered_entries[] = $entry;
                    }
                }
                if (empty($filtered_entries)) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "error" => "You can only update your own attendance."]);
                    exit;
                }
                $entries = $filtered_entries;
            }
            $date = $input['date'] ?? date('Y-m-d');
            $inserted = 0;
            
            $check = $pdo->prepare("SELECT id FROM hrms_attendance WHERE employee_id = ? AND date = ? AND tenant_id = ?");
            $insert = $pdo->prepare("INSERT INTO hrms_attendance (employee_id, date, status, clock_in, clock_out, remarks, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $update = $pdo->prepare("UPDATE hrms_attendance SET status = ?, clock_in = ?, clock_out = ?, remarks = ? WHERE employee_id = ? AND date = ? AND tenant_id = ?");
            
            foreach ($entries as $entry) {
                $emp_id = $entry['employee_id'];
                $status = $entry['status'] ?? 'Present';
                $clock_in = $entry['clock_in'] ?? null;
                $clock_out = $entry['clock_out'] ?? null;
                $remarks = $entry['remarks'] ?? '';
                
                $check->execute([$emp_id, $date, $tenant_id]);
                if ($check->fetch()) {
                    $update->execute([$status, $clock_in, $clock_out, $remarks, $emp_id, $date, $tenant_id]);
                } else {
                    $insert->execute([$emp_id, $date, $status, $clock_in, $clock_out, $remarks, $tenant_id]);
                }
                $inserted++;
            }
            
            echo json_encode(["success" => true, "message" => "$inserted attendance records saved."]);
        } else {
            // Single entry
            $employee_id = $input['employee_id'] ?? null;
            
            // Enforce ESS isolation
            if (!$is_admin_or_manager) {
                if (!$current_emp_id) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "error" => "No employee record linked to your user account."]);
                    exit;
                }
                $employee_id = $current_emp_id; // Force to their own
            }

            $date = $input['date'] ?? date('Y-m-d');
            $status = $input['status'] ?? 'Present';
            $clock_in = $input['clock_in'] ?? null;
            $clock_out = $input['clock_out'] ?? null;
            $remarks = $input['remarks'] ?? '';
            
            if (!$employee_id) {
                echo json_encode(["success" => false, "error" => "Employee ID is required."]);
                exit;
            }
            
            // Check if record already exists for this employee on this date
            $check = $pdo->prepare("SELECT id FROM hrms_attendance WHERE employee_id = ? AND date = ? AND tenant_id = ?");
            $check->execute([$employee_id, $date, $tenant_id]);
            
            if ($existing = $check->fetch()) {
                // Update existing
                $stmt = $pdo->prepare("UPDATE hrms_attendance SET status = ?, clock_in = ?, clock_out = ?, remarks = ? WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$status, $clock_in, $clock_out, $remarks, $existing['id'], $tenant_id]);
                echo json_encode(["success" => true, "message" => "Attendance updated."]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO hrms_attendance (employee_id, date, status, clock_in, clock_out, remarks, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$employee_id, $date, $status, $clock_in, $clock_out, $remarks, $tenant_id]);
                echo json_encode(["success" => true, "message" => "Attendance marked.", "id" => $pdo->lastInsertId()]);
            }
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = $input['id'] ?? null;
        
        if (!$id) {
            echo json_encode(["success" => false, "error" => "Attendance ID is required."]);
            exit;
        }

        if (!$is_admin_or_manager) {
            // Employees can only edit their own attendance
            if (!$current_emp_id) {
                http_response_code(403);
                echo json_encode(["success" => false, "error" => "Unauthorized"]);
                exit;
            }
            $check = $pdo->prepare("SELECT id FROM hrms_attendance WHERE id = ? AND employee_id = ?");
            $check->execute([$id, $current_emp_id]);
            if (!$check->fetch()) {
                http_response_code(403);
                echo json_encode(["success" => false, "error" => "Unauthorized to edit this record."]);
                exit;
            }
        }
        
        $status = $input['status'] ?? null;
        $clock_in = $input['clock_in'] ?? null;
        $clock_out = $input['clock_out'] ?? null;
        $remarks = $input['remarks'] ?? null;
        
        // Calculate working hours if both clock_in and clock_out are provided
        $working_hours = null;
        if ($clock_in && $clock_out) {
            $in = new DateTime($clock_in);
            $out = new DateTime($clock_out);
            $diff = $in->diff($out);
            $working_hours = round($diff->h + ($diff->i / 60), 2);
        }
        
        $stmt = $pdo->prepare("UPDATE hrms_attendance SET status = COALESCE(?, status), clock_in = COALESCE(?, clock_in), clock_out = COALESCE(?, clock_out), working_hours = COALESCE(?, working_hours), remarks = COALESCE(?, remarks) WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$status, $clock_in, $clock_out, $working_hours, $remarks, $id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Attendance updated."]);
        break;

    case 'DELETE':
        if (!$is_admin_or_manager) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Unauthorized to delete attendance records."]);
            exit;
        }
        $id = $_GET['id'] ?? null;
        if (!$id) {
            echo json_encode(["success" => false, "error" => "Attendance ID is required."]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM hrms_attendance WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Attendance record deleted."]);
        break;
}
?>
