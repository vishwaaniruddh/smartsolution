<?php
// reports.php - General Ledger Financial Reporting API
require_once __DIR__ . '/../../core/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$tenant_id = getTenantId();

header('Content-Type: application/json');

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed."]);
    exit;
}

$type = isset($_GET['type']) ? trim($_GET['type']) : 'trial'; // trial, profit-loss, balance-sheet

try {
    if ($type === 'trial') {
        // Fetch all accounts and calculate total debits/credits
        $stmt = $pdo->prepare("SELECT a.id, a.code, a.name, a.type, 
            COALESCE(SUM(ji.debit), 0.00) as total_debit, 
            COALESCE(SUM(ji.credit), 0.00) as total_credit
            FROM accounting_accounts a
            LEFT JOIN accounting_journal_items ji ON a.id = ji.account_id AND a.tenant_id = ji.tenant_id
            WHERE a.tenant_id = ?
            GROUP BY a.id, a.code, a.name, a.type
            ORDER BY a.code ASC");
        $stmt->execute([$tenant_id]);
        $rows = $stmt->fetchAll();

        $trial_balance = [];
        $grand_debit = 0.00;
        $grand_credit = 0.00;

        foreach ($rows as $r) {
            $db = floatval($r['total_debit']);
            $cr = floatval($r['total_credit']);
            if ($db > 0 || $cr > 0) {
                $trial_balance[] = [
                    "account_code" => $r['code'],
                    "account_name" => $r['name'],
                    "account_type" => $r['type'],
                    "debit" => $db,
                    "credit" => $cr
                ];
                $grand_debit += $db;
                $grand_credit += $cr;
            }
        }

        echo json_encode([
            "success" => true,
            "data" => [
                "lines" => $trial_balance,
                "total_debit" => $grand_debit,
                "total_credit" => $grand_credit
            ]
        ]);

    } elseif ($type === 'profit-loss') {
        // P&L: Revenues (type = Revenue) and Expenses (type = Expense)
        $stmt = $pdo->prepare("SELECT a.code, a.name, a.type, 
            COALESCE(SUM(ji.debit), 0.00) as total_debit, 
            COALESCE(SUM(ji.credit), 0.00) as total_credit
            FROM accounting_accounts a
            LEFT JOIN accounting_journal_items ji ON a.id = ji.account_id AND a.tenant_id = ji.tenant_id
            WHERE a.tenant_id = ? AND a.type IN ('Revenue', 'Expense')
            GROUP BY a.id, a.code, a.name, a.type
            ORDER BY a.type DESC, a.code ASC");
        $stmt->execute([$tenant_id]);
        $rows = $stmt->fetchAll();

        $revenues = [];
        $expenses = [];
        $total_revenue = 0.00;
        $total_expense = 0.00;

        foreach ($rows as $r) {
            $db = floatval($r['total_debit']);
            $cr = floatval($r['total_credit']);
            $balance = 0.00;

            if ($r['type'] === 'Revenue') {
                $balance = $cr - $db; // Credit balance for Revenues
                if ($balance != 0) {
                    $revenues[] = [
                        "code" => $r['code'],
                        "name" => $r['name'],
                        "amount" => $balance
                    ];
                    $total_revenue += $balance;
                }
            } else {
                $balance = $db - $cr; // Debit balance for Expenses
                if ($balance != 0) {
                    $expenses[] = [
                        "code" => $r['code'],
                        "name" => $r['name'],
                        "amount" => $balance
                    ];
                    $total_expense += $balance;
                }
            }
        }

        $net_profit = $total_revenue - $total_expense;

        echo json_encode([
            "success" => true,
            "data" => [
                "revenues" => $revenues,
                "total_revenue" => $total_revenue,
                "expenses" => $expenses,
                "total_expense" => $total_expense,
                "net_profit" => $net_profit
            ]
        ]);

    } elseif ($type === 'balance-sheet') {
        // Balance Sheet: Assets, Liabilities, Equity
        $stmt = $pdo->prepare("SELECT a.code, a.name, a.type, 
            COALESCE(SUM(ji.debit), 0.00) as total_debit, 
            COALESCE(SUM(ji.credit), 0.00) as total_credit
            FROM accounting_accounts a
            LEFT JOIN accounting_journal_items ji ON a.id = ji.account_id AND a.tenant_id = ji.tenant_id
            WHERE a.tenant_id = ? AND a.type IN ('Asset', 'Liability', 'Equity')
            GROUP BY a.id, a.code, a.name, a.type
            ORDER BY a.type ASC, a.code ASC");
        $stmt->execute([$tenant_id]);
        $rows = $stmt->fetchAll();

        // Calculate P&L Net Profit to inject into Equity as current year earnings
        $plStmt = $pdo->prepare("SELECT a.type, 
            COALESCE(SUM(ji.debit), 0.00) as total_debit, 
            COALESCE(SUM(ji.credit), 0.00) as total_credit
            FROM accounting_accounts a
            LEFT JOIN accounting_journal_items ji ON a.id = ji.account_id AND a.tenant_id = ji.tenant_id
            WHERE a.tenant_id = ? AND a.type IN ('Revenue', 'Expense')
            GROUP BY a.type");
        $plStmt->execute([$tenant_id]);
        $plRows = $plStmt->fetchAll();
        
        $net_profit = 0.00;
        $rev_total = 0.00;
        $exp_total = 0.00;
        foreach ($plRows as $plr) {
            $db = floatval($plr['total_debit']);
            $cr = floatval($plr['total_credit']);
            if ($plr['type'] === 'Revenue') {
                $rev_total = $cr - $db;
            } else {
                $exp_total = $db - $cr;
            }
        }
        $net_profit = $rev_total - $exp_total;

        $assets = [];
        $liabilities = [];
        $equity = [];

        $total_assets = 0.00;
        $total_liabilities = 0.00;
        $total_equity = 0.00;

        foreach ($rows as $r) {
            $db = floatval($r['total_debit']);
            $cr = floatval($r['total_credit']);
            $balance = 0.00;

            if ($r['type'] === 'Asset') {
                $balance = $db - $cr; // Debit normal
                if ($balance != 0) {
                    $assets[] = ["code" => $r['code'], "name" => $r['name'], "amount" => $balance];
                    $total_assets += $balance;
                }
            } elseif ($r['type'] === 'Liability') {
                $balance = $cr - $db; // Credit normal
                if ($balance != 0) {
                    $liabilities[] = ["code" => $r['code'], "name" => $r['name'], "amount" => $balance];
                    $total_liabilities += $balance;
                }
            } else {
                $balance = $cr - $db; // Credit normal
                if ($balance != 0) {
                    $equity[] = ["code" => $r['code'], "name" => $r['name'], "amount" => $balance];
                    $total_equity += $balance;
                }
            }
        }

        // Add current period earnings (Net Profit) to equity list
        if ($net_profit != 0) {
            $equity[] = [
                "code" => "RE-CURR",
                "name" => "Current Period Earnings",
                "amount" => $net_profit
            ];
            $total_equity += $net_profit;
        }

        echo json_encode([
            "success" => true,
            "data" => [
                "assets" => $assets,
                "total_assets" => $total_assets,
                "liabilities" => $liabilities,
                "total_liabilities" => $total_liabilities,
                "equity" => $equity,
                "total_equity" => $total_equity,
                "total_liabilities_and_equity" => $total_liabilities + $total_equity
            ]
        ]);
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid report type."]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database report calculation failed: " . $e->getMessage()]);
}
?>
