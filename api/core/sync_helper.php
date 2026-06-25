<?php
// api/core/sync_helper.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

/**
 * Synchronize a System User to the HRMS Employees table.
 * If the user has HRMS app access, ensure they exist in hrms_employees.
 */
function syncUserToHRMS($pdo, $tenant_id, $email, $first_name, $last_name, $phone, $gender, $assigned_apps) {
    if (empty($email)) return;

    // Check if HRMS app is assigned (Assuming app_id 1 is HRMS, or checking string 'hrms' depending on how it's stored.
    // In user_apps it's usually an integer or string. We'll check if the HRMS app is assigned.
    // We can query the apps table to get HRMS app_id if needed, but '1' or 'hrms' is typical.
    // Wait, let's just check if it's assigned. Wait, let's look up the app_id for 'hrms'.
    $stmt = $pdo->prepare("SELECT id FROM apps WHERE id = 'hrms' LIMIT 1");
    $stmt->execute();
    $hrms_app_id = $stmt->fetchColumn();

    $has_hrms = false;
    if (is_array($assigned_apps)) {
        foreach ($assigned_apps as $app) {
            if ($app == $hrms_app_id || strtolower((string)$app) === 'hrms') {
                $has_hrms = true;
                break;
            }
        }
    }

    if (!$has_hrms) {
        return; // Don't sync if they don't have HRMS access
    }

    // Check if employee already exists
    $stmt = $pdo->prepare("SELECT id FROM hrms_employees WHERE email = ? AND tenant_id = ?");
    $stmt->execute([$email, $tenant_id]);
    $emp_id = $stmt->fetchColumn();

    if ($emp_id) {
        // Update basic details
        $upd = $pdo->prepare("UPDATE hrms_employees SET first_name = ?, last_name = ?, phone = ?, gender = ? WHERE id = ?");
        $upd->execute([$first_name, $last_name, $phone, $gender, $emp_id]);
    } else {
        // Generate emp code
        $count = $pdo->prepare("SELECT COUNT(*) as cnt FROM hrms_employees WHERE tenant_id = ?");
        $count->execute([$tenant_id]);
        $total = $count->fetch()['cnt'];
        $emp_code = 'EMP' . str_pad($total + 1, 3, '0', STR_PAD_LEFT);
        
        $check = $pdo->prepare("SELECT id FROM hrms_employees WHERE emp_code = ? AND tenant_id = ?");
        $check->execute([$emp_code, $tenant_id]);
        while ($check->fetch()) {
            $total++;
            $emp_code = 'EMP' . str_pad($total + 1, 3, '0', STR_PAD_LEFT);
            $check->execute([$emp_code, $tenant_id]);
        }

        // Insert new employee shell
        $ins = $pdo->prepare("INSERT INTO hrms_employees (emp_code, first_name, last_name, email, phone, gender, status, tenant_id, employment_type) VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, 'Full-time')");
        $ins->execute([$emp_code, $first_name, $last_name, $email, $phone, $gender, $tenant_id]);
        $new_emp_id = $pdo->lastInsertId();

        // Seed default leaves
        $leave_types_stmt = $pdo->prepare("SELECT id, default_days FROM hrms_leave_types WHERE tenant_id = ?");
        $leave_types_stmt->execute([$tenant_id]);
        $leave_types = $leave_types_stmt->fetchAll();

        if (empty($leave_types)) {
            $defaults = [
                ['Casual Leave', 12],
                ['Sick Leave', 10],
                ['Earned Leave', 15],
                ['Unpaid Leave', 0]
            ];
            $insert_type = $pdo->prepare("INSERT INTO hrms_leave_types (name, default_days, tenant_id) VALUES (?, ?, ?)");
            foreach ($defaults as $def) {
                $insert_type->execute([$def[0], $def[1], $tenant_id]);
            }
            $leave_types_stmt->execute([$tenant_id]);
            $leave_types = $leave_types_stmt->fetchAll();
        }

        $bl_stmt = $pdo->prepare("INSERT INTO hrms_employee_leave_balances (employee_id, leave_type_id, total_days, used_days, tenant_id) VALUES (?, ?, ?, 0, ?)");
        foreach ($leave_types as $lt) {
            $bl_stmt->execute([$new_emp_id, $lt['id'], $lt['default_days'], $tenant_id]);
        }
    }
}

