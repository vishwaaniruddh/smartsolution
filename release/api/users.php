<?php
// users.php
require_once 'db.php';
require_once 'mailer.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if ($id !== null) {
            try {
                $stmt = $pdo->prepare("SELECT u.id, u.first_name, u.last_name, u.email, u.contact, u.gender, u.address, u.profile_photo, u.role, u.tenant_id, u.created_at, t.name as tenant_name, t.currency_name, t.currency_symbol FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE u.id = ?");
                $stmt->execute([$id]);
                $user = $stmt->fetch();
                if ($user) {
                    echo json_encode(["success" => true, "data" => $user]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "User not found"]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
            break;
        }

        // Retrieve all users for this tenant (excluding passwords for security)
        try {
            $tenant_id = getTenantId();
            $stmt = $pdo->prepare("SELECT id, first_name, last_name, email, contact, gender, address, profile_photo, role, created_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC");
            $stmt->execute([$tenant_id]);
            $users = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $users]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;


    case 'POST':
        // Handle User Creation or Update (if ID is provided)
        $id = isset($_POST['id']) ? intval($_POST['id']) : null;
        $first_name = isset($_POST['first_name']) ? $_POST['first_name'] : '';
        $last_name = isset($_POST['last_name']) ? $_POST['last_name'] : '';
        $email = isset($_POST['email']) ? $_POST['email'] : '';
        $contact = isset($_POST['contact']) ? $_POST['contact'] : '';
        $gender = isset($_POST['gender']) ? $_POST['gender'] : '';
        $address = isset($_POST['address']) ? $_POST['address'] : '';
        $password = isset($_POST['password']) ? $_POST['password'] : '';
        $role = isset($_POST['role']) ? $_POST['role'] : '';

        // If JSON was sent instead of Form Data (fallback)
        if (empty($first_name)) {
            $json = json_decode(file_get_contents("php://input"), true);
            if ($json) {
                $id = isset($json['id']) ? intval($json['id']) : null;
                $first_name = isset($json['first_name']) ? $json['first_name'] : '';
                $last_name = isset($json['last_name']) ? $json['last_name'] : '';
                $email = isset($json['email']) ? $json['email'] : '';
                $contact = isset($json['contact']) ? $json['contact'] : '';
                $gender = isset($json['gender']) ? $json['gender'] : '';
                $address = isset($json['address']) ? $json['address'] : '';
                $password = isset($json['password']) ? $json['password'] : '';
                $role = isset($json['role']) ? $json['role'] : '';
            }
        }

        // Required fields validation
        if (empty($first_name) || empty($last_name) || empty($email) || empty($role)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing required fields (First Name, Last Name, Email, Role)"]);
            exit();
        }

        // Email validation
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid email address format."]);
            exit();
        }

        // Contact format validation if provided
        if (!empty($contact)) {
            $digitsOnly = preg_replace('/\D/', '', $contact);
            $digitCount = strlen($digitsOnly);
            if ($digitCount < 7 || $digitCount > 15 || !preg_match('/^\+?[0-9\s\-()]+$/', $contact)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid Contact Number format. Must be between 7 and 15 digits."]);
                exit();
            }
        }

        // Handle Profile Photo Upload if exists
        $profile_photo_path = null;
        if (isset($_FILES['profile_photo']) && $_FILES['profile_photo']['error'] === UPLOAD_ERR_OK) {
            $file_tmp = $_FILES['profile_photo']['tmp_name'];
            $file_name = $_FILES['profile_photo']['name'];
            $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
            
            // Validate extension
            $allowed_exts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (in_array($file_ext, $allowed_exts)) {
                $upload_dir = 'uploads';
                if (!file_exists($upload_dir)) {
                    mkdir($upload_dir, 0777, true);
                }
                
                $new_file_name = uniqid('user_', true) . '.' . $file_ext;
                $dest_path = $upload_dir . '/' . $new_file_name;
                
                if (move_uploaded_file($file_tmp, $dest_path)) {
                    $profile_photo_path = $dest_path;
                }
            }
        }

        if ($id !== null) {
            // PERFORM UPDATE
            try {
                $fields = [
                    "`first_name` = ?",
                    "`last_name` = ?",
                    "`email` = ?",
                    "`contact` = ?",
                    "`gender` = ?",
                    "`address` = ?",
                    "`role` = ?"
                ];
                $params = [$first_name, $last_name, $email, $contact, $gender, $address, $role];

                // If a new photo was uploaded, update path
                if ($profile_photo_path !== null) {
                    $fields[] = "`profile_photo` = ?";
                    $params[] = $profile_photo_path;
                }

                // If password was updated, hash and set it
                if (!empty($password)) {
                    $fields[] = "`password` = ?";
                    $params[] = password_hash($password, PASSWORD_BCRYPT);
                }

                $check_stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
                $check_stmt->execute([$id]);
                $existing_user = $check_stmt->fetch();
                
                if ($existing_user && $existing_user['role'] === 'Superadmin') {
                    $params[] = $id;
                    $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
                } else {
                    $tenant_id = getTenantId();
                    $params[] = $id;
                    $params[] = $tenant_id;
                    $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ? AND tenant_id = ?";
                }
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                echo json_encode([
                    "success" => true,
                    "message" => "User updated successfully",
                    "profile_photo" => $profile_photo_path
                ]);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    http_response_code(409);
                    echo json_encode(["success" => false, "error" => "Email address already registered"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["success" => false, "error" => $e->getMessage()]);
                }
            }
        } else {
            // PERFORM INSERT
            if (empty($password)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Password is required for new accounts"]);
                exit();
            }

            $hashed_password = password_hash($password, PASSWORD_BCRYPT);

            try {
                $tenant_id = getTenantId();
                $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, contact, gender, address, profile_photo, password, role, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$first_name, $last_name, $email, $contact, $gender, $address, $profile_photo_path, $hashed_password, $role, $tenant_id]);
                $newId = $pdo->lastInsertId();
                
                // --- Send Welcome Email ---
                $email_sent = false;
                $email_error = '';

                // Build the absolute dynamic link to the login screen
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
                
                // Extract folder path by stripping query parameters and backend script name
                $request_path = explode('?', $request_uri)[0];
                $base_path = preg_replace('/\/api\/users\.php$/', '', $request_path);
                $base_path = rtrim($base_path, '/') . '/';
                $login_link = $protocol . "://" . $host . $base_path . "login";

                try {
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
                    $email_sent = true;
                    logEmailAttempt($pdo, $email, $mail->Subject, 'Success');
                } catch (\Exception $e) {
                    $email_error = $mail->ErrorInfo;
                    logEmailAttempt($pdo, $email, 'Welcome to SAR Workforce - Your Account Details', 'Failed', $email_error);
                }

                echo json_encode([
                    "success" => true, 
                    "message" => "User created successfully", 
                    "id" => $newId,
                    "profile_photo" => $profile_photo_path,
                    "email_sent" => $email_sent,
                    "email_error" => $email_error
                ]);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    http_response_code(409);
                    echo json_encode(["success" => false, "error" => "Email address already registered"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["success" => false, "error" => $e->getMessage()]);
                }
            }
        }
        break;

    case 'DELETE':
        // Delete user account
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if ($id === null) {
            $json = json_decode(file_get_contents("php://input"), true);
            $id = isset($json['id']) ? intval($json['id']) : null;
        }

        if ($id === null) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing user ID"]);
            exit();
        }

        try {
            $tenant_id = getTenantId();
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            echo json_encode(["success" => true, "message" => "User deleted successfully"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
?>
