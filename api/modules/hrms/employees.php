<?php
// HRMS Employees API
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/validation.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $id = $_GET['id'] ?? null;
        
        if ($id) {
            // Get single employee with all details
            $stmt = $pdo->prepare("SELECT e.*, 
                d.name as department_name, 
                des.name as designation_name,
                (SELECT CONCAT(m.first_name, ' ', m.last_name) FROM hrms_employees m WHERE m.id = e.reporting_manager_id) as manager_name
                FROM hrms_employees e
                LEFT JOIN hrms_departments d ON e.department_id = d.id
                LEFT JOIN hrms_designations des ON e.designation_id = des.id
                WHERE e.id = ? AND e.tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            $employee = $stmt->fetch();
            
            if ($employee) {
                // Get bank details
                $bank = $pdo->prepare("SELECT * FROM hrms_employee_bank_details WHERE employee_id = ? AND tenant_id = ?");
                $bank->execute([$id, $tenant_id]);
                $employee['bank_details'] = $bank->fetch() ?: null;
            }
            
            echo json_encode(["success" => true, "data" => $employee]);
        } else {
            // List all employees
            $search = $_GET['search'] ?? '';
            $department_id = $_GET['department_id'] ?? null;
            $status = $_GET['status'] ?? null;
            
            $sql = "SELECT e.*, 
                d.name as department_name, 
                des.name as designation_name
                FROM hrms_employees e
                LEFT JOIN hrms_departments d ON e.department_id = d.id
                LEFT JOIN hrms_designations des ON e.designation_id = des.id
                WHERE e.tenant_id = ?";
            $params = [$tenant_id];
            
            if (!empty($search)) {
                $sql .= " AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.emp_code LIKE ?)";
                $searchTerm = "%$search%";
                $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
            }
            
            if ($department_id) {
                $sql .= " AND e.department_id = ?";
                $params[] = $department_id;
            }
            
            if ($status) {
                $sql .= " AND e.status = ?";
                $params[] = $status;
            }
            
            $sql .= " ORDER BY e.first_name ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        
        $first_name = $input['first_name'] ?? '';
        $last_name = $input['last_name'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? '';
        $gender = $input['gender'] ?? '';
        $dob = $input['dob'] ?? null;
        $blood_group = $input['blood_group'] ?? '';
        $address = $input['address'] ?? '';
        $department_id = $input['department_id'] ?? null;
        $designation_id = $input['designation_id'] ?? null;
        $date_of_joining = $input['date_of_joining'] ?? null;
        $employment_type = $input['employment_type'] ?? 'Full-time';
        $reporting_manager_id = $input['reporting_manager_id'] ?? null;
        $status = $input['status'] ?? 'Active';

        if (empty($first_name) || empty($last_name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "First name and last name are required."]);
            exit;
        }

        if (!isValidEmail($email)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid Email address format."]);
            exit;
        }

        if (!isValidPhone($phone)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid Phone Number format. Must be between 7 and 15 digits."]);
            exit;
        }

        // Auto-generate employee code
        $count = $pdo->prepare("SELECT COUNT(*) as cnt FROM hrms_employees WHERE tenant_id = ?");
        $count->execute([$tenant_id]);
        $total = $count->fetch()['cnt'];
        $emp_code = 'EMP' . str_pad($total + 1, 3, '0', STR_PAD_LEFT);
        
        // Ensure unique emp_code
        $check = $pdo->prepare("SELECT id FROM hrms_employees WHERE emp_code = ? AND tenant_id = ?");
        $check->execute([$emp_code, $tenant_id]);
        while ($check->fetch()) {
            $total++;
            $emp_code = 'EMP' . str_pad($total + 1, 3, '0', STR_PAD_LEFT);
            $check->execute([$emp_code, $tenant_id]);
        }

        $stmt = $pdo->prepare("INSERT INTO hrms_employees (emp_code, first_name, last_name, email, phone, gender, dob, blood_group, address, department_id, designation_id, date_of_joining, employment_type, reporting_manager_id, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$emp_code, $first_name, $last_name, $email, $phone, $gender, $dob, $blood_group, $address, $department_id, $designation_id, $date_of_joining, $employment_type, $reporting_manager_id, $status, $tenant_id]);
        $employee_id = $pdo->lastInsertId();

        // Save bank details if provided
        $bank_name = $input['bank_name'] ?? '';
        $account_number = $input['account_number'] ?? '';
        $ifsc_code = $input['ifsc_code'] ?? '';
        $pan_number = $input['pan_number'] ?? '';
        
        if (!empty($bank_name) || !empty($account_number)) {
            $bank = $pdo->prepare("INSERT INTO hrms_employee_bank_details (employee_id, bank_name, account_number, ifsc_code, pan_number, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
            $bank->execute([$employee_id, $bank_name, $account_number, $ifsc_code, $pan_number, $tenant_id]);
        }

        // Auto-create leave balances for the employee
        $leave_types = $pdo->prepare("SELECT id, default_days FROM hrms_leave_types WHERE tenant_id = ?");
        $leave_types->execute([$tenant_id]);
        $year = date('Y');
        $lb = $pdo->prepare("INSERT INTO hrms_leave_balances (employee_id, leave_type_id, allocated, used, remaining, year, tenant_id) VALUES (?, ?, ?, 0, ?, ?, ?)");
        foreach ($leave_types->fetchAll() as $lt) {
            $lb->execute([$employee_id, $lt['id'], $lt['default_days'], $lt['default_days'], $year, $tenant_id]);
        }

        echo json_encode(["success" => true, "message" => "Employee created.", "id" => $employee_id, "emp_code" => $emp_code]);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = $input['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Employee ID is required."]);
            exit;
        }

        if (array_key_exists('email', $input) && !isValidEmail($input['email'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid Email address format."]);
            exit;
        }

        if (array_key_exists('phone', $input) && !isValidPhone($input['phone'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid Phone Number format. Must be between 7 and 15 digits."]);
            exit;
        }

        $fields = [];
        $params = [];
        $allowed = ['first_name', 'last_name', 'email', 'phone', 'gender', 'dob', 'blood_group', 'address', 'department_id', 'designation_id', 'date_of_joining', 'employment_type', 'reporting_manager_id', 'status'];
        
        foreach ($allowed as $field) {
            if (isset($input[$field])) {
                $fields[] = "$field = ?";
                $params[] = $input[$field];
            }
        }
        
        if (count($fields) > 0) {
            $params[] = $id;
            $params[] = $tenant_id;
            $sql = "UPDATE hrms_employees SET " . implode(', ', $fields) . " WHERE id = ? AND tenant_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

        // Update bank details if provided
        if (isset($input['bank_name']) || isset($input['account_number']) || isset($input['ifsc_code']) || isset($input['pan_number'])) {
            $check_bank = $pdo->prepare("SELECT id FROM hrms_employee_bank_details WHERE employee_id = ? AND tenant_id = ?");
            $check_bank->execute([$id, $tenant_id]);
            
            if ($check_bank->fetch()) {
                $bank = $pdo->prepare("UPDATE hrms_employee_bank_details SET bank_name = ?, account_number = ?, ifsc_code = ?, pan_number = ? WHERE employee_id = ? AND tenant_id = ?");
                $bank->execute([$input['bank_name'] ?? '', $input['account_number'] ?? '', $input['ifsc_code'] ?? '', $input['pan_number'] ?? '', $id, $tenant_id]);
            } else {
                $bank = $pdo->prepare("INSERT INTO hrms_employee_bank_details (employee_id, bank_name, account_number, ifsc_code, pan_number, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
                $bank->execute([$id, $input['bank_name'] ?? '', $input['account_number'] ?? '', $input['ifsc_code'] ?? '', $input['pan_number'] ?? '', $tenant_id]);
            }
        }

        echo json_encode(["success" => true, "message" => "Employee updated."]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            echo json_encode(["success" => false, "error" => "Employee ID is required."]);
            exit;
        }
        
        // Soft delete by changing status
        $stmt = $pdo->prepare("UPDATE hrms_employees SET status = 'Terminated' WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Employee terminated."]);
        break;
}
?>
