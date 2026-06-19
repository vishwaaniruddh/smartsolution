<?php
// seed_accounting_data.php - Standard Seeder for Populating 50-100 Records across Accounting Module
require_once __DIR__ . '/../api/core/db.php';

echo "=== STARTING ACCOUNTING SUITE DATA SEEDING ===\n";

$tenant_id = 1; // Primary tenant (SAR)

// 1. Wipe existing records for Tenant 1 to ensure a clean seed
echo "1. Cleaning up previous records for Tenant 1...\n";
$pdo->exec("DELETE FROM accounting_transactions WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_journal_items WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_journal_entries WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_invoice_items WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_invoices WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_bill_items WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_bills WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_accounts WHERE tenant_id = $tenant_id");

// 2. Seed Chart of Accounts
echo "2. Seeding comprehensive Chart of Accounts...\n";
$default_accounts = [
    ['1010', 'Cash on Hand', 'Asset'],
    ['1020', 'Bank Account', 'Asset'],
    ['1200', 'Accounts Receivable', 'Asset'],
    ['1400', 'Inventory Asset', 'Asset'],
    ['1500', 'Prepaid Expenses', 'Asset'],
    ['2000', 'Accounts Payable', 'Liability'],
    ['2100', 'Credit Card', 'Liability'],
    ['2200', 'Sales Tax Payable', 'Liability'],
    ['3000', 'Owner Equity', 'Equity'],
    ['3100', 'Retained Earnings', 'Equity'],
    ['4000', 'Sales Revenue', 'Revenue'],
    ['4100', 'Consulting Revenue', 'Revenue'],
    ['4200', 'Shipping Revenue', 'Revenue'],
    ['5000', 'Salary Expense', 'Expense'],
    ['5100', 'Rent Expense', 'Expense'],
    ['5200', 'Inventory Purchases', 'Expense'],
    ['5300', 'Utilities Expense', 'Expense'],
    ['5400', 'Software Expense', 'Expense'],
    ['5500', 'Marketing Expense', 'Expense'],
    ['5600', 'Travel Expense', 'Expense'],
    ['5700', 'Office Supplies Expense', 'Expense']
];

$stmt = $pdo->prepare("INSERT INTO accounting_accounts (code, name, type, tenant_id) VALUES (?, ?, ?, ?)");
foreach ($default_accounts as $acc) {
    $stmt->execute([$acc[0], $acc[1], $acc[2], $tenant_id]);
}

// Map account code -> ID
$accountsMap = [];
$getAccs = $pdo->query("SELECT id, code FROM accounting_accounts WHERE tenant_id = $tenant_id")->fetchAll(PDO::FETCH_ASSOC);
foreach ($getAccs as $r) {
    $accountsMap[$r['code']] = intval($r['id']);
}
echo "   Successfully seeded " . count($accountsMap) . " accounts.\n";

// Helper helper to generate balanced journal splits
function postJournalEntry($pdo, $date, $ref, $desc, $debitAccId, $creditAccId, $amount, $tenant_id) {
    $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
    $jHeader->execute([$date, $ref, $desc, $tenant_id]);
    $entry_id = $pdo->lastInsertId();

    $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
    // Debit
    $jLine->execute([$entry_id, $debitAccId, $amount, 0.00, $tenant_id]);
    // Credit
    $jLine->execute([$entry_id, $creditAccId, 0.00, $amount, $tenant_id]);
}

function postGSTInvoiceJournalEntry($pdo, $date, $ref, $desc, $arAccId, $revAccId, $taxAccId, $subtotal, $taxAmount, $tenant_id) {
    $total = $subtotal + $taxAmount;
    $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
    $jHeader->execute([$date, $ref, $desc, $tenant_id]);
    $entry_id = $pdo->lastInsertId();

    $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
    // Debit AR
    $jLine->execute([$entry_id, $arAccId, $total, 0.00, $tenant_id]);
    // Credit Revenue
    $jLine->execute([$entry_id, $revAccId, 0.00, $subtotal, $tenant_id]);
    // Credit GST
    $jLine->execute([$entry_id, $taxAccId, 0.00, $taxAmount, $tenant_id]);
}

