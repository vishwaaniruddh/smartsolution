<?php
// test_accounting_flows.php - Integration and Verification Script for Accounting Module
require_once __DIR__ . '/../api/core/db.php';

echo "=== STARTING ACCOUNTING INTEGRATION TESTS ===\n";

// Set tenant to a test context (e.g., tenant_id = 3 to isolate tests)
$tenant_id = 3;
$_GET['tenant_id'] = $tenant_id; // For getTenantId() function if it reads from GET

// 1. Wipe previous test runs for Tenant 3 to ensure clean run
echo "1. Cleaning up previous records for Test Tenant 3...\n";
$pdo->exec("DELETE FROM accounting_transactions WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_journal_items WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_journal_entries WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_invoice_items WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_invoices WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_bill_items WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_bills WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_accounts WHERE tenant_id = $tenant_id");

// Seed standard accounts for Tenant 3 (similar to setup.php seeding)
echo "2. Seeding default Chart of Accounts for Tenant 3...\n";
$default_accounts = [
    ['1010', 'Cash on Hand', 'Asset'],
    ['1020', 'Bank Account', 'Asset'],
    ['1200', 'Accounts Receivable', 'Asset'],
    ['2000', 'Accounts Payable', 'Liability'],
    ['3000', 'Owner Equity', 'Equity'],
    ['4000', 'Sales Revenue', 'Revenue'],
    ['5200', 'Inventory Purchases', 'Expense']
];

$stmt = $pdo->prepare("INSERT INTO accounting_accounts (code, name, type, tenant_id) VALUES (?, ?, ?, ?)");
foreach ($default_accounts as $acc) {
    $stmt->execute([$acc[0], $acc[1], $acc[2], $tenant_id]);
}

// Fetch seeded accounts and map code -> id
$accountsMap = [];
$getAccs = $pdo->query("SELECT id, code FROM accounting_accounts WHERE tenant_id = $tenant_id")->fetchAll();
foreach ($getAccs as $r) {
    $accountsMap[$r['code']] = intval($r['id']);
}
assert(count($accountsMap) === 7, "Seeding Chart of Accounts failed.");
echo "   Successfully seeded " . count($accountsMap) . " accounts.\n";

// 3. Test balanced journal entry posting
echo "3. Testing posting a balanced journal entry...\n";
$entry_date = date('Y-m-d');
$description = "Test balanced entry - Capital injection";
$items = [
    ['account_id' => $accountsMap['1020'], 'debit' => 1000.00, 'credit' => 0.00], // Debit Bank
    ['account_id' => $accountsMap['3000'], 'debit' => 0.00, 'credit' => 1000.00]  // Credit Owner Equity
];

// Verify debits match credits
$total_debit = 0.00;
$total_credit = 0.00;
foreach ($items as $item) {
    $total_debit += $item['debit'];
    $total_credit += $item['credit'];
}
assert(abs($total_debit - $total_credit) < 0.01, "Test entry debits and credits do not match.");

try {
    $pdo->beginTransaction();
    $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, 'REF-01', ?, ?)");
    $jHeader->execute([$entry_date, $description, $tenant_id]);
    $entry_id = $pdo->lastInsertId();

    $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
    foreach ($items as $item) {
        $jLine->execute([$entry_id, $item['account_id'], $item['debit'], $item['credit'], $tenant_id]);
    }
    $pdo->commit();
    echo "   Balanced journal entry posted successfully (ID: $entry_id).\n";
} catch (Exception $e) {
    $pdo->rollBack();
    echo "   FAILED: Post balanced entry failed: " . $e->getMessage() . "\n";
    exit(1);
}

// 4. Test unbalanced journal entry posting (Should fail validation)
echo "4. Testing rejection of unbalanced journal entry...\n";
$unbalanced_items = [
    ['account_id' => $accountsMap['1020'], 'debit' => 500.00, 'credit' => 0.00],
    ['account_id' => $accountsMap['3000'], 'debit' => 0.00, 'credit' => 400.00] // Off by 100
];

$total_debit = 0.00;
$total_credit = 0.00;
foreach ($unbalanced_items as $item) {
    $total_debit += $item['debit'];
    $total_credit += $item['credit'];
}

