<?php
// setup.php
require_once __DIR__ . '/core/db.php';

// Run migrations to alter existing table if it exists
try {
    // Create tenants table
    $pdo->exec("CREATE TABLE IF NOT EXISTS tenants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );");

    // Add currency columns if they do not exist
    $pdo->exec("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency_name VARCHAR(50) DEFAULT 'Indian Rupee';");
    $pdo->exec("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '₹';");
    $pdo->exec("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_deleted TINYINT DEFAULT 0;");
    
    // Add GST columns to accounting tables if they do not exist
    $pdo->exec("ALTER TABLE accounting_invoices ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00;");
    $pdo->exec("ALTER TABLE accounting_invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0.00;");
    $pdo->exec("ALTER TABLE accounting_bills ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00;");
    $pdo->exec("ALTER TABLE accounting_bills ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0.00;");

    // Service Desk migrations for existing installations
    $pdo->exec("ALTER TABLE servicedesk_tickets ADD COLUMN IF NOT EXISTS linked_module VARCHAR(50) NULL;");
    $pdo->exec("ALTER TABLE servicedesk_tickets ADD COLUMN IF NOT EXISTS linked_id INT NULL;");
    $pdo->exec("ALTER TABLE servicedesk_tickets ADD COLUMN IF NOT EXISTS is_sla_breached TINYINT DEFAULT 0;");
    $pdo->exec("ALTER TABLE servicedesk_comments ADD COLUMN IF NOT EXISTS is_internal TINYINT DEFAULT 0;");
    $pdo->exec("ALTER TABLE servicedesk_tickets ADD COLUMN IF NOT EXISTS scheduled_visit_at DATETIME NULL;");
    $pdo->exec("ALTER TABLE servicedesk_tickets ADD COLUMN IF NOT EXISTS scheduled_status VARCHAR(50) DEFAULT 'None';");
    $pdo->exec("ALTER TABLE servicedesk_tickets ADD COLUMN IF NOT EXISTS scheduled_confirmed_by VARCHAR(255) NULL;");
    $pdo->exec("ALTER TABLE servicedesk_attachments ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50) DEFAULT 'General';");
    $pdo->exec("ALTER TABLE servicedesk_attachments ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL;");


    // Seed initial tenants
    $pdo->exec("INSERT INTO tenants (id, name) VALUES (1, 'Acme Enterprise'), (2, 'Globex Industries') ON DUPLICATE KEY UPDATE id=id;");

    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS email VARCHAR(150) NULL;");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50) NULL;");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS agent VARCHAR(255) DEFAULT 'Unassigned';");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS delegation_status VARCHAR(50) DEFAULT 'None';");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_deleted TINYINT DEFAULT 0;");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS remarks TEXT NULL;");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id INT DEFAULT 1;");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_status VARCHAR(50) DEFAULT 'Pending';");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS received_payment DECIMAL(10,2) DEFAULT 0.00;");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Unpaid';");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL;");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(150) NULL;");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_date DATE NULL;");
    $pdo->exec("ALTER TABLE leads ADD COLUMN IF NOT EXISTS finalization_remarks TEXT NULL;");

    // Alter other tables to add tenant_id
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INT DEFAULT 1;");
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login TINYINT DEFAULT 1;");
    $pdo->exec("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id INT DEFAULT 1;");
    $pdo->exec("ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS tenant_id INT DEFAULT 1;");

    // Migrate old contact data if contact column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM leads LIKE 'contact'");
    if ($stmt->fetch()) {
        $pdo->exec("UPDATE leads SET email = contact WHERE contact LIKE '%@%' AND (email IS NULL OR email = '')");
        $pdo->exec("UPDATE leads SET contact_number = contact WHERE contact NOT LIKE '%@%' AND (contact_number IS NULL OR contact_number = '')");
    }
} catch (PDOException $e) {
    // Ignore migration errors if tables don't exist yet
}

