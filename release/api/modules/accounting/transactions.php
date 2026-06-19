<?php
// transactions.php - Bank & Cash Transactions & Reconciliation API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

header('Content-Type: application/json');

switch ($method) {
    case 'GET':
        try {
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10;
            $offset = ($page - 1) * $limit;

            $where = ["t.tenant_id = ?"];
            $params = [$tenant_id];

            if (!empty($_GET['search'])) {
                $search = '%' . trim($_GET['search']) . '%';
                $where[] = "(t.reference LIKE ? OR t.payment_method LIKE ? OR i.invoice_number LIKE ? OR b.bill_number LIKE ?)";
                $params[] = $search;
                $params[] = $search;
                $params[] = $search;
                $params[] = $search;
            }

            if (!empty($_GET['type'])) {
                $where[] = "t.type = ?";
                $params[] = trim($_GET['type']);
            }

            $whereClause = implode(" AND ", $where);

            // Count total records
            $countStmt = $pdo->prepare("SELECT COUNT(DISTINCT t.id) 
                FROM accounting_transactions t
                LEFT JOIN accounting_invoices i ON t.invoice_id = i.id
                LEFT JOIN accounting_bills b ON t.bill_id = b.id
                WHERE $whereClause");
            $countStmt->execute($params);
            $total_records = intval($countStmt->fetchColumn());
            $total_pages = ceil($total_records / $limit);

            // Fetch paginated data
            $stmt = $pdo->prepare("SELECT t.*, i.invoice_number, b.bill_number 
                FROM accounting_transactions t
                LEFT JOIN accounting_invoices i ON t.invoice_id = i.id
                LEFT JOIN accounting_bills b ON t.bill_id = b.id
                WHERE $whereClause 
                ORDER BY t.payment_date DESC, t.id DESC
                LIMIT $limit OFFSET $offset");
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
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $payment_date = isset($input['payment_date']) ? $input['payment_date'] : date('Y-m-d');
        $payment_method = isset($input['payment_method']) ? trim($input['payment_method']) : 'Bank Transfer';
        $type = isset($input['type']) ? trim($input['type']) : ''; // Receipt (Inward) or Payment (Outward)
        $amount = isset($input['amount']) ? floatval($input['amount']) : 0.00;
        $reference = isset($input['reference']) ? trim($input['reference']) : '';
        $invoice_id = isset($input['invoice_id']) && intval($input['invoice_id']) > 0 ? intval($input['invoice_id']) : null;
        $bill_id = isset($input['bill_id']) && intval($input['bill_id']) > 0 ? intval($input['bill_id']) : null;

        if (empty($type) || $amount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Transaction type and valid positive amount are required."]);
            exit;
        }

        if ($type !== 'Receipt' && $type !== 'Payment') {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid transaction type. Supported: Receipt, Payment."]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Fetch Cash/Bank account (Code 1020)
            $bankStmt = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = '1020' AND tenant_id = ? LIMIT 1");
            $bankStmt->execute([$tenant_id]);
            $bank_account = $bankStmt->fetchColumn();

            if (!$bank_account) {
                // Fallback to Cash on Hand (Code 1010)
                $cashStmt = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = '1010' AND tenant_id = ? LIMIT 1");
                $cashStmt->execute([$tenant_id]);
                $bank_account = $cashStmt->fetchColumn();
            }

            if (!$bank_account) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "No Cash or Bank account found in Chart of Accounts."]);
                $pdo->rollBack();
                exit;
            }

            // Insert Transaction
            $stmt = $pdo->prepare("INSERT INTO accounting_transactions (payment_date, payment_method, type, amount, reference, invoice_id, bill_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$payment_date, $payment_method, $type, $amount, $reference ?: null, $invoice_id, $bill_id, $tenant_id]);
            $transaction_id = $pdo->lastInsertId();

            // Create Journal Entry
            $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
            $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");

            if ($type === 'Receipt') {
                // Customer Payment Receipt
                $description = "Receipt against Customer Payment. Ref: " . ($reference ?: 'N/A');
                $target_account = null;

                if ($invoice_id) {
                    // Fetch invoice details
                    $invStmt = $pdo->prepare("SELECT invoice_number, customer_name, amount_due FROM accounting_invoices WHERE id = ? AND tenant_id = ?");
                    $invStmt->execute([$invoice_id, $tenant_id]);
                    $inv = $invStmt->fetch();

                    if ($inv) {
                        $description = "Receipt: Customer payment for Invoice #{$inv['invoice_number']} ({$inv['customer_name']})";
                        
                        // Decrement invoice amount_due
                        $new_due = max(0.00, floatval($inv['amount_due']) - $amount);
                        $new_status = ($new_due == 0) ? 'Paid' : 'Open';
                        
                        $upInv = $pdo->prepare("UPDATE accounting_invoices SET amount_due = ?, status = ? WHERE id = ?");
                        $upInv->execute([$new_due, $new_status, $invoice_id]);
                    }
                }

                // Fetch Accounts Receivable account (Code 1200)
                $arStmt = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = '1200' AND tenant_id = ? LIMIT 1");
                $arStmt->execute([$tenant_id]);
                $target_account = $arStmt->fetchColumn();

                if ($target_account) {
                    $jHeader->execute([$payment_date, $reference ?: 'Receipt', $description, $tenant_id]);
                    $j_id = $pdo->lastInsertId();

                    // Debit Bank/Cash (Asset increases)
                    $jLine->execute([$j_id, $bank_account, $amount, 0.00, $tenant_id]);
                    // Credit Accounts Receivable (Asset decreases)
                    $jLine->execute([$j_id, $target_account, 0.00, $amount, $tenant_id]);
                }

            } else {
                // Supplier Payment Outward
                $description = "Disbursement: Payment to Supplier/Expense. Ref: " . ($reference ?: 'N/A');
                $target_account = null;

                if ($bill_id) {
                    // Fetch bill details
                    $billStmt = $pdo->prepare("SELECT bill_number, vendor_name, amount_due FROM accounting_bills WHERE id = ? AND tenant_id = ?");
                    $billStmt->execute([$bill_id, $tenant_id]);
                    $bill = $billStmt->fetch();

                    if ($bill) {
                        $description = "Disbursement: Vendor payment for Bill #{$bill['bill_number']} ({$bill['vendor_name']})";
                        
                        // Decrement bill amount_due
                        $new_due = max(0.00, floatval($bill['amount_due']) - $amount);
                        $new_status = ($new_due == 0) ? 'Paid' : 'Open';
                        
                        $upBill = $pdo->prepare("UPDATE accounting_bills SET amount_due = ?, status = ? WHERE id = ?");
                        $upBill->execute([$new_due, $new_status, $bill_id]);
                    }
                }

                // Fetch Accounts Payable account (Code 2000)
                $apStmt = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = '2000' AND tenant_id = ? LIMIT 1");
                $apStmt->execute([$tenant_id]);
                $target_account = $apStmt->fetchColumn();

                if ($target_account) {
                    $jHeader->execute([$payment_date, $reference ?: 'Payment', $description, $tenant_id]);
                    $j_id = $pdo->lastInsertId();

                    // Debit Accounts Payable (Liability decreases)
                    $jLine->execute([$j_id, $target_account, $amount, 0.00, $tenant_id]);
                    // Credit Bank/Cash (Asset decreases)
                    $jLine->execute([$j_id, $bank_account, 0.00, $amount, $tenant_id]);
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Transaction recorded successfully.", "id" => $transaction_id]);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        // Deleting transactions
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Transaction ID is required."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM accounting_transactions WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Transaction deleted successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed."]);
        break;
}
?>