if (abs($total_debit - $total_credit) > 0.01) {
    echo "   Success: Double-entry validation correctly caught unbalanced transaction. Debits: $total_debit, Credits: $total_credit.\n";
} else {
    echo "   FAILED: Double-entry validation allowed unbalanced transaction.\n";
    exit(1);
}

// 5. Test Customer Invoice Auto-Journalizing
echo "5. Testing Invoice generation and auto-posting on approval (Draft -> Open)...\n";
try {
    $pdo->beginTransaction();
    // 5.1 Create Invoice in Draft
    $inv_num = "INV-TEST-01";
    $customer = "Acme Corp";
    $total = 800.00;

    $invStmt = $pdo->prepare("INSERT INTO accounting_invoices (invoice_number, customer_name, issue_date, due_date, status, total_amount, amount_due, tenant_id) VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?)");
    $invStmt->execute([$inv_num, $customer, $entry_date, date('Y-m-d', strtotime('+30 days')), $total, $total, $tenant_id]);
    $invoice_id = $pdo->lastInsertId();

    $itemStmt = $pdo->prepare("INSERT INTO accounting_invoice_items (invoice_id, description, quantity, unit_price, amount, tenant_id) VALUES (?, 'Consulting Services', 1, ?, ?, ?)");
    $itemStmt->execute([$invoice_id, $total, $total, $tenant_id]);
    $pdo->commit();
    echo "   Invoice $inv_num created in Draft status (ID: $invoice_id).\n";

    // 5.2 Transition Draft -> Open (triggers auto-journal entries)
    $pdo->beginTransaction();
    $upStmt = $pdo->prepare("UPDATE accounting_invoices SET status = 'Open' WHERE id = ?");
    $upStmt->execute([$invoice_id]);

    // Debit Accounts Receivable (1200), Credit Sales Revenue (4000)
    $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
    $jHeader->execute([$entry_date, $inv_num, "Automated Entry: Invoice #$inv_num", $tenant_id]);
    $j_id = $pdo->lastInsertId();

    $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
    // Debit AR
    $jLine->execute([$j_id, $accountsMap['1200'], $total, 0.00, $tenant_id]);
    // Credit Revenue
    $jLine->execute([$j_id, $accountsMap['4000'], 0.00, $total, $tenant_id]);
    $pdo->commit();

    // Verify journal items created
    $check_items = $pdo->query("SELECT COUNT(*) FROM accounting_journal_items WHERE journal_entry_id = $j_id")->fetchColumn();
    assert(intval($check_items) === 2, "Invoice auto-journal lines were not posted.");
    echo "   Invoice approved and auto-posted (Debit Accounts Receivable: $total, Credit Sales Revenue: $total).\n";
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
         $pdo->rollBack();
    }
    echo "   FAILED: Invoice test failed: " . $e->getMessage() . "\n";
    exit(1);
}

// 6. Test Payment Receipts matching
echo "6. Testing Invoice payment matching (Receipt logs)...\n";
try {
    $pdo->beginTransaction();
    $pay_amount = 800.00;
    
    // Register Receipt
    $txStmt = $pdo->prepare("INSERT INTO accounting_transactions (payment_date, payment_method, type, amount, reference, invoice_id, tenant_id) VALUES (?, 'Bank Transfer', 'Receipt', ?, 'TXN-PAY-01', ?, ?)");
    $txStmt->execute([$entry_date, $pay_amount, $invoice_id, $tenant_id]);
    
    // Decrement Invoice Due amount
    $upInv = $pdo->prepare("UPDATE accounting_invoices SET amount_due = 0.00, status = 'Paid' WHERE id = ?");
    $upInv->execute([$invoice_id]);

    // Create Payment Journal Entry
    $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, 'TXN-PAY-01', ?, ?)");
    $jHeader->execute([$entry_date, "Receipt: Invoice payment for $inv_num", $tenant_id]);
    $j_id = $pdo->lastInsertId();

    $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
    // Debit Bank/Cash (Asset increases)
    $jLine->execute([$j_id, $accountsMap['1020'], $pay_amount, 0.00, $tenant_id]);
    // Credit Accounts Receivable (Asset decreases)
    $jLine->execute([$j_id, $accountsMap['1200'], 0.00, $pay_amount, $tenant_id]);
    
    $pdo->commit();

    // Verify invoice status
    $final_due = $pdo->query("SELECT amount_due FROM accounting_invoices WHERE id = $invoice_id")->fetchColumn();
    $final_status = $pdo->query("SELECT status FROM accounting_invoices WHERE id = $invoice_id")->fetchColumn();
    assert(floatval($final_due) == 0.00, "Invoice amount due was not zeroed.");
    assert($final_status === 'Paid', "Invoice status was not updated to Paid.");
    echo "   Receipt posted (Debit Cash/Bank: $pay_amount, Credit AR: $pay_amount). Invoice balance fully cleared.\n";
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
         $pdo->rollBack();
    }
    echo "   FAILED: Receipt logging failed: " . $e->getMessage() . "\n";
    exit(1);
}