function postGSTBillJournalEntry($pdo, $date, $ref, $desc, $apAccId, $purAccId, $taxAccId, $subtotal, $taxAmount, $tenant_id) {
    $total = $subtotal + $taxAmount;
    $jHeader = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
    $jHeader->execute([$date, $ref, $desc, $tenant_id]);
    $entry_id = $pdo->lastInsertId();

    $jLine = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
    // Debit Expense
    $jLine->execute([$entry_id, $purAccId, $subtotal, 0.00, $tenant_id]);
    // Debit GST (ITC)
    $jLine->execute([$entry_id, $taxAccId, $taxAmount, 0.00, $tenant_id]);
    // Credit AP
    $jLine->execute([$entry_id, $apAccId, 0.00, $total, $tenant_id]);
}

// 3. Generate Invoices
echo "3. Generating Customer Invoices & Receipts (Double-Entry matching)...\n";
$customers = ["Acme Corp", "Stark Industries", "Wayne Enterprises", "Oscorp", "LexCorp", "Globex Corp", "Umbrella Corp", "Initech", "Hooli", "Soylent Corp", "Tyrell Corp", "Cyberdyne Systems"];
$invoice_descriptions = [
    "Consulting Services - Phase 1",
    "Enterprise Software SLA Support",
    "Cloud ERP System Integration",
    "Network Infrastructure Security Audit",
    "Database Tuning & Redesign Consultancy",
    "Mobile Application Design Mockups",
    "Custom Dashboard Development & Reports"
];

$invoiceCount = 65;
$inv_index = 1001;

