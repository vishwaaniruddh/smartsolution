<?php
// hrms/jobs.php - HRMS Job Openings API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("SELECT j.*, d.name as department_name, desg.name as designation_name
                FROM hrms_job_openings j
                LEFT JOIN hrms_departments d ON j.department_id = d.id
                LEFT JOIN hrms_designations desg ON j.designation_id = desg.id
                WHERE j.id = ? AND j.tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetch()]);
        } else {
            $stmt = $pdo->prepare("SELECT j.*, d.name as department_name, desg.name as designation_name,
                (SELECT COUNT(*) FROM hrms_candidates c WHERE c.job_opening_id = j.id AND c.tenant_id = j.tenant_id) as candidates_count
                FROM hrms_job_openings j
                LEFT JOIN hrms_departments d ON j.department_id = d.id
                LEFT JOIN hrms_designations desg ON j.designation_id = desg.id
                WHERE j.tenant_id = ?
                ORDER BY j.created_at DESC");
            $stmt->execute([$tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $title = trim($input['title'] ?? '');
        $department_id = $input['department_id'] ?? null;
        $designation_id = $input['designation_id'] ?? null;
        $description = trim($input['description'] ?? '');
        $requirements = trim($input['requirements'] ?? '');
        $experience_required = trim($input['experience_required'] ?? '');
        $vacancies = intval($input['vacancies'] ?? 1);
        $status = $input['status'] ?? 'Open';

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Job title is required."]);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO hrms_job_openings (title, department_id, designation_id, description, requirements, experience_required, vacancies, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$title, $department_id, $designation_id, $description, $requirements, $experience_required, $vacancies, $status, $tenant_id]);
        
        echo json_encode(["success" => true, "message" => "Job opening created.", "id" => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = $input['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Job ID is required."]);
            exit;
        }

        $fields = [];
        $params = [];
        $allowed = ['title', 'department_id', 'designation_id', 'description', 'requirements', 'experience_required', 'vacancies', 'status'];

        foreach ($allowed as $f) {
            if (isset($input[$f])) {
                $fields[] = "$f = ?";
                $params[] = $input[$f];
            }
        }

        if (count($fields) > 0) {
            $params[] = $id;
            $params[] = $tenant_id;
            $stmt = $pdo->prepare("UPDATE hrms_job_openings SET " . implode(', ', $fields) . " WHERE id = ? AND tenant_id = ?");
            $stmt->execute($params);
        }

        echo json_encode(["success" => true, "message" => "Job opening updated."]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Job ID is required."]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM hrms_job_openings WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Job opening deleted."]);
        break;
}
?>