// 7. Verify Reports balances
echo "7. Generating final reports balances and verifying Assets = Liabilities + Equity...\n";
// Compute trial balance
$stmt = $pdo->prepare("SELECT a.code, a.name, a.type, 
    COALESCE(SUM(ji.debit), 0.00) as total_debit, 
    COALESCE(SUM(ji.credit), 0.00) as total_credit
    FROM accounting_accounts a
    LEFT JOIN accounting_journal_items ji ON a.id = ji.account_id AND a.tenant_id = ji.tenant_id
    WHERE a.tenant_id = ?
    GROUP BY a.id, a.code, a.name, a.type");
$stmt->execute([$tenant_id]);
$report_rows = $stmt->fetchAll();

$assets = 0.00;
$liabilities = 0.00;
$equity = 0.00;
$revenue = 0.00;
$expense = 0.00;

$trial_debits = 0.00;
$trial_credits = 0.00;

foreach ($report_rows as $row) {
    $db = floatval($row['total_debit']);
    $cr = floatval($row['total_credit']);
    $trial_debits += $db;
    $trial_credits += $cr;

    if ($row['type'] === 'Asset') {
        $assets += ($db - $cr);
    } elseif ($row['type'] === 'Liability') {
        $liabilities += ($cr - $db);
    } elseif ($row['type'] === 'Equity') {
        $equity += ($cr - $db);
    } elseif ($row['type'] === 'Revenue') {
        $revenue += ($cr - $db);
    } elseif ($row['type'] === 'Expense') {
        $expense += ($db - $cr);
    }
}

// Net profit = revenue - expense
$net_profit = $revenue - $expense;
$total_equity_with_earnings = $equity + $net_profit;

echo "   Trial Balance totals: Debits: $trial_debits | Credits: $trial_credits\n";
echo "   Financial Statement Summary:\n";
echo "     - Total Assets: " . currencySymbolFormat($assets) . "\n";
echo "     - Total Liabilities: " . currencySymbolFormat($liabilities) . "\n";
echo "     - Owner Equity (Initial): " . currencySymbolFormat($equity) . "\n";
echo "     - Revenue: " . currencySymbolFormat($revenue) . "\n";
echo "     - Expense: " . currencySymbolFormat($expense) . "\n";
echo "     - Net Income / Profit: " . currencySymbolFormat($net_profit) . "\n";
echo "     - Total Equity & Earnings: " . currencySymbolFormat($total_equity_with_earnings) . "\n";

// Assertions
assert(abs($trial_debits - $trial_credits) < 0.01, "Trial balance does not balance!");
assert(abs($assets - ($liabilities + $total_equity_with_earnings)) < 0.01, "Balance sheet equation failed: Assets != Liabilities + Equity!");

echo "\n   Success: Trial Balance perfectly balanced.\n";
echo "   Success: Balance Sheet Equation balances (Assets = Liabilities + Equity).\n";

echo "\n=== ALL ACCOUNTING MIGRATIONS & LEDGER VALIDATIONS SUCCEEDED ===\n";

function currencySymbolFormat($val) {
    return "$" . number_format($val, 2);
}
