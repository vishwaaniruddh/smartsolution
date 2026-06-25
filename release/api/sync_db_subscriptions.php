<?php
require_once __DIR__ . '/core/db.php';

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS app_subscription_plans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            app_id VARCHAR(50) NOT NULL,
            plan_name VARCHAR(100) NOT NULL,
            base_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            included_users INT NOT NULL DEFAULT 1,
            additional_user_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            billing_cycle ENUM('Monthly', 'Yearly') NOT NULL DEFAULT 'Monthly',
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    // Add columns to tenant_apps if they don't exist
    $columns = $pdo->query("SHOW COLUMNS FROM tenant_apps")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('plan_id', $columns)) {
        $pdo->exec("ALTER TABLE tenant_apps ADD COLUMN plan_id INT NULL");
        $pdo->exec("ALTER TABLE tenant_apps ADD FOREIGN KEY (plan_id) REFERENCES app_subscription_plans(id) ON DELETE SET NULL");
    }
    
    if (!in_array('status', $columns)) {
        $pdo->exec("ALTER TABLE tenant_apps ADD COLUMN status ENUM('Active', 'Suspended', 'Past Due') NOT NULL DEFAULT 'Active'");
    }
    
    if (!in_array('billing_start_date', $columns)) {
        $pdo->exec("ALTER TABLE tenant_apps ADD COLUMN billing_start_date DATE NULL");
    }
    
    if (!in_array('billing_end_date', $columns)) {
        $pdo->exec("ALTER TABLE tenant_apps ADD COLUMN billing_end_date DATE NULL");
    }

    echo "Subscription database tables synchronized successfully.\n";

} catch (PDOException $e) {
    die("Database synchronization failed: " . $e->getMessage() . "\n");
}
?>
