<?php
// servicedesk_setup.php - Create Service Desk tables and seed data
require_once __DIR__ . '/core/db.php';

header('Content-Type: application/json');

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS servicedesk_categories (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        description TEXT NULL,
        color       VARCHAR(20) DEFAULT '#6366f1',
        is_active   TINYINT DEFAULT 1,
        tenant_id   INT DEFAULT 1,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS servicedesk_sla_policies (
        id                   INT AUTO_INCREMENT PRIMARY KEY,
        priority             ENUM('Low','Medium','High','Critical') NOT NULL,
        first_response_hours INT DEFAULT 24,
        resolution_hours     INT DEFAULT 72,
        tenant_id            INT DEFAULT 1,
        UNIQUE KEY uq_sla_priority (priority, tenant_id)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS servicedesk_tickets (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        ticket_number   VARCHAR(30) NOT NULL,
        subject         VARCHAR(255) NOT NULL,
        description     TEXT NOT NULL,
        category        VARCHAR(100) DEFAULT 'General',
        priority        ENUM('Low','Medium','High','Critical') DEFAULT 'Medium',
        status          ENUM('Open','In Progress','On Hold','Resolved','Closed') DEFAULT 'Open',
        requester_id    INT NOT NULL,
        requester_name  VARCHAR(255) NOT NULL,
        assigned_to     INT NULL,
        agent_name      VARCHAR(255) NULL,
        sla_due_at      DATETIME NULL,
        resolved_at     DATETIME NULL,
        closed_at       DATETIME NULL,
        is_sla_breached TINYINT DEFAULT 0,
        linked_module   VARCHAR(50) NULL,
        linked_id       INT NULL,
        tenant_id       INT DEFAULT 1,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_ticket_num (ticket_number, tenant_id)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS servicedesk_comments (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id   INT NOT NULL,
        author_id   INT NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(50) DEFAULT 'User',
        body        TEXT NOT NULL,
        is_internal TINYINT DEFAULT 0,
        tenant_id   INT DEFAULT 1,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES servicedesk_tickets(id) ON DELETE CASCADE
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS servicedesk_attachments (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id   INT NOT NULL,
        comment_id  INT NULL,
        file_name   VARCHAR(255) NOT NULL,
        file_path   VARCHAR(255) NOT NULL,
        file_type   VARCHAR(100) NOT NULL,
        file_size   INT DEFAULT 0,
        uploaded_by INT NOT NULL,
        tenant_id   INT DEFAULT 1,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES servicedesk_tickets(id) ON DELETE CASCADE
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS servicedesk_activity_log (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id   INT NOT NULL,
        actor_name  VARCHAR(255) NOT NULL,
        action      VARCHAR(100) NOT NULL,
        old_value   VARCHAR(255) NULL,
        new_value   VARCHAR(255) NULL,
        tenant_id   INT DEFAULT 1,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES servicedesk_tickets(id) ON DELETE CASCADE
    )");

    // Seed default categories
    $pdo->exec("INSERT IGNORE INTO servicedesk_categories (id, name, description, color, tenant_id) VALUES
        (1, 'IT Support', 'Hardware, software, and technical issues', '#6366f1', 1),
        (2, 'HR Query', 'Leave, payroll, policy, and HR questions', '#10b981', 1),
        (3, 'Finance', 'Billing, reimbursements, and accounts', '#f59e0b', 1),
        (4, 'Operations', 'Office supplies, facilities, logistics', '#3b82f6', 1),
        (5, 'General', 'All other queries and requests', '#64748b', 1),
        (6, 'IT Support', 'Hardware, software, and technical issues', '#6366f1', 2),
        (7, 'HR Query', 'Leave, payroll, policy, and HR questions', '#10b981', 2),
        (8, 'Finance', 'Billing, reimbursements, and accounts', '#f59e0b', 2),
        (9, 'Operations', 'Office supplies, facilities, logistics', '#3b82f6', 2),
        (10, 'General', 'All other queries and requests', '#64748b', 2)");

    // Seed SLA policies
    $pdo->exec("INSERT IGNORE INTO servicedesk_sla_policies (priority, first_response_hours, resolution_hours, tenant_id) VALUES
        ('Low', 24, 120, 1), ('Medium', 8, 48, 1), ('High', 4, 8, 1), ('Critical', 1, 2, 1),
        ('Low', 24, 120, 2), ('Medium', 8, 48, 2), ('High', 4, 8, 2), ('Critical', 1, 2, 2)");

    // Seed servicedesk app for existing tenants
    $pdo->exec("INSERT IGNORE INTO tenant_apps (tenant_id, app_id) VALUES (1, 'servicedesk'), (2, 'servicedesk')");

    echo json_encode(["success" => true, "message" => "Service Desk tables created and seeded successfully."]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