$query = "
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(150) NULL,
    contact_number VARCHAR(50) NULL,
    source VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    agent VARCHAR(255) DEFAULT 'Unassigned',
    delegation_status VARCHAR(50) DEFAULT 'None',
    is_deleted TINYINT DEFAULT 0,
    remarks TEXT NULL,
    tenant_id INT DEFAULT 1,
    sales_status VARCHAR(50) DEFAULT 'Pending',
    received_payment DECIMAL(10,2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'Unpaid',
    payment_method VARCHAR(50) NULL,
    transaction_reference VARCHAR(150) NULL,
    payment_date DATE NULL,
    finalization_remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dummy data if table is empty
INSERT INTO leads (name, email, contact_number, source, status, value, agent, delegation_status, tenant_id, created_at)
SELECT * FROM (SELECT 'Acme Corp', 'alice@acme.com', '+1 (555) 019-2834', 'Website', 'New', 5000.00, 'Emily Davis', 'Accepted', 1, '2026-06-12 10:00:00') AS tmp
WHERE NOT EXISTS (
    SELECT name FROM leads WHERE name = 'Acme Corp'
) LIMIT 1;

INSERT INTO leads (name, email, contact_number, source, status, value, agent, delegation_status, tenant_id, created_at)
SELECT * FROM (SELECT 'TechFlow', 'bob@techflow.io', '+1 (555) 019-5847', 'Referral', 'Contacted', 12500.00, 'Emily Davis', 'Pending', 1, '2026-06-11 14:30:00') AS tmp
WHERE NOT EXISTS (
    SELECT name FROM leads WHERE name = 'TechFlow'
) LIMIT 1;

-- Seed a Tenant 2 lead
INSERT INTO leads (name, email, contact_number, source, status, value, agent, delegation_status, tenant_id, created_at)
SELECT * FROM (SELECT 'Gotham Enterprises', 'lucius@gotham.com', '+1 (555) 019-8888', 'Partner', 'New', 150000.00, 'Bruce Wayne', 'Accepted', 2, '2026-06-13 12:00:00') AS tmp
WHERE NOT EXISTS (
    SELECT name FROM leads WHERE name = 'Gotham Enterprises'
) LIMIT 1;

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contact VARCHAR(50) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    profile_photo VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    tenant_id INT DEFAULT 1,
    is_first_login TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial users if table is empty
INSERT INTO users (first_name, last_name, email, contact, gender, address, profile_photo, password, role, tenant_id)
VALUES ('Emily', 'Davis', 'emily.davis@crm.com', '+1 (555) 019-2834', 'Female', '123 Sales St, San Francisco, CA', NULL, '\$2y\$10\$v2iV13d.TjWpW1F2j6Jj1eXqW8/oU8tU7lZlqR1kC4g0H4YwK2M2u', 'Manager', 1)
ON DUPLICATE KEY UPDATE email=email;

INSERT INTO users (first_name, last_name, email, contact, gender, address, profile_photo, password, role, tenant_id)
VALUES ('Alex', 'Lee', 'alex.lee@crm.com', '+1 (555) 019-5847', 'Male', '456 Tech Ave, San Jose, CA', NULL, '\$2y\$10\$v2iV13d.TjWpW1F2j6Jj1eXqW8/oU8tU7lZlqR1kC4g0H4YwK2M2u', 'Sales Associate', 1)
ON DUPLICATE KEY UPDATE email=email;

INSERT INTO users (first_name, last_name, email, contact, gender, address, profile_photo, password, role, tenant_id)
VALUES ('Admin', 'User', 'admin@crm.com', '+1 (555) 019-0000', 'Other', '789 Main Rd, Seattle, WA', NULL, '\$2y\$10\$v2iV13d.TjWpW1F2j6Jj1eXqW8/oU8tU7lZlqR1kC4g0H4YwK2M2u', 'Admin', 1)
ON DUPLICATE KEY UPDATE email=email;

-- Seed a Tenant 2 user (Bruce Wayne - Sales Associate for Globex Industries)
INSERT INTO users (first_name, last_name, email, contact, gender, address, profile_photo, password, role, tenant_id)
VALUES ('Bruce', 'Wayne', 'bruce.wayne@globex.com', '+1 (555) 019-9999', 'Male', 'Wayne Manor, Gotham', NULL, '\$2y\$10\$v2iV13d.TjWpW1F2j6Jj1eXqW8/oU8tU7lZlqR1kC4g0H4YwK2M2u', 'Sales Associate', 2)
ON DUPLICATE KEY UPDATE email=email;

-- Create Lead Activities table
CREATE TABLE IF NOT EXISTS lead_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    tenant_id INT DEFAULT 1,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial activities if table is empty
INSERT INTO lead_activities (lead_id, agent_name, activity_type, details, tenant_id, logged_at)
SELECT * FROM (SELECT 1 AS lead_id, 'Emily Davis' AS agent_name, 'Call' AS activity_type, 'Discussed technical requirements and pricing. Client is interested in standard plan.' AS details, 1 AS tenant_id, '2026-06-12 11:30:00' AS logged_at) AS tmp
WHERE NOT EXISTS (
    SELECT id FROM lead_activities WHERE lead_id = 1
) LIMIT 1;

-- Create Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NULL,
    agent_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial tasks if table is empty
INSERT INTO tasks (lead_id, agent_name, title, due_date, status, tenant_id)
SELECT * FROM (SELECT 2 AS lead_id, 'Emily Davis' AS agent_name, 'Send updated contract proposal' AS title, '2026-06-15' AS due_date, 'Pending' AS status, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (
    SELECT id FROM tasks WHERE lead_id = 2 AND title = 'Send updated contract proposal'
) LIMIT 1;

INSERT INTO tasks (lead_id, agent_name, title, due_date, status, tenant_id)
SELECT * FROM (SELECT 1 AS lead_id, 'Emily Davis' AS agent_name, 'Follow up on onboarding questions' AS title, '2026-06-14' AS due_date, 'Pending' AS status, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (
    SELECT id FROM tasks WHERE lead_id = 1 AND title = 'Follow up on onboarding questions'
) LIMIT 1;

-- Create Lead Sources table
CREATE TABLE IF NOT EXISTS lead_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial lead sources
INSERT INTO lead_sources (name, tenant_id)
SELECT * FROM (SELECT 'Website' AS name, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM lead_sources WHERE name = 'Website' AND tenant_id = 1) LIMIT 1;

INSERT INTO lead_sources (name, tenant_id)
SELECT * FROM (SELECT 'Referral' AS name, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM lead_sources WHERE name = 'Referral' AND tenant_id = 1) LIMIT 1;

INSERT INTO lead_sources (name, tenant_id)
SELECT * FROM (SELECT 'Partner' AS name, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM lead_sources WHERE name = 'Partner' AND tenant_id = 1) LIMIT 1;

-- Create Password Resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL
);

-- Create Email Logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status ENUM('Success', 'Failed') NOT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create SMTP Settings table
CREATE TABLE IF NOT EXISTS smtp_settings (
    tenant_id INT PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    encryption VARCHAR(50) NOT NULL DEFAULT 'ssl',
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create Lead Payments table
CREATE TABLE IF NOT EXISTS lead_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(150) NOT NULL,
    payment_date DATE NOT NULL,
    remarks TEXT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Create Apps table
CREATE TABLE IF NOT EXISTS apps (
    id VARCHAR(50) PRIMARY KEY,
    seq_id INT AUTO_INCREMENT UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    category VARCHAR(100) NULL,
    is_active TINYINT DEFAULT 1,
    weight INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default Apps
INSERT IGNORE INTO apps (id, name, description, category, weight) VALUES 
('crm', 'Lead & Sales Intelligence (CRM)', 'Enterprise pipeline management, lead assignment trackers, activity logger, and real-time revenue analytics dashboard.', 'Sales & Marketing', 1),
('hrms', 'Human Resource Management (HRMS)', 'Complete employee directory, shift scheduling, real-time clock-in trackers, leave planner, payroll ledger, and task sheets.', 'Human Resources', 2),
('inventory', 'Smart Inventory & Warehouse Control', 'Multi-warehouse stock logs, barcode/RFID cataloging, automated purchase ordering, supply logs, and courier trackers.', 'Logistics', 3),
('accounting', 'Double-Entry Financial Ledger', 'Cohesive bookkeeping accounts, custom invoicing, vendor logs, cashflow forecasts, financial statement generator, and tax reports.', 'Finance', 4),
('servicedesk', 'Service Desk & Ticketing', 'Internal support ticketing system with SLA tracking, agent queues, priority escalation, comment threads, and resolution analytics.', 'Operations & IT', 5);

-- Create User Apps table
CREATE TABLE IF NOT EXISTS user_apps (
    user_id INT NOT NULL,
    app_id VARCHAR(50) NOT NULL,
    tenant_id INT NOT NULL,
    PRIMARY KEY (user_id, app_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create Tenant Apps table
CREATE TABLE IF NOT EXISTS tenant_apps (
    tenant_id INT NOT NULL,
    app_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, app_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================
-- HRMS MODULE TABLES
-- ============================================

-- HRMS Departments
CREATE TABLE IF NOT EXISTS hrms_departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    head_employee_id INT NULL,
    description TEXT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HRMS Designations
CREATE TABLE IF NOT EXISTS hrms_designations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    department_id INT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HRMS Employees
CREATE TABLE IF NOT EXISTS hrms_employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    emp_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(50) NULL,
    gender VARCHAR(20) NULL,
    dob DATE NULL,
    blood_group VARCHAR(10) NULL,
    address TEXT NULL,
    department_id INT NULL,
    designation_id INT NULL,
    date_of_joining DATE NULL,
    employment_type ENUM('Full-time', 'Part-time', 'Contract', 'Intern') DEFAULT 'Full-time',
    reporting_manager_id INT NULL,
    status ENUM('Active', 'On Probation', 'Resigned', 'Terminated') DEFAULT 'Active',
    profile_photo VARCHAR(255) NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HRMS Employee Bank Details
CREATE TABLE IF NOT EXISTS hrms_employee_bank_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    bank_name VARCHAR(150) NULL,
    account_number VARCHAR(50) NULL,
    ifsc_code VARCHAR(20) NULL,
    pan_number VARCHAR(20) NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hrms_employees(id) ON DELETE CASCADE
);

-- HRMS Attendance
CREATE TABLE IF NOT EXISTS hrms_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Half-Day', 'Late', 'On Leave') DEFAULT 'Present',
    clock_in TIME NULL,
    clock_out TIME NULL,
    working_hours DECIMAL(5,2) NULL,
    remarks TEXT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hrms_employees(id) ON DELETE CASCADE
);

-- HRMS Leave Types
CREATE TABLE IF NOT EXISTS hrms_leave_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    default_days INT DEFAULT 12,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HRMS Leave Balances
CREATE TABLE IF NOT EXISTS hrms_leave_balances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    allocated INT DEFAULT 0,
    used INT DEFAULT 0,
    remaining INT DEFAULT 0,
    year INT NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hrms_employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES hrms_leave_types(id) ON DELETE CASCADE
);

-- HRMS Leave Requests
CREATE TABLE IF NOT EXISTS hrms_leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days DECIMAL(4,1) NOT NULL,
    reason TEXT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    approved_by INT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hrms_employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES hrms_leave_types(id) ON DELETE CASCADE
);

-- HRMS Holidays
CREATE TABLE IF NOT EXISTS hrms_holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    date DATE NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HRMS Salary Structures
CREATE TABLE IF NOT EXISTS hrms_salary_structures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    basic DECIMAL(12,2) DEFAULT 0.00,
    hra DECIMAL(12,2) DEFAULT 0.00,
    da DECIMAL(12,2) DEFAULT 0.00,
    special_allowance DECIMAL(12,2) DEFAULT 0.00,
    pf_deduction DECIMAL(12,2) DEFAULT 0.00,
    esi_deduction DECIMAL(12,2) DEFAULT 0.00,
    tax_deduction DECIMAL(12,2) DEFAULT 0.00,
    other_deductions DECIMAL(12,2) DEFAULT 0.00,
    net_salary DECIMAL(12,2) DEFAULT 0.00,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hrms_employees(id) ON DELETE CASCADE
);

-- HRMS Payroll Runs
CREATE TABLE IF NOT EXISTS hrms_payroll_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    gross_salary DECIMAL(12,2) DEFAULT 0.00,
    total_deductions DECIMAL(12,2) DEFAULT 0.00,
    net_salary DECIMAL(12,2) DEFAULT 0.00,
    status ENUM('Draft', 'Processed', 'Paid') DEFAULT 'Draft',
    paid_on DATE NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hrms_employees(id) ON DELETE CASCADE
);

-- HRMS Documents
CREATE TABLE IF NOT EXISTS hrms_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    category VARCHAR(100) DEFAULT 'Other',
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hrms_employees(id) ON DELETE CASCADE
);

