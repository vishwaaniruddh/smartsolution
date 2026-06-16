<?php
// hrms/bulk.php - Bulk Employee Import API
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/validation.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed."]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$employees = $input['employees'] ?? [];

if (!is_array($employees) || empty($employees)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "No employee records found in payload."]);
    exit;
}

try {
    $pdo->beginTransaction();

    $imported_count = 0;
    $errors = [];

    // Prepared statements for lookups and inserts
    $stmtFindDept = $pdo->prepare("SELECT id FROM hrms_departments WHERE LOWER(name) = ? AND tenant_id = ?");
    $stmtCreateDept = $pdo->prepare("INSERT INTO hrms_departments (name, description, tenant_id) VALUES (?, ?, ?)");
    
    $stmtFindDesg = $pdo->prepare("SELECT id FROM hrms_designations WHERE LOWER(name) = ? AND tenant_id = ?");
    $stmtCreateDesg = $pdo->prepare("INSERT INTO hrms_designations (name, department_id, tenant_id) VALUES (?, ?, ?)");

    $stmtInsertEmp = $pdo->prepare("INSERT INTO hrms_employees 
        (emp_code, first_name, last_name, email, phone, gender, dob, blood_group, address, department_id, designation_id, date_of_joining, employment_type, reporting_manager_id, status, tenant_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmtInsertBank = $pdo->prepare("INSERT INTO hrms_employee_bank_details 
        (employee_id, bank_name, account_number, ifsc_code, pan_number, tenant_id) 
        VALUES (?, ?, ?, ?, ?, ?)");

    $stmtLeaveTypes = $pdo->prepare("SELECT id, default_days FROM hrms_leave_types WHERE tenant_id = ?");
    $stmtLeaveTypes->execute([$tenant_id]);
    $leave_types = $stmtLeaveTypes->fetchAll();

    if (empty($leave_types)) {
        // Automatically seed default leave types for this tenant
        $defaults = [
            ['Casual Leave', 12],
            ['Sick Leave', 10],
            ['Earned Leave', 15],
            ['Unpaid Leave', 0]
        ];
        $stmtSeedLT = $pdo->prepare("INSERT INTO hrms_leave_types (name, default_days, tenant_id) VALUES (?, ?, ?)");
        foreach ($defaults as $d) {
            $stmtSeedLT->execute([$d[0], $d[1], $tenant_id]);
        }
        // Re-fetch
        $stmtLeaveTypes->execute([$tenant_id]);
        $leave_types = $stmtLeaveTypes->fetchAll();
    }

    $stmtInsertLeaveBalance = $pdo->prepare("INSERT INTO hrms_leave_balances 
        (employee_id, leave_type_id, allocated, used, remaining, year, tenant_id) 
        VALUES (?, ?, ?, 0, ?, ?, ?)");

    $current_year = intval(date('Y'));

    foreach ($employees as $index => $emp) {
        $first_name = trim($emp['first_name'] ?? '');
        $last_name = trim($emp['last_name'] ?? '');
        $email = trim($emp['email'] ?? '');
        $phone = trim($emp['phone'] ?? '');
        $gender = trim($emp['gender'] ?? 'Other');
        $dob = !empty($emp['dob']) ? trim($emp['dob']) : null;
        $blood_group = trim($emp['blood_group'] ?? '');
        $address = trim($emp['address'] ?? '');
        $date_of_joining = !empty($emp['date_of_joining']) ? trim($emp['date_of_joining']) : date('Y-m-d');
        $employment_type = trim($emp['employment_type'] ?? 'Full-time');
        $status = trim($emp['status'] ?? 'Active');
        
        $dept_name = trim($emp['department'] ?? '');
        $desg_name = trim($emp['designation'] ?? '');

        // Bank details
        $bank_name = trim($emp['bank_name'] ?? '');
        $account_number = trim($emp['account_number'] ?? '');
        $ifsc_code = trim($emp['ifsc_code'] ?? '');
        $pan_number = trim($emp['pan_number'] ?? '');

        // Validation
        if (empty($first_name) || empty($last_name)) {
            $errors[] = "Row " . ($index + 1) . ": First name and last name are required.";
            continue;
        }

        if (empty($email) || !isValidEmail($email)) {
            $errors[] = "Row " . ($index + 1) . " ($first_name $last_name): Invalid or missing email address.";
            continue;
        }

        // Check unique email for this tenant
        $stmtCheckEmail = $pdo->prepare("SELECT id FROM hrms_employees WHERE email = ? AND tenant_id = ?");
        $stmtCheckEmail->execute([$email, $tenant_id]);
        if ($stmtCheckEmail->fetch()) {
            $errors[] = "Row " . ($index + 1) . " ($first_name $last_name): Email '$email' already exists for an employee in this tenant.";
            continue;
        }

        // Map Department
        $department_id = null;
        if (!empty($dept_name)) {
            $stmtFindDept->execute([strtolower($dept_name), $tenant_id]);
            $dept_row = $stmtFindDept->fetch();
            if ($dept_row) {
                $department_id = $dept_row['id'];
            } else {
                $stmtCreateDept->execute([$dept_name, "Department created automatically via bulk import.", $tenant_id]);
                $department_id = $pdo->lastInsertId();
            }
        }

        // Map Designation
        $designation_id = null;
        if (!empty($desg_name)) {
            $stmtFindDesg->execute([strtolower($desg_name), $tenant_id]);
            $desg_row = $stmtFindDesg->fetch();
            if ($desg_row) {
                $designation_id = $desg_row['id'];
            } else {
                $stmtCreateDesg->execute([$desg_name, $department_id, $tenant_id]);
                $designation_id = $pdo->lastInsertId();
            }
        }

        // Auto-generate unique emp_code
        $stmtCount = $pdo->prepare("SELECT COUNT(*) as cnt FROM hrms_employees WHERE tenant_id = ?");
        $stmtCount->execute([$tenant_id]);
        $total = intval($stmtCount->fetch()['cnt']);
        $emp_code = 'EMP' . str_pad($total + 1, 3, '0', STR_PAD_LEFT);
        
        $stmtCheckCode = $pdo->prepare("SELECT id FROM hrms_employees WHERE emp_code = ? AND tenant_id = ?");
        $stmtCheckCode->execute([$emp_code, $tenant_id]);
        while ($stmtCheckCode->fetch()) {
            $total++;
            $emp_code = 'EMP' . str_pad($total + 1, 3, '0', STR_PAD_LEFT);
            $stmtCheckCode->execute([$emp_code, $tenant_id]);
        }

        // Insert Employee
        $stmtInsertEmp->execute([
            $emp_code,
            $first_name,
            $last_name,
            $email,
            !empty($phone) ? $phone : null,
            $gender,
            $dob,
            !empty($blood_group) ? $blood_group : null,
            !empty($address) ? $address : null,
            $department_id,
            $designation_id,
            $date_of_joining,
            $employment_type,
            null, // reporting_manager_id
            $status,
            $tenant_id
        ]);
        $employee_id = $pdo->lastInsertId();

        // Insert Bank Details if provided
        if (!empty($bank_name) || !empty($account_number)) {
            $stmtInsertBank->execute([
                $employee_id,
                $bank_name,
                $account_number,
                $ifsc_code,
                $pan_number,
                $tenant_id
            ]);
        }

        // Populate default leave balances
        foreach ($leave_types as $lt) {
            $stmtInsertLeaveBalance->execute([
                $employee_id,
                $lt['id'],
                $lt['default_days'],
                $lt['default_days'],
                $current_year,
                $tenant_id
            ]);
        }

        $imported_count++;
    }

    if (!empty($errors) && $imported_count === 0) {
        // If there were errors and zero successes, abort the transaction
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "No employees could be imported due to validation errors.",
            "details" => $errors
        ]);
        exit;
    }

    // Commit transaction
    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Import completed successfully.",
        "imported" => $imported_count,
        "errors" => $errors
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database transaction failed: " . $e->getMessage()
    ]);
}
