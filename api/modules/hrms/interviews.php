<?php
// hrms/interviews.php - HRMS Candidate Interviews API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

switch ($method) {
    case 'GET':
        $id = $_GET['id'] ?? null;
        $candidate_id = $_GET['candidate_id'] ?? null;

        if ($id) {
            $stmt = $pdo->prepare("SELECT i.*, 
                c.first_name as candidate_first_name, c.last_name as candidate_last_name, c.email as candidate_email,
                CONCAT(e.first_name, ' ', e.last_name) as interviewer_name
                FROM hrms_interviews i
                JOIN hrms_candidates c ON i.candidate_id = c.id AND i.tenant_id = c.tenant_id
                JOIN hrms_employees e ON i.interviewer_employee_id = e.id AND i.tenant_id = e.tenant_id
                WHERE i.id = ? AND i.tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetch()]);
        } elseif ($candidate_id) {
            $stmt = $pdo->prepare("SELECT i.*, CONCAT(e.first_name, ' ', e.last_name) as interviewer_name
                FROM hrms_interviews i
                JOIN hrms_employees e ON i.interviewer_employee_id = e.id AND i.tenant_id = e.tenant_id
                WHERE i.candidate_id = ? AND i.tenant_id = ?
                ORDER BY i.interview_date ASC");
            $stmt->execute([$candidate_id, $tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        } else {
            $stmt = $pdo->prepare("SELECT i.*, 
                c.first_name as candidate_first_name, c.last_name as candidate_last_name, c.email as candidate_email, j.title as job_title,
                CONCAT(e.first_name, ' ', e.last_name) as interviewer_name
                FROM hrms_interviews i
                JOIN hrms_candidates c ON i.candidate_id = c.id AND i.tenant_id = c.tenant_id
                JOIN hrms_job_openings j ON c.job_opening_id = j.id AND c.tenant_id = j.tenant_id
                JOIN hrms_employees e ON i.interviewer_employee_id = e.id AND i.tenant_id = e.tenant_id
                WHERE i.tenant_id = ?
                ORDER BY i.interview_date ASC");
            $stmt->execute([$tenant_id]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $candidate_id = $input['candidate_id'] ?? null;
        $interviewer_employee_id = $input['interviewer_employee_id'] ?? null;
        $interview_date = $input['interview_date'] ?? null;
        $round_name = trim($input['round_name'] ?? '');
        $status = $input['status'] ?? 'Scheduled';

        if (empty($candidate_id) || empty($interviewer_employee_id) || empty($interview_date) || empty($round_name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Candidate, Interviewer, Date, and Round name are required."]);
            exit;
        }

        // Create the interview schedule
        $stmt = $pdo->prepare("INSERT INTO hrms_interviews (candidate_id, interviewer_employee_id, interview_date, round_name, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$candidate_id, $interviewer_employee_id, $interview_date, $round_name, $status, $tenant_id]);
        $interview_id = $pdo->lastInsertId();

        // Automatically update the candidate stage to Interviewing
        $updateCandidate = $pdo->prepare("UPDATE hrms_candidates SET stage = 'Interviewing' WHERE id = ? AND tenant_id = ?");
        $updateCandidate->execute([$candidate_id, $tenant_id]);

        echo json_encode(["success" => true, "message" => "Interview scheduled.", "id" => $interview_id]);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = $input['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Interview ID is required."]);
            exit;
        }

        $fields = [];
        $params = [];
        $allowed = ['interviewer_employee_id', 'interview_date', 'round_name', 'rating', 'feedback', 'status'];

        foreach ($allowed as $f) {
            if (isset($input[$f])) {
                $fields[] = "$f = ?";
                $params[] = $input[$f];
            }
        }

        if (count($fields) > 0) {
            $params[] = $id;
            $params[] = $tenant_id;
            $stmt = $pdo->prepare("UPDATE hrms_interviews SET " . implode(', ', $fields) . " WHERE id = ? AND tenant_id = ?");
            $stmt->execute($params);
        }

        echo json_encode(["success" => true, "message" => "Interview updated."]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Interview ID is required."]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM hrms_interviews WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(["success" => true, "message" => "Interview deleted."]);
        break;
}
?>