-- Seed HRMS Departments
INSERT INTO hrms_departments (name, description, tenant_id)
SELECT * FROM (SELECT 'Human Resources' AS name, 'HR and People Operations' AS description, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_departments WHERE name = 'Human Resources' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_departments (name, description, tenant_id)
SELECT * FROM (SELECT 'Engineering' AS name, 'Software Development and IT' AS description, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_departments WHERE name = 'Engineering' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_departments (name, description, tenant_id)
SELECT * FROM (SELECT 'Sales' AS name, 'Sales and Business Development' AS description, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_departments WHERE name = 'Sales' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_departments (name, description, tenant_id)
SELECT * FROM (SELECT 'Finance' AS name, 'Finance and Accounting' AS description, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_departments WHERE name = 'Finance' AND tenant_id = 1) LIMIT 1;

-- Seed HRMS Designations
INSERT INTO hrms_designations (name, department_id, tenant_id)
SELECT 'HR Manager', d.id, 1 FROM hrms_departments d WHERE d.name = 'Human Resources' AND d.tenant_id = 1
AND NOT EXISTS (SELECT id FROM hrms_designations WHERE name = 'HR Manager' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_designations (name, department_id, tenant_id)
SELECT 'Software Engineer', d.id, 1 FROM hrms_departments d WHERE d.name = 'Engineering' AND d.tenant_id = 1
AND NOT EXISTS (SELECT id FROM hrms_designations WHERE name = 'Software Engineer' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_designations (name, department_id, tenant_id)
SELECT 'Sales Executive', d.id, 1 FROM hrms_departments d WHERE d.name = 'Sales' AND d.tenant_id = 1
AND NOT EXISTS (SELECT id FROM hrms_designations WHERE name = 'Sales Executive' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_designations (name, department_id, tenant_id)
SELECT 'Accountant', d.id, 1 FROM hrms_departments d WHERE d.name = 'Finance' AND d.tenant_id = 1
AND NOT EXISTS (SELECT id FROM hrms_designations WHERE name = 'Accountant' AND tenant_id = 1) LIMIT 1;

-- Seed HRMS Leave Types
INSERT INTO hrms_leave_types (name, default_days, tenant_id)
SELECT * FROM (SELECT 'Casual Leave' AS name, 12 AS default_days, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_leave_types WHERE name = 'Casual Leave' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_leave_types (name, default_days, tenant_id)
SELECT * FROM (SELECT 'Sick Leave' AS name, 10 AS default_days, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_leave_types WHERE name = 'Sick Leave' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_leave_types (name, default_days, tenant_id)
SELECT * FROM (SELECT 'Earned Leave' AS name, 15 AS default_days, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_leave_types WHERE name = 'Earned Leave' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_leave_types (name, default_days, tenant_id)
SELECT * FROM (SELECT 'Unpaid Leave' AS name, 0 AS default_days, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_leave_types WHERE name = 'Unpaid Leave' AND tenant_id = 1) LIMIT 1;

-- Seed HRMS Sample Employees for Tenant 1
INSERT INTO hrms_employees (emp_code, first_name, last_name, email, phone, gender, dob, department_id, designation_id, date_of_joining, employment_type, status, tenant_id)
SELECT 'EMP001', 'Emily', 'Davis', 'emily.davis@crm.com', '+1 (555) 019-2834', 'Female', '1992-03-15', d.id, des.id, '2024-01-15', 'Full-time', 'Active', 1
FROM hrms_departments d, hrms_designations des
WHERE d.name = 'Sales' AND d.tenant_id = 1 AND des.name = 'Sales Executive' AND des.tenant_id = 1
AND NOT EXISTS (SELECT id FROM hrms_employees WHERE emp_code = 'EMP001' AND tenant_id = 1) LIMIT 1;

INSERT INTO hrms_employees (emp_code, first_name, last_name, email, phone, gender, dob, department_id, designation_id, date_of_joining, employment_type, status, tenant_id)
SELECT 'EMP002', 'Alex', 'Lee', 'alex.lee@crm.com', '+1 (555) 019-5847', 'Male', '1995-07-22', d.id, des.id, '2024-06-01', 'Full-time', 'Active', 1
FROM hrms_departments d, hrms_designations des
WHERE d.name = 'Engineering' AND d.tenant_id = 1 AND des.name = 'Software Engineer' AND des.tenant_id = 1
AND NOT EXISTS (SELECT id FROM hrms_employees WHERE emp_code = 'EMP002' AND tenant_id = 1) LIMIT 1;

-- ============================================
-- INVENTORY MODULE TABLES
-- ============================================

-- Inventory Warehouses
CREATE TABLE IF NOT EXISTS inventory_warehouses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NULL,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Products (Barcode/RFID catalog)
CREATE TABLE IF NOT EXISTS inventory_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100) NULL,
    rfid_tag VARCHAR(100) NULL,
    category VARCHAR(100) DEFAULT 'General',
    description TEXT NULL,
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    sale_price DECIMAL(10,2) DEFAULT 0.00,
    reorder_level INT DEFAULT 10,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Warehouse Stock
CREATE TABLE IF NOT EXISTS inventory_warehouse_stock (
    warehouse_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    tenant_id INT DEFAULT 1,
    PRIMARY KEY (warehouse_id, product_id)
);

-- Inventory Stock Logs
CREATE TABLE IF NOT EXISTS inventory_stock_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    warehouse_id INT NULL,
    quantity_changed INT NOT NULL,
    type ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') NOT NULL,
    remarks TEXT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Suppliers
CREATE TABLE IF NOT EXISTS inventory_suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(150) NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(50) NULL,
    address TEXT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Purchase Orders
CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    order_date DATE NOT NULL,
    status ENUM('Draft', 'Sent', 'Received', 'Cancelled') DEFAULT 'Draft',
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Purchase Order Items
CREATE TABLE IF NOT EXISTS inventory_purchase_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    tenant_id INT DEFAULT 1,
    FOREIGN KEY (purchase_order_id) REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE
);

-- Inventory Couriers
CREATE TABLE IF NOT EXISTS inventory_couriers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    tracking_number VARCHAR(100) NOT NULL,
    courier_name VARCHAR(100) NOT NULL,
    status ENUM('Dispatched', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned') DEFAULT 'Dispatched',
    origin VARCHAR(255) NULL,
    destination VARCHAR(255) NULL,
    purchase_order_id INT NULL,
    sales_id INT NULL,
    tenant_id INT DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Sales Orders
CREATE TABLE IF NOT EXISTS inventory_sales_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    order_date DATE NOT NULL,
    status ENUM('Draft', 'Approved', 'Shipped', 'Cancelled') DEFAULT 'Draft',
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Sales Order Items
CREATE TABLE IF NOT EXISTS inventory_sales_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tenant_id INT DEFAULT 1,
    FOREIGN KEY (sales_order_id) REFERENCES inventory_sales_orders(id) ON DELETE CASCADE
);

-- Seed Inventory Warehouses
INSERT INTO inventory_warehouses (name, location, status, tenant_id)
SELECT * FROM (SELECT 'Central Warehouse' AS name, 'Dallas, TX' AS location, 'Active' AS status, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_warehouses WHERE name = 'Central Warehouse' AND tenant_id = 1) LIMIT 1;

INSERT INTO inventory_warehouses (name, location, status, tenant_id)
SELECT * FROM (SELECT 'East Coast Logistics' AS name, 'Newark, NJ' AS location, 'Active' AS status, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_warehouses WHERE name = 'East Coast Logistics' AND tenant_id = 1) LIMIT 1;

INSERT INTO inventory_warehouses (name, location, status, tenant_id)
SELECT * FROM (SELECT 'Gotham Depot' AS name, 'Gotham City, NJ' AS location, 'Active' AS status, 2 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_warehouses WHERE name = 'Gotham Depot' AND tenant_id = 2) LIMIT 1;

-- Seed Inventory Products
INSERT INTO inventory_products (name, sku, barcode, rfid_tag, category, description, cost_price, sale_price, reorder_level, tenant_id)
SELECT * FROM (SELECT 'Wireless Mechanical Keyboard' AS name, 'KB-WRLS-01' AS sku, '8901031200112' AS barcode, 'RFID-KB-001' AS rfid_tag, 'Electronics' AS category, 'Custom mechanical keyboard' AS description, 45.00 AS cost_price, 89.99 AS sale_price, 15 AS reorder_level, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_products WHERE sku = 'KB-WRLS-01' AND tenant_id = 1) LIMIT 1;

INSERT INTO inventory_products (name, sku, barcode, rfid_tag, category, description, cost_price, sale_price, reorder_level, tenant_id)
SELECT * FROM (SELECT 'USB-C Dual Docking Station' AS name, 'DK-USBC-02' AS sku, '8901031200228' AS barcode, 'RFID-DK-002' AS rfid_tag, 'Electronics' AS category, 'Dual monitor docking station' AS description, 60.00 AS cost_price, 119.99 AS sale_price, 8 AS reorder_level, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_products WHERE sku = 'DK-USBC-02' AND tenant_id = 1) LIMIT 1;

INSERT INTO inventory_products (name, sku, barcode, rfid_tag, category, description, cost_price, sale_price, reorder_level, tenant_id)
SELECT * FROM (SELECT 'Ergonomic Office Chair' AS name, 'CH-ERGO-03' AS sku, '8901031200334' AS barcode, 'RFID-CH-003' AS rfid_tag, 'Furniture' AS category, 'Fully adjustable mesh chair' AS description, 120.00 AS cost_price, 249.99 AS sale_price, 5 AS reorder_level, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_products WHERE sku = 'CH-ERGO-03' AND tenant_id = 1) LIMIT 1;

-- Seed Suppliers
INSERT INTO inventory_suppliers (name, contact_name, email, phone, address, tenant_id)
SELECT * FROM (SELECT 'Prime Global Distributors' AS name, 'John Doe' AS contact_name, 'orders@primeglobal.com' AS email, '+1-555-010-8822' AS phone, '100 Distribution Dr, Houston, TX' AS address, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_suppliers WHERE name = 'Prime Global Distributors' AND tenant_id = 1) LIMIT 1;

INSERT INTO inventory_suppliers (name, contact_name, email, phone, address, tenant_id)
SELECT * FROM (SELECT 'Apex Office Supplies' AS name, 'Jane Smith' AS contact_name, 'sales@apexoffice.com' AS email, '+1-555-010-9944' AS phone, '250 Workspace Blvd, Boston, MA' AS address, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_suppliers WHERE name = 'Apex Office Supplies' AND tenant_id = 1) LIMIT 1;

-- Seed initial stock levels (linking seed products to seed warehouses)
-- Central Warehouse stocks
INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id)
SELECT 1, p.id, 50, 1 FROM inventory_products p WHERE p.sku = 'KB-WRLS-01' AND p.tenant_id = 1
ON DUPLICATE KEY UPDATE quantity = quantity;

INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id)
SELECT 1, p.id, 3, 1 FROM inventory_products p WHERE p.sku = 'DK-USBC-02' AND p.tenant_id = 1
ON DUPLICATE KEY UPDATE quantity = quantity;

INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id)
SELECT 1, p.id, 12, 1 FROM inventory_products p WHERE p.sku = 'CH-ERGO-03' AND p.tenant_id = 1
ON DUPLICATE KEY UPDATE quantity = quantity;

-- East Coast Logistics stocks
INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id)
SELECT 2, p.id, 10, 1 FROM inventory_products p WHERE p.sku = 'KB-WRLS-01' AND p.tenant_id = 1
ON DUPLICATE KEY UPDATE quantity = quantity;

INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id)
SELECT 2, p.id, 15, 1 FROM inventory_products p WHERE p.sku = 'DK-USBC-02' AND p.tenant_id = 1
ON DUPLICATE KEY UPDATE quantity = quantity;

INSERT INTO inventory_warehouse_stock (warehouse_id, product_id, quantity, tenant_id)
SELECT 2, p.id, 2, 1 FROM inventory_products p WHERE p.sku = 'CH-ERGO-03' AND p.tenant_id = 1
ON DUPLICATE KEY UPDATE quantity = quantity;

-- Seed initial couriers for testing
INSERT INTO inventory_couriers (name, tracking_number, courier_name, status, origin, destination, tenant_id)
SELECT * FROM (SELECT 'Keyboard Shipment' AS name, 'TRK-990812' AS tracking_number, 'FedEx' AS courier_name, 'In Transit' AS status, 'Dallas Warehouse' AS origin, 'Seattle Office' AS destination, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_couriers WHERE tracking_number = 'TRK-990812' AND tenant_id = 1) LIMIT 1;

INSERT INTO inventory_couriers (name, tracking_number, courier_name, status, origin, destination, tenant_id)
SELECT * FROM (SELECT 'Docking Stations PO Delivery' AS name, 'TRK-881726' AS tracking_number, 'DHL' AS courier_name, 'Dispatched' AS status, 'Apex Office Depot' AS origin, 'Newark Warehouse' AS destination, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM inventory_couriers WHERE tracking_number = 'TRK-881726' AND tenant_id = 1) LIMIT 1;

-- ============================================
-- HRMS RECRUITMENT TABLES
-- ============================================

-- HRMS Job Openings
CREATE TABLE IF NOT EXISTS hrms_job_openings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department_id INT NULL,
    designation_id INT NULL,
    description TEXT NULL,
    requirements TEXT NULL,
    experience_required VARCHAR(100) NULL,
    vacancies INT DEFAULT 1,
    status ENUM('Open', 'Closed', 'Draft') DEFAULT 'Open',
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Job Openings for Tenant 1
INSERT INTO hrms_job_openings (id, title, department_id, designation_id, description, requirements, experience_required, vacancies, status, tenant_id)
SELECT * FROM (SELECT 1 AS id, 'Senior Software Engineer' AS title, 2 AS department_id, 2 AS designation_id, 'Looking for an experienced software engineer to build enterprise cloud systems.' AS description, '5+ years experience with React and PHP.' AS requirements, '5-8 Years' AS experience_required, 2 AS vacancies, 'Open' AS status, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_job_openings WHERE id = 1) LIMIT 1;

-- HRMS Candidates
CREATE TABLE IF NOT EXISTS hrms_candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_opening_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NULL,
    resume_path VARCHAR(255) NULL,
    stage ENUM('Applied', 'Screening', 'Interviewing', 'Offered', 'Hired', 'Rejected') DEFAULT 'Applied',
    source VARCHAR(100) DEFAULT 'Direct',
    experience_years DECIMAL(4,1) DEFAULT 0.0,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_opening_id) REFERENCES hrms_job_openings(id) ON DELETE CASCADE
);

