<?php
// scratch/test_gst_accounting_flows.php - Integration test for Accounting GST support
require_once __DIR__ . '/../api/core/db.php';

echo "=== STARTING GST ACCOUNTING INTEGRATION TESTS ===\n";

$tenant_id = 3;

// 1. Reset database for Test Tenant 3
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
    ['2200', 'Sales Tax Payable', 'Liability'],
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
$getAccs = $pdo->query("SELECT id, code FROM accounting_accounts WHERE tenant_id = $tenant_id")->fetchAll(PDO::FETCH_ASSOC);
foreach ($getAccs as $r) {
    $accountsMap[$r['code']] = intval($r['id']);
}
assert(count($accountsMap) === 8, "Seeding Chart of Accounts failed.");
echo "   Successfully seeded " . count($accountsMap) . " accounts.\n";

// HTTP client helper
function makeRequest($url, $method, $data = null) {
    $options = [
        'http' => [
            'method' => $method,
            'header' => "Content-Type: application/json\r\n",
            'ignore_errors' => true
        ]
    ];
    if ($data !== null) {
        $options['http']['content'] = json_encode($data);
    }
    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    
    $status_code = 200;
    if (isset($http_response_header[0])) {
        preg_match('{HTTP\/\S+\s+(\d+)}', $http_response_header[0], $match);
        $status_code = intval($match[1]);
    }
    
    return [
        'status' => $status_code,
        'body' => json_decode($response, true),
        'raw' => $response
    ];
}

$baseUrl = "http://localhost/lead/api/modules/accounting";

// 3. Test GST Invoice Creation (POST)
echo "3. Testing GST Invoice Creation (POST)...\n";
$invoiceData = [
    "invoice_number" => "INV-GST-TEST-01",
    "customer_name" => "Test GST Customer",
    "issue_date" => date('Y-m-d'),
    "due_date" => date('Y-m-d', strtotime('+30 days')),
    "tax_rate" => 18.00,
    "tax_amount" => 180.00,
    "items" => [
        [
            "description" => "Consulting Services",
            "quantity" => 2,
            "unit_price" => 500.00
        ]
    ]
];

$res = makeRequest("$baseUrl/invoices.php?tenant_id=$tenant_id", "POST", $invoiceData);
if ($res['status'] !== 200 || !($res['body']['success'] ?? false)) {
    echo "   FAILED: Invoice creation returned status {$res['status']}. Body: {$res['raw']}\n";
    exit(1);
}
$invoiceId = intval($res['body']['id']);
echo "   Success: Invoice created with ID $invoiceId.\n";

// Verify invoice fields in DB
$dbInvoice = $pdo->query("SELECT * FROM accounting_invoices WHERE id = $invoiceId")->fetch(PDO::FETCH_ASSOC);
assert(floatval($dbInvoice['total_amount']) == 1180.00, "Invoice total_amount is incorrect.");
assert(floatval($dbInvoice['tax_rate']) == 18.00, "Invoice tax_rate is incorrect.");
assert(floatval($dbInvoice['tax_amount']) == 180.00, "Invoice tax_amount is incorrect.");
echo "   Success: Database invoice fields verified: total_amount=1180.00, tax_rate=18.00, tax_amount=180.00.\n";

// 4. Test GST Invoice Approval (PUT Draft -> Open)
echo "4. Testing GST Invoice Approval (PUT Draft -> Open)...\n";
$approveData = [
    "id" => $invoiceId,
    "status" => "Open"
];
$res = makeRequest("$baseUrl/invoices.php?tenant_id=$tenant_id", "PUT", $approveData);
if ($res['status'] !== 200 || !($res['body']['success'] ?? false)) {
    echo "   FAILED: Invoice approval returned status {$res['status']}. Body: {$res['raw']}\n";
    exit(1);
}
echo "   Success: Invoice status updated to Open.\n";

// Verify 3-way double-entry split
$journalEntry = $pdo->query("SELECT id FROM accounting_journal_entries WHERE reference = 'INV-GST-TEST-01' AND tenant_id = $tenant_id")->fetch(PDO::FETCH_ASSOC);
assert($journalEntry !== false, "Journal entry header not found.");
$j_id = $journalEntry['id'];

$jItems = $pdo->query("SELECT * FROM accounting_journal_items WHERE journal_entry_id = $j_id ORDER BY debit DESC, credit DESC")->fetchAll(PDO::FETCH_ASSOC);
assert(count($jItems) === 3, "Expected exactly 3 journal items, got " . count($jItems));

// Check lines
// 1. Debit AR (1200) for 1180
assert(intval($jItems[0]['account_id']) === $accountsMap['1200'], "Expected Debit on account 1200.");
assert(floatval($jItems[0]['debit']) == 1180.00, "Expected AR Debit of 1180.00");

// 2. Credit Sales (4000) for 1000
$salesLine = array_filter($jItems, function($it) use ($accountsMap) { return intval($it['account_id']) === $accountsMap['4000']; });
$salesLine = array_values($salesLine)[0];
assert(floatval($salesLine['credit']) == 1000.00, "Expected Revenue Credit of 1000.00");

// 3. Credit Sales Tax Payable (2200) for 180
$taxLine = array_filter($jItems, function($it) use ($accountsMap) { return intval($it['account_id']) === $accountsMap['2200']; });
$taxLine = array_values($taxLine)[0];
assert(floatval($taxLine['credit']) == 180.00, "Expected Sales Tax Payable Credit of 180.00");

