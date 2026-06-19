<?php
// bills.php - Supplier Bills API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

header('Content-Type: application/json');

switch ($method) {
    case 'GET':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;

        try {
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM accounting_bills WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $bill = $stmt->fetch();

                if ($bill) {
                    $istmt = $pdo->prepare("SELECT * FROM accounting_bill_items WHERE bill_id = ? AND tenant_id = ?");
                    $istmt->execute([$id, $tenant_id]);
                    $bill['items'] = $istmt->fetchAll();
                    echo json_encode(["success" => true, "data" => $bill]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Bill not found."]);
                }
            } else {
                $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
                $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10;
                $offset = ($page - 1) * $limit;

                $where = ["tenant_id = ?"];
                $params = [$tenant_id];

                if (!empty($_GET['search'])) {
                    $search = '%' . trim($_GET['search']) . '%';
                    $where[] = "(bill_number LIKE ? OR vendor_name LIKE ?)";
                    $params[] = $search;
                    $params[] = $search;
                }

                if (!empty($_GET['status'])) {
                    $where[] = "status = ?";
                    $params[] = trim($_GET['status']);
                }

                $whereClause = implode(" AND ", $where);

                // Count total records
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM accounting_bills WHERE $whereClause");
                $countStmt->execute($params);
                $total_records = intval($countStmt->fetchColumn());
                $total_pages = ceil($total_records / $limit);

                // Fetch paginated data
                $stmt = $pdo->prepare("SELECT * FROM accounting_bills WHERE $whereClause ORDER BY issue_date DESC, id DESC LIMIT $limit OFFSET $offset");
                $stmt->execute($params);
                $data = $stmt->fetchAll();

                echo json_encode([
                    "success" => true,
                    "data" => $data,
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
        $is_multipart = (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false);
        if ($is_multipart) {
            $bill_number = isset($_POST['bill_number']) ? trim($_POST['bill_number']) : '';
            $vendor_name = isset($_POST['vendor_name']) ? trim($_POST['vendor_name']) : '';
            $issue_date = isset($_POST['issue_date']) ? $_POST['issue_date'] : date('Y-m-d');
            $due_date = isset($_POST['due_date']) ? $_POST['due_date'] : date('Y-m-d', strtotime('+30 days'));
            $purchase_order_id = isset($_POST['purchase_order_id']) && intval($_POST['purchase_order_id']) > 0 ? intval($_POST['purchase_order_id']) : null;
            $items = isset($_POST['items']) ? json_decode($_POST['items'], true) : [];
            $tax_rate = isset($_POST['tax_rate']) ? floatval($_POST['tax_rate']) : 0.00;
            $tax_amount = isset($_POST['tax_amount']) ? floatval($_POST['tax_amount']) : 0.00;
        } else {
            $input = json_decode(file_get_contents("php://input"), true);
            $bill_number = isset($input['bill_number']) ? trim($input['bill_number']) : '';
            $vendor_name = isset($input['vendor_name']) ? trim($input['vendor_name']) : '';
            $issue_date = isset($input['issue_date']) ? $input['issue_date'] : date('Y-m-d');
            $due_date = isset($input['due_date']) ? $input['due_date'] : date('Y-m-d', strtotime('+30 days'));
            $purchase_order_id = isset($input['purchase_order_id']) && intval($input['purchase_order_id']) > 0 ? intval($input['purchase_order_id']) : null;
            $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];
            $tax_rate = isset($input['tax_rate']) ? floatval($input['tax_rate']) : 0.00;
            $tax_amount = isset($input['tax_amount']) ? floatval($input['tax_amount']) : 0.00;
        }

        if (empty($bill_number) || empty($vendor_name) || empty($items)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Bill number, vendor name, and line items are required."]);
            exit;
        }

        try {
            // Check uniqueness of bill number for this tenant
            $check = $pdo->prepare("SELECT id FROM accounting_bills WHERE bill_number = ? AND tenant_id = ?");
            $check->execute([$bill_number, $tenant_id]);
            if ($check->fetch()) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Bill number '$bill_number' already exists."]);
                exit;
            }

            // Handle file upload
            $attachment_path = null;
            if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
                $upload_dir = __DIR__ . '/../../uploads/bills/';
                if (!is_dir($upload_dir)) {
                    mkdir($upload_dir, 0777, true);
                }
                
                $file_ext = strtolower(pathinfo($_FILES['attachment']['name'], PATHINFO_EXTENSION));
                $file_name = uniqid('bill_', true) . '.' . $file_ext;
                $dest_path = $upload_dir . $file_name;
                
                if (move_uploaded_file($_FILES['attachment']['tmp_name'], $dest_path)) {
                    $attachment_path = 'uploads/bills/' . $file_name;
                }
            }

            $pdo->beginTransaction();

            // Calculate subtotal and total
            $subtotal = 0.00;
            foreach ($items as $item) {
                $qty = intval($item['quantity'] ?? 1);
                $cost = floatval($item['unit_cost'] ?? 0.00);
                $subtotal += ($qty * $cost);
            }
            if ($tax_amount <= 0.00 && $tax_rate > 0.00) {
                $tax_amount = round($subtotal * ($tax_rate / 100.0), 2);
            }
            $total_amount = $subtotal + $tax_amount;

            // Insert bill
            $stmt = $pdo->prepare("INSERT INTO accounting_bills (bill_number, vendor_name, issue_date, due_date, status, total_amount, amount_due, purchase_order_id, tenant_id, tax_rate, tax_amount, attachment_path) VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$bill_number, $vendor_name, $issue_date, $due_date, $total_amount, $total_amount, $purchase_order_id, $tenant_id, $tax_rate, $tax_amount, $attachment_path]);
            $bill_id = $pdo->lastInsertId();

            // Insert items
            $istmt = $pdo->prepare("INSERT INTO accounting_bill_items (bill_id, description, quantity, unit_cost, amount, product_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $desc = trim($item['description'] ?? 'Supply items');
                $qty = intval($item['quantity'] ?? 1);
                $cost = floatval($item['unit_cost'] ?? 0.00);
                $amount = $qty * $cost;
                $product_id = isset($item['product_id']) && intval($item['product_id']) > 0 ? intval($item['product_id']) : null;
                
                $istmt->execute([$bill_id, $desc, $qty, $cost, $amount, $product_id, $tenant_id]);
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Bill recorded successfully.", "id" => $bill_id, "attachment_path" => $attachment_path]);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = isset($input['id']) ? intval($input['id']) : null;
        $status = isset($input['status']) ? trim($input['status']) : '';

        if (!$id || empty($status)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Bill ID and status are required."]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Fetch current bill state
            $checkStmt = $pdo->prepare("SELECT * FROM accounting_bills WHERE id = ? AND tenant_id = ?");
            $checkStmt->execute([$id, $tenant_id]);
            $bill = $checkStmt->fetch();

            if (!$bill) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Bill not found."]);
                $pdo->rollBack();
                exit;
            }

            $old_status = $bill['status'];
            if ($old_status === $status) {
                echo json_encode(["success" => true, "message" => "No change in bill status."]);
                $pdo->rollBack();
                exit;
            }

            // Update status
            $upStmt = $pdo->prepare("UPDATE accounting_bills SET status = ? WHERE id = ? AND tenant_id = ?");
            $upStmt->execute([$status, $id, $tenant_id]);

            // Auto-Journalize transition: Draft -> Open (Approved bill)
            if ($old_status === 'Draft' && ($status === 'Open' || $status === 'Paid')) {
                // Fetch Accounts Payable account (code 2000)
                $apStmt = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = '2000' AND tenant_id = ? LIMIT 1");
                $apStmt->execute([$tenant_id]);
                $ap_account = $apStmt->fetchColumn();

                // Fetch Inventory Purchases / Expense account (code 5200)
                $purStmt = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = '5200' AND tenant_id = ? LIMIT 1");
                $purStmt->execute([$tenant_id]);
                $pur_account = $purStmt->fetchColumn();

                if ($ap_account && $pur_account) {
                    $tax_amount = floatval($bill['tax_amount'] ?? 0.00);
                    if ($tax_amount > 0.00) {
                        // Fetch Sales Tax Payable account (code 2200)
                        $taxStmt = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = '2200' AND tenant_id = ? LIMIT 1");
                        $taxStmt->execute([$tenant_id]);
                        $tax_account = $taxStmt->fetchColumn();
                        
                        if (!$tax_account) {
                            $createTaxStmt = $pdo->prepare("INSERT INTO accounting_accounts (code, name, type, tenant_id) VALUES ('2200', 'Sales Tax Payable', 'Liability', ?)");
                            $createTaxStmt->execute([$tenant_id]);
                            $tax_account = $pdo->lastInsertId();
                        }

                        // Create balanced Journal Entry
                        $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
                        $jHeader->execute([
                            $bill['issue_date'],
                            $bill['bill_number'],
                            "Automated Entry: Supplier Bill #{$bill['bill_number']} from '{$bill['vendor_name']}' (with Input GST)",
                            $tenant_id
                        ]);
                        $j_id = $pdo->lastInsertId();

                        // Insert Journal Lines
                        $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
                        
                        $subtotal = floatval($bill['total_amount']) - $tax_amount;
                        // Debit Expense / Inventory Purchases (Expense increases)
                        $jLine->execute([$j_id, $pur_account, $subtotal, 0.00, $tenant_id]);
                        // Debit Sales Tax Payable (Liability decreases/Input tax credit offset)
                        $jLine->execute([$j_id, $tax_account, $tax_amount, 0.00, $tenant_id]);
                        // Credit Accounts Payable (Liability increases)
                        $jLine->execute([$j_id, $ap_account, 0.00, $bill['total_amount'], $tenant_id]);
                    } else {
                        // Create balanced Journal Entry
                        $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
                        $jHeader->execute([
                            $bill['issue_date'],
                            $bill['bill_number'],
                            "Automated Entry: Supplier Bill #{$bill['bill_number']} from '{$bill['vendor_name']}'",
                            $tenant_id
                        ]);
                        $j_id = $pdo->lastInsertId();

                        // Insert Journal Lines
                        $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
                        
                        // Debit Inventory Purchases (Expense increases)
                        $jLine->execute([$j_id, $pur_account, $bill['total_amount'], 0.00, $tenant_id]);
                        // Credit Accounts Payable (Liability increases)
                        $jLine->execute([$j_id, $ap_account, 0.00, $bill['total_amount'], $tenant_id]);
                    }
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Bill status updated to $status successfully."]);
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
            echo json_encode(["success" => false, "error" => "Bill ID is required."]);
            exit;
        }

        try {
            $check = $pdo->prepare("SELECT status FROM accounting_bills WHERE id = ? AND tenant_id = ?");
            $check->execute([$id, $tenant_id]);
            $status = $check->fetchColumn();

            if ($status && $status !== 'Draft') {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Only Draft bills can be deleted."]);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM accounting_bills WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Bill deleted successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;
}
?>