-- Seed Candidates for Tenant 1
INSERT INTO hrms_candidates (id, job_opening_id, first_name, last_name, email, phone, stage, source, experience_years, tenant_id)
SELECT * FROM (SELECT 1 AS id, 1 AS job_opening_id, 'Karan' AS first_name, 'Malhotra' AS last_name, 'karan.malhotra@testmail.com' AS email, '+919898989801' AS phone, 'Applied' AS stage, 'LinkedIn' AS source, 6.0 AS experience_years, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_candidates WHERE id = 1) LIMIT 1;

INSERT INTO hrms_candidates (id, job_opening_id, first_name, last_name, email, phone, stage, source, experience_years, tenant_id)
SELECT * FROM (SELECT 2 AS id, 1 AS job_opening_id, 'Simran' AS first_name, 'Kaur' AS last_name, 'simran.kaur@testmail.com' AS email, '+919898989802' AS phone, 'Interviewing' AS stage, 'Referral' AS source, 5.2 AS experience_years, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_candidates WHERE id = 2) LIMIT 1;

-- HRMS Interviews
CREATE TABLE IF NOT EXISTS hrms_interviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    interviewer_employee_id INT NOT NULL,
    interview_date DATETIME NOT NULL,
    round_name VARCHAR(100) NOT NULL,
    rating INT DEFAULT 0,
    feedback TEXT NULL,
    status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES hrms_candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (interviewer_employee_id) REFERENCES hrms_employees(id) ON DELETE CASCADE
);

