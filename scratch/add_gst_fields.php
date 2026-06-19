<?php
// add_gst_fields.php - Migration to add GST support to Accounting tables
require_once __DIR__ . '/../api/core/db.php';

echo "=== ADDING GST DATABASE COLUMNS ===\n";

try {
    // 1. Add columns to accounting_invoices
    $pdo->exec("ALTER TABLE accounting_invoices ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00");
    $pdo->exec("ALTER TABLE accounting_invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0.00");
    echo "Successfully updated accounting_invoices table.\n";

    // 2. Add columns to accounting_bills
    $pdo->exec("ALTER TABLE accounting_bills ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00");
    $pdo->exec("ALTER TABLE accounting_bills ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0.00");
    echo "Successfully updated accounting_bills table.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

echo "=== MIGRATION COMPLETED SUCCESSFULLY ===\n";
