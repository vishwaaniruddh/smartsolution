<?php
// HRMS Dashboard API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

if ($method !== 'GET') {
    echo json_encode(["success" => false, "error" => "Only GET method is supported."]);
    exit;
}

$today = date('Y-m-d');
$current_month = date('n');
$current_year = date('Y');

// Total employees
$total_emp = $pdo->prepare("SELECT COUNT(*) as count FROM hrms_employees WHERE tenant_id = ? AND status = 'Active'");
$total_emp->execute([$tenant_id]);
$total_employees = $total_emp->fetch()['count'];

// Department breakdown
$dept_breakdown = $pdo->prepare("SELECT d.name, COUNT(e.id) as count FROM hrms_departments d LEFT JOIN hrms_employees e ON d.id = e.department_id AND e.tenant_id = d.tenant_id AND e.status = 'Active' WHERE d.tenant_id = ? GROUP BY d.id, d.name ORDER BY count DESC");
$dept_breakdown->execute([$tenant_id]);
$departments = $dept_breakdown->fetchAll();

// Today's attendance summary
$att_today = $pdo->prepare("SELECT status, COUNT(*) as count FROM hrms_attendance WHERE date = ? AND tenant_id = ? GROUP BY status");
$att_today->execute([$today, $tenant_id]);
$attendance_today = [];
$total_marked = 0;
foreach ($att_today->fetchAll() as $a) {
    $attendance_today[$a['status']] = (int)$a['count'];
    $total_marked += (int)$a['count'];
}
$attendance_today['Not Marked'] = max(0, $total_employees - $total_marked);

// Pending leave requests
$pending_leaves = $pdo->prepare("SELECT COUNT(*) as count FROM hrms_leave_requests WHERE status = 'Pending' AND tenant_id = ?");
$pending_leaves->execute([$tenant_id]);
$pending_leave_count = $pending_leaves->fetch()['count'];

// Recent leave requests
$recent_leaves = $pdo->prepare("SELECT lr.*, lt.name as leave_type_name, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.emp_code
    FROM hrms_leave_requests lr
    JOIN hrms_leave_types lt ON lr.leave_type_id = lt.id
    JOIN hrms_employees e ON lr.employee_id = e.id
    WHERE lr.tenant_id = ? ORDER BY lr.created_at DESC LIMIT 5");
$recent_leaves->execute([$tenant_id]);
$recent_leave_requests = $recent_leaves->fetchAll();

// Upcoming birthdays (this week)
$week_start = date('m-d');
$week_end = date('m-d', strtotime('+7 days'));
$birthdays = $pdo->prepare("SELECT first_name, last_name, emp_code, dob FROM hrms_employees WHERE tenant_id = ? AND status = 'Active' AND dob IS NOT NULL AND DATE_FORMAT(dob, '%m-%d') BETWEEN ? AND ? ORDER BY DATE_FORMAT(dob, '%m-%d') ASC LIMIT 5");
$birthdays->execute([$tenant_id, $week_start, $week_end]);
$upcoming_birthdays = $birthdays->fetchAll();

// Recent hires (last 30 days)
$recent_hires = $pdo->prepare("SELECT first_name, last_name, emp_code, department_id, date_of_joining, (SELECT name FROM hrms_departments WHERE id = e.department_id) as department_name FROM hrms_employees e WHERE e.tenant_id = ? AND e.date_of_joining >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ORDER BY e.date_of_joining DESC LIMIT 5");
$recent_hires->execute([$tenant_id]);
$new_hires = $recent_hires->fetchAll();

// Employee status breakdown
$status_breakdown = $pdo->prepare("SELECT status, COUNT(*) as count FROM hrms_employees WHERE tenant_id = ? GROUP BY status");
$status_breakdown->execute([$tenant_id]);
$employee_statuses = $status_breakdown->fetchAll();

// Monthly payroll summary
$payroll_summary = $pdo->prepare("SELECT SUM(net_salary) as total_payroll, COUNT(*) as employee_count, status FROM hrms_payroll_runs WHERE month = ? AND year = ? AND tenant_id = ? GROUP BY status");
$payroll_summary->execute([$current_month, $current_year, $tenant_id]);
$payroll_data = $payroll_summary->fetchAll();

// Recruitment ATS stats
$active_jobs = $pdo->prepare("SELECT COUNT(*) as count FROM hrms_job_openings WHERE tenant_id = ? AND status = 'Open'");
$active_jobs->execute([$tenant_id]);
$active_jobs_count = $active_jobs->fetch()['count'];

$candidates = $pdo->prepare("SELECT COUNT(*) as count FROM hrms_candidates WHERE tenant_id = ? AND stage NOT IN ('Hired', 'Rejected')");
$candidates->execute([$tenant_id]);
$candidates_count = $candidates->fetch()['count'];

$interviews = $pdo->prepare("SELECT COUNT(*) as count FROM hrms_interviews WHERE tenant_id = ? AND status = 'Scheduled'");
$interviews->execute([$tenant_id]);
$interviews_count = $interviews->fetch()['count'];

$recent_cands = $pdo->prepare("SELECT c.id, c.first_name, c.last_name, c.email, c.stage, c.experience_years, j.title as job_title 
    FROM hrms_candidates c 
    JOIN hrms_job_openings j ON c.job_opening_id = j.id AND c.tenant_id = j.tenant_id
    WHERE c.tenant_id = ? 
    ORDER BY c.created_at DESC LIMIT 5");
$recent_cands->execute([$tenant_id]);
$recent_candidates = $recent_cands->fetchAll();

echo json_encode([
    "success" => true,
    "data" => [
        "total_employees" => (int)$total_employees,
        "departments" => $departments,
        "attendance_today" => $attendance_today,
        "pending_leave_count" => (int)$pending_leave_count,
        "recent_leave_requests" => $recent_leave_requests,
        "upcoming_birthdays" => $upcoming_birthdays,
        "recent_hires" => $new_hires,
        "employee_statuses" => $employee_statuses,
        "payroll_summary" => $payroll_data,
        "recruitment" => [
            "active_jobs_count" => (int)$active_jobs_count,
            "candidates_count" => (int)$candidates_count,
            "interviews_count" => (int)$interviews_count,
            "recent_candidates" => $recent_candidates
        ]
    ]
]);
?>
