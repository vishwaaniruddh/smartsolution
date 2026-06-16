<?php
// hrms/candidates.php - HRMS Candidate Applications API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $id = $_GET['id'] ?? null;
        $job_opening_id = $_GET['job_opening_id'] ?? null;
        
        if ($id) {
            $stmt = $pdo->prepare("SELECT c.*, j.title as job_title, d.name as department_name
                FROM hrms_candidates c
                JOIN hrms_job_openings j ON c.job_opening_id = j.id AND c.tenant_id = j.tenant_id
                LEFT JOIN hrms_departments d ON j.department_id = d.id
                WHERE c.id = ? AND c.tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetch()]);
        } elseif ($job_opening_id) {
            $stmt = $pdo->prepare("SELECT c.*, j.title as job_title
                FROM hrms_candidates c
                JOIN hrms_job_openings j ON c.job_opening_id = j.id AND c.tenant_id = j.tenant_id
                WHERE c.job_opening_id = ? AND c.tenant_id = ?
                ORDER BY c.created_at DESC");
            $stmt->execute([$job_opening_id, $tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        } else {
            $stmt = $pdo->prepare("SELECT c.*, j.title as job_title
                FROM hrms_candidates c
                JOIN hrms_job_openings j ON c.job_opening_id = j.id AND c.tenant_id = j.tenant_id
                WHERE c.tenant_id = ?
                ORDER BY c.created_at DESC");
            $stmt->execute([$tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        }
        break;

    case 'POST':
        // Check for file uploads and standard fields in multipart/form-data
        $job_opening_id = $_POST['job_opening_id'] ?? null;
        $first_name = trim($_POST['first_name'] ?? '');
        $last_name = trim($_POST['last_name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $stage = $_POST['stage'] ?? 'Applied';
        $source = trim($_POST['source'] ?? 'Direct');
        $experience_years = floatval($_POST['experience_years'] ?? 0);

        if (empty($job_opening_id) || empty($first_name) || empty($last_name) || empty($email)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "First name, last name, email, and Job Opening ID are required."]);
            exit;
        }

        // Handle resume file upload
        $resume_path = null;
        if (isset($_FILES['resume']) && $_FILES['resume']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = __DIR__ . '/../../uploads/resumes/';
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }
            
            $file_ext = strtolower(pathinfo($_FILES['resume']['name'], PATHINFO_EXTENSION));
            $file_name = uniqid('resume_', true) . '.' . $file_ext;
            $dest_path = $upload_dir . $file_name;
            
            if (move_uploaded_file($_FILES['resume']['tmp_name'], $dest_path)) {
                $resume_path = 'uploads/resumes/' . $file_name;
            }
        }

        $stmt = $pdo->prepare("INSERT INTO hrms_candidates (job_opening_id, first_name, last_name, email, phone, resume_path, stage, source, experience_years, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$job_opening_id, $first_name, $last_name, $email, $phone, $resume_path, $stage, $source, $experience_years, $tenant_id]);
        
        echo json_encode(["success" => true, "message" => "Candidate profile created.", "id" => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        // Can be JSON payload
        $input = json_decode(file_get_contents("php://input"), true);
        $id = $input['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Candidate ID is required."]);
            exit;
        }

        $fields = [];
        $params = [];
        $allowed = ['job_opening_id', 'first_name', 'last_name', 'email', 'phone', 'stage', 'source', 'experience_years'];

        foreach ($allowed as $f) {
            if (isset($input[$f])) {
                $fields[] = "$f = ?";
                $params[] = $input[$f];
            }
        }

        if (count($fields) > 0) {
            $params[] = $id;
            $params[] = $tenant_id;
            $stmt = $pdo->prepare("UPDATE hrms_candidates SET " . implode(', ', $fields) . " WHERE id = ? AND tenant_id = ?");
            $stmt->execute($params);
        }

        echo json_encode(["success" => true, "message" => "Candidate updated."]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Candidate ID is required."]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM hrms_candidates WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Candidate deleted."]);
        break;
}
?>
