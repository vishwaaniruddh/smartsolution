<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    if ($action === 'request_reset') {
        $email = $input['email'] ?? '';

        if (!$email) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Email is required."]);
            exit();
        }

        // Check if user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            // Return success even if user doesn't exist for security reasons (don't leak emails)
            echo json_encode(["success" => true, "message" => "If an account with that email exists, a password reset link has been sent."]);
            exit();
        }

        // Generate token
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        // Save token to DB
        $stmt = $pdo->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$email, $token, $expires]);

        // Send Email
        try {
            $mail = getMailer($pdo);

            // Recipients
            $mail->addAddress($email);

            // Content
            // Determine the base URL dynamically based on the origin of the request, or fallback to localhost
            $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'http://localhost:5173';
            $resetLink = $origin . "/reset-password?token=" . $token . "&email=" . urlencode($email);
            
            $mail->isHTML(true);
            $mail->Subject = 'Password Reset Request';
            $mail->Body    = "Hello,<br><br>You requested a password reset. Click the link below to set a new password:<br><br><a href='$resetLink'>$resetLink</a><br><br>If you didn't request this, please ignore this email.<br>This link will expire in 1 hour.";
            $mail->AltBody = "You requested a password reset. Go to this link to set a new password: $resetLink";

            $mail->send();
            logEmailAttempt($pdo, $email, $mail->Subject, 'Success');
            echo json_encode(["success" => true, "message" => "If an account with that email exists, a password reset link has been sent."]);
        } catch (\Exception $e) {
            logEmailAttempt($pdo, $email, 'Password Reset Request', 'Failed', $mail->ErrorInfo);
            // For development/debugging we return the error
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Message could not be sent. Mailer Error: {$mail->ErrorInfo}"]);
        }

    } elseif ($action === 'verify_and_reset') {
        $email = $input['email'] ?? '';
        $token = $input['token'] ?? '';
        $new_password = $input['new_password'] ?? '';

        if (!$email || !$token || !$new_password) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Email, token, and new password are required."]);
            exit();
        }

        // Verify token
        $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE email = ? AND token = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$email, $token]);
        $resetRecord = $stmt->fetch();

        if (!$resetRecord) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid or expired password reset token."]);
            exit();
        }

        // Token valid, update password
        $hashed_password = password_hash($new_password, PASSWORD_BCRYPT);
        $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        $updateStmt->execute([$hashed_password, $email]);

        // Delete used token
        $delStmt = $pdo->prepare("DELETE FROM password_resets WHERE email = ?");
        $delStmt->execute([$email]);

        echo json_encode(["success" => true, "message" => "Password has been successfully reset."]);
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid action."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>
