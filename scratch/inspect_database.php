<?php
require_once __DIR__ . '/../api/core/db.php';

echo "=== TENANTS ===\n";
try {
    $tenants = $pdo->query("SELECT id, name, is_deleted FROM tenants")->fetchAll(PDO::FETCH_ASSOC);
    print_r($tenants);
} catch (Exception $e) {
    echo "Error fetching tenants: " . $e->getMessage() . "\n";
}

echo "=== CURRENT ACCOUNTING COUNTS ===\n";
$tables = [
    'accounting_accounts',
    'accounting_journal_entries',
    'accounting_journal_items',
    'accounting_invoices',
    'accounting_invoice_items',
    'accounting_bills',
    'accounting_bill_items',
    'accounting_transactions'
];

foreach ($tables as $t) {
    try {
        $count = $pdo->query("SELECT COUNT(*) FROM $t")->fetchColumn();
        echo "$t: $count records\n";
    } catch (Exception $e) {
        echo "$t: error: " . $e->getMessage() . "\n";
    }
}