-- Seed Interviews for Tenant 1
INSERT INTO hrms_interviews (id, candidate_id, interviewer_employee_id, interview_date, round_name, rating, feedback, status, tenant_id)
SELECT * FROM (SELECT 1 AS id, 2 AS candidate_id, 1 AS interviewer_employee_id, '2026-06-18 11:00:00' AS interview_date, 'Technical Round 1' AS round_name, 4 AS rating, 'Strong coding foundations. Good problem solver.' AS feedback, 'Scheduled' AS status, 1 AS tenant_id) AS tmp
WHERE NOT EXISTS (SELECT id FROM hrms_interviews WHERE id = 1) LIMIT 1;

-- ============================================
-- ACCOUNTING MODULE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS accounting_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    type ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense') NOT NULL,
    parent_id INT NULL,
    is_active TINYINT DEFAULT 1,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_account_code (code, tenant_id),
    FOREIGN KEY (parent_id) REFERENCES accounting_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS accounting_journal_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_date DATE NOT NULL,
    reference VARCHAR(100) NULL,
    description VARCHAR(255) NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounting_journal_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journal_entry_id INT NOT NULL,
    account_id INT NOT NULL,
    debit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_entry_id) REFERENCES accounting_journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounting_accounts(id)
);

CREATE TABLE IF NOT EXISTS accounting_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('Draft', 'Open', 'Paid', 'Overdue', 'Void') DEFAULT 'Draft',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    amount_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    sales_order_id INT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_invoice_num (invoice_number, tenant_id)
);