echo "   Success: 3-way Invoice GST double-entry splits verified in journal ledger.\n";

// 5. Test GST Bill Creation (POST)
echo "5. Testing GST Vendor Bill Creation (POST)...\n";
$billData = [
    "bill_number" => "BILL-GST-TEST-01",
    "vendor_name" => "Test GST Supplier",
    "issue_date" => date('Y-m-d'),
    "due_date" => date('Y-m-d', strtotime('+30 days')),
    "tax_rate" => 18.00,
    "tax_amount" => 90.00,
    "items" => [
        [
            "description" => "Supply Goods",
            "quantity" => 1,
            "unit_cost" => 500.00
        ]
    ]
];

$res = makeRequest("$baseUrl/bills.php?tenant_id=$tenant_id", "POST", $billData);
if ($res['status'] !== 200 || !($res['body']['success'] ?? false)) {
    echo "   FAILED: Bill creation returned status {$res['status']}. Body: {$res['raw']}\n";
    exit(1);
}
$billId = intval($res['body']['id']);
echo "   Success: Bill created with ID $billId.\n";

// Verify bill fields in DB
$dbBill = $pdo->query("SELECT * FROM accounting_bills WHERE id = $billId")->fetch(PDO::FETCH_ASSOC);
assert(floatval($dbBill['total_amount']) == 590.00, "Bill total_amount is incorrect.");
assert(floatval($dbBill['tax_rate']) == 18.00, "Bill tax_rate is incorrect.");
assert(floatval($dbBill['tax_amount']) == 90.00, "Bill tax_amount is incorrect.");
echo "   Success: Database bill fields verified: total_amount=590.00, tax_rate=18.00, tax_amount=90.00.\n";

// 6. Test GST Bill Approval (PUT Draft -> Open)
echo "6. Testing GST Vendor Bill Approval (PUT Draft -> Open)...\n";
$approveBillData = [
    "id" => $billId,
    "status" => "Open"
];
$res = makeRequest("$baseUrl/bills.php?tenant_id=$tenant_id", "PUT", $approveBillData);
if ($res['status'] !== 200 || !($res['body']['success'] ?? false)) {
    echo "   FAILED: Bill approval returned status {$res['status']}. Body: {$res['raw']}\n";
    exit(1);
}
echo "   Success: Bill status updated to Open.\n";

// Verify 3-way double-entry split for bill
$billJournalEntry = $pdo->query("SELECT id FROM accounting_journal_entries WHERE reference = 'BILL-GST-TEST-01' AND tenant_id = $tenant_id")->fetch(PDO::FETCH_ASSOC);
assert($billJournalEntry !== false, "Bill journal entry header not found.");
$bj_id = $billJournalEntry['id'];

$bjItems = $pdo->query("SELECT * FROM accounting_journal_items WHERE journal_entry_id = $bj_id ORDER BY credit DESC, debit DESC")->fetchAll(PDO::FETCH_ASSOC);
assert(count($bjItems) === 3, "Expected exactly 3 journal items for bill, got " . count($bjItems));

// Check lines
// 1. Credit AP (2000) for 590
assert(intval($bjItems[0]['account_id']) === $accountsMap['2000'], "Expected Credit on account 2000.");
assert(floatval($bjItems[0]['credit']) == 590.00, "Expected AP Credit of 590.00");

// 2. Debit Expense (5200) for 500
$expLine = array_filter($bjItems, function($it) use ($accountsMap) { return intval($it['account_id']) === $accountsMap['5200']; });
$expLine = array_values($expLine)[0];
assert(floatval($expLine['debit']) == 500.00, "Expected Expense Debit of 500.00");

// 3. Debit Sales Tax Payable (2200) for 90 (Input Tax Credit)
$billTaxLine = array_filter($bjItems, function($it) use ($accountsMap) { return intval($it['account_id']) === $accountsMap['2200']; });
$billTaxLine = array_values($billTaxLine)[0];
assert(floatval($billTaxLine['debit']) == 90.00, "Expected Sales Tax Payable Debit (Input Tax Credit) of 90.00");

echo "   Success: 3-way Vendor Bill GST double-entry splits verified in journal ledger.\n";

// 7. Verify Reports aggregates
echo "7. Verifying financial statement reports calculations...\n";
// Fetch Trial Balance
$res = makeRequest("$baseUrl/reports.php?tenant_id=$tenant_id&type=trial", "GET");
assert($res['status'] === 200, "Trial balance fetch failed");
$tbData = $res['body']['data'];
assert(floatval($tbData['total_debit']) === floatval($tbData['total_credit']), "Trial Balance is not in balance.");
echo "   Success: Trial Balance totals match: Debits = Credits = " . $tbData['total_debit'] . ".\n";

// Fetch Balance Sheet
$res = makeRequest("$baseUrl/reports.php?tenant_id=$tenant_id&type=balance-sheet", "GET");
assert($res['status'] === 200, "Balance sheet fetch failed");
$bsData = $res['body']['data'];
assert(floatval($bsData['total_assets']) === floatval($bsData['total_liabilities_and_equity']), "Balance Sheet does not balance.");
echo "   Success: Balance Sheet equation balances: Assets = Liabilities + Equity = " . $bsData['total_assets'] . ".\n";

echo "=== ALL GST INTEGRATION TESTS PASSED COMPLETED SUCCESSFULLY ===\n";