/**
 * Synchronize an HRMS Employee to the System Users table.
 * If they don't have a user account, create one with default role 'Sales Associate' and HRMS app access.
 */
function syncHRMSToUser($pdo, $tenant_id, $email, $first_name, $last_name, $phone, $gender) {
    if (empty($email)) return;

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user_id = $stmt->fetchColumn();

    if ($user_id) {
        $upd = $pdo->prepare("UPDATE users SET first_name = ?, last_name = ?, contact = ?, gender = ? WHERE id = ?");
        $upd->execute([$first_name, $last_name, $phone, $gender, $user_id]);
        return; // User already exists, we do not overwrite their user role/password.
    }

    // Insert new user
    $password = 'Welcome@123';
    $hashed_password = password_hash($password, PASSWORD_BCRYPT);
    $role = 'Sales Associate';

    $ins = $pdo->prepare("INSERT INTO users (first_name, last_name, email, contact, gender, password, role, tenant_id, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)");
    $ins->execute([$first_name, $last_name, $email, $phone, $gender, $hashed_password, $role, $tenant_id]);
    $new_user_id = $pdo->lastInsertId();

    // Assign HRMS app
    $appStmt = $pdo->prepare("SELECT id FROM apps WHERE id = 'hrms' LIMIT 1");
    $appStmt->execute();
    $hrms_app_id = $appStmt->fetchColumn();

    if ($hrms_app_id) {
        $insApp = $pdo->prepare("INSERT INTO user_apps (user_id, app_id, tenant_id) VALUES (?, ?, ?)");
        $insApp->execute([$new_user_id, $hrms_app_id, $tenant_id]);
    }

    // Send Welcome Email
    sendWelcomeEmail($pdo, $email, $first_name, $last_name, $password);
}

function sendWelcomeEmail($pdo, $email, $first_name, $last_name, $password) {
    try {
        $protocol = 'http';
        if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
            $protocol = 'https';
        } elseif (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            $protocol = 'https';
        } elseif (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443) {
            $protocol = 'https';
        }
        
        $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
        $request_uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/api/users.php';
        
        $request_path = explode('?', $request_uri)[0];
        $base_path = preg_replace('/(\/api)?\/modules\/hrms\/employees(\.php)?$/i', '', rtrim($request_path, '/'));
        $base_path = preg_replace('/(\/api)?\/core\/sync_helper(\.php)?$/i', '', rtrim($base_path, '/'));
        $base_path = rtrim($base_path, '/') . '/';
        $login_link = $protocol . "://" . $host . $base_path . "login";

        $mail = getMailer($pdo);
        $mail->addAddress($email, "$first_name $last_name");
        $mail->isHTML(true);
        $mail->Subject = 'Welcome to SAR Workforce - Your Account Details';
        $mail->Body    = "
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }
                    .container { padding: 20px; border: 1px solid #dddddd; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; }
                    .header { font-size: 18px; font-weight: bold; color: #0f1425; margin-bottom: 20px; }
                    .credentials { background-color: #e2e8f0; padding: 15px; border-radius: 6px; font-family: monospace; margin: 15px 0; }
                    .button { display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px; }
                    .footer { font-size: 12px; color: #888888; margin-top: 25px; border-top: 1px solid #dddddd; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>Welcome, $first_name!</div>
                    <p>Your user account has been successfully created by your administrator.</p>
                    <p>Use the credentials below to log in:</p>
                    
                    <div class='credentials'>
                        <strong>Login URL:</strong> <a href='$login_link'>$login_link</a><br/>
                        <strong>Email:</strong> $email<br/>
                        <strong>Password:</strong> $password
                    </div>
                    
                    <a href='$login_link' class='button'>Log In Now</a>
                    
                    <div class='footer'>
                        This is an automated system email. Please do not reply directly.
                    </div>
                </div>
            </body>
            </html>
        ";
        $mail->send();
        logEmailAttempt($pdo, $email, $mail->Subject, 'Success');
    } catch (\Exception $e) {
        $email_error = isset($mail) ? ($mail->ErrorInfo ?: $e->getMessage()) : $e->getMessage();
        logEmailAttempt($pdo, $email, 'Welcome to SAR Workforce - Your Account Details', 'Failed', $email_error);
    }
}
?>
