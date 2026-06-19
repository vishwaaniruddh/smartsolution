<?php
// journal_entries.php - General Ledger Journal Entries API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

header('Content-Type: application/json');

switch ($method) {
    case 'GET':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;

        try {
            if ($id) {
                // Fetch single journal entry with details
                $stmt = $pdo->prepare("SELECT * FROM accounting_journal_entries WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $entry = $stmt->fetch();

                if ($entry) {
                    $istmt = $pdo->prepare("SELECT ji.*, a.name as account_name, a.code as account_code 
                        FROM accounting_journal_items ji
                        JOIN accounting_accounts a ON ji.account_id = a.id
                        WHERE ji.journal_entry_id = ? AND ji.tenant_id = ?");
                    $istmt->execute([$id, $tenant_id]);
                    $entry['items'] = $istmt->fetchAll();
                    echo json_encode(["success" => true, "data" => $entry]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Journal Entry not found."]);
                }
            } else {
                $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
                $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10;
                $offset = ($page - 1) * $limit;

                $where = ["je.tenant_id = ?"];
                $params = [$tenant_id];

                if (!empty($_GET['search'])) {
                    $search = '%' . trim($_GET['search']) . '%';
                    $where[] = "(je.reference LIKE ? OR je.description LIKE ?)";
                    $params[] = $search;
                    $params[] = $search;
                }

                $whereClause = implode(" AND ", $where);

                // Count total records
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM accounting_journal_entries je WHERE $whereClause");
                $countStmt->execute($params);
                $total_records = intval($countStmt->fetchColumn());
                $total_pages = ceil($total_records / $limit);

                // Fetch paginated data with pre-calculated total_amount (total debits)
                $stmt = $pdo->prepare("SELECT je.*, COALESCE(SUM(ji.debit), 0.00) as total_amount
                    FROM accounting_journal_entries je
                    LEFT JOIN accounting_journal_items ji ON je.id = ji.journal_entry_id AND je.tenant_id = ji.tenant_id
                    WHERE $whereClause
                    GROUP BY je.id
                    ORDER BY je.entry_date DESC, je.id DESC
                    LIMIT $limit OFFSET $offset");
                $stmt->execute($params);
                $entries = $stmt->fetchAll();

                // Convert float types properly
                foreach ($entries as &$ent) {
                    $ent['total_amount'] = floatval($ent['total_amount']);
                }

                echo json_encode([
                    "success" => true,
                    "data" => $entries,
                    "pagination" => [
                        "page" => $page,
                        "limit" => $limit,
                        "total_records" => $total_records,
                        "total_pages" => $total_pages
                    ]
                ]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $entry_date = isset($input['entry_date']) ? $input['entry_date'] : date('Y-m-d');
        $reference = isset($input['reference']) ? trim($input['reference']) : '';
        $description = isset($input['description']) ? trim($input['description']) : '';
        $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];

        if (empty($description) || empty($items)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Description and line items are required."]);
            exit;
        }

        // Validate double-entry debits and credits match
        $total_debit = 0.00;
        $total_credit = 0.00;
        foreach ($items as $item) {
            $db = isset($item['debit']) ? floatval($item['debit']) : 0.00;
            $cr = isset($item['credit']) ? floatval($item['credit']) : 0.00;
            $total_debit += $db;
            $total_credit += $cr;
        }

        // Allow micro discrepancies due to float precision up to 0.01
        if (abs($total_debit - $total_credit) > 0.01) {
            http_response_code(400);
            echo json_encode([
                "success" => false, 
                "error" => "Unbalanced double-entry ledger. Debits must equal credits. Debits: $total_debit, Credits: $total_credit"
            ]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
            $stmt->execute([$entry_date, $reference ?: null, $description, $tenant_id]);
            $entry_id = $pdo->lastInsertId();

            $istmt = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $account_id = intval($item['account_id']);
                $debit = floatval($item['debit'] ?? 0.00);
                $credit = floatval($item['credit'] ?? 0.00);
                
                $istmt->execute([$entry_id, $account_id, $debit, $credit, $tenant_id]);
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Journal Entry posted successfully.", "id" => $entry_id]);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Journal Entry ID is required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM accounting_journal_entries WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Journal Entry deleted successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed."]);
        break;
}
?>
