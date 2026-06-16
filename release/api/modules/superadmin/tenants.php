<?php
// tenants.php
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/mailer.php';

header('Content-Type: application/json');

function isValidEmail($email) {
    if ($email === null || $email === '') {
        return false;
    }
    $email = trim($email);
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function isValidPhone($phone) {
    if ($phone === null || $phone === '') {
        return true; // Optional field
    }
    $phone = trim($phone);
    $digitsOnly = preg_replace('/\D/', '', $phone);
    $digitCount = strlen($digitsOnly);
    if ($digitCount >= 7 && $digitCount <= 15) {
        return preg_match('/^\+?[0-9\s\-()]+$/', $phone) === 1;
    }
    return false;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Retrieve all tenants and their primary admins
        try {
            $stmt = $pdo->query("SELECT * FROM tenants ORDER BY created_at DESC");
            $tenants = $stmt->fetchAll();
            
            foreach ($tenants as &$t) {
                $ustmt = $pdo->prepare("SELECT id, first_name, last_name, email, contact, gender, address, profile_photo, role, tenant_id, is_first_login, created_at FROM users WHERE tenant_id = ? AND role = 'Admin' ORDER BY created_at ASC LIMIT 1");
                $ustmt->execute([$t['id']]);
                $admin = $ustmt->fetch();
                $t['admin'] = $admin ? $admin : null;

                // Fetch app_ids from tenant_apps
                $astmt = $pdo->prepare("SELECT app_id FROM tenant_apps WHERE tenant_id = ?");
                $astmt->execute([$t['id']]);
                $t['apps'] = $astmt->fetchAll(PDO::FETCH_COLUMN);
            }

            
            echo json_encode(["success" => true, "data" => $tenants]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Create a new tenant and its primary Admin user
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            $data = $_POST;
        }

        $tenant_name = isset($data['tenant_name']) ? trim($data['tenant_name']) : '';
        $first_name = isset($data['first_name']) ? trim($data['first_name']) : '';
        $last_name = isset($data['last_name']) ? trim($data['last_name']) : '';
        $email = isset($data['email']) ? trim($data['email']) : '';
        $password = isset($data['password']) ? $data['password'] : '';
        $contact = isset($data['contact']) ? trim($data['contact']) : '';
        $gender = isset($data['gender']) ? trim($data['gender']) : 'Other';
        $address = isset($data['address']) ? trim($data['address']) : '';
        $apps = isset($data['apps']) && is_array($data['apps']) ? $data['apps'] : [];

        // Validation
        if (empty($tenant_name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Tenant Organization Name is required."]);
            exit();
        }
        if (empty($first_name) || empty($last_name) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing required administrator fields (First Name, Last Name, Email, Password)."]);
            exit();
        }
        if (!isValidEmail($email)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid Email address format."]);
            exit();
        }
        if (!empty($contact) && !isValidPhone($contact)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid Contact Number format. Must be between 7 and 15 digits."]);
            exit();
        }

        try {
            // Start transaction to ensure both tenant and admin are created together
            $pdo->beginTransaction();

            // 1. Insert Tenant
            $tstmt = $pdo->prepare("INSERT INTO tenants (name) VALUES (?)");
            $tstmt->execute([$tenant_name]);
            $tenant_id = $pdo->lastInsertId();

            // 2. Hash Password and Insert primary admin user with is_first_login = 1
            $hashed_password = password_hash($password, PASSWORD_BCRYPT);
            $ustmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, contact, gender, address, password, role, tenant_id, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?, 'Admin', ?, 1)");
            $ustmt->execute([
                $first_name,
                $last_name,
                $email,
                $contact,
                $gender,
                $address,
                $hashed_password,
                $tenant_id
            ]);

            // 3. Insert Tenant Apps
            if (!empty($apps)) {
                $astmt = $pdo->prepare("INSERT INTO tenant_apps (tenant_id, app_id) VALUES (?, ?)");
                foreach ($apps as $app_id) {
                    $astmt->execute([$tenant_id, $app_id]);
                }
            }

            $pdo->commit();

            // Dynamically calculate the application base URL for the login link
            $protocol = 'http';
            if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
                $protocol = 'https';
            } elseif (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
                $protocol = 'https';
            } elseif (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443) {
                $protocol = 'https';
            }
            
            $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
            $request_uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/api/tenants.php';
            
            // Extract folder path by stripping query parameters and backend script name
            $request_path = explode('?', $request_uri)[0];
            $base_path = preg_replace('/(\/api)?\/tenants(\.php)?$/i', '', rtrim($request_path, '/'));
            $base_path = rtrim($base_path, '/') . '/';
            
            // Build the absolute dynamic link to the login screen
            $login_link = $protocol . "://" . $host . $base_path . "login";

            // Send Onboarding Email using PHPMailer via Hostinger SMTP
            $email_sent = false;
            $email_error = '';

            try {
                $mail = getMailer($pdo);
                
                $mail->addAddress($email, "$first_name $last_name");

                $mail->isHTML(true);
                $mail->Subject = 'Welcome to Your CRM Dashboard - Onboarding Credentials';
                
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
                            <div class='header'>Welcome to CRM Dashboard, $first_name!</div>
                            <p>Your tenant organization <strong>$tenant_name</strong> has been successfully registered by the Superadmin.</p>
                            <p>You have been assigned as the primary Tenant Administrator. Use the credentials below to log in for the first time:</p>
                            
                            <div class='credentials'>
                                <strong>Login URL:</strong> <a href='$login_link'>$login_link</a><br/>
                                <strong>Username:</strong> $email<br/>
                                <strong>Password:</strong> $password
                            </div>
                            
                            <p>Upon your first login, you will see a welcome onboarding message to help you configure your new space and add your team members.</p>
                            
                            <a href='$login_link' class='button'>Log In to Your Dashboard</a>
                            
                            <div class='footer'>
                                This is an automated system email. Please do not reply directly.
                            </div>
                        </div>
                    </body>
                    </html>
                ";

                $mail->send();
                $email_sent = true;
                logEmailAttempt($pdo, $email, $mail->Subject, 'Success');
            } catch (\Exception $e) {
                $email_error = $mail->ErrorInfo;
                logEmailAttempt($pdo, $email, 'Welcome to Your CRM Dashboard - Onboarding Credentials', 'Failed', $email_error);
            }

            echo json_encode([
                "success" => true,
                "message" => "Tenant and administrator user created successfully.",
                "tenant_id" => $tenant_id,
                "email_sent" => $email_sent,
                "email_error" => $email_error
            ]);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            if ($e->getCode() == 23000) {
                http_response_code(409);
                echo json_encode(["success" => false, "error" => "Email address already registered."]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        }
        break;

    case 'PUT':
        // Update tenant settings (name, currency_name, currency_symbol)
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            $data = $_POST;
        }

        $tenant_id = getTenantId();
        $name = isset($data['name']) ? trim($data['name']) : '';
        $currency_name = isset($data['currency_name']) ? trim($data['currency_name']) : 'Indian Rupee';
        $currency_symbol = isset($data['currency_symbol']) ? trim($data['currency_symbol']) : '₹';
        $apps = isset($data['apps']) && is_array($data['apps']) ? $data['apps'] : null;

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Company name is required."]);
            exit();
        }

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("UPDATE tenants SET name = ?, currency_name = ?, currency_symbol = ? WHERE id = ?");
            $stmt->execute([$name, $currency_name, $currency_symbol, $tenant_id]);

            if ($apps !== null) {
                // Delete existing tenant apps
                $delStmt = $pdo->prepare("DELETE FROM tenant_apps WHERE tenant_id = ?");
                $delStmt->execute([$tenant_id]);

                // Insert new ones
                if (!empty($apps)) {
                    $insStmt = $pdo->prepare("INSERT INTO tenant_apps (tenant_id, app_id) VALUES (?, ?)");
                    foreach ($apps as $app_id) {
                        $insStmt->execute([$tenant_id, $app_id]);
                    }
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Tenant settings updated successfully."]);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed."]);
        break;
}
?>