for ($i = 0; $i < $invoiceCount; $i++) {
    $inv_num = "INV-" . ($inv_index + $i);
    $customer = $customers[array_rand($customers)];
    $qty = rand(1, 4);
    $unit_price = rand(150, 2500);
    $total = $qty * $unit_price;
    
    // Generate dates in the last 120 days
    $days_ago = rand(5, 120);
    $issue_date = date('Y-m-d', strtotime("-$days_ago days"));
    $due_date = date('Y-m-d', strtotime("$issue_date +30 days"));

    // Status: 10% Draft, 15% Open, 60% Paid, 10% Overdue, 5% Void
    $rand_val = rand(1, 100);
    if ($rand_val <= 10) {
        $status = 'Draft';
    } elseif ($rand_val <= 25) {
        // If due date is in the past, status is Overdue, otherwise Open
        $status = (strtotime($due_date) < time()) ? 'Overdue' : 'Open';
    } elseif ($rand_val <= 85) {
        $status = 'Paid';
    } elseif ($rand_val <= 95) {
        $status = 'Overdue';
    } else {
        $status = 'Void';
    }

    $tax_rate = 0.00;
    $tax_amount = 0.00;
    if (rand(1, 100) <= 40) {
        $tax_rate = rand(0, 1) ? 12.00 : 18.00;
        $tax_amount = round($total * ($tax_rate / 100), 2);
    }
    $total_amount = $total + $tax_amount;
    $amount_due = ($status === 'Paid') ? 0.00 : $total_amount;
    if ($status === 'Void') $amount_due = 0.00;

    // Create Invoice
    $invStmt = $pdo->prepare("INSERT INTO accounting_invoices (invoice_number, customer_name, issue_date, due_date, status, total_amount, amount_due, tenant_id, tax_rate, tax_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $invStmt->execute([$inv_num, $customer, $issue_date, $due_date, $status, $total_amount, $amount_due, $tenant_id, $tax_rate, $tax_amount]);
    $invoice_id = $pdo->lastInsertId();

    // Create Items
    $itemStmt = $pdo->prepare("INSERT INTO accounting_invoice_items (invoice_id, description, quantity, unit_price, amount, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
    $desc = $invoice_descriptions[array_rand($invoice_descriptions)];
    $itemStmt->execute([$invoice_id, $desc, $qty, $unit_price, $total, $tenant_id]);

    // If Open, Paid, or Overdue, post invoice ledger entry
    if ($status !== 'Draft' && $status !== 'Void') {
        if ($tax_amount > 0) {
            postGSTInvoiceJournalEntry(
                $pdo,
                $issue_date,
                $inv_num,
                "Automated Entry: Invoice #$inv_num to $customer (with Output GST)",
                $accountsMap['1200'],
                $accountsMap['4000'],
                $accountsMap['2200'],
                $total,
                $tax_amount,
                $tenant_id
            );
        } else {
            // Debit Accounts Receivable (1200), Credit Sales Revenue (4000)
            postJournalEntry(
                $pdo,
                $issue_date,
                $inv_num,
                "Automated Entry: Invoice #$inv_num to $customer",
                $accountsMap['1200'],
                $accountsMap['4000'],
                $total,
                $tenant_id
            );
        }

        // If Paid, log receipt transaction and register cash posting
        if ($status === 'Paid') {
            $pay_days = rand(1, 20);
            $pay_date = date('Y-m-d', strtotime("$issue_date +$pay_days days"));
            $ref = "REC-" . ($inv_index + $i);
            $method = ['Bank Transfer', 'Check', 'Credit Card', 'Cash'][rand(0, 3)];

            // Insert Bank Cash Transaction
            $txStmt = $pdo->prepare("INSERT INTO accounting_transactions (payment_date, payment_method, type, amount, reference, invoice_id, tenant_id) VALUES (?, ?, 'Receipt', ?, ?, ?, ?)");
            $txStmt->execute([$pay_date, $method, $total_amount, $ref, $invoice_id, $tenant_id]);

            // Post payment ledger entry: Debit Bank Account (1020), Credit Accounts Receivable (1200)
            postJournalEntry(
                $pdo,
                $pay_date,
                $ref,
                "Receipt: Customer payment matching Invoice #$inv_num ($customer)",
                $accountsMap['1020'],
                $accountsMap['1200'],
                $total_amount,
                $tenant_id
            );
        }
    }
}
echo "   Successfully seeded $invoiceCount Invoices and associated ledger records.\n";


// 4. Generate Vendor Bills
echo "4. Generating Vendor Bills & Payouts (Double-Entry matching)...\n";
$vendors = [
    ['Amazon Web Services', '5400', 'Software Expense', 'Cloud Infrastructure hosting'],
    ['Google Cloud Platform', '5400', 'Software Expense', 'Compute engines & cloud resources'],
    ['Office Depot', '5700', 'Office Supplies Expense', 'Stationery & printing supplies'],
    ['Local Landlord Inc', '5100', 'Rent Expense', 'Corporate Office Rent'],
    ['Electric & Power Co', '5300', 'Utilities Expense', 'Electric grid utilities'],
    ['Telecom Corp', '5300', 'Utilities Expense', 'Fiber Internet & VoIP line'],
    ['Security Services Ltd', '5700', 'Office Supplies Expense', 'Monthly office security'],
    ['Software Licensing Ltd', '5400', 'Software Expense', 'Core SaaS licenses'],
    ['Tax & Audit Partners', '5700', 'Office Supplies Expense', 'Tax auditing fee'],
    ['Supplier Depot', '5200', 'Inventory Purchases', 'Purchase of bulk inventory stock']
];

$billCount = 55;
$bill_index = 3001;

for ($i = 0; $i < $billCount; $i++) {
    $bill_num = "BILL-" . ($bill_index + $i);
    $vendor_data = $vendors[array_rand($vendors)];
    $vendor = $vendor_data[0];
    $expense_code = $vendor_data[1];
    $expense_desc = $vendor_data[3];
    
    $qty = rand(1, 3);
    $unit_cost = rand(100, 1500);
    $total = $qty * $unit_cost;
    
    $days_ago = rand(5, 120);
    $issue_date = date('Y-m-d', strtotime("-$days_ago days"));
    $due_date = date('Y-m-d', strtotime("$issue_date +30 days"));

    // Status: 10% Draft, 20% Open, 65% Paid, 5% Void
    $rand_val = rand(1, 100);
    if ($rand_val <= 10) {
        $status = 'Draft';
    } elseif ($rand_val <= 30) {
        $status = 'Open';
    } elseif ($rand_val <= 95) {
        $status = 'Paid';
    } else {
        $status = 'Void';
    }

    $tax_rate = 0.00;
    $tax_amount = 0.00;
    if (rand(1, 100) <= 40) {
        $tax_rate = rand(0, 1) ? 12.00 : 18.00;
        $tax_amount = round($total * ($tax_rate / 100), 2);
    }
    $total_amount = $total + $tax_amount;
    $amount_due = ($status === 'Paid') ? 0.00 : $total_amount;
    if ($status === 'Void') $amount_due = 0.00;

    // Create Bill
    $billStmt = $pdo->prepare("INSERT INTO accounting_bills (bill_number, vendor_name, issue_date, due_date, status, total_amount, amount_due, tenant_id, tax_rate, tax_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $billStmt->execute([$bill_num, $vendor, $issue_date, $due_date, $status, $total_amount, $amount_due, $tenant_id, $tax_rate, $tax_amount]);
    $bill_id = $pdo->lastInsertId();

    // Create Items
    $itemStmt = $pdo->prepare("INSERT INTO accounting_bill_items (bill_id, description, quantity, unit_cost, amount, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
    $itemStmt->execute([$bill_id, $expense_desc, $qty, $unit_cost, $total, $tenant_id]);

    // If Open, Paid, or Void-posts, log bill entry
    if ($status !== 'Draft' && $status !== 'Void') {
        if ($tax_amount > 0) {
            postGSTBillJournalEntry(
                $pdo,
                $issue_date,
                $bill_num,
                "Automated Entry: Bill #$bill_num from $vendor (with Input GST)",
                $accountsMap['2000'],
                $accountsMap[$expense_code],
                $accountsMap['2200'],
                $total,
                $tax_amount,
                $tenant_id
            );
        } else {
            // Debit Expense Account (e.g. 5100, 5400, etc), Credit Accounts Payable (2000)
            postJournalEntry(
                $pdo,
                $issue_date,
                $bill_num,
                "Automated Entry: Bill #$bill_num from $vendor",
                $accountsMap[$expense_code],
                $accountsMap['2000'],
                $total,
                $tenant_id
            );
        }

        // If Paid, log payout transaction and register cash posting
        if ($status === 'Paid') {
            $pay_days = rand(1, 15);
            $pay_date = date('Y-m-d', strtotime("$issue_date +$pay_days days"));
            $ref = "PAY-" . ($bill_index + $i);
            $method = ['Bank Transfer', 'Check', 'Cash'][rand(0, 2)];

            // Insert Bank Cash Transaction
            $txStmt = $pdo->prepare("INSERT INTO accounting_transactions (payment_date, payment_method, type, amount, reference, bill_id, tenant_id) VALUES (?, ?, 'Payment', ?, ?, ?, ?)");
            $txStmt->execute([$pay_date, $method, $total_amount, $ref, $bill_id, $tenant_id]);

            // Post payment ledger entry: Debit Accounts Payable (2000), Credit Bank Account (1020)
            postJournalEntry(
                $pdo,
                $pay_date,
                $ref,
                "Payment: Disbursement to vendor matching Bill #$bill_num ($vendor)",
                $accountsMap['2000'],
                $accountsMap['1020'],
                $total_amount,
                $tenant_id
            );
        }
    }
}
echo "   Successfully seeded $billCount Bills and associated ledger records.\n";


// 5. Generate Miscellaneous Manual Journal Entries & Daily Cash Movements
echo "5. Generating Manual Adjustments & Capital Injection wizard entries...\n";

// Capital Injection
postJournalEntry(
    $pdo,
    date('Y-m-d', strtotime("-120 days")),
    'JE-MAN-01',
    'Initial Capital Contribution by shareholders',
    $accountsMap['1020'], // Debit Bank Account
    $accountsMap['3000'], // Credit Owner Equity
    85000.00,
    $tenant_id
);

// Office Rent direct payment (first month)
postJournalEntry(
    $pdo,
    date('Y-m-d', strtotime("-90 days")),
    'JE-MAN-02',
    'Direct Rent payment for off-site warehouse',
    $accountsMap['5100'], // Debit Rent Expense
    $accountsMap['1020'], // Credit Bank Account
    4500.00,
    $tenant_id
);

// Bulk Payroll post 1
postJournalEntry(
    $pdo,
    date('Y-m-d', strtotime("-60 days")),
    'JE-MAN-03',
    'Monthly payroll run disbursement',
    $accountsMap['5000'], // Debit Salary Expense
    $accountsMap['1020'], // Credit Bank Account
    12400.00,
    $tenant_id
);

// Bulk Payroll post 2
postJournalEntry(
    $pdo,
    date('Y-m-d', strtotime("-30 days")),
    'JE-MAN-04',
    'Monthly payroll run disbursement',
    $accountsMap['5000'], // Debit Salary Expense
    $accountsMap['1020'], // Credit Bank Account
    12800.00,
    $tenant_id
);

// Marketing Campaign
postJournalEntry(
    $pdo,
    date('Y-m-d', strtotime("-45 days")),
    'JE-MAN-05',
    'Direct Payout for Google Adwords campaigns',
    $accountsMap['5500'], // Debit Marketing Expense
    $accountsMap['2100'], // Credit Credit Card (Liability)
    2500.00,
    $tenant_id
);

// Travel Expenses
postJournalEntry(
    $pdo,
    date('Y-m-d', strtotime("-25 days")),
    'JE-MAN-06',
    'Travel flight costs for Sales team conference',
    $accountsMap['5600'], // Debit Travel Expense
    $accountsMap['2100'], // Credit Credit Card
    1150.00,
    $tenant_id
);

// Office Supplies
postJournalEntry(
    $pdo,
    date('Y-m-d', strtotime("-15 days")),
    'JE-MAN-07',
    'Petty cash office supplies purchases',
    $accountsMap['5700'], // Debit Office Supplies Expense
    $accountsMap['1010'], // Credit Cash on Hand
    350.00,
    $tenant_id
);

// Cash Transfer: Bank to Cash (ATM Withdrawal)
$withdraw_amount = 1500.00;
$withdraw_date = date('Y-m-d', strtotime("-80 days"));
$ref = "TXN-ATM-01";
$txStmt = $pdo->prepare("INSERT INTO accounting_transactions (payment_date, payment_method, type, amount, reference, tenant_id) VALUES (?, 'Cash', 'Payment', ?, ?, ?)");
$txStmt->execute([$withdraw_date, $withdraw_amount, $ref, $tenant_id]);
postJournalEntry(
    $pdo,
    $withdraw_date,
    $ref,
    "ATM Cash Withdrawal: Bank to Cash Transfer",
    $accountsMap['1010'], // Debit Cash on Hand
    $accountsMap['1020'], // Credit Bank Account
    $withdraw_amount,
    $tenant_id
);

echo "   Successfully seeded miscellaneous ledger logs.\n";

// 6. Verify Totals
echo "=== SEEDING COMPLETED SUCCESSFULLY ===\n";
try {
    $invoices_c = $pdo->query("SELECT COUNT(*) FROM accounting_invoices WHERE tenant_id = $tenant_id")->fetchColumn();
    $bills_c = $pdo->query("SELECT COUNT(*) FROM accounting_bills WHERE tenant_id = $tenant_id")->fetchColumn();
    $tx_c = $pdo->query("SELECT COUNT(*) FROM accounting_transactions WHERE tenant_id = $tenant_id")->fetchColumn();
    $je_c = $pdo->query("SELECT COUNT(*) FROM accounting_journal_entries WHERE tenant_id = $tenant_id")->fetchColumn();
    $ji_c = $pdo->query("SELECT COUNT(*) FROM accounting_journal_items WHERE tenant_id = $tenant_id")->fetchColumn();

    echo "Tenant 1 Database Record Summary:\n";
    echo "  - Invoices: $invoices_c records\n";
    echo "  - Bills: $bills_c records\n";
    echo "  - Cashbook Transactions: $tx_c records\n";
    echo "  - Journal Entries: $je_c records\n";
    echo "  - Journal splits: $ji_c records\n";
} catch (Exception $e) {
    echo "Error calculating counts: " . $e->getMessage() . "\n";
}