CREATE TABLE IF NOT EXISTS accounting_invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    product_id INT NULL,
    tenant_id INT DEFAULT 1,
    FOREIGN KEY (invoice_id) REFERENCES accounting_invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_number VARCHAR(100) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('Draft', 'Open', 'Paid', 'Void') DEFAULT 'Draft',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    amount_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    purchase_order_id INT NULL,
    attachment_path VARCHAR(255) NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bill_num (bill_number, tenant_id)
);

CREATE TABLE IF NOT EXISTS accounting_bill_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    product_id INT NULL,
    tenant_id INT DEFAULT 1,
    FOREIGN KEY (bill_id) REFERENCES accounting_bills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    type ENUM('Receipt', 'Payment') NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    reference VARCHAR(150) NULL,
    invoice_id INT NULL,
    bill_id INT NULL,
    payroll_run_id INT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES accounting_invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (bill_id) REFERENCES accounting_bills(id) ON DELETE SET NULL
);

-- Seed default CoA for Tenant 1
INSERT IGNORE INTO accounting_accounts (code, name, type, tenant_id) VALUES
('1010', 'Cash on Hand', 'Asset', 1),
('1020', 'Bank Account', 'Asset', 1),
('1200', 'Accounts Receivable', 'Asset', 1),
('1400', 'Inventory Asset', 'Asset', 1),
('2000', 'Accounts Payable', 'Liability', 1),
('2200', 'Sales Tax Payable', 'Liability', 1),
('3000', 'Owner Equity', 'Equity', 1),
('3100', 'Retained Earnings', 'Equity', 1),
('4000', 'Sales Revenue', 'Revenue', 1),
('5000', 'Salary Expense', 'Expense', 1),
('5100', 'Rent Expense', 'Expense', 1),
('5200', 'Inventory Purchases', 'Expense', 1);

