<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $tenant_id = getTenantId();

    if ($method === 'GET') {
        $stmt = $pdo->prepare("SELECT host, port, encryption, username, password, from_name, from_email FROM smtp_settings WHERE tenant_id = ?");
        $stmt->execute([$tenant_id]);
        $config = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($config) {
            echo json_encode(["success" => true, "data" => $config]);
        } else {
            echo json_encode(["success" => true, "data" => null]);
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'save';
        
        if ($action === 'save') {
            $host = $input['host'] ?? '';
            $port = $input['port'] ?? 465;
            $encryption = $input['encryption'] ?? 'ssl';
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? '';
            $from_name = $input['from_name'] ?? '';
            $from_email = $input['from_email'] ?? '';

            if (!$host || !$username || !$password || !$from_name || !$from_email) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "All fields are required."]);
                exit;
            }

            $stmt = $pdo->prepare("
                INSERT INTO smtp_settings (tenant_id, host, port, encryption, username, password, from_name, from_email) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                host = VALUES(host), port = VALUES(port), encryption = VALUES(encryption), 
                username = VALUES(username), password = VALUES(password), 
                from_name = VALUES(from_name), from_email = VALUES(from_email)
            ");
            $stmt->execute([$tenant_id, $host, $port, $encryption, $username, $password, $from_name, $from_email]);
            
            echo json_encode(["success" => true, "message" => "SMTP settings saved successfully."]);
        } 
        elseif ($action === 'test_connection') {
            // Uses provided details to verify connection
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            try {
                $mail->isSMTP();
                $mail->Host       = $input['host'] ?? '';
                $mail->SMTPAuth   = true;
                $mail->Username   = $input['username'] ?? '';
                $mail->Password   = $input['password'] ?? '';
                $mail->Port       = $input['port'] ?? 465;
                
                $encryption = $input['encryption'] ?? 'ssl';
                if ($encryption === 'ssl') {
                    $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
                } elseif ($encryption === 'tls') {
                    $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                } else {
                    $mail->SMTPAutoTLS = false;
                    $mail->SMTPSecure = '';
                }

                // Increase timeout for testing
                $mail->Timeout = 10;
                
                if ($mail->smtpConnect()) {
                    $mail->smtpClose();
                    echo json_encode(["success" => true, "message" => "Connection to SMTP server was successful."]);
                } else {
                    echo json_encode(["success" => false, "error" => "Could not connect to the SMTP server. Check host and port."]);
                }
            } catch (Exception $e) {
                echo json_encode(["success" => false, "error" => "Connection failed: " . $e->getMessage()]);
            }
        }
        elseif ($action === 'send_test') {
            $to_email = $input['to_email'] ?? '';
            if (!filter_var($to_email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(["success" => false, "error" => "Invalid email address."]);
                exit;
            }

            try {
                // Fetch current config from DB to ensure it sends what is saved
                $mail = getMailer($pdo, $tenant_id);
                $mail->addAddress($to_email);
                $mail->Subject = 'Test Email from SAR Workforce';
                $mail->Body = 'This is a test email to verify your SMTP configuration is working correctly.';
                $mail->send();
                
                echo json_encode(["success" => true, "message" => "Test email sent successfully to $to_email."]);
            } catch (Exception $e) {
                echo json_encode(["success" => false, "error" => "Failed to send email. Check your SMTP settings and log file for details."]);
            }
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
