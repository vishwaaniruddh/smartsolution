<?php
// invoices.php - Customer Invoicing API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

header('Content-Type: application/json');

switch ($method) {
    case 'GET':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;

        try {
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM accounting_invoices WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$id, $tenant_id]);
                $inv = $stmt->fetch();

                if ($inv) {
                    $istmt = $pdo->prepare("SELECT * FROM accounting_invoice_items WHERE invoice_id = ? AND tenant_id = ?");
                    $istmt->execute([$id, $tenant_id]);
                    $inv['items'] = $istmt->fetchAll();
                    echo json_encode(["success" => true, "data" => $inv]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Invoice not found."]);
                }
            } else {
                $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
                $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10;
                $offset = ($page - 1) * $limit;

                $where = ["tenant_id = ?"];
                $params = [$tenant_id];

                if (!empty($_GET['search'])) {
                    $search = '%' . trim($_GET['search']) . '%';
                    $where[] = "(invoice_number LIKE ? OR customer_name LIKE ?)";
                    $params[] = $search;
                    $params[] = $search;
                }

                if (!empty($_GET['status'])) {
                    $where[] = "status = ?";
                    $params[] = trim($_GET['status']);
                }

                $whereClause = implode(" AND ", $where);

                // Count total records
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM accounting_invoices WHERE $whereClause");
                $countStmt->execute($params);
                $total_records = intval($countStmt->fetchColumn());
                $total_pages = ceil($total_records / $limit);

                // Fetch paginated data
                $stmt = $pdo->prepare("SELECT * FROM accounting_invoices WHERE $whereClause ORDER BY issue_date DESC, id DESC LIMIT $limit OFFSET $offset");
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
        $input = json_decode(file_get_contents("php://input"), true);
        $invoice_number = isset($input['invoice_number']) ? trim($input['invoice_number']) : '';
        $customer_name = isset($input['customer_name']) ? trim($input['customer_name']) : '';
        $issue_date = isset($input['issue_date']) ? $input['issue_date'] : date('Y-m-d');
        $due_date = isset($input['due_date']) ? $input['due_date'] : date('Y-m-d', strtotime('+30 days'));
        $sales_order_id = isset($input['sales_order_id']) && intval($input['sales_order_id']) > 0 ? intval($input['sales_order_id']) : null;
        $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];

        if (empty($invoice_number) || empty($customer_name) || empty($items)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invoice number, customer name, and line items are required."]);
            exit;
        }

        try {
            // Check uniqueness of invoice number for this tenant
            $check = $pdo->prepare("SELECT id FROM accounting_invoices WHERE invoice_number = ? AND tenant_id = ?");
            $check->execute([$invoice_number, $tenant_id]);
            if ($check->fetch()) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invoice number '$invoice_number' already exists."]);
                exit;
            }

            $pdo->beginTransaction();

            // Calculate subtotal and total
            $subtotal = 0.00;
            foreach ($items as $item) {
                $qty = intval($item['quantity'] ?? 1);
                $price = floatval($item['unit_price'] ?? 0.00);
                $subtotal += ($qty * $price);
            }
            $tax_rate = isset($input['tax_rate']) ? floatval($input['tax_rate']) : 0.00;
            $tax_amount = isset($input['tax_amount']) ? floatval($input['tax_amount']) : 0.00;
            if ($tax_amount <= 0.00 && $tax_rate > 0.00) {
                $tax_amount = round($subtotal * ($tax_rate / 100.0), 2);
            }
            $total_amount = $subtotal + $tax_amount;

            // Insert invoice
            $stmt = $pdo->prepare("INSERT INTO accounting_invoices (invoice_number, customer_name, issue_date, due_date, status, total_amount, amount_due, sales_order_id, tenant_id, tax_rate, tax_amount) VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$invoice_number, $customer_name, $issue_date, $due_date, $total_amount, $total_amount, $sales_order_id, $tenant_id, $tax_rate, $tax_amount]);
            $invoice_id = $pdo->lastInsertId();

            // Insert items
            $istmt = $pdo->prepare("INSERT INTO accounting_invoice_items (invoice_id, description, quantity, unit_price, amount, product_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $desc = trim($item['description'] ?? 'Product item');
                $qty = intval($item['quantity'] ?? 1);
                $price = floatval($item['unit_price'] ?? 0.00);
                $amount = $qty * $price;
                $product_id = isset($item['product_id']) && intval($item['product_id']) > 0 ? intval($item['product_id']) : null;
                
                $istmt->execute([$invoice_id, $desc, $qty, $price, $amount, $product_id, $tenant_id]);
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Invoice generated successfully.", "id" => $invoice_id]);
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
            echo json_encode(["success" => false, "error" => "Invoice ID and status are required."]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Fetch current invoice state
            $checkStmt = $pdo->prepare("SELECT * FROM accounting_invoices WHERE id = ? AND tenant_id = ?");
            $checkStmt->execute([$id, $tenant_id]);
            $inv = $checkStmt->fetch();

            if (!$inv) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Invoice not found."]);
                $pdo->rollBack();
                exit;
            }

            $old_status = $inv['status'];
            if ($old_status === $status) {
                echo json_encode(["success" => true, "message" => "No change in invoice status."]);
                $pdo->rollBack();
                exit;
            }

            // Update status
            $upStmt = $pdo->prepare("UPDATE accounting_invoices SET status = ? WHERE id = ? AND tenant_id = ?");
            $upStmt->execute([$status, $id, $tenant_id]);

            // Auto-Journalize transition: Draft -> Open (Sent to customer)
            if ($old_status === 'Draft' && ($status === 'Open' || $status === 'Paid')) {
                // Fetch Accounts Receivable account
                $arStmt = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = '1200' AND tenant_id = ? LIMIT 1");
                $arStmt->execute([$tenant_id]);
                $ar_account = $arStmt->fetchColumn();

                // Fetch Sales Revenue account
                $revStmt = $pdo->prepare("SELECT id FROM accounting_accounts WHERE code = '4000' AND tenant_id = ? LIMIT 1");
                $revStmt->execute([$tenant_id]);
                $rev_account = $revStmt->fetchColumn();

                if ($ar_account && $rev_account) {
                    $tax_amount = floatval($inv['tax_amount'] ?? 0.00);
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
                            $inv['issue_date'],
                            $inv['invoice_number'],
                            "Automated Entry: Customer Invoice #{$inv['invoice_number']} to '{$inv['customer_name']}' (with GST)",
                            $tenant_id
                        ]);
                        $j_id = $pdo->lastInsertId();

                        // Insert Journal Lines
                        $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
                        
                        $subtotal = floatval($inv['total_amount']) - $tax_amount;
                        // Debit Accounts Receivable (Asset increases)
                        $jLine->execute([$j_id, $ar_account, $inv['total_amount'], 0.00, $tenant_id]);
                        // Credit Sales Revenue (Revenue increases)
                        $jLine->execute([$j_id, $rev_account, 0.00, $subtotal, $tenant_id]);
                        // Credit Sales Tax Payable (Liability increases)
                        $jLine->execute([$j_id, $tax_account, 0.00, $tax_amount, $tenant_id]);
                    } else {
                        // Create balanced Journal Entry
                        $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
                        $jHeader->execute([
                            $inv['issue_date'],
                            $inv['invoice_number'],
                            "Automated Entry: Customer Invoice #{$inv['invoice_number']} to '{$inv['customer_name']}'",
                            $tenant_id
                        ]);
                        $j_id = $pdo->lastInsertId();

                        // Insert Journal Lines
                        $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
                        
                        // Debit Accounts Receivable (Asset increases)
                        $jLine->execute([$j_id, $ar_account, $inv['total_amount'], 0.00, $tenant_id]);
                        // Credit Sales Revenue (Revenue increases)
                        $jLine->execute([$j_id, $rev_account, 0.00, $inv['total_amount'], $tenant_id]);
                    }
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Invoice status updated to $status successfully."]);
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
            echo json_encode(["success" => false, "error" => "Invoice ID is required."]);
            exit;
        }

        try {
            $check = $pdo->prepare("SELECT status FROM accounting_invoices WHERE id = ? AND tenant_id = ?");
            $check->execute([$id, $tenant_id]);
            $status = $check->fetchColumn();

            if ($status && $status !== 'Draft') {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Only Draft invoices can be deleted. Cancel or void open invoices instead."]);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM accounting_invoices WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "Invoice deleted successfully."]);
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