-- Seed default CoA for Tenant 2
INSERT IGNORE INTO accounting_accounts (code, name, type, tenant_id) VALUES
('1010', 'Cash on Hand', 'Asset', 2),
('1020', 'Bank Account', 'Asset', 2),
('1200', 'Accounts Receivable', 'Asset', 2),
('1400', 'Inventory Asset', 'Asset', 2),
('2000', 'Accounts Payable', 'Liability', 2),
('2200', 'Sales Tax Payable', 'Liability', 2),
('3000', 'Owner Equity', 'Equity', 2),
('3100', 'Retained Earnings', 'Equity', 2),
('4000', 'Sales Revenue', 'Revenue', 2),
('5000', 'Salary Expense', 'Expense', 2),
('5100', 'Rent Expense', 'Expense', 2),
('5200', 'Inventory Purchases', 'Expense', 2);

-- ============================================
-- SERVICE DESK MODULE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS servicedesk_categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT NULL,
    color       VARCHAR(20) DEFAULT '#6366f1',
    is_active   TINYINT DEFAULT 1,
    tenant_id   INT DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicedesk_sla_policies (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    priority             ENUM('Low','Medium','High','Critical') NOT NULL,
    first_response_hours INT DEFAULT 24,
    resolution_hours     INT DEFAULT 72,
    tenant_id            INT DEFAULT 1,
    UNIQUE KEY uq_sla_priority (priority, tenant_id)
);

CREATE TABLE IF NOT EXISTS servicedesk_tickets (
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
    scheduled_visit_at      DATETIME NULL,
    scheduled_status        VARCHAR(50) DEFAULT 'None',
    scheduled_confirmed_by  VARCHAR(255) NULL,
    tenant_id       INT DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ticket_num (ticket_number, tenant_id)
);

CREATE TABLE IF NOT EXISTS servicedesk_comments (
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
);

