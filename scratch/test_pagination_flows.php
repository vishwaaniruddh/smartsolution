<?php
// scratch/test_pagination_flows.php - Integration test for Accounting Pagination and Filtering
require_once __DIR__ . '/../api/core/db.php';

echo "=== STARTING PAGINATION AND FILTERING INTEGRATION TESTS ===\n";

$tenant_id = 4; // Use test tenant 4 to isolate pagination tests

// 1. Wipe previous test runs for Tenant 4
echo "1. Cleaning up previous records for Test Tenant 4...\n";
$pdo->exec("DELETE FROM accounting_transactions WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_journal_items WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_journal_entries WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_invoice_items WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_invoices WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_bill_items WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_bills WHERE tenant_id = $tenant_id");
$pdo->exec("DELETE FROM accounting_accounts WHERE tenant_id = $tenant_id");

// Seed standard accounts for Tenant 4
echo "2. Seeding default Chart of Accounts for Tenant 4...\n";
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

// 3. Seed 25 Invoices
echo "3. Seeding 25 Invoices for Tenant 4...\n";
$invStmt = $pdo->prepare("INSERT INTO accounting_invoices (invoice_number, customer_name, issue_date, due_date, status, total_amount, amount_due, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
for ($i = 1; $i <= 25; $i++) {
    $invNum = sprintf("INV-PAG-%03d", $i);
    // Alternate customer names
    $customerName = ($i % 2 === 0) ? "Apple Inc" : "Microsoft Corp";
    // Alternate statuses
    $status = ($i % 3 === 0) ? "Draft" : (($i % 3 === 1) ? "Open" : "Paid");
    $totalAmount = 100.00 * $i;
    $dueAmount = ($status === 'Paid') ? 0.00 : $totalAmount;
    $invStmt->execute([$invNum, $customerName, '2026-06-01', '2026-07-01', $status, $totalAmount, $dueAmount, $tenant_id]);
}

// Test Invoices API Pagination
echo "   Testing Invoices API Pagination (limit=10, page=1)...\n";
$res = makeRequest("$baseUrl/invoices.php?tenant_id=$tenant_id&page=1&limit=10", "GET");
assert($res['status'] === 200, "Invoices API failed");
$body = $res['body'];
assert($body['success'] === true, "Response not success");
assert(count($body['data']) === 10, "Expected 10 records on page 1");
assert($body['pagination']['page'] === 1, "Page should be 1");
assert($body['pagination']['total_records'] === 25, "Total records should be 25");
assert($body['pagination']['total_pages'] === 3, "Total pages should be 3");

echo "   Testing Invoices API Pagination (limit=10, page=3)...\n";
$res = makeRequest("$baseUrl/invoices.php?tenant_id=$tenant_id&page=3&limit=10", "GET");
$body = $res['body'];
assert(count($body['data']) === 5, "Expected 5 records on page 3");

echo "   Testing Invoices API Search (search=Apple)...\n";
$res = makeRequest("$baseUrl/invoices.php?tenant_id=$tenant_id&search=Apple&limit=10", "GET");
$body = $res['body'];
// 12 records since $i is even: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24
assert($body['pagination']['total_records'] === 12, "Search for 'Apple' should match 12 records");

echo "   Testing Invoices API Status Filter (status=Paid)...\n";
$res = makeRequest("$baseUrl/invoices.php?tenant_id=$tenant_id&status=Paid&limit=10", "GET");
$body = $res['body'];
// Status distribution: i=3,6,9,12,15,18,21,24 -> Draft (8)
// i=1,4,7,10,13,16,19,22,25 -> Open (9)
// i=2,5,8,11,14,17,20,23 -> Paid (8)
assert($body['pagination']['total_records'] === 8, "Status filter 'Paid' should match 8 records");


// 4. Seed 15 Vendor Bills
echo "4. Seeding 15 Vendor Bills for Tenant 4...\n";
$billStmt = $pdo->prepare("INSERT INTO accounting_bills (bill_number, vendor_name, issue_date, due_date, status, total_amount, amount_due, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
for ($i = 1; $i <= 15; $i++) {
    $billNum = sprintf("BILL-PAG-%03d", $i);
    $vendorName = ($i % 2 === 0) ? "Dell Technologies" : "HP Enterprise";
    $status = ($i % 2 === 0) ? "Draft" : "Open";
    $totalAmount = 50.00 * $i;
    $billStmt->execute([$billNum, $vendorName, '2026-06-01', '2026-07-01', $status, $totalAmount, $totalAmount, $tenant_id]);
}

// Test Bills API Pagination
echo "   Testing Bills API Pagination (limit=10, page=1)...\n";
$res = makeRequest("$baseUrl/bills.php?tenant_id=$tenant_id&page=1&limit=10", "GET");
$body = $res['body'];
assert($body['success'] === true, "Response not success");
assert(count($body['data']) === 10, "Expected 10 records on page 1");
assert($body['pagination']['total_records'] === 15, "Total records should be 15");
assert($body['pagination']['total_pages'] === 2, "Total pages should be 2");

echo "   Testing Bills API Search (search=Dell)...\n";
$res = makeRequest("$baseUrl/bills.php?tenant_id=$tenant_id&search=Dell", "GET");
$body = $res['body'];
// 7 records: 2, 4, 6, 8, 10, 12, 14
assert($body['pagination']['total_records'] === 7, "Dell search should yield 7 records");


// 5. Seed 18 Journal Entries
echo "5. Seeding 18 Journal Entries for Tenant 4...\n";
$jeStmt = $pdo->prepare("INSERT INTO accounting_journal_entries (entry_date, reference, description, tenant_id) VALUES (?, ?, ?, ?)");
$jiStmt = $pdo->prepare("INSERT INTO accounting_journal_items (journal_entry_id, account_id, debit, credit, tenant_id) VALUES (?, ?, ?, ?, ?)");
for ($i = 1; $i <= 18; $i++) {
    $ref = sprintf("JE-REF-%03d", $i);
    $desc = "Post transaction number $i";
    $jeStmt->execute(['2026-06-01', $ref, $desc, $tenant_id]);
    $jeId = $pdo->lastInsertId();
    
    // Balanced splits
    $jiStmt->execute([$jeId, $accountsMap['1020'], 150.00, 0.00, $tenant_id]);
    $jiStmt->execute([$jeId, $accountsMap['3000'], 0.00, 150.00, $tenant_id]);
}

// Test Journal Entries API Pagination
echo "   Testing Journal Entries API Pagination (limit=10, page=1)...\n";
$res = makeRequest("$baseUrl/journal_entries.php?tenant_id=$tenant_id&page=1&limit=10", "GET");
$body = $res['body'];
assert($body['success'] === true, "Response not success");
assert(count($body['data']) === 10, "Expected 10 records on page 1");
assert($body['pagination']['total_records'] === 18, "Total records should be 18");
assert($body['pagination']['total_pages'] === 2, "Total pages should be 2");
// Verify single join group debit sum works
assert(floatval($body['data'][0]['total_amount']) === 150.00, "Total debit amount sum incorrect");

echo "   Testing Journal Entries API Search (search=number 5)...\n";
$res = makeRequest("$baseUrl/journal_entries.php?tenant_id=$tenant_id&search=" . urlencode("number 5"), "GET");
$body = $res['body'];
assert($body['pagination']['total_records'] === 1, "Search for 'number 5' should find exactly 1 record");


// 6. Seed 12 Bank Transactions
echo "6. Seeding 12 Bank Transactions for Tenant 4...\n";
$txStmt = $pdo->prepare("INSERT INTO accounting_transactions (payment_date, payment_method, type, amount, reference, tenant_id) VALUES (?, ?, ?, ?, ?, ?)");
for ($i = 1; $i <= 12; $i++) {
    $type = ($i % 2 === 0) ? 'Receipt' : 'Payment';
    $ref = sprintf("TXN-REF-%03d", $i);
    $method = ($i % 3 === 0) ? 'Cash' : 'Bank Transfer';
    $txStmt->execute(['2026-06-01', $method, $type, 45.00 * $i, $ref, $tenant_id]);
}

// Test Transactions API Pagination
echo "   Testing Transactions API Pagination (limit=10, page=1)...\n";
$res = makeRequest("$baseUrl/transactions.php?tenant_id=$tenant_id&page=1&limit=10", "GET");
$body = $res['body'];
assert($body['success'] === true, "Response not success");
assert(count($body['data']) === 10, "Expected 10 records on page 1");
assert($body['pagination']['total_records'] === 12, "Total records should be 12");
assert($body['pagination']['total_pages'] === 2, "Total pages should be 2");

echo "   Testing Transactions API Type Filter (type=Receipt)...\n";
$res = makeRequest("$baseUrl/transactions.php?tenant_id=$tenant_id&type=Receipt", "GET");
$body = $res['body'];
assert($body['pagination']['total_records'] === 6, "Receipt transactions count should be 6");

echo "   Testing Transactions API Search (search=REF-01)...\n";
$res = makeRequest("$baseUrl/transactions.php?tenant_id=$tenant_id&search=REF-01", "GET");
$body = $res['body'];
// Matches TXN-REF-010, TXN-REF-011, TXN-REF-012 (depending on sprintf padding)
// i=10 -> TXN-REF-010
// i=11 -> TXN-REF-011
// i=12 -> TXN-REF-012
// So 3 records match 'REF-01'
assert($body['pagination']['total_records'] === 3, "Search 'REF-01' should match 3 records, got " . $body['pagination']['total_records']);

echo "=== ALL PAGINATION AND FILTERING INTEGRATION TESTS PASSED SUCCESSFULLY ===\n";
