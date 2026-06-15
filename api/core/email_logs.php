<?php
require_once __DIR__ . '/db.php';

// Fetch logs ordered by most recent first
try {
    $stmt = $pdo->query("SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100");
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Error fetching logs: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Delivery Logs | SAR Workforce</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #1e293b;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
            border: 1px solid #334155;
        }
        h1 {
            margin-top: 0;
            font-size: 24px;
            color: #f1f5f9;
            border-bottom: 1px solid #334155;
            padding-bottom: 16px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            text-align: left;
            padding: 12px 16px;
            border-bottom: 1px solid #334155;
            font-size: 14px;
        }
        th {
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.05em;
        }
        tr:hover td {
            background-color: #0f172a;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-success {
            background-color: rgba(34, 197, 94, 0.2);
            color: #4ade80;
            border: 1px solid rgba(34, 197, 94, 0.5);
        }
        .badge-failed {
            background-color: rgba(239, 68, 68, 0.2);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.5);
        }
        .error-msg {
            color: #f87171;
            font-family: monospace;
            font-size: 13px;
            max-width: 300px;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Email Delivery Logs (Last 100)</h1>
        
        <?php if (empty($logs)): ?>
            <p style="color: #94a3b8;">No email logs found yet.</p>
        <?php else: ?>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Timestamp</th>
                        <th>Recipient</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Error Message</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($logs as $log): ?>
                    <tr>
                        <td style="color: #64748b;">#<?= htmlspecialchars($log['id']) ?></td>
                        <td><?= htmlspecialchars(date('M j, Y, g:i A', strtotime($log['created_at']))) ?></td>
                        <td style="font-weight: 500;"><?= htmlspecialchars($log['recipient_email']) ?></td>
                        <td style="color: #cbd5e1;"><?= htmlspecialchars($log['subject']) ?></td>
                        <td>
                            <?php if ($log['status'] === 'Success'): ?>
                                <span class="badge badge-success">Success</span>
                            <?php else: ?>
                                <span class="badge badge-failed">Failed</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($log['error_message']): ?>
                                <div class="error-msg"><?= htmlspecialchars($log['error_message']) ?></div>
                            <?php else: ?>
                                <span style="color: #64748b;">-</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
    </div>
</body>
</html>