CREATE TABLE IF NOT EXISTS servicedesk_attachments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id   INT NOT NULL,
    comment_id  INT NULL,
    file_name   VARCHAR(255) NOT NULL,
    file_path   VARCHAR(255) NOT NULL,
    file_type   VARCHAR(100) NOT NULL,
    file_size   INT DEFAULT 0,
    uploaded_by INT NOT NULL,
    attachment_type VARCHAR(50) DEFAULT 'General',
    description     VARCHAR(255) NULL,
    tenant_id   INT DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES servicedesk_tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS servicedesk_activity_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id   INT NOT NULL,
    actor_name  VARCHAR(255) NOT NULL,
    action      VARCHAR(100) NOT NULL,
    old_value   VARCHAR(255) NULL,
    new_value   VARCHAR(255) NULL,
    tenant_id   INT DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES servicedesk_tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS servicedesk_material_requests (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id         INT NOT NULL,
    material_name     VARCHAR(255) NOT NULL,
    quantity          DECIMAL(10,2) NOT NULL,
    unit              VARCHAR(50) DEFAULT 'pcs',
    status            VARCHAR(50) DEFAULT 'Pending',
    requested_by      INT NOT NULL,
    requested_by_name VARCHAR(255) NOT NULL,
    remarks           TEXT NULL,
    tenant_id         INT DEFAULT 1,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES servicedesk_tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS servicedesk_fund_requests (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id         INT NOT NULL,
    amount            DECIMAL(12,2) NOT NULL,
    payment_method    VARCHAR(50) DEFAULT 'Cash',
    payment_details   TEXT NULL,
    status            VARCHAR(50) DEFAULT 'Pending',
    requested_by      INT NOT NULL,
    requested_by_name VARCHAR(255) NOT NULL,
    remarks           TEXT NULL,
    tenant_id         INT DEFAULT 1,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES servicedesk_tickets(id) ON DELETE CASCADE
);

";

try {
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec($query);
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // Dynamic Alterations to add GST columns to existing installations
    $pdo->exec("ALTER TABLE accounting_invoices ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00;");
    $pdo->exec("ALTER TABLE accounting_invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0.00;");
    $pdo->exec("ALTER TABLE accounting_bills ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00;");
    $pdo->exec("ALTER TABLE accounting_bills ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0.00;");
    $pdo->exec("ALTER TABLE accounting_bills ADD COLUMN IF NOT EXISTS attachment_path VARCHAR(255) NULL;");

    // Migrate existing lead payment details into lead_payments table
    $stmt = $pdo->query("SHOW TABLES LIKE 'lead_payments'");
    if ($stmt->fetch()) {
        $check_empty = $pdo->query("SELECT COUNT(*) FROM lead_payments");
        if ($check_empty->fetchColumn() == 0) {
            // Lead payments is empty, migrate from leads table
            $stmt = $pdo->query("SELECT id, received_payment, payment_method, transaction_reference, payment_date, finalization_remarks, tenant_id FROM leads WHERE received_payment > 0");
            $existing_payments = $stmt->fetchAll();
            if (count($existing_payments) > 0) {
                $insert_payment = $pdo->prepare("INSERT INTO lead_payments (lead_id, amount, payment_method, transaction_reference, payment_date, remarks, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                foreach ($existing_payments as $ep) {
                    $pm = $ep['payment_method'] ?: 'Cash';
                    $ref = $ep['transaction_reference'] ?: 'MIGRATED';
                    $pdate = $ep['payment_date'] ?: date('Y-m-d');
                    $rem = $ep['finalization_remarks'] ?: 'Migrated initial payment';
                    $insert_payment->execute([
                        $ep['id'],
                        $ep['received_payment'],
                        $pm,
                        $ref,
                        $pdate,
                        $rem,
                        $ep['tenant_id']
                    ]);
                }
            }
        }
    }

    // Seed Superadmin user dynamically
    $super_email = 'vishwaaniruddh@gmail.com';
    $super_pass = password_hash('rootroot', PASSWORD_BCRYPT);
    $check_super = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $check_super->execute([$super_email]);
    if (!$check_super->fetch()) {
        $insert_super = $pdo->prepare("INSERT INTO users (first_name, last_name, email, contact, gender, address, password, role, tenant_id, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)");
        $insert_super->execute([
            'System',
            'Superadmin',
            $super_email,
            '',
            'Other',
            '',
            $super_pass,
            'Superadmin'
        ]);
    }

    // Seed initial apps for existing tenants (Tenant 1 and Tenant 2 get crm, hrms, inventory, accounting, and servicedesk by default)
    $pdo->exec("INSERT IGNORE INTO tenant_apps (tenant_id, app_id) VALUES 
        (1, 'crm'), (1, 'hrms'), (1, 'inventory'), (1, 'accounting'), (1, 'servicedesk'),
        (2, 'crm'), (2, 'hrms'), (2, 'inventory'), (2, 'accounting'), (2, 'servicedesk')");

    // Seed user_apps for existing users based on tenant apps
    $pdo->exec("INSERT IGNORE INTO user_apps (user_id, app_id, tenant_id)
        SELECT u.id, ta.app_id, u.tenant_id
        FROM users u
        JOIN tenant_apps ta ON u.tenant_id = ta.tenant_id
        WHERE u.role != 'Superadmin'
    ");

    // Seed default Service Desk categories
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

    // Seed default SLA policies (hours to resolution)
    $pdo->exec("INSERT IGNORE INTO servicedesk_sla_policies (priority, first_response_hours, resolution_hours, tenant_id) VALUES
        ('Low', 24, 120, 1), ('Medium', 8, 48, 1), ('High', 4, 8, 1), ('Critical', 1, 2, 1),
        ('Low', 24, 120, 2), ('Medium', 8, 48, 2), ('High', 4, 8, 2), ('Critical', 1, 2, 2)");


    echo json_encode(["success" => true, "message" => "Database and tables setup successfully."]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
