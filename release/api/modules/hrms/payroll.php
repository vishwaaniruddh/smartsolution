<?php
// HRMS Payroll API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'structure') {
            // Get salary structures
            $employee_id = $_GET['employee_id'] ?? null;
            
            $sql = "SELECT ss.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.emp_code, d.name as department_name, des.name as designation_name
                FROM hrms_salary_structures ss
                JOIN hrms_employees e ON ss.employee_id = e.id
                LEFT JOIN hrms_departments d ON e.department_id = d.id
                LEFT JOIN hrms_designations des ON e.designation_id = des.id
                WHERE ss.tenant_id = ?";
            $params = [$tenant_id];
            
            if ($employee_id) {
                $sql .= " AND ss.employee_id = ?";
                $params[] = $employee_id;
            }
            
            $sql .= " ORDER BY e.first_name";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
            
        } else {
            // Get payroll runs
            $month = $_GET['month'] ?? date('n');
            $year = $_GET['year'] ?? date('Y');
            
            $sql = "SELECT pr.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.emp_code, d.name as department_name
                FROM hrms_payroll_runs pr
                JOIN hrms_employees e ON pr.employee_id = e.id
                LEFT JOIN hrms_departments d ON e.department_id = d.id
                WHERE pr.tenant_id = ? AND pr.month = ? AND pr.year = ?
                ORDER BY e.first_name";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$tenant_id, $month, $year]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        
        if ($action === 'structure') {
            // Create/update salary structure
            $employee_id = $input['employee_id'] ?? null;
            $basic = $input['basic'] ?? 0;
            $hra = $input['hra'] ?? 0;
            $da = $input['da'] ?? 0;
            $special_allowance = $input['special_allowance'] ?? 0;
            $pf_deduction = $input['pf_deduction'] ?? 0;
            $esi_deduction = $input['esi_deduction'] ?? 0;
            $tax_deduction = $input['tax_deduction'] ?? 0;
            $other_deductions = $input['other_deductions'] ?? 0;
            
            $gross = $basic + $hra + $da + $special_allowance;
            $deductions = $pf_deduction + $esi_deduction + $tax_deduction + $other_deductions;
            $net_salary = $gross - $deductions;
            
            if (!$employee_id) {
                echo json_encode(["success" => false, "error" => "Employee ID is required."]);
                exit;
            }
            
            // Check if structure exists
            $check = $pdo->prepare("SELECT id FROM hrms_salary_structures WHERE employee_id = ? AND tenant_id = ?");
            $check->execute([$employee_id, $tenant_id]);
            
            if ($existing = $check->fetch()) {
                $stmt = $pdo->prepare("UPDATE hrms_salary_structures SET basic = ?, hra = ?, da = ?, special_allowance = ?, pf_deduction = ?, esi_deduction = ?, tax_deduction = ?, other_deductions = ?, net_salary = ? WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$basic, $hra, $da, $special_allowance, $pf_deduction, $esi_deduction, $tax_deduction, $other_deductions, $net_salary, $existing['id'], $tenant_id]);
                echo json_encode(["success" => true, "message" => "Salary structure updated."]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO hrms_salary_structures (employee_id, basic, hra, da, special_allowance, pf_deduction, esi_deduction, tax_deduction, other_deductions, net_salary, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$employee_id, $basic, $hra, $da, $special_allowance, $pf_deduction, $esi_deduction, $tax_deduction, $other_deductions, $net_salary, $tenant_id]);
                echo json_encode(["success" => true, "message" => "Salary structure created."]);
            }
            
        } elseif ($action === 'run') {
            // Run payroll for a month
            $month = $input['month'] ?? date('n');
            $year = $input['year'] ?? date('Y');
            
            // Get all employees with salary structures
            $employees = $pdo->prepare("SELECT ss.*, e.id as emp_id FROM hrms_salary_structures ss JOIN hrms_employees e ON ss.employee_id = e.id WHERE ss.tenant_id = ? AND e.status = 'Active'");
            $employees->execute([$tenant_id]);
            
            $processed = 0;
            foreach ($employees->fetchAll() as $emp) {
                $gross = $emp['basic'] + $emp['hra'] + $emp['da'] + $emp['special_allowance'];
                $deductions = $emp['pf_deduction'] + $emp['esi_deduction'] + $emp['tax_deduction'] + $emp['other_deductions'];
                $net = $gross - $deductions;
                
                // Check if already processed
                $check = $pdo->prepare("SELECT id FROM hrms_payroll_runs WHERE employee_id = ? AND month = ? AND year = ? AND tenant_id = ?");
                $check->execute([$emp['employee_id'], $month, $year, $tenant_id]);
                
                if ($existing = $check->fetch()) {
                    $update = $pdo->prepare("UPDATE hrms_payroll_runs SET gross_salary = ?, total_deductions = ?, net_salary = ?, status = 'Processed' WHERE id = ?");
                    $update->execute([$gross, $deductions, $net, $existing['id']]);
                } else {
                    $insert = $pdo->prepare("INSERT INTO hrms_payroll_runs (employee_id, month, year, gross_salary, total_deductions, net_salary, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?, 'Processed', ?)");
                    $insert->execute([$emp['employee_id'], $month, $year, $gross, $deductions, $net, $tenant_id]);
                }
                $processed++;
            }
            
            echo json_encode(["success" => true, "message" => "Payroll processed for $processed employees."]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = $input['id'] ?? null;
        $status = $input['status'] ?? 'Paid';
        $paid_on = $input['paid_on'] ?? date('Y-m-d');
        
        if (!$id) {
            echo json_encode(["success" => false, "error" => "Payroll run ID is required."]);
            exit;
        }
        
        $stmt = $pdo->prepare("UPDATE hrms_payroll_runs SET status = ?, paid_on = ? WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$status, $paid_on, $id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Payroll status updated."]);
        break;
}
?>
